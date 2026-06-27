package health.tracker.services.meal.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.meal.entity.Meal;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MealPlanResponse {

    private Long id;
    private Long userId;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean active;
    private List<Entry> entries;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class Entry {
        private Long id;
        private LocalDate planDate;
        private Meal.MealType mealType;
        private Long foodItemId;
        private Long recipeId;
        private String foodName;
        private BigDecimal servingSizeG;
        private BigDecimal quantity;
        private BigDecimal calories;
        private String notes;
    }
}
