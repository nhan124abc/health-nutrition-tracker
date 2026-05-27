package health.tracker.services.ai.controller;

import health.tracker.services.ai.dto.ChatRequest;
import health.tracker.services.ai.dto.ChatResponse;
import health.tracker.services.ai.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @Valid @RequestBody ChatRequest request) {

        return ResponseEntity.ok(aiChatService.chat(userId, username, request));
    }
}
