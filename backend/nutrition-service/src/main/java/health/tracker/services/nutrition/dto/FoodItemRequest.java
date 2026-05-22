package health.tracker.services.nutrition.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FoodItemRequest {

    @NotBlank(message = "Food name is required")
    @Size(max = 255)
    private String name;

    @Size(max = 255)
    private String nameVi;

    @Size(max = 100)
    private String brand;

    @Size(max = 50)
    private String barcode;

    private Integer categoryId;

    @NotNull @DecimalMin("0.1")
    private BigDecimal servingSizeG;

    @Size(max = 100)
    private String servingDescription;

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
    private BigDecimal sugarG;

    @DecimalMin("0")
    private BigDecimal sodiumMg;

    private String imageUrl;
}

