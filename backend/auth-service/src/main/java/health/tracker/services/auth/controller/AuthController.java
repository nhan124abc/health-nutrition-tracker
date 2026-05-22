package health.tracker.services.auth.controller;

import health.tracker.services.auth.dto.AuthResponse;
import health.tracker.services.auth.dto.LoginRequest;
import health.tracker.services.auth.dto.RefreshTokenRequest;
import health.tracker.services.auth.dto.RegisterRequest;
import health.tracker.services.auth.service.AuthService;
import health.tracker.services.auth.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService  otpService;

    /**
     * POST /api/v1/auth/register
     * Đăng ký tài khoản mới bằng email/password
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.debug("Register request for email: {}", request.getEmail());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/v1/auth/login
     * Đăng nhập bằng email/password
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.debug("Login request for email: {}", request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/auth/refresh
     * Làm mới access token bằng refresh token
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/auth/logout
     * Đăng xuất – blacklist access token
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader(value = "Authorization", required = false) String bearerToken) {

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            authService.logout(bearerToken.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    /**
     * POST /api/v1/auth/password/forgot
     * Gửi OTP đặt lại mật khẩu (lưu trong Redis, TTL 5 phút)
     */
    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestParam String email) {
        otpService.generatePasswordResetOtp(email);
        return ResponseEntity.ok(Map.of("message", "OTP sent to " + email));
    }

    /**
     * POST /api/v1/auth/password/reset
     * Xác thực OTP (Redis) và đặt lại mật khẩu
     */
    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestParam String email,
            @RequestParam String otp,
            @RequestParam String newPassword) {
        otpService.verifyPasswordResetOtp(email, otp);
        // TODO: authService.resetPassword(email, newPassword)
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    /**
     * GET /api/v1/auth/oauth2/authorize/google
     * GET /api/v1/auth/oauth2/authorize/facebook
     * Bắt đầu luồng OAuth2 – Spring Security tự xử lý redirect
     */
    @GetMapping("/oauth2/authorize/{provider}")
    public ResponseEntity<Map<String, String>> getOAuth2AuthorizeUrl(@PathVariable String provider) {
        String url = "/api/v1/auth/oauth2/authorize/" + provider;
        return ResponseEntity.ok(Map.of(
                "provider", provider,
                "redirectUrl", url
        ));
    }

    /**
     * GET /api/v1/auth/me
     * Lấy thông tin user đang đăng nhập (cần JWT)
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(
            @RequestHeader("Authorization") String bearerToken) {
        // TODO: decode token -> trả user info
        return ResponseEntity.ok(Map.of("message", "TODO: return current user info"));
    }
}

