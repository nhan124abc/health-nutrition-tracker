package health.tracker.services.auth.service;

import health.tracker.services.auth.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

/**
 * Quản lý OTP cho:
 * - Quên mật khẩu (password reset)
 * - Xác minh email (email verification)
 *
 * OTP được lưu trong Redis với TTL ngắn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final StringRedisTemplate redis;
    private final MailService mailService;

    private static final String OTP_RESET_KEY  = "otp:reset:";
    private static final String OTP_VERIFY_KEY = "otp:verify:";
    private static final int    OTP_LENGTH      = 6;
    private static final long   OTP_TTL_MINUTES = 5;

    // ======================== Password Reset OTP ========================

    public String generatePasswordResetOtp(String email) {
        String otp = generateOtp();
        redis.opsForValue().set(OTP_RESET_KEY + email, otp, Duration.ofMinutes(OTP_TTL_MINUTES));
        log.info("Password reset OTP generated for: {} (TTL={}m)", email, OTP_TTL_MINUTES);
        mailService.sendOtp(email, "Reset your Health Nutrition password", otp);
        return otp;
    }

    public void validatePasswordResetOtp(String email, String otp) {
        String stored = redis.opsForValue().get(OTP_RESET_KEY + email);
        if (stored == null) {
            throw new AppException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "OTP expired or not found. Please request a new one."
            );
        }
        if (!stored.equals(otp)) {
            throw new AppException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Invalid OTP."
            );
        }
        log.info("Password reset OTP validated for: {}", email);
    }

    /** Xac thuc OTP reset mat khau va xoa OTP sau khi doi mat khau */
    public void verifyPasswordResetOtp(String email, String otp) {
        validatePasswordResetOtp(email, otp);
        redis.delete(OTP_RESET_KEY + email);
        log.info("Password reset OTP verified for: {}", email);
    }
    // ======================== Email Verification OTP ========================

    /** Tạo và lưu OTP xác minh email */
    public String generateEmailVerificationOtp(String email) {
        String otp = generateOtp();
        redis.opsForValue().set(OTP_VERIFY_KEY + email, otp, Duration.ofMinutes(OTP_TTL_MINUTES));
        log.info("Email verification OTP generated for: {}", email);
        mailService.sendOtp(email, "Verify your Health Nutrition email", otp);
        return otp;
    }

    /** Xác thực OTP email */
    public void verifyEmailOtp(String email, String otp) {
        String stored = redis.opsForValue().get(OTP_VERIFY_KEY + email);
        if (stored == null || !stored.equals(otp)) {
            throw new AppException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Invalid or expired verification OTP."
            );
        }
        redis.delete(OTP_VERIFY_KEY + email);
        log.info("Email verified for: {}", email);
    }

    // ======================== Helper ========================

    private String generateOtp() {
        int num = new SecureRandom().nextInt((int) Math.pow(10, OTP_LENGTH));
        return String.format("%0" + OTP_LENGTH + "d", num);
    }
}

