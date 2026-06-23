package health.tracker.services.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReminderEmailRequest {
    @NotBlank
    @Size(max = 120)
    private String subject;

    @NotBlank
    @Size(max = 1000)
    private String message;
}
