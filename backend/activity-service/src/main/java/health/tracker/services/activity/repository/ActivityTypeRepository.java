package health.tracker.services.activity.repository;

import health.tracker.services.activity.entity.ActivityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityTypeRepository extends JpaRepository<ActivityType, Integer> {

    List<ActivityType> findAllByOrderByCategoryAscNameAsc();

    List<ActivityType> findByCategoryOrderByNameAsc(ActivityType.Category category);
}

