package health.tracker.services.auth.controller;

import health.tracker.services.auth.dto.*;
import health.tracker.services.auth.entity.User;
import health.tracker.services.auth.exception.AppException;
import health.tracker.services.auth.repository.UserRepository;
import health.tracker.services.auth.service.AdminUserService;
import health.tracker.services.auth.service.AuthService;
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
    private final AdminUserService adminUserService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader(value = "Authorization", required = false) String bearerToken) {
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            authService.logout(bearerToken.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP has been sent"));
    }

    @PostMapping("/password/verify-otp")
    public ResponseEntity<Map<String, String>> verifyPasswordResetOtp(
            @Valid @RequestBody PasswordResetOtpRequest request) {
        authService.verifyPasswordResetOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @PostMapping("/email/verification/send")
    public ResponseEntity<Map<String, String>> sendEmailVerification(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestEmailVerification(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Verification OTP sent"));
    }

    @PostMapping("/email/verification/confirm")
    public ResponseEntity<Map<String, String>> verifyEmail(
            @Valid @RequestBody EmailVerificationRequest request) {
        authService.verifyEmail(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }

    @GetMapping("/oauth2/authorize/{provider}")
    public ResponseEntity<Map<String, String>> getOAuth2AuthorizeUrl(@PathVariable String provider) {
        return ResponseEntity.ok(Map.of(
                "provider", provider,
                "redirectUrl", "/api/v1/auth/oauth2/authorize/" + provider
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@RequestHeader("X-User-Id") Long userId) {
        User user = userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new AppException(
                        HttpStatus.UNAUTHORIZED,
                        "User account is unavailable or inactive"));
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "fullName", user.getFullName() == null ? "" : user.getFullName(),
                "role", user.getRole().name(),
                "authProvider", user.getAuthProvider().name(),
                "emailVerified", user.isEmailVerified()
        ));
    }

    @GetMapping("/admin/users")
    public ResponseEntity<AdminUsersResponse> adminUsers(
            @RequestHeader("X-User-Role") String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {

        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Admin role is required");
        }

        return ResponseEntity.ok(adminUserService.getUsers(page, size, search));
    }
}
