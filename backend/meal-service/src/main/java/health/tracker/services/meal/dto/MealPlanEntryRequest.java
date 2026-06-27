package health.tracker.services.meal.dto;

import health.tracker.services.meal.entity.Meal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class MealPlanEntryRequest {

    @NotNull(message = "Plan date is required")
    private LocalDate planDate;

    @NotNull(message = "Meal type is required")
    private Meal.MealType mealType;

    private Long foodItemId;

    private Long recipeId;

    @NotBlank(message = "Food name is required")
    @Size(max = 255)
    private String foodName;

    @DecimalMin("0.01")
    private BigDecimal servingSizeG = BigDecimal.valueOf(100);

    @DecimalMin("0.01")
    private BigDecimal quantity = BigDecimal.ONE;

    @DecimalMin("0")
    private BigDecimal calories = BigDecimal.ZERO;

    @Size(max = 1000)
    private String notes;
}
