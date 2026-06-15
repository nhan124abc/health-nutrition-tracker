package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.AdminSystemAnalyticsResponse;
import health.tracker.services.analytics.repository.AdminSystemAnalyticsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class AdminSystemAnalyticsService {

    private static final int GROWTH_MONTHS = 6;
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final AdminSystemAnalyticsRepository repository;

    @Transactional(readOnly = true)
    public AdminSystemAnalyticsResponse getAnalytics() {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        long totalUsers = repository.countUsers();
        long activeUsers = repository.countActiveUsers();
        long dailyLogs = repository.countLogsBetween(today, tomorrow);
        long previousDailyLogs = repository.countLogsBetween(today.minusDays(1), today);

        LocalDate currentPeriodStart = today.minusDays(30);
        LocalDate previousPeriodStart = currentPeriodStart.minusDays(30);
        long currentNewUsers = repository.countUsersCreatedBetween(currentPeriodStart, tomorrow);
        long previousNewUsers = repository.countUsersCreatedBetween(
                previousPeriodStart,
                currentPeriodStart
        );

        List<YearMonth> months = IntStream.range(0, GROWTH_MONTHS)
                .mapToObj(index -> YearMonth.from(today).minusMonths(GROWTH_MONTHS - 1L - index))
                .toList();
        List<Long> growthValues = repository.cumulativeUserGrowth(months);
        List<AdminSystemAnalyticsResponse.MonthlyUserGrowth> growth = IntStream
                .range(0, months.size())
                .mapToObj(index -> new AdminSystemAnalyticsResponse.MonthlyUserGrowth(
                        months.get(index).format(MONTH_FORMAT),
                        growthValues.get(index)
                ))
                .toList();

        Map<String, Integer> adoption = new LinkedHashMap<>();
        repository.countFeatureUsers().forEach((feature, users) ->
                adoption.put(feature, percentage(users, activeUsers))
        );

        return new AdminSystemAnalyticsResponse(
                new AdminSystemAnalyticsResponse.Stats(
                        totalUsers,
                        activeUsers,
                        dailyLogs,
                        repository.countCatalogItems(),
                        formatTrend(currentNewUsers, previousNewUsers),
                        percentage(activeUsers, totalUsers),
                        formatTrend(dailyLogs, previousDailyLogs),
                        repository.countCatalogItemsCreatedBetween(currentPeriodStart, tomorrow)
                ),
                growth,
                repository.countSystemUsage(),
                adoption
        );
    }

    private int percentage(long value, long total) {
        if (total == 0) {
            return 0;
        }
        return (int) Math.min(100, Math.round(value * 100.0 / total));
    }

    private String formatTrend(long current, long previous) {
        if (previous == 0) {
            return current == 0 ? "0%" : "+100%";
        }
        long percentage = Math.round((current - previous) * 100.0 / previous);
        return percentage > 0 ? "+" + percentage + "%" : percentage + "%";
    }
}
