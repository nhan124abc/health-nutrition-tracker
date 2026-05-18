package health.tracker.services.activity.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.activity.entity.ActivityType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ActivityLogResponse {

    private Long id;
    private Long userId;
    private Integer activityTypeId;
    private String activityName;
    private ActivityType.Category category;

    private Integer durationMinutes;
    private BigDecimal caloriesBurned;
    private String notes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime loggedAt;

    // Cardio
    private BigDecimal distanceKm;
    private Integer avgHeartRate;
    private Integer maxHeartRate;

    // Strength
    private Integer sets;
    private Integer repsPerSet;
    private BigDecimal weightKg;

    // Steps
    private Integer steps;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}

