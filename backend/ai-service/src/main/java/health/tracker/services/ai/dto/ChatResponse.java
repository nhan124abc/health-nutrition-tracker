package health.tracker.services.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatResponse {
    private String reply;
    private String model;
    private LocalDateTime createdAt;
}
