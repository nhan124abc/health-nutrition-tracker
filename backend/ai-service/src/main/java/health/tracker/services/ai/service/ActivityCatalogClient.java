package health.tracker.services.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class ActivityCatalogClient {
    private final RestClient restClient;

    public ActivityCatalogClient(
            RestClient.Builder builder,
            @Value("${services.activity.url:http://localhost:8085}") String activityUrl,
            @Value("${internal.secret:}") String internalSecret) {
        this.restClient = builder.baseUrl(activityUrl)
                .defaultHeader("X-Internal-Secret", internalSecret)
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
    }

    public List<ActivityCandidate> getActivityTypes() {
        JsonNode items = restClient.get()
                .uri("/api/v1/activities/types")
                .retrieve()
                .body(JsonNode.class);
        if (items == null || !items.isArray()) {
            return List.of();
        }

        List<ActivityCandidate> activities = new ArrayList<>();
        for (JsonNode item : items) {
            BigDecimal met = decimal(item, "metValue", decimal(item, "met", BigDecimal.ZERO));
            if (met.signum() <= 0) {
                continue;
            }
            activities.add(new ActivityCandidate(
                    item.path("id").asInt(),
                    text(item, "name", ""),
                    text(item, "nameVi", ""),
                    text(item, "category", "OTHER"),
                    met
            ));
        }
        return activities;
    }

    private BigDecimal decimal(JsonNode node, String field, BigDecimal fallback) {
        return node.path(field).isNumber() ? node.path(field).decimalValue() : fallback;
    }

    private String text(JsonNode node, String field, String fallback) {
        String value = node.path(field).asText("").trim();
        return value.isEmpty() ? fallback : value;
    }

    public record ActivityCandidate(int id, String name, String nameVi, String category, BigDecimal metValue) {
    }
}
