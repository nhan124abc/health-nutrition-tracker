package health.tracker.services.activity.repository;

import health.tracker.services.activity.entity.ActivityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityTypeRepository extends JpaRepository<ActivityType, Integer> {

    List<ActivityType> findAllByOrderByCategoryAscNameAsc();

    List<ActivityType> findByHiddenFalseOrderByCategoryAscNameAsc();

    List<ActivityType> findByCategoryOrderByNameAsc(ActivityType.Category category);

    List<ActivityType> findByCategoryAndHiddenFalseOrderByNameAsc(ActivityType.Category category);

    @Query("""
            SELECT t FROM ActivityType t
            WHERE t.hidden = false
              AND (:category IS NULL OR t.category = :category)
              AND (t.createdByUserId IS NULL OR t.createdByUserId = :userId)
            ORDER BY t.category ASC, t.name ASC
            """)
    List<ActivityType> findVisibleForUser(
            @Param("category") ActivityType.Category category,
            @Param("userId") Long userId);

    boolean existsByNameIgnoreCase(String name);

    long countByCategory(ActivityType.Category category);

    ActivityType findById(Long id);
}

