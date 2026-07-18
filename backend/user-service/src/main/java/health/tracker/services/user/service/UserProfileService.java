package health.tracker.services.user.service;

import health.tracker.services.user.dto.*;
import health.tracker.services.user.entity.BodyMetric;
import health.tracker.services.user.entity.UserProfile;
import health.tracker.services.user.exception.AppException;
import health.tracker.services.user.repository.BodyMetricRepository;
import health.tracker.services.user.repository.UserProfileRepository;
import health.tracker.services.user.repository.WaterLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import health.tracker.services.user.entity.WaterLog;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository profileRepository;
    private final BodyMetricRepository  metricRepository;
    private final NutritionGoalCalculator nutritionGoalCalculator;
    private final WaterLogRepository waterLogRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final UserCacheService userCacheService;

    // ─── Profile ──────────────────────────────────────────────────────────────

    /**
     * Lấy hồ sơ của user. Nếu chưa có, tự động tạo mới.
     */
    @Transactional
    public UserProfileResponse getOrCreateProfile(Long userId) {
        String cacheKey = userCacheService.profileKey(userId);
        UserProfileResponse cached = userCacheService.getProfile(cacheKey).orElse(null);
        if (cached != null) {
            return cached;
        }

        UserProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("Creating new profile for userId={}", userId);
                    return profileRepository.save(
                            UserProfile.builder().userId(userId).build()
                    );
                });
        UserProfileResponse response = toProfileResponse(profile);
        userCacheService.putProfile(cacheKey, response);
        return response;
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
        if (request.getAvatarUrl()      != null) profile.setAvatarUrl(normalizeAvatarUrl(request.getAvatarUrl()));
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

        UserProfile saved = profileRepository.save(profile);
        userCacheService.evictAllUserCaches();
        publishProfileSnapshot(saved, LocalDate.now());
        return toProfileResponse(saved);
    }

    // ─── Body Metrics ─────────────────────────────────────────────────────────

    /**
     * Ghi chỉ số cơ thể. Tự động tính BMI nếu có chiều cao trong hồ sơ.
     */
    @Transactional
    public WaterLogResponse logWater(Long userId, WaterLogRequest request) {
        WaterLog waterlog = WaterLog.builder()
                .userId(userId)
                .amountMl(request.getAmountMl())
                .loggedAt(request.getLoggedAt())
                .build();
        WaterLog savedWaterlog = waterLogRepository.save(waterlog);
        userCacheService.evictAllUserCaches();
        publishWaterEvent("CREATED", savedWaterlog);
        return toWaterLogResponse(savedWaterlog);
    }

    @Transactional
    public DailyWaterResponse getTodayWater(Long userId) {
            LocalDate today = LocalDate.now();
            String cacheKey = userCacheService.dailyWaterKey(userId, today);
            DailyWaterResponse cached = userCacheService.getDailyWater(cacheKey).orElse(null);
            if (cached != null) {
                return cached;
            }

            LocalDateTime start = today.atStartOfDay();
            LocalDateTime end = today.plusDays(1).atStartOfDay();

            List<WaterLog> waterLogs =
                    waterLogRepository.findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThan(userId, start, end);

            int totalAmountMl = waterLogs.stream().mapToInt(WaterLog::getAmountMl).sum();

            UserProfile profile = profileRepository.findByUserId(userId)
                    .orElseGet(()-> profileRepository.save(UserProfile.builder().userId(userId).build()));

            DailyWaterResponse response = DailyWaterResponse.builder()
                    .date(today)
                    .totalAmountMl(totalAmountMl)
                    .goalMl(profile.getDailyWaterGoalMl())
                    .build();
            userCacheService.putDailyWater(cacheKey, response);
            return response;
        }

    @Transactional(readOnly = true)
    public List<WaterLogResponse> getWaterLogs(Long userId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        return waterLogRepository
                .findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAtDesc(
                        userId, start, end)
                .stream()
                .map(this::toWaterLogResponse)
                .toList();
    }

    @Transactional
    public void delete(Long waterId, Long userId) {
        WaterLog waterLog = waterLogRepository.findByIdAndUserId(waterId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Water not found: " + waterId));

        publishWaterEvent("DELETED", waterLog);
        waterLogRepository.delete(waterLog);
        userCacheService.evictAllUserCaches();
        log.info("Water deleted: id={}, userId={}", waterId, userId);
    }

    @Transactional
    public WaterLogResponse updateWater(Long waterId, Long userId, WaterLogRequest request) {
        WaterLog water = waterLogRepository.findByIdAndUserId(waterId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Water not found: " + waterId));

        publishWaterEvent("DELETED", water);
        water.setAmountMl(request.getAmountMl());
        if (request.getLoggedAt() != null) {
            water.setLoggedAt(request.getLoggedAt());
        }

        WaterLog savedWater = waterLogRepository.save(water);
        userCacheService.evictAllUserCaches();
        publishWaterEvent("CREATED", savedWater);
        log.info("Water updated: id={}, userId={}", waterId, userId);
        return toWaterLogResponse(savedWater);
    }

    @Transactional
    public BodyMetricResponse addMetric(Long userId, BodyMetricRequest request) {
        UserProfile profile = getOrCreateProfileEntity(userId);
        applyMetricHeightToProfile(profile, request);
        BodyMetric metric = BodyMetric.builder()
                .userId(userId)
                .recordedAt(request.getRecordedAt())
                .weightKg(request.getWeightKg())
                .bodyFatPercentage(request.getBodyFatPercentage())
                .muscleMassKg(request.getMuscleMassKg())
                .bmi(request.getBmi())
                .bmr(request.getBmr())
                .tdee(request.getTdee())
                .waistCm(request.getWaistCm())
                .hipCm(request.getHipCm())
                .chestCm(request.getChestCm())
                .notes(request.getNotes())
                .build();

        calculateMetricValues(metric, request, profile);

        BodyMetric savedMetric = metricRepository.save(metric);
        syncProfileFromLatestMetric(profile, savedMetric.getRecordedAt());
        userCacheService.evictAllUserCaches();
        publishMetricEvent(savedMetric);
        return toMetricResponse(savedMetric);
    }

    @Transactional
    public BodyMetricResponse updateMetric(Long userId, Long metricId, BodyMetricRequest request) {
        BodyMetric metric = metricRepository.findByIdAndUserId(metricId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Body metric not found: " + metricId));
        UserProfile profile = getOrCreateProfileEntity(userId);
        applyMetricHeightToProfile(profile, request);

        metric.setRecordedAt(request.getRecordedAt());
        metric.setWeightKg(request.getWeightKg());
        metric.setBodyFatPercentage(request.getBodyFatPercentage());
        metric.setMuscleMassKg(request.getMuscleMassKg());
        metric.setBmi(request.getBmi());
        metric.setBmr(request.getBmr());
        metric.setTdee(request.getTdee());
        metric.setWaistCm(request.getWaistCm());
        metric.setHipCm(request.getHipCm());
        metric.setChestCm(request.getChestCm());
        metric.setNotes(request.getNotes());

        calculateMetricValues(metric, request, profile);

        BodyMetric savedMetric = metricRepository.save(metric);
        syncProfileFromLatestMetric(profile, savedMetric.getRecordedAt());
        userCacheService.evictAllUserCaches();
        publishMetricEvent(savedMetric);
        log.info("Body metric updated: id={}, userId={}", metricId, userId);
        return toMetricResponse(savedMetric);
    }

    @Transactional
    public void deleteMetric(Long userId, Long metricId) {
        BodyMetric metric = metricRepository.findByIdAndUserId(metricId, userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Body metric not found: " + metricId));

        metricRepository.delete(metric);
        metricRepository.flush();
        syncProfileFromLatestMetric(getOrCreateProfileEntity(userId), LocalDate.now());
        userCacheService.evictAllUserCaches();
        log.info("Body metric deleted: id={}, userId={}", metricId, userId);
    }

    private UserProfile getOrCreateProfileEntity(Long userId) {
        return profileRepository.findByUserId(userId)
                .orElseGet(() -> UserProfile.builder().userId(userId).build());
    }

    private void applyMetricHeightToProfile(UserProfile profile, BodyMetricRequest request) {
        if (request.getHeightCm() != null) {
            profile.setHeightCm(request.getHeightCm());
        }
    }

    private void calculateMetricValues(BodyMetric metric, BodyMetricRequest request, UserProfile profile) {
        if (request.getWeightKg() == null) {
            return;
        }
        if (profile.getHeightCm() != null) {
            BigDecimal heightM = profile.getHeightCm().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            metric.setBmi(request.getWeightKg().divide(heightM.multiply(heightM), 1, RoundingMode.HALF_UP));
            BigDecimal estimatedBodyFat = calculateBodyFat(profile, request);
            if (estimatedBodyFat != null) {
                metric.setBodyFatPercentage(estimatedBodyFat);
            }
        }
        if (metric.getBmr() == null) {
            metric.setBmr(calculateBmr(profile, request.getWeightKg()));
        }
        if (metric.getTdee() == null && metric.getBmr() != null) {
            metric.setTdee(calculateTdee(profile, metric.getBmr()));
        }
    }

    private void syncProfileFromLatestMetric(UserProfile profile, LocalDate snapshotDate) {
        metricRepository.findFirstByUserIdAndWeightKgIsNotNullOrderByRecordedAtDescIdDesc(profile.getUserId())
                .ifPresent(latestMetric -> profile.setWeightKg(latestMetric.getWeightKg()));
        applyNutritionTargets(profile, null);
        UserProfile savedProfile = profileRepository.save(profile);
        publishProfileSnapshot(savedProfile, snapshotDate);
    }

    private void publishWaterEvent(String eventType, WaterLog water) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventId", UUID.randomUUID().toString());
        event.put("eventType", eventType);
        event.put("userId", water.getUserId());
        event.put("waterLogId", water.getId());
        event.put("summaryDate", water.getLoggedAt().toLocalDate().toString());
        event.put("amountMl", water.getAmountMl());
        sendAnalyticsEvent("water.logged", water.getUserId(), event);
    }

    private void publishMetricEvent(BodyMetric metric) {
        if (metric.getWeightKg() == null) return;
        Map<String, Object> event = new HashMap<>();
        event.put("eventId", UUID.randomUUID().toString());
        event.put("userId", metric.getUserId());
        event.put("summaryDate", metric.getRecordedAt().toString());
        event.put("weightKg", metric.getWeightKg());
        sendAnalyticsEvent("body-metric.recorded", metric.getUserId(), event);
    }

    private void publishProfileSnapshot(UserProfile profile, LocalDate date) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventId", UUID.randomUUID().toString());
        event.put("userId", profile.getUserId());
        event.put("summaryDate", date.toString());
        event.put("calorieGoal", profile.getDailyCalorieGoal());
        event.put("weightKg", profile.getWeightKg());
        sendAnalyticsEvent("profile.snapshot", profile.getUserId(), event);
    }

    private void sendAnalyticsEvent(String topic, Long userId, Map<String, Object> event) {
        Runnable send = () -> kafkaTemplate.send(topic, String.valueOf(userId), event)
            .whenComplete((result, error) -> {
                if (error != null) log.error("Failed to publish {} for userId={}", topic, userId, error);
            });
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() { send.run(); }
                    });
        } else send.run();
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
    private WaterLogResponse toWaterLogResponse(WaterLog waterLog) {
        return WaterLogResponse.builder()
                .id(waterLog.getId())
                .userId(waterLog.getUserId())
                .amountMl(waterLog.getAmountMl())
                .loggedAt(waterLog.getLoggedAt())
                .build();
    }

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
                .username(p.getUsername()).avatarUrl(p.getAvatarUrl()).dateOfBirth(p.getDateOfBirth())
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
                .hidden(p.isHidden())
                .createdAt(p.getCreatedAt()).updatedAt(p.getUpdatedAt())
                .build();
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

    private BodyMetricResponse toMetricResponse(BodyMetric m) {
        return BodyMetricResponse.builder()
                .id(m.getId()).userId(m.getUserId()).recordedAt(m.getRecordedAt())
                .weightKg(m.getWeightKg()).bodyFatPercentage(m.getBodyFatPercentage())
                .muscleMassKg(m.getMuscleMassKg()).bmi(m.getBmi()).bmr(m.getBmr()).tdee(m.getTdee())
                .waistCm(m.getWaistCm()).hipCm(m.getHipCm()).chestCm(m.getChestCm())
                .notes(m.getNotes()).createdAt(m.getCreatedAt())
                .build();
    }

    private BigDecimal calculateBodyFat(UserProfile profile, BodyMetricRequest request) {
        if (request.getWeightKg() == null || profile.getHeightCm() == null
                || profile.getDateOfBirth() == null || profile.getGender() == null
                || profile.getGender() == UserProfile.Gender.OTHER) {
            return null;
        }
        double heightM = profile.getHeightCm().doubleValue() / 100.0;
        double bmi = request.getWeightKg().doubleValue() / (heightM * heightM);
        int age = java.time.Period.between(profile.getDateOfBirth(), java.time.LocalDate.now()).getYears();
        int sex = profile.getGender() == UserProfile.Gender.MALE ? 1 : 0;
        double bodyFat = 1.20 * bmi + 0.23 * age - 10.8 * sex - 5.4;
        return BigDecimal.valueOf(Math.max(0, bodyFat)).setScale(1, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateBmr(UserProfile profile, BigDecimal weightKg) {
        if (weightKg == null || profile.getHeightCm() == null
                || profile.getDateOfBirth() == null || profile.getGender() == null
                || profile.getGender() == UserProfile.Gender.OTHER) {
            return null;
        }

        int age = java.time.Period.between(profile.getDateOfBirth(), java.time.LocalDate.now()).getYears();
        int genderOffset = profile.getGender() == UserProfile.Gender.MALE ? 5 : -161;
        double bmr = 9.99 * weightKg.doubleValue()
                + 6.25 * profile.getHeightCm().doubleValue()
                - 4.92 * age
                + genderOffset;
        return BigDecimal.valueOf(Math.round(bmr));
    }

    private BigDecimal calculateTdee(UserProfile profile, BigDecimal bmr) {
        return BigDecimal.valueOf(Math.round(bmr.doubleValue() * activityFactor(profile.getActivityLevel())));
    }

    private double activityFactor(UserProfile.ActivityLevel activityLevel) {
        UserProfile.ActivityLevel level = activityLevel != null
                ? activityLevel
                : UserProfile.ActivityLevel.SEDENTARY;

        return switch (level) {
            case SEDENTARY -> 1.2;
            case LIGHTLY_ACTIVE -> 1.375;
            case MODERATELY_ACTIVE -> 1.55;
            case VERY_ACTIVE -> 1.725;
            case EXTRA_ACTIVE -> 1.9;
        };
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

