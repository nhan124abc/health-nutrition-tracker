package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.HealthInsightResponse;
import health.tracker.services.analytics.entity.HealthInsight;
import health.tracker.services.analytics.exception.AppException;
import health.tracker.services.analytics.repository.HealthInsightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HealthInsightService {

    private static final int DEFAULT_WATER_GOAL_ML = 2000;
    private static final int DEFAULT_ACTIVITY_GOAL_KCAL = 200;
    private static final BigDecimal DEFAULT_FIBER_GOAL_G = BigDecimal.valueOf(25);
    private static final BigDecimal SODIUM_LIMIT_MG = BigDecimal.valueOf(2300);
    private static final BigDecimal FAT_CALORIES_PER_GRAM = BigDecimal.valueOf(9);
    private static final BigDecimal CARB_CALORIES_PER_GRAM = BigDecimal.valueOf(4);
    private static final int MAX_DAILY_INSIGHTS = 5;
    private static final int MAX_INSIGHTS_PER_TYPE = 2;

    private final HealthInsightRepository insightRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public List<HealthInsightResponse> getInsights(Long userId, boolean unreadOnly) {
        refreshTodayInsights(userId, LocalDate.now(), isVietnamese());

        Locale locale = LocaleContextHolder.getLocale();
        List<HealthInsight> insights = unreadOnly
                ? insightRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                : insightRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return insights.stream()
                .map(insight -> toResponse(insight, locale))
                .toList();
    }

    @Transactional
    public HealthInsightResponse markRead(Long userId, Long insightId) {
        Locale locale = LocaleContextHolder.getLocale();
        HealthInsight insight = insightRepository.findById(insightId)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Health insight not found: " + insightId));

        insight.setRead(true);
        return toResponse(insightRepository.save(insight), locale);
    }

    private void refreshTodayInsights(Long userId, LocalDate date, boolean vietnamese) {
        insightRepository.deleteByUserIdAndValidDateAndReadFalse(userId, date);

        InsightSnapshot snapshot = loadSnapshot(userId, date);
        List<RankedInsight> candidates = buildInsights(userId, date, snapshot, vietnamese);

        List<HealthInsight> insights = selectDiverseInsights(candidates);

        if (!insights.isEmpty()) {
            insightRepository.saveAll(insights);
        }
    }

    private InsightSnapshot loadSnapshot(Long userId, LocalDate date) {
        ProfileTargets profile = queryProfile(userId);
        MealTotals meals = queryMeals(userId, date);
        ActivityTotals activities = queryActivities(userId, date);
        int waterMl = queryWaterMl(userId, date);
        BodyMetricSummary bodyMetric = queryLatestBodyMetric(userId, date);
        BodyMetricSummary previousBodyMetric = queryPreviousBodyMetric(userId, date.minusDays(7));
        int activeDaysThisWeek = queryActiveDays(userId, date.minusDays(6), date);
        int mealTypeCount = queryMealTypeCount(userId, date);
        int activityCategoryCount = queryActivityCategoryCount(userId, date.minusDays(13), date);

        return new InsightSnapshot(
                profile,
                meals,
                activities,
                waterMl,
                bodyMetric,
                previousBodyMetric,
                activeDaysThisWeek,
                mealTypeCount,
                activityCategoryCount
        );
    }

    private List<RankedInsight> buildInsights(Long userId, LocalDate date, InsightSnapshot snapshot, boolean vi) {
        List<RankedInsight> insights = new ArrayList<>();

        ProfileTargets profile = snapshot.profile();
        MealTotals meals = snapshot.meals();
        ActivityTotals activities = snapshot.activities();
        BodyMetricSummary metric = snapshot.bodyMetric();

        int calorieGoal = positiveOrDefault(profile.calorieGoal(), 0);
        int waterGoal = positiveOrDefault(profile.waterGoalMl(), DEFAULT_WATER_GOAL_ML);
        int activityGoal = positiveOrDefault(profile.activityGoalKcal(), DEFAULT_ACTIVITY_GOAL_KCAL);
        int proteinGoal = positiveOrDefault(profile.proteinGoalG(), 0);

        if (!snapshot.hasAnyLog()) {
            insights.add(rank(90, build(
                    userId,
                    date,
                    HealthInsight.InsightType.NUTRITION_TIP,
                    vi ? "Bắt đầu ghi nhận hôm nay" : "Start logging today",
                    vi
                            ? "Hôm nay chưa có dữ liệu bữa ăn, nước uống, vận động hoặc chỉ số cơ thể. Hãy ghi nhận ít nhất một mục để hệ thống phân tích sát hơn."
                            : "There is no meal, water, activity, or body metric data today. Log at least one item to receive more useful insights."
            )));
            return insights;
        }

        if (calorieGoal > 0 && meals.calories().signum() > 0) {
            int consumed = round(meals.calories());
            int difference = consumed - calorieGoal;
            int percent = percent(meals.calories(), BigDecimal.valueOf(calorieGoal));

            if (percent >= 115) {
                insights.add(rank(10, build(
                        userId,
                        date,
                        HealthInsight.InsightType.WARNING,
                        vi ? "Calo hôm nay đang vượt mục tiêu" : "Calories are above target",
                        vi
                                ? "Bạn đã nạp khoảng " + consumed + " / " + calorieGoal + " kcal, vượt " + difference + " kcal. Bữa còn lại nên ưu tiên món ít dầu mỡ và nhiều rau."
                                : "You have logged about " + consumed + " / " + calorieGoal + " kcal, " + difference + " kcal over target. Keep the remaining meals lighter and vegetable-focused."
                )));
            } else if (percent >= 90 && percent <= 105) {
                insights.add(rank(45, build(
                        userId,
                        date,
                        HealthInsight.InsightType.GOAL_PROGRESS,
                        vi ? "Calo đang sát mục tiêu" : "Calories are close to target",
                        vi
                                ? "Bạn đang ở mức " + consumed + " / " + calorieGoal + " kcal (" + percent + "%). Tiếp tục giữ khẩu phần cân bằng để không vượt mục tiêu cuối ngày."
                                : "You are at " + consumed + " / " + calorieGoal + " kcal (" + percent + "%). Keep the remaining choices balanced to stay on target."
                )));
            } else if (percent < 60 && meals.mealCount() >= 2) {
                insights.add(rank(35, build(
                        userId,
                        date,
                        HealthInsight.InsightType.WARNING,
                        vi ? "Năng lượng nạp vào đang thấp" : "Energy intake is low",
                        vi
                                ? "Sau " + meals.mealCount() + " bữa, bạn mới đạt khoảng " + percent + "% mục tiêu calo. Nếu còn đói, hãy thêm bữa phụ giàu đạm hoặc tinh bột tốt."
                                : "After " + meals.mealCount() + " meals, you have reached only about " + percent + "% of your calorie target. Add a protein-rich snack or quality carbs if needed."
                )));
            }
        }

        if (metric != null && metric.tdee() != null && meals.calories().signum() > 0) {
            int consumed = round(meals.calories());
            int tdee = round(metric.tdee());
            int gap = consumed - tdee;
            String goal = profile.goal() == null ? "" : profile.goal();

            if ("LOSE_WEIGHT".equals(goal) && gap > 0) {
                insights.add(rank(18, build(
                        userId,
                        date,
                        HealthInsight.InsightType.WARNING,
                        vi ? "Calo đang cao hơn TDEE" : "Calories are above TDEE",
                        vi
                                ? "Bạn đã nạp khoảng " + consumed + " kcal, cao hơn TDEE gần nhất " + tdee + " kcal. Nếu mục tiêu là giảm cân, nên giữ mức nạp thấp hơn TDEE một khoảng vừa phải."
                                : "You have logged about " + consumed + " kcal, above your latest TDEE of " + tdee + " kcal. For weight loss, keep intake moderately below TDEE."
                )));
            } else if ("GAIN_MUSCLE".equals(goal) && consumed < tdee) {
                insights.add(rank(48, build(
                        userId,
                        date,
                        HealthInsight.InsightType.GOAL_PROGRESS,
                        vi ? "Tăng cơ cần đủ năng lượng" : "Muscle gain needs enough energy",
                        vi
                                ? "Bạn đang nạp thấp hơn TDEE khoảng " + Math.abs(gap) + " kcal. Nếu mục tiêu là tăng cơ, hãy cân nhắc thêm bữa phụ giàu đạm và tinh bột tốt."
                                : "You are about " + Math.abs(gap) + " kcal below TDEE. For muscle gain, consider a protein-rich snack with quality carbs."
                )));
            }
        }

        if (proteinGoal > 0 && meals.mealCount() > 0) {
            int protein = round(meals.protein());
            int proteinPercent = percent(meals.protein(), BigDecimal.valueOf(proteinGoal));
            if (proteinPercent < 80) {
                insights.add(rank(20, build(
                        userId,
                        date,
                        HealthInsight.InsightType.NUTRITION_TIP,
                        vi ? "Protein hôm nay còn thấp" : "Protein is still low",
                        vi
                                ? "Bạn mới đạt khoảng " + protein + " / " + proteinGoal + "g protein. Có thể bổ sung trứng, ức gà, cá, sữa chua Hy Lạp, đậu phụ hoặc các loại đậu."
                                : "You have reached about " + protein + " / " + proteinGoal + "g protein. Consider eggs, chicken breast, fish, Greek yogurt, tofu, or legumes."
                )));
            }
        }

        if (meals.mealCount() > 0 && meals.calories().compareTo(BigDecimal.valueOf(300)) >= 0) {
            int fatPercent = percent(meals.fat().multiply(FAT_CALORIES_PER_GRAM), meals.calories());
            int carbPercent = percent(meals.carbs().multiply(CARB_CALORIES_PER_GRAM), meals.calories());

            if (fatPercent > 40) {
                insights.add(rank(42, build(
                        userId,
                        date,
                        HealthInsight.InsightType.NUTRITION_TIP,
                        vi ? "Chất béo đang chiếm tỷ lệ cao" : "Fat ratio is high",
                        vi
                                ? "Chất béo đang chiếm khoảng " + fatPercent + "% năng lượng đã ghi nhận. Bữa tiếp theo nên ưu tiên đạm nạc, rau và cách chế biến ít dầu."
                                : "Fat accounts for about " + fatPercent + "% of logged energy. Keep the next meal focused on lean protein, vegetables, and less oil."
                )));
            } else if (carbPercent > 65) {
                insights.add(rank(52, build(
                        userId,
                        date,
                        HealthInsight.InsightType.NUTRITION_TIP,
                        vi ? "Tinh bột đang hơi cao" : "Carbs are a bit high",
                        vi
                                ? "Tinh bột đang chiếm khoảng " + carbPercent + "% năng lượng đã ghi nhận. Bạn có thể cân bằng thêm bằng đạm và rau trong bữa còn lại."
                                : "Carbs account for about " + carbPercent + "% of logged energy. Balance the rest of the day with protein and vegetables."
                )));
            }
        }

        if (meals.mealCount() > 0 && snapshot.mealTypeCount() <= 1 && meals.calories().compareTo(BigDecimal.valueOf(900)) > 0) {
            insights.add(rank(58, build(
                    userId,
                    date,
                    HealthInsight.InsightType.NUTRITION_TIP,
                    vi ? "Calo tập trung vào ít bữa" : "Calories are concentrated",
                    vi
                            ? "Hôm nay calo đang tập trung vào " + snapshot.mealTypeCount() + " loại bữa. Chia khẩu phần đều hơn có thể giúp kiểm soát đói và năng lượng ổn định hơn."
                            : "Today's calories are concentrated in " + snapshot.mealTypeCount() + " meal slot. Spreading intake more evenly can help hunger and energy feel steadier."
            )));
        }

        if (meals.mealCount() >= 2 && meals.fiber().compareTo(DEFAULT_FIBER_GOAL_G.multiply(new BigDecimal("0.6"))) < 0) {
            insights.add(rank(55, build(
                    userId,
                    date,
                    HealthInsight.InsightType.NUTRITION_TIP,
                    vi ? "Chất xơ còn thiếu" : "Fiber is low",
                    vi
                            ? "Bạn mới ghi nhận khoảng " + round(meals.fiber()) + "g chất xơ. Thêm rau xanh, trái cây hoặc ngũ cốc nguyên hạt sẽ giúp bữa ăn cân bằng hơn."
                            : "You have logged about " + round(meals.fiber()) + "g fiber. Add vegetables, fruit, or whole grains to balance the day."
            )));
        }

        if (meals.sodium().compareTo(SODIUM_LIMIT_MG) > 0) {
            insights.add(rank(15, build(
                    userId,
                    date,
                    HealthInsight.InsightType.WARNING,
                    vi ? "Natri đang cao" : "Sodium is high",
                    vi
                            ? "Lượng natri hôm nay khoảng " + round(meals.sodium()) + "mg, cao hơn mức tham khảo 2300mg. Nên hạn chế đồ mặn, nước chấm và thực phẩm chế biến sẵn."
                            : "Today's sodium is about " + round(meals.sodium()) + "mg, above the 2300mg reference. Limit salty sauces and processed foods for the rest of the day."
            )));
        }

        if (snapshot.waterMl() == 0 && snapshot.hasAnyFoodOrActivityLog()) {
            insights.add(rank(38, build(
                    userId,
                    date,
                    HealthInsight.InsightType.NUTRITION_TIP,
                    vi ? "Chưa ghi nhận nước uống" : "No water logged yet",
                    vi
                            ? "Hôm nay đã có dữ liệu ăn uống hoặc vận động nhưng chưa có nước uống. Ghi nước giúp hệ thống đánh giá cân bằng ngày chính xác hơn."
                            : "You have meal or activity data today but no water logged yet. Logging water helps the system evaluate the day more accurately."
            )));
        } else if (snapshot.waterMl() > 0) {
            int waterPercent = (int) Math.round(snapshot.waterMl() * 100.0 / waterGoal);
            if (waterPercent < 70) {
                insights.add(rank(25, build(
                        userId,
                        date,
                        HealthInsight.InsightType.WARNING,
                        vi ? "Nước uống chưa đạt mục tiêu" : "Hydration is behind target",
                        vi
                                ? "Bạn đã uống khoảng " + snapshot.waterMl() + " / " + waterGoal + " ml (" + waterPercent + "%). Hãy chia nhỏ vài lần uống trong phần còn lại của ngày."
                                : "You have logged about " + snapshot.waterMl() + " / " + waterGoal + " ml (" + waterPercent + "%). Spread a few small drinks across the rest of the day."
                )));
            } else if (waterPercent >= 100) {
                insights.add(rank(65, build(
                        userId,
                        date,
                        HealthInsight.InsightType.ACHIEVEMENT,
                        vi ? "Đã đạt mục tiêu nước" : "Water goal reached",
                        vi
                                ? "Bạn đã đạt " + snapshot.waterMl() + " / " + waterGoal + " ml nước hôm nay. Đây là một thói quen rất tốt để duy trì."
                                : "You have reached " + snapshot.waterMl() + " / " + waterGoal + " ml water today. This is a good habit to maintain."
                )));
            }
        }

        if (activities.minutes() >= 30 && snapshot.waterMl() > 0 && snapshot.waterMl() < waterGoal) {
            insights.add(rank(44, build(
                    userId,
                    date,
                    HealthInsight.InsightType.ACTIVITY_TIP,
                    vi ? "Vận động cần bù nước" : "Activity needs hydration",
                    vi
                            ? "Bạn đã vận động " + activities.minutes() + " phút nhưng nước uống mới đạt " + snapshot.waterMl() + " / " + waterGoal + " ml. Hãy bù nước từng ít một sau vận động."
                            : "You have been active for " + activities.minutes() + " minutes, while water is at " + snapshot.waterMl() + " / " + waterGoal + " ml. Rehydrate gradually after activity."
            )));
        }

        if (activities.activityCount() > 0) {
            int activeMinutes = activities.minutes();
            int burned = round(activities.calories());
            if (activeMinutes >= 30 || burned >= activityGoal) {
                insights.add(rank(60, build(
                        userId,
                        date,
                        HealthInsight.InsightType.ACHIEVEMENT,
                        vi ? "Vận động hôm nay rất tốt" : "Good activity today",
                        vi
                                ? "Bạn đã vận động " + activeMinutes + " phút và tiêu hao khoảng " + burned + " kcal. Tiến độ này đang hỗ trợ tốt cho mục tiêu của bạn."
                                : "You have been active for " + activeMinutes + " minutes and burned about " + burned + " kcal. This supports your current goal well."
                )));
            }
            if (snapshot.activityCategoryCount() == 1 && snapshot.activeDaysThisWeek() >= 3) {
                insights.add(rank(72, build(
                        userId,
                        date,
                        HealthInsight.InsightType.ACTIVITY_TIP,
                        vi ? "Nên đa dạng bài tập" : "Diversify your workouts",
                        vi
                                ? "Hai tuần gần đây bạn chủ yếu ghi nhận một nhóm vận động. Kết hợp thêm giãn cơ, đi bộ hoặc sức mạnh sẽ giúp tiến trình cân bằng hơn."
                                : "Over the last two weeks, your activity logs mostly come from one category. Add stretching, walking, or strength work for better balance."
                )));
            }
        } else if (snapshot.activeDaysThisWeek() < 3) {
            insights.add(rank(50, build(
                    userId,
                    date,
                    HealthInsight.InsightType.ACTIVITY_TIP,
                    vi ? "Nên thêm vận động nhẹ" : "Add light movement",
                    vi
                            ? "Tuần này bạn mới có " + snapshot.activeDaysThisWeek() + " ngày ghi nhận vận động. Một buổi đi bộ 15-20 phút hôm nay sẽ giúp tiến trình đều hơn."
                            : "You have logged activity on " + snapshot.activeDaysThisWeek() + " days this week. A 15-20 minute walk today can keep progress more consistent."
            )));
        }

        if (metric != null) {
            if (metric.bmi() != null && metric.bmi().compareTo(BigDecimal.valueOf(25)) >= 0) {
                insights.add(rank(40, build(
                        userId,
                        date,
                        HealthInsight.InsightType.GOAL_PROGRESS,
                        vi ? "Theo dõi BMI và TDEE" : "Track BMI and TDEE",
                        vi
                                ? "BMI gần nhất của bạn là " + oneDecimal(metric.bmi()) + ". TDEE " + valueOrUnknown(metric.tdee()) + " kcal có thể dùng làm mốc để đặt mục tiêu calo hợp lý."
                                : "Your latest BMI is " + oneDecimal(metric.bmi()) + ". TDEE " + valueOrUnknown(metric.tdee()) + " kcal can be used as a baseline for calorie targets."
                )));
            }

            if (metric.recordedAt() != null && metric.recordedAt().isBefore(date.minusDays(7))) {
                insights.add(rank(62, build(
                        userId,
                        date,
                        HealthInsight.InsightType.GOAL_PROGRESS,
                        vi ? "Nên cập nhật chỉ số cơ thể" : "Update body metrics",
                        vi
                                ? "Chỉ số cơ thể gần nhất được ghi ngày " + metric.recordedAt() + ". Cập nhật cân nặng, BMI hoặc TDEE mỗi tuần sẽ giúp mục tiêu chính xác hơn."
                                : "Your latest body metric was recorded on " + metric.recordedAt() + ". Updating weight, BMI, or TDEE weekly keeps targets more accurate."
                )));
            }

            if (snapshot.previousBodyMetric() != null && metric.weightKg() != null && snapshot.previousBodyMetric().weightKg() != null) {
                BigDecimal delta = metric.weightKg().subtract(snapshot.previousBodyMetric().weightKg());
                if (delta.abs().compareTo(new BigDecimal("1.5")) >= 0) {
                    insights.add(rank(30, build(
                            userId,
                            date,
                            HealthInsight.InsightType.WARNING,
                            vi ? "Cân nặng thay đổi nhanh" : "Weight changed quickly",
                            vi
                                    ? "Cân nặng thay đổi khoảng " + oneDecimal(delta) + " kg so với lần ghi trước trong 7 ngày gần đây. Hãy kiểm tra lại calo, nước uống và mức vận động."
                                    : "Weight changed by about " + oneDecimal(delta) + " kg compared with the previous record within the last 7 days. Review calories, hydration, and activity."
                    )));
                }
            }
        } else {
            insights.add(rank(70, build(
                    userId,
                    date,
                    HealthInsight.InsightType.GOAL_PROGRESS,
                    vi ? "Thiếu dữ liệu chỉ số cơ thể" : "Body metrics are missing",
                    vi
                            ? "Bạn chưa có chỉ số cơ thể để phân tích BMI, BMR hoặc TDEE. Thêm một bản ghi sẽ giúp insight về mục tiêu calo chính xác hơn."
                            : "There is no body metric data for BMI, BMR, or TDEE analysis. Add one record to make calorie-goal insights more accurate."
            )));
        }

        if (insights.isEmpty()) {
            insights.add(rank(95, build(
                    userId,
                    date,
                    HealthInsight.InsightType.GOAL_PROGRESS,
                    vi ? "Dữ liệu hôm nay đang ổn định" : "Today's data looks steady",
                    vi
                            ? "Không có cảnh báo lớn từ dữ liệu hôm nay. Hãy tiếp tục ghi nhận bữa ăn, nước uống và vận động để hệ thống theo dõi xu hướng chính xác hơn."
                            : "There are no major alerts from today's data. Keep logging meals, water, and activity so the system can track trends more accurately."
            )));
        }

        return insights;
    }

    private List<HealthInsight> selectDiverseInsights(List<RankedInsight> candidates) {
        Map<HealthInsight.InsightType, Integer> typeCounts = new HashMap<>();
        List<HealthInsight> selected = new ArrayList<>();

        List<RankedInsight> sorted = candidates.stream()
                .sorted(Comparator.comparingInt(RankedInsight::priority))
                .toList();

        for (RankedInsight candidate : sorted) {
            HealthInsight.InsightType type = candidate.insight().getInsightType();
            int count = typeCounts.getOrDefault(type, 0);
            if (count >= MAX_INSIGHTS_PER_TYPE) {
                continue;
            }
            selected.add(candidate.insight());
            typeCounts.put(type, count + 1);
            if (selected.size() == MAX_DAILY_INSIGHTS) {
                return selected;
            }
        }

        for (RankedInsight candidate : sorted) {
            if (selected.contains(candidate.insight())) {
                continue;
            }
            selected.add(candidate.insight());
            if (selected.size() == MAX_DAILY_INSIGHTS) {
                break;
            }
        }

        return selected;
    }

    private ProfileTargets queryProfile(Long userId) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT daily_calorie_goal,
                           daily_protein_goal_g,
                           daily_water_goal_ml,
                           daily_activity_goal_kcal,
                           activity_level,
                           goal
                    FROM user_db.user_profiles
                    WHERE user_id = ?
                    """,
                    (rs, rowNum) -> new ProfileTargets(
                            nullableInt(rs.getObject("daily_calorie_goal")),
                            nullableInt(rs.getObject("daily_protein_goal_g")),
                            nullableInt(rs.getObject("daily_water_goal_ml")),
                            nullableInt(rs.getObject("daily_activity_goal_kcal")),
                            rs.getString("activity_level"),
                            rs.getString("goal")
                    ),
                    userId);
        } catch (EmptyResultDataAccessException ex) {
            return new ProfileTargets(null, null, null, null, null, null);
        }
    }

    private MealTotals queryMeals(Long userId, LocalDate date) {
        return jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT m.id) AS meal_count,
                       COALESCE(SUM(mi.calories), 0) AS calories,
                       COALESCE(SUM(mi.protein_g), 0) AS protein,
                       COALESCE(SUM(mi.carbs_g), 0) AS carbs,
                       COALESCE(SUM(mi.fat_g), 0) AS fat,
                       COALESCE(SUM(mi.fiber_g), 0) AS fiber,
                       COALESCE(SUM(mi.sodium_mg), 0) AS sodium
                FROM meal_db.meals m
                LEFT JOIN meal_db.meal_items mi ON mi.meal_id = m.id
                WHERE m.user_id = ? AND m.meal_date = ?
                """,
                (rs, rowNum) -> new MealTotals(
                        rs.getInt("meal_count"),
                        decimal(rs.getBigDecimal("calories")),
                        decimal(rs.getBigDecimal("protein")),
                        decimal(rs.getBigDecimal("carbs")),
                        decimal(rs.getBigDecimal("fat")),
                        decimal(rs.getBigDecimal("fiber")),
                        decimal(rs.getBigDecimal("sodium"))
                ),
                userId,
                Date.valueOf(date));
    }

    private ActivityTotals queryActivities(Long userId, LocalDate date) {
        return jdbcTemplate.queryForObject("""
                SELECT COUNT(*) AS activity_count,
                       COALESCE(SUM(duration_minutes), 0) AS minutes,
                       COALESCE(SUM(calories_burned), 0) AS calories
                FROM activity_db.activity_logs
                WHERE user_id = ? AND DATE(logged_at) = ?
                """,
                (rs, rowNum) -> new ActivityTotals(
                        rs.getInt("activity_count"),
                        rs.getInt("minutes"),
                        decimal(rs.getBigDecimal("calories"))
                ),
                userId,
                Date.valueOf(date));
    }

    private int queryWaterMl(Long userId, LocalDate date) {
        Integer amount = jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(amount_ml), 0)
                FROM user_db.water_logs
                WHERE user_id = ? AND DATE(logged_at) = ?
                """, Integer.class, userId, Date.valueOf(date));
        return amount == null ? 0 : amount;
    }

    private int queryActiveDays(Long userId, LocalDate from, LocalDate to) {
        Integer days = jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT DATE(logged_at))
                FROM activity_db.activity_logs
                WHERE user_id = ? AND DATE(logged_at) BETWEEN ? AND ?
                """, Integer.class, userId, Date.valueOf(from), Date.valueOf(to));
        return days == null ? 0 : days;
    }

    private int queryMealTypeCount(Long userId, LocalDate date) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT meal_type)
                FROM meal_db.meals
                WHERE user_id = ? AND meal_date = ?
                """, Integer.class, userId, Date.valueOf(date));
        return count == null ? 0 : count;
    }

    private int queryActivityCategoryCount(Long userId, LocalDate from, LocalDate to) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(DISTINCT category)
                FROM activity_db.activity_logs
                WHERE user_id = ? AND DATE(logged_at) BETWEEN ? AND ?
                """, Integer.class, userId, Date.valueOf(from), Date.valueOf(to));
        return count == null ? 0 : count;
    }

    private BodyMetricSummary queryLatestBodyMetric(Long userId, LocalDate date) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT weight_kg, bmi, bmr, tdee, body_fat_percentage, recorded_at
                    FROM user_db.body_metrics
                    WHERE user_id = ? AND recorded_at <= ?
                    ORDER BY recorded_at DESC, id DESC
                    LIMIT 1
                    """,
                    (rs, rowNum) -> new BodyMetricSummary(
                            rs.getBigDecimal("weight_kg"),
                            rs.getBigDecimal("bmi"),
                            rs.getBigDecimal("bmr"),
                            rs.getBigDecimal("tdee"),
                            rs.getBigDecimal("body_fat_percentage"),
                            rs.getDate("recorded_at").toLocalDate()
                    ),
                    userId,
                    Date.valueOf(date));
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    private BodyMetricSummary queryPreviousBodyMetric(Long userId, LocalDate fromDate) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT weight_kg, bmi, bmr, tdee, body_fat_percentage, recorded_at
                    FROM user_db.body_metrics
                    WHERE user_id = ? AND recorded_at >= ?
                    ORDER BY recorded_at ASC, id ASC
                    LIMIT 1
                    """,
                    (rs, rowNum) -> new BodyMetricSummary(
                            rs.getBigDecimal("weight_kg"),
                            rs.getBigDecimal("bmi"),
                            rs.getBigDecimal("bmr"),
                            rs.getBigDecimal("tdee"),
                            rs.getBigDecimal("body_fat_percentage"),
                            rs.getDate("recorded_at").toLocalDate()
                    ),
                    userId,
                    Date.valueOf(fromDate));
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    private HealthInsight build(
            Long userId,
            LocalDate validDate,
            HealthInsight.InsightType type,
            String title,
            String content
    ) {
        return HealthInsight.builder()
                .userId(userId)
                .validDate(validDate)
                .insightType(type)
                .title(title)
                .content(content)
                .read(false)
                .build();
    }

    private RankedInsight rank(int priority, HealthInsight insight) {
        return new RankedInsight(priority, insight);
    }

    private HealthInsightResponse toResponse(HealthInsight insight, Locale locale) {
        boolean vietnamese = locale != null && "vi".equalsIgnoreCase(locale.getLanguage());
        return HealthInsightResponse.builder()
                .id(insight.getId())
                .userId(insight.getUserId())
                .insightType(insight.getInsightType())
                .title(localizeLegacyTitle(insight.getTitle(), vietnamese))
                .content(localizeLegacyContent(insight.getContent(), vietnamese))
                .read(insight.isRead())
                .validDate(insight.getValidDate())
                .createdAt(insight.getCreatedAt())
                .build();
    }

    private boolean isVietnamese() {
        Locale locale = LocaleContextHolder.getLocale();
        return locale != null && "vi".equalsIgnoreCase(locale.getLanguage());
    }

    private String localizeLegacyTitle(String title, boolean vietnamese) {
        if (!vietnamese) {
            return title;
        }

        return switch (title) {
            case "Start logging today" -> "Bắt đầu ghi nhận hôm nay";
            case "Hydration is low" -> "Lượng nước đang thấp";
            case "Calorie goal exceeded" -> "Đã vượt mục tiêu calo";
            case "Close to calorie target" -> "Sắp đạt mục tiêu calo";
            case "Activity logged" -> "Đã ghi nhận vận động";
            case "Add light movement" -> "Thêm vận động nhẹ";
            case "No meals logged yet" -> "Chưa ghi nhận bữa ăn nào";
            default -> title;
        };
    }

    private String localizeLegacyContent(String content, boolean vietnamese) {
        if (!vietnamese) {
            return content;
        }

        return switch (content) {
            case "Log your meals, water, and activity to receive more personalized health insights." ->
                    "Ghi nhận bữa ăn, nước uống và vận động để nhận gợi ý sức khỏe cá nhân hóa hơn.";
            case "Your water intake is below 1.5L today. Add a few small glasses of water before the day ends." ->
                    "Lượng nước hôm nay của bạn đang dưới 1,5 lít. Hãy uống thêm vài cốc nước nhỏ trước khi kết thúc ngày.";
            case "You are above your calorie target today. Consider lighter meals for the rest of the day." ->
                    "Bạn đã vượt mục tiêu calo hôm nay. Hãy ưu tiên các bữa ăn nhẹ hơn trong phần còn lại của ngày.";
            case "You are close to your calorie target. Keep the remaining food choices balanced." ->
                    "Bạn đang gần chạm mục tiêu calo. Hãy giữ các lựa chọn còn lại ở mức cân bằng.";
            case "You logged physical activity today. Consistent movement helps maintain your weekly progress." ->
                    "Bạn đã ghi nhận vận động hôm nay. Duy trì thói quen này sẽ giúp giữ tiến độ hằng tuần.";
            case "A short walk or light workout can improve today's calorie balance and activity consistency." ->
                    "Một buổi đi bộ ngắn hoặc buổi tập nhẹ có thể cải thiện cân bằng calo và duy trì sự đều đặn.";
            case "Log at least one meal so your nutrition dashboard and macro charts stay accurate." ->
                    "Hãy ghi nhận ít nhất một bữa ăn để bảng dinh dưỡng và biểu đồ macro luôn chính xác.";
            default -> content;
        };
    }

    private int positiveOrDefault(Integer value, int fallback) {
        return value != null && value > 0 ? value : fallback;
    }

    private int percent(BigDecimal value, BigDecimal goal) {
        if (goal == null || goal.signum() <= 0) {
            return 0;
        }
        return value.multiply(BigDecimal.valueOf(100)).divide(goal, 0, RoundingMode.HALF_UP).intValue();
    }

    private int round(BigDecimal value) {
        if (value == null) {
            return 0;
        }
        return value.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    private String oneDecimal(BigDecimal value) {
        if (value == null) {
            return "-";
        }
        return value.setScale(1, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private String valueOrUnknown(BigDecimal value) {
        return value == null ? "-" : String.valueOf(round(value));
    }

    private BigDecimal decimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private Integer nullableInt(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private record RankedInsight(int priority, HealthInsight insight) {}

    private record ProfileTargets(
            Integer calorieGoal,
            Integer proteinGoalG,
            Integer waterGoalMl,
            Integer activityGoalKcal,
            String activityLevel,
            String goal
    ) {}

    private record MealTotals(
            int mealCount,
            BigDecimal calories,
            BigDecimal protein,
            BigDecimal carbs,
            BigDecimal fat,
            BigDecimal fiber,
            BigDecimal sodium
    ) {}

    private record ActivityTotals(int activityCount, int minutes, BigDecimal calories) {}

    private record BodyMetricSummary(
            BigDecimal weightKg,
            BigDecimal bmi,
            BigDecimal bmr,
            BigDecimal tdee,
            BigDecimal bodyFatPercentage,
            LocalDate recordedAt
    ) {}

    private record InsightSnapshot(
            ProfileTargets profile,
            MealTotals meals,
            ActivityTotals activities,
            int waterMl,
            BodyMetricSummary bodyMetric,
            BodyMetricSummary previousBodyMetric,
            int activeDaysThisWeek,
            int mealTypeCount,
            int activityCategoryCount
    ) {
        boolean hasAnyLog() {
            return meals.mealCount() > 0
                    || activities.activityCount() > 0
                    || waterMl > 0
                    || bodyMetric != null;
        }

        boolean hasAnyFoodOrActivityLog() {
            return meals.mealCount() > 0 || activities.activityCount() > 0;
        }
    }
}
