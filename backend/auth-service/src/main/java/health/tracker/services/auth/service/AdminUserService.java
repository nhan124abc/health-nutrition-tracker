package health.tracker.services.auth.service;

import health.tracker.services.auth.dto.AdminUsersResponse;
import health.tracker.services.auth.entity.User;
import health.tracker.services.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public AdminUsersResponse getUsers(int page, int size, String search) {
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = size <= 0
                ? DEFAULT_PAGE_SIZE
                : Math.min(size, MAX_PAGE_SIZE);
        PageRequest pageRequest = PageRequest.of(
                normalizedPage,
                normalizedSize,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );

        Page<User> users = hasSearch(search)
                ? userRepository.findByRoleAndEmailContainingIgnoreCaseOrRoleAndFullNameContainingIgnoreCase(
                        User.Role.USER,
                        search.trim(),
                        User.Role.USER,
                        search.trim(),
                        pageRequest
                )
                : userRepository.findByRole(User.Role.USER, pageRequest);

        return new AdminUsersResponse(
                users.getContent().stream().map(this::toItem).toList(),
                users.getTotalElements(),
                userRepository.countByRoleAndActive(User.Role.USER, true),
                userRepository.countByRoleAndActive(User.Role.USER, false),
                users.getNumber(),
                users.getSize(),
                users.getTotalPages()
        );
    }

    private boolean hasSearch(String search) {
        return search != null && !search.isBlank();
    }

    private AdminUsersResponse.UserItem toItem(User user) {
        return new AdminUsersResponse.UserItem(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                user.isActive(),
                user.isEmailVerified(),
                user.getAuthProvider().name(),
                user.getCreatedAt()
        );
    }
}
