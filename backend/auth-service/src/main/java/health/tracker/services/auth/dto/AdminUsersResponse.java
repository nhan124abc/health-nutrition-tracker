package health.tracker.services.auth.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;
import java.util.List;

public record AdminUsersResponse(
        List<UserItem> content,
        long totalElements,
        long activeUsers,
        long lockedUsers,
        int page,
        int size,
        int totalPages
) {
    public record UserItem(
            long id,
            String fullName,
            String email,
            String role,
            String avatarUrl,
            boolean active,
            boolean emailVerified,
            String authProvider,
            @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
            LocalDateTime createdAt
    ) {}
}
