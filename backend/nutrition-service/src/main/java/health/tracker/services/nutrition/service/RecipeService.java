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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;

    @Transactional(readOnly = true)
    public List<RecipeSuggestionResponse> suggest(BigDecimal maxCalories, String keyword, List<Long> foodIds, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();

        Map<Long, Recipe> recipes = new LinkedHashMap<>();
        List<Long> safeFoodIds = foodIds == null ? List.of() : foodIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (!safeFoodIds.isEmpty()) {
            recipeRepository.findSuggestionsByFoodIds(maxCalories, safeFoodIds, PageRequest.of(0, safeLimit))
                    .forEach(recipe -> recipes.putIfAbsent(recipe.getId(), recipe));
        }

        if (recipes.size() < safeLimit) {
            recipeRepository.findSuggestions(maxCalories, normalizedKeyword, PageRequest.of(0, safeLimit))
                    .forEach(recipe -> recipes.putIfAbsent(recipe.getId(), recipe));
        }

        return recipes.values().stream()
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
}
