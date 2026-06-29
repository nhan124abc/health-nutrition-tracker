package health.tracker.services.activity.service;

import health.tracker.services.activity.dto.ActivityCategoryRequest;
import health.tracker.services.activity.dto.ActivityCategoryResponse;
import health.tracker.services.activity.dto.ActivityTypeRequest;
import health.tracker.services.activity.entity.ActivityCategoryLabel;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.exception.AppException;
import health.tracker.services.activity.repository.ActivityCategoryLabelRepository;
import health.tracker.services.activity.repository.ActivityLogRepository;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityTypeService {

    private final ActivityTypeRepository typeRepository;
    private final ActivityLogRepository logRepository;
    private final ActivityCategoryLabelRepository categoryLabelRepository;

    @Transactional(readOnly = true)
    public List<ActivityType> getVisibleTypes(ActivityType.Category category) {
        if (category != null && isCategoryHidden(category)) {
            return List.of();
        }

        List<ActivityType> types = category != null
                ? typeRepository.findByCategoryAndHiddenFalseOrderByNameAsc(category)
                : typeRepository.findByHiddenFalseOrderByCategoryAscNameAsc();
        return types.stream()
                .filter(type -> !isCategoryHidden(type.getCategory()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityType> getAdminTypes(ActivityType.Category category, Boolean hidden) {
        return typeRepository.findAll().stream()
                .filter(type -> category == null || type.getCategory() == category)
                .filter(type -> hidden == null || type.isHidden() == hidden)
                .sorted(Comparator.comparing(ActivityType::getCategory).thenComparing(ActivityType::getName))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityCategoryResponse> getAdminCategories() {
        return List.of(ActivityType.Category.values()).stream()
                .filter(category -> typeRepository.countByCategory(category) > 0
                        || categoryLabelRepository.existsById(category))
                .map(this::toCategoryResponse)
                .sorted(Comparator.comparing(response -> response.getCategory().name()))
                .toList();
    }

    @Transactional
    public ActivityCategoryResponse updateCategory(ActivityType.Category category, ActivityCategoryRequest request) {
        ActivityCategoryLabel label = categoryLabelRepository.findById(category)
                .orElseGet(() -> ActivityCategoryLabel.builder()
                        .category(category)
                        .hidden(false)
                        .build());

        label.setName(request.getName().trim());
        label.setNameVi(trimToNull(request.getNameVi()));
        categoryLabelRepository.save(label);

        return toCategoryResponse(category);
    }

    @Transactional
    public ActivityCategoryResponse hideCategory(ActivityType.Category category) {
        validateEmptyCategory(category, "hide");
        ActivityCategoryLabel label = categoryLabelRepository.findById(category)
                .orElseGet(() -> ActivityCategoryLabel.builder()
                        .category(category)
                        .name(defaultCategoryName(category))
                        .hidden(false)
                        .build());
        label.setHidden(true);
        categoryLabelRepository.save(label);

        return toCategoryResponse(category);
    }

    @Transactional
    public ActivityCategoryResponse restoreCategory(ActivityType.Category category) {
        ActivityCategoryLabel label = categoryLabelRepository.findById(category)
                .orElseGet(() -> ActivityCategoryLabel.builder()
                        .category(category)
                        .name(defaultCategoryName(category))
                        .hidden(false)
                        .build());
        label.setHidden(false);
        categoryLabelRepository.save(label);

        return toCategoryResponse(category);
    }

    @Transactional
    public void deleteCategory(ActivityType.Category category) {
        validateEmptyCategory(category, "delete");
        categoryLabelRepository.deleteById(category);
    }

    @Transactional(readOnly = true)
    public ActivityType getById(Integer id) {
        return findById(id);
    }

    @Transactional
    public ActivityType create(ActivityTypeRequest request) {
        String name = request.getName().trim();
        if (typeRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(HttpStatus.CONFLICT, "Activity type already exists: " + name);
        }

        ActivityType type = ActivityType.builder()
                .name(name)
                .nameVi(trimToNull(request.getNameVi()))
                .category(request.getCategory())
                .metValue(request.getMetValue())
                .icon(trimToNull(request.getIcon()))
                .description(trimToNull(request.getDescription()))
                .system(request.getSystem() == null || request.getSystem())
                .hidden(request.getHidden() != null && request.getHidden())
                .build();
        validateCanBeHidden(type);
        return typeRepository.save(type);
    }

    @Transactional
    public ActivityType update(Integer id, ActivityTypeRequest request) {
        ActivityType type = findById(id);
        String name = request.getName().trim();
        if (!type.getName().equalsIgnoreCase(name) && typeRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(HttpStatus.CONFLICT, "Activity type already exists: " + name);
        }

        type.setName(name);
        type.setNameVi(trimToNull(request.getNameVi()));
        type.setCategory(request.getCategory());
        type.setMetValue(request.getMetValue());
        type.setIcon(trimToNull(request.getIcon()));
        type.setDescription(trimToNull(request.getDescription()));
        if (request.getSystem() != null) {
            type.setSystem(request.getSystem());
        }
        if (request.getHidden() != null) {
            type.setHidden(request.getHidden());
            validateCanBeHidden(type);
        }
        return typeRepository.save(type);
    }

    @Transactional
    public void delete(Integer id) {
        ActivityType type = findById(id);
        long linkedActivityCount = logRepository.countByActivityTypeId(id);
        if (linkedActivityCount > 0) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Cannot delete activity type because " + linkedActivityCount + " activity log(s) are linked");
        }
        typeRepository.delete(type);
    }

    @Transactional
    public ActivityType hide(Integer id) {
        ActivityType type = findById(id);
        type.setHidden(true);
        validateCanBeHidden(type);
        return typeRepository.save(type);
    }

    @Transactional
    public ActivityType restore(Integer id) {
        ActivityType type = findById(id);
        type.setHidden(false);
        return typeRepository.save(type);
    }

    private ActivityType findById(Integer id) {
        return typeRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Activity type not found: " + id));
    }

    private void validateCanBeHidden(ActivityType type) {
        if (!type.isHidden() || type.getId() == null) {
            return;
        }
        long linkedActivityCount = logRepository.countByActivityTypeId(type.getId());
        if (linkedActivityCount > 0) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Cannot hide activity type because " + linkedActivityCount + " activity log(s) are linked");
        }
    }

    private ActivityCategoryResponse toCategoryResponse(ActivityType.Category category) {
        ActivityCategoryLabel label = categoryLabelRepository.findById(category).orElse(null);

        return ActivityCategoryResponse.builder()
                .category(category)
                .name(label != null && label.getName() != null ? label.getName() : defaultCategoryName(category))
                .nameVi(label != null ? label.getNameVi() : null)
                .hidden(label != null && label.isHidden())
                .count(typeRepository.countByCategory(category))
                .build();
    }

    private void validateEmptyCategory(ActivityType.Category category, String action) {
        long itemCount = typeRepository.countByCategory(category);
        if (itemCount > 0) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Cannot " + action + " activity category because " + itemCount + " activity type(s) exist");
        }
    }

    private String defaultCategoryName(ActivityType.Category category) {
        String lower = category.name().toLowerCase().replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isCategoryHidden(ActivityType.Category category) {
        return categoryLabelRepository.findById(category)
                .map(label -> label.isHidden())
                .orElse(false);
    }
}
