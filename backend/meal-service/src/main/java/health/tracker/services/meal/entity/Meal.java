package health.tracker.services.meal.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "meals", indexes = {
        @Index(name = "idx_meals_user_date", columnList = "user_id, meal_date"),
        @Index(name = "idx_meals_user_type_date", columnList = "user_id, meal_type, meal_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Tham chiếu auth_db.users.id (cross-DB)
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false)
    @Builder.Default
    private MealType mealType = MealType.BREAKFAST;

    @Column(name = "meal_date", nullable = false)
    private LocalDate mealDate;

    @Column(name = "meal_time")
    private LocalTime mealTime;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ─── Tổng dinh dưỡng (tính từ meal_items) ────────────────────────────────

    @Column(name = "total_calories", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal totalCalories = BigDecimal.ZERO;

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

    @OneToMany(mappedBy = "meal", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MealItem> items = new ArrayList<>();

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

    // ─── Enum ─────────────────────────────────────────────────────────────────

    public enum MealType {
        BREAKFAST,
        MORNING_SNACK,
        LUNCH,
        AFTERNOON_SNACK,
        DINNER,
        EVENING_SNACK
    }
}

