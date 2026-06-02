package health.tracker.services.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageDto {
    private Long id;
    private String role;
    private String content;
    private String model;
    private LocalDateTime createdAt;
}
