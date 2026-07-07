package health.tracker.services.analytics.controller;

import health.tracker.services.analytics.dto.AdminOverviewResponse;
import health.tracker.services.analytics.dto.AdminSystemAnalyticsResponse;
import health.tracker.services.analytics.dto.DailySummaryResponse;
import health.tracker.services.analytics.dto.HealthInsightResponse;
import health.tracker.services.analytics.entity.MonthlyReport;
import health.tracker.services.analytics.entity.NutritionTrend;
import health.tracker.services.analytics.entity.WeeklyReport;
import health.tracker.services.analytics.exception.AppException;
import health.tracker.services.analytics.service.AdminOverviewService;
import health.tracker.services.analytics.service.AdminSystemAnalyticsService;
import health.tracker.services.analytics.service.AnalyticsService;
import health.tracker.services.analytics.service.HealthInsightService;
import health.tracker.services.analytics.service.ReportAggregationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final AdminOverviewService adminOverviewService;
    private final AdminSystemAnalyticsService adminSystemAnalyticsService;
    private final ReportAggregationService reportAggregationService;
    private final HealthInsightService healthInsightService;

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

    @GetMapping("/daily")
    public ResponseEntity<DailySummaryResponse> getDaily(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        log.debug("Get daily summary: userId={}, date={}", userId, targetDate);
        return ResponseEntity.ok(analyticsService.getDailySummary(userId, targetDate));
    }

    @GetMapping("/weekly")
    public ResponseEntity<List<DailySummaryResponse>> getWeekly(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate referenceDate = date != null ? date : LocalDate.now();
        LocalDate start = referenceDate.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate end = start.plusDays(6);
        return ResponseEntity.ok(analyticsService.getRange(userId, start, end));
    }

    @GetMapping("/monthly")
    public ResponseEntity<List<DailySummaryResponse>> getMonthly(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        YearMonth targetMonth = year == null || month == null ? YearMonth.now() : YearMonth.of(year, month);
        LocalDate start = targetMonth.atDay(1);
        LocalDate end = start.with(TemporalAdjusters.lastDayOfMonth());
        return ResponseEntity.ok(analyticsService.getRange(userId, start, end));
    }

    @GetMapping("/streak")
    public ResponseEntity<Map<String, Object>> getStreak(
            @RequestHeader("X-User-Id") Long userId) {

        return ResponseEntity.ok(analyticsService.getStreakSummary(userId));
    }

    @GetMapping("/reports/weekly")
    public ResponseEntity<WeeklyReport> getWeeklyReport(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.ok(reportAggregationService.aggregateWeek(
                userId,
                date == null ? LocalDate.now() : date
        ));
    }

    @GetMapping("/reports/monthly")
    public ResponseEntity<MonthlyReport> getMonthlyReport(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        YearMonth targetMonth = year == null || month == null ? YearMonth.now() : YearMonth.of(year, month);
        return ResponseEntity.ok(reportAggregationService.aggregateMonth(userId, targetMonth));
    }

    @GetMapping("/trends")
    public ResponseEntity<List<NutritionTrend>> getTrends(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        YearMonth targetMonth = year == null || month == null ? YearMonth.now() : YearMonth.of(year, month);
        return ResponseEntity.ok(analyticsService.getNutritionTrends(userId, targetMonth));
    }

    @GetMapping("/insights")
    public ResponseEntity<List<HealthInsightResponse>> getInsights(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.ok(healthInsightService.getInsights(userId, unreadOnly, date));
    }

    @PutMapping("/insights/{id}/read")
    public ResponseEntity<HealthInsightResponse> markInsightRead(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {

        return ResponseEntity.ok(healthInsightService.markRead(userId, id));
    }
}
