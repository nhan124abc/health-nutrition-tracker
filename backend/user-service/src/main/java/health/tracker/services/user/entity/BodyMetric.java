package health.tracker.services.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "body_metrics", indexes = {
        @Index(name = "idx_body_metrics_user", columnList = "user_id"),
        @Index(name = "idx_body_metrics_date", columnList = "user_id, recorded_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BodyMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "body_fat_percentage", precision = 4, scale = 1)
    private BigDecimal bodyFatPercentage;

    @Column(name = "muscle_mass_kg", precision = 5, scale = 2)
    private BigDecimal muscleMassKg;

    @Column(precision = 4, scale = 1)
    private BigDecimal bmi;

    @Column(name = "waist_cm", precision = 5, scale = 2)
    private BigDecimal waistCm;

    @Column(name = "hip_cm", precision = 5, scale = 2)
    private BigDecimal hipCm;

    @Column(name = "chest_cm", precision = 5, scale = 2)
    private BigDecimal chestCm;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "recorded_at", nullable = false)
    private LocalDate recordedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

