package health.tracker.services.analytics.dto;

import java.util.List;
import java.util.Map;

public record AdminOverviewResponse(
        long totalUsers,
        long totalFoods,
        long totalExercises,
        long todayLogs,
        Map<String, String> trends,
        List<RecentActivity> recentActivities,
        Map<String, Integer> dataHealth
) {
    public record RecentActivity(
            String id,
            String content,
            String type,
            String status,
            String variant
    ) {}
}
