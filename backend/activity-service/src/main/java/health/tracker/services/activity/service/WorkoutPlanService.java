package health.tracker.services.activity.service;

import health.tracker.services.activity.dto.WorkoutPlanExerciseRequest;
import health.tracker.services.activity.dto.WorkoutPlanRequest;
import health.tracker.services.activity.dto.WorkoutPlanResponse;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.entity.WorkoutPlan;
import health.tracker.services.activity.entity.WorkoutPlanExercise;
import health.tracker.services.activity.exception.AppException;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import health.tracker.services.activity.repository.WorkoutPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkoutPlanService {

    private final WorkoutPlanRepository workoutPlanRepository;
    private final ActivityTypeRepository activityTypeRepository;

    @Transactional(readOnly = true)
    public List<WorkoutPlanResponse> list(Long userId) {
        return workoutPlanRepository.findByUserIdOrderByActiveDescUpdatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkoutPlanResponse get(Long userId, Long id) {
        return toResponse(findOwned(userId, id));
    }

    @Transactional
    public WorkoutPlanResponse create(Long userId, WorkoutPlanRequest request) {
        WorkoutPlan plan = WorkoutPlan.builder()
                .userId(userId)
                .name(request.getName().trim())
                .description(request.getDescription())
                .goal(request.getGoal())
                .durationWeeks(request.getDurationWeeks())
                .active(request.getActive() == null || request.getActive())
                .build();
        replaceExercises(plan, request.getExercises());
        return toResponse(workoutPlanRepository.save(plan));
    }

    @Transactional
    public WorkoutPlanResponse update(Long userId, Long id, WorkoutPlanRequest request) {
        WorkoutPlan plan = findOwned(userId, id);
        plan.setName(request.getName().trim());
        plan.setDescription(request.getDescription());
        plan.setGoal(request.getGoal());
        plan.setDurationWeeks(request.getDurationWeeks());
        if (request.getActive() != null) {
            plan.setActive(request.getActive());
        }
        replaceExercises(plan, request.getExercises());
        return toResponse(workoutPlanRepository.save(plan));
    }

    @Transactional
    public WorkoutPlanResponse setActive(Long userId, Long id, boolean active) {
        WorkoutPlan plan = findOwned(userId, id);
        plan.setActive(active);
        return toResponse(workoutPlanRepository.save(plan));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        workoutPlanRepository.delete(findOwned(userId, id));
    }

    private WorkoutPlan findOwned(Long userId, Long id) {
        return workoutPlanRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Workout plan not found: " + id));
    }

    private void replaceExercises(WorkoutPlan plan, List<WorkoutPlanExerciseRequest> requests) {
        plan.getExercises().clear();
        if (requests == null) {
            return;
        }

        for (WorkoutPlanExerciseRequest request : requests) {
            ActivityType activityType = null;
            if (request.getActivityTypeId() != null) {
                activityType = activityTypeRepository.findById(request.getActivityTypeId())
                        .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                                "Activity type not found: " + request.getActivityTypeId()));
                if (activityType.isHidden()) {
                    throw new AppException(HttpStatus.BAD_REQUEST,
                            "Activity type is hidden: " + request.getActivityTypeId());
                }
            }

            plan.getExercises().add(WorkoutPlanExercise.builder()
                    .plan(plan)
                    .dayOfWeek(request.getDayOfWeek())
                    .activityType(activityType)
                    .exerciseName(request.getExerciseName().trim())
                    .sets(request.getSets())
                    .reps(request.getReps())
                    .durationMinutes(request.getDurationMinutes())
                    .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                    .notes(request.getNotes())
                    .build());
        }
    }

    private WorkoutPlanResponse toResponse(WorkoutPlan plan) {
        return WorkoutPlanResponse.builder()
                .id(plan.getId())
                .userId(plan.getUserId())
                .name(plan.getName())
                .description(plan.getDescription())
                .goal(plan.getGoal())
                .durationWeeks(plan.getDurationWeeks())
                .active(plan.isActive())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .exercises(plan.getExercises().stream()
                        .sorted(Comparator
                                .comparing(WorkoutPlanExercise::getDayOfWeek)
                                .thenComparing(WorkoutPlanExercise::getSortOrder))
                        .map(this::toExerciseResponse)
                        .toList())
                .build();
    }

    private WorkoutPlanResponse.Exercise toExerciseResponse(WorkoutPlanExercise exercise) {
        return WorkoutPlanResponse.Exercise.builder()
                .id(exercise.getId())
                .dayOfWeek(exercise.getDayOfWeek())
                .activityTypeId(exercise.getActivityType() != null ? exercise.getActivityType().getId() : null)
                .activityTypeName(exercise.getActivityType() != null ? exercise.getActivityType().getName() : null)
                .exerciseName(exercise.getExerciseName())
                .sets(exercise.getSets())
                .reps(exercise.getReps())
                .durationMinutes(exercise.getDurationMinutes())
                .sortOrder(exercise.getSortOrder())
                .notes(exercise.getNotes())
                .build();
    }
}
