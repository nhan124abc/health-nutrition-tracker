package health.tracker.services.ai.repository;

import health.tracker.services.ai.entity.AiUsageLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface AiUsageLimitRepository extends JpaRepository<AiUsageLimit, Long> {

    Optional<AiUsageLimit> findByUserIdAndRequestDate(String userId, LocalDate requestDate);

    Optional<AiUsageLimit> findByGuestIdAndRequestDate(String guestId, LocalDate requestDate);
}
