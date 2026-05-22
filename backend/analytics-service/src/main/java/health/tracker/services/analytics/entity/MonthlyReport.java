package health.tracker.services.analytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_reports", indexes = {
        @Index(name = "idx_monthly_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "report_year", nullable = false)
    private Integer reportYear;

    /**
     * Tháng: 1-12
     */
    @Column(name = "report_month", nullable = false)
    private Integer reportMonth;

    @Column(name = "avg_daily_calories", precision = 7, scale = 2)
    private BigDecimal avgDailyCalories;

    @Column(name = "avg_daily_protein_g", precision = 6, scale = 2)
    private BigDecimal avgDailyProteinG;

    @Column(name = "avg_daily_carbs_g", precision = 6, scale = 2)
    private BigDecimal avgDailyCarbsG;

    @Column(name = "avg_daily_fat_g", precision = 6, scale = 2)
    private BigDecimal avgDailyFatG;

    @Column(name = "total_calories_burned", precision = 10, scale = 2)
    private BigDecimal totalCaloriesBurned;

    @Column(name = "avg_daily_steps")
    private Integer avgDailySteps;

    @Column(name = "active_days_count")
    private Integer activeDaysCount;

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

    @Column(name = "data_days_count")
    private Integer dataDaysCount;

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

