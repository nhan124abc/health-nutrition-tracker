package health.tracker.services.nutrition.service;

import health.tracker.services.nutrition.dto.FoodItemRequest;
import health.tracker.services.nutrition.dto.FoodItemResponse;
import health.tracker.services.nutrition.entity.FoodCategory;
import health.tracker.services.nutrition.entity.FoodItem;
import health.tracker.services.nutrition.exception.AppException;
import health.tracker.services.nutrition.repository.FoodCategoryRepository;
import health.tracker.services.nutrition.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoodItemService {

    private final FoodItemRepository    foodItemRepository;
    private final FoodCategoryRepository categoryRepository;

    // ─── Search ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<FoodItemResponse> search(
            String keyword, Integer categoryId, boolean recipeFirst, Pageable pageable) {
        return foodItemRepository.search(keyword, categoryId, recipeFirst, pageable)
                .map(this::toResponse);
    }

    // ─── Get By ID ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FoodItemResponse getById(Long id) {
        FoodItem food = foodItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found: " + id));
        return toResponse(food);
    }

    // ─── Get By Barcode ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FoodItemResponse getByBarcode(String barcode) {
        FoodItem food = foodItemRepository.findByBarcode(barcode)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found for barcode: " + barcode));
        return toResponse(food);
    }

    // ─── Create (người dùng thêm thực phẩm mới) ──────────────────────────────

    @Transactional
    public FoodItemResponse create(FoodItemRequest request, Long createdByUserId) {
        // Kiểm tra barcode trùng lặp
        if (request.getBarcode() != null &&
                foodItemRepository.findByBarcode(request.getBarcode()).isPresent()) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Barcode '" + request.getBarcode() + "' already exists");
        }

        FoodCategory category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                            "Category not found: " + request.getCategoryId()));
            if (category.isHidden()) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Category is hidden: " + request.getCategoryId());
            }
        }

        FoodItem food = FoodItem.builder()
                .name(request.getName())
                .nameVi(request.getNameVi())
                .brand(request.getBrand())
                .barcode(request.getBarcode())
                .category(category)
                .servingSizeG(request.getServingSizeG())
                .servingDescription(request.getServingDescription())
                .calories(request.getCalories())
                .proteinG(request.getProteinG())
                .carbsG(request.getCarbsG())
                .fatG(request.getFatG())
                .fiberG(request.getFiberG() != null ? request.getFiberG() : java.math.BigDecimal.ZERO)
                .sugarG(request.getSugarG() != null ? request.getSugarG() : java.math.BigDecimal.ZERO)
                .sodiumMg(request.getSodiumMg() != null ? request.getSodiumMg() : java.math.BigDecimal.ZERO)
                .imageUrl(request.getImageUrl())
                .createdByUserId(createdByUserId)
                .verified(false)   // Admin cần xác nhận
                .isPublic(true)
                .build();

        FoodItem saved = foodItemRepository.save(food);
        log.info("New food item created by userId={}: '{}'", createdByUserId, saved.getName());
        return toResponse(saved);
    }

    // ─── Mapper ───────────────────────────────────────────────────────────────

    @Transactional
    public FoodItemResponse update(Long id, FoodItemRequest request) {
        FoodItem food = foodItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found: " + id));
        return updateFood(food, request);
    }

    @Transactional
    public FoodItemResponse update(Long id, FoodItemRequest request, Long userId, String role) {
        FoodItem food = foodItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found: " + id));

        boolean admin = isAdmin(role);
        boolean owner = userId != null && userId.equals(food.getCreatedByUserId());
        if (!admin && !owner) {
            throw new AppException(HttpStatus.FORBIDDEN, "Only the creator can update this food item");
        }

        return updateFood(food, request);
    }

    private FoodItemResponse updateFood(FoodItem food, FoodItemRequest request) {
        Long id = food.getId();
        if (request.getBarcode() != null &&
                foodItemRepository.findByBarcode(request.getBarcode())
                        .filter(existing -> !existing.getId().equals(id))
                        .isPresent()) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Barcode '" + request.getBarcode() + "' already exists");
        }

        FoodCategory category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                            "Category not found: " + request.getCategoryId()));
            if (category.isHidden()) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Category is hidden: " + request.getCategoryId());
            }
        }

        food.setName(request.getName());
        food.setNameVi(request.getNameVi());
        food.setBrand(request.getBrand());
        food.setBarcode(request.getBarcode());
        food.setCategory(category);
        food.setServingSizeG(request.getServingSizeG());
        food.setServingDescription(request.getServingDescription());
        food.setCalories(request.getCalories());
        food.setProteinG(request.getProteinG());
        food.setCarbsG(request.getCarbsG());
        food.setFatG(request.getFatG());
        food.setFiberG(request.getFiberG() != null ? request.getFiberG() : java.math.BigDecimal.ZERO);
        food.setSugarG(request.getSugarG() != null ? request.getSugarG() : java.math.BigDecimal.ZERO);
        food.setSodiumMg(request.getSodiumMg() != null ? request.getSodiumMg() : java.math.BigDecimal.ZERO);
        food.setImageUrl(request.getImageUrl());

        return toResponse(foodItemRepository.save(food));
    }

    @Transactional
    public void delete(Long id) {
        FoodItem food = foodItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found: " + id));
        food.setPublic(false);
        foodItemRepository.save(food);
    }

    @Transactional
    public void delete(Long id, Long userId, String role) {
        FoodItem food = foodItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found: " + id));

        boolean admin = isAdmin(role);
        boolean owner = userId != null && userId.equals(food.getCreatedByUserId());
        if (!admin && !owner) {
            throw new AppException(HttpStatus.FORBIDDEN, "Only the creator can delete this food item");
        }

        food.setPublic(false);
        foodItemRepository.save(food);
    }

    @Transactional
    public FoodItemResponse hide(Long id) {
        FoodItem food = foodItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found: " + id));
        food.setPublic(false);
        return toResponse(foodItemRepository.save(food));
    }

    @Transactional
    public FoodItemResponse restore(Long id) {
        FoodItem food = foodItemRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food item not found: " + id));
        food.setPublic(true);
        return toResponse(foodItemRepository.save(food));
    }

    private FoodItemResponse toResponse(FoodItem f) {
        FoodItemResponse.CategoryInfo catInfo = null;
        if (f.getCategory() != null) {
            FoodCategory c = f.getCategory();
            catInfo = FoodItemResponse.CategoryInfo.builder()
                    .id(c.getId()).name(c.getName())
                    .nameVi(c.getNameVi()).icon(c.getIcon())
                    .build();
        }
        return FoodItemResponse.builder()
                .id(f.getId()).name(f.getName()).nameVi(f.getNameVi())
                .brand(f.getBrand()).barcode(f.getBarcode()).category(catInfo)
                .servingSizeG(f.getServingSizeG()).servingDescription(f.getServingDescription())
                .calories(f.getCalories()).proteinG(f.getProteinG())
                .carbsG(f.getCarbsG()).fatG(f.getFatG())
                .fiberG(f.getFiberG()).sugarG(f.getSugarG())
                .sodiumMg(f.getSodiumMg()).cholesterolMg(f.getCholesterolMg())
                .saturatedFatG(f.getSaturatedFatG()).potassiumMg(f.getPotassiumMg())
                .vitaminCMg(f.getVitaminCMg()).calciumMg(f.getCalciumMg()).ironMg(f.getIronMg())
                .imageUrl(f.getImageUrl()).verified(f.isVerified())
                .isPublic(f.isPublic())
                .createdByUserId(f.getCreatedByUserId())
                .createdAt(f.getCreatedAt())
                .build();
    }

    private boolean isAdmin(String role) {
        String normalizedRole = role == null ? "" : role.replaceFirst("(?i)^ROLE_", "");
        return "ADMIN".equalsIgnoreCase(normalizedRole);
    }
}

