package health.tracker.services.user.repository;

import health.tracker.services.user.entity.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WaterLogRepository extends JpaRepository<WaterLog, Long> {
    List<WaterLog> findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThan(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<WaterLog> findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAtDesc(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    );

    Optional<WaterLog> findByIdAndUserId(Long waterId, Long userId);

    void deleteByUserId(Long userId);
}
