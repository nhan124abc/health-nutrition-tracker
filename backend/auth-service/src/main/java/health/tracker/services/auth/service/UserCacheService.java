package health.tracker.services.auth.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import health.tracker.services.auth.dto.AuthResponse.UserInfo;
import health.tracker.services.auth.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * Cache thông tin user vào Redis để giảm truy vấn DB
 * trên mỗi request cần xác thực.
 *
 * Key: cache:user:{email}
 * TTL: 10 phút
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserCacheService {

    private final StringRedisTemplate redis;
    private final ObjectMapper        objectMapper;

    private static final String CACHE_KEY = "cache:user:";
    private static final long   TTL_MINUTES = 10;

    /** Lưu thông tin user vào cache */
    public void put(User user) {
        UserInfo info = toUserInfo(user);
        try {
            String json = objectMapper.writeValueAsString(info);
            redis.opsForValue().set(CACHE_KEY + user.getEmail(), json, Duration.ofMinutes(TTL_MINUTES));
            log.debug("User cached: {}", user.getEmail());
        } catch (JsonProcessingException e) {
            log.warn("Failed to cache user {}: {}", user.getEmail(), e.getMessage());
        }
    }

    /** Lấy thông tin user từ cache */
    public Optional<UserInfo> get(String email) {
        String json = redis.opsForValue().get(CACHE_KEY + email);
        if (json == null) return Optional.empty();
        try {
            return Optional.of(objectMapper.readValue(json, UserInfo.class));
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize cached user {}: {}", email, e.getMessage());
            return Optional.empty();
        }
    }

    /** Xóa cache khi user thay đổi thông tin / đổi mật khẩu */
    public void evict(String email) {
        redis.delete(CACHE_KEY + email);
        log.debug("User cache evicted: {}", email);
    }

    private UserInfo toUserInfo(User user) {
        return UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole().name())
                .build();
    }
}

