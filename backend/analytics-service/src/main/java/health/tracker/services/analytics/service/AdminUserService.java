package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.AdminUsersResponse;
import health.tracker.services.analytics.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final AdminUserRepository repository;

    @Transactional(readOnly = true)
    public AdminUsersResponse getUsers(int page, int size, String search) {
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = size <= 0
                ? DEFAULT_PAGE_SIZE
                : Math.min(size, MAX_PAGE_SIZE);
        long offset = (long) normalizedPage * normalizedSize;
        String normalizedSearch = search == null ? null : search.trim();

        long totalElements = repository.countUsers(normalizedSearch);
        int totalPages = totalElements == 0
                ? 0
                : (int) Math.ceil((double) totalElements / normalizedSize);

        return new AdminUsersResponse(
                repository.findUsers(normalizedSearch, normalizedSize, offset),
                totalElements,
                repository.countActiveUsers(),
                repository.countLockedUsers(),
                normalizedPage,
                normalizedSize,
                totalPages
        );
    }
}
