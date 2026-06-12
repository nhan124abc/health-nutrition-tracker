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
            int direction = "DELETED".equals(event.get("eventType")) ? -1 : 1;
            Long      userId   = toLong(event.get("userId"));
            LocalDate mealDate = LocalDate.parse(event.get("mealDate").toString());
            BigDecimal calories = toBigDecimal(event.get("calories"));
            BigDecimal protein  = toBigDecimal(event.get("proteinG"));
            BigDecimal carbs    = toBigDecimal(event.get("carbsG"));
            BigDecimal fat      = toBigDecimal(event.get("fatG"));

            DailySummary summary = summaryRepository.findByUserIdAndSummaryDate(userId, mealDate)
                    .orElseGet(() -> buildEmpty(userId, mealDate));

            summary.setTotalCaloriesConsumed(nonNegative(summary.getTotalCaloriesConsumed().add(calories.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalProteinG(nonNegative(summary.getTotalProteinG().add(protein.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalCarbsG(nonNegative(summary.getTotalCarbsG().add(carbs.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalFatG(nonNegative(summary.getTotalFatG().add(fat.multiply(BigDecimal.valueOf(direction)))));
            summary.setMealCount(Math.max(0, summary.getMealCount() + direction));

            // Kiểm tra goal
            if (summary.getCalorieGoal() != null) {
                summary.setCalorieGoalMet(
                        summary.getTotalCaloriesConsumed().compareTo(
                                BigDecimal.valueOf(summary.getCalorieGoal())) <= 0
                );
            }

            summaryRepository.save(summary);
            updateStreak(userId, mealDate);

            log.debug("Daily summary updated from meal.logged event: userId={}, date={}", userId, mealDate);
        } catch (Exception e) {
            log.error("Error processing meal.logged event: {}", e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "activity.logged", groupId = "analytics-service-group")
    @Transactional
    public void onActivityLogged(Map<String, Object> event) {
        try {
            int direction = "DELETED".equals(event.get("eventType")) ? -1 : 1;
            Long userId = toLong(event.get("userId"));
            LocalDate activityDate = LocalDate.parse(event.get("activityDate").toString());
            DailySummary summary = summaryRepository.findByUserIdAndSummaryDate(userId, activityDate)
                    .orElseGet(() -> buildEmpty(userId, activityDate));

            summary.setTotalCaloriesBurned(nonNegative(summary.getTotalCaloriesBurned().add(
                    toBigDecimal(event.get("caloriesBurned")).multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalActiveMinutes(Math.max(0, summary.getTotalActiveMinutes()
                    + toInt(event.get("durationMinutes")) * direction));
            summary.setTotalSteps(Math.max(0, summary.getTotalSteps()
                    + toInt(event.get("steps")) * direction));
            summary.setTotalDistanceKm(nonNegative(summary.getTotalDistanceKm().add(
                    toBigDecimal(event.get("distanceKm")).multiply(BigDecimal.valueOf(direction)))));
            summary.setActivityCount(Math.max(0, summary.getActivityCount() + direction));

            summaryRepository.save(summary);
            if (direction > 0) updateStreak(userId, activityDate);
            log.debug("Daily summary updated from activity.logged: userId={}, date={}", userId, activityDate);
        } catch (Exception e) {
            log.error("Error processing activity.logged event: {}", e.getMessage(), e);
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

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        return Integer.parseInt(val.toString());
    }

    private BigDecimal nonNegative(BigDecimal value) {
        return value.max(BigDecimal.ZERO);
    }
}


