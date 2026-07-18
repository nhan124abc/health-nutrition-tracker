package health.tracker.services.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyWaterResponse {
    private LocalDate date;
    private Integer totalAmountMl;
    private Integer goalMl;
}
