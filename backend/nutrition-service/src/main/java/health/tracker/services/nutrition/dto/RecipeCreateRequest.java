package health.tracker.services.nutrition.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
public class RecipeCreateRequest {
    @NotBlank
    @Size(max = 255)
    private String name;

    private String description;

    @NotNull
    private Integer servings = 1;

    @Valid
    @NotEmpty
    private List<Ingredient> ingredients = new ArrayList<>();

    @Data
    public static class Ingredient {
        @NotNull
        private Long foodItemId;

        @NotNull
        @DecimalMin("0.1")
        private BigDecimal quantityG;
    }
}
