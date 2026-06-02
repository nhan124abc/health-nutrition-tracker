package health.tracker.services.ai.repository;

import health.tracker.services.ai.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findTop50ByUserIdOrderByCreatedAtDesc(String userId);

    List<ChatMessage> findTop50ByGuestIdOrderByCreatedAtDesc(String guestId);

    List<ChatMessage> findTop10ByUserIdOrderByCreatedAtDesc(String userId);

    List<ChatMessage> findTop10ByGuestIdOrderByCreatedAtDesc(String guestId);

    void deleteByUserId(String userId);

    void deleteByGuestId(String guestId);
}
