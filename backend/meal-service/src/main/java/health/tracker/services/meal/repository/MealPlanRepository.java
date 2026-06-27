package health.tracker.services.meal.repository;

import health.tracker.services.meal.entity.MealPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

    List<MealPlan> findByUserIdOrderByActiveDescUpdatedAtDesc(Long userId);

    Optional<MealPlan> findByIdAndUserId(Long id, Long userId);
}
