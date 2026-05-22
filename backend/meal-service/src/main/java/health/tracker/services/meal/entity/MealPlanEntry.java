package health.tracker.services.meal.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "meal_plan_entries", indexes = {
        @Index(name = "idx_mpe_plan", columnList = "plan_id"),
        @Index(name = "idx_mpe_date", columnList = "plan_id, plan_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealPlanEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private MealPlan plan;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false)
    private Meal.MealType mealType;

    /**
     * Tham chiếu nutrition_db.food_items.id (cross-DB)
     */
    @Column(name = "food_item_id")
    private Long foodItemId;

    /**
     * Tham chiếu nutrition_db.recipes.id (cross-DB)
     */
    @Column(name = "recipe_id")
    private Long recipeId;

    @Column(name = "food_name", nullable = false)
    private String foodName;

    @Column(name = "serving_size_g", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal servingSizeG = BigDecimal.valueOf(100);

    @Column(nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal calories = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;
}

