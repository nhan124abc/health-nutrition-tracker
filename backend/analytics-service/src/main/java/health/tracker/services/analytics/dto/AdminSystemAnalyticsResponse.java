package health.tracker.services.analytics.dto;

import java.util.List;
import java.util.Map;

public record AdminSystemAnalyticsResponse(
        Stats stats,
        List<MonthlyUserGrowth> userGrowth,
        Map<String, Long> systemUsage,
        Map<String, Integer> featureAdoption
) {
    public record Stats(
            long totalUsers,
            long activeUsers,
            long dailyLogs,
            long catalogItems,
            String userTrend,
            int activeRate,
            String dailyLogsTrend,
            long newCatalogItems
    ) {}

    public record MonthlyUserGrowth(
            String month,
            long totalUsers
    ) {}
}
