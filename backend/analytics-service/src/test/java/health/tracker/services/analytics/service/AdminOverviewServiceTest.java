package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.AdminOverviewResponse;
import health.tracker.services.analytics.repository.AdminOverviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminOverviewServiceTest {

    @Mock
    private AdminOverviewRepository repository;

    @Mock
    private AnalyticsCacheService analyticsCacheService;

    @InjectMocks
    private AdminOverviewService service;

    @Test
    void returnsDatabaseOverviewWithCalculatedTrends() {
        when(analyticsCacheService.adminOverviewKey()).thenReturn("analytics:admin:overview");
        when(analyticsCacheService.getAdminOverview(anyString())).thenReturn(Optional.empty());
        when(repository.countUsers()).thenReturn(12L);
        when(repository.countFoods()).thenReturn(24L);
        when(repository.countExercises()).thenReturn(8L);
        when(repository.countTodayLogs()).thenReturn(15L);
        when(repository.countNewUsers(30, 0)).thenReturn(6L);
        when(repository.countNewUsers(60, 30)).thenReturn(4L);
        when(repository.countNewFoods(30, 0)).thenReturn(3L);
        when(repository.countNewExercises(30, 0)).thenReturn(2L);
        when(repository.countLogs(1, 0)).thenReturn(10L);
        when(repository.foodDataHealth()).thenReturn(80);
        when(repository.exerciseDataHealth()).thenReturn(100);
        when(repository.userDataHealth()).thenReturn(75);
        when(repository.findRecentActivities(10)).thenReturn(List.of(
                new AdminOverviewResponse.RecentActivity(
                        "food-1", "Food added: Rice", "Food", "Approved", "success"
                )
        ));

        AdminOverviewResponse response = service.getOverview();

        assertThat(response.totalUsers()).isEqualTo(12);
        assertThat(response.todayLogs()).isEqualTo(15);
        assertThat(response.trends()).containsEntry("users", "+50%");
        assertThat(response.trends()).containsEntry("todayLogs", "+50%");
        assertThat(response.dataHealth()).containsEntry("users", 75);
        assertThat(response.recentActivities()).hasSize(1);
    }
}
