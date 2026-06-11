package health.tracker.services.ai.controller;

import health.tracker.services.ai.dto.PlannerSuggestRequest;
import health.tracker.services.ai.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/ai/planner")
@RequiredArgsConstructor
public class AiPlannerController {

    private final AiChatService aiChatService;

    @PostMapping("/suggest")
    public ResponseEntity<String> suggest(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestId,
            @Valid @RequestBody PlannerSuggestRequest request) {

        log.info("Generate AI daily plan suggestions for userId={}, goal={}", userId, request.getGoal());
        String planJson = aiChatService.generateDailyPlan(userId, guestId, request);
        return ResponseEntity.ok()
                .header("Content-Type", "application/json;charset=UTF-8")
                .body(planJson);
    }
}
