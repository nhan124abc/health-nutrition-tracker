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

    public List<FoodCandidate> getFoodsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();

        List<FoodCandidate> foods = new ArrayList<>();
        ids.stream()
                .filter(java.util.Objects::nonNull)
                .filter(id -> id > 0)
                .distinct()
                .forEach(id -> {
                    try {
                        JsonNode item = restClient.get()
                                .uri(uri -> uri.path("/api/v1/nutrition/foods/{id}").build(id))
                                .retrieve()
                                .body(JsonNode.class);
                        FoodCandidate food = toFoodCandidate(item);
                        if (food != null) {
                            foods.add(food);
                        }
                    } catch (Exception exception) {
                        log.warn("Unable to load selected food id {} from nutrition-service: {}", id, exception.getMessage());
                    }
                });
        return foods;
    }

    public List<RecipeCandidate> getRecipes(int maxCalories, int limit) {
        return getRecipes(maxCalories, null, null, null, limit);
    }

    public List<RecipeCandidate> getRecipes(int maxCalories, String keyword, int limit) {
        return getRecipes(maxCalories, keyword, null, null, limit);
    }

    public List<RecipeCandidate> getRecipes(int maxCalories, String keyword, List<Long> foodIds, int limit) {
        return getRecipes(maxCalories, keyword, foodIds, null, limit);
    }

    public List<RecipeCandidate> getRecipes(int maxCalories, String keyword, List<Long> foodIds, String goal, int limit) {
        JsonNode items = restClient.get()
                .uri(uri -> uri.path("/api/v1/nutrition/recipes/suggestions")
                        .queryParam("maxCalories", maxCalories)
                        .queryParamIfPresent("q", java.util.Optional.ofNullable(keyword)
                                .map(String::trim)
                                .filter(value -> !value.isBlank()))
                        .queryParamIfPresent("foodIds", java.util.Optional.ofNullable(foodIds)
                                .filter(ids -> !ids.isEmpty())
                                .map(ids -> ids.stream()
                                        .map(String::valueOf)
                                        .collect(java.util.stream.Collectors.joining(","))))
                        .queryParamIfPresent("goal", java.util.Optional.ofNullable(goal)
                                .map(String::trim)
                                .filter(value -> !value.isBlank()))
                        .queryParam("limit", Math.min(limit, 20))
                        .build())
                .retrieve()
                .body(JsonNode.class);
        if (items == null || !items.isArray()) return List.of();

        List<RecipeCandidate> recipes = new ArrayList<>();
        for (JsonNode item : items) {
            BigDecimal calories = decimal(item, "calories");
            if (calories.signum() <= 0 || !item.path("ingredients").isArray()) continue;

            List<RecipeIngredientCandidate> ingredients = new ArrayList<>();
            for (JsonNode ingredient : item.path("ingredients")) {
                BigDecimal quantityG = decimal(ingredient, "quantityG");
                if (quantityG.signum() <= 0) continue;
                ingredients.add(new RecipeIngredientCandidate(
                        ingredient.path("foodItemId").asLong(),
                        text(ingredient, "name", "Food"),
                        quantityG,
                        decimal(ingredient, "calories"),
                        decimal(ingredient, "proteinG"),
                        decimal(ingredient, "carbsG"),
                        decimal(ingredient, "fatG")
                ));
            }
            if (ingredients.isEmpty()) continue;

            recipes.add(new RecipeCandidate(
                    item.path("id").asLong(),
                    text(item, "name", "Recipe"),
                    text(item, "description", ""),
                    item.path("servings").asInt(1),
                    text(item, "imageUrl", ""),
                    calories,
                    decimal(item, "proteinG"),
                    decimal(item, "carbsG"),
                    decimal(item, "fatG"),
                    ingredients
            ));
        }
        return recipes;
    }

    private BigDecimal decimal(JsonNode node, String field) {
        return node.path(field).isNumber() ? node.path(field).decimalValue() : BigDecimal.ZERO;
    }

    private FoodCandidate toFoodCandidate(JsonNode item) {
        if (item == null || item.isMissingNode() || item.isNull()) return null;

        BigDecimal calories = decimal(item, "calories");
        BigDecimal serving = decimal(item, "servingSizeG");
        if (calories.signum() <= 0 || serving.signum() <= 0) return null;

        return new FoodCandidate(
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
        );
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

    public record RecipeCandidate(
            long id, String name, String description, int servings, String imageUrl,
            BigDecimal calories, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG,
            List<RecipeIngredientCandidate> ingredients) {
    }

    public record RecipeIngredientCandidate(
            long foodItemId, String name, BigDecimal quantityG, BigDecimal calories,
            BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG) {
    }
}
