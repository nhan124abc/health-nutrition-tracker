package health.tracker.services.meal.controller;

import health.tracker.services.meal.dto.MealRequest;
import health.tracker.services.meal.dto.MealResponse;
import health.tracker.services.meal.repository.MealRepository;
import health.tracker.services.meal.service.MealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Meal Logging API
 *
 * <pre>
 * GET    /api/v1/meals?date=          — Bữa ăn trong ngày
 * GET    /api/v1/meals/{id}           — Chi tiết bữa ăn
 * POST   /api/v1/meals                — Tạo bữa ăn mới (kèm danh sách món)
 * DELETE /api/v1/meals/{id}           — Xoá bữa ăn
 * GET    /api/v1/meals/summary?date=  — Tổng calo nạp vào trong ngày
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/meals")
@RequiredArgsConstructor
public class MealController {

    private final MealService    mealService;
    private final MealRepository mealRepository;

    /**
     * GET /api/v1/meals?date=2026-05-13
     * Lấy toàn bộ bữa ăn trong ngày (mặc định hôm nay).
     */
    @GetMapping
    public ResponseEntity<List<MealResponse>> getDailyMeals(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(mealService.getDailyMeals(userId, targetDate));
    }

    /**
     * GET /api/v1/meals/{id}
     * Lấy chi tiết một bữa ăn (chỉ chủ sở hữu mới truy cập được).
     */
    @GetMapping("/{id}")
    public ResponseEntity<MealResponse> getById(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {

        return ResponseEntity.ok(mealService.getById(id, userId));
    }

    /**
     * POST /api/v1/meals
     * Tạo bữa ăn mới cùng danh sách các món ăn.
     * Sau khi lưu, publish event "meal.logged" lên Kafka.
     */
    @PostMapping
    public ResponseEntity<MealResponse> create(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody MealRequest request) {

        log.debug("User {} logging meal: type={}, date={}", userId, request.getMealType(), request.getMealDate());
        MealResponse response = mealService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Cập nhật bữa ăn
    @PutMapping("/{id}")
    public ResponseEntity<MealResponse> update(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody MealRequest request ) {
        log.debug("User {} updating water: id={}, type={}, date={}",
                userId, id,  request.getMealType(), request.getMealDate());
        MealResponse response = mealService.update(id, userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/meals/{id}
     * Xoá bữa ăn. Chỉ chủ sở hữu mới được xoá.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {

        mealService.delete(id, userId);
        return ResponseEntity.ok(Map.of("message", "Meal deleted successfully"));
    }

    /**
     * GET /api/v1/meals/summary?date=2026-05-13
     * Tổng calo nạp vào trong ngày. Dùng để hiển thị quick stats.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getDailySummary(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        BigDecimal totalCalories = mealRepository.sumCaloriesByUserIdAndDate(userId, targetDate);
        List<MealResponse> meals = mealService.getDailyMeals(userId, targetDate);

        return ResponseEntity.ok(Map.of(
                "date",           targetDate.toString(),
                "totalCalories",  totalCalories,
                "mealCount",      meals.size()
        ));
    }
}

