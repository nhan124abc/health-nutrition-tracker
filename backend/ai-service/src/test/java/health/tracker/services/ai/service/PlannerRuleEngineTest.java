package health.tracker.services.ai.service;

import health.tracker.services.ai.dto.PlannerSuggestRequest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlannerRuleEngineTest {

    @Test
    void exerciseSuggestionFallsBackWhenActivityCatalogIsEmpty() {
        PlannerSuggestRequest request = new PlannerSuggestRequest();
        request.setMealType("exercise");
        request.setGoal("LOSE_WEIGHT");
        request.setWeightKg(67.0);
        request.setDailyActivityGoalKcal(211);
        request.setActivityCaloriesBurned(0);

        String json = PlannerRuleEngine.generatePlan(request, List.of());

        assertThat(json).contains("\"options\": [");
        assertThat(json).contains("\"durationMinutes\":");
        assertThat(json).contains("\"caloriesBurned\":");
        assertThat(json).doesNotContain("\"options\": []");
    }

    @Test
    void exerciseSuggestionReturnsEveryUserSelectedActivity() {
        PlannerSuggestRequest request = new PlannerSuggestRequest();
        request.setMealType("exercise");
        request.setGoal("LOSE_WEIGHT");
        request.setWeightKg(67.0);
        request.setSelectedActivityTypeIds(List.of(11, 22, 33, 44));
        request.setSelectedActivityNames(List.of("A", "B", "C", "D"));

        String json = PlannerRuleEngine.generatePlan(request, List.of());

        assertThat(json).contains("\"activityTypeId\": 11");
        assertThat(json).contains("\"activityTypeId\": 22");
        assertThat(json).contains("\"activityTypeId\": 33");
        assertThat(json).contains("\"activityTypeId\": 44");
    }
}
