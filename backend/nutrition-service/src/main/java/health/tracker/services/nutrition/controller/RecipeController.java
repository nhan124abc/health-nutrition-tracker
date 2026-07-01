package health.tracker.services.nutrition.controller;

import health.tracker.services.nutrition.dto.RecipeCreateRequest;
import health.tracker.services.nutrition.dto.RecipeSuggestionResponse;
import health.tracker.services.nutrition.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/nutrition/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;

    @PostMapping
    public ResponseEntity<RecipeSuggestionResponse> create(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody RecipeCreateRequest request) {
        return ResponseEntity.ok(recipeService.create(userId, request));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<RecipeSuggestionResponse>> suggest(
            @RequestParam(required = false) BigDecimal maxCalories,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<Long> foodIds,
            @RequestParam(required = false) String goal,
            @RequestParam(required = false) String mealType,
            @RequestParam(required = false) String locale,
            @RequestParam(defaultValue = "6") int limit) {
        return ResponseEntity.ok(recipeService.suggest(maxCalories, q, foodIds, goal, mealType, locale, limit));
    }
}
