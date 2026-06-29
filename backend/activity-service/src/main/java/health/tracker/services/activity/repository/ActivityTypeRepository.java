package health.tracker.services.activity.repository;

import health.tracker.services.activity.entity.ActivityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityTypeRepository extends JpaRepository<ActivityType, Integer> {

    List<ActivityType> findAllByOrderByCategoryAscNameAsc();

    List<ActivityType> findByHiddenFalseOrderByCategoryAscNameAsc();

    List<ActivityType> findByCategoryOrderByNameAsc(ActivityType.Category category);

    List<ActivityType> findByCategoryAndHiddenFalseOrderByNameAsc(ActivityType.Category category);

    boolean existsByNameIgnoreCase(String name);

    long countByCategory(ActivityType.Category category);

    ActivityType findById(Long id);
}

