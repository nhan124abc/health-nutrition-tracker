package health.tracker.services.user.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health.tracker.services.user.dto.DailyWaterResponse;
import health.tracker.services.user.dto.NotificationSettingsResponse;
import health.tracker.services.user.dto.UserProfileResponse;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserCacheService {

    private static final String PREFIX = "user:";
    private static final Duration PROFILE_TTL = Duration.ofMinutes(15);
    private static final Duration NOTIFICATION_SETTINGS_TTL = Duration.ofMinutes(30);
    private static final Duration DAILY_WATER_TTL = Duration.ofMinutes(2);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public String profileKey(Long userId) {
        return PREFIX + "profile:user=" + userId;
    }

    public Optional<UserProfileResponse> getProfile(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putProfile(String key, UserProfileResponse profile) {
        put(key, profile, PROFILE_TTL);
    }

    public String notificationSettingsKey(Long userId) {
        return PREFIX + "notification-settings:user=" + userId;
    }

    public Optional<NotificationSettingsResponse> getNotificationSettings(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putNotificationSettings(String key, NotificationSettingsResponse settings) {
        put(key, settings, NOTIFICATION_SETTINGS_TTL);
    }

    public String dailyWaterKey(Long userId, LocalDate date) {
        return PREFIX + "daily-water:user=" + userId + ":date=" + date;
    }

    public Optional<DailyWaterResponse> getDailyWater(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putDailyWater(String key, DailyWaterResponse response) {
        put(key, response, DAILY_WATER_TTL);
    }

    public void evictAllUserCaches() {
        try {
            List<String> keys = scanKeys(PREFIX + "*");
            if (!keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception ex) {
            log.warn("Could not evict user cache: {}", ex.getMessage());
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
            log.debug("User cache read failed for key {}: {}", key, ex.getMessage());
            return Optional.empty();
        }
    }

    private void put(String key, Object value, Duration ttl) {
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception ex) {
            log.debug("User cache write failed for key {}: {}", key, ex.getMessage());
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
