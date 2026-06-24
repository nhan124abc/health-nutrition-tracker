package health.tracker.services.auth.service;

import health.tracker.services.auth.dto.AdminUsersResponse;
import health.tracker.services.auth.entity.User;
import health.tracker.services.auth.exception.AppException;
import health.tracker.services.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository userRepository;
    private final UserCacheService userCacheService;
    private final PasswordEncoder passwordEncoder;

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

    @Transactional
    public AdminUsersResponse.UserItem createUser(String fullName, String email, String password, String role, Boolean active) {
        if (email == null || email.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (password == null || password.length() < 8) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }
        if (userRepository.existsByEmail(email.trim())) {
            throw new AppException(HttpStatus.CONFLICT, "Email already registered: " + email);
        }

        User user = User.builder()
                .email(email.trim())
                .password(passwordEncoder.encode(password))
                .fullName(fullName == null ? "" : fullName.trim())
                .role(parseRole(role))
                .authProvider(User.AuthProvider.LOCAL)
                .active(active == null || active)
                .emailVerified(true)
                .build();

        User savedUser = userRepository.save(user);
        userCacheService.put(savedUser);
        return toItem(savedUser);
    }

    @Transactional
    public AdminUsersResponse.UserItem updateUser(Long userId, String fullName, String email, String role, Boolean active) {
        User user = findUser(userId);

        if (fullName != null) {
            user.setFullName(fullName.trim());
        }
        if (email != null && !email.isBlank() && !email.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(email)) {
                throw new AppException(HttpStatus.CONFLICT, "Email already registered: " + email);
            }
            userCacheService.evict(user.getEmail());
            user.setEmail(email.trim());
        }
        if (role != null && !role.isBlank()) {
            user.setRole(parseRole(role));
        }
        if (active != null) {
            user.setActive(active);
        }

        User savedUser = userRepository.save(user);
        userCacheService.evict(savedUser.getEmail());
        return toItem(savedUser);
    }

    @Transactional
    public AdminUsersResponse.UserItem setUserActive(Long userId, boolean active) {
        User user = findUser(userId);
        user.setActive(active);
        User savedUser = userRepository.save(user);
        userCacheService.evict(savedUser.getEmail());
        return toItem(savedUser);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = findUser(userId);
        userRepository.delete(user);
        userCacheService.evict(user.getEmail());
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found: " + userId));
    }

    private boolean hasSearch(String search) {
        return search != null && !search.isBlank();
    }

    private User.Role parseRole(String role) {
        if (role == null || role.isBlank()) {
            return User.Role.USER;
        }

        try {
            return User.Role.valueOf(role.replace("ROLE_", "").toUpperCase());
        } catch (IllegalArgumentException error) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Invalid role: " + role);
        }
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
