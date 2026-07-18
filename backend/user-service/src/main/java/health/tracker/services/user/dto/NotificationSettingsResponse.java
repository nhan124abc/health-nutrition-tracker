package health.tracker.services.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsResponse {

    private boolean mealReminder;
    private List<String> mealReminderTimes;
    private boolean waterReminder;
    private Integer waterReminderIntervalMin;
    private boolean bodyMetricsReminder;
    private Integer weightReminderDay;
    private LocalDateTime updatedAt;
}
