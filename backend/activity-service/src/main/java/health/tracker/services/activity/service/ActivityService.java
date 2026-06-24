package health.tracker.services.activity.service;

import health.tracker.services.activity.dto.ActivityLogRequest;
import health.tracker.services.activity.dto.ActivityLogResponse;
import health.tracker.services.activity.entity.ActivityLog;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.exception.AppException;
import health.tracker.services.activity.repository.ActivityLogRepository;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final BigDecimal DEFAULT_WEIGHT_KG = BigDecimal.valueOf(70);

    private final ActivityLogRepository  logRepository;
    private final ActivityTypeRepository typeRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // ─── Lấy hoạt động trong ngày ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ActivityLogResponse> getDailyLogs(Long userId, LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to   = date.atTime(LocalTime.MAX);
        return logRepository.findByUserIdAndLoggedAtBetweenOrderByLoggedAtDesc(userId, from, to)
                .stream().map(this::toResponse).toList();
    }

    // ─── Log hoạt động mới ────────────────────────────────────────────────────

    @Transactional
    public ActivityLogResponse log(Long userId, ActivityLogRequest request) {
        ActivityType activityType = null;
        String activityName = request.getActivityName();
        String category     = "OTHER";

        if (request.getActivityTypeId() != null) {
            activityType = typeRepository.findById(request.getActivityTypeId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                            "Activity type not found: " + request.getActivityTypeId()));
            if (activityType.isHidden()) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Activity type is hidden: " + request.getActivityTypeId());
            }
            activityName = activityType.getName();
            category     = activityType.getCategory().name();
        }

        // Tính calo đốt: calories = MET × weight_kg × duration_hours
        BigDecimal caloriesBurned = calculateCalories(
                activityType,
                request.getDurationMinutes(),
                request.getUserWeightKg() != null ? request.getUserWeightKg() : DEFAULT_WEIGHT_KG
        );

        ActivityLog logEntry = ActivityLog.builder()
                .userId(userId)
                .activityType(activityType)
                .activityName(activityName)
                .category(category)
                .durationMinutes(request.getDurationMinutes())
                .caloriesBurned(caloriesBurned)
                .notes(request.getNotes())
                .loggedAt(request.getLoggedAt() != null ? request.getLoggedAt() : LocalDateTime.now())
                .distanceKm(request.getDistanceKm())
                .avgHeartRate(request.getAvgHeartRate())
                .maxHeartRate(request.getMaxHeartRate())
                .sets(request.getSets())
                .repsPerSet(request.getRepsPerSet())
                .weightKg(request.getWeightKg())
                .steps(request.getSteps())
                .build();

        ActivityLog saved = logRepository.save(logEntry);
        publishActivityEvent("CREATED", saved);
        log.info("Activity logged: userId={}, activity='{}', duration={}min, calories={}",
                userId, activityName, request.getDurationMinutes(), caloriesBurned);
        return toResponse(saved);
    }

    @Transactional
    public ActivityLogResponse update(Long logId, Long userId, ActivityLogRequest request) {
        ActivityLog activity = logRepository.findById(logId)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Activity log not found: " + logId));
        publishActivityEvent("DELETED", activity);

        ActivityType type = request.getActivityTypeId() == null ? null
                : typeRepository.findById(request.getActivityTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Activity type not found: " + request.getActivityTypeId()));
        if (type != null && type.isHidden()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Activity type is hidden: " + request.getActivityTypeId());
        }
        activity.setActivityType(type);
        activity.setActivityName(type != null ? type.getName() : request.getActivityName());
        activity.setCategory(type != null ? type.getCategory().name() : "OTHER");
        activity.setDurationMinutes(request.getDurationMinutes());
        activity.setCaloriesBurned(calculateCalories(type, request.getDurationMinutes(),
                request.getUserWeightKg() != null ? request.getUserWeightKg() : DEFAULT_WEIGHT_KG));
        activity.setNotes(request.getNotes());
        activity.setLoggedAt(request.getLoggedAt() != null ? request.getLoggedAt() : activity.getLoggedAt());
        activity.setDistanceKm(request.getDistanceKm());
        activity.setAvgHeartRate(request.getAvgHeartRate());
        activity.setMaxHeartRate(request.getMaxHeartRate());
        activity.setSets(request.getSets());
        activity.setRepsPerSet(request.getRepsPerSet());
        activity.setWeightKg(request.getWeightKg());
        activity.setSteps(request.getSteps());

        ActivityLog saved = logRepository.save(activity);
        publishActivityEvent("CREATED", saved);
        return toResponse(saved);
    }

    // ─── Xoá log ──────────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long logId, Long userId) {
        ActivityLog activity = logRepository.findById(logId)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Activity log not found: " + logId));
        publishActivityEvent("DELETED", activity);
        logRepository.delete(activity);
    }

    private void publishActivityEvent(String eventType, ActivityLog activity) {
        try {
            Map<String, Object> event = Map.of(
                    "eventType", eventType,
                    "userId", activity.getUserId(),
                    "activityId", activity.getId(),
                    "activityDate", activity.getLoggedAt().toLocalDate().toString(),
                    "caloriesBurned", activity.getCaloriesBurned(),
                    "durationMinutes", activity.getDurationMinutes(),
                    "steps", activity.getSteps() == null ? 0 : activity.getSteps(),
                    "distanceKm", activity.getDistanceKm() == null ? BigDecimal.ZERO : activity.getDistanceKm()
            );
            kafkaTemplate.send("activity.logged", String.valueOf(activity.getUserId()), event);
        } catch (Exception e) {
            log.warn("Failed to publish activity.logged event for activityId={}: {}",
                    activity.getId(), e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Tính calo đốt bằng công thức MET:
     * Calories = MET × weight_kg × (duration_minutes / 60)
     */
    private BigDecimal calculateCalories(ActivityType type, int durationMinutes, BigDecimal weightKg) {
        BigDecimal met = (type != null) ? type.getMetValue() : BigDecimal.valueOf(4.0);
        BigDecimal durationHours = BigDecimal.valueOf(durationMinutes)
                .divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
        return met.multiply(weightKg).multiply(durationHours)
                .setScale(1, RoundingMode.HALF_UP);
    }

    // ─── Mapper ───────────────────────────────────────────────────────────────

    private ActivityLogResponse toResponse(ActivityLog a) {
        return ActivityLogResponse.builder()
                .id(a.getId()).userId(a.getUserId())
                .activityTypeId(a.getActivityType() != null ? a.getActivityType().getId() : null)
                .activityName(a.getActivityName())
                .category(a.getActivityType() != null ? a.getActivityType().getCategory() : ActivityType.Category.OTHER)
                .durationMinutes(a.getDurationMinutes()).caloriesBurned(a.getCaloriesBurned())
                .notes(a.getNotes()).loggedAt(a.getLoggedAt())
                .distanceKm(a.getDistanceKm()).avgHeartRate(a.getAvgHeartRate()).maxHeartRate(a.getMaxHeartRate())
                .sets(a.getSets()).repsPerSet(a.getRepsPerSet()).weightKg(a.getWeightKg())
                .steps(a.getSteps()).createdAt(a.getCreatedAt())
                .build();
    }
}

