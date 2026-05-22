package health.tracker.services.activity.controller;

import health.tracker.services.activity.dto.ActivityLogRequest;
import health.tracker.services.activity.dto.ActivityLogResponse;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.repository.ActivityLogRepository;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import health.tracker.services.activity.service.ActivityService;
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

    /**
     * GET /api/v1/activities/types?category=CARDIO
     * Lấy danh sách loại hoạt động, có thể filter theo category.
     */
    @GetMapping("/types")
    public ResponseEntity<List<ActivityType>> getTypes(
            @RequestParam(required = false) ActivityType.Category category) {

        List<ActivityType> types = (category != null)
                ? typeRepository.findByCategoryOrderByNameAsc(category)
                : typeRepository.findAllByOrderByCategoryAscNameAsc();
        return ResponseEntity.ok(types);
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
}

