package health.tracker.services.analytics.repository;

import health.tracker.services.analytics.entity.MonthlyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MonthlyReportRepository extends JpaRepository<MonthlyReport, Long> {
    Optional<MonthlyReport> findByUserIdAndReportYearAndReportMonth(Long userId, Integer year, Integer month);
}
