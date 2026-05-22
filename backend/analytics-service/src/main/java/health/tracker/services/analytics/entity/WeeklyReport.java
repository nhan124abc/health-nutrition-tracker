package health.tracker.services.analytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "weekly_reports", indexes = {
        @Index(name = "idx_weekly_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeeklyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "week_end_date", nullable = false)
    private LocalDate weekEndDate;

    // ─── Dinh dưỡng trung bình ────────────────────────────────────────────────

    @Column(name = "avg_daily_calories", precision = 7, scale = 2)
    private BigDecimal avgDailyCalories;

    @Column(name = "avg_daily_protein_g", precision = 6, scale = 2)
    private BigDecimal avgDailyProteinG;

    @Column(name = "avg_daily_carbs_g", precision = 6, scale = 2)
    private BigDecimal avgDailyCarbsG;

    @Column(name = "avg_daily_fat_g", precision = 6, scale = 2)
    private BigDecimal avgDailyFatG;

    @Column(name = "avg_daily_water_ml")
    private Integer avgDailyWaterMl;

    // ─── Calo tổng ────────────────────────────────────────────────────────────

    @Column(name = "total_calories_consumed", precision = 9, scale = 2)
    private BigDecimal totalCaloriesConsumed;

    @Column(name = "total_calories_burned", precision = 9, scale = 2)
    private BigDecimal totalCaloriesBurned;

    // ─── Hoạt động ────────────────────────────────────────────────────────────

    @Column(name = "avg_daily_steps")
    private Integer avgDailySteps;

    @Column(name = "total_active_minutes")
    private Integer totalActiveMinutes;

    @Column(name = "active_days_count")
    private Integer activeDaysCount;

    // ─── Cân nặng ─────────────────────────────────────────────────────────────

    @Column(name = "weight_start_kg", precision = 5, scale = 2)
    private BigDecimal weightStartKg;

    @Column(name = "weight_end_kg", precision = 5, scale = 2)
    private BigDecimal weightEndKg;

    /**
     * weight_change_kg = weight_end_kg - weight_start_kg
     * Là cột GENERATED ALWAYS trong MySQL, chỉ đọc
     */
    @Column(name = "weight_change_kg", insertable = false, updatable = false)
    private BigDecimal weightChangeKg;

    @Column(name = "goal_met_days")
    @Builder.Default
    private Integer goalMetDays = 0;

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

