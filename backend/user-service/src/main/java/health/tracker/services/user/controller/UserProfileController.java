package health.tracker.services.user.controller;

import health.tracker.services.user.dto.*;
import health.tracker.services.user.service.NotificationSettingsService;
import health.tracker.services.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * User Profile & Body Metrics API
 *
 * <p>User identity được inject bởi API Gateway qua header {@code X-User-Id}.
 * Service không cần validate JWT — tin tưởng Gateway hoàn toàn.
 *
 * <pre>
 * GET  /api/v1/users/me/profile         — Xem hồ sơ
 * PUT  /api/v1/users/me/profile         — Cập nhật hồ sơ
 * POST /api/v1/users/me/metrics         — Ghi chỉ số cơ thể
 * GET  /api/v1/users/me/metrics         — Lịch sử chỉ số cơ thể
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService profileService;
    private final health.tracker.services.user.service.GoalPlanService goalPlanService;
    private final NotificationSettingsService notificationSettingsService;

    @PostMapping("/goal-plans/suggestions")
    public ResponseEntity<GoalPlanResponse> suggestGoalPlan(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody GoalPlanRequest request) {
        return ResponseEntity.ok(goalPlanService.suggest(userId, request));
    }

    @PostMapping("/goal-plans/apply")
    public ResponseEntity<GoalPlanResponse.Option> applyGoalPlan(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody GoalPlanRequest request) {
        return ResponseEntity.ok(goalPlanService.apply(userId, request));
    }

    @GetMapping("/notification-settings")
    public ResponseEntity<NotificationSettingsResponse> getNotificationSettings(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(notificationSettingsService.getSettings(userId));
    }

    @PutMapping("/notification-settings")
    public ResponseEntity<NotificationSettingsResponse> updateNotificationSettings(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody NotificationSettingsRequest request) {
        return ResponseEntity.ok(notificationSettingsService.updateSettings(userId, request));
    }

    // ─── Profile ──────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/users/me/profile
     * Lấy hồ sơ sức khoẻ. Nếu chưa có, tự động khởi tạo hồ sơ trống.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(
            @RequestHeader("X-User-Id") Long userId) {

        log.debug("Get profile for userId={}", userId);
        return ResponseEntity.ok(profileService.getOrCreateProfile(userId));
    }

    /**
     * PUT /api/v1/users/me/profile
     * Cập nhật hồ sơ (PATCH semantics — chỉ field nào có giá trị mới được cập nhật).
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody UserProfileRequest request) {

        log.debug("Update profile for userId={}", userId);
        return ResponseEntity.ok(profileService.updateProfile(userId, request));
    }

    // ─── Body Metrics ─────────────────────────────────────────────────────────

    /**
     * POST /api/v1/users/me/metrics
     * Ghi nhận chỉ số cơ thể mới (cân nặng, % mỡ, BMI, v.v.).
     * BMI sẽ được tính tự động nếu hồ sơ đã có chiều cao.
     */
    @PostMapping("/metrics")
    public ResponseEntity<BodyMetricResponse> addMetric(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody BodyMetricRequest request) {

        log.debug("Add body metric for userId={}, date={}", userId, request.getRecordedAt());
        BodyMetricResponse response = profileService.addMetric(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/users/me/metrics?page=0&size=10
     * Lấy lịch sử chỉ số cơ thể theo trang (mới nhất trước).
     */
    @GetMapping("/metrics")
    public ResponseEntity<Page<BodyMetricResponse>> getMetrics(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<BodyMetricResponse> result = profileService.getMetrics(
                userId,
                PageRequest.of(page, size, Sort.by("recordedAt").descending())
        );
        return ResponseEntity.ok(result);
    }

    @PutMapping("/metrics/{id}")
    public ResponseEntity<BodyMetricResponse> updateMetric(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody BodyMetricRequest request) {

        log.debug("Update body metric for userId={}, metricId={}", userId, id);
        return ResponseEntity.ok(profileService.updateMetric(userId, id, request));
    }

    @DeleteMapping("/metrics/{id}")
    public ResponseEntity<Void> deleteMetric(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {

        log.debug("Delete body metric for userId={}, metricId={}", userId, id);
        profileService.deleteMetric(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/water")
    public ResponseEntity<WaterLogResponse> logWater(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody WaterLogRequest request) {
        WaterLogResponse response = profileService.logWater(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    @GetMapping("/water/today")
    public ResponseEntity<DailyWaterResponse> getTodayWater(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(profileService.getTodayWater(userId));
    }
    @GetMapping("/water")
    public ResponseEntity<List<WaterLogResponse>> getWaterLogs(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(profileService.getWaterLogs(userId, date));
    }
    @DeleteMapping("/water/{id}")
    public ResponseEntity<Void> deleteWater(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        profileService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/water/{id}")
    public ResponseEntity<WaterLogResponse> updateWater(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody WaterLogRequest request) {
        log.debug("User {} updating water: id={}, amountMl={}, date={}",
                userId, id,  request.getAmountMl(), request.getLoggedAt());

        WaterLogResponse response = profileService.updateWater(id, userId, request);
        return ResponseEntity.ok(response);
    }
}

