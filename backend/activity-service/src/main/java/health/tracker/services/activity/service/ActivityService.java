package health.tracker.services.activity.service;

import health.tracker.services.activity.dto.ActivityLogRequest;
import health.tracker.services.activity.dto.ActivityLogResponse;
import health.tracker.services.activity.entity.ActivityLog;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.exception.AppException;
import health.tracker.services.activity.repository.ActivityLogRepository;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import health.tracker.services.activity.repository.WorkoutPlanExerciseRepository;
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
    private final WorkoutPlanExerciseRepository workoutPlanExerciseRepository;
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
        health.tracker.services.activity.entity.WorkoutPlanExercise workoutPlanExercise = null;
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
        if (request.getWorkoutPlanExerciseId() != null) {
            workoutPlanExercise = workoutPlanExerciseRepository
                    .findByIdAndPlanUserId(request.getWorkoutPlanExerciseId(), userId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                            "Workout plan exercise not found: " + request.getWorkoutPlanExerciseId()));
            if (activityType != null && !activityType.getId().equals(workoutPlanExercise.getActivityType().getId())) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Activity type does not match workout plan exercise");
            }
            activityType = workoutPlanExercise.getActivityType();
            activityName = activityType.getName();
            category = activityType.getCategory().name();
        }

        // Tính calo đốt: calories = MET × weight_kg × duration_hours
        BigDecimal caloriesBurned = calculateCalories(
                activityType,
                request.getDurationMinutes(),
                request.getUserWeightKg() != null ? request.getUserWeightKg() : DEFAULT_WEIGHT_KG
        );
        ActivityMetrics metrics = resolveMetrics(activityType, request);

        ActivityLog logEntry = ActivityLog.builder()
                .userId(userId)
                .activityType(activityType)
                .workoutPlanExercise(workoutPlanExercise)
                .activityName(activityName)
                .category(category)
                .durationMinutes(request.getDurationMinutes())
                .caloriesBurned(caloriesBurned)
                .notes(request.getNotes())
                .loggedAt(request.getLoggedAt() != null ? request.getLoggedAt() : LocalDateTime.now())
                .distanceKm(metrics.distanceKm())
                .avgHeartRate(metrics.avgHeartRate())
                .maxHeartRate(metrics.maxHeartRate())
                .sets(metrics.sets())
                .repsPerSet(metrics.repsPerSet())
                .weightKg(metrics.weightKg())
                .steps(metrics.steps())
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
        ActivityMetrics metrics = resolveMetrics(type, request);
        activity.setActivityType(type);
        activity.setActivityName(type != null ? type.getName() : request.getActivityName());
        activity.setCategory(type != null ? type.getCategory().name() : "OTHER");
        activity.setDurationMinutes(request.getDurationMinutes());
        activity.setCaloriesBurned(calculateCalories(type, request.getDurationMinutes(),
                request.getUserWeightKg() != null ? request.getUserWeightKg() : DEFAULT_WEIGHT_KG));
        activity.setNotes(request.getNotes());
        activity.setLoggedAt(request.getLoggedAt() != null ? request.getLoggedAt() : activity.getLoggedAt());
        activity.setDistanceKm(metrics.distanceKm());
        activity.setAvgHeartRate(metrics.avgHeartRate());
        activity.setMaxHeartRate(metrics.maxHeartRate());
        activity.setSets(metrics.sets());
        activity.setRepsPerSet(metrics.repsPerSet());
        activity.setWeightKg(metrics.weightKg());
        activity.setSteps(metrics.steps());

        ActivityLog saved = logRepository.save(activity);
        publishActivityEvent("CREATED", saved);
        return toResponse(saved);
    }

    @Transactional
    public ActivityLogResponse setCompleted(Long logId, Long userId, boolean completed) {
        ActivityLog activity = logRepository.findByIdAndUserId(logId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Activity log not found: " + logId));
        activity.setCompleted(completed);
        activity.setCompletedAt(completed ? java.time.LocalDateTime.now() : null);
        return toResponse(logRepository.save(activity));
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
                    "eventId", java.util.UUID.randomUUID().toString(),
                    "eventType", eventType,
                    "userId", activity.getUserId(),
                    "activityId", activity.getId(),
                    "activityDate", activity.getLoggedAt().toLocalDate().toString(),
                    "caloriesBurned", activity.getCaloriesBurned(),
                    "durationMinutes", activity.getDurationMinutes(),
                    "steps", activity.getSteps() == null ? 0 : activity.getSteps(),
                    "distanceKm", activity.getDistanceKm() == null ? BigDecimal.ZERO : activity.getDistanceKm()
            );
            sendAfterCommit(() -> kafkaTemplate.send("activity.logged", String.valueOf(activity.getUserId()), event)
                    .whenComplete((result, error) -> {
                        if (error != null) log.error("Failed to publish activity event for activityId={}", activity.getId(), error);
                    }));
        } catch (Exception e) {
            log.warn("Failed to publish activity.logged event for activityId={}: {}",
                    activity.getId(), e.getMessage());
        }
    }

    private void sendAfterCommit(Runnable action) {
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() { action.run(); }
                    });
        } else action.run();
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
                .setScale(0, RoundingMode.HALF_UP);
    }

    /** Category-aware defaults keep API-created logs as complete as planner-created logs. */
    private ActivityMetrics resolveMetrics(ActivityType type, ActivityLogRequest request) {
        ActivityMetrics requested = new ActivityMetrics(
                request.getDistanceKm(), request.getAvgHeartRate(), request.getMaxHeartRate(),
                request.getSets(), request.getRepsPerSet(), request.getWeightKg(), request.getSteps());
        if (type == null) {
            return requested;
        }

        int duration = request.getDurationMinutes();
        String name = type.getName().toLowerCase();
        return switch (type.getCategory()) {
            case STRENGTH -> new ActivityMetrics(null, null, null,
                    requested.sets() != null ? requested.sets() : 4,
                    requested.repsPerSet() != null ? requested.repsPerSet() : (name.contains("plank") ? 1 : 10),
                    // Planner/API logs need a concrete training load. Keep a
                    // submitted weight; otherwise start bodyweight exercises
                    // at 5 kg and weighted strength movements at 10 kg.
                    requested.weightKg() != null ? requested.weightKg()
                            : BigDecimal.valueOf(name.contains("plank") || name.contains("push-up") || name.contains("pull-up") ? 5 : 10),
                    null);
            case WALKING, DAILY -> {
                BigDecimal distance = requested.distanceKm() != null ? requested.distanceKm()
                        : BigDecimal.valueOf(duration * 5.0 / 60.0).setScale(2, RoundingMode.HALF_UP);
                yield new ActivityMetrics(distance, null, null, null, null, null,
                        requested.steps() != null ? requested.steps() : distance.multiply(BigDecimal.valueOf(1250)).intValue());
            }
            case CARDIO -> {
                double speed = name.contains("cycling") ? 18 : name.contains("swimming") ? 2.5
                        : name.contains("rope") ? 0 : name.contains("running") ? 8 : 6;
                BigDecimal distance = requested.distanceKm() != null ? requested.distanceKm()
                        : speed == 0 ? null : BigDecimal.valueOf(duration * speed / 60.0).setScale(2, RoundingMode.HALF_UP);
                yield new ActivityMetrics(distance,
                        requested.avgHeartRate() != null ? requested.avgHeartRate() : 140,
                        requested.maxHeartRate() != null ? requested.maxHeartRate() : 165,
                        null, null, null, null);
            }
            case SPORTS -> new ActivityMetrics(requested.distanceKm(),
                    requested.avgHeartRate() != null ? requested.avgHeartRate() : 135,
                    requested.maxHeartRate() != null ? requested.maxHeartRate() : 165,
                    null, null, null, null);
            case OUTDOOR -> {
                BigDecimal distance = requested.distanceKm() != null ? requested.distanceKm()
                        : BigDecimal.valueOf(duration * 5.0 / 60.0).setScale(2, RoundingMode.HALF_UP);
                yield new ActivityMetrics(distance,
                        requested.avgHeartRate() != null ? requested.avgHeartRate() : 120,
                        requested.maxHeartRate() != null ? requested.maxHeartRate() : 145,
                        null, null, null,
                        requested.steps() != null ? requested.steps() : distance.multiply(BigDecimal.valueOf(1250)).intValue());
            }
            case FLEXIBILITY -> new ActivityMetrics(null, null, null,
                    requested.sets() != null ? requested.sets() : 3,
                    requested.repsPerSet() != null ? requested.repsPerSet() : 10,
                    null, null);
            case OTHER -> requested;
        };
    }

    private record ActivityMetrics(BigDecimal distanceKm, Integer avgHeartRate, Integer maxHeartRate,
                                   Integer sets, Integer repsPerSet, BigDecimal weightKg, Integer steps) { }

    // ─── Mapper ───────────────────────────────────────────────────────────────

    private ActivityLogResponse toResponse(ActivityLog a) {
        return ActivityLogResponse.builder()
                .id(a.getId()).userId(a.getUserId())
                .activityTypeId(a.getActivityType() != null ? a.getActivityType().getId() : null)
                .workoutPlanExerciseId(a.getWorkoutPlanExercise() != null ? a.getWorkoutPlanExercise().getId() : null)
                .activityName(a.getActivityName())
                .category(a.getActivityType() != null ? a.getActivityType().getCategory() : ActivityType.Category.OTHER)
                .durationMinutes(a.getDurationMinutes()).caloriesBurned(roundCalories(a.getCaloriesBurned()))
                .notes(a.getNotes()).loggedAt(a.getLoggedAt())
                .completed(a.isCompleted()).completedAt(a.getCompletedAt())
                .distanceKm(a.getDistanceKm()).avgHeartRate(a.getAvgHeartRate()).maxHeartRate(a.getMaxHeartRate())
                .sets(a.getSets()).repsPerSet(a.getRepsPerSet()).weightKg(a.getWeightKg())
                .steps(a.getSteps()).createdAt(a.getCreatedAt())
                .build();
    }

    private BigDecimal roundCalories(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(0, RoundingMode.HALF_UP);
    }
}

