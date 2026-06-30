package health.tracker.services.analytics.repository;

import health.tracker.services.analytics.entity.HealthInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HealthInsightRepository extends JpaRepository<HealthInsight, Long> {

    List<HealthInsight> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<HealthInsight> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndValidDate(Long userId, LocalDate validDate);
}
