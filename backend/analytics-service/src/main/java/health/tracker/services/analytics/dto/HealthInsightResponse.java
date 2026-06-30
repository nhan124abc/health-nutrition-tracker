package health.tracker.services.analytics.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.analytics.entity.HealthInsight;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class HealthInsightResponse {

    private Long id;
    private Long userId;
    private HealthInsight.InsightType insightType;
    private String title;
    private String content;
    private boolean read;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate validDate;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}
