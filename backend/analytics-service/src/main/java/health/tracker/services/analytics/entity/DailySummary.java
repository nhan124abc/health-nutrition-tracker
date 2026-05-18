package health.tracker.services.analytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_summaries", indexes = {
        @Index(name = "idx_daily_user", columnList = "user_id"),
        @Index(name = "idx_daily_date", columnList = "summary_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailySummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "summary_date", nullable = false)
    private LocalDate summaryDate;

    // ─── Dinh dưỡng (từ meal-service) ────────────────────────────────────────

    @Column(name = "total_calories_consumed", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal totalCaloriesConsumed = BigDecimal.ZERO;

    @Column(name = "total_protein_g", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal totalProteinG = BigDecimal.ZERO;

    @Column(name = "total_carbs_g", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal totalCarbsG = BigDecimal.ZERO;

    @Column(name = "total_fat_g", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal totalFatG = BigDecimal.ZERO;

    @Column(name = "total_fiber_g", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal totalFiberG = BigDecimal.ZERO;

    @Column(name = "total_sodium_mg", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal totalSodiumMg = BigDecimal.ZERO;

    @Column(name = "meal_count", nullable = false)
    @Builder.Default
    private Integer mealCount = 0;

    // ─── Hoạt động (từ activity-service) ─────────────────────────────────────

    @Column(name = "total_calories_burned", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal totalCaloriesBurned = BigDecimal.ZERO;

    @Column(name = "total_active_minutes", nullable = false)
    @Builder.Default
    private Integer totalActiveMinutes = 0;

    @Column(name = "total_steps", nullable = false)
    @Builder.Default
    private Integer totalSteps = 0;

    @Column(name = "total_distance_km", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal totalDistanceKm = BigDecimal.ZERO;

    @Column(name = "activity_count", nullable = false)
    @Builder.Default
    private Integer activityCount = 0;

    /**
     * net_calories = total_calories_consumed - total_calories_burned
     * Là cột GENERATED ALWAYS trong MySQL, chỉ đọc
     */
    @Column(name = "net_calories", insertable = false, updatable = false)
    private BigDecimal netCalories;

    // ─── Nước uống (từ user-service) ──────────────────────────────────────────

    @Column(name = "water_intake_ml", nullable = false)
    @Builder.Default
    private Integer waterIntakeMl = 0;

    // ─── Mục tiêu ─────────────────────────────────────────────────────────────

    @Column(name = "calorie_goal")
    private Integer calorieGoal;

    @Column(name = "calorie_goal_met", nullable = false)
    @Builder.Default
    private boolean calorieGoalMet = false;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

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

