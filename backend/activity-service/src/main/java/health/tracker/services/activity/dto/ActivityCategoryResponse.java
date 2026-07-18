package health.tracker.services.activity.dto;

import health.tracker.services.activity.entity.ActivityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityCategoryResponse {
    private ActivityType.Category category;
    private String name;
    private String nameVi;
    private boolean hidden;
    private long count;
}
