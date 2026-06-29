package health.tracker.services.activity.service;

import health.tracker.services.activity.dto.ActivityCategoryLabelRequest;
import health.tracker.services.activity.dto.ActivityCategoryLabelCreateRequest;
import health.tracker.services.activity.entity.ActivityCategoryLabel;
import health.tracker.services.activity.entity.ActivityType;
import health.tracker.services.activity.exception.AppException;
import health.tracker.services.activity.repository.ActivityCategoryLabelRepository;
import health.tracker.services.activity.repository.ActivityTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityCategoryLabelService {

    private final ActivityCategoryLabelRepository labelRepository;
    private final ActivityTypeRepository typeRepository;

    @Transactional(readOnly = true)
    public List<ActivityCategoryLabel> list(boolean includeHidden) {
        return labelRepository.findAll().stream()
                .filter(label -> includeHidden || !label.isHidden())
                .peek(this::attachCount)
                .sorted(Comparator.comparingInt(label -> label.getCategory().ordinal()))
                .toList();
    }

    @Transactional
    public ActivityCategoryLabel create(ActivityCategoryLabelCreateRequest request) {
        if (labelRepository.existsById(request.getCategory())) {
            throw new AppException(
                    HttpStatus.CONFLICT,
                    "Activity category already exists: " + request.getCategory());
        }
        ActivityCategoryLabel label = ActivityCategoryLabel.builder()
                .category(request.getCategory())
                .name(request.getName().trim())
                .nameVi(trimToNull(request.getNameVi()))
                .hidden(request.getHidden() != null && request.getHidden())
                .build();
        return attachCount(labelRepository.save(label));
    }

    @Transactional
    public ActivityCategoryLabel update(
            ActivityType.Category category,
            ActivityCategoryLabelRequest request) {
        ActivityCategoryLabel label = find(category);
        label.setName(request.getName().trim());
        label.setNameVi(trimToNull(request.getNameVi()));
        if (request.getHidden() != null) {
            label.setHidden(request.getHidden());
        }
        return attachCount(labelRepository.save(label));
    }

    @Transactional
    public ActivityCategoryLabel setHidden(ActivityType.Category category, boolean hidden) {
        ActivityCategoryLabel label = find(category);
        label.setHidden(hidden);
        return attachCount(labelRepository.save(label));
    }

    @Transactional
    public void delete(ActivityType.Category category) {
        ActivityCategoryLabel label = find(category);
        long linkedCount = typeRepository.countByCategory(category);
        if (linkedCount > 0) {
            throw new AppException(
                    HttpStatus.CONFLICT,
                    "Cannot delete activity category because " + linkedCount + " activity type(s) are linked");
        }
        labelRepository.delete(label);
    }

    private ActivityCategoryLabel find(ActivityType.Category category) {
        return labelRepository.findById(category)
                .orElseThrow(() -> new AppException(
                        HttpStatus.NOT_FOUND,
                        "Activity category not found: " + category));
    }

    private ActivityCategoryLabel attachCount(ActivityCategoryLabel label) {
        label.setActivityTypeCount(typeRepository.countByCategory(label.getCategory()));
        return label;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
