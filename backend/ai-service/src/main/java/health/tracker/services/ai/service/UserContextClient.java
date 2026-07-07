package health.tracker.services.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class UserContextClient {

    private final RestClient userClient;
    private final RestClient analyticsClient;

    public UserContextClient(
            RestClient.Builder builder,
            @Value("${services.user.url:http://localhost:8082}") String userUrl,
            @Value("${services.analytics.url:http://localhost:8086}") String analyticsUrl,
            @Value("${internal.secret:}") String internalSecret) {
        this.userClient = builder.clone()
                .baseUrl(userUrl)
                .defaultHeader("X-Internal-Secret", internalSecret)
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
        this.analyticsClient = builder.clone()
                .baseUrl(analyticsUrl)
                .defaultHeader("X-Internal-Secret", internalSecret)
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
    }

    public String buildSnapshot(String userId) {
        if (userId == null || userId.isBlank()) {
            return "User is not logged in; no saved app data is available.";
        }

        List<String> sections = new ArrayList<>();
        loadProfile(userId).ifPresent(sections::add);
        loadLatestMetrics(userId).ifPresent(sections::add);
        loadTodaySummary(userId).ifPresent(sections::add);
        loadStreak(userId).ifPresent(sections::add);

        if (sections.isEmpty()) {
            return "No saved user profile, metrics, or daily tracking data could be loaded.";
        }
        return String.join("\n", sections);
    }

    private java.util.Optional<String> loadProfile(String userId) {
        try {
            JsonNode profile = userClient.get()
                    .uri("/api/v1/users/me/profile")
                    .header("X-User-Id", userId)
                    .retrieve()
                    .body(JsonNode.class);
            if (profile == null || profile.isNull()) {
                return java.util.Optional.empty();
            }

            return java.util.Optional.of("""
                    Profile:
                    - goal: %s
                    - gender: %s
                    - heightCm: %s
                    - weightKg: %s
                    - targetWeightKg: %s
                    - activityLevel: %s
                    - bmr: %s kcal
                    - tdee: %s kcal
                    - dailyCalorieGoal: %s kcal
                    - dailyProteinGoalG: %s g
                    - dailyCarbsGoalG: %s g
                    - dailyFatGoalG: %s g
                    - dailyWaterGoalMl: %s ml
                    - dailyActivityGoalKcal: %s kcal
                    """.formatted(
                    text(profile, "goal"), text(profile, "gender"), text(profile, "heightCm"),
                    text(profile, "weightKg"), text(profile, "targetWeightKg"),
                    text(profile, "activityLevel"), text(profile, "bmr"), text(profile, "tdee"),
                    text(profile, "dailyCalorieGoal"), text(profile, "dailyProteinGoalG"),
                    text(profile, "dailyCarbsGoalG"), text(profile, "dailyFatGoalG"),
                    text(profile, "dailyWaterGoalMl"), text(profile, "dailyActivityGoalKcal")
            ).trim());
        } catch (Exception exception) {
            log.warn("Unable to load user profile for AI context: {}", exception.getMessage());
            return java.util.Optional.empty();
        }
    }

    private java.util.Optional<String> loadLatestMetrics(String userId) {
        try {
            JsonNode page = userClient.get()
                    .uri(uri -> uri.path("/api/v1/users/me/metrics")
                            .queryParam("page", 0)
                            .queryParam("size", 3)
                            .build())
                    .header("X-User-Id", userId)
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode content = page == null ? null : page.path("content");
            if (content == null || !content.isArray() || content.isEmpty()) {
                return java.util.Optional.empty();
            }

            List<String> metrics = new ArrayList<>();
            for (JsonNode metric : content) {
                metrics.add("%s: weight=%s kg, bmi=%s, bodyFat=%s%%, muscleMass=%s kg, waist=%s cm".formatted(
                        text(metric, "recordedAt"), text(metric, "weightKg"), text(metric, "bmi"),
                        text(metric, "bodyFatPercentage"), text(metric, "muscleMassKg"), text(metric, "waistCm")));
            }
            return java.util.Optional.of("Recent body metrics:\n- " + String.join("\n- ", metrics));
        } catch (Exception exception) {
            log.warn("Unable to load body metrics for AI context: {}", exception.getMessage());
            return java.util.Optional.empty();
        }
    }

    private java.util.Optional<String> loadTodaySummary(String userId) {
        try {
            JsonNode summary = analyticsClient.get()
                    .uri(uri -> uri.path("/api/v1/analytics/daily")
                            .queryParam("date", LocalDate.now())
                            .build())
                    .header("X-User-Id", userId)
                    .retrieve()
                    .body(JsonNode.class);
            if (summary == null || summary.isNull()) {
                return java.util.Optional.empty();
            }

            return java.util.Optional.of("""
                    Today tracking summary:
                    - caloriesConsumed: %s kcal
                    - protein/carbs/fat: %s g / %s g / %s g
                    - caloriesBurned: %s kcal
                    - activeMinutes: %s
                    - steps: %s
                    - waterIntakeMl: %s
                    - calorieGoal: %s kcal
                    - calorieGoalPercent: %s%%
                    - netCalories: %s kcal
                    """.formatted(
                    text(summary, "totalCaloriesConsumed"), text(summary, "totalProteinG"),
                    text(summary, "totalCarbsG"), text(summary, "totalFatG"),
                    text(summary, "totalCaloriesBurned"), text(summary, "totalActiveMinutes"),
                    text(summary, "totalSteps"), text(summary, "waterIntakeMl"),
                    text(summary, "calorieGoal"), text(summary, "calorieGoalPercent"),
                    text(summary, "netCalories")
            ).trim());
        } catch (Exception exception) {
            log.warn("Unable to load daily analytics for AI context: {}", exception.getMessage());
            return java.util.Optional.empty();
        }
    }

    private java.util.Optional<String> loadStreak(String userId) {
        try {
            JsonNode streak = analyticsClient.get()
                    .uri("/api/v1/analytics/streak")
                    .header("X-User-Id", userId)
                    .retrieve()
                    .body(JsonNode.class);
            if (streak == null || streak.isNull() || streak.isEmpty()) {
                return java.util.Optional.empty();
            }
            return java.util.Optional.of("Streak summary: " + streak.toString());
        } catch (Exception exception) {
            log.warn("Unable to load streak summary for AI context: {}", exception.getMessage());
            return java.util.Optional.empty();
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return "unknown";
        }
        String text = value.asText("").trim();
        return text.isEmpty() ? "unknown" : text;
    }
}
