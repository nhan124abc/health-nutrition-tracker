package health.tracker.services.activity.dto;

import health.tracker.services.activity.entity.WorkoutPlan;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;

@Data
public class WorkoutPlanRequest {

    @NotBlank(message = "Plan name is required")
    @Size(max = 100)
    private String name;

    @NotNull(message = "Plan date is required")
    private LocalDate planDate;

    @Size(max = 2000)
    private String description;

    private WorkoutPlan.Goal goal;

    @Min(1)
    private Integer durationWeeks;

    private Boolean active;

    @Valid
    private List<WorkoutPlanExerciseRequest> exercises = new ArrayList<>();
}
