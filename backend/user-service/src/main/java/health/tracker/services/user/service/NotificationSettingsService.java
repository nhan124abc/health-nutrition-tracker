package health.tracker.services.user.service;

import health.tracker.services.user.dto.NotificationSettingsRequest;
import health.tracker.services.user.dto.NotificationSettingsResponse;
import health.tracker.services.user.entity.UserNotificationSetting;
import health.tracker.services.user.repository.UserNotificationSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationSettingsService {

    private static final List<String> DEFAULT_MEAL_REMINDER_TIMES = List.of("08:00", "12:00", "18:00");

    private final UserNotificationSettingRepository repository;

    @Transactional
    public NotificationSettingsResponse getSettings(Long userId) {
        UserNotificationSetting setting = repository.findByUserId(userId)
                .orElseGet(() -> repository.save(defaultSetting(userId)));
        normalizeBodyMetricReminderInterval(setting);
        return toResponse(repository.save(setting));
    }

    @Transactional
    public NotificationSettingsResponse updateSettings(Long userId, NotificationSettingsRequest request) {
        UserNotificationSetting setting = repository.findByUserId(userId)
                .orElseGet(() -> defaultSetting(userId));

        if (request.getMealReminder() != null) {
            setting.setMealReminderEnabled(request.getMealReminder());
        }
        if (request.getMealReminderTimes() != null) {
            setting.setMealReminderTimes(request.getMealReminderTimes());
        }
        if (request.getWaterReminder() != null) {
            setting.setWaterReminderEnabled(request.getWaterReminder());
        }
        if (request.getWaterReminderIntervalMin() != null) {
            setting.setWaterReminderIntervalMin(request.getWaterReminderIntervalMin());
        }
        if (request.getBodyMetricsReminder() != null) {
            setting.setWeightReminderEnabled(request.getBodyMetricsReminder());
        }
        if (request.getWeightReminderDay() != null) {
            setting.setWeightReminderDay(normalizeBodyMetricReminderInterval(request.getWeightReminderDay()));
        }
        normalizeBodyMetricReminderInterval(setting);

        return toResponse(repository.save(setting));
    }

    private UserNotificationSetting defaultSetting(Long userId) {
        return UserNotificationSetting.builder()
                .userId(userId)
                .mealReminderEnabled(false)
                .mealReminderTimes(DEFAULT_MEAL_REMINDER_TIMES)
                .waterReminderEnabled(false)
                .waterReminderIntervalMin(60)
                .weightReminderEnabled(false)
                .weightReminderDay(7)
                .build();
    }

    private void normalizeBodyMetricReminderInterval(UserNotificationSetting setting) {
        setting.setWeightReminderDay(normalizeBodyMetricReminderInterval(setting.getWeightReminderDay()));
    }

    private Integer normalizeBodyMetricReminderInterval(Integer intervalDays) {
        return intervalDays == null || intervalDays < 7 ? 7 : intervalDays;
    }

    private NotificationSettingsResponse toResponse(UserNotificationSetting setting) {
        return NotificationSettingsResponse.builder()
                .mealReminder(setting.isMealReminderEnabled())
                .mealReminderTimes(setting.getMealReminderTimes() == null
                        ? DEFAULT_MEAL_REMINDER_TIMES
                        : setting.getMealReminderTimes())
                .waterReminder(setting.isWaterReminderEnabled())
                .waterReminderIntervalMin(setting.getWaterReminderIntervalMin())
                .bodyMetricsReminder(setting.isWeightReminderEnabled())
                .weightReminderDay(setting.getWeightReminderDay())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }
}
