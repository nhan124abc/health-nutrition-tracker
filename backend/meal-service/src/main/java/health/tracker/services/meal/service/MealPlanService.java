package health.tracker.services.meal.service;

import health.tracker.services.meal.dto.MealPlanEntryRequest;
import health.tracker.services.meal.dto.MealPlanRequest;
import health.tracker.services.meal.dto.MealPlanResponse;
import health.tracker.services.meal.entity.MealPlan;
import health.tracker.services.meal.entity.MealPlanEntry;
import health.tracker.services.meal.exception.AppException;
import health.tracker.services.meal.repository.MealPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;

    @Transactional(readOnly = true)
    public List<MealPlanResponse> list(Long userId) {
        return mealPlanRepository.findByUserIdOrderByActiveDescUpdatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MealPlanResponse get(Long userId, Long id) {
        return toResponse(findOwned(userId, id));
    }

    @Transactional
    public MealPlanResponse create(Long userId, MealPlanRequest request) {
        validateDates(request);
        MealPlan plan = MealPlan.builder()
                .userId(userId)
                .name(request.getName().trim())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .active(request.getActive() == null || request.getActive())
                .build();
        replaceEntries(plan, request.getEntries());
        return toResponse(mealPlanRepository.save(plan));
    }

    @Transactional
    public MealPlanResponse update(Long userId, Long id, MealPlanRequest request) {
        validateDates(request);
        MealPlan plan = findOwned(userId, id);
        plan.setName(request.getName().trim());
        plan.setDescription(request.getDescription());
        plan.setStartDate(request.getStartDate());
        plan.setEndDate(request.getEndDate());
        if (request.getActive() != null) {
            plan.setActive(request.getActive());
        }
        replaceEntries(plan, request.getEntries());
        return toResponse(mealPlanRepository.save(plan));
    }

    @Transactional
    public MealPlanResponse setActive(Long userId, Long id, boolean active) {
        MealPlan plan = findOwned(userId, id);
        plan.setActive(active);
        return toResponse(mealPlanRepository.save(plan));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        mealPlanRepository.delete(findOwned(userId, id));
    }

    private MealPlan findOwned(Long userId, Long id) {
        return mealPlanRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Meal plan not found: " + id));
    }

    private void validateDates(MealPlanRequest request) {
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "End date must be after or equal to start date");
        }
    }

    private void replaceEntries(MealPlan plan, List<MealPlanEntryRequest> requests) {
        plan.getEntries().clear();
        if (requests == null) {
            return;
        }

        for (MealPlanEntryRequest request : requests) {
            if (request.getPlanDate().isBefore(plan.getStartDate()) || request.getPlanDate().isAfter(plan.getEndDate())) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Entry date must be inside the meal plan date range");
            }
            plan.getEntries().add(MealPlanEntry.builder()
                    .plan(plan)
                    .planDate(request.getPlanDate())
                    .mealType(request.getMealType())
                    .foodItemId(request.getFoodItemId())
                    .recipeId(request.getRecipeId())
                    .foodName(request.getFoodName().trim())
                    .servingSizeG(request.getServingSizeG() == null ? BigDecimal.valueOf(100) : request.getServingSizeG())
                    .quantity(request.getQuantity() == null ? BigDecimal.ONE : request.getQuantity())
                    .calories(request.getCalories() == null ? BigDecimal.ZERO : request.getCalories())
                    .notes(request.getNotes())
                    .build());
        }
    }

    private MealPlanResponse toResponse(MealPlan plan) {
        return MealPlanResponse.builder()
                .id(plan.getId())
                .userId(plan.getUserId())
                .name(plan.getName())
                .description(plan.getDescription())
                .startDate(plan.getStartDate())
                .endDate(plan.getEndDate())
                .active(plan.isActive())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .entries(plan.getEntries().stream()
                        .sorted(Comparator
                                .comparing(MealPlanEntry::getPlanDate)
                                .thenComparing(MealPlanEntry::getMealType))
                        .map(this::toEntryResponse)
                        .toList())
                .build();
    }

    private MealPlanResponse.Entry toEntryResponse(MealPlanEntry entry) {
        return MealPlanResponse.Entry.builder()
                .id(entry.getId())
                .planDate(entry.getPlanDate())
                .mealType(entry.getMealType())
                .foodItemId(entry.getFoodItemId())
                .recipeId(entry.getRecipeId())
                .foodName(entry.getFoodName())
                .servingSizeG(entry.getServingSizeG())
                .quantity(entry.getQuantity())
                .calories(entry.getCalories())
                .notes(entry.getNotes())
                .build();
    }
}
