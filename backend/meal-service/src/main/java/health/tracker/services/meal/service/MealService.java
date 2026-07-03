package health.tracker.services.meal.service;

import health.tracker.services.meal.dto.MealRequest;
import health.tracker.services.meal.dto.MealResponse;
import health.tracker.services.meal.entity.Meal;
import health.tracker.services.meal.entity.MealItem;
import health.tracker.services.meal.exception.AppException;
import health.tracker.services.meal.repository.MealRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MealService {

    private static final String TOPIC_MEAL_LOGGED = "meal.logged";

    private final MealRepository               mealRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final EntityManager                 entityManager;

    // ─── Lấy bữa ăn trong ngày ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MealResponse> getDailyMeals(Long userId, LocalDate date) {
        return mealRepository.findByUserIdAndMealDateOrderByMealTypeAsc(userId, date)
                .stream().map(this::toResponse).toList();
    }

    // ─── Lấy chi tiết bữa ăn ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MealResponse getById(Long mealId, Long userId) {
        Meal meal = mealRepository.findByIdAndUserId(mealId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Meal not found: " + mealId));
        return toResponse(meal);
    }

    // ─── Tạo bữa ăn mới ──────────────────────────────────────────────────────

    @Transactional
    public MealResponse create(Long userId, MealRequest request) {
        Meal meal = Meal.builder()
                .userId(userId)
                .mealType(request.getMealType())
                .mealDate(request.getMealDate())
                .mealTime(request.getMealTime())
                .notes(request.getNotes())
                .build();

        // Thêm từng item và tính tổng dinh dưỡng
        for (MealRequest.MealItemRequest itemReq : request.getItems()) {
            MealItem item = buildItem(itemReq, meal);
            meal.getItems().add(item);
        }

        recalculateTotals(meal);
        Meal saved = mealRepository.save(meal);

        // Publish event lên Kafka để analytics-service cập nhật daily summary
        publishMealLoggedEvent(saved);

        log.info("Meal created: userId={}, type={}, date={}, calories={}",
                userId, saved.getMealType(), saved.getMealDate(), saved.getTotalCalories());
        return toResponse(saved);
    }

    @Transactional
    public MealResponse setCompleted(Long mealId, Long userId, boolean completed) {
        Meal meal = mealRepository.findByIdAndUserId(mealId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Meal not found: " + mealId));
        meal.setCompleted(completed);
        meal.setCompletedAt(completed ? java.time.LocalDateTime.now() : null);
        return toResponse(mealRepository.save(meal));
    }

    // Cập nhật bữa ăn

    @Transactional
    public MealResponse update(Long mealId, Long userId, MealRequest request) {
        Meal meal = mealRepository.findByIdAndUserId(mealId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Meal not found: " + mealId));
        publishMealEvent("DELETED", meal);
        meal.setMealType(request.getMealType());
        meal.setMealDate(request.getMealDate());
        meal.setMealTime(request.getMealTime());
        meal.setNotes(request.getNotes());

        meal.getItems().clear();
        for (MealRequest.MealItemRequest itemReq : request.getItems()) {
            MealItem item = buildItem(itemReq, meal);
            meal.getItems().add(item);
        }
        recalculateTotals(meal);
        Meal saved = mealRepository.saveAndFlush(meal);
        entityManager.refresh(saved);
        publishMealEvent("CREATED", saved);

        return toResponse(saved);
    }
    // ─── Xoá bữa ăn ──────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long mealId, Long userId) {
        Meal meal = mealRepository.findByIdAndUserId(mealId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Meal not found: " + mealId));
        publishMealEvent("DELETED", meal);
        mealRepository.delete(meal);
        log.info("Meal deleted: id={}, userId={}", mealId, userId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private MealItem buildItem(MealRequest.MealItemRequest req, Meal meal) {
        return MealItem.builder()
                .meal(meal)
                .foodItemId(req.getFoodItemId())
                .recipeId(req.getRecipeId())
                .itemType(req.getItemType())
                .foodName(req.getFoodName())
                .servingSizeG(req.getServingSizeG())
                .quantity(req.getQuantity())
                .calories(req.getCalories())
                .proteinG(req.getProteinG())
                .carbsG(req.getCarbsG())
                .fatG(req.getFatG())
                .fiberG(req.getFiberG() != null ? req.getFiberG() : BigDecimal.ZERO)
                .sodiumMg(req.getSodiumMg() != null ? req.getSodiumMg() : BigDecimal.ZERO)
                .build();
    }

    private void recalculateTotals(Meal meal) {
        BigDecimal cal = BigDecimal.ZERO, pro = BigDecimal.ZERO,
                   carb = BigDecimal.ZERO, fat = BigDecimal.ZERO, fib = BigDecimal.ZERO;
        for (MealItem item : meal.getItems()) {
            cal  = cal.add(item.getCalories());
            pro  = pro.add(item.getProteinG());
            carb = carb.add(item.getCarbsG());
            fat  = fat.add(item.getFatG());
            fib  = fib.add(item.getFiberG());
        }
        meal.setTotalCalories(cal);
        meal.setTotalProteinG(pro);
        meal.setTotalCarbsG(carb);
        meal.setTotalFatG(fat);
        meal.setTotalFiberG(fib);
    }

    private void publishMealLoggedEvent(Meal meal) {
        publishMealEvent("CREATED", meal);
    }

    private void publishMealEvent(String eventType, Meal meal) {
        try {
            Map<String, Object> event = Map.ofEntries(
                    Map.entry("eventId", java.util.UUID.randomUUID().toString()),
                    Map.entry("eventType", eventType),
                    Map.entry("userId", meal.getUserId()),
                    Map.entry("mealId", meal.getId()),
                    Map.entry("mealDate", meal.getMealDate().toString()),
                    Map.entry("calories", meal.getTotalCalories()),
                    Map.entry("proteinG", meal.getTotalProteinG()),
                    Map.entry("carbsG", meal.getTotalCarbsG()),
                    Map.entry("fatG", meal.getTotalFatG()),
                    Map.entry("fiberG", meal.getTotalFiberG()),
                    Map.entry("sodiumMg", meal.getItems().stream()
                            .map(MealItem::getSodiumMg)
                            .filter(java.util.Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)),
                    Map.entry("items", meal.getItems().stream().map(item -> {
                        Map<String, Object> trendItem = new java.util.HashMap<>();
                        if (item.getFoodItemId() != null) trendItem.put("foodItemId", item.getFoodItemId());
                        trendItem.put("foodName", item.getFoodName());
                        trendItem.put("calories", item.getCalories());
                        return trendItem;
                    }).toList())
            );
            sendAfterCommit(() -> kafkaTemplate.send(TOPIC_MEAL_LOGGED, String.valueOf(meal.getUserId()), event)
                    .whenComplete((result, error) -> {
                        if (error != null) log.error("Failed to publish meal event for mealId={}", meal.getId(), error);
                    }));
        } catch (Exception e) {
            // Không để Kafka lỗi ảnh hưởng đến response chính
            log.warn("Failed to publish meal.logged event for mealId={}: {}", meal.getId(), e.getMessage());
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

    // ─── Mapper ───────────────────────────────────────────────────────────────

    private MealResponse toResponse(Meal m) {
        List<MealResponse.MealItemResponse> itemResponses = m.getItems().stream()
                .map(i -> MealResponse.MealItemResponse.builder()
                        .id(i.getId()).foodItemId(i.getFoodItemId()).recipeId(i.getRecipeId())
                        .itemType(i.getItemType()).foodName(i.getFoodName())
                        .servingSizeG(i.getServingSizeG()).quantity(i.getQuantity())
                        .totalWeightG(i.getTotalWeightG())
                        .calories(i.getCalories()).proteinG(i.getProteinG())
                        .carbsG(i.getCarbsG()).fatG(i.getFatG())
                        .fiberG(i.getFiberG()).sodiumMg(i.getSodiumMg())
                        .build())
                .toList();

        return MealResponse.builder()
                .id(m.getId()).userId(m.getUserId())
                .mealType(m.getMealType()).mealDate(m.getMealDate()).mealTime(m.getMealTime())
                .notes(m.getNotes()).completed(m.isCompleted()).completedAt(m.getCompletedAt())
                .totalCalories(m.getTotalCalories()).totalProteinG(m.getTotalProteinG())
                .totalCarbsG(m.getTotalCarbsG()).totalFatG(m.getTotalFatG()).totalFiberG(m.getTotalFiberG())
                .items(itemResponses)
                .createdAt(m.getCreatedAt()).updatedAt(m.getUpdatedAt())
                .build();
    }
}

