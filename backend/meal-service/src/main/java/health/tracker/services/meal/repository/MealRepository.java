package health.tracker.services.meal.repository;

import health.tracker.services.meal.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MealRepository extends JpaRepository<Meal, Long> {

    List<Meal> findByUserIdAndMealDateOrderByMealTypeAsc(Long userId, LocalDate date);

    Optional<Meal> findByIdAndUserId(Long id, Long userId);

    @Query("""
            SELECT COALESCE(SUM(m.totalCalories), 0)
            FROM Meal m
            WHERE m.userId = :userId AND m.mealDate = :date
            """)
    java.math.BigDecimal sumCaloriesByUserIdAndDate(
            @Param("userId") Long userId,
            @Param("date")   LocalDate date
    );

    boolean existsByIdAndUserId(Long id, Long userId);
}

