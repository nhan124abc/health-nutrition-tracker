package health.tracker.services.nutrition.repository;

import health.tracker.services.nutrition.entity.FoodCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodCategoryRepository extends JpaRepository<FoodCategory, Integer> {

    List<FoodCategory> findAllByOrderByNameAsc();

    List<FoodCategory> findByHiddenFalseOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);
}

