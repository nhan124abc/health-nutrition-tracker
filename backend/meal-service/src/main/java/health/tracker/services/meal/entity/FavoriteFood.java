package health.tracker.services.meal.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "favorite_foods", indexes = {
        @Index(name = "idx_favorites_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FavoriteFood {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Tham chiếu nutrition_db.food_items.id (cross-DB)
     * NULL nếu là recipe
     */
    @Column(name = "food_item_id")
    private Long foodItemId;

    /**
     * Tham chiếu nutrition_db.recipes.id (cross-DB)
     * NULL nếu là food item
     */
    @Column(name = "recipe_id")
    private Long recipeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    @Builder.Default
    private MealItem.ItemType itemType = MealItem.ItemType.FOOD;

    @Column(name = "food_name", nullable = false)
    private String foodName;

    @Column(name = "added_at", updatable = false)
    private LocalDateTime addedAt;

    @PrePersist
    protected void onCreate() {
        addedAt = LocalDateTime.now();
    }
}

