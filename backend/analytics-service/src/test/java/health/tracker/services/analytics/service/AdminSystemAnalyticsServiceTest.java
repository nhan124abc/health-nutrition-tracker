package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.AdminSystemAnalyticsResponse;
import health.tracker.services.analytics.repository.AdminSystemAnalyticsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSystemAnalyticsServiceTest {

    @Mock
    private AdminSystemAnalyticsRepository repository;

    @Mock
    private AnalyticsCacheService analyticsCacheService;

    @InjectMocks
    private AdminSystemAnalyticsService service;

    @Test
    void returnsDatabaseBackedSystemAnalytics() {
        LocalDate today = LocalDate.now();
        when(analyticsCacheService.adminSystemAnalyticsKey()).thenReturn("analytics:admin:system-analytics");
        when(analyticsCacheService.getAdminSystemAnalytics(anyString())).thenReturn(Optional.empty());
        when(repository.countUsers()).thenReturn(20L);
        when(repository.countActiveUsers()).thenReturn(15L);
        when(repository.countLogsBetween(today, today.plusDays(1))).thenReturn(12L);
        when(repository.countLogsBetween(today.minusDays(1), today)).thenReturn(8L);
        when(repository.countUsersCreatedBetween(today.minusDays(30), today.plusDays(1)))
                .thenReturn(6L);
        when(repository.countUsersCreatedBetween(today.minusDays(60), today.minusDays(30)))
                .thenReturn(4L);
        when(repository.cumulativeUserGrowth(anyList()))
                .thenReturn(List.of(5L, 7L, 10L, 13L, 17L, 20L));
        when(repository.countFeatureUsers()).thenReturn(Map.of(
                "meals", 12L,
                "water", 9L,
                "activity", 6L,
                "bodyMetrics", 3L
        ));
        Map<String, Long> usage = new LinkedHashMap<>();
        usage.put("meals", 100L);
        usage.put("water", 80L);
        usage.put("activity", 60L);
        usage.put("bodyMetrics", 40L);
        when(repository.countSystemUsage()).thenReturn(usage);
        when(repository.countCatalogItems()).thenReturn(55L);
        when(repository.countCatalogItemsCreatedBetween(today.minusDays(30), today.plusDays(1)))
                .thenReturn(7L);

        AdminSystemAnalyticsResponse response = service.getAnalytics();

        assertThat(response.stats().totalUsers()).isEqualTo(20);
        assertThat(response.stats().activeRate()).isEqualTo(75);
        assertThat(response.stats().userTrend()).isEqualTo("+50%");
        assertThat(response.stats().dailyLogsTrend()).isEqualTo("+50%");
        assertThat(response.userGrowth()).hasSize(6);
        assertThat(response.systemUsage()).containsEntry("meals", 100L);
        assertThat(response.featureAdoption()).containsEntry("meals", 80);
        assertThat(response.featureAdoption()).containsEntry("bodyMetrics", 20);
    }
}
