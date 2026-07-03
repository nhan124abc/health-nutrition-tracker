package health.tracker.services.meal.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.meal.entity.Meal;
import health.tracker.services.meal.entity.MealItem;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
public class MealResponse {

    private Long id;
    private Long userId;
    private Meal.MealType mealType;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate mealDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime mealTime;

    private String notes;
    private boolean completed;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime completedAt;

    // Tổng dinh dưỡng của toàn bộ bữa
    private BigDecimal totalCalories;
    private BigDecimal totalProteinG;
    private BigDecimal totalCarbsG;
    private BigDecimal totalFatG;
    private BigDecimal totalFiberG;

    private List<MealItemResponse> items;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // ─── Nested DTO ───────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class MealItemResponse {
        private Long id;
        private Long foodItemId;
        private Long recipeId;
        private MealItem.ItemType itemType;
        private String foodName;
        private BigDecimal servingSizeG;
        private BigDecimal quantity;
        private BigDecimal totalWeightG;
        private BigDecimal calories;
        private BigDecimal proteinG;
        private BigDecimal carbsG;
        private BigDecimal fatG;
        private BigDecimal fiberG;
        private BigDecimal sodiumMg;
    }
}

