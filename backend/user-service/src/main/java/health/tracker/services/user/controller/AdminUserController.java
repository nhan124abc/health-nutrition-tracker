package health.tracker.services.user.controller;

import health.tracker.services.user.dto.AdminUserProfileRequest;
import health.tracker.services.user.dto.AdminUserProfileUpdateRequest;
import health.tracker.services.user.dto.UserProfileResponse;
import health.tracker.services.user.exception.AppException;
import health.tracker.services.user.service.AdminUserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserProfileService adminUserProfileService;

    @GetMapping
    public ResponseEntity<Page<UserProfileResponse>> getUsers(
            @RequestHeader("X-User-Role") String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean hidden) {

        requireAdmin(role);
        return ResponseEntity.ok(adminUserProfileService.getUsers(page, size, search, hidden));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getUser(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long userId) {

        requireAdmin(role);
        return ResponseEntity.ok(adminUserProfileService.getUser(userId));
    }

    @PostMapping
    public ResponseEntity<UserProfileResponse> createUser(
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody AdminUserProfileRequest request) {

        requireAdmin(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserProfileService.createUser(request));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> updateUser(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserProfileUpdateRequest request) {

        requireAdmin(role);
        return ResponseEntity.ok(adminUserProfileService.updateUser(userId, request));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, String>> deleteUser(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long userId) {

        requireAdmin(role);
        adminUserProfileService.deleteUser(userId);
        return ResponseEntity.ok(Map.of("message", "User profile deleted successfully"));
    }

    @PatchMapping("/{userId}/hide")
    public ResponseEntity<UserProfileResponse> hideUser(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long userId) {

        requireAdmin(role);
        return ResponseEntity.ok(adminUserProfileService.hideUser(userId));
    }

    @PatchMapping("/{userId}/restore")
    public ResponseEntity<UserProfileResponse> restoreUser(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long userId) {

        requireAdmin(role);
        return ResponseEntity.ok(adminUserProfileService.restoreUser(userId));
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Admin role is required");
        }
    }
}
