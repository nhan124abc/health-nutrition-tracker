package health.tracker.services.ai.service;

import health.tracker.services.ai.dto.PlannerSuggestRequest;
import health.tracker.services.ai.service.ActivityCatalogClient.ActivityCandidate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class PlannerRuleEngine {

    public static String generatePlan(PlannerSuggestRequest context) {
        return generatePlan(context, List.of());
    }

    public static String generatePlan(PlannerSuggestRequest context, List<ActivityCandidate> activityCatalog) {
        int goalCalories = context.getDailyCalorieGoal() != null ? context.getDailyCalorieGoal() : 2000;
        String goal = normalizeGoal(context.getGoal());
        double weight = context.getWeightKg() != null ? context.getWeightKg() : 70.0;
        String mealType = context.getMealType() != null ? context.getMealType().toLowerCase() : "lunch";
        int offset = context.getSuggestionOffset() != null ? context.getSuggestionOffset() : 0;
        
        int dayOfWeek = LocalDate.now().getDayOfWeek().getValue();

        if ("exercise".equals(mealType)) {
            List<ActivityInfo> exerciseOptions = getExerciseOptions(context, goal, weight, dayOfWeek + offset, activityCatalog);
            if (exerciseOptions.isEmpty()) {
                return emptyActivitySuggestionJson();
            }

            StringBuilder sb = new StringBuilder();
            sb.append("{\n");
            sb.append("  \"message\": \"Gợi ý hoạt động vận động lành mạnh, phù hợp với thể trạng của bạn.\",\n");
            sb.append("  \"mealBudget\": 0,\n");
            sb.append("  \"options\": [\n");
            for (int i = 0; i < exerciseOptions.size(); i++) {
                sb.append(formatActivityOption(exerciseOptions.get(i)));
                sb.append(i < exerciseOptions.size() - 1 ? ",\n" : "\n");
            }
            sb.append("  ]\n");
            sb.append("}");
            return sb.toString();
        }

        // 1. Calculate macro ratios per goal
        double proteinRatio = 0.25;
        double carbsRatio = 0.50;
        double fatRatio = 0.25;

        if ("GAIN_MUSCLE".equals(goal)) {
            proteinRatio = 0.30;
            carbsRatio = 0.45;
            fatRatio = 0.25;
        } else if ("GAIN_WEIGHT".equals(goal)) {
            proteinRatio = 0.20;
            carbsRatio = 0.55;
            fatRatio = 0.25;
        } else if ("BODY_RECOMPOSITION".equals(goal)) {
            proteinRatio = 0.35;
            carbsRatio = 0.40;
            fatRatio = 0.25;
        } else if (isFatLossGoal(goal)) {
            proteinRatio = 0.35;
            carbsRatio = 0.35;
            fatRatio = 0.30;
        } else if ("IMPROVE_FITNESS".equals(goal)) {
            proteinRatio = 0.28;
            carbsRatio = 0.47;
            fatRatio = 0.25;
        }

        // 2. Budget calculation based on meal slot
        double share = 0.38;
        String mealLabel = "bữa trưa";
        if ("breakfast".equals(mealType)) {
            share = 0.25;
            mealLabel = "bữa sáng";
        } else if ("dinner".equals(mealType)) {
            share = 0.27;
            mealLabel = "bữa tối";
        } else if ("afternoon_snack".equals(mealType) || "snacks".equals(mealType) || "snack".equals(mealType)) {
            share = 0.10;
            mealLabel = "bữa phụ";
        }

        int caloriesConsumed = context.getCaloriesConsumed() != null ? context.getCaloriesConsumed() : 0;
        int remainingCalories = Math.max(100, goalCalories - caloriesConsumed);
        int mealBudget = Math.max(100, Math.min((int) Math.round(goalCalories * share), remainingCalories));

        // 3. Select 2 alternative options from pool
        String[] opt1 = getOptionFromPool(mealType, dayOfWeek + offset, context, List.of());
        String[] opt2 = getOptionFromPool(mealType, dayOfWeek + offset + 3, context, List.of(opt1[0]));

        double density1 = Double.parseDouble(opt1[2]);
        double density2 = Double.parseDouble(opt2[2]);

        MealOption m1 = calculateMealOption(opt1[0], mealBudget, proteinRatio, carbsRatio, fatRatio, density1, opt1[1]);
        MealOption m2 = calculateMealOption(opt2[0], mealBudget, proteinRatio, carbsRatio, fatRatio, density2, opt2[1]);

        // 4. Exercise recommendations (2 options)
        List<ActivityInfo> activities = getActivities(goal, weight, dayOfWeek + offset, activityCatalog, context);

        // 5. Construct JSON response
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append(String.format("  \"message\": \"Gợi ý %s lành mạnh, cân đối theo ngân sách calo của bạn.\",\n", mealLabel));
        sb.append(String.format("  \"mealBudget\": %d,\n", mealBudget));
        sb.append("  \"options\": [\n");
        sb.append(String.format("    { \"name\": \"%s\", \"amount\": \"%s\", \"servingSizeG\": %d, \"calories\": %d, \"proteinG\": %d, \"carbsG\": %d, \"fatG\": %d }",
                m1.name, m1.amount, m1.servingSizeG, m1.calories, m1.proteinG, m1.carbsG, m1.fatG));
        sb.append(",\n");
        sb.append(String.format("    { \"name\": \"%s\", \"amount\": \"%s\", \"servingSizeG\": %d, \"calories\": %d, \"proteinG\": %d, \"carbsG\": %d, \"fatG\": %d }\n",
                m2.name, m2.amount, m2.servingSizeG, m2.calories, m2.proteinG, m2.carbsG, m2.fatG));
        sb.append("  ],\n");
        sb.append("  \"activities\": [\n");
        for (int i = 0; i < activities.size(); i++) {
            ActivityInfo act = activities.get(i);
            sb.append(String.format("    { \"activityTypeId\": %s, \"name\": \"%s\", \"durationMinutes\": %d, \"caloriesBurned\": %d }",
                    activityTypeIdJson(act), act.name, act.durationMinutes, act.caloriesBurned));
            if (i < activities.size() - 1) {
                sb.append(",\n");
            } else {
                sb.append("\n");
            }
        }
        sb.append("  ]\n");
        sb.append("}");

        return sb.toString();
    }

    private static class MealOption {
        String name;
        String amount;
        int servingSizeG;
        int calories;
        int proteinG;
        int carbsG;
        int fatG;
    }

    private static class ActivityInfo {
        Integer activityTypeId;
        String name;
        int durationMinutes;
        int caloriesBurned;
        double met;
        
        ActivityInfo(String name, int durationMinutes, int caloriesBurned) {
            this(name, durationMinutes, caloriesBurned, 0);
        }

        ActivityInfo(String name, int durationMinutes, int caloriesBurned, double met) {
            this(null, name, durationMinutes, caloriesBurned, met);
        }

        ActivityInfo(Integer activityTypeId, String name, int durationMinutes, int caloriesBurned, double met) {
            this.activityTypeId = activityTypeId;
            this.name = name;
            this.durationMinutes = durationMinutes;
            this.caloriesBurned = caloriesBurned;
            this.met = met;
        }
    }

    private static String formatActivityOption(ActivityInfo activity) {
        return String.format(
                "    { \"activityTypeId\": %s, \"name\": \"%s\", \"amount\": \"%d phút\", \"durationMinutes\": %d, \"servingSizeG\": 0, \"calories\": %d, \"caloriesBurned\": %d, \"proteinG\": 0, \"carbsG\": 0, \"fatG\": 0, \"source\": \"AI_PLAN\" }",
                activityTypeIdJson(activity),
                activity.name,
                activity.durationMinutes,
                activity.durationMinutes,
                activity.caloriesBurned,
                activity.caloriesBurned
        );
    }

    private static String activityTypeIdJson(ActivityInfo activity) {
        return activity.activityTypeId == null ? "null" : String.valueOf(activity.activityTypeId);
    }

    private static String emptyActivitySuggestionJson() {
        return "{\n"
                + "  \"message\": \"Chưa có dữ liệu hoạt động phù hợp trong danh mục.\",\n"
                + "  \"mealBudget\": 0,\n"
                + "  \"options\": []\n"
                + "}";
    }

    private static MealOption calculateMealOption(String name, int calories, double pRatio, double cRatio, double fRatio, double density, String unit) {
        MealOption info = new MealOption();
        info.name = name;
        info.calories = calories;
        
        // Exact macro grams calculations
        info.proteinG = (int) Math.round((calories * pRatio) / 4.0);
        info.carbsG = (int) Math.round((calories * cRatio) / 4.0);
        info.fatG = (int) Math.round((calories * fRatio) / 9.0);
        
        // Adjust to ensure calorie total matches macros
        int calculatedCalories = info.proteinG * 4 + info.carbsG * 4 + info.fatG * 9;
        int diff = calories - calculatedCalories;
        if (diff != 0) {
            info.carbsG += (diff / 4);
        }
        
        info.servingSizeG = (int) Math.round(calories / density);
        info.amount = "1 " + unit + " (~" + info.servingSizeG + "g)";
        return info;
    }

    private static String[] getOptionFromPool(String mealType, int index, PlannerSuggestRequest context, List<String> extraExcluded) {
        if ("breakfast".equals(mealType)) {
            String[][] list = {
                {"Phở gà xé hành hoa", "bát", "1.2"},
                {"Bánh mì kẹp trứng ốp la & dưa leo", "chiếc", "1.5"},
                {"Bún mọc sườn heo & dọc mùng", "bát", "1.2"},
                {"Cháo yến mạch nấu ức gà xé & nấm", "bát", "0.8"},
                {"Hủ tiếu Nam Vang tôm & thịt nạc", "bát", "1.2"},
                {"Khoai lang luộc & 2 quả trứng luộc", "phần", "1.3"},
                {"Bún bắp bò luộc nấu dứa", "bát", "1.2"}
            };
            return selectOption(list, index, context, extraExcluded);
        } else if ("dinner".equals(mealType)) {
            String[][] list = {
                {"Cơm gạo lứt, cá thu sốt cà chua & canh rau ngót thịt bằm", "đĩa", "1.1"},
                {"Cơm trắng, thịt heo thăn luộc & canh rau cải ngọt", "đĩa", "1.2"},
                {"Bún tươi ăn kèm thịt bò xào sả hành & rau sống", "bát", "1.0"},
                {"Cơm trắng, đậu phụ nhồi thịt băm sốt cà & canh bí đao", "đĩa", "1.1"},
                {"Cơm gạo lứt, mực tươi xào dứa dưa chuột & canh cải xanh", "đĩa", "1.1"},
                {"Cơm trắng, đùi gà hấp lá chanh (bỏ da) & canh bí đỏ", "đĩa", "1.2"},
                {"Cơm gạo lứt, sườn heo thăn rim chua ngọt & canh khổ qua nhồi thịt", "đĩa", "1.3"}
            };
            return selectOption(list, index, context, extraExcluded);
        } else if ("afternoon_snack".equals(mealType) || "snacks".equals(mealType) || "snack".equals(mealType)) {
            String[][] list = {
                {"Sữa chua không đường & 1 quả táo nhỏ", "hũ", "0.8"},
                {"1 quả chuối tiêu chín & 1 ly sữa đậu nành ít đường", "phần", "0.7"},
                {"Hạt điều, hạnh nhân sấy khô & dưa hấu miếng", "phần", "1.8"},
                {"Khoai lang mật nướng nhỏ", "phần", "1.2"},
                {"Sữa chua Hy Lạp trộn hạt chia & dâu tây", "hũ", "0.9"},
                {"Bánh yến mạch ăn kiêng & 1 quả lê", "phần", "1.1"},
                {"Đu đủ chín cắt miếng & sữa hạt điều tự chế", "phần", "0.7"}
            };
            return selectOption(list, index, context, extraExcluded);
        } else { // lunch
            String[][] list = {
                {"Cơm gạo lứt, ức gà áp chảo & súp lơ xanh luộc", "đĩa", "1.3"},
                {"Cơm trắng, thịt bò xào hành tây & canh cải ngọt", "đĩa", "1.3"},
                {"Cơm gạo lứt, cá hồi áp chảo sốt tương & măng tây", "đĩa", "1.4"},
                {"Cơm trắng, tôm rim thịt nạc vai & bắp cải luộc", "đĩa", "1.3"},
                {"Cơm gạo lứt, thịt heo thăn rim sả & canh rau cải cúc", "đĩa", "1.3"},
                {"Cơm trắng, cá quả kho tộ & rau muống luộc", "đĩa", "1.2"},
                {"Cơm gạo lứt, thịt heo luộc thái mỏng & canh bí xanh", "đĩa", "1.1"}
            };
            return selectOption(list, index, context, extraExcluded);
        }
    }

    private static String[] selectOption(String[][] list, int index, PlannerSuggestRequest context, List<String> extraExcluded) {
        int start = Math.abs(index) % list.length;
        for (int i = 0; i < list.length; i++) {
            String[] candidate = list[(start + i) % list.length];
            if (!isExcluded(candidate[0], context, extraExcluded)) {
                return candidate;
            }
        }
        return list[start];
    }

    private static boolean isExcluded(String name, PlannerSuggestRequest context, List<String> extraExcluded) {
        List<String> excluded = new ArrayList<>();
        if (context.getExcludedFoodNames() != null) {
            excluded.addAll(context.getExcludedFoodNames());
        }
        if (extraExcluded != null) {
            excluded.addAll(extraExcluded);
        }
        return excluded.stream()
                .filter(item -> item != null && !item.isBlank())
                .anyMatch(item -> item.equalsIgnoreCase(name));
    }

    private static List<ActivityInfo> getExerciseOptions(PlannerSuggestRequest context, String goal, double weight, int index,
                                                         List<ActivityCandidate> activityCatalog) {
        List<ActivityInfo> pool = new ArrayList<>();
        List<Integer> selectedActivityTypeIds = context.getSelectedActivityTypeIds() == null
                ? List.of()
                : context.getSelectedActivityTypeIds().stream()
                        .filter(id -> id != null && id > 0)
                        .distinct()
                        .toList();
        List<String> selectedNames = context.getSelectedActivityNames() == null
                ? List.of()
                : context.getSelectedActivityNames().stream()
                        .filter(name -> name != null && !name.isBlank())
                        .distinct()
                        .toList();
        for (Integer id : selectedActivityTypeIds) {
            findCatalogActivityById(id, activityCatalog)
                    .map(candidate -> buildActivityInfo(candidate, estimateDurationMinutes(displayActivityName(candidate)), weight))
                    .ifPresent(pool::add);
        }
        if (!selectedNames.isEmpty()) {
            for (String name : selectedNames) {
                boolean alreadySelectedById = selectedActivityTypeIds.stream()
                        .map(id -> findCatalogActivityById(id, activityCatalog))
                        .flatMap(java.util.Optional::stream)
                        .anyMatch(candidate -> normalizeText(candidate.name()).equals(normalizeText(name))
                                || normalizeText(candidate.nameVi()).equals(normalizeText(name)));
                if (alreadySelectedById) {
                    continue;
                }
                int duration = estimateDurationMinutes(name);
                findCatalogActivityByName(name, activityCatalog)
                        .map(candidate -> buildActivityInfo(candidate, duration, weight))
                        .ifPresent(pool::add);
            }
        }

        // If the catalog service is temporarily unavailable, retain the IDs
        // selected by the user. They are still valid catalog references for
        // the activity service when it persists workout_plan_exercises.
        if (pool.isEmpty() && !selectedActivityTypeIds.isEmpty()) {
            for (int i = 0; i < selectedActivityTypeIds.size(); i++) {
                String name = i < selectedNames.size() ? selectedNames.get(i) : "Hoạt động đã chọn";
                int duration = estimateDurationMinutes(name);
                double met = estimateMet(name);
                pool.add(new ActivityInfo(
                        selectedActivityTypeIds.get(i),
                        name,
                        duration,
                        calculateCaloriesBurned(met, weight, duration),
                        met
                ));
            }
        }

        if (!pool.isEmpty()) {
            // The user explicitly selected these activities.  They are not
            // alternatives: every selected type must become an exercise in
            // the same daily workout plan.
            List<ActivityInfo> selectedActivities = onlyCatalogActivities(pool);
            return adjustActivitiesToDailyTarget(selectedActivities, context, weight);
        }

        List<ActivityInfo> catalogPool = buildCatalogActivityPool(goal, weight, activityCatalog);
        if (!catalogPool.isEmpty()) {
            return pickActivityOptions(catalogPool.stream()
                    .map(activity -> adjustActivityToTarget(activity, context, weight))
                    .toList(), index);
        }

        if (isFatLossGoal(goal)) {
            pool.add(new ActivityInfo("Chạy bộ ngoài trời (Cardio giảm mỡ)", 35, calculateCaloriesBurned(8.0, weight, 35)));
            pool.add(new ActivityInfo("Tập HIIT toàn thân đốt mỡ nhanh", 25, calculateCaloriesBurned(8.0, weight, 25)));
            pool.add(new ActivityInfo("Đạp xe thể thao (Cardio sức bền)", 45, calculateCaloriesBurned(6.0, weight, 45)));
            pool.add(new ActivityInfo("Nhảy dây tốc độ trung bình", 25, calculateCaloriesBurned(10.0, weight, 25)));
            pool.add(new ActivityInfo("Bơi lội tự do rèn luyện toàn thân", 40, calculateCaloriesBurned(7.0, weight, 40)));
            pool.add(new ActivityInfo("Đi bộ nhanh ngoài công viên", 50, calculateCaloriesBurned(4.5, weight, 50)));
            pool.add(new ActivityInfo("Tập Yoga kéo giãn sâu toàn thân", 35, calculateCaloriesBurned(2.5, weight, 35)));
        } else if (isStrengthGoal(goal)) {
            pool.add(new ActivityInfo("Tập Gym - Nhóm cơ Chest & Triceps (Kháng lực)", 50, calculateCaloriesBurned(5.0, weight, 50)));
            pool.add(new ActivityInfo("Tập Gym - Nhóm cơ Back & Biceps (Tăng lực kéo)", 50, calculateCaloriesBurned(5.0, weight, 50)));
            pool.add(new ActivityInfo("Tập Gym - Cơ đùi và cơ mông (Lower Body)", 45, calculateCaloriesBurned(5.5, weight, 45)));
            pool.add(new ActivityInfo("Tập Calisthenics (Push-up, Pull-up, Squat tại nhà)", 40, calculateCaloriesBurned(4.5, weight, 40)));
            pool.add(new ActivityInfo("Tập Gym - Cơ vai và cơ bụng", 45, calculateCaloriesBurned(4.5, weight, 45)));
            pool.add(new ActivityInfo("Tập Cardio nhẹ (Đạp xe) kết hợp hít xà", 35, calculateCaloriesBurned(5.5, weight, 35)));
            pool.add(new ActivityInfo("Nghỉ ngơi phục hồi & Yoga nhẹ nhàng", 30, calculateCaloriesBurned(2.5, weight, 30)));
        } else { // MAINTAIN_WEIGHT or default
            pool.add(new ActivityInfo("Đi bộ nhanh rèn luyện sức bền", 40, calculateCaloriesBurned(4.0, weight, 40)));
            pool.add(new ActivityInfo("Tập Aerobic nhảy nhịp điệu", 40, calculateCaloriesBurned(5.0, weight, 40)));
            pool.add(new ActivityInfo("Đạp xe quanh hồ ngắm cảnh thư giãn", 45, calculateCaloriesBurned(5.0, weight, 45)));
            pool.add(new ActivityInfo("Bơi lội thư giãn nâng cao thể lực", 35, calculateCaloriesBurned(6.0, weight, 35)));
            pool.add(new ActivityInfo("Chạy bộ nhẹ nhàng dưỡng sinh", 30, calculateCaloriesBurned(6.5, weight, 30)));
            pool.add(new ActivityInfo("Tập thể dục tự do tại nhà", 35, calculateCaloriesBurned(3.5, weight, 35)));
            pool.add(new ActivityInfo("Tập Yoga thư giãn phục hồi tinh thần", 40, calculateCaloriesBurned(2.5, weight, 40)));
        }

        pool = pool.stream()
                .map(activity -> resolveActivityInfo(activity, weight, activityCatalog))
                .map(activity -> adjustActivityToTarget(activity, context, weight))
                .toList();

        return pickActivityOptions(pool, index);
    }

    private static List<ActivityInfo> pickActivityOptions(List<ActivityInfo> pool, int index) {
        List<ActivityInfo> result = new ArrayList<>();
        int size = pool.size();
        if (size > 0) {
            int firstIdx = Math.abs(index) % size;
            if (size == 1) {
                ActivityInfo base = pool.get(firstIdx);
                int alternativeDuration = Math.max(base.durationMinutes + 10,
                        (int) Math.round(base.durationMinutes * 1.25));
                result.add(base);
                result.add(new ActivityInfo(
                        base.activityTypeId,
                        base.name,
                        alternativeDuration,
                        base.met > 0
                                ? (int) Math.round(base.caloriesBurned * (alternativeDuration / (double) base.durationMinutes))
                                : base.caloriesBurned,
                        base.met
                ));
                return result;
            }
            int secondIdx = Math.abs(index + 1) % size;
            if (firstIdx == secondIdx) {
                secondIdx = (firstIdx + 1) % size;
            }
            result.add(pool.get(firstIdx));
            result.add(pool.get(secondIdx));
        }
        return result;
    }

    private static int estimateDurationMinutes(String activityName) {
        String normalized = activityName == null ? "" : activityName.toLowerCase();
        if (normalized.contains("hiit") || normalized.contains("nhảy dây")) return 25;
        if (normalized.contains("yoga") || normalized.contains("giãn")) return 35;
        if (normalized.contains("đi bộ") || normalized.contains("di bo")) return 45;
        if (normalized.contains("gym") || normalized.contains("tạ") || normalized.contains("ta")) return 45;
        if (normalized.contains("bơi") || normalized.contains("boi") || normalized.contains("đạp") || normalized.contains("dap")) return 40;
        return 30;
    }

    private static double estimateMet(String activityName) {
        String normalized = activityName == null ? "" : activityName.toLowerCase();
        if (normalized.contains("hiit") || normalized.contains("nhảy dây")) return 8.0;
        if (normalized.contains("chạy") || normalized.contains("chay")) return 7.5;
        if (normalized.contains("bơi") || normalized.contains("boi")) return 7.0;
        if (normalized.contains("đạp") || normalized.contains("dap")) return 6.0;
        if (normalized.contains("gym") || normalized.contains("tạ") || normalized.contains("ta")) return 5.0;
        if (normalized.contains("đi bộ") || normalized.contains("di bo")) return 4.0;
        if (normalized.contains("yoga") || normalized.contains("giãn")) return 2.5;
        return 4.5;
    }

    private static java.util.Optional<ActivityCandidate> findCatalogActivityById(Integer id, List<ActivityCandidate> activityCatalog) {
        if (id == null || activityCatalog == null || activityCatalog.isEmpty()) {
            return java.util.Optional.empty();
        }
        return activityCatalog.stream()
                .filter(candidate -> candidate.id() == id)
                .findFirst();
    }

    private static java.util.Optional<ActivityCandidate> findCatalogActivityByName(String activityName, List<ActivityCandidate> activityCatalog) {
        if (activityName == null || activityCatalog == null || activityCatalog.isEmpty()) {
            return java.util.Optional.empty();
        }
        String normalized = normalizeText(activityName);
        return activityCatalog.stream()
                .filter(candidate -> normalized.equals(normalizeText(candidate.name()))
                        || normalized.equals(normalizeText(candidate.nameVi())))
                .findFirst();
    }

    private static List<ActivityInfo> onlyCatalogActivities(List<ActivityInfo> activities) {
        return activities.stream()
                .filter(activity -> activity.activityTypeId != null)
                .toList();
    }

    private static String displayActivityName(ActivityCandidate candidate) {
        if (candidate.nameVi() != null && !candidate.nameVi().isBlank()) {
            return candidate.nameVi();
        }
        return candidate.name();
    }

    private static ActivityInfo buildActivityInfo(ActivityCandidate candidate, int durationMinutes, double weight) {
        String name = displayActivityName(candidate);
        double met = candidate.metValue().doubleValue();
        return new ActivityInfo(candidate.id(), name, durationMinutes, calculateCaloriesBurned(met, weight, durationMinutes), met);
    }

    private static List<ActivityInfo> buildCatalogActivityPool(String goal, double weight, List<ActivityCandidate> activityCatalog) {
        if (activityCatalog == null || activityCatalog.isEmpty()) {
            return List.of();
        }

        List<ActivityInfo> preferred = activityCatalog.stream()
                .filter(candidate -> isPreferredActivityForGoal(candidate, goal))
                .map(candidate -> buildActivityInfo(candidate, estimateDurationMinutes(displayActivityName(candidate)), weight))
                .toList();
        if (!preferred.isEmpty()) {
            return preferred;
        }

        return activityCatalog.stream()
                .map(candidate -> buildActivityInfo(candidate, estimateDurationMinutes(displayActivityName(candidate)), weight))
                .toList();
    }

    private static boolean isPreferredActivityForGoal(ActivityCandidate candidate, String goal) {
        String category = candidate.category() == null ? "OTHER" : candidate.category().trim().toUpperCase();
        double met = candidate.metValue() == null ? 0 : candidate.metValue().doubleValue();

        if (isFatLossGoal(goal)) {
            return List.of("CARDIO", "WALKING", "OUTDOOR", "SPORTS").contains(category) || met >= 5.5;
        }
        if (isStrengthGoal(goal)) {
            return "STRENGTH".equals(category) || met >= 4.5;
        }
        return List.of("CARDIO", "WALKING", "FLEXIBILITY", "SPORTS", "OUTDOOR", "DAILY").contains(category);
    }

    private static ActivityInfo buildActivityInfo(String name, int durationMinutes, double weight,
                                                  List<ActivityCandidate> activityCatalog) {
        return resolveActivityInfo(new ActivityInfo(name, durationMinutes, 0), weight, activityCatalog);
    }

    private static ActivityInfo resolveActivityInfo(ActivityInfo activity, double weight,
                                                    List<ActivityCandidate> activityCatalog) {
        double met = findCatalogMet(activity.name, activityCatalog);
        if (met <= 0) {
            met = activity.met > 0 ? activity.met : estimateMet(activity.name);
        }

        return new ActivityInfo(
                activity.activityTypeId,
                activity.name,
                activity.durationMinutes,
                calculateCaloriesBurned(met, weight, activity.durationMinutes),
                met
        );
    }

    private static ActivityInfo adjustActivityToTarget(ActivityInfo activity, PlannerSuggestRequest context, double weight) {
        int dailyGoal = context.getDailyActivityGoalKcal() == null ? 0 : context.getDailyActivityGoalKcal();
        if (dailyGoal <= 0 || activity.met <= 0) {
            return activity;
        }

        int burned = context.getActivityCaloriesBurned() == null ? 0 : Math.max(0, context.getActivityCaloriesBurned());
        int remaining = dailyGoal - burned;
        if (remaining <= 0) {
            return activity;
        }

        int target = Math.max(60, remaining);
        if (activity.caloriesBurned <= target * 1.15 && activity.caloriesBurned >= target * 0.55) {
            return activity;
        }

        int adjustedDuration = (int) Math.round((target * 60.0) / (activity.met * weight));
        adjustedDuration = Math.max(10, Math.min(75, adjustedDuration));
        return new ActivityInfo(
                activity.activityTypeId,
                activity.name,
                adjustedDuration,
                calculateCaloriesBurned(activity.met, weight, adjustedDuration),
                activity.met
        );
    }

    private static List<ActivityInfo> adjustActivitiesToDailyTarget(List<ActivityInfo> activities,
                                                                     PlannerSuggestRequest context,
                                                                     double weight) {
        int dailyGoal = context.getDailyActivityGoalKcal() == null ? 0 : context.getDailyActivityGoalKcal();
        int burned = context.getActivityCaloriesBurned() == null ? 0 : Math.max(0, context.getActivityCaloriesBurned());
        int remaining = dailyGoal - burned;
        if (activities.isEmpty() || remaining <= 0) {
            return activities;
        }

        // Divide the remaining daily target across every exercise. This keeps
        // a four-exercise plan near the requested total instead of assigning
        // the full daily target to each exercise.
        int baseTarget = Math.max(1, remaining / activities.size());
        int remainder = Math.max(0, remaining % activities.size());
        List<ActivityInfo> result = new ArrayList<>();
        for (int i = 0; i < activities.size(); i++) {
            ActivityInfo activity = activities.get(i);
            int target = baseTarget + (i < remainder ? 1 : 0);
            if (activity.met <= 0) {
                result.add(activity);
                continue;
            }
            int duration = (int) Math.round((target * 60.0) / (activity.met * weight));
            duration = Math.max(10, Math.min(75, duration));
            result.add(new ActivityInfo(activity.activityTypeId, activity.name, duration,
                    calculateCaloriesBurned(activity.met, weight, duration), activity.met));
        }
        return result;
    }

    private static double findCatalogMet(String activityName, List<ActivityCandidate> activityCatalog) {
        if (activityName == null || activityCatalog == null || activityCatalog.isEmpty()) {
            return 0;
        }

        String normalized = normalizeText(activityName);
        for (ActivityCandidate candidate : activityCatalog) {
            if (normalized.equals(normalizeText(candidate.name()))
                    || normalized.equals(normalizeText(candidate.nameVi()))) {
                return candidate.metValue().doubleValue();
            }
        }
        for (ActivityCandidate candidate : activityCatalog) {
            String name = normalizeText(candidate.name());
            String nameVi = normalizeText(candidate.nameVi());
            if ((!name.isBlank() && (normalized.contains(name) || name.contains(normalized)))
                    || (!nameVi.isBlank() && (normalized.contains(nameVi) || nameVi.contains(normalized)))) {
                return candidate.metValue().doubleValue();
            }
        }
        return 0;
    }

    private static String normalizeText(String value) {
        return value == null
                ? ""
                : value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private static List<ActivityInfo> getActivities(String goal, double weight, int index,
                                                    List<ActivityCandidate> activityCatalog,
                                                    PlannerSuggestRequest context) {
        List<ActivityInfo> catalogPool = buildCatalogActivityPool(goal, weight, activityCatalog);
        if (!catalogPool.isEmpty()) {
            return pickActivityOptions(catalogPool.stream()
                    .map(activity -> adjustActivityToTarget(activity, context, weight))
                    .toList(), index);
        }

        List<ActivityInfo> list = new ArrayList<>();
        int key = Math.abs(index) % 7;
        if (isFatLossGoal(goal)) {
            switch (key) {
                case 0:
                    list.add(new ActivityInfo("Chạy bộ ngoài trời (Cardio giảm mỡ)", 35, calculateCaloriesBurned(8.0, weight, 35)));
                    list.add(new ActivityInfo("Gập bụng & Plank cơ bản", 15, calculateCaloriesBurned(3.5, weight, 15)));
                    break;
                case 1:
                    list.add(new ActivityInfo("Tập HIIT toàn thân đốt mỡ nhanh", 25, calculateCaloriesBurned(8.0, weight, 25)));
                    break;
                case 2:
                    list.add(new ActivityInfo("Đạp xe thể thao (Cardio sức bền)", 45, calculateCaloriesBurned(6.0, weight, 45)));
                    break;
                case 3:
                    list.add(new ActivityInfo("Nhảy dây tốc độ trung bình", 25, calculateCaloriesBurned(10.0, weight, 25)));
                    list.add(new ActivityInfo("Giãn cơ sau tập", 10, calculateCaloriesBurned(2.0, weight, 10)));
                    break;
                case 4:
                    list.add(new ActivityInfo("Bơi lội tự do rèn luyện toàn thân", 40, calculateCaloriesBurned(7.0, weight, 40)));
                    break;
                case 5:
                    list.add(new ActivityInfo("Đi bộ nhanh ngoài công viên", 50, calculateCaloriesBurned(4.5, weight, 50)));
                    break;
                default:
                    list.add(new ActivityInfo("Tập Yoga kéo giãn sâu toàn thân", 35, calculateCaloriesBurned(2.5, weight, 35)));
            }
        } else if (isStrengthGoal(goal)) {
            switch (key) {
                case 0:
                    list.add(new ActivityInfo("Tập Gym - Nhóm cơ Chest & Triceps (Kháng lực)", 50, calculateCaloriesBurned(5.0, weight, 50)));
                    break;
                case 1:
                    list.add(new ActivityInfo("Tập Gym - Nhóm cơ Back & Biceps (Tăng lực kéo)", 50, calculateCaloriesBurned(5.0, weight, 50)));
                    break;
                case 2:
                    list.add(new ActivityInfo("Tập Gym - Cơ đùi và cơ mông (Lower Body)", 45, calculateCaloriesBurned(5.5, weight, 45)));
                    break;
                case 3:
                    list.add(new ActivityInfo("Tập Calisthenics (Push-up, Pull-up, Squat tại nhà)", 40, calculateCaloriesBurned(4.5, weight, 40)));
                    break;
                case 4:
                    list.add(new ActivityInfo("Tập Gym - Cơ vai và cơ bụng", 45, calculateCaloriesBurned(4.5, weight, 45)));
                    break;
                case 5:
                    list.add(new ActivityInfo("Tập Cardio nhẹ (Đạp xe) kết hợp hít xà", 35, calculateCaloriesBurned(5.5, weight, 35)));
                    break;
                default:
                    list.add(new ActivityInfo("Nghỉ ngơi phục hồi & Yoga nhẹ nhàng", 30, calculateCaloriesBurned(2.5, weight, 30)));
            }
        } else { // MAINTAIN_WEIGHT or default
            switch (key) {
                case 0:
                    list.add(new ActivityInfo("Đi bộ nhanh rèn luyện sức bền", 40, calculateCaloriesBurned(4.0, weight, 40)));
                    break;
                case 1:
                    list.add(new ActivityInfo("Tập Aerobic nhảy nhịp điệu", 40, calculateCaloriesBurned(5.0, weight, 40)));
                    break;
                case 2:
                    list.add(new ActivityInfo("Đạp xe quanh hồ ngắm cảnh thư giãn", 45, calculateCaloriesBurned(5.0, weight, 45)));
                    break;
                case 3:
                    list.add(new ActivityInfo("Bơi lội thư giãn nâng cao thể lực", 35, calculateCaloriesBurned(6.0, weight, 35)));
                    break;
                case 4:
                    list.add(new ActivityInfo("Chạy bộ nhẹ nhàng dưỡng sinh", 30, calculateCaloriesBurned(6.5, weight, 30)));
                    break;
                case 5:
                    list.add(new ActivityInfo("Tập thể dục tự do tại nhà", 35, calculateCaloriesBurned(3.5, weight, 35)));
                    break;
                default:
                    list.add(new ActivityInfo("Tập Yoga thư giãn phục hồi tinh thần", 40, calculateCaloriesBurned(2.5, weight, 40)));
            }
        }
        return list.stream()
                .map(activity -> resolveActivityInfo(activity, weight, activityCatalog))
                .map(activity -> adjustActivityToTarget(activity, context, weight))
                .toList();
    }

    private static String normalizeGoal(String goal) {
        if (goal == null || goal.isBlank()) {
            return "MAINTAIN_WEIGHT";
        }

        String normalized = goal.trim().toUpperCase();
        return "IMPROVE_HEALTH".equals(normalized) ? "IMPROVE_FITNESS" : normalized;
    }

    private static boolean isFatLossGoal(String goal) {
        return "LOSE_WEIGHT".equals(goal) || "CUTTING".equals(goal);
    }

    private static boolean isStrengthGoal(String goal) {
        return "GAIN_MUSCLE".equals(goal) || "GAIN_WEIGHT".equals(goal) || "BODY_RECOMPOSITION".equals(goal);
    }

    private static int calculateCaloriesBurned(double met, double weight, int durationMinutes) {
        return (int) Math.round(met * weight * (durationMinutes / 60.0));
    }
}
