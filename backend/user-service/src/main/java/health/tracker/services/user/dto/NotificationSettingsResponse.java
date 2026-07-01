package health.tracker.services.user.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class NotificationSettingsResponse {

    private boolean mealReminder;
    private List<String> mealReminderTimes;
    private boolean waterReminder;
    private Integer waterReminderIntervalMin;
    private boolean bodyMetricsReminder;
    private Integer weightReminderDay;
    private LocalDateTime updatedAt;
}
