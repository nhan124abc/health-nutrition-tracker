package health.tracker.services.activity.repository;

import health.tracker.services.activity.entity.WorkoutPlanExercise;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkoutPlanExerciseRepository extends JpaRepository<WorkoutPlanExercise, Long> {
    Optional<WorkoutPlanExercise> findByIdAndPlanUserId(Long id, Long userId);
}
