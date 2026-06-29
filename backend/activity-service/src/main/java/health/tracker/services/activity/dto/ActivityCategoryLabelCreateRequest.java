package health.tracker.services.activity.dto;

import health.tracker.services.activity.entity.ActivityType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ActivityCategoryLabelCreateRequest extends ActivityCategoryLabelRequest {

    @NotNull(message = "Category is required")
    private ActivityType.Category category;
}
