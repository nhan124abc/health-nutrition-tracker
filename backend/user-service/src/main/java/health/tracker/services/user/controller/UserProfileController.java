package health.tracker.services.user.controller;

import health.tracker.services.user.dto.*;
import health.tracker.services.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}

