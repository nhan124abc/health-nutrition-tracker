package health.tracker.services.analytics.repository;

import health.tracker.services.analytics.entity.NutritionTrend;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NutritionTrendRepository extends JpaRepository<NutritionTrend, Long> {
    Optional<NutritionTrend> findByUserIdAndFoodItemIdAndPeriodStartAndPeriodEnd(
            Long userId, Long foodItemId, LocalDate periodStart, LocalDate periodEnd);
    List<NutritionTrend> findByUserIdAndPeriodStartAndPeriodEndOrderByFrequencyDesc(
            Long userId, LocalDate periodStart, LocalDate periodEnd);
}
