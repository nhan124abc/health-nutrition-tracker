package health.tracker.services.user.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class DailyWaterResponse {
    private LocalDate date;
    private Integer totalAmountMl;
    private Integer goalMl;
}
