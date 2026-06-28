package health.tracker.services.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class BodyMetricResponse {

    private Long id;
    private Long userId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate recordedAt;

    private BigDecimal weightKg;
    private BigDecimal bodyFatPercentage;
    private BigDecimal muscleMassKg;
    private BigDecimal bmi;
    private BigDecimal waistCm;
    private BigDecimal hipCm;
    private BigDecimal chestCm;
    private String notes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}

