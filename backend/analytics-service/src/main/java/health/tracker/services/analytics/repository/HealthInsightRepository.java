package health.tracker.services.analytics.repository;

import health.tracker.services.analytics.entity.HealthInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface HealthInsightRepository extends JpaRepository<HealthInsight, Long> {
    boolean existsByUserIdAndInsightTypeAndTitleAndValidDate(
            Long userId, HealthInsight.InsightType type, String title, LocalDate validDate);
    List<HealthInsight> findByUserIdOrderByCreatedAtDesc(Long userId);
}
