package health.tracker.services.activity.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WorkoutPlanExerciseRequest {

    @NotNull(message = "Day of week is required")
    @Min(1)
    @Max(7)
    private Integer dayOfWeek;

    private Integer activityTypeId;

    @NotBlank(message = "Exercise name is required")
    @Size(max = 100)
    private String exerciseName;

    @Min(1)
    @Max(100)
    private Integer sets;

    @Min(1)
    @Max(1000)
    private Integer reps;

    @Min(1)
    @Max(1440)
    private Integer durationMinutes;

    @Min(0)
    private Integer sortOrder = 0;

    @Size(max = 1000)
    private String notes;
}
