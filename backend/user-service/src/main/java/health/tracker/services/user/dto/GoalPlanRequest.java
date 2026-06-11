package health.tracker.services.user.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GoalPlanRequest {

    @NotNull
    private PlanGoal goal;

    @NotNull
    @DecimalMin("0.1")
    private BigDecimal targetChangeKg;

    @Min(1)
    @Max(104)
    private Integer targetWeeks;

    public enum PlanGoal {
        LOSE_WEIGHT, GAIN_WEIGHT, MAINTAIN_WEIGHT
    }
}
