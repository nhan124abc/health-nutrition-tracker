package health.tracker.services.analytics.repository;

import health.tracker.services.analytics.dto.AdminOverviewResponse.RecentActivity;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AdminOverviewRepository {

    private final JdbcTemplate jdbcTemplate;

    public long countUsers() {
        return count("SELECT COUNT(*) FROM auth_db.users WHERE role = 'USER'");
    }

    public long countFoods() {
        return count("SELECT COUNT(*) FROM nutrition_db.food_items");
    }

    public long countExercises() {
        return count("SELECT COUNT(*) FROM activity_db.activity_types");
    }

    public long countTodayLogs() {
        return count("""
                SELECT
                    (SELECT COUNT(*) FROM meal_db.meals WHERE meal_date = CURDATE())
                  + (SELECT COUNT(*) FROM activity_db.activity_logs WHERE DATE(logged_at) = CURDATE())
                  + (SELECT COUNT(*) FROM user_db.water_logs WHERE DATE(logged_at) = CURDATE())
                """);
    }

    public long countNewUsers(int daysBackStart, int daysBackEnd) {
        return countInPeriod("auth_db.users", "created_at", "role = 'USER'", daysBackStart, daysBackEnd);
    }

    public long countNewFoods(int daysBackStart, int daysBackEnd) {
        return countInPeriod("nutrition_db.food_items", "created_at", "1 = 1", daysBackStart, daysBackEnd);
    }

    public long countNewExercises(int daysBackStart, int daysBackEnd) {
        return countInPeriod("activity_db.activity_types", "created_at", "1 = 1", daysBackStart, daysBackEnd);
    }

    public long countLogs(int daysBackStart, int daysBackEnd) {
        String sql = """
                SELECT
                    (SELECT COUNT(*) FROM meal_db.meals
                     WHERE meal_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                       AND meal_date < DATE_SUB(CURDATE(), INTERVAL ? DAY))
                  + (SELECT COUNT(*) FROM activity_db.activity_logs
                     WHERE logged_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                       AND logged_at < DATE_SUB(CURDATE(), INTERVAL ? DAY))
                  + (SELECT COUNT(*) FROM user_db.water_logs
                     WHERE logged_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                       AND logged_at < DATE_SUB(CURDATE(), INTERVAL ? DAY))
                """;
        Long value = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                daysBackStart, daysBackEnd,
                daysBackStart, daysBackEnd,
                daysBackStart, daysBackEnd
        );
        return value == null ? 0 : value;
    }

    public int foodDataHealth() {
        return percentage(
                "SELECT COUNT(*) FROM nutrition_db.food_items WHERE is_verified = 1",
                "SELECT COUNT(*) FROM nutrition_db.food_items"
        );
    }

    public int exerciseDataHealth() {
        return percentage(
                "SELECT COUNT(*) FROM activity_db.activity_types WHERE met_value > 0",
                "SELECT COUNT(*) FROM activity_db.activity_types"
        );
    }

    public int userDataHealth() {
        return percentage(
                """
                SELECT COUNT(*)
                FROM user_db.user_profiles p
                JOIN auth_db.users u ON u.id = p.user_id
                WHERE u.role = 'USER'
                  AND p.date_of_birth IS NOT NULL
                  AND p.gender IS NOT NULL
                  AND p.height_cm IS NOT NULL
                  AND p.weight_kg IS NOT NULL
                  AND p.goal IS NOT NULL
                """,
                "SELECT COUNT(*) FROM auth_db.users WHERE role = 'USER'"
        );
    }

    public List<RecentActivity> findRecentActivities(int limit) {
        String sql = """
                SELECT activity_id, content, activity_type, activity_status, variant
                FROM (
                    SELECT CONCAT('food-', id) AS activity_id,
                           CONCAT('Food added: ', COALESCE(name_vi, name)) AS content,
                           'Food' AS activity_type,
                           IF(is_verified = 1, 'Approved', 'Pending') AS activity_status,
                           IF(is_verified = 1, 'success', 'warning') AS variant,
                           created_at
                    FROM nutrition_db.food_items

                    UNION ALL

                    SELECT CONCAT('exercise-', id),
                           CONCAT('Exercise added: ', COALESCE(name_vi, name)),
                           'Activity',
                           'Completed',
                           'success',
                           created_at
                    FROM activity_db.activity_types

                    UNION ALL

                    SELECT CONCAT('report-', id),
                           CONCAT('Weekly report created for user #', user_id),
                           'Report',
                           'Completed',
                           'success',
                           created_at
                    FROM analytics_db.weekly_reports
                ) recent
                ORDER BY created_at DESC
                LIMIT ?
                """;

        return jdbcTemplate.query(
                sql,
                (resultSet, rowNum) -> new RecentActivity(
                        resultSet.getString("activity_id"),
                        resultSet.getString("content"),
                        resultSet.getString("activity_type"),
                        resultSet.getString("activity_status"),
                        resultSet.getString("variant")
                ),
                limit
        );
    }

    private long count(String sql) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class);
        return value == null ? 0 : value;
    }

    private long countInPeriod(
            String table,
            String dateColumn,
            String additionalCondition,
            int daysBackStart,
            int daysBackEnd
    ) {
        String sql = """
                SELECT COUNT(*)
                FROM %s
                WHERE %s >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                  AND %s < DATE_SUB(CURDATE(), INTERVAL ? DAY)
                  AND %s
                """.formatted(table, dateColumn, dateColumn, additionalCondition);
        Long value = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                daysBackStart,
                daysBackEnd
        );
        return value == null ? 0 : value;
    }

    private int percentage(String completedSql, String totalSql) {
        long total = count(totalSql);
        if (total == 0) {
            return 0;
        }

        long completed = count(completedSql);
        return (int) Math.round(completed * 100.0 / total);
    }
}
