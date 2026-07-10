package health.tracker.services.nutrition.controller;

import health.tracker.services.nutrition.dto.FoodItemRequest;
import health.tracker.services.nutrition.dto.FoodItemResponse;
import health.tracker.services.nutrition.dto.FoodCategoryRequest;
import health.tracker.services.nutrition.entity.FoodCategory;
import health.tracker.services.nutrition.exception.AppException;
import health.tracker.services.nutrition.service.FoodCategoryService;
import health.tracker.services.nutrition.service.FoodItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Food Item API
 *
 * <pre>
 * GET  /api/v1/nutrition/foods                 — Tìm kiếm thực phẩm (có filter, pagination)
 * GET  /api/v1/nutrition/foods/{id}            — Chi tiết thực phẩm
 * GET  /api/v1/nutrition/foods/barcode/{code}  — Tra cứu theo mã vạch
 * POST /api/v1/nutrition/foods                 — Thêm thực phẩm mới (pending review)
 * GET  /api/v1/nutrition/categories            — Danh sách danh mục
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/nutrition")
@RequiredArgsConstructor
public class FoodItemController {

    private final FoodItemService        foodItemService;
    private final FoodCategoryService    foodCategoryService;

    /**
     * GET /api/v1/nutrition/foods?q=cơm&categoryId=1&page=0&size=20
     * Tìm kiếm thực phẩm theo từ khoá và/hoặc danh mục.
     */
    @GetMapping("/foods")
    public ResponseEntity<Page<FoodItemResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(defaultValue = "false") boolean recipeFirst,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<FoodItemResponse> result = foodItemService.search(
                q, categoryId, recipeFirst,
                PageRequest.of(page, size, Sort.by("verified").descending().and(Sort.by("name").ascending()))
        );
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/nutrition/foods/{id}
     * Lấy thông tin chi tiết một thực phẩm.
     */
    @GetMapping("/foods/{id}")
    public ResponseEntity<FoodItemResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(foodItemService.getById(id));
    }

    /**
     * GET /api/v1/nutrition/foods/barcode/{code}
     * Tra cứu thực phẩm bằng mã vạch (hữu ích khi quét QR/barcode).
     */
    @GetMapping("/foods/barcode/{code}")
    public ResponseEntity<FoodItemResponse> getByBarcode(@PathVariable String code) {
        return ResponseEntity.ok(foodItemService.getByBarcode(code));
    }

    /**
     * POST /api/v1/nutrition/foods
     * Người dùng thêm thực phẩm mới vào hệ thống.
     * Thực phẩm sẽ ở trạng thái "pending" (verified=false) cho đến khi admin duyệt.
     */
    @PostMapping("/foods")
    public ResponseEntity<FoodItemResponse> create(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody FoodItemRequest request) {

        log.debug("Create food item by userId={}: {}", userId, request.getName());
        FoodItemResponse response = foodItemService.create(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/foods/{id}")
    public ResponseEntity<FoodItemResponse> update(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable Long id,
            @Valid @RequestBody FoodItemRequest request) {

        return ResponseEntity.ok(foodItemService.update(id, request, userId, role));
    }

    @DeleteMapping("/foods/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable Long id) {

        foodItemService.delete(id, userId, role);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/foods/{id}/hide")
    public ResponseEntity<FoodItemResponse> hideFood(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {

        requireAdmin(role);
        return ResponseEntity.ok(foodItemService.hide(id));
    }

    @PatchMapping("/foods/{id}/restore")
    public ResponseEntity<FoodItemResponse> restoreFood(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Long id) {

        requireAdmin(role);
        return ResponseEntity.ok(foodItemService.restore(id));
    }

    /**
     * GET /api/v1/nutrition/categories
     * Lấy danh sách tất cả danh mục thực phẩm.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<FoodCategory>> getCategories() {
        return ResponseEntity.ok(foodCategoryService.getVisibleCategories());
    }

    @GetMapping("/admin/categories")
    public ResponseEntity<List<FoodCategory>> adminCategories(
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) Boolean hidden) {

        requireAdmin(role);
        return ResponseEntity.ok(foodCategoryService.getAdminCategories(hidden));
    }

    @GetMapping("/admin/categories/{id}")
    public ResponseEntity<FoodCategory> adminCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        return ResponseEntity.ok(foodCategoryService.getById(id));
    }

    @PostMapping("/admin/categories")
    public ResponseEntity<FoodCategory> createCategory(
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody FoodCategoryRequest request) {

        requireAdmin(role);
        return ResponseEntity.status(HttpStatus.CREATED).body(foodCategoryService.create(request));
    }

    @PutMapping("/admin/categories/{id}")
    public ResponseEntity<FoodCategory> updateCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id,
            @Valid @RequestBody FoodCategoryRequest request) {

        requireAdmin(role);
        return ResponseEntity.ok(foodCategoryService.update(id, request));
    }

    @DeleteMapping("/admin/categories/{id}")
    public ResponseEntity<Void> deleteCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        foodCategoryService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/categories/{id}/hide")
    public ResponseEntity<FoodCategory> hideCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        return ResponseEntity.ok(foodCategoryService.hide(id));
    }

    @PatchMapping("/admin/categories/{id}/restore")
    public ResponseEntity<FoodCategory> restoreCategory(
            @RequestHeader("X-User-Role") String role,
            @PathVariable Integer id) {

        requireAdmin(role);
        return ResponseEntity.ok(foodCategoryService.restore(id));
    }

    private void requireAdmin(String role) {
        String normalizedRole = role == null ? "" : role.replaceFirst("(?i)^ROLE_", "");
        if (!"ADMIN".equalsIgnoreCase(normalizedRole)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Admin role is required");
        }
    }
}

