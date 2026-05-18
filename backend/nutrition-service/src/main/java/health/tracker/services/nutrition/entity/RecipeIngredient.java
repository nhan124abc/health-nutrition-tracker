package health.tracker.services.nutrition.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "recipe_ingredients", indexes = {
        @Index(name = "idx_recipe_ingredients_recipe", columnList = "recipe_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "food_item_id", nullable = false)
    private FoodItem foodItem;

    /**
     * Denormalized - tên thực phẩm lúc thêm vào (không đổi khi food_item bị sửa)
     */
    @Column(name = "food_name", nullable = false)
    private String foodName;

    @Column(name = "quantity_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal quantityG;

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
}

