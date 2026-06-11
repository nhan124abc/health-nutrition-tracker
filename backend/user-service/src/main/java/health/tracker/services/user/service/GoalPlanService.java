package health.tracker.services.user.service;

import health.tracker.services.user.dto.GoalPlanRequest;
import health.tracker.services.user.dto.GoalPlanResponse;
import health.tracker.services.user.entity.UserProfile;
import health.tracker.services.user.exception.AppException;
import health.tracker.services.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GoalPlanService {
    private static final BigDecimal KCAL_PER_KG = BigDecimal.valueOf(7700);
    private static final BigDecimal SAFE_LOSS_PER_WEEK_KG = BigDecimal.valueOf(0.75);
    private static final BigDecimal SAFE_GAIN_PER_WEEK_KG = BigDecimal.valueOf(0.5);

    private final UserProfileRepository profileRepository;
    private final NutritionGoalCalculator calculator;

    @Transactional(readOnly = true)
    public GoalPlanResponse suggest(Long userId, GoalPlanRequest request) {
        UserProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Please complete your health profile first"));
        NutritionGoalCalculator.NutritionTargets targets = calculator.calculate(profile);
        if (profile.getWeightKg() == null || targets.tdee() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Weight, height, date of birth and gender are required");
        }

        BigDecimal change = request.getGoal() == GoalPlanRequest.PlanGoal.MAINTAIN_WEIGHT
                ? BigDecimal.ZERO : request.getTargetChangeKg();
        BigDecimal targetWeight = switch (request.getGoal()) {
            case LOSE_WEIGHT -> profile.getWeightKg().subtract(change);
            case GAIN_WEIGHT -> profile.getWeightKg().add(change);
            case MAINTAIN_WEIGHT -> profile.getWeightKg();
        };
        if (targetWeight.compareTo(BigDecimal.ONE) < 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Target weight must be greater than 1 kg");
        }

        int safeWeeks = minimumSafeWeeks(change, request.getGoal());
        LinkedHashSet<Integer> weeks = new LinkedHashSet<>();
        if (request.getTargetWeeks() != null) weeks.add(request.getTargetWeeks());
        weeks.add(Math.max(1, safeWeeks));
        weeks.add(Math.max(1, safeWeeks + 4));
        weeks.add(Math.max(1, safeWeeks + 8));

        List<GoalPlanResponse.Option> options = weeks.stream()
                .map(value -> option(profile, targets.tdee(), request.getGoal(), change, value, safeWeeks,
                        request.getTargetWeeks() != null && value.equals(request.getTargetWeeks())))
                .toList();

        return GoalPlanResponse.builder()
                .goal(request.getGoal()).currentWeightKg(profile.getWeightKg()).targetWeightKg(targetWeight)
                .targetChangeKg(change).bmr(targets.bmr()).tdee(targets.tdee())
                .safeMinimumWeeks(safeWeeks).totalEnergyChangeKcal(change.multiply(KCAL_PER_KG))
                .options(options).build();
    }

    @Transactional
    public GoalPlanResponse.Option apply(Long userId, GoalPlanRequest request) {
        if (request.getTargetWeeks() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "targetWeeks is required");
        }
        GoalPlanResponse plan = suggest(userId, request);
        GoalPlanResponse.Option selected = plan.getOptions().stream()
                .filter(option -> option.getWeeks().equals(request.getTargetWeeks())).findFirst()
                .orElseThrow();
        if (!selected.isSafe()) {
            throw new AppException(HttpStatus.BAD_REQUEST, selected.getMessage());
        }

        UserProfile profile = profileRepository.findByUserId(userId).orElseThrow();
        profile.setTargetWeightKg(plan.getTargetWeightKg());
        profile.setDailyCalorieGoal(selected.getDailyCalorieGoal());
        profile.setPlanStartDate(java.time.LocalDate.now());
        profile.setPlanDurationWeeks(request.getTargetWeeks() != null ? request.getTargetWeeks() : selected.getWeeks());
        profile.setDailyActivityGoalKcal(selected.getDailyActivityGoalKcal());
        profile.setGoal(switch (request.getGoal()) {
            case LOSE_WEIGHT -> UserProfile.Goal.LOSE_WEIGHT;
            case MAINTAIN_WEIGHT -> UserProfile.Goal.MAINTAIN_WEIGHT;
            case GAIN_WEIGHT -> UserProfile.Goal.GAIN_MUSCLE;
        });
        profileRepository.save(profile);
        return selected;
    }

    private int minimumSafeWeeks(BigDecimal change, GoalPlanRequest.PlanGoal goal) {
        if (goal == GoalPlanRequest.PlanGoal.MAINTAIN_WEIGHT) return 1;
        BigDecimal weekly = goal == GoalPlanRequest.PlanGoal.LOSE_WEIGHT
                ? SAFE_LOSS_PER_WEEK_KG : SAFE_GAIN_PER_WEEK_KG;
        return Math.max(1, change.divide(weekly, 0, RoundingMode.CEILING).intValue());
    }

    private GoalPlanResponse.Option option(UserProfile profile, int tdee, GoalPlanRequest.PlanGoal goal,
                                           BigDecimal change, int weeks, int safeWeeks, boolean custom) {
        int days = weeks * 7;
        int dailyChange = goal == GoalPlanRequest.PlanGoal.MAINTAIN_WEIGHT ? 0
                : change.multiply(KCAL_PER_KG).divide(BigDecimal.valueOf(days), 0, RoundingMode.HALF_UP).intValue();
        int activityGoal = goal == GoalPlanRequest.PlanGoal.LOSE_WEIGHT
                ? Math.min(350, (int) Math.round(dailyChange * 0.35)) : 0;
        int foodChange = Math.max(0, dailyChange - activityGoal);
        int calories = switch (goal) {
            case LOSE_WEIGHT -> tdee - foodChange;
            case GAIN_WEIGHT -> tdee + dailyChange;
            case MAINTAIN_WEIGHT -> tdee;
        };
        int minimumCalories = profile.getGender() == UserProfile.Gender.MALE ? 1500 : 1200;
        boolean safe = weeks >= safeWeeks && calories >= minimumCalories && dailyChange <= 1000;
        String message = safe ? "Muc tieu nam trong muc de xuat an toan"
                : "Thoi gian qua ngan; hay chon it nhat " + safeWeeks + " tuan";
        return GoalPlanResponse.Option.builder()
                .type(custom ? "CUSTOM" : weeks == safeWeeks ? "BALANCED" : "EASY")
                .weeks(weeks).days(days)
                .weeklyWeightChangeKg(weeks == 0 ? BigDecimal.ZERO : change.divide(BigDecimal.valueOf(weeks), 2, RoundingMode.HALF_UP))
                .dailyEnergyChangeKcal(dailyChange).dailyCalorieGoal(Math.max(minimumCalories, calories))
                .dailyActivityGoalKcal(activityGoal).safe(safe).message(message).build();
    }
}
