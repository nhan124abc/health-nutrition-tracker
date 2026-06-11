package health.tracker.services.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class WaterLogRequest {
    @NotNull(message = "Water amount is required")
    @Min(value = 1, message = "Water amount must be greater than 0")
    @Max(value = 10000, message = "Water amount must not exceed 10000 ml")
    private Integer amountMl;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime loggedAt;
}
