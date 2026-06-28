package health.tracker.services.user.dto;

import health.tracker.services.user.entity.UserProfile;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GuestGoalPlanRequest {
    @NotNull
    private GoalPlanRequest.PlanGoal goal;

    @NotNull
    private UserProfile.Gender gender;

    @NotNull
    @Min(1)
    @Max(120)
    private Integer age;

    @NotNull
    @DecimalMin("1.0")
    private BigDecimal weightKg;

    @NotNull
    @DecimalMin("1.0")
    private BigDecimal heightCm;

    @NotNull
    private UserProfile.ActivityLevel activityLevel;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal targetChangeKg;

    @Min(1)
    @Max(104)
    private Integer targetWeeks;
}
