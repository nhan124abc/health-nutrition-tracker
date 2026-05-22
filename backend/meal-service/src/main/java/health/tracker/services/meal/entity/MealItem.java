package health.tracker.services.meal.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "meal_items", indexes = {
        @Index(name = "idx_meal_items_meal", columnList = "meal_id"),
        @Index(name = "idx_meal_items_food", columnList = "food_item_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_id", nullable = false)
    private Meal meal;

    /**
     * Tham chiếu nutrition_db.food_items.id (cross-DB, không dùng FK)
     * NULL nếu là recipe
     */
    @Column(name = "food_item_id")
    private Long foodItemId;

    /**
     * Tham chiếu nutrition_db.recipes.id (cross-DB, không dùng FK)
     * NULL nếu là food item
     */
    @Column(name = "recipe_id")
    private Long recipeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    @Builder.Default
    private ItemType itemType = ItemType.FOOD;

    /**
     * Denormalized - tên thực phẩm lúc log (không thay đổi nếu food_item bị sửa)
     */
    @Column(name = "food_name", nullable = false)
    private String foodName;

    @Column(name = "serving_size_g", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal servingSizeG = BigDecimal.valueOf(100);

    @Column(nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE;

    /**
     * total_weight_g = serving_size_g * quantity
     * Được tính bởi MySQL GENERATED ALWAYS, chỉ đọc
     */
    @Column(name = "total_weight_g", insertable = false, updatable = false)
    private BigDecimal totalWeightG;

    // ─── Giá trị dinh dưỡng thực tế (đã nhân với quantity) ──────────────────

    @Column(nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal calories = BigDecimal.ZERO;

    @Column(name = "protein_g", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal proteinG = BigDecimal.ZERO;

    @Column(name = "carbs_g", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal carbsG = BigDecimal.ZERO;

    @Column(name = "fat_g", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal fatG = BigDecimal.ZERO;

    @Column(name = "fiber_g", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal fiberG = BigDecimal.ZERO;

    @Column(name = "sodium_mg", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal sodiumMg = BigDecimal.ZERO;

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

    public enum ItemType {
        FOOD, RECIPE
    }
}

