package health.tracker.services.analytics.repository;

import health.tracker.services.analytics.entity.DailySummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailySummaryRepository extends JpaRepository<DailySummary, Long> {

    Optional<DailySummary> findByUserIdAndSummaryDate(Long userId, LocalDate date);

    List<DailySummary> findByUserIdAndSummaryDateBetweenOrderBySummaryDateAsc(
            Long userId, LocalDate from, LocalDate to);

    /** Số ngày đạt mục tiêu calo trong khoảng thời gian */
    @Query("""
            SELECT COUNT(d) FROM DailySummary d
            WHERE d.userId = :userId
              AND d.summaryDate BETWEEN :from AND :to
              AND d.calorieGoalMet = true
            """)
    long countGoalMetDays(
            @Param("userId") Long userId,
            @Param("from")   LocalDate from,
            @Param("to")     LocalDate to
    );
}

