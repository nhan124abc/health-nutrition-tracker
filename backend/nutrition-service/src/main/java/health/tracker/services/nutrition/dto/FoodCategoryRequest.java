package health.tracker.services.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class
FoodCategoryRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @Size(max = 100, message = "Vietnamese name must not exceed 100 characters")
    private String nameVi;

    @Size(max = 50, message = "Icon must not exceed 50 characters")
    private String icon;

    private String description;

    private Boolean hidden;
}
