package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.DailySummaryResponse;
import health.tracker.services.analytics.entity.DailySummary;
import health.tracker.services.analytics.entity.UserStreak;
import health.tracker.services.analytics.repository.DailySummaryRepository;
import health.tracker.services.analytics.repository.UserStreakRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final DailySummaryRepository summaryRepository;
    private final UserStreakRepository   streakRepository;

    // ─── Query ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DailySummaryResponse getDailySummary(Long userId, LocalDate date) {
        DailySummary summary = summaryRepository.findByUserIdAndSummaryDate(userId, date)
                .orElseGet(() -> buildEmpty(userId, date));

        UserStreak streak = streakRepository.findByUserId(userId).orElse(null);
        return toResponse(summary, streak);
    }

    @Transactional(readOnly = true)
    public List<DailySummaryResponse> getRange(Long userId, LocalDate from, LocalDate to) {
        return summaryRepository
                .findByUserIdAndSummaryDateBetweenOrderBySummaryDateAsc(userId, from, to)
                .stream()
                .map(s -> toResponse(s, null))
                .toList();
    }

    // ─── Kafka Consumer — cập nhật từ meal-service ────────────────────────────

    @KafkaListener(topics = "meal.logged", groupId = "analytics-service-group")
    @Transactional
    public void onMealLogged(Map<String, Object> event) {
        try {
            Long      userId   = toLong(event.get("userId"));
            LocalDate mealDate = LocalDate.parse(event.get("mealDate").toString());
            BigDecimal calories = toBigDecimal(event.get("calories"));
            BigDecimal protein  = toBigDecimal(event.get("proteinG"));
            BigDecimal carbs    = toBigDecimal(event.get("carbsG"));
            BigDecimal fat      = toBigDecimal(event.get("fatG"));

            DailySummary summary = summaryRepository.findByUserIdAndSummaryDate(userId, mealDate)
                    .orElseGet(() -> buildEmpty(userId, mealDate));

            summary.setTotalCaloriesConsumed(summary.getTotalCaloriesConsumed().add(calories));
            summary.setTotalProteinG(summary.getTotalProteinG().add(protein));
            summary.setTotalCarbsG(summary.getTotalCarbsG().add(carbs));
            summary.setTotalFatG(summary.getTotalFatG().add(fat));
            summary.setMealCount(summary.getMealCount() + 1);

            // Kiểm tra goal
            if (summary.getCalorieGoal() != null) {
                summary.setCalorieGoalMet(
                        summary.getTotalCaloriesConsumed().compareTo(
                                BigDecimal.valueOf(summary.getCalorieGoal())) >= 0
                );
            }

            summaryRepository.save(summary);
            updateStreak(userId, mealDate);

            log.debug("Daily summary updated from meal.logged event: userId={}, date={}", userId, mealDate);
        } catch (Exception e) {
            log.error("Error processing meal.logged event: {}", e.getMessage(), e);
        }
    }

    // ─── Streak ───────────────────────────────────────────────────────────────

    private void updateStreak(Long userId, LocalDate activeDate) {
        UserStreak streak = streakRepository.findByUserId(userId)
                .orElseGet(() -> UserStreak.builder()
                        .userId(userId)
                        .streakType(UserStreak.StreakType.LOGGING_STREAK)
                        .build());

        LocalDate lastActive = streak.getLastActiveDate();
        if (lastActive == null || lastActive.isBefore(activeDate.minusDays(1))) {
            // Streak bị gián đoạn → reset
            streak.setCurrentStreak(1);
        } else if (lastActive.isBefore(activeDate)) {
            // Ngày kế tiếp → tăng streak
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
        }
        // Nếu lastActive == activeDate → đã cập nhật rồi, bỏ qua

        if (streak.getCurrentStreak() > streak.getLongestStreak()) {
            streak.setLongestStreak(streak.getCurrentStreak());
        }
        streak.setLastActiveDate(activeDate);
        streakRepository.save(streak);
    }

    // ─── Mapper & Helpers ─────────────────────────────────────────────────────

    private DailySummaryResponse toResponse(DailySummary s, UserStreak streak) {
        int goalPercent = 0;
        if (s.getCalorieGoal() != null && s.getCalorieGoal() > 0) {
            goalPercent = s.getTotalCaloriesConsumed()
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(s.getCalorieGoal()), 0, java.math.RoundingMode.HALF_UP)
                    .intValue();
        }

        int currentStreak  = (streak != null) ? streak.getCurrentStreak() : 0;
        String streakLabel = currentStreak > 0 ? "🔥 " + currentStreak + " ngày liên tiếp" : "Bắt đầu streak mới!";

        return DailySummaryResponse.builder()
                .userId(s.getUserId()).summaryDate(s.getSummaryDate())
                .totalCaloriesConsumed(s.getTotalCaloriesConsumed())
                .totalProteinG(s.getTotalProteinG()).totalCarbsG(s.getTotalCarbsG())
                .totalFatG(s.getTotalFatG()).totalFiberG(s.getTotalFiberG())
                .totalSodiumMg(s.getTotalSodiumMg()).mealCount(s.getMealCount())
                .totalCaloriesBurned(s.getTotalCaloriesBurned())
                .totalActiveMinutes(s.getTotalActiveMinutes())
                .totalSteps(s.getTotalSteps()).totalDistanceKm(s.getTotalDistanceKm())
                .activityCount(s.getActivityCount())
                .netCalories(s.getNetCalories())
                .waterIntakeMl(s.getWaterIntakeMl())
                .calorieGoal(s.getCalorieGoal()).calorieGoalMet(s.isCalorieGoalMet())
                .calorieGoalPercent(goalPercent)
                .weightKg(s.getWeightKg())
                .currentStreak(currentStreak).streakLabel(streakLabel)
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private DailySummary buildEmpty(Long userId, LocalDate date) {
        return DailySummary.builder()
                .userId(userId).summaryDate(date)
                .build();
    }

    private Long toLong(Object val) {
        if (val instanceof Number n) return n.longValue();
        return Long.parseLong(val.toString());
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        return new BigDecimal(val.toString());
    }
}


