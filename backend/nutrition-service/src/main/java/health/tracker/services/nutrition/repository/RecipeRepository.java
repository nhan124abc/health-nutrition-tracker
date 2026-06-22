package health.tracker.services.nutrition.repository;

import health.tracker.services.nutrition.entity.Recipe;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    @EntityGraph(attributePaths = {"ingredients", "ingredients.foodItem"})
    @Query("""
            SELECT r FROM Recipe r
            WHERE r.isPublic = true
              AND r.totalCalories IS NOT NULL
              AND r.totalCalories > 0
              AND (:maxCalories IS NULL OR r.totalCalories <= :maxCalories)
              AND (:keyword IS NULL
                   OR LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(COALESCE(r.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR EXISTS (
                       SELECT i FROM RecipeIngredient i
                       WHERE i.recipe = r
                         AND LOWER(i.foodName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   ))
            ORDER BY r.totalCalories DESC, r.id ASC
            """)
    List<Recipe> findSuggestions(
            @Param("maxCalories") BigDecimal maxCalories,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"ingredients", "ingredients.foodItem"})
    @Query("""
            SELECT DISTINCT r FROM Recipe r
            JOIN r.ingredients i
            WHERE r.isPublic = true
              AND r.totalCalories IS NOT NULL
              AND r.totalCalories > 0
              AND (:maxCalories IS NULL OR r.totalCalories <= :maxCalories)
              AND i.foodItem.id IN :foodIds
            ORDER BY r.totalCalories DESC, r.id ASC
            """)
    List<Recipe> findSuggestionsByFoodIds(
            @Param("maxCalories") BigDecimal maxCalories,
            @Param("foodIds") List<Long> foodIds,
            Pageable pageable
    );
}
