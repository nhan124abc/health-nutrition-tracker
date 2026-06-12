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
public class NutritionCatalogClient {
    private final RestClient restClient;

    public NutritionCatalogClient(
            RestClient.Builder builder,
            @Value("${services.nutrition.url:http://localhost:8083}") String nutritionUrl,
            @Value("${internal.secret:}") String internalSecret) {
        this.restClient = builder.baseUrl(nutritionUrl)
                .defaultHeader("X-Internal-Secret", internalSecret)
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
    }

    public List<FoodCandidate> getFoods(int limit) {
        JsonNode page = restClient.get()
                .uri(uri -> uri.path("/api/v1/nutrition/foods")
                        .queryParam("page", 0)
                        .queryParam("size", Math.min(limit, 100))
                        .build())
                .retrieve()
                .body(JsonNode.class);
        if (page == null || !page.path("content").isArray()) return List.of();

        List<FoodCandidate> foods = new ArrayList<>();
        for (JsonNode item : page.path("content")) {
            BigDecimal calories = decimal(item, "calories");
            BigDecimal serving = decimal(item, "servingSizeG");
            if (calories.signum() <= 0 || serving.signum() <= 0) continue;
            foods.add(new FoodCandidate(
                    item.path("id").asLong(),
                    text(item, "nameVi", text(item, "name", "Food")),
                    serving,
                    text(item, "servingDescription", "1 serving"),
                    calories,
                    decimal(item, "proteinG"),
                    decimal(item, "carbsG"),
                    decimal(item, "fatG"),
                    decimal(item, "fiberG"),
                    decimal(item, "sodiumMg")
            ));
        }
        return foods;
    }

    private BigDecimal decimal(JsonNode node, String field) {
        return node.path(field).isNumber() ? node.path(field).decimalValue() : BigDecimal.ZERO;
    }

    private String text(JsonNode node, String field, String fallback) {
        String value = node.path(field).asText("").trim();
        return value.isEmpty() ? fallback : value;
    }

    public record FoodCandidate(
            long id, String name, BigDecimal servingSizeG, String servingDescription,
            BigDecimal calories, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG,
            BigDecimal fiberG, BigDecimal sodiumMg) {
    }
}
