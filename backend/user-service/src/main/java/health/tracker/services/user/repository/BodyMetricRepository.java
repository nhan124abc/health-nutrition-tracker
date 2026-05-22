package health.tracker.services.user.repository;

import health.tracker.services.user.entity.BodyMetric;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BodyMetricRepository extends JpaRepository<BodyMetric, Long> {

    Page<BodyMetric> findByUserIdOrderByRecordedAtDesc(Long userId, Pageable pageable);

    List<BodyMetric> findByUserIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            Long userId, LocalDate from, LocalDate to);

    boolean existsByUserIdAndRecordedAt(Long userId, LocalDate recordedAt);
}

