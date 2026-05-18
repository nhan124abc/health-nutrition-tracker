package health.tracker.services.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BodyMetricRequest {

    @NotNull(message = "Recorded date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate recordedAt;

    @DecimalMin(value = "1.0")  @DecimalMax(value = "500.0")
    private BigDecimal weightKg;

    @DecimalMin(value = "1.0")  @DecimalMax(value = "100.0")
    private BigDecimal bodyFatPercentage;

    @DecimalMin(value = "1.0")  @DecimalMax(value = "300.0")
    private BigDecimal muscleMassKg;

    @DecimalMin(value = "1.0")  @DecimalMax(value = "200.0")
    private BigDecimal waistCm;

    @DecimalMin(value = "1.0")  @DecimalMax(value = "200.0")
    private BigDecimal hipCm;

    @DecimalMin(value = "1.0")  @DecimalMax(value = "200.0")
    private BigDecimal chestCm;

    @Size(max = 500)
    private String notes;
}

