package health.tracker.services.user.repository;

import health.tracker.services.user.entity.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    Optional<UserProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    boolean existsByUsernameAndUserIdNot(String username, Long userId);

    Page<UserProfile> findByHidden(boolean hidden, Pageable pageable);

    Page<UserProfile> findByUsernameContainingIgnoreCase(String username, Pageable pageable);

    Page<UserProfile> findByHiddenAndUsernameContainingIgnoreCase(boolean hidden, String username, Pageable pageable);
}

