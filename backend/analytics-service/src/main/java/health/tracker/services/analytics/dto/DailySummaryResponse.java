package health.tracker.services.analytics.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class DailySummaryResponse {

    private Long userId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate summaryDate;

    // ─── Dinh dưỡng ───────────────────────────────────────────────────────────
    private BigDecimal totalCaloriesConsumed;
    private BigDecimal totalProteinG;
    private BigDecimal totalCarbsG;
    private BigDecimal totalFatG;
    private BigDecimal totalFiberG;
    private BigDecimal totalSodiumMg;
    private Integer    mealCount;

    // ─── Vận động ─────────────────────────────────────────────────────────────
    private BigDecimal totalCaloriesBurned;
    private Integer    totalActiveMinutes;
    private Integer    totalSteps;
    private BigDecimal totalDistanceKm;
    private Integer    activityCount;

    // ─── Cân bằng ─────────────────────────────────────────────────────────────
    /** net_calories = consumed - burned (GENERATED COLUMN từ MySQL) */
    private BigDecimal netCalories;

    // ─── Nước uống ────────────────────────────────────────────────────────────
    private Integer waterIntakeMl;

    // ─── Mục tiêu ─────────────────────────────────────────────────────────────
    private Integer    calorieGoal;
    private boolean    calorieGoalMet;
    /** % đạt mục tiêu calo (0-100+) */
    private Integer    calorieGoalPercent;

    // ─── Cân nặng ─────────────────────────────────────────────────────────────
    private BigDecimal weightKg;

    // ─── Streak ───────────────────────────────────────────────────────────────
    private Integer currentStreak;
    private String  streakLabel;   // VD: "🔥 7 ngày liên tiếp"

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}

