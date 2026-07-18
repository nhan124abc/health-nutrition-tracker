package health.tracker.services.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.user.entity.UserProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private Long id;
    private Long userId;
    private String username;
    private String avatarUrl;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private UserProfile.Gender gender;
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private UserProfile.ActivityLevel activityLevel;
    private UserProfile.Goal goal;
    private BigDecimal targetWeightKg;
    private Integer bmr;
    private Integer tdee;
    private BigDecimal activityFactor;
    private Integer dailyCalorieGoal;
    private Integer dailyProteinGoalG;
    private Integer dailyCarbsGoalG;
    private Integer dailyFatGoalG;
    private Integer dailyWaterGoalMl;
    private String bio;
    private String timezone;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate planStartDate;
    private Integer planDurationWeeks;
    private Integer dailyActivityGoalKcal;
    private java.util.List<WeightMilestone> weeklyWeightMilestones;
    private boolean hidden;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class WeightMilestone {
        private int weekNumber;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate date;
        private BigDecimal targetWeightKg;
    }
}

