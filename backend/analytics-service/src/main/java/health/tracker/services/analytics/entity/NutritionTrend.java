package health.tracker.services.analytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "nutrition_trends", indexes = {
        @Index(name = "idx_trends_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NutritionTrend {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Tham chiếu nutrition_db.food_items.id (cross-DB)
     */
    @Column(name = "food_item_id", nullable = false)
    private Long foodItemId;

    @Column(name = "food_name", nullable = false)
    private String foodName;

    @Column(nullable = false)
    @Builder.Default
    private Integer frequency = 1;

    @Column(name = "total_calories", nullable = false, precision = 9, scale = 2)
    @Builder.Default
    private BigDecimal totalCalories = BigDecimal.ZERO;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

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

