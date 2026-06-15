package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.AdminUsersResponse;
import health.tracker.services.analytics.repository.AdminUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private AdminUserRepository repository;

    @InjectMocks
    private AdminUserService service;

    @Test
    void returnsUsersWithSummaryAndPagination() {
        AdminUsersResponse.UserItem user = new AdminUsersResponse.UserItem(
                7L,
                "Nguyen An",
                "an@example.com",
                "USER",
                true,
                true,
                "LOCAL",
                LocalDateTime.of(2026, 6, 15, 10, 30)
        );
        when(repository.countUsers(null)).thenReturn(21L);
        when(repository.findUsers(null, 10, 10)).thenReturn(List.of(user));
        when(repository.countActiveUsers()).thenReturn(18L);
        when(repository.countLockedUsers()).thenReturn(3L);

        AdminUsersResponse response = service.getUsers(1, 10, null);

        assertThat(response.content()).containsExactly(user);
        assertThat(response.totalElements()).isEqualTo(21);
        assertThat(response.activeUsers()).isEqualTo(18);
        assertThat(response.lockedUsers()).isEqualTo(3);
        assertThat(response.page()).isEqualTo(1);
        assertThat(response.size()).isEqualTo(10);
        assertThat(response.totalPages()).isEqualTo(3);
    }

    @Test
    void normalizesInvalidPaginationAndTrimsSearch() {
        when(repository.countUsers("an")).thenReturn(0L);
        when(repository.findUsers("an", 100, 0)).thenReturn(List.of());

        AdminUsersResponse response = service.getUsers(-2, 500, "  an  ");

        assertThat(response.page()).isZero();
        assertThat(response.size()).isEqualTo(100);
        assertThat(response.totalPages()).isZero();
        verify(repository).findUsers("an", 100, 0);
    }
}
