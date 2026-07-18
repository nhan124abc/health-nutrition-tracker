package health.tracker.services.activity.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health.tracker.services.activity.dto.ActivityCategoryResponse;
import health.tracker.services.activity.dto.WorkoutPlanResponse;
import health.tracker.services.activity.entity.ActivityCategoryLabel;
import health.tracker.services.activity.entity.ActivityType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.StringJoiner;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityCacheService {

    private static final String PREFIX = "activity:";
    private static final String TYPES_PREFIX = PREFIX + "types:";
    private static final String CATEGORY_PREFIX = PREFIX + "categories:";
    private static final String WORKOUT_PLAN_PREFIX = PREFIX + "workout-plans:";

    private static final Duration ACTIVITY_TYPES_TTL = Duration.ofMinutes(30);
    private static final Duration CATEGORY_TTL = Duration.ofHours(1);
    private static final Duration WORKOUT_PLAN_TTL = Duration.ofMinutes(10);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public String visibleTypesKey(ActivityType.Category category, Long userId) {
        StringJoiner key = new StringJoiner("|", TYPES_PREFIX + "visible:", "");
        key.add("category=" + valueOrAll(category));
        key.add("user=" + valueOrAll(userId));
        return key.toString();
    }

    public String adminTypesKey(ActivityType.Category category, Boolean hidden) {
        StringJoiner key = new StringJoiner("|", TYPES_PREFIX + "admin:", "");
        key.add("category=" + valueOrAll(category));
        key.add("hidden=" + valueOrAll(hidden));
        return key.toString();
    }

    public Optional<List<ActivityType>> getActivityTypes(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putActivityTypes(String key, List<ActivityType> types) {
        put(key, types, ACTIVITY_TYPES_TTL);
    }

    public String adminCategoryResponsesKey() {
        return CATEGORY_PREFIX + "admin-responses";
    }

    public Optional<List<ActivityCategoryResponse>> getCategoryResponses(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putCategoryResponses(String key, List<ActivityCategoryResponse> categories) {
        put(key, categories, CATEGORY_TTL);
    }

    public String categoryLabelsKey(boolean includeHidden) {
        return CATEGORY_PREFIX + "labels:includeHidden=" + includeHidden;
    }

    public Optional<List<ActivityCategoryLabel>> getCategoryLabels(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putCategoryLabels(String key, List<ActivityCategoryLabel> labels) {
        put(key, labels, CATEGORY_TTL);
    }

    public String workoutPlansKey(Long userId) {
        return WORKOUT_PLAN_PREFIX + "user=" + valueOrAll(userId);
    }

    public Optional<List<WorkoutPlanResponse>> getWorkoutPlans(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putWorkoutPlans(String key, List<WorkoutPlanResponse> plans) {
        put(key, plans, WORKOUT_PLAN_TTL);
    }

    public void evictAllActivityCaches() {
        try {
            List<String> keys = scanKeys(PREFIX + "*");
            if (!keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception ex) {
            log.warn("Could not evict activity cache: {}", ex.getMessage());
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
            log.debug("Activity cache read failed for key {}: {}", key, ex.getMessage());
            return Optional.empty();
        }
    }

    private void put(String key, Object value, Duration ttl) {
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception ex) {
            log.debug("Activity cache write failed for key {}: {}", key, ex.getMessage());
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

    private String valueOrAll(Object value) {
        return value == null ? "all" : String.valueOf(value);
    }
}
