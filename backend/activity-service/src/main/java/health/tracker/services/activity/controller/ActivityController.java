package health.tracker.services.activity.controller;

import health.tracker.services.activity.dto.ActivityLogRequest;
import health.tracker.services.activity.dto.ActivityLogResponse;
import health.tracker.services.activity.dto.ActivityTypeRequest;
import health.tracker.services.activity.dto.ActivityCategoryLabelRequest;
import health.tracker.services.activity.dto.ActivityCategoryLabelCreateRequest;
import health.tracker.services.activity.dto.WorkoutPlanRequest;
import health.tracker.services.activity.dto.WorkoutPlanResponse;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.entity.ActivityCategoryLabel;
import health.tracker.services.activity.exception.AppException;
import health.tracker.services.activity.repository.ActivityLogRepository;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import health.tracker.services.activity.service.ActivityService;
import health.tracker.services.activity.service.ActivityTypeService;
import health.tracker.services.activity.service.ActivityCategoryLabelService;
import health.tracker.services.activity.service.WorkoutPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/**
 * Activity Logging API
 *
 * <pre>
 * GET    /api/v1/activities?date=       — Hoạt động trong ngày
 * POST   /api/v1/activities             — Log hoạt động mới
 * DELETE /api/v1/activities/{id}        — Xoá log
 * GET    /api/v1/activities/types       — Danh mục hoạt động
 * GET    /api/v1/activities/summary?date= — Tổng calo đốt trong ngày
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService        activityService;
    private final ActivityTypeService    activityTypeService;
    private final ActivityCategoryLabelService categoryLabelService;
    private final WorkoutPlanService     workoutPlanService;
    private final ActivityTypeRepository typeRepository;
    private final ActivityLogRepository  logRepository;

    /**
     * GET /api/v1/activities?date=2026-05-13
     * Lấy toàn bộ hoạt động trong ngày (mặc định hôm nay).
     */
    @GetMapping
    public ResponseEntity<List<ActivityLogResponse>> getDailyLogs(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(activityService.getDailyLogs(userId, targetDate));
    }

    @GetMapping("types/{id}") 
        public ResponseEntity<ActivityType> getTypeById(@PathVariable Long id) {
            ActivityType type = typeRepository.findById(id);
            return ResponseEntity.ok(type);
        };
    

    /**
     * POST /api/v1/activities
     * Log hoạt động thể chất.
     * Calories burned được tính tự động bằng công thức MET × weight × duration.
     */
    @PostMapping
    public ResponseEntity<ActivityLogResponse> logActivity(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ActivityLogRequest request) {

        ActivityLogResponse response = activityService.log(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityLogResponse> update(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody ActivityLogRequest request) {
        return ResponseEntity.ok(activityService.update(id, userId, request));
    }

    @PatchMapping("/{id}/completion")
    public ResponseEntity<ActivityLogResponse> setCompleted(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestParam boolean completed) {
        return ResponseEntity.ok(activityService.setCompleted(id, userId, completed));
    }

    /**
     * DELETE /api/v1/activities/{id}
     * Xoá một log hoạt động. Chỉ chủ sở hữu mới được xoá.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {

        activityService.delete(id, userId);
        return ResponseEntity.ok(Map.of("message", "Activity log deleted successfully"));
    }

    @GetMapping("/workout-plans")
    public ResponseEntity<List<WorkoutPlanResponse>> workoutPlans(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(workoutPlanService.list(userId));
    }

    @GetMapping("/workout-plans/{id}")
    public ResponseEntity<WorkoutPlanResponse> workoutPlan(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(workoutPlanService.get(userId, id));
    }

    @PostMapping("/workout-plans")
    public ResponseEntity<WorkoutPlanResponse> createWorkoutPlan(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody WorkoutPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(workoutPlanService.create(userId, request));
    }

    @PutMapping("/workout-plans/{id}")
    public ResponseEntity<WorkoutPlanResponse> updateWorkoutPlan(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody WorkoutPlanRequest request) {
        return ResponseEntity.ok(workoutPlanService.update(userId, id, request));
    }

    @PatchMapping("/workout-plans/{id}/active")
    public ResponseEntity<WorkoutPlanResponse> setWorkoutPlanActive(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean active) {
        return ResponseEntity.ok(workoutPlanService.setActive(userId, id, active));
    }

    @DeleteMapping("/workout-plans/{id}")
    public ResponseEntity<Void> deleteWorkoutPlan(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        workoutPlanService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/v1/activities/types?category=CARDIO
     * Lấy danh sách loại hoạt động, có thể filter theo category.
     */
    @GetMapping("/types")
    public ResponseEntity<List<ActivityType>> getTypes(
            @RequestParam(required = false) ActivityType.Category category) {

        return ResponseEntity.ok(activityTypeService.getVisibleTypes(category));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<ActivityCategoryLabel>> categories() {
        return ResponseEntity.ok(categoryLabelService.list(false));
    }

    @GetMapping("/admin/categories")
    public ResponseEntity<List<ActivityCategoryLabel>> adminCategories(
            @RequestHeader("X-User-Role") String role) {
        requireAdmin(role);
        return ResponseEntity.ok(categoryLabelService.list(true));
    }

    @PostMapping("/admin/categories")
    public ResponseEntity<ActivityCategoryLabel> createCategory(
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody ActivityCategoryLabelCreateRequest request) {
        requireAdmin(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryLabelService.create(request));
    }

    @PutMapping("/admin/categories/{category}")
    public ResponseEntity<ActivityCategoryLabel> updateCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable ActivityType.Category category,
            @Valid @RequestBody ActivityCategoryLabelRequest request) {
        requireAdmin(role);
        return ResponseEntity.ok(categoryLabelService.update(category, request));
    }

    @PatchMapping("/admin/categories/{category}/hide")
    public ResponseEntity<ActivityCategoryLabel> hideCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable ActivityType.Category category) {
        requireAdmin(role);
        return ResponseEntity.ok(categoryLabelService.setHidden(category, true));
    }

    @PatchMapping("/admin/categories/{category}/restore")
    public ResponseEntity<ActivityCategoryLabel> restoreCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable ActivityType.Category category) {
        requireAdmin(role);
        return ResponseEntity.ok(categoryLabelService.setHidden(category, false));
    }

    @DeleteMapping("/admin/categories/{category}")
    public ResponseEntity<Void> deleteCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable ActivityType.Category category) {
        requireAdmin(role);
        categoryLabelService.delete(category);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/types")
    public ResponseEntity<List<ActivityType>> adminTypes(
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) ActivityType.Category category,
            @RequestParam(required = false) Boolean hidden) {

        requireAdmin(role);
        return ResponseEntity.ok(activityTypeService.getAdminTypes(category, hidden));
    }

    @GetMapping("/admin/types/{id}")
    public ResponseEntity<ActivityType> adminType(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        return ResponseEntity.ok(activityTypeService.getById(id));
    }

    @PostMapping("/admin/types")
    public ResponseEntity<ActivityType> createType(
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody ActivityTypeRequest request) {

        requireAdmin(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(activityTypeService.create(request));
    }

    @PutMapping("/admin/types/{id}")
    public ResponseEntity<ActivityType> updateType(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id,
            @Valid @RequestBody ActivityTypeRequest request) {

        requireAdmin(role);
        return ResponseEntity.ok(activityTypeService.update(id, request));
    }

    @DeleteMapping("/admin/types/{id}")
    public ResponseEntity<Void> deleteType(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        activityTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/types/{id}/hide")
    public ResponseEntity<ActivityType> hideType(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        return ResponseEntity.ok(activityTypeService.hide(id));
    }

    @PatchMapping("/admin/types/{id}/restore")
    public ResponseEntity<ActivityType> restoreType(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        return ResponseEntity.ok(activityTypeService.restore(id));
    }

    /**
     * GET /api/v1/activities/summary?date=2026-05-13
     * Tổng kết hoạt động trong ngày: calo đốt, số hoạt động.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getDailySummary(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime from = targetDate.atStartOfDay();
        LocalDateTime to   = targetDate.atTime(LocalTime.MAX);

        BigDecimal caloriesBurned = logRepository.sumCaloriesBurnedByUserIdAndDate(userId, from, to);
        List<ActivityLogResponse> logs = activityService.getDailyLogs(userId, targetDate);

        return ResponseEntity.ok(Map.of(
                "date",              targetDate.toString(),
                "caloriesBurned",    caloriesBurned,
                "activityCount",     logs.size(),
                "totalActiveMinutes", logs.stream().mapToInt(l -> l.getDurationMinutes() != null ? l.getDurationMinutes() : 0).sum()
        ));
    }

    private void requireAdmin(String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Admin role is required");
        }
    }
}

