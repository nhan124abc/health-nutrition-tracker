package health.tracker.services.user.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class NotificationSettingsRequest {

    private Boolean mealReminder;
    private List<String> mealReminderTimes;
    private Boolean waterReminder;
    private Integer waterReminderIntervalMin;
    private Boolean bodyMetricsReminder;
    private Integer weightReminderDay;
}
