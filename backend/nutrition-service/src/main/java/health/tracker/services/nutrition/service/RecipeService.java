package health.tracker.services.nutrition.service;

import health.tracker.services.nutrition.dto.RecipeCreateRequest;
import health.tracker.services.nutrition.dto.RecipeSuggestionResponse;
import health.tracker.services.nutrition.entity.FoodItem;
import health.tracker.services.nutrition.entity.Recipe;
import health.tracker.services.nutrition.entity.RecipeIngredient;
import health.tracker.services.nutrition.repository.RecipeRepository;
import health.tracker.services.nutrition.repository.FoodItemRepository;
import health.tracker.services.nutrition.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
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
    private final FoodItemRepository foodItemRepository;

    @Transactional
    public RecipeSuggestionResponse create(Long userId, RecipeCreateRequest request) {
        Recipe recipe = Recipe.builder()
                .userId(userId)
                .name(request.getName().trim())
                .nameVi(request.getNameVi())
                .description(request.getDescription())
                .servings(Math.max(1, request.getServings()))
                .isPublic(false)
                .build();

        BigDecimal calories = BigDecimal.ZERO;
        BigDecimal protein = BigDecimal.ZERO;
        BigDecimal carbs = BigDecimal.ZERO;
        BigDecimal fat = BigDecimal.ZERO;

        for (RecipeCreateRequest.Ingredient input : request.getIngredients()) {
            FoodItem food = foodItemRepository.findById(input.getFoodItemId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                            "Food item not found: " + input.getFoodItemId()));
            BigDecimal baseServing = food.getServingSizeG();
            if (baseServing == null || baseServing.signum() <= 0) {
                baseServing = BigDecimal.valueOf(100);
            }
            BigDecimal ratio = input.getQuantityG().divide(baseServing, 6, RoundingMode.HALF_UP);
            BigDecimal ingredientCalories = value(food.getCalories()).multiply(ratio);
            BigDecimal ingredientProtein = value(food.getProteinG()).multiply(ratio);
            BigDecimal ingredientCarbs = value(food.getCarbsG()).multiply(ratio);
            BigDecimal ingredientFat = value(food.getFatG()).multiply(ratio);

            recipe.getIngredients().add(RecipeIngredient.builder()
                    .recipe(recipe)
                    .foodItem(food)
                    .foodName(food.getNameVi() == null || food.getNameVi().isBlank() ? food.getName() : food.getNameVi())
                    .quantityG(input.getQuantityG())
                    .calories(ingredientCalories)
                    .proteinG(ingredientProtein)
                    .carbsG(ingredientCarbs)
                    .fatG(ingredientFat)
                    .build());
            calories = calories.add(ingredientCalories);
            protein = protein.add(ingredientProtein);
            carbs = carbs.add(ingredientCarbs);
            fat = fat.add(ingredientFat);
        }

        recipe.setTotalCalories(calories);
        recipe.setTotalProteinG(protein);
        recipe.setTotalCarbsG(carbs);
        recipe.setTotalFatG(fat);
        return toSuggestion(recipeRepository.save(recipe));
    }

    @Transactional(readOnly = true)
    public List<RecipeSuggestionResponse> suggest(BigDecimal maxCalories, String keyword, List<Long> foodIds,
                                                  String goal, String mealType, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        int candidateLimit = Math.min(100, Math.max(safeLimit, safeLimit * 2));
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
                // A single food (for example, plain mussels) is a food log,
                // not a meal suggestion.  Keep it out of the recipe planner
                // so every card is a usable dish for the selected meal slot.
                .filter(recipe -> isCompleteMeal(recipe, mealType))
                // Reusable recipes save the planner an extra create-recipe request.
                // Rank recipes containing the most selected foods first, then apply
                // the nutrition-goal score within the same match tier.
                .sorted(Comparator.comparingInt((Recipe recipe) -> selectedFoodMatchCount(recipe, safeFoodIds)).reversed()
                        .thenComparing(Comparator.comparingDouble((Recipe recipe) -> mealTypeScore(recipe, mealType)).reversed())
                        .thenComparing(Comparator.comparingDouble((Recipe recipe) -> goalScore(recipe, goal)).reversed())
                        .thenComparing(Recipe::getId))
                .limit(safeLimit)
                .map(this::toSuggestion)
                .toList();
    }

    private boolean isCompleteMeal(Recipe recipe, String mealType) {
        long distinctIngredients = recipe.getIngredients().stream()
                .map(ingredient -> ingredient.getFoodItem() == null ? null : ingredient.getFoodItem().getId())
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count();
        if (distinctIngredients < 2) {
            return false;
        }

        double calories = value(recipe.getTotalCalories()).doubleValue();
        String normalizedType = mealType == null ? "" : mealType.trim().toUpperCase();
        double minimumCalories = switch (normalizedType) {
            case "MORNING_SNACK", "AFTERNOON_SNACK", "EVENING_SNACK", "SNACK" -> 100;
            case "BREAKFAST", "LUNCH", "DINNER" -> 200;
            default -> 150;
        };
        return calories >= minimumCalories;
    }

    private int selectedFoodMatchCount(Recipe recipe, List<Long> selectedFoodIds) {
        if (selectedFoodIds.isEmpty()) {
            return 0;
        }
        java.util.Set<Long> recipeFoodIds = recipe.getIngredients().stream()
                .map(ingredient -> ingredient.getFoodItem() == null ? null : ingredient.getFoodItem().getId())
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        return (int) selectedFoodIds.stream().filter(recipeFoodIds::contains).count();
    }

    private double mealTypeScore(Recipe recipe, String mealType) {
        String normalizedType = mealType == null ? "" : mealType.trim().toUpperCase();
        double targetCalories = switch (normalizedType) {
            case "BREAKFAST" -> 400;
            case "LUNCH" -> 600;
            case "DINNER" -> 550;
            case "MORNING_SNACK", "AFTERNOON_SNACK", "EVENING_SNACK", "SNACK" -> 250;
            default -> 500;
        };
        double calories = value(recipe.getTotalCalories()).doubleValue();
        double calorieFit = Math.max(0, 1.0 - Math.abs(calories - targetCalories) / targetCalories);
        String searchable = (recipe.getName() + " " + (recipe.getDescription() == null ? "" : recipe.getDescription()) + " " +
                recipe.getIngredients().stream()
                        .map(item -> item.getFoodItem().getName() + " " + item.getFoodItem().getNameVi())
                        .collect(java.util.stream.Collectors.joining(" "))).toLowerCase();
        String[] preferredKeywords = switch (normalizedType) {
            case "BREAKFAST" -> new String[]{"breakfast", "oat", "egg", "yogurt", "bread", "smoothie", "yến mạch", "trứng", "sữa chua", "bánh mì"};
            case "LUNCH" -> new String[]{"rice", "noodle", "chicken", "beef", "quinoa", "cơm", "bún", "mì", "gà", "bò"};
            case "DINNER" -> new String[]{"soup", "fish", "tofu", "salad", "vegetable", "canh", "cá", "đậu hũ", "rau"};
            case "MORNING_SNACK", "AFTERNOON_SNACK", "EVENING_SNACK", "SNACK" -> new String[]{"snack", "fruit", "yogurt", "nuts", "trái cây", "sữa chua", "hạt"};
            default -> new String[0];
        };
        long keywordMatches = java.util.Arrays.stream(preferredKeywords).filter(searchable::contains).count();
        return calorieFit + Math.min(0.8, keywordMatches * 0.2);
    }

    private RecipeSuggestionResponse toSuggestion(Recipe recipe) {
        return RecipeSuggestionResponse.builder()
                .id(recipe.getId())
                .name(recipe.getName())
                .nameVi(recipe.getNameVi() != null && !recipe.getNameVi().isBlank()
                        ? recipe.getNameVi()
                        : recipe.getName())
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
                .name(ingredient.getFoodItem().getName())
                .nameVi(ingredient.getFoodItem().getNameVi())
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
