package health.tracker.services.auth.service;

import health.tracker.services.auth.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Chống brute-force: đếm số lần login sai theo email.
 * Sau MAX_ATTEMPTS lần → khóa trong LOCK_DURATION.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginRateLimitService {

    private final StringRedisTemplate redis;

    private static final String FAIL_KEY   = "login:fail:";
    private static final String LOCK_KEY   = "login:lock:";

    @Value("${app.security.max-login-attempts:5}")
    private int maxAttempts;

    @Value("${app.security.lock-duration-minutes:15}")
    private long lockDurationMinutes;

    /** Kiểm tra trước khi cho phép thử đăng nhập */
    public void checkNotLocked(String email) {
        if (Boolean.TRUE.equals(redis.hasKey(LOCK_KEY + email))) {
            Long ttl = redis.getExpire(LOCK_KEY + email);
            log.warn("Account locked due to too many failed attempts: {}", email);
            throw new AppException(
                    org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                    "Account temporarily locked. Try again in " + ttl + " seconds."
            );
        }
    }

    /** Gọi khi đăng nhập THẤT BẠI */
    public void recordFailure(String email) {
        String failKey = FAIL_KEY + email;
        Long count = redis.opsForValue().increment(failKey);

        // Set TTL cho lần đầu
        if (count != null && count == 1) {
            redis.expire(failKey, Duration.ofMinutes(lockDurationMinutes));
        }

        log.debug("Login failure #{} for: {}", count, email);

        if (count != null && count >= maxAttempts) {
            redis.opsForValue().set(LOCK_KEY + email, "locked",
                    Duration.ofMinutes(lockDurationMinutes));
            redis.delete(failKey);
            log.warn("Account locked after {} failed attempts: {}", maxAttempts, email);
        }
    }

    /** Gọi khi đăng nhập THÀNH CÔNG → xóa counter */
    public void recordSuccess(String email) {
        redis.delete(FAIL_KEY + email);
        redis.delete(LOCK_KEY + email);
    }

    /** Lấy số lần thất bại hiện tại */
    public int getFailureCount(String email) {
        String val = redis.opsForValue().get(FAIL_KEY + email);
        return val == null ? 0 : Integer.parseInt(val);
    }
}

