package health.tracker.services.analytics.service;

import health.tracker.services.analytics.entity.DailySummary;
import health.tracker.services.analytics.entity.MonthlyReport;
import health.tracker.services.analytics.entity.WeeklyReport;
import health.tracker.services.analytics.repository.DailySummaryRepository;
import health.tracker.services.analytics.repository.MonthlyReportRepository;
import health.tracker.services.analytics.repository.WeeklyReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReportAggregationService {
    private final DailySummaryRepository dailyRepository;
    private final WeeklyReportRepository weeklyRepository;
    private final MonthlyReportRepository monthlyRepository;

    @Scheduled(cron = "${analytics.reports.cron:0 10 0 * * *}")
    @Transactional
    public void refreshRecentReports() {
        LocalDate today = LocalDate.now();
        LocalDate currentWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        YearMonth currentMonth = YearMonth.from(today);
        for (Long userId : dailyRepository.findDistinctUserIds()) {
            aggregateWeek(userId, currentWeek.minusWeeks(1));
            aggregateWeek(userId, currentWeek);
            aggregateMonth(userId, currentMonth.minusMonths(1));
            aggregateMonth(userId, currentMonth);
        }
    }

    @Transactional
    public WeeklyReport aggregateWeek(Long userId, LocalDate weekStart) {
        LocalDate normalizedStart = weekStart.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = normalizedStart.plusDays(6);
        List<DailySummary> days = dailyRepository
                .findByUserIdAndSummaryDateBetweenOrderBySummaryDateAsc(userId, normalizedStart, weekEnd);
        WeeklyReport report = weeklyRepository.findByUserIdAndWeekStartDate(userId, normalizedStart)
                .orElseGet(WeeklyReport::new);
        report.setUserId(userId);
        report.setWeekStartDate(normalizedStart);
        report.setWeekEndDate(weekEnd);
        applyWeeklyValues(report, days);
        return weeklyRepository.save(report);
    }

    @Transactional
    public MonthlyReport aggregateMonth(Long userId, YearMonth month) {
        List<DailySummary> days = dailyRepository.findByUserIdAndSummaryDateBetweenOrderBySummaryDateAsc(
                userId, month.atDay(1), month.atEndOfMonth());
        MonthlyReport report = monthlyRepository
                .findByUserIdAndReportYearAndReportMonth(userId, month.getYear(), month.getMonthValue())
                .orElseGet(MonthlyReport::new);
        report.setUserId(userId);
        report.setReportYear(month.getYear());
        report.setReportMonth(month.getMonthValue());
        int count = days.size();
        report.setAvgDailyCalories(avg(days, DailySummary::getTotalCaloriesConsumed));
        report.setAvgDailyProteinG(avg(days, DailySummary::getTotalProteinG));
        report.setAvgDailyCarbsG(avg(days, DailySummary::getTotalCarbsG));
        report.setAvgDailyFatG(avg(days, DailySummary::getTotalFatG));
        report.setTotalCaloriesBurned(sum(days, DailySummary::getTotalCaloriesBurned));
        report.setAvgDailySteps(count == 0 ? 0 : (int) Math.round(days.stream().mapToInt(DailySummary::getTotalSteps).average().orElse(0)));
        report.setActiveDaysCount((int) days.stream().filter(day -> day.getActivityCount() > 0).count());
        report.setWeightStartKg(firstWeight(days));
        report.setWeightEndKg(lastWeight(days));
        report.setGoalMetDays((int) days.stream().filter(DailySummary::isCalorieGoalMet).count());
        report.setDataDaysCount(count);
        return monthlyRepository.save(report);
    }

    private void applyWeeklyValues(WeeklyReport report, List<DailySummary> days) {
        int count = days.size();
        report.setAvgDailyCalories(avg(days, DailySummary::getTotalCaloriesConsumed));
        report.setAvgDailyProteinG(avg(days, DailySummary::getTotalProteinG));
        report.setAvgDailyCarbsG(avg(days, DailySummary::getTotalCarbsG));
        report.setAvgDailyFatG(avg(days, DailySummary::getTotalFatG));
        report.setAvgDailyWaterMl(count == 0 ? 0 : (int) Math.round(days.stream().mapToInt(DailySummary::getWaterIntakeMl).average().orElse(0)));
        report.setTotalCaloriesConsumed(sum(days, DailySummary::getTotalCaloriesConsumed));
        report.setTotalCaloriesBurned(sum(days, DailySummary::getTotalCaloriesBurned));
        report.setAvgDailySteps(count == 0 ? 0 : (int) Math.round(days.stream().mapToInt(DailySummary::getTotalSteps).average().orElse(0)));
        report.setTotalActiveMinutes(days.stream().mapToInt(DailySummary::getTotalActiveMinutes).sum());
        report.setActiveDaysCount((int) days.stream().filter(day -> day.getActivityCount() > 0).count());
        report.setWeightStartKg(firstWeight(days));
        report.setWeightEndKg(lastWeight(days));
        report.setGoalMetDays((int) days.stream().filter(DailySummary::isCalorieGoalMet).count());
    }

    private BigDecimal avg(List<DailySummary> days, java.util.function.Function<DailySummary, BigDecimal> getter) {
        return days.isEmpty() ? BigDecimal.ZERO : sum(days, getter).divide(BigDecimal.valueOf(days.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal sum(List<DailySummary> days, java.util.function.Function<DailySummary, BigDecimal> getter) {
        return days.stream().map(getter).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal firstWeight(List<DailySummary> days) {
        return days.stream().map(DailySummary::getWeightKg).filter(Objects::nonNull).findFirst().orElse(null);
    }

    private BigDecimal lastWeight(List<DailySummary> days) {
        for (int i = days.size() - 1; i >= 0; i--) if (days.get(i).getWeightKg() != null) return days.get(i).getWeightKg();
        return null;
    }
}
