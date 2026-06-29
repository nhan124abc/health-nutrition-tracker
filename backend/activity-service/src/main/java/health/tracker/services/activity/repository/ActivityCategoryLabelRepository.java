package health.tracker.services.activity.repository;

import health.tracker.services.activity.entity.ActivityCategoryLabel;
import health.tracker.services.activity.entity.ActivityType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityCategoryLabelRepository
        extends JpaRepository<ActivityCategoryLabel, ActivityType.Category> {
}
