package health.tracker.services.activity.repository;

import health.tracker.services.activity.entity.WorkoutPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

@Repository
public interface WorkoutPlanRepository extends JpaRepository<WorkoutPlan, Long> {

    List<WorkoutPlan> findByUserIdOrderByActiveDescUpdatedAtDesc(Long userId);

    Optional<WorkoutPlan> findByIdAndUserId(Long id, Long userId);

    Optional<WorkoutPlan> findByUserIdAndName(Long userId, String name);

    Optional<WorkoutPlan> findByUserIdAndPlanDate(Long userId, LocalDate planDate);
}
