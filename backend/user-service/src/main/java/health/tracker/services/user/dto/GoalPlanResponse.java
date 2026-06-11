package health.tracker.services.user.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class GoalPlanResponse {
    private GoalPlanRequest.PlanGoal goal;
    private BigDecimal currentWeightKg;
    private BigDecimal targetWeightKg;
    private BigDecimal targetChangeKg;
    private Integer bmr;
    private Integer tdee;
    private Integer safeMinimumWeeks;
    private BigDecimal totalEnergyChangeKcal;
    private List<Option> options;

    @Data
    @Builder
    public static class Option {
        private String type;
        private Integer weeks;
        private Integer days;
        private BigDecimal weeklyWeightChangeKg;
        private Integer dailyEnergyChangeKcal;
        private Integer dailyCalorieGoal;
        private Integer dailyActivityGoalKcal;
        private boolean safe;
        private String message;
    }
}
