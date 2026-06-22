package health.tracker.services.nutrition.controller;

import health.tracker.services.nutrition.dto.RecipeSuggestionResponse;
import health.tracker.services.nutrition.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/nutrition/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;

    @GetMapping("/suggestions")
    public ResponseEntity<List<RecipeSuggestionResponse>> suggest(
            @RequestParam(required = false) BigDecimal maxCalories,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<Long> foodIds,
            @RequestParam(defaultValue = "6") int limit) {
        return ResponseEntity.ok(recipeService.suggest(maxCalories, q, foodIds, limit));
    }
}
