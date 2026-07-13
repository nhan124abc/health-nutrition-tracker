package health.tracker.services.activity.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs", indexes = {
        @Index(name = "idx_activity_logs_user", columnList = "user_id"),
        @Index(name = "idx_activity_logs_date", columnList = "user_id, logged_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Tham chiếu auth_db.users.id (cross-DB)
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_type_id")
    private ActivityType activityType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_plan_exercise_id")
    private WorkoutPlanExercise workoutPlanExercise;

    /**
     * Denormalized - tên hoạt động lúc log
     */
    @Column(name = "activity_name", nullable = false, length = 100)
    private String activityName;

    @Column(nullable = false, length = 20)
    private String category;

    // ─── Thông số chung ───────────────────────────────────────────────────────

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "calories_burned", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal caloriesBurned = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // ─── Thông số Cardio ──────────────────────────────────────────────────────

    @Column(name = "distance_km", precision = 6, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "avg_heart_rate")
    private Integer avgHeartRate;

    @Column(name = "max_heart_rate")
    private Integer maxHeartRate;

    // ─── Thông số Strength ────────────────────────────────────────────────────

    private Integer sets;

    @Column(name = "reps_per_set")
    private Integer repsPerSet;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    // ─── Thông số Steps ───────────────────────────────────────────────────────

    private Integer steps;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

