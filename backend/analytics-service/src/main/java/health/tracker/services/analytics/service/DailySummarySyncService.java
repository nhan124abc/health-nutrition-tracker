package health.tracker.services.analytics.service;

import health.tracker.services.analytics.entity.DailySummary;
import health.tracker.services.analytics.repository.DailySummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailySummarySyncService {

    private final JdbcTemplate jdbcTemplate;
    private final DailySummaryRepository summaryRepository;

    @Transactional
    public DailySummary syncDay(Long userId, LocalDate date) {
        MealTotals meals = loadMeals(userId, date);
        ActivityTotals activities = loadActivities(userId, date);
        int waterMl = loadWater(userId, date);
        Integer calorieGoal = loadCalorieGoal(userId);
        BigDecimal weightKg = loadWeight(userId, date);

        DailySummary summary = summaryRepository.findByUserIdAndSummaryDate(userId, date)
                .orElseGet(DailySummary::new);
        summary.setUserId(userId);
        summary.setSummaryDate(date);
        summary.setTotalCaloriesConsumed(meals.calories());
        summary.setTotalProteinG(meals.protein());
        summary.setTotalCarbsG(meals.carbs());
        summary.setTotalFatG(meals.fat());
        summary.setTotalFiberG(meals.fiber());
        summary.setTotalSodiumMg(meals.sodium());
        summary.setMealCount(meals.count());
        summary.setTotalCaloriesBurned(activities.calories());
        summary.setTotalActiveMinutes(activities.minutes());
        summary.setTotalSteps(activities.steps());
        summary.setTotalDistanceKm(activities.distance());
        summary.setActivityCount(activities.count());
        summary.setWaterIntakeMl(waterMl);
        summary.setCalorieGoal(calorieGoal);
        summary.setCalorieGoalMet(calorieGoal != null
                && meals.calories().signum() > 0
                && meals.calories().compareTo(BigDecimal.valueOf(calorieGoal)) <= 0);
        summary.setWeightKg(weightKg);
        return summaryRepository.save(summary);
    }

    @Transactional
    public void syncRange(Long userId, LocalDate from, LocalDate to) {
        for (LocalDate date : findDates(userId, from, to)) {
            syncDay(userId, date);
        }
    }

    @Scheduled(cron = "${analytics.summaries.cron:0 5 0 * * *}")
    @Transactional
    public void refreshRecentSummaries() {
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(8);
        for (UserDate userDate : findUserDates(from, today)) {
            try {
                syncDay(userDate.userId(), userDate.date());
            } catch (RuntimeException exception) {
                log.error("Unable to reconcile daily summary: userId={}, date={}",
                        userDate.userId(), userDate.date(), exception);
            }
        }
    }

    private MealTotals loadMeals(Long userId, LocalDate date) {
        return jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(m.total_calories), 0),
                       COALESCE(SUM(m.total_protein_g), 0),
                       COALESCE(SUM(m.total_carbs_g), 0),
                       COALESCE(SUM(m.total_fat_g), 0),
                       COALESCE(SUM(m.total_fiber_g), 0),
                       COALESCE(SUM((SELECT COALESCE(SUM(mi.sodium_mg), 0)
                                     FROM meal_db.meal_items mi WHERE mi.meal_id = m.id)), 0),
                       COUNT(m.id)
                FROM meal_db.meals m
                WHERE m.user_id = ? AND m.meal_date = ?
                """, (rs, rowNum) -> new MealTotals(
                value(rs.getBigDecimal(1)), value(rs.getBigDecimal(2)), value(rs.getBigDecimal(3)),
                value(rs.getBigDecimal(4)), value(rs.getBigDecimal(5)), value(rs.getBigDecimal(6)),
                rs.getInt(7)), userId, Date.valueOf(date));
    }

    private ActivityTotals loadActivities(Long userId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        return jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(calories_burned), 0),
                       COALESCE(SUM(duration_minutes), 0),
                       COALESCE(SUM(steps), 0),
                       COALESCE(SUM(distance_km), 0),
                       COUNT(id)
                FROM activity_db.activity_logs
                WHERE user_id = ? AND logged_at >= ? AND logged_at < ?
                """, (rs, rowNum) -> new ActivityTotals(
                value(rs.getBigDecimal(1)), rs.getInt(2), rs.getInt(3),
                value(rs.getBigDecimal(4)), rs.getInt(5)),
                userId, Timestamp.valueOf(start), Timestamp.valueOf(start.plusDays(1)));
    }

    private int loadWater(Long userId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        Integer value = jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(amount_ml), 0)
                FROM user_db.water_logs
                WHERE user_id = ? AND logged_at >= ? AND logged_at < ?
                """, Integer.class, userId, Timestamp.valueOf(start), Timestamp.valueOf(start.plusDays(1)));
        return value == null ? 0 : value;
    }

    private Integer loadCalorieGoal(Long userId) {
        return jdbcTemplate.query("""
                SELECT daily_calorie_goal FROM user_db.user_profiles
                WHERE user_id = ? LIMIT 1
                """, rs -> rs.next() ? (Integer) rs.getObject(1) : null, userId);
    }

    private BigDecimal loadWeight(Long userId, LocalDate date) {
        return jdbcTemplate.query("""
                SELECT weight_kg FROM user_db.body_metrics
                WHERE user_id = ? AND recorded_at = ? AND weight_kg IS NOT NULL
                ORDER BY id DESC LIMIT 1
                """, rs -> rs.next() ? rs.getBigDecimal(1) : null, userId, Date.valueOf(date));
    }

    private List<LocalDate> findDates(Long userId, LocalDate from, LocalDate to) {
        return jdbcTemplate.query("""
                SELECT DISTINCT activity_date FROM (
                    SELECT meal_date AS activity_date FROM meal_db.meals
                    WHERE user_id = ? AND meal_date BETWEEN ? AND ?
                    UNION ALL
                    SELECT DATE(logged_at) FROM activity_db.activity_logs
                    WHERE user_id = ? AND logged_at >= ? AND logged_at < ?
                    UNION ALL
                    SELECT DATE(logged_at) FROM user_db.water_logs
                    WHERE user_id = ? AND logged_at >= ? AND logged_at < ?
                    UNION ALL
                    SELECT recorded_at FROM user_db.body_metrics
                    WHERE user_id = ? AND recorded_at BETWEEN ? AND ?
                    UNION ALL
                    SELECT summary_date FROM analytics_db.daily_summaries
                    WHERE user_id = ? AND summary_date BETWEEN ? AND ?
                ) source_dates
                ORDER BY activity_date
                """, (rs, rowNum) -> rs.getDate(1).toLocalDate(), rangeParameters(userId, from, to));
    }

    private List<UserDate> findUserDates(LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        return jdbcTemplate.query("""
                SELECT DISTINCT user_id, activity_date FROM (
                    SELECT user_id, meal_date AS activity_date FROM meal_db.meals
                    WHERE meal_date BETWEEN ? AND ?
                    UNION ALL
                    SELECT user_id, DATE(logged_at) FROM activity_db.activity_logs
                    WHERE logged_at >= ? AND logged_at < ?
                    UNION ALL
                    SELECT user_id, DATE(logged_at) FROM user_db.water_logs
                    WHERE logged_at >= ? AND logged_at < ?
                    UNION ALL
                    SELECT user_id, recorded_at FROM user_db.body_metrics
                    WHERE recorded_at BETWEEN ? AND ?
                    UNION ALL
                    SELECT user_id, summary_date FROM analytics_db.daily_summaries
                    WHERE summary_date BETWEEN ? AND ?
                ) source_dates
                ORDER BY user_id, activity_date
                """, (rs, rowNum) -> new UserDate(rs.getLong(1), rs.getDate(2).toLocalDate()),
                Date.valueOf(from), Date.valueOf(to), Timestamp.valueOf(start), Timestamp.valueOf(end),
                Timestamp.valueOf(start), Timestamp.valueOf(end), Date.valueOf(from), Date.valueOf(to),
                Date.valueOf(from), Date.valueOf(to));
    }

    private Object[] rangeParameters(Long userId, LocalDate from, LocalDate to) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        return new Object[]{
                userId, Date.valueOf(from), Date.valueOf(to),
                userId, Timestamp.valueOf(start), Timestamp.valueOf(end),
                userId, Timestamp.valueOf(start), Timestamp.valueOf(end),
                userId, Date.valueOf(from), Date.valueOf(to),
                userId, Date.valueOf(from), Date.valueOf(to)
        };
    }

    private BigDecimal value(BigDecimal number) {
        return number == null ? BigDecimal.ZERO : number;
    }

    private record MealTotals(BigDecimal calories, BigDecimal protein, BigDecimal carbs,
                              BigDecimal fat, BigDecimal fiber, BigDecimal sodium, int count) {}

    private record ActivityTotals(BigDecimal calories, int minutes, int steps,
                                  BigDecimal distance, int count) {}

    private record UserDate(Long userId, LocalDate date) {}
}
