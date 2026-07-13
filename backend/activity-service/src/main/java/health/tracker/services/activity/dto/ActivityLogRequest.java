package health.tracker.services.activity.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ActivityLogRequest {

    /** ID từ bảng activity_types (có thể null nếu người dùng nhập tên tự do) */
    private Integer activityTypeId;

    private Long workoutPlanExerciseId;

    /**
     * Tên hoạt động — bắt buộc khi activityTypeId = null,
     * hoặc sẽ được lấy từ ActivityType nếu có.
     */
    @NotBlank(message = "Activity name is required")
    @Size(max = 100)
    private String activityName;

    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    @Max(value = 1440, message = "Duration must not exceed 1440 minutes (24h)")
    private Integer durationMinutes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime loggedAt;   // mặc định = now nếu null

    @Size(max = 1000)
    private String notes;

    // ─── Cardio fields ────────────────────────────────────────────────────────

    @DecimalMin("0.01")
    @DecimalMax("1000")
    private BigDecimal distanceKm;

    @Min(30) @Max(300)
    private Integer avgHeartRate;

    @Min(30) @Max(300)
    private Integer maxHeartRate;

    // ─── Strength fields ──────────────────────────────────────────────────────

    @Min(1) @Max(100)
    private Integer sets;

    @Min(1) @Max(1000)
    private Integer repsPerSet;

    @DecimalMin("0.5") @DecimalMax("1000")
    private BigDecimal weightKg;

    // ─── Steps ────────────────────────────────────────────────────────────────

    @Min(0) @Max(100000)
    private Integer steps;

    /**
     * Cân nặng người dùng (kg) — dùng để tính calories burned bằng MET.
     * Nếu không truyền, service sẽ dùng giá trị mặc định 70kg.
     */
    @DecimalMin("1") @DecimalMax("500")
    private BigDecimal userWeightKg;
}

