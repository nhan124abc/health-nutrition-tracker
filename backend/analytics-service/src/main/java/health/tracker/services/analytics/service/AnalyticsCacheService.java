package health.tracker.services.analytics.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health.tracker.services.analytics.dto.AdminOverviewResponse;
import health.tracker.services.analytics.dto.AdminSystemAnalyticsResponse;
import health.tracker.services.analytics.dto.DailySummaryResponse;
import health.tracker.services.analytics.entity.MonthlyReport;
import health.tracker.services.analytics.entity.NutritionTrend;
import health.tracker.services.analytics.entity.WeeklyReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsCacheService {

    private static final String PREFIX = "analytics:";
    private static final Duration DAILY_TTL = Duration.ofMinutes(2);
    private static final Duration RANGE_TTL = Duration.ofMinutes(3);
    private static final Duration STREAK_TTL = Duration.ofMinutes(5);
    private static final Duration TREND_TTL = Duration.ofMinutes(10);
    private static final Duration REPORT_TTL = Duration.ofMinutes(15);
    private static final Duration ADMIN_TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public String dailyKey(Long userId, LocalDate date) {
        return PREFIX + "daily:user=" + userId + ":date=" + date;
    }

    public Optional<DailySummaryResponse> getDaily(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putDaily(String key, DailySummaryResponse response) {
        put(key, response, DAILY_TTL);
    }

    public String rangeKey(Long userId, LocalDate from, LocalDate to) {
        return PREFIX + "range:user=" + userId + ":from=" + from + ":to=" + to;
    }

    public Optional<List<DailySummaryResponse>> getRange(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putRange(String key, List<DailySummaryResponse> response) {
        put(key, response, RANGE_TTL);
    }

    public String streakKey(Long userId) {
        return PREFIX + "streak:user=" + userId;
    }

    public Optional<Map<String, Object>> getStreak(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putStreak(String key, Map<String, Object> response) {
        put(key, response, STREAK_TTL);
    }

    public String nutritionTrendsKey(Long userId, YearMonth month) {
        return PREFIX + "nutrition-trends:user=" + userId + ":month=" + month;
    }

    public Optional<List<NutritionTrend>> getNutritionTrends(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putNutritionTrends(String key, List<NutritionTrend> response) {
        put(key, response, TREND_TTL);
    }

    public String weeklyReportKey(Long userId, LocalDate weekStart) {
        return PREFIX + "report:weekly:user=" + userId + ":weekStart=" + weekStart;
    }

    public Optional<WeeklyReport> getWeeklyReport(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putWeeklyReport(String key, WeeklyReport report) {
        put(key, report, REPORT_TTL);
    }

    public String monthlyReportKey(Long userId, YearMonth month) {
        return PREFIX + "report:monthly:user=" + userId + ":month=" + month;
    }

    public Optional<MonthlyReport> getMonthlyReport(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putMonthlyReport(String key, MonthlyReport report) {
        put(key, report, REPORT_TTL);
    }

    public String adminOverviewKey() {
        return PREFIX + "admin:overview";
    }

    public Optional<AdminOverviewResponse> getAdminOverview(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putAdminOverview(String key, AdminOverviewResponse response) {
        put(key, response, ADMIN_TTL);
    }

    public String adminSystemAnalyticsKey() {
        return PREFIX + "admin:system-analytics";
    }

    public Optional<AdminSystemAnalyticsResponse> getAdminSystemAnalytics(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putAdminSystemAnalytics(String key, AdminSystemAnalyticsResponse response) {
        put(key, response, ADMIN_TTL);
    }

    public void evictAllAnalyticsCaches() {
        try {
            List<String> keys = scanKeys(PREFIX + "*");
            if (!keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception ex) {
            log.warn("Could not evict analytics cache: {}", ex.getMessage());
        }
    }

    private <T> Optional<T> get(String key, TypeReference<T> typeReference) {
        try {
            String json = redis.opsForValue().get(key);
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, typeReference));
        } catch (Exception ex) {
            log.debug("Analytics cache read failed for key {}: {}", key, ex.getMessage());
            return Optional.empty();
        }
    }

    private void put(String key, Object value, Duration ttl) {
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception ex) {
            log.debug("Analytics cache write failed for key {}: {}", key, ex.getMessage());
        }
    }

    private List<String> scanKeys(String pattern) {
        return redis.execute((RedisCallback<List<String>>) connection -> {
            List<String> keys = new ArrayList<>();
            ScanOptions options = ScanOptions.scanOptions().match(pattern).count(100).build();
            try (Cursor<byte[]> cursor = connection.keyCommands().scan(options)) {
                cursor.forEachRemaining(key -> keys.add(new String(key, StandardCharsets.UTF_8)));
            }
            return keys;
        });
    }
}
