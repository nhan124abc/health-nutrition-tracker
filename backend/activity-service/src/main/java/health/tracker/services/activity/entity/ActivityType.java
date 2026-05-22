package health.tracker.services.activity.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "activity_types", indexes = {
        @Index(name = "idx_activity_types_category", columnList = "category")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "name_vi", length = 100)
    private String nameVi;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Category category = Category.OTHER;

    /**
     * Metabolic Equivalent of Task - dùng để tính calo đốt:
     * calories = MET × weight_kg × duration_hours
     */
    @Column(name = "met_value", nullable = false, precision = 4, scale = 1)
    @Builder.Default
    private BigDecimal metValue = BigDecimal.valueOf(3.0);

    @Column(length = 50)
    private String icon;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private boolean system = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "activityType", fetch = FetchType.LAZY)
    @Builder.Default
    private List<ActivityLog> logs = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // ─── Enum ─────────────────────────────────────────────────────────────────

    public enum Category {
        CARDIO,       // Tim mạch
        STRENGTH,     // Sức mạnh
        FLEXIBILITY,  // Linh hoạt
        SPORTS,       // Thể thao
        DAILY,        // Hoạt động thường ngày
        OTHER
    }
}

