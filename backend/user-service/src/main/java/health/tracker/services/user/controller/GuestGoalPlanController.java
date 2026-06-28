package health.tracker.services.user.controller;

import health.tracker.services.user.dto.GuestGoalPlanRequest;
import health.tracker.services.user.dto.GoalPlanResponse;
import health.tracker.services.user.service.GoalPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/goal-plans")
@RequiredArgsConstructor
public class GuestGoalPlanController {
    private final GoalPlanService goalPlanService;

    @PostMapping("/suggestions")
    public ResponseEntity<GoalPlanResponse> suggest(@Valid @RequestBody GuestGoalPlanRequest request) {
        return ResponseEntity.ok(goalPlanService.suggestGuest(request));
    }
}
