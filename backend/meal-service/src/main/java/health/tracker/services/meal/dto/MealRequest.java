package health.tracker.services.meal.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.meal.entity.Meal;
import health.tracker.services.meal.entity.MealItem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class MealRequest {

    @NotNull(message = "Meal type is required")
    private Meal.MealType mealType;

    @NotNull(message = "Meal date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate mealDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime mealTime;

    @Size(max = 1000)
    private String notes;

    @Valid
    @NotEmpty(message = "Meal must have at least one item")
    private List<MealItemRequest> items = new ArrayList<>();

    // ─── Nested DTO ───────────────────────────────────────────────────────────

    @Data
    public static class MealItemRequest {

        /** ID từ nutrition-service (food item hoặc recipe) */
        private Long foodItemId;

        private Long recipeId;

        @NotNull(message = "Item type is required")
        private MealItem.ItemType itemType = MealItem.ItemType.FOOD;

        /**
         * Tên thực phẩm — client cần truyền để denormalize.
         * (Không gọi nutrition-service tại thời điểm lưu để tránh coupling)
         */
        @NotBlank(message = "Food name is required")
        private String foodName;

        @NotNull @DecimalMin("0.1")
        private BigDecimal servingSizeG;

        @NotNull @DecimalMin("0.01")
        private BigDecimal quantity;

        // Client tính sẵn từ nutrition data
        @NotNull @DecimalMin("0")
        private BigDecimal calories;

        @NotNull @DecimalMin("0")
        private BigDecimal proteinG;

        @NotNull @DecimalMin("0")
        private BigDecimal carbsG;

        @NotNull @DecimalMin("0")
        private BigDecimal fatG;

        @DecimalMin("0")
        private BigDecimal fiberG;

        @DecimalMin("0")
        private BigDecimal sodiumMg;
    }
}

