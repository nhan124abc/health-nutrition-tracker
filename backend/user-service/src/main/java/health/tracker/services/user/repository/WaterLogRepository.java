package health.tracker.services.user.repository;

import health.tracker.services.user.entity.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
@Repository
public interface WaterLogRepository extends JpaRepository<WaterLog, Long> {
    List<WaterLog> findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThan(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    );
}
