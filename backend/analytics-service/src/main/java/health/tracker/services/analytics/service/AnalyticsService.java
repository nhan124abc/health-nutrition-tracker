package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.DailySummaryResponse;
import health.tracker.services.analytics.entity.DailySummary;
import health.tracker.services.analytics.entity.UserStreak;
import health.tracker.services.analytics.entity.NutritionTrend;
import health.tracker.services.analytics.entity.HealthInsight;
import health.tracker.services.analytics.repository.DailySummaryRepository;
import health.tracker.services.analytics.repository.UserStreakRepository;
import health.tracker.services.analytics.repository.NutritionTrendRepository;
import health.tracker.services.analytics.repository.HealthInsightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final DailySummaryRepository summaryRepository;
    private final UserStreakRepository   streakRepository;
    private final NutritionTrendRepository trendRepository;
    private final HealthInsightRepository insightRepository;

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

    @Transactional(readOnly = true)
    public Map<String, Object> getStreakSummary(Long userId) {
        List<DailySummary> days = summaryRepository.findByUserIdOrderBySummaryDateAsc(userId);
        return Map.of(
                "logging", streakValues(days, day -> day.getMealCount() > 0 || day.getActivityCount() > 0 || day.getWaterIntakeMl() > 0),
                "goal", streakValues(days, DailySummary::isCalorieGoalMet),
                "activity", streakValues(days, day -> day.getActivityCount() > 0)
        );
    }

    @Transactional(readOnly = true)
    public List<NutritionTrend> getNutritionTrends(Long userId, YearMonth month) {
        return trendRepository.findByUserIdAndPeriodStartAndPeriodEndOrderByFrequencyDesc(
                userId, month.atDay(1), month.atEndOfMonth());
    }

    @Transactional(readOnly = true)
    public List<HealthInsight> getInsights(Long userId) {
        return insightRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public HealthInsight markInsightRead(Long userId, Long insightId) {
        HealthInsight insight = insightRepository.findById(insightId)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new health.tracker.services.analytics.exception.AppException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Insight not found"));
        insight.setRead(true);
        return insightRepository.save(insight);
    }

    private Map<String, Integer> streakValues(List<DailySummary> days, Predicate<DailySummary> qualifies) {
        int longest = 0, running = 0;
        LocalDate previous = null;
        for (DailySummary day : days) {
            if (!qualifies.test(day)) continue;
            running = previous != null && previous.plusDays(1).equals(day.getSummaryDate()) ? running + 1 : 1;
            longest = Math.max(longest, running);
            previous = day.getSummaryDate();
        }
        int current = 0;
        LocalDate expected = LocalDate.now();
        for (int index = days.size() - 1; index >= 0; index--) {
            DailySummary day = days.get(index);
            if (day.getSummaryDate().isAfter(expected)) continue;
            if (day.getSummaryDate().isBefore(expected) && expected.equals(LocalDate.now())) expected = expected.minusDays(1);
            if (!day.getSummaryDate().equals(expected) || !qualifies.test(day)) break;
            current++;
            expected = expected.minusDays(1);
        }
        return Map.of("current", current, "longest", longest);
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
            BigDecimal fiber    = toBigDecimal(event.get("fiberG"));
            BigDecimal sodium   = toBigDecimal(event.get("sodiumMg"));

            DailySummary summary = summaryRepository.findForUpdate(userId, mealDate)
                    .orElseGet(() -> buildEmpty(userId, mealDate));

            summary.setTotalCaloriesConsumed(nonNegative(summary.getTotalCaloriesConsumed().add(calories.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalProteinG(nonNegative(summary.getTotalProteinG().add(protein.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalCarbsG(nonNegative(summary.getTotalCarbsG().add(carbs.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalFatG(nonNegative(summary.getTotalFatG().add(fat.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalFiberG(nonNegative(summary.getTotalFiberG().add(fiber.multiply(BigDecimal.valueOf(direction)))));
            summary.setTotalSodiumMg(nonNegative(summary.getTotalSodiumMg().add(sodium.multiply(BigDecimal.valueOf(direction)))));
            summary.setMealCount(Math.max(0, summary.getMealCount() + direction));

            // Kiểm tra goal
            if (summary.getCalorieGoal() != null) {
                summary.setCalorieGoalMet(
                        summary.getTotalCaloriesConsumed().signum() > 0 && summary.getTotalCaloriesConsumed().compareTo(
                                BigDecimal.valueOf(summary.getCalorieGoal())) <= 0
                );
            }

            summaryRepository.save(summary);
            updateNutritionTrends(event, userId, mealDate, direction);
            createInsights(summary);
            if (direction > 0) updateStreak(userId, mealDate);

            log.debug("Daily summary updated from meal.logged event: userId={}, date={}", userId, mealDate);
        } catch (Exception e) {
            log.error("Error processing meal.logged event: {}", e.getMessage(), e);
            throw new IllegalStateException("Unable to process meal.logged event", e);
        }
    }

    @KafkaListener(topics = "activity.logged", groupId = "analytics-service-group")
    @Transactional
    public void onActivityLogged(Map<String, Object> event) {
        try {
            int direction = "DELETED".equals(event.get("eventType")) ? -1 : 1;
            Long userId = toLong(event.get("userId"));
            LocalDate activityDate = LocalDate.parse(event.get("activityDate").toString());
            DailySummary summary = summaryRepository.findForUpdate(userId, activityDate)
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
            createInsights(summary);
            if (direction > 0) updateStreak(userId, activityDate);
            log.debug("Daily summary updated from activity.logged: userId={}, date={}", userId, activityDate);
        } catch (Exception e) {
            log.error("Error processing activity.logged event: {}", e.getMessage(), e);
            throw new IllegalStateException("Unable to process activity.logged event", e);
        }
    }

    @KafkaListener(topics = "water.logged", groupId = "analytics-service-group")
    @Transactional
    public void onWaterLogged(Map<String, Object> event) {
        int direction = "DELETED".equals(event.get("eventType")) ? -1 : 1;
        Long userId = toLong(event.get("userId"));
        LocalDate date = LocalDate.parse(event.get("summaryDate").toString());
        DailySummary summary = summaryRepository.findForUpdate(userId, date)
                .orElseGet(() -> buildEmpty(userId, date));
        summary.setWaterIntakeMl(Math.max(0, summary.getWaterIntakeMl() + toInt(event.get("amountMl")) * direction));
        summaryRepository.save(summary);
    }

    @KafkaListener(topics = "body-metric.recorded", groupId = "analytics-service-group")
    @Transactional
    public void onBodyMetricRecorded(Map<String, Object> event) {
        Long userId = toLong(event.get("userId"));
        LocalDate date = LocalDate.parse(event.get("summaryDate").toString());
        DailySummary summary = summaryRepository.findForUpdate(userId, date)
                .orElseGet(() -> buildEmpty(userId, date));
        summary.setWeightKg(toBigDecimal(event.get("weightKg")));
        summaryRepository.save(summary);
    }

    @KafkaListener(topics = "profile.snapshot", groupId = "analytics-service-group")
    @Transactional
    public void onProfileSnapshot(Map<String, Object> event) {
        Long userId = toLong(event.get("userId"));
        LocalDate date = LocalDate.parse(event.get("summaryDate").toString());
        DailySummary summary = summaryRepository.findForUpdate(userId, date)
                .orElseGet(() -> buildEmpty(userId, date));
        if (event.get("calorieGoal") != null) summary.setCalorieGoal(toInt(event.get("calorieGoal")));
        if (event.get("weightKg") != null) summary.setWeightKg(toBigDecimal(event.get("weightKg")));
        if (summary.getCalorieGoal() != null) {
            summary.setCalorieGoalMet(summary.getTotalCaloriesConsumed().signum() > 0 && summary.getTotalCaloriesConsumed()
                    .compareTo(BigDecimal.valueOf(summary.getCalorieGoal())) <= 0);
        }
        summaryRepository.save(summary);
        createInsights(summary);
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

    @SuppressWarnings("unchecked")
    private void updateNutritionTrends(Map<String, Object> event, Long userId, LocalDate date, int direction) {
        Object rawItems = event.get("items");
        if (!(rawItems instanceof List<?> items)) return;
        YearMonth month = YearMonth.from(date);
        LocalDate periodStart = month.atDay(1);
        LocalDate periodEnd = month.atEndOfMonth();
        for (Object rawItem : items) {
            if (!(rawItem instanceof Map<?, ?> item) || item.get("foodItemId") == null) continue;
            Long foodItemId = toLong(item.get("foodItemId"));
            NutritionTrend trend = trendRepository
                    .findByUserIdAndFoodItemIdAndPeriodStartAndPeriodEnd(userId, foodItemId, periodStart, periodEnd)
                    .orElseGet(() -> NutritionTrend.builder()
                            .userId(userId).foodItemId(foodItemId)
                            .foodName(String.valueOf(item.get("foodName")))
                            .periodStart(periodStart).periodEnd(periodEnd)
                            .frequency(0).totalCalories(BigDecimal.ZERO).build());
            trend.setFoodName(String.valueOf(item.get("foodName")));
            trend.setFrequency(Math.max(0, trend.getFrequency() + direction));
            trend.setTotalCalories(nonNegative(trend.getTotalCalories().add(
                    toBigDecimal(item.get("calories")).multiply(BigDecimal.valueOf(direction)))));
            if (trend.getFrequency() == 0) trendRepository.delete(trend); else trendRepository.save(trend);
        }
    }

    private void createInsights(DailySummary summary) {
        if (summary.getCalorieGoal() != null && summary.getTotalCaloriesConsumed()
                .compareTo(BigDecimal.valueOf(summary.getCalorieGoal())) > 0) {
            saveInsight(summary, HealthInsight.InsightType.WARNING, "Vượt mục tiêu calo",
                    "Lượng calo hôm nay đã vượt mục tiêu. Hãy cân đối khẩu phần còn lại.");
        } else if (summary.isCalorieGoalMet()) {
            saveInsight(summary, HealthInsight.InsightType.GOAL_PROGRESS, "Đang trong mục tiêu calo",
                    "Lượng calo hôm nay đang nằm trong mục tiêu đã đặt.");
        }
        if (summary.getTotalActiveMinutes() >= 30) {
            saveInsight(summary, HealthInsight.InsightType.ACHIEVEMENT, "Hoàn thành vận động trong ngày",
                    "Bạn đã vận động ít nhất 30 phút hôm nay.");
        }
        if (summary.getTotalSodiumMg().compareTo(BigDecimal.valueOf(2300)) > 0) {
            saveInsight(summary, HealthInsight.InsightType.WARNING, "Lượng natri cao",
                    "Lượng natri hôm nay đã vượt mức tham khảo 2.300 mg.");
        }
        if (summary.getMealCount() >= 3 && summary.getTotalFiberG().compareTo(BigDecimal.valueOf(25)) < 0) {
            saveInsight(summary, HealthInsight.InsightType.NUTRITION_TIP, "Bổ sung chất xơ",
                    "Bạn có thể bổ sung rau, trái cây hoặc ngũ cốc nguyên hạt để tăng chất xơ.");
        }
    }

    private void saveInsight(DailySummary summary, HealthInsight.InsightType type, String title, String content) {
        if (!insightRepository.existsByUserIdAndInsightTypeAndTitleAndValidDate(
                summary.getUserId(), type, title, summary.getSummaryDate())) {
            insightRepository.save(HealthInsight.builder()
                    .userId(summary.getUserId()).insightType(type).title(title).content(content)
                    .validDate(summary.getSummaryDate()).build());
        }
    }

}


