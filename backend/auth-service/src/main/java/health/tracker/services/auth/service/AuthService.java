package health.tracker.services.auth.service;

import health.tracker.services.auth.dto.AuthResponse;
import health.tracker.services.auth.dto.ChangePasswordRequest;
import health.tracker.services.auth.dto.LoginRequest;
import health.tracker.services.auth.dto.RefreshTokenRequest;
import health.tracker.services.auth.dto.RegisterRequest;
import health.tracker.services.auth.entity.User;
import health.tracker.services.auth.exception.AppException;
import health.tracker.services.auth.repository.UserRepository;
import health.tracker.services.auth.security.JwtUtil;
import health.tracker.services.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository       userRepository;
    private final PasswordEncoder      passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil              jwtUtil;
    private final StringRedisTemplate  redisTemplate;
    private final LoginRateLimitService rateLimitService;
    private final UserCacheService     userCacheService;
    private final OtpService           otpService;

    private static final String BLACKLIST_PREFIX = "blacklist:token:";
    private static final String REFRESH_PREFIX   = "refresh:token:";

    // ======================== Đăng ký ========================

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(HttpStatus.CONFLICT, "Email already registered: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .authProvider(User.AuthProvider.LOCAL)
                .role(User.Role.USER)
                .build();

        userRepository.save(user);
        otpService.generateEmailVerificationOtp(user.getEmail());
        log.info("New user registered: {}", user.getEmail());

        // Cache user info
        userCacheService.put(user);

        UserPrincipal principal = UserPrincipal.create(user);
        return buildAuthResponse(principal);
    }

    // ======================== Đăng nhập ========================

    public AuthResponse login(LoginRequest request) {
        // 1. Kiểm tra brute-force trước
        rateLimitService.checkNotLocked(request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));

        if (!user.isActive()) {
            throw new AppException(HttpStatus.FORBIDDEN, "User account is unavailable or inactive");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            // 2. Đăng nhập thành công → reset counter
            rateLimitService.recordSuccess(request.getEmail());

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            log.info("User logged in: {}", principal.getEmail());
            return buildAuthResponse(principal);

        } catch (org.springframework.security.core.AuthenticationException e) {
            // 3. Sai → tăng counter
            rateLimitService.recordFailure(request.getEmail());
            int remaining = Math.max(0,
                    Integer.parseInt(System.getProperty("app.security.max-login-attempts", "5"))
                    - rateLimitService.getFailureCount(request.getEmail()));
            throw new AppException(HttpStatus.UNAUTHORIZED,
                    "Invalid email or password. " + remaining + " attempts remaining.");
        }
    }

    // ======================== Refresh Token ========================

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refresh = request.getRefreshToken();

        if (!jwtUtil.validateToken(refresh)) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
        }

        // Kiểm tra trong Redis xem đã bị revoke chưa
        Boolean isBlacklisted = redisTemplate.hasKey(BLACKLIST_PREFIX + refresh);
        if (Boolean.TRUE.equals(isBlacklisted)) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Refresh token has been revoked");
        }

        String email = jwtUtil.getEmailFromToken(refresh);
        String storedRefreshToken = redisTemplate.opsForValue().get(REFRESH_PREFIX + email);
        if (!refresh.equals(storedRefreshToken)) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Refresh token has expired or been replaced");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        if (!user.isActive()) {
            throw new AppException(HttpStatus.FORBIDDEN, "User account is unavailable or inactive");
        }

        UserPrincipal principal = UserPrincipal.create(user);
        return buildAuthResponse(principal);
    }

    // ======================== Đăng xuất ========================

    public void logout(String accessToken) {
        if (jwtUtil.validateToken(accessToken)) {
            String email = jwtUtil.getEmailFromToken(accessToken);
            redisTemplate.delete(REFRESH_PREFIX + email);

            redisTemplate.opsForValue().set(
                    BLACKLIST_PREFIX + accessToken,
                    "1",
                    Duration.ofMillis(jwtUtil.getExpirationMs())
            );
            log.info("Token blacklisted and refresh token removed on logout");
        }
    }

    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Email không tồn tại"));
        if (!user.isActive()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tài khoản đã bị khóa hoặc không hoạt động");
        }
        otpService.generatePasswordResetOtp(email);
    }

    public void verifyPasswordResetOtp(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Email không tồn tại"));
        if (!user.isActive()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Tài khoản đã bị khóa hoặc không hoạt động");
        }
        otpService.validatePasswordResetOtp(email, otp);
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "Invalid password reset request"));
        otpService.verifyPasswordResetOtp(email, otp);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setEmailVerified(true);
        userRepository.save(user);
        redisTemplate.delete(REFRESH_PREFIX + email);
        userCacheService.evict(email);
        rateLimitService.recordSuccess(email);
        log.info("Password reset completed for: {}", email);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User account is unavailable or inactive"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Password confirmation does not match");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        userCacheService.evict(user.getEmail());
        rateLimitService.recordSuccess(user.getEmail());
        log.info("Password changed for userId={}", userId);
    }

    public void requestEmailVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        if (!user.isEmailVerified()) {
            otpService.generateEmailVerificationOtp(email);
        }
    }

    @Transactional
    public void verifyEmail(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.isEmailVerified()) return;
        otpService.verifyEmailOtp(email, otp);
        user.setEmailVerified(true);
        userRepository.save(user);
        userCacheService.evict(email);
        log.info("Email verification completed for: {}", email);
    }

    // ======================== Helper ========================

    private AuthResponse buildAuthResponse(UserPrincipal principal) {
        String accessToken  = jwtUtil.generateAccessToken(principal);
        String refreshToken = jwtUtil.generateRefreshToken(principal);

        // Lưu refresh token vào Redis
        redisTemplate.opsForValue().set(
                REFRESH_PREFIX + principal.getEmail(),
                refreshToken,
                Duration.ofMillis(jwtUtil.getRefreshExpirationMs())
        );

        User user = userRepository.findByEmail(principal.getEmail()).orElseThrow();
        if (!user.isActive()) {
            throw new AppException(HttpStatus.FORBIDDEN, "User account is unavailable or inactive");
        }
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtUtil.getExpirationMs())
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .avatarUrl(user.getAvatarUrl())
                        .role(user.getRole().name())
                        .build())
                .build();
    }
}

