package health.tracker.services.ai.controller;

import health.tracker.services.ai.dto.ChatRequest;
import health.tracker.services.ai.dto.ChatMessageDto;
import health.tracker.services.ai.dto.ChatResponse;
import health.tracker.services.ai.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestId,
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody ChatRequest request) {

        return ResponseEntity.ok(aiChatService.chat(userId, guestId, username, role, request));
    }

    @GetMapping("/chat/history")
    public ResponseEntity<List<ChatMessageDto>> history(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestId) {

        return ResponseEntity.ok(aiChatService.getHistory(userId, guestId));
    }

    @DeleteMapping("/chat/history")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearHistory(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestId) {

        aiChatService.clearHistory(userId, guestId);
    }
}
