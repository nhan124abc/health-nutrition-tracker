package health.tracker.services.analytics.repository;

import health.tracker.services.analytics.dto.AdminUsersResponse.UserItem;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class AdminUserRepository {

    private final JdbcTemplate jdbcTemplate;

    public List<UserItem> findUsers(String search, int limit, long offset) {
        StringBuilder sql = new StringBuilder("""
                SELECT id, full_name, email, role, is_active, email_verified,
                       auth_provider, created_at
                FROM auth_db.users
                WHERE role = 'USER'
                """);
        List<Object> parameters = new ArrayList<>();

        if (search != null && !search.isBlank()) {
            sql.append("""
                     AND (
                         LOWER(email) LIKE ?
                         OR LOWER(COALESCE(full_name, '')) LIKE ?
                     )
                    """);
            String pattern = "%" + search.trim().toLowerCase() + "%";
            parameters.add(pattern);
            parameters.add(pattern);
        }

        sql.append(" ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?");
        parameters.add(limit);
        parameters.add(offset);

        return jdbcTemplate.query(
                sql.toString(),
                (resultSet, rowNum) -> new UserItem(
                        resultSet.getLong("id"),
                        resultSet.getString("full_name"),
                        resultSet.getString("email"),
                        resultSet.getString("role"),
                        resultSet.getBoolean("is_active"),
                        resultSet.getBoolean("email_verified"),
                        resultSet.getString("auth_provider"),
                        resultSet.getTimestamp("created_at").toLocalDateTime()
                ),
                parameters.toArray()
        );
    }

    public long countUsers(String search) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(*)
                FROM auth_db.users
                WHERE role = 'USER'
                """);
        List<Object> parameters = new ArrayList<>();

        if (search != null && !search.isBlank()) {
            sql.append("""
                     AND (
                         LOWER(email) LIKE ?
                         OR LOWER(COALESCE(full_name, '')) LIKE ?
                     )
                    """);
            String pattern = "%" + search.trim().toLowerCase() + "%";
            parameters.add(pattern);
            parameters.add(pattern);
        }

        Long value = jdbcTemplate.queryForObject(sql.toString(), Long.class, parameters.toArray());
        return value == null ? 0 : value;
    }

    public long countActiveUsers() {
        return countByActive(true);
    }

    public long countLockedUsers() {
        return countByActive(false);
    }

    private long countByActive(boolean active) {
        Long value = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM auth_db.users WHERE role = 'USER' AND is_active = ?",
                Long.class,
                active
        );
        return value == null ? 0 : value;
    }
}
