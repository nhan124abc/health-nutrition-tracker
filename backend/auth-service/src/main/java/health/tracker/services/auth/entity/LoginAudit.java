package health.tracker.services.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "login_audit", indexes = {
        @Index(name = "idx_login_audit_user", columnList = "user_id"),
        @Index(name = "idx_login_audit_email", columnList = "email"),
        @Index(name = "idx_login_audit_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId; // NULL nếu tài khoản không tồn tại

    @Column(nullable = false)
    private String email;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(nullable = false)
    @Builder.Default
    private boolean success = false;

    @Column(name = "fail_reason")
    private String failReason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

