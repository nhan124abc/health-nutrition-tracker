package health.tracker.services.analytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_streaks", indexes = {
        @Index(name = "idx_streaks_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStreak {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "streak_type", nullable = false)
    @Builder.Default
    private StreakType streakType = StreakType.LOGGING_STREAK;

    /**
     * Số ngày streak hiện tại
     */
    @Column(name = "current_streak", nullable = false)
    @Builder.Default
    private Integer currentStreak = 0;

    /**
     * Streak dài nhất từ trước đến nay
     */
    @Column(name = "longest_streak", nullable = false)
    @Builder.Default
    private Integer longestStreak = 0;

    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ─── Enum ─────────────────────────────────────────────────────────────────

    public enum StreakType {
        LOGGING_STREAK,   // Chuỗi ngày ghi nhật ký liên tiếp
        GOAL_STREAK,      // Chuỗi ngày đạt mục tiêu calo
        ACTIVITY_STREAK   // Chuỗi ngày có vận động
    }
}

