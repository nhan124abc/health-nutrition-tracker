package health.tracker.services.user.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AdminUserProfileUpdateRequest extends UserProfileRequest {
    private Boolean hidden;
}
