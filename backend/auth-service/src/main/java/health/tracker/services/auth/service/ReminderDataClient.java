package health.tracker.services.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReminderDataClient {

    private final RestTemplate restTemplate;

    @Value("${app.services.user-url:http://localhost:8082}")
    private String userServiceUrl;

    @Value("${app.services.meal-url:http://localhost:8084}")
    private String mealServiceUrl;

    @Value("${app.services.activity-url:http://localhost:8085}")
    private String activityServiceUrl;

    @Value("${internal.secret:}")
    private String internalSecret;

    public UserProfile getProfile(Long userId) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(userServiceUrl)
                .path("/api/v1/users/me/profile")
                .build()
                .toUri();

        try {
            ResponseEntity<UserProfile> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers(userId)),
                    UserProfile.class
            );
            return response.getBody();
        } catch (RestClientException ex) {
            log.warn("Could not load reminder profile for userId={}: {}", userId, ex.getMessage());
            return null;
        }
    }

    public List<MealLog> getMeals(Long userId, LocalDate date) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(mealServiceUrl)
                .path("/api/v1/meals")
                .queryParam("date", date)
                .build()
                .toUri();

        try {
            ResponseEntity<List<MealLog>> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers(userId)),
                    new ParameterizedTypeReference<>() {
                    }
            );
            return response.getBody() != null ? response.getBody() : List.of();
        } catch (RestClientException ex) {
            log.warn("Could not load reminder meals for userId={}: {}", userId, ex.getMessage());
            return List.of();
        }
    }

    public List<ActivityLog> getActivities(Long userId, LocalDate date) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(activityServiceUrl)
                .path("/api/v1/activities")
                .queryParam("date", date)
                .build()
                .toUri();

        try {
            ResponseEntity<List<ActivityLog>> response = restTemplate.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(headers(userId)),
                    new ParameterizedTypeReference<>() {
                    }
            );
            return response.getBody() != null ? response.getBody() : List.of();
        } catch (RestClientException ex) {
            log.warn("Could not load reminder activities for userId={}: {}", userId, ex.getMessage());
            return List.of();
        }
    }

    private HttpHeaders headers(Long userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", String.valueOf(userId));
        headers.set("X-User-Role", "USER");
        if (internalSecret != null && !internalSecret.isBlank()) {
            headers.set("X-Internal-Secret", internalSecret);
        }
        return headers;
    }

    public record UserProfile(String healthGoal, Integer dailyCalorieGoal, Integer dailyActivityGoalKcal) {
    }

    public record MealLog(String mealType) {
    }

    public record ActivityLog(Long id) {
    }
}
