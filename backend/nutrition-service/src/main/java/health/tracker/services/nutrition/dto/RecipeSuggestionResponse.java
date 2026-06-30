package health.tracker.services.nutrition.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class RecipeSuggestionResponse {
    private Long id;
    private String name;
    private String description;
    private Integer servings;
    private String imageUrl;
    private BigDecimal calories;
    private BigDecimal proteinG;
    private BigDecimal carbsG;
    private BigDecimal fatG;
    private List<Ingredient> ingredients;

    @Data
    @Builder
    public static class Ingredient {
        private Long foodItemId;
        private String name;
        private String nameVi;
        private BigDecimal quantityG;
        private BigDecimal calories;
        private BigDecimal proteinG;
        private BigDecimal carbsG;
        private BigDecimal fatG;
    }
}
