package health.tracker.services.meal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
public class MealPlanRequest {

    @NotBlank(message = "Plan name is required")
    @Size(max = 100)
    private String name;

    @Size(max = 2000)
    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private Boolean active;

    @Valid
    private List<MealPlanEntryRequest> entries = new ArrayList<>();
}
