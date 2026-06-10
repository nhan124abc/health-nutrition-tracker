package health.tracker.services.user.service;

import health.tracker.services.user.entity.UserProfile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;

@Component
public class NutritionGoalCalculator {

    public NutritionTargets calculate(UserProfile profile) {
        return calculate(profile, null);
    }

    public NutritionTargets calculate(UserProfile profile, Integer calorieGoalOverride) {
        if (!hasRequiredInputs(profile)) {
            return NutritionTargets.empty();
        }

        int age = Period.between(profile.getDateOfBirth(), LocalDate.now()).getYears();
        BigDecimal bmr = calculateBmr(profile, age);
        BigDecimal activityFactor = activityFactor(profile.getActivityLevel());
        BigDecimal tdee = bmr.multiply(activityFactor);
        int calorieGoal = calorieGoalOverride != null
                ? calorieGoalOverride
                : calculateCalorieGoal(tdee, profile.getGoal());
        MacroTargets macros = calculateMacros(profile.getWeightKg(), calorieGoal, profile.getGoal());

        return new NutritionTargets(
                roundToInt(bmr),
                roundToInt(tdee),
                activityFactor,
                calorieGoal,
                macros.proteinGoalG(),
                macros.carbsGoalG(),
                macros.fatGoalG()
        );
    }

    private boolean hasRequiredInputs(UserProfile profile) {
        return profile.getDateOfBirth() != null
                && profile.getGender() != null
                && profile.getGender() != UserProfile.Gender.OTHER
                && profile.getHeightCm() != null
                && profile.getWeightKg() != null
                && profile.getWeightKg().compareTo(BigDecimal.ZERO) > 0
                && profile.getHeightCm().compareTo(BigDecimal.ZERO) > 0;
    }

    private BigDecimal calculateBmr(UserProfile profile, int age) {
        BigDecimal weightPart = BigDecimal.valueOf(9.99).multiply(profile.getWeightKg());
        BigDecimal heightPart = BigDecimal.valueOf(6.25).multiply(profile.getHeightCm());
        BigDecimal agePart = BigDecimal.valueOf(4.92).multiply(BigDecimal.valueOf(age));
        BigDecimal genderOffset = profile.getGender() == UserProfile.Gender.MALE
                ? BigDecimal.valueOf(5)
                : BigDecimal.valueOf(-161);

        return weightPart.add(heightPart).subtract(agePart).add(genderOffset);
    }

    private BigDecimal activityFactor(UserProfile.ActivityLevel activityLevel) {
        UserProfile.ActivityLevel level = activityLevel != null
                ? activityLevel
                : UserProfile.ActivityLevel.SEDENTARY;

        return switch (level) {
            case SEDENTARY -> BigDecimal.valueOf(1.2);
            case LIGHTLY_ACTIVE -> BigDecimal.valueOf(1.375);
            case MODERATELY_ACTIVE -> BigDecimal.valueOf(1.55);
            case VERY_ACTIVE -> BigDecimal.valueOf(1.725);
            case EXTRA_ACTIVE -> BigDecimal.valueOf(1.9);
        };
    }

    private int calculateCalorieGoal(BigDecimal tdee, UserProfile.Goal goal) {
        UserProfile.Goal target = goal != null ? goal : UserProfile.Goal.MAINTAIN_WEIGHT;

        BigDecimal calories = switch (target) {
            case LOSE_WEIGHT -> tdee.subtract(BigDecimal.valueOf(500));
            case GAIN_WEIGHT -> tdee.add(BigDecimal.valueOf(400));
            case GAIN_MUSCLE -> tdee.add(BigDecimal.valueOf(250));
            case CUTTING -> tdee.subtract(BigDecimal.valueOf(300));
            case MAINTAIN_WEIGHT, BODY_RECOMPOSITION, IMPROVE_FITNESS -> tdee;
        };

        return Math.max(500, roundToInt(calories));
    }

    private MacroTargets calculateMacros(BigDecimal weightKg, int calories, UserProfile.Goal goal) {
        UserProfile.Goal target = goal != null ? goal : UserProfile.Goal.MAINTAIN_WEIGHT;

        BigDecimal proteinPerKg = switch (target) {
            case LOSE_WEIGHT, CUTTING -> BigDecimal.valueOf(2.2);
            case GAIN_MUSCLE -> BigDecimal.valueOf(2.0);
            case BODY_RECOMPOSITION -> BigDecimal.valueOf(2.3);
            case GAIN_WEIGHT -> BigDecimal.valueOf(1.6);
            case MAINTAIN_WEIGHT, IMPROVE_FITNESS -> BigDecimal.valueOf(1.6);
        };

        BigDecimal fatPerKg = switch (target) {
            case LOSE_WEIGHT, CUTTING -> BigDecimal.valueOf(0.8);
            case GAIN_MUSCLE, GAIN_WEIGHT -> BigDecimal.valueOf(0.9);
            case BODY_RECOMPOSITION -> BigDecimal.valueOf(0.8);
            case MAINTAIN_WEIGHT, IMPROVE_FITNESS -> BigDecimal.valueOf(0.9);
        };

        int proteinGoal = roundToInt(weightKg.multiply(proteinPerKg));
        int fatGoal = roundToInt(weightKg.multiply(fatPerKg));
        BigDecimal proteinCalories = BigDecimal.valueOf(proteinGoal).multiply(BigDecimal.valueOf(4));
        BigDecimal fatCalories = BigDecimal.valueOf(fatGoal).multiply(BigDecimal.valueOf(9));
        BigDecimal carbCalories = BigDecimal.valueOf(calories).subtract(proteinCalories).subtract(fatCalories);
        int carbGoal = Math.max(0, roundToInt(carbCalories.divide(BigDecimal.valueOf(4), 2, RoundingMode.HALF_UP)));

        return new MacroTargets(proteinGoal, carbGoal, fatGoal);
    }

    private int roundToInt(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    private record MacroTargets(int proteinGoalG, int carbsGoalG, int fatGoalG) {
    }

    public record NutritionTargets(
            Integer bmr,
            Integer tdee,
            BigDecimal activityFactor,
            Integer dailyCalorieGoal,
            Integer dailyProteinGoalG,
            Integer dailyCarbsGoalG,
            Integer dailyFatGoalG
    ) {
        static NutritionTargets empty() {
            return new NutritionTargets(null, null, null, null, null, null, null);
        }
    }
}
