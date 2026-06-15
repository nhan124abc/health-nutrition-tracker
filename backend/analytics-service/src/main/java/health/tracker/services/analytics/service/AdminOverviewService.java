package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.AdminOverviewResponse;
import health.tracker.services.analytics.repository.AdminOverviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminOverviewService {

    private static final int TREND_PERIOD_DAYS = 30;
    private static final int RECENT_ACTIVITY_LIMIT = 10;

    private final AdminOverviewRepository repository;

    @Transactional(readOnly = true)
    public AdminOverviewResponse getOverview() {
        long todayLogs = repository.countTodayLogs();

        Map<String, String> trends = new LinkedHashMap<>();
        trends.put("users", formatTrend(
                repository.countNewUsers(TREND_PERIOD_DAYS, 0),
                repository.countNewUsers(TREND_PERIOD_DAYS * 2, TREND_PERIOD_DAYS)
        ));
        trends.put("foods", formatNewItems(repository.countNewFoods(TREND_PERIOD_DAYS, 0)));
        trends.put("exercises", formatNewItems(repository.countNewExercises(TREND_PERIOD_DAYS, 0)));
        trends.put("todayLogs", formatTrend(
                todayLogs,
                repository.countLogs(1, 0)
        ));

        Map<String, Integer> dataHealth = new LinkedHashMap<>();
        dataHealth.put("foods", repository.foodDataHealth());
        dataHealth.put("exercises", repository.exerciseDataHealth());
        dataHealth.put("users", repository.userDataHealth());

        return new AdminOverviewResponse(
                repository.countUsers(),
                repository.countFoods(),
                repository.countExercises(),
                todayLogs,
                trends,
                repository.findRecentActivities(RECENT_ACTIVITY_LIMIT),
                dataHealth
        );
    }

    private String formatTrend(long current, long previous) {
        if (previous == 0) {
            return current == 0 ? "0%" : "+100%";
        }

        long percentage = Math.round((current - previous) * 100.0 / previous);
        return percentage > 0 ? "+" + percentage + "%" : percentage + "%";
    }

    private String formatNewItems(long count) {
        return count > 0 ? "+" + count + " new" : "0 new";
    }
}
