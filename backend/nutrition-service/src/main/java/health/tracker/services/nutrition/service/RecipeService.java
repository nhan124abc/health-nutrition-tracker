package health.tracker.services.nutrition.service;

import health.tracker.services.nutrition.dto.RecipeSuggestionResponse;
import health.tracker.services.nutrition.entity.Recipe;
import health.tracker.services.nutrition.entity.RecipeIngredient;
import health.tracker.services.nutrition.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;

    @Transactional(readOnly = true)
    public List<RecipeSuggestionResponse> suggest(BigDecimal maxCalories, String keyword, List<Long> foodIds,
                                                  String goal, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));
        int candidateLimit = Math.min(20, Math.max(safeLimit, safeLimit * 3));
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();

        Map<Long, Recipe> recipes = new LinkedHashMap<>();
        List<Long> safeFoodIds = foodIds == null ? List.of() : foodIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (!safeFoodIds.isEmpty()) {
            recipeRepository.findSuggestionsByFoodIds(maxCalories, safeFoodIds, PageRequest.of(0, candidateLimit))
                    .forEach(recipe -> recipes.putIfAbsent(recipe.getId(), recipe));
        }

        if (recipes.size() < candidateLimit) {
            recipeRepository.findSuggestions(maxCalories, normalizedKeyword, PageRequest.of(0, candidateLimit))
                    .forEach(recipe -> recipes.putIfAbsent(recipe.getId(), recipe));
        }

        return recipes.values().stream()
                .sorted(Comparator.comparingDouble((Recipe recipe) -> goalScore(recipe, goal)).reversed()
                        .thenComparing(Recipe::getId))
                .limit(safeLimit)
                .map(this::toSuggestion)
                .toList();
    }

    private RecipeSuggestionResponse toSuggestion(Recipe recipe) {
        return RecipeSuggestionResponse.builder()
                .id(recipe.getId())
                .name(recipe.getName())
                .description(recipe.getDescription())
                .servings(recipe.getServings())
                .imageUrl(recipe.getImageUrl())
                .calories(value(recipe.getTotalCalories()))
                .proteinG(value(recipe.getTotalProteinG()))
                .carbsG(value(recipe.getTotalCarbsG()))
                .fatG(value(recipe.getTotalFatG()))
                .ingredients(recipe.getIngredients().stream()
                        .map(this::toIngredient)
                        .toList())
                .build();
    }

    private RecipeSuggestionResponse.Ingredient toIngredient(RecipeIngredient ingredient) {
        return RecipeSuggestionResponse.Ingredient.builder()
                .foodItemId(ingredient.getFoodItem().getId())
                .name(ingredient.getFoodName())
                .quantityG(value(ingredient.getQuantityG()))
                .calories(value(ingredient.getCalories()))
                .proteinG(value(ingredient.getProteinG()))
                .carbsG(value(ingredient.getCarbsG()))
                .fatG(value(ingredient.getFatG()))
                .build();
    }

    private BigDecimal value(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private double goalScore(Recipe recipe, String goal) {
        BigDecimal calories = value(recipe.getTotalCalories());
        if (calories.signum() <= 0) {
            return 0;
        }

        double proteinShare = calorieShare(value(recipe.getTotalProteinG()), 4, calories);
        double carbShare = calorieShare(value(recipe.getTotalCarbsG()), 4, calories);
        double fatShare = calorieShare(value(recipe.getTotalFatG()), 9, calories);
        double energyScore = Math.min(1.0, calories.doubleValue() / 650.0);
        String normalizedGoal = goal == null ? "MAINTAIN_WEIGHT" : goal.trim().toUpperCase();

        return switch (normalizedGoal) {
            case "LOSE_WEIGHT", "CUTTING" -> proteinShare * 1.8 + (1.0 - fatShare) * 0.5 + (1.0 - energyScore) * 0.2;
            case "GAIN_MUSCLE", "BODY_RECOMPOSITION" -> proteinShare * 1.6 + carbShare * 0.5 + (1.0 - fatShare) * 0.2;
            case "GAIN_WEIGHT" -> energyScore * 0.8 + carbShare * 0.7 + proteinShare * 0.6;
            case "IMPROVE_FITNESS" -> proteinShare * 0.9 + carbShare * 0.6 + (1.0 - Math.abs(fatShare - 0.25)) * 0.4;
            default -> proteinShare * 0.8 + carbShare * 0.5 + (1.0 - Math.abs(fatShare - 0.25)) * 0.3;
        };
    }

    private double calorieShare(BigDecimal grams, int kcalPerGram, BigDecimal totalCalories) {
        if (totalCalories.signum() <= 0) {
            return 0;
        }

        return grams.multiply(BigDecimal.valueOf(kcalPerGram))
                .divide(totalCalories, 4, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
