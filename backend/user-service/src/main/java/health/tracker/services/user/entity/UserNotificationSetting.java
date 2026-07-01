package health.tracker.services.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "user_notification_settings", indexes = {
        @Index(name = "idx_notif_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "meal_reminder_enabled", nullable = false)
    @Builder.Default
    private boolean mealReminderEnabled = true;

    /**
     * Danh sách giờ nhắc ăn, VD: ["07:00", "12:00", "19:00"]
     * Lưu dạng JSON trong MySQL
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "meal_reminder_times", columnDefinition = "json")
    private List<String> mealReminderTimes;

    @Column(name = "water_reminder_enabled", nullable = false)
    @Builder.Default
    private boolean waterReminderEnabled = true;

    @Column(name = "water_reminder_interval_min")
    @Builder.Default
    private Integer waterReminderIntervalMin = 60;

    @Column(name = "weight_reminder_enabled", nullable = false)
    @Builder.Default
    private boolean weightReminderEnabled = true;

    /**
     * Số ngày giữa các lần nhắc cập nhật cân nặng/chỉ số cơ thể.
     */
    @Column(name = "weight_reminder_day")
    @Builder.Default
    private Integer weightReminderDay = 7;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

