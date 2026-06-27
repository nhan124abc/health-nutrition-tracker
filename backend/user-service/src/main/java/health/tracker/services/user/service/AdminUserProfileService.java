package health.tracker.services.user.service;

import health.tracker.services.user.dto.AdminUserProfileRequest;
import health.tracker.services.user.dto.AdminUserProfileUpdateRequest;
import health.tracker.services.user.dto.UserProfileResponse;
import health.tracker.services.user.entity.UserProfile;
import health.tracker.services.user.exception.AppException;
import health.tracker.services.user.repository.BodyMetricRepository;
import health.tracker.services.user.repository.UserProfileRepository;
import health.tracker.services.user.repository.WaterLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserProfileService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private final UserProfileRepository profileRepository;
    private final BodyMetricRepository metricRepository;
    private final WaterLogRepository waterLogRepository;
    private final NutritionGoalCalculator nutritionGoalCalculator;

    @Transactional(readOnly = true)
    public Page<UserProfileResponse> getUsers(int page, int size, String search, Boolean hidden) {
        PageRequest pageRequest = PageRequest.of(
                Math.max(page, 0),
                normalizeSize(size),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );

        boolean hasSearch = search != null && !search.isBlank();
        String normalizedSearch = hasSearch ? search.trim() : "";

        Page<UserProfile> profiles;
        if (hidden != null && hasSearch) {
            profiles = profileRepository.findByHiddenAndUsernameContainingIgnoreCase(hidden, normalizedSearch, pageRequest);
        } else if (hidden != null) {
            profiles = profileRepository.findByHidden(hidden, pageRequest);
        } else if (hasSearch) {
            profiles = profileRepository.findByUsernameContainingIgnoreCase(normalizedSearch, pageRequest);
        } else {
            profiles = profileRepository.findAll(pageRequest);
        }

        return profiles.map(this::toProfileResponse);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUser(Long userId) {
        return toProfileResponse(findByUserId(userId));
    }

    @Transactional
    public UserProfileResponse createUser(AdminUserProfileRequest request) {
        if (profileRepository.existsByUserId(request.getUserId())) {
            throw new AppException(HttpStatus.CONFLICT, "Profile already exists for userId=" + request.getUserId());
        }
        validateUsername(request.getUsername(), request.getUserId());

        UserProfile profile = UserProfile.builder()
                .userId(request.getUserId())
                .username(trimToNull(request.getUsername()))
                .avatarUrl(normalizeAvatarUrl(request.getAvatarUrl()))
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .heightCm(request.getHeightCm())
                .weightKg(request.getWeightKg())
                .activityLevel(request.getActivityLevel() == null ? UserProfile.ActivityLevel.SEDENTARY : request.getActivityLevel())
                .goal(request.getGoal() == null ? UserProfile.Goal.MAINTAIN_WEIGHT : request.getGoal())
                .targetWeightKg(request.getTargetWeightKg())
                .dailyWaterGoalMl(request.getDailyWaterGoalMl() == null ? 2000 : request.getDailyWaterGoalMl())
                .bio(request.getBio())
                .timezone(request.getTimezone() == null ? "UTC" : request.getTimezone())
                .hidden(request.getHidden() != null && request.getHidden())
                .build();

        applyNutritionTargets(profile, request.getDailyCalorieGoal());
        return toProfileResponse(profileRepository.save(profile));
    }

    @Transactional
    public UserProfileResponse updateUser(Long userId, AdminUserProfileUpdateRequest request) {
        UserProfile profile = findByUserId(userId);
        validateUsername(request.getUsername(), userId);

        if (request.getUsername() != null) profile.setUsername(trimToNull(request.getUsername()));
        if (request.getAvatarUrl() != null) profile.setAvatarUrl(normalizeAvatarUrl(request.getAvatarUrl()));
        if (request.getDateOfBirth() != null) profile.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getHeightCm() != null) profile.setHeightCm(request.getHeightCm());
        if (request.getWeightKg() != null) profile.setWeightKg(request.getWeightKg());
        if (request.getActivityLevel() != null) profile.setActivityLevel(request.getActivityLevel());
        if (request.getGoal() != null) profile.setGoal(request.getGoal());
        if (request.getTargetWeightKg() != null) profile.setTargetWeightKg(request.getTargetWeightKg());
        if (request.getDailyWaterGoalMl() != null) profile.setDailyWaterGoalMl(request.getDailyWaterGoalMl());
        if (request.getBio() != null) profile.setBio(request.getBio());
        if (request.getTimezone() != null) profile.setTimezone(request.getTimezone());
        if (request.getHidden() != null) profile.setHidden(request.getHidden());

        applyNutritionTargets(profile, request.getDailyCalorieGoal());
        return toProfileResponse(profileRepository.save(profile));
    }

    @Transactional
    public void deleteUser(Long userId) {
        UserProfile profile = findByUserId(userId);
        metricRepository.deleteByUserId(userId);
        waterLogRepository.deleteByUserId(userId);
        profileRepository.delete(profile);
    }

    @Transactional
    public UserProfileResponse hideUser(Long userId) {
        UserProfile profile = findByUserId(userId);
        profile.setHidden(true);
        return toProfileResponse(profileRepository.save(profile));
    }

    @Transactional
    public UserProfileResponse restoreUser(Long userId) {
        UserProfile profile = findByUserId(userId);
        profile.setHidden(false);
        return toProfileResponse(profileRepository.save(profile));
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private UserProfile findByUserId(Long userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User profile not found: " + userId));
    }

    private void validateUsername(String username, Long userId) {
        if (username != null && profileRepository.existsByUsernameAndUserIdNot(username, userId)) {
            throw new AppException(HttpStatus.CONFLICT, "Username '" + username + "' is already taken");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeAvatarUrl(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return null;
        }

        String normalized = avatarUrl.trim().replace("\\", "/");
        if ((!normalized.startsWith("/img/") && !normalized.startsWith("/api/v1/auth/avatars/"))
                || normalized.contains("..")
                || !normalized.toLowerCase().matches("^/(img|api/v1/auth/avatars)/.+\\.(jpg|jpeg|png)$")) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Avatar URL must point to a JPG or PNG avatar");
        }
        return normalized;
    }

    private void applyNutritionTargets(UserProfile profile, Integer manualCalorieGoal) {
        NutritionGoalCalculator.NutritionTargets targets = nutritionGoalCalculator.calculate(profile, manualCalorieGoal);
        if (targets.dailyCalorieGoal() == null) {
            if (manualCalorieGoal != null) {
                profile.setDailyCalorieGoal(manualCalorieGoal);
            }
            return;
        }

        profile.setDailyCalorieGoal(manualCalorieGoal != null ? manualCalorieGoal : targets.dailyCalorieGoal());
        profile.setDailyProteinGoalG(targets.dailyProteinGoalG());
        profile.setDailyCarbsGoalG(targets.dailyCarbsGoalG());
        profile.setDailyFatGoalG(targets.dailyFatGoalG());
    }

    private UserProfileResponse toProfileResponse(UserProfile profile) {
        NutritionGoalCalculator.NutritionTargets targets = nutritionGoalCalculator.calculate(profile);
        List<UserProfileResponse.WeightMilestone> milestones = new ArrayList<>();
        if (profile.getPlanStartDate() != null && profile.getPlanDurationWeeks() != null
                && profile.getPlanDurationWeeks() > 0 && profile.getWeightKg() != null
                && profile.getTargetWeightKg() != null) {
            BigDecimal weeklyChange = profile.getTargetWeightKg()
                    .subtract(profile.getWeightKg())
                    .divide(BigDecimal.valueOf(profile.getPlanDurationWeeks()), 4, RoundingMode.HALF_UP);

            for (int i = 1; i <= profile.getPlanDurationWeeks(); i++) {
                milestones.add(UserProfileResponse.WeightMilestone.builder()
                        .weekNumber(i)
                        .date(profile.getPlanStartDate().plusWeeks(i))
                        .targetWeightKg(profile.getWeightKg()
                                .add(weeklyChange.multiply(BigDecimal.valueOf(i)))
                                .setScale(2, RoundingMode.HALF_UP))
                        .build());
            }
        }

        return UserProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUserId())
                .username(profile.getUsername())
                .avatarUrl(profile.getAvatarUrl())
                .dateOfBirth(profile.getDateOfBirth())
                .gender(profile.getGender())
                .heightCm(profile.getHeightCm())
                .weightKg(profile.getWeightKg())
                .activityLevel(profile.getActivityLevel())
                .goal(profile.getGoal())
                .targetWeightKg(profile.getTargetWeightKg())
                .bmr(targets.bmr())
                .tdee(targets.tdee())
                .activityFactor(targets.activityFactor())
                .dailyCalorieGoal(profile.getDailyCalorieGoal())
                .dailyProteinGoalG(profile.getDailyProteinGoalG())
                .dailyCarbsGoalG(profile.getDailyCarbsGoalG())
                .dailyFatGoalG(profile.getDailyFatGoalG())
                .dailyWaterGoalMl(profile.getDailyWaterGoalMl())
                .bio(profile.getBio())
                .timezone(profile.getTimezone())
                .planStartDate(profile.getPlanStartDate())
                .planDurationWeeks(profile.getPlanDurationWeeks())
                .dailyActivityGoalKcal(profile.getDailyActivityGoalKcal())
                .weeklyWeightMilestones(milestones)
                .hidden(profile.isHidden())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
