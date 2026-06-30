package health.tracker.services.analytics.service;

import health.tracker.services.analytics.dto.HealthInsightResponse;
import health.tracker.services.analytics.entity.DailySummary;
import health.tracker.services.analytics.entity.HealthInsight;
import health.tracker.services.analytics.exception.AppException;
import health.tracker.services.analytics.repository.DailySummaryRepository;
import health.tracker.services.analytics.repository.HealthInsightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.i18n.LocaleContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HealthInsightService {

    private static final int LOW_WATER_ML = 1500;

    private final HealthInsightRepository insightRepository;
    private final DailySummaryRepository summaryRepository;

    @Transactional
    public List<HealthInsightResponse> getInsights(Long userId, boolean unreadOnly) {
        createDailyInsightsIfNeeded(userId, LocalDate.now());
        Locale locale = LocaleContextHolder.getLocale();
        List<HealthInsight> insights = unreadOnly
                ? insightRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                : insightRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return insights.stream().map(insight -> toResponse(insight, locale)).toList();
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

    private void createDailyInsightsIfNeeded(Long userId, LocalDate date) {
        if (insightRepository.existsByUserIdAndValidDate(userId, date)) {
            return;
        }

        DailySummary summary = summaryRepository.findByUserIdAndSummaryDate(userId, date)
                .orElse(null);
        List<HealthInsight> generated = buildDailyInsights(userId, date, summary);

        if (!generated.isEmpty()) {
            insightRepository.saveAll(generated);
        }
    }

    private List<HealthInsight> buildDailyInsights(Long userId, LocalDate date, DailySummary summary) {
        List<HealthInsight> insights = new ArrayList<>();

        if (summary == null) {
            insights.add(build(
                    userId,
                    date,
                    HealthInsight.InsightType.NUTRITION_TIP,
                    "Start logging today",
                    "Log your meals, water, and activity to receive more personalized health insights."
            ));
            return insights;
        }

        int waterMl = summary.getWaterIntakeMl() == null ? 0 : summary.getWaterIntakeMl();
        if (waterMl > 0 && waterMl < LOW_WATER_ML) {
            insights.add(build(
                    userId,
                    date,
                    HealthInsight.InsightType.WARNING,
                    "Hydration is low",
                    "Your water intake is below 1.5L today. Add a few small glasses of water before the day ends."
            ));
        }

        Integer calorieGoal = summary.getCalorieGoal();
        BigDecimal consumed = summary.getTotalCaloriesConsumed() == null
                ? BigDecimal.ZERO
                : summary.getTotalCaloriesConsumed();
        if (calorieGoal != null && calorieGoal > 0) {
            int percent = consumed
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(calorieGoal), 0, java.math.RoundingMode.HALF_UP)
                    .intValue();

            if (percent > 100) {
                insights.add(build(
                        userId,
                        date,
                        HealthInsight.InsightType.WARNING,
                        "Calorie goal exceeded",
                        "You are above your calorie target today. Consider lighter meals for the rest of the day."
                ));
            } else if (percent >= 90) {
                insights.add(build(
                        userId,
                        date,
                        HealthInsight.InsightType.GOAL_PROGRESS,
                        "Close to calorie target",
                        "You are close to your calorie target. Keep the remaining food choices balanced."
                ));
            }
        }

        int activityCount = summary.getActivityCount() == null ? 0 : summary.getActivityCount();
        if (activityCount > 0) {
            insights.add(build(
                    userId,
                    date,
                    HealthInsight.InsightType.ACHIEVEMENT,
                    "Activity logged",
                    "You logged physical activity today. Consistent movement helps maintain your weekly progress."
            ));
        } else {
            insights.add(build(
                    userId,
                    date,
                    HealthInsight.InsightType.ACTIVITY_TIP,
                    "Add light movement",
                    "A short walk or light workout can improve today's calorie balance and activity consistency."
            ));
        }

        int mealCount = summary.getMealCount() == null ? 0 : summary.getMealCount();
        if (mealCount == 0) {
            insights.add(build(
                    userId,
                    date,
                    HealthInsight.InsightType.NUTRITION_TIP,
                    "No meals logged yet",
                    "Log at least one meal so your nutrition dashboard and macro charts stay accurate."
            ));
        }

        return insights;
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

    private HealthInsightResponse toResponse(HealthInsight insight, Locale locale) {
        boolean vietnamese = locale != null && "vi".equalsIgnoreCase(locale.getLanguage());
        return HealthInsightResponse.builder()
                .id(insight.getId())
                .userId(insight.getUserId())
                .insightType(insight.getInsightType())
                .title(localizeTitle(insight, vietnamese))
                .content(localizeContent(insight, vietnamese))
                .read(insight.isRead())
                .validDate(insight.getValidDate())
                .createdAt(insight.getCreatedAt())
                .build();
    }

    private String localizeTitle(HealthInsight insight, boolean vietnamese) {
        String title = insight.getTitle();

        return switch (title) {
            case "Start logging today" -> vietnamese ? "Bắt đầu ghi nhận hôm nay" : title;
            case "Hydration is low" -> vietnamese ? "Lượng nước đang thấp" : title;
            case "Calorie goal exceeded" -> vietnamese ? "Đã vượt mục tiêu calo" : title;
            case "Close to calorie target" -> vietnamese ? "Sắp đạt mục tiêu calo" : title;
            case "Activity logged" -> vietnamese ? "Đã ghi nhận vận động" : title;
            case "Add light movement" -> vietnamese ? "Thêm vận động nhẹ" : title;
            case "No meals logged yet" -> vietnamese ? "Chưa ghi nhận bữa ăn nào" : title;
            default -> title;
        };
    }

    private String localizeContent(HealthInsight insight, boolean vietnamese) {
        String content = insight.getContent();

        return switch (content) {
            case "Log your meals, water, and activity to receive more personalized health insights." ->
                    vietnamese
                            ? "Ghi nhận bữa ăn, nước uống và vận động để nhận gợi ý sức khỏe cá nhân hóa hơn."
                            : content;
            case "Your water intake is below 1.5L today. Add a few small glasses of water before the day ends." ->
                    vietnamese
                            ? "Lượng nước hôm nay của bạn đang dưới 1,5 lít. Hãy uống thêm vài cốc nước nhỏ trước khi kết thúc ngày."
                            : content;
            case "You are above your calorie target today. Consider lighter meals for the rest of the day." ->
                    vietnamese
                            ? "Bạn đã vượt mục tiêu calo hôm nay. Hãy ưu tiên các bữa ăn nhẹ hơn trong phần còn lại của ngày."
                            : content;
            case "You are close to your calorie target. Keep the remaining food choices balanced." ->
                    vietnamese
                            ? "Bạn đang gần chạm mục tiêu calo. Hãy giữ các lựa chọn còn lại ở mức cân bằng."
                            : content;
            case "You logged physical activity today. Consistent movement helps maintain your weekly progress." ->
                    vietnamese
                            ? "Bạn đã ghi nhận vận động hôm nay. Duy trì thói quen này sẽ giúp giữ tiến độ hằng tuần."
                            : content;
            case "A short walk or light workout can improve today's calorie balance and activity consistency." ->
                    vietnamese
                            ? "Một quãng đi bộ ngắn hoặc buổi tập nhẹ có thể cải thiện cân bằng calo và duy trì sự đều đặn."
                            : content;
            case "Log at least one meal so your nutrition dashboard and macro charts stay accurate." ->
                    vietnamese
                            ? "Hãy ghi nhận ít nhất một bữa ăn để bảng dinh dưỡng và biểu đồ macro luôn chính xác."
                            : content;
            default -> content;
        };
    }
}
