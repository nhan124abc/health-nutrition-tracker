package health.tracker.services.activity.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.activity.entity.WorkoutPlan;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class WorkoutPlanResponse {

    private Long id;
    private Long userId;
    private String name;
    private String description;
    private WorkoutPlan.Goal goal;
    private Integer durationWeeks;
    private boolean active;
    private List<Exercise> exercises;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class Exercise {
        private Long id;
        private Integer dayOfWeek;
        private Integer activityTypeId;
        private String activityTypeName;
        private String exerciseName;
        private Integer sets;
        private Integer reps;
        private Integer durationMinutes;
        private Integer sortOrder;
        private String notes;
    }
}
