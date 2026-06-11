package health.tracker.services.user.service;

import health.tracker.services.user.dto.*;
import health.tracker.services.user.entity.BodyMetric;
import health.tracker.services.user.entity.UserProfile;
import health.tracker.services.user.exception.AppException;
import health.tracker.services.user.repository.BodyMetricRepository;
import health.tracker.services.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository profileRepository;
    private final BodyMetricRepository  metricRepository;
    private final NutritionGoalCalculator nutritionGoalCalculator;

    // ─── Profile ──────────────────────────────────────────────────────────────

    /**
     * Lấy hồ sơ của user. Nếu chưa có, tự động tạo mới.
     */
    @Transactional
    public UserProfileResponse getOrCreateProfile(Long userId) {
        UserProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("Creating new profile for userId={}", userId);
                    return profileRepository.save(
                            UserProfile.builder().userId(userId).build()
                    );
                });
        return toProfileResponse(profile);
    }

    /**
     * Cập nhật hồ sơ. Nếu username thay đổi, kiểm tra trùng lặp.
     */
    @Transactional
    public UserProfileResponse updateProfile(Long userId, UserProfileRequest request) {
        UserProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> UserProfile.builder().userId(userId).build());

        if (request.getUsername() != null &&
                !request.getUsername().equals(profile.getUsername()) &&
                profileRepository.existsByUsernameAndUserIdNot(request.getUsername(), userId)) {
            throw new AppException(HttpStatus.CONFLICT, "Username '" + request.getUsername() + "' is already taken");
        }

        // Áp patch các field có giá trị
        if (request.getUsername()       != null) profile.setUsername(request.getUsername());
        if (request.getDateOfBirth()    != null) profile.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender()         != null) profile.setGender(request.getGender());
        if (request.getHeightCm()       != null) profile.setHeightCm(request.getHeightCm());
        if (request.getWeightKg()       != null) profile.setWeightKg(request.getWeightKg());
        if (request.getActivityLevel()  != null) profile.setActivityLevel(request.getActivityLevel());
        if (request.getGoal()           != null) profile.setGoal(request.getGoal());
        if (request.getTargetWeightKg() != null) profile.setTargetWeightKg(request.getTargetWeightKg());
        if (request.getDailyWaterGoalMl()   != null) profile.setDailyWaterGoalMl(request.getDailyWaterGoalMl());
        if (request.getBio()            != null) profile.setBio(request.getBio());
        if (request.getTimezone()       != null) profile.setTimezone(request.getTimezone());

        applyNutritionTargets(profile, request.getDailyCalorieGoal());

        return toProfileResponse(profileRepository.save(profile));
    }

    // ─── Body Metrics ─────────────────────────────────────────────────────────

    /**
     * Ghi chỉ số cơ thể. Tự động tính BMI nếu có chiều cao trong hồ sơ.
     */
    @Transactional
    public BodyMetricResponse addMetric(Long userId, BodyMetricRequest request) {
        BodyMetric metric = BodyMetric.builder()
                .userId(userId)
                .recordedAt(request.getRecordedAt())
                .weightKg(request.getWeightKg())
                .bodyFatPercentage(request.getBodyFatPercentage())
                .muscleMassKg(request.getMuscleMassKg())
                .waistCm(request.getWaistCm())
                .hipCm(request.getHipCm())
                .chestCm(request.getChestCm())
                .notes(request.getNotes())
                .build();

        // Tính BMI nếu có cân nặng và chiều cao
        if (request.getWeightKg() != null) {
            profileRepository.findByUserId(userId).ifPresent(profile -> {
                if (profile.getHeightCm() != null) {
                    BigDecimal heightM = profile.getHeightCm().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                    BigDecimal bmi = request.getWeightKg()
                            .divide(heightM.multiply(heightM), 1, RoundingMode.HALF_UP);
                    metric.setBmi(bmi);
                }
                // Cập nhật cân nặng hiện tại trong profile
                profile.setWeightKg(request.getWeightKg());
                applyNutritionTargets(profile, null);
                profileRepository.save(profile);
            });
        }

        return toMetricResponse(metricRepository.save(metric));
    }

    /**
     * Lấy lịch sử chỉ số cơ thể theo trang.
     */
    @Transactional(readOnly = true)
    public Page<BodyMetricResponse> getMetrics(Long userId, Pageable pageable) {
        return metricRepository.findByUserIdOrderByRecordedAtDesc(userId, pageable)
                .map(this::toMetricResponse);
    }

    // ─── Mappers ──────────────────────────────────────────────────────────────

    private UserProfileResponse toProfileResponse(UserProfile p) {
        NutritionGoalCalculator.NutritionTargets targets = nutritionGoalCalculator.calculate(p);
        
        java.util.List<UserProfileResponse.WeightMilestone> milestones = new java.util.ArrayList<>();
        if (p.getPlanStartDate() != null && p.getPlanDurationWeeks() != null && p.getPlanDurationWeeks() > 0
                && p.getWeightKg() != null && p.getTargetWeightKg() != null) {
            java.math.BigDecimal startWeight = p.getWeightKg();
            java.math.BigDecimal endWeight = p.getTargetWeightKg();
            java.math.BigDecimal diff = endWeight.subtract(startWeight);
            int weeks = p.getPlanDurationWeeks();
            java.math.BigDecimal weeklyChange = diff.divide(java.math.BigDecimal.valueOf(weeks), 4, java.math.RoundingMode.HALF_UP);

            for (int i = 1; i <= weeks; i++) {
                java.math.BigDecimal milestoneWeight = startWeight.add(weeklyChange.multiply(java.math.BigDecimal.valueOf(i)))
                        .setScale(2, java.math.RoundingMode.HALF_UP);
                milestones.add(UserProfileResponse.WeightMilestone.builder()
                        .weekNumber(i)
                        .date(p.getPlanStartDate().plusWeeks(i))
                        .targetWeightKg(milestoneWeight)
                        .build());
            }
        }

        return UserProfileResponse.builder()
                .id(p.getId()).userId(p.getUserId())
                .username(p.getUsername()).dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender()).heightCm(p.getHeightCm()).weightKg(p.getWeightKg())
                .activityLevel(p.getActivityLevel()).goal(p.getGoal())
                .targetWeightKg(p.getTargetWeightKg())
                .bmr(targets.bmr()).tdee(targets.tdee()).activityFactor(targets.activityFactor())
                .dailyCalorieGoal(p.getDailyCalorieGoal())
                .dailyProteinGoalG(p.getDailyProteinGoalG()).dailyCarbsGoalG(p.getDailyCarbsGoalG())
                .dailyFatGoalG(p.getDailyFatGoalG()).dailyWaterGoalMl(p.getDailyWaterGoalMl())
                .bio(p.getBio()).timezone(p.getTimezone())
                .planStartDate(p.getPlanStartDate())
                .planDurationWeeks(p.getPlanDurationWeeks())
                .dailyActivityGoalKcal(p.getDailyActivityGoalKcal())
                .weeklyWeightMilestones(milestones)
                .createdAt(p.getCreatedAt()).updatedAt(p.getUpdatedAt())
                .build();
    }

    private BodyMetricResponse toMetricResponse(BodyMetric m) {
        return BodyMetricResponse.builder()
                .id(m.getId()).userId(m.getUserId()).recordedAt(m.getRecordedAt())
                .weightKg(m.getWeightKg()).bodyFatPercentage(m.getBodyFatPercentage())
                .muscleMassKg(m.getMuscleMassKg()).bmi(m.getBmi())
                .waistCm(m.getWaistCm()).hipCm(m.getHipCm()).chestCm(m.getChestCm())
                .notes(m.getNotes()).createdAt(m.getCreatedAt())
                .build();
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
}

