package health.tracker.services.nutrition.repository;

import health.tracker.services.nutrition.entity.FoodItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    Optional<FoodItem> findByBarcode(String barcode);

    /**
     * Tìm kiếm theo tên (tiếng Anh hoặc tiếng Việt) và thương hiệu.
     * Dùng LIKE để tránh phụ thuộc vào FULLTEXT index khi test.
     */
    @Query("""
            SELECT f FROM FoodItem f
            WHERE f.isPublic = true
              AND (:keyword IS NULL OR
                   LOWER(f.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(f.nameVi) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(f.brand) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:categoryId IS NULL OR f.category.id = :categoryId)
              AND (f.createdByUserId IS NULL OR f.createdByUserId = :userId)
            ORDER BY
              CASE WHEN :recipeFirst = true AND EXISTS (
                  SELECT ingredient.id FROM RecipeIngredient ingredient
                  WHERE ingredient.foodItem = f
                    AND ingredient.recipe.isPublic = true
              ) THEN 0 ELSE 1 END,
              f.verified DESC,
              f.name ASC
            """)
    Page<FoodItem> search(
            @Param("keyword")    String keyword,
            @Param("categoryId") Integer categoryId,
            @Param("userId")     Long userId,
            @Param("recipeFirst") boolean recipeFirst,
            Pageable pageable
    );

    Page<FoodItem> findByCreatedByUserIdAndIsPublicOrderByCreatedAtDesc(
            Long userId, boolean isPublic, Pageable pageable);

    long countByCategoryId(Integer categoryId);
}

