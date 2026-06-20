package health.tracker.services.user.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import health.tracker.services.user.entity.UserProfile;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UserProfileRequest {

    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private UserProfile.Gender gender;

    @DecimalMin(value = "50.0", message = "Height must be at least 50 cm")
    @DecimalMax(value = "300.0", message = "Height must be at most 300 cm")
    private BigDecimal heightCm;

    @DecimalMin(value = "1.0", message = "Weight must be at least 1 kg")
    @DecimalMax(value = "500.0", message = "Weight must be at most 500 kg")
    private BigDecimal weightKg;

    private UserProfile.ActivityLevel activityLevel;

    private UserProfile.Goal goal;

    @DecimalMin(value = "1.0", message = "Target weight must be at least 1 kg")
    @DecimalMax(value = "500.0", message = "Target weight must be at most 500 kg")
    private BigDecimal targetWeightKg;

    @Min(value = 500, message = "Calorie goal must be at least 500 kcal")
    @Max(value = 10000, message = "Calorie goal must be at most 10,000 kcal")
    private Integer dailyCalorieGoal;

    @Min(value = 100, message = "Water goal must be at least 100 ml")
    @Max(value = 10000, message = "Water goal must be at most 10,000 ml")
    private Integer dailyWaterGoalMl;

    @Size(max = 500, message = "Bio must not exceed 500 characters")
    private String bio;

    private String timezone;
}

