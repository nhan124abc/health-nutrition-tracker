package health.tracker.services.nutrition.controller;

import health.tracker.services.nutrition.dto.FoodItemRequest;
import health.tracker.services.nutrition.dto.FoodItemResponse;
import health.tracker.services.nutrition.entity.FoodCategory;
import health.tracker.services.nutrition.repository.FoodCategoryRepository;
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
    private final FoodCategoryRepository categoryRepository;

    /**
     * GET /api/v1/nutrition/foods?q=cơm&categoryId=1&page=0&size=20
     * Tìm kiếm thực phẩm theo từ khoá và/hoặc danh mục.
     */
    @GetMapping("/foods")
    public ResponseEntity<Page<FoodItemResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<FoodItemResponse> result = foodItemService.search(
                q, categoryId,
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

    /**
     * GET /api/v1/nutrition/categories
     * Lấy danh sách tất cả danh mục thực phẩm.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<FoodCategory>> getCategories() {
        return ResponseEntity.ok(categoryRepository.findAllByOrderByNameAsc());
    }
}

