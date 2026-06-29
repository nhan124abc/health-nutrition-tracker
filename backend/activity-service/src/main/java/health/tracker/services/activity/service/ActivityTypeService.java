package health.tracker.services.activity.service;

import health.tracker.services.activity.dto.ActivityTypeRequest;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.exception.AppException;
import health.tracker.services.activity.repository.ActivityLogRepository;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import health.tracker.services.activity.repository.ActivityCategoryLabelRepository;
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
