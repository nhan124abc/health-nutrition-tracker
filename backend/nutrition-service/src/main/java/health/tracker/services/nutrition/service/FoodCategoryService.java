package health.tracker.services.nutrition.service;

import health.tracker.services.nutrition.dto.FoodCategoryRequest;
import health.tracker.services.nutrition.entity.FoodCategory;
import health.tracker.services.nutrition.exception.AppException;
import health.tracker.services.nutrition.repository.FoodCategoryRepository;
import health.tracker.services.nutrition.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FoodCategoryService {

    private final FoodCategoryRepository categoryRepository;
    private final FoodItemRepository foodItemRepository;
    private final NutritionCacheService nutritionCacheService;

    @Transactional(readOnly = true)
    public List<FoodCategory> getVisibleCategories() {
        String cacheKey = nutritionCacheService.visibleCategoriesKey();
        List<FoodCategory> cached = nutritionCacheService.getCategories(cacheKey).orElse(null);
        if (cached != null) {
            return cached;
        }
        List<FoodCategory> categories = categoryRepository.findByHiddenFalseOrderByNameAsc();
        nutritionCacheService.putCategories(cacheKey, categories);
        return categories;
    }

    @Transactional(readOnly = true)
    public List<FoodCategory> getAdminCategories(Boolean hidden) {
        String cacheKey = nutritionCacheService.adminCategoriesKey(hidden);
        List<FoodCategory> cached = nutritionCacheService.getCategories(cacheKey).orElse(null);
        if (cached != null) {
            return cached;
        }
        List<FoodCategory> categories = categoryRepository.findAllByOrderByNameAsc().stream()
                .filter(category -> hidden == null || category.isHidden() == hidden)
                .toList();
        nutritionCacheService.putCategories(cacheKey, categories);
        return categories;
    }

    @Transactional(readOnly = true)
    public FoodCategory getById(Integer id) {
        return findById(id);
    }

    @Transactional
    public FoodCategory create(FoodCategoryRequest request) {
        String name = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(HttpStatus.CONFLICT, "Food category already exists: " + name);
        }

        FoodCategory category = FoodCategory.builder()
                .name(name)
                .nameVi(trimToNull(request.getNameVi()))
                .icon(trimToNull(request.getIcon()))
                .description(trimToNull(request.getDescription()))
                .hidden(request.getHidden() != null && request.getHidden())
                .build();
        validateCanBeHidden(category);
        FoodCategory saved = categoryRepository.save(category);
        nutritionCacheService.evictAllNutritionCaches();
        return saved;
    }

    @Transactional
    public FoodCategory update(Integer id, FoodCategoryRequest request) {
        FoodCategory category = findById(id);
        String name = request.getName().trim();
        if (!category.getName().equalsIgnoreCase(name) && categoryRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(HttpStatus.CONFLICT, "Food category already exists: " + name);
        }

        category.setName(name);
        category.setNameVi(trimToNull(request.getNameVi()));
        category.setIcon(trimToNull(request.getIcon()));
        category.setDescription(trimToNull(request.getDescription()));
        if (request.getHidden() != null) {
            category.setHidden(request.getHidden());
            validateCanBeHidden(category);
        }
        FoodCategory saved = categoryRepository.save(category);
        nutritionCacheService.evictAllNutritionCaches();
        return saved;
    }

    @Transactional
    public void delete(Integer id) {
        FoodCategory category = findById(id);
        long linkedFoodCount = foodItemRepository.countByCategoryId(id);
        if (linkedFoodCount > 0) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Cannot delete category because " + linkedFoodCount + " food item(s) are linked");
        }
        categoryRepository.delete(category);
        nutritionCacheService.evictAllNutritionCaches();
    }

    @Transactional
    public FoodCategory hide(Integer id) {
        FoodCategory category = findById(id);
        category.setHidden(true);
        validateCanBeHidden(category);
        FoodCategory saved = categoryRepository.save(category);
        nutritionCacheService.evictAllNutritionCaches();
        return saved;
    }

    @Transactional
    public FoodCategory restore(Integer id) {
        FoodCategory category = findById(id);
        category.setHidden(false);
        FoodCategory saved = categoryRepository.save(category);
        nutritionCacheService.evictAllNutritionCaches();
        return saved;
    }

    private FoodCategory findById(Integer id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Food category not found: " + id));
    }

    private void validateCanBeHidden(FoodCategory category) {
        if (!category.isHidden() || category.getId() == null) {
            return;
        }
        long linkedFoodCount = foodItemRepository.countByCategoryId(category.getId());
        if (linkedFoodCount > 0) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Cannot hide category because " + linkedFoodCount + " food item(s) are linked");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
