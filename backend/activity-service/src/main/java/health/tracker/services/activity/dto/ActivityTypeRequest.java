package health.tracker.services.activity.dto;

import health.tracker.services.activity.entity.ActivityType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ActivityTypeRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @Size(max = 100, message = "Vietnamese name must not exceed 100 characters")
    private String nameVi;

    @NotNull(message = "Category is required")
    private ActivityType.Category category;

    @NotNull(message = "MET value is required")
    @DecimalMin(value = "0.1", message = "MET value must be at least 0.1")
    @DecimalMax(value = "50.0", message = "MET value must be at most 50.0")
    private BigDecimal metValue;

    @Size(max = 50, message = "Icon must not exceed 50 characters")
    private String icon;

    private String description;

    private Boolean system;

    private Boolean hidden;
}
