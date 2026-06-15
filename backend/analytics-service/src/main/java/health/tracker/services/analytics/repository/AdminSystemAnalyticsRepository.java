package health.tracker.services.analytics.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class AdminSystemAnalyticsRepository {

    private final JdbcTemplate jdbcTemplate;

    public long countUsers() {
        return count("SELECT COUNT(*) FROM auth_db.users WHERE role = 'USER'");
    }

    public long countActiveUsers() {
        return count("""
                SELECT COUNT(*)
                FROM auth_db.users
                WHERE role = 'USER' AND is_active = 1
                """);
    }

    public long countUsersCreatedBetween(LocalDate from, LocalDate to) {
        return count(
                """
                SELECT COUNT(*)
                FROM auth_db.users
                WHERE role = 'USER' AND created_at >= ? AND created_at < ?
                """,
                from.atStartOfDay(),
                to.atStartOfDay()
        );
    }

    public long countUsersCreatedBefore(LocalDate date) {
        return count(
                """
                SELECT COUNT(*)
                FROM auth_db.users
                WHERE role = 'USER' AND created_at < ?
                """,
                date.atStartOfDay()
        );
    }

    public long countLogsBetween(LocalDate from, LocalDate to) {
        return count(
                """
                SELECT
                    (SELECT COUNT(*) FROM meal_db.meals
                     WHERE meal_date >= ? AND meal_date < ?)
                  + (SELECT COUNT(*) FROM activity_db.activity_logs
                     WHERE logged_at >= ? AND logged_at < ?)
                  + (SELECT COUNT(*) FROM user_db.water_logs
                     WHERE logged_at >= ? AND logged_at < ?)
                  + (SELECT COUNT(*) FROM user_db.body_metrics
                     WHERE recorded_at >= ? AND recorded_at < ?)
                """,
                from, to,
                from.atStartOfDay(), to.atStartOfDay(),
                from.atStartOfDay(), to.atStartOfDay(),
                from, to
        );
    }

    public long countCatalogItems() {
        return count("""
                SELECT
                    (SELECT COUNT(*) FROM nutrition_db.food_items)
                  + (SELECT COUNT(*) FROM activity_db.activity_types)
                """);
    }

    public long countCatalogItemsCreatedBetween(LocalDate from, LocalDate to) {
        return count(
                """
                SELECT
                    (SELECT COUNT(*) FROM nutrition_db.food_items
                     WHERE created_at >= ? AND created_at < ?)
                  + (SELECT COUNT(*) FROM activity_db.activity_types
                     WHERE created_at >= ? AND created_at < ?)
                """,
                from.atStartOfDay(), to.atStartOfDay(),
                from.atStartOfDay(), to.atStartOfDay()
        );
    }

    public Map<String, Long> countSystemUsage() {
        Map<String, Long> usage = new LinkedHashMap<>();
        usage.put("meals", count("SELECT COUNT(*) FROM meal_db.meals"));
        usage.put("water", count("SELECT COUNT(*) FROM user_db.water_logs"));
        usage.put("activity", count("SELECT COUNT(*) FROM activity_db.activity_logs"));
        usage.put("bodyMetrics", count("SELECT COUNT(*) FROM user_db.body_metrics"));
        return usage;
    }

    public Map<String, Long> countFeatureUsers() {
        Map<String, Long> users = new LinkedHashMap<>();
        users.put("meals", count("SELECT COUNT(DISTINCT user_id) FROM meal_db.meals"));
        users.put("water", count("SELECT COUNT(DISTINCT user_id) FROM user_db.water_logs"));
        users.put("activity", count("SELECT COUNT(DISTINCT user_id) FROM activity_db.activity_logs"));
        users.put("bodyMetrics", count("SELECT COUNT(DISTINCT user_id) FROM user_db.body_metrics"));
        return users;
    }

    public List<Long> cumulativeUserGrowth(List<YearMonth> months) {
        return months.stream()
                .map(month -> countUsersCreatedBefore(month.plusMonths(1).atDay(1)))
                .toList();
    }

    private long count(String sql, Object... parameters) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, parameters);
        return value == null ? 0 : value;
    }
}
