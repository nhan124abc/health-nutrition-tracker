package health.tracker.services.user.service;

import health.tracker.services.user.dto.GoalPlanRequest;
import health.tracker.services.user.dto.GoalPlanResponse;
import health.tracker.services.user.dto.GuestGoalPlanRequest;
import health.tracker.services.user.entity.UserProfile;
import health.tracker.services.user.exception.AppException;
import health.tracker.services.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GoalPlanService {
    private static final BigDecimal KCAL_PER_KG = BigDecimal.valueOf(7700);
    private static final BigDecimal SAFE_LOSS_PER_WEEK_KG = BigDecimal.valueOf(0.75);
    private static final BigDecimal SAFE_GAIN_PER_WEEK_KG = BigDecimal.valueOf(0.5);
    private static final BigDecimal ACTIVITY_MIN_TDEE_RATIO = BigDecimal.valueOf(0.04);
    private static final BigDecimal ACTIVITY_MAX_TDEE_RATIO = BigDecimal.valueOf(0.18);

    private final UserProfileRepository profileRepository;
    private final NutritionGoalCalculator calculator;
    private final UserCacheService userCacheService;

    @Transactional(readOnly = true)
    public GoalPlanResponse suggest(Long userId, GoalPlanRequest request) {
        UserProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Please complete your health profile first"));
        return buildSuggestion(profile, request);
    }

    public GoalPlanResponse suggestGuest(GuestGoalPlanRequest request) {
        UserProfile profile = UserProfile.builder()
                .gender(request.getGender())
                .dateOfBirth(LocalDate.now().minusYears(request.getAge()))
                .weightKg(request.getWeightKg())
                .heightCm(request.getHeightCm())
                .activityLevel(request.getActivityLevel())
                .build();
        GoalPlanRequest planRequest = new GoalPlanRequest();
        planRequest.setGoal(request.getGoal());
        planRequest.setTargetChangeKg(request.getTargetChangeKg());
        planRequest.setTargetWeeks(request.getTargetWeeks());
        return buildSuggestion(profile, planRequest);
    }

    private GoalPlanResponse buildSuggestion(UserProfile profile, GoalPlanRequest request) {
        NutritionGoalCalculator.NutritionTargets targets = calculator.calculate(profile);
        if (profile.getWeightKg() == null || targets.tdee() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Weight, height, date of birth and gender are required");
        }

        BigDecimal change = isWeightStableGoal(request.getGoal())
                ? BigDecimal.ZERO : request.getTargetChangeKg();
        BigDecimal targetWeight = switch (request.getGoal()) {
            case LOSE_WEIGHT, CUTTING -> profile.getWeightKg().subtract(change);
            case GAIN_WEIGHT, GAIN_MUSCLE -> profile.getWeightKg().add(change);
            case MAINTAIN_WEIGHT, BODY_RECOMPOSITION, IMPROVE_FITNESS -> profile.getWeightKg();
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
                .activityFactor(targets.activityFactor())
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
        profile.setPlanStartDate(java.time.LocalDate.now());
        profile.setPlanDurationWeeks(request.getTargetWeeks() != null ? request.getTargetWeeks() : selected.getWeeks());
        profile.setDailyActivityGoalKcal(selected.getDailyActivityGoalKcal());
        profile.setGoal(switch (request.getGoal()) {
            case LOSE_WEIGHT -> UserProfile.Goal.LOSE_WEIGHT;
            case MAINTAIN_WEIGHT -> UserProfile.Goal.MAINTAIN_WEIGHT;
            case GAIN_WEIGHT -> UserProfile.Goal.GAIN_WEIGHT;
            case GAIN_MUSCLE -> UserProfile.Goal.GAIN_MUSCLE;
            case CUTTING -> UserProfile.Goal.CUTTING;
            case BODY_RECOMPOSITION -> UserProfile.Goal.BODY_RECOMPOSITION;
            case IMPROVE_FITNESS -> UserProfile.Goal.IMPROVE_FITNESS;
        });
        NutritionGoalCalculator.NutritionTargets targets = calculator.calculate(profile, selected.getDailyCalorieGoal());
        profile.setDailyCalorieGoal(selected.getDailyCalorieGoal());
        profile.setDailyProteinGoalG(targets.dailyProteinGoalG());
        profile.setDailyCarbsGoalG(targets.dailyCarbsGoalG());
        profile.setDailyFatGoalG(targets.dailyFatGoalG());
        profileRepository.save(profile);
        userCacheService.evictAllUserCaches();
        return selected;
    }

    private int minimumSafeWeeks(BigDecimal change, GoalPlanRequest.PlanGoal goal) {
        if (isWeightStableGoal(goal)) return 1;
        BigDecimal weekly = isWeightLossGoal(goal)
                ? SAFE_LOSS_PER_WEEK_KG : SAFE_GAIN_PER_WEEK_KG;
        return Math.max(1, change.divide(weekly, 0, RoundingMode.CEILING).intValue());
    }

    private GoalPlanResponse.Option option(UserProfile profile, int tdee, GoalPlanRequest.PlanGoal goal,
                                           BigDecimal change, int weeks, int safeWeeks, boolean custom) {
        int days = weeks * 7;
        int dailyChange = isWeightStableGoal(goal) ? 0
                : change.multiply(KCAL_PER_KG).divide(BigDecimal.valueOf(days), 0, RoundingMode.HALF_UP).intValue();
        int activityGoal = dailyActivityGoal(profile, tdee, goal, dailyChange);
        int foodChange = Math.max(0, dailyChange - activityGoal);
        int calories = switch (goal) {
            case LOSE_WEIGHT, CUTTING -> tdee - foodChange;
            case GAIN_WEIGHT, GAIN_MUSCLE -> tdee + dailyChange;
            case MAINTAIN_WEIGHT, BODY_RECOMPOSITION, IMPROVE_FITNESS -> tdee;
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

    private boolean isWeightLossGoal(GoalPlanRequest.PlanGoal goal) {
        return goal == GoalPlanRequest.PlanGoal.LOSE_WEIGHT || goal == GoalPlanRequest.PlanGoal.CUTTING;
    }

    private int dailyActivityGoal(UserProfile profile, int tdee, GoalPlanRequest.PlanGoal goal, int dailyChange) {
        BigDecimal goalRatio = switch (goal) {
            case LOSE_WEIGHT, CUTTING -> BigDecimal.valueOf(0.10);
            case BODY_RECOMPOSITION -> BigDecimal.valueOf(0.12);
            case IMPROVE_FITNESS -> BigDecimal.valueOf(0.10);
            case GAIN_MUSCLE -> BigDecimal.valueOf(0.09);
            case MAINTAIN_WEIGHT -> BigDecimal.valueOf(0.07);
            case GAIN_WEIGHT -> BigDecimal.valueOf(0.05);
        };
        BigDecimal levelMultiplier = activityLevelMultiplier(profile.getActivityLevel());
        int tdeeBasedGoal = BigDecimal.valueOf(tdee)
                .multiply(goalRatio)
                .multiply(levelMultiplier)
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
        int deficitBasedGoal = isWeightLossGoal(goal) ? (int) Math.round(dailyChange * 0.35) : 0;
        int rawGoal = Math.max(tdeeBasedGoal, deficitBasedGoal);
        int minGoal = BigDecimal.valueOf(tdee)
                .multiply(ACTIVITY_MIN_TDEE_RATIO)
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
        int maxGoal = BigDecimal.valueOf(tdee)
                .multiply(ACTIVITY_MAX_TDEE_RATIO)
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();

        return Math.max(minGoal, Math.min(maxGoal, rawGoal));
    }

    private BigDecimal activityLevelMultiplier(UserProfile.ActivityLevel activityLevel) {
        UserProfile.ActivityLevel level = activityLevel != null
                ? activityLevel
                : UserProfile.ActivityLevel.SEDENTARY;

        return switch (level) {
            case SEDENTARY -> BigDecimal.valueOf(0.85);
            case LIGHTLY_ACTIVE -> BigDecimal.valueOf(0.95);
            case MODERATELY_ACTIVE -> BigDecimal.ONE;
            case VERY_ACTIVE -> BigDecimal.valueOf(1.10);
            case EXTRA_ACTIVE -> BigDecimal.valueOf(1.20);
        };
    }

    private boolean isWeightStableGoal(GoalPlanRequest.PlanGoal goal) {
        return goal == GoalPlanRequest.PlanGoal.MAINTAIN_WEIGHT
                || goal == GoalPlanRequest.PlanGoal.BODY_RECOMPOSITION
                || goal == GoalPlanRequest.PlanGoal.IMPROVE_FITNESS;
    }
}
