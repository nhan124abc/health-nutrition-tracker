package health.tracker.services.ai.dto;

import lombok.Data;

import java.util.List;

@Data
public class PlannerSuggestRequest {
    private Integer dailyCalorieGoal;
    private String goal;
    private Double weightKg;
    private Double targetWeightKg;
    private String activityLevel;
    private Integer heightCm;
    private Integer age;
    private String gender;
    private String mealType;
    private Integer caloriesConsumed;
    private Integer suggestionOffset;
    private List<String> excludedFoodNames;
}
