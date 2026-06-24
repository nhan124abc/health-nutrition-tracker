package health.tracker.services.activity.repository;

import health.tracker.services.activity.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findByUserIdAndLoggedAtBetweenOrderByLoggedAtDesc(
            Long userId, LocalDateTime from, LocalDateTime to);

    Optional<ActivityLog> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    long countByActivityTypeId(Integer activityTypeId);

    @Query("""
            SELECT COALESCE(SUM(a.caloriesBurned), 0)
            FROM ActivityLog a
            WHERE a.userId = :userId
              AND a.loggedAt >= :from
              AND a.loggedAt < :to
            """)
    BigDecimal sumCaloriesBurnedByUserIdAndDate(
            @Param("userId") Long userId,
            @Param("from")   LocalDateTime from,
            @Param("to")     LocalDateTime to
    );
}

