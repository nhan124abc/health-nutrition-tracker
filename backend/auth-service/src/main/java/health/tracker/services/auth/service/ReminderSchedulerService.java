package health.tracker.services.auth.service;

import health.tracker.services.auth.entity.User;
import health.tracker.services.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderSchedulerService {

    private static final List<ReminderSlot> SLOTS = List.of(
            new ReminderSlot("breakfast", ReminderKind.MEAL, "BREAKFAST", "Bữa sáng", LocalTime.of(8, 0)),
            new ReminderSlot("lunch", ReminderKind.MEAL, "LUNCH", "Bữa trưa", LocalTime.of(12, 0)),
            new ReminderSlot("dinner", ReminderKind.MEAL, "DINNER", "Bữa tối", LocalTime.of(18, 0)),
            new ReminderSlot("activity-morning", ReminderKind.ACTIVITY, null, "Vận động buổi sáng", LocalTime.of(9, 0)),
            new ReminderSlot("activity-afternoon", ReminderKind.ACTIVITY, null, "Vận động buổi chiều", LocalTime.of(15, 0))
    );

    private final UserRepository userRepository;
    private final MailService mailService;
    private final ReminderDataClient reminderDataClient;
    private final StringRedisTemplate stringRedisTemplate;

    private final Set<String> fallbackSentKeys = ConcurrentHashMap.newKeySet();

    @Value("${app.reminders.scheduler.enabled:true}")
    private boolean enabled;

    @Value("${app.reminders.time-zone:Asia/Ho_Chi_Minh}")
    private String timeZone;

    @Scheduled(fixedDelayString = "${app.reminders.scheduler.fixed-delay-ms:60000}", initialDelayString = "${app.reminders.scheduler.initial-delay-ms:30000}")
    public void sendDueReminders() {
        if (!enabled) {
            return;
        }

        ZoneId zoneId = ZoneId.of(timeZone);
        LocalDate today = LocalDate.now(zoneId);
        LocalTime now = LocalTime.now(zoneId);
        List<ReminderSlot> dueSlots = SLOTS.stream()
                .filter(slot -> !now.isBefore(slot.time()))
                .toList();

        if (dueSlots.isEmpty()) {
            return;
        }

        List<User> users = userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> user.getEmail() != null && !user.getEmail().isBlank())
                .toList();

        for (User user : users) {
            try {
                processUser(user, today, dueSlots);
            } catch (RuntimeException ex) {
                log.warn("Could not process reminder schedule for userId={}: {}", user.getId(), ex.getMessage());
            }
        }
    }

    private void processUser(User user, LocalDate today, List<ReminderSlot> dueSlots) {
        ReminderDataClient.UserProfile profile = reminderDataClient.getProfile(user.getId());
        if (!hasActiveGoal(profile)) {
            return;
        }

        List<ReminderDataClient.MealLog> meals = null;
        List<ReminderDataClient.ActivityLog> activities = null;

        for (ReminderSlot slot : dueSlots) {
            if (slot.kind() == ReminderKind.MEAL) {
                if (meals == null) {
                    meals = reminderDataClient.getMeals(user.getId(), today);
                }
                // A reminder is meaningful only after the user has selected a meal to complete.
                if (!hasMeal(meals, slot.mealType())) {
                    continue;
                }
            } else {
                if (activities == null) {
                    activities = reminderDataClient.getActivities(user.getId(), today);
                }
                // Do not ask users to tick an activity that does not exist in their daily log.
                if (activities.isEmpty()) {
                    continue;
                }
            }

            String key = "reminders:backend:" + today + ":" + user.getId() + ":" + slot.id();
            if (markSent(key)) {
                mailService.sendReminder(
                        user.getEmail(),
                        "Nhắc nhở " + slot.label() + " lúc " + slot.time(),
                        buildMessage(slot)
                );
            }
        }
    }

    private boolean hasActiveGoal(ReminderDataClient.UserProfile profile) {
        return profile != null
                && (hasText(profile.healthGoal())
                || positive(profile.dailyCalorieGoal())
                || positive(profile.dailyActivityGoalKcal()));
    }

    private boolean hasMeal(List<ReminderDataClient.MealLog> meals, String mealType) {
        return meals.stream()
                .map(ReminderDataClient.MealLog::mealType)
                .filter(this::hasText)
                .anyMatch(value -> value.equalsIgnoreCase(mealType));
    }

    private boolean markSent(String key) {
        try {
            Boolean stored = stringRedisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofDays(2));
            return Boolean.TRUE.equals(stored);
        } catch (RedisConnectionFailureException ex) {
            log.warn("Redis unavailable while marking reminder key {}. Falling back to in-memory dedupe.", key);
            return fallbackSentKeys.add(key);
        }
    }

    private String buildMessage(ReminderSlot slot) {
        if (slot.kind() == ReminderKind.MEAL) {
            return "Bạn đã đặt mục tiêu sức khỏe nhưng chưa ghi nhận " + slot.label().toLowerCase()
                    + ". Hãy mở Health Nutrition để cập nhật bữa ăn hôm nay.";
        }

        return "Bạn đã đặt mục tiêu sức khỏe nhưng chưa ghi nhận hoạt động vận động trong ngày. "
                + "Hãy mở Health Nutrition để cập nhật kế hoạch vận động hôm nay.";
    }

    private boolean positive(Integer value) {
        return value != null && value > 0;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private enum ReminderKind {
        MEAL,
        ACTIVITY
    }

    private record ReminderSlot(String id, ReminderKind kind, String mealType, String label, LocalTime time) {
    }
}
