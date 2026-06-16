package health.tracker.services.analytics.controller;

import health.tracker.services.analytics.dto.AdminOverviewResponse;
import health.tracker.services.analytics.dto.AdminSystemAnalyticsResponse;
import health.tracker.services.analytics.dto.DailySummaryResponse;
import health.tracker.services.analytics.exception.AppException;
import health.tracker.services.analytics.repository.DailySummaryRepository;
import health.tracker.services.analytics.service.AdminOverviewService;
import health.tracker.services.analytics.service.AdminSystemAnalyticsService;
import health.tracker.services.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

/**
 * Analytics API
 *
 * <pre>
 * GET /api/v1/analytics/daily?date=          — Tóm tắt sức khoẻ ngày cụ thể
 * GET /api/v1/analytics/weekly?date=         — Dữ liệu 7 ngày (bắt đầu từ date)
 * GET /api/v1/analytics/monthly?year=&month= — Dữ liệu cả tháng
 * GET /api/v1/analytics/streak              — Streak hiện tại
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final AdminOverviewService adminOverviewService;
    private final AdminSystemAnalyticsService adminSystemAnalyticsService;
    private final DailySummaryRepository summaryRepository;

    @GetMapping("/admin/overview")
    public ResponseEntity<AdminOverviewResponse> getAdminOverview(
            @RequestHeader("X-User-Role") String role) {

        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Admin role is required");
        }

        return ResponseEntity.ok(adminOverviewService.getOverview());
    }

    @GetMapping("/admin/system-analytics")
    public ResponseEntity<AdminSystemAnalyticsResponse> getAdminSystemAnalytics(
            @RequestHeader("X-User-Role") String role) {

        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Admin role is required");
        }

        return ResponseEntity.ok(adminSystemAnalyticsService.getAnalytics());
    }

    /**
     * GET /api/v1/analytics/daily?date=2026-05-13
     * Tóm tắt sức khoẻ ngày cụ thể.
     * Bao gồm: calo nạp vào, calo đốt, net calo, macro, nước, bước chân, streak.
     */
    @GetMapping("/daily")
    public ResponseEntity<DailySummaryResponse> getDaily(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        log.debug("Get daily summary: userId={}, date={}", userId, targetDate);
        return ResponseEntity.ok(analyticsService.getDailySummary(userId, targetDate));
    }

    /**
     * GET /api/v1/analytics/weekly?date=2026-05-13
     * Dữ liệu từng ngày trong 7 ngày gồm date đến date+6.
     * Dùng để vẽ biểu đồ tuần.
     */
    @GetMapping("/weekly")
    public ResponseEntity<List<DailySummaryResponse>> getWeekly(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate start = date != null ? date : LocalDate.now().with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate end   = start.plusDays(6);
        return ResponseEntity.ok(analyticsService.getRange(userId, start, end));
    }

    /**
     * GET /api/v1/analytics/monthly?year=2026&month=5
     * Dữ liệu từng ngày trong tháng.
     * Dùng để vẽ biểu đồ tháng và tính báo cáo.
     */
    @GetMapping("/monthly")
    public ResponseEntity<List<DailySummaryResponse>> getMonthly(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}")   int year,
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getMonthValue()}") int month) {

        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.with(TemporalAdjusters.lastDayOfMonth());
        return ResponseEntity.ok(analyticsService.getRange(userId, start, end));
    }

    /**
     * GET /api/v1/analytics/streak
     * Thông tin streak hiện tại và streak dài nhất.
     */
    @GetMapping("/streak")
    public ResponseEntity<Map<String, Object>> getStreak(
            @RequestHeader("X-User-Id") Long userId) {

        return summaryRepository.findByUserIdAndSummaryDate(userId, LocalDate.now())
                .map(s -> {
                    DailySummaryResponse r = analyticsService.getDailySummary(userId, LocalDate.now());
                    return ResponseEntity.ok(Map.<String, Object>of(
                            "currentStreak", r.getCurrentStreak(),
                            "streakLabel",   r.getStreakLabel()
                    ));
                })
                .orElse(ResponseEntity.ok(Map.of(
                        "currentStreak", 0,
                        "streakLabel",   "Bắt đầu streak mới!"
                )));
    }
}

