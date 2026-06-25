package health.tracker.services.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles", indexes = {
        @Index(name = "idx_user_profiles_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Tham chiếu tới auth_db.users.id (cross-DB, không dùng FK)
     */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(unique = true, length = 50)
    private String username;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(name = "height_cm", precision = 5, scale = 2)
    private BigDecimal heightCm;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level")
    @Builder.Default
    private ActivityLevel activityLevel = ActivityLevel.SEDENTARY;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Goal goal = Goal.MAINTAIN_WEIGHT;

    @Column(name = "target_weight_kg", precision = 5, scale = 2)
    private BigDecimal targetWeightKg;

    @Column(name = "daily_calorie_goal")
    private Integer dailyCalorieGoal;

    @Column(name = "daily_protein_goal_g")
    private Integer dailyProteinGoalG;

    @Column(name = "daily_carbs_goal_g")
    private Integer dailyCarbsGoalG;

    @Column(name = "daily_fat_goal_g")
    private Integer dailyFatGoalG;

    @Column(name = "daily_water_goal_ml")
    @Builder.Default
    private Integer dailyWaterGoalMl = 2000;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(length = 50)
    @Builder.Default
    private String timezone = "UTC";

    @Column(name = "plan_start_date")
    private LocalDate planStartDate;

    @Column(name = "plan_duration_weeks")
    private Integer planDurationWeeks;

    @Column(name = "daily_activity_goal_kcal")
    private Integer dailyActivityGoalKcal;

    @Column(name = "hidden", nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ─── Enums ───────────────────────────────────────────────────────────────

    public enum Gender {
        MALE, FEMALE, OTHER
    }

    public enum ActivityLevel {
        SEDENTARY,          // Ít vận động
        LIGHTLY_ACTIVE,     // Vận động nhẹ 1-3 ngày/tuần
        MODERATELY_ACTIVE,  // Vận động vừa 3-5 ngày/tuần
        VERY_ACTIVE,        // Vận động nhiều 6-7 ngày/tuần
        EXTRA_ACTIVE        // Vận động rất nhiều
    }

    public enum Goal {
        LOSE_WEIGHT,
        MAINTAIN_WEIGHT,
        GAIN_WEIGHT,
        GAIN_MUSCLE,
        CUTTING,
        BODY_RECOMPOSITION,
        IMPROVE_FITNESS
    }
}

