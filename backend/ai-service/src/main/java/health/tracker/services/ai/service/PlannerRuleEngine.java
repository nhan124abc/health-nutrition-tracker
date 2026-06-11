package health.tracker.services.ai.service;

import health.tracker.services.ai.dto.PlannerSuggestRequest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class PlannerRuleEngine {

    public static String generatePlan(PlannerSuggestRequest context) {
        int goalCalories = context.getDailyCalorieGoal() != null ? context.getDailyCalorieGoal() : 2000;
        String goal = context.getGoal() != null ? context.getGoal().toUpperCase() : "MAINTAIN_WEIGHT";
        double weight = context.getWeightKg() != null ? context.getWeightKg() : 70.0;
        String mealType = context.getMealType() != null ? context.getMealType().toLowerCase() : "lunch";
        int offset = context.getSuggestionOffset() != null ? context.getSuggestionOffset() : 0;
        
        int dayOfWeek = LocalDate.now().getDayOfWeek().getValue();

        if ("exercise".equals(mealType)) {
            List<ActivityInfo> exerciseOptions = getExerciseOptions(goal, weight, dayOfWeek + offset);
            ActivityInfo act1 = exerciseOptions.get(0);
            ActivityInfo act2 = exerciseOptions.get(1);

            StringBuilder sb = new StringBuilder();
            sb.append("{\n");
            sb.append("  \"message\": \"Gợi ý hoạt động vận động lành mạnh, phù hợp với thể trạng của bạn.\",\n");
            sb.append("  \"mealBudget\": 0,\n");
            sb.append("  \"options\": [\n");
            sb.append(String.format("    { \"name\": \"%s\", \"amount\": \"%d phút\", \"servingSizeG\": 0, \"calories\": %d, \"caloriesBurned\": %d, \"proteinG\": 0, \"carbsG\": 0, \"fatG\": 0 }",
                    act1.name, act1.durationMinutes, act1.caloriesBurned, act1.caloriesBurned));
            sb.append(",\n");
            sb.append(String.format("    { \"name\": \"%s\", \"amount\": \"%d phút\", \"servingSizeG\": 0, \"calories\": %d, \"caloriesBurned\": %d, \"proteinG\": 0, \"carbsG\": 0, \"fatG\": 0 }\n",
                    act2.name, act2.durationMinutes, act2.caloriesBurned, act2.caloriesBurned));
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
        } else if ("LOSE_WEIGHT".equals(goal)) {
            proteinRatio = 0.35;
            carbsRatio = 0.35;
            fatRatio = 0.30;
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

        int mealBudget = (int) Math.round(goalCalories * share);

        // 3. Select 2 alternative options from pool
        String[] opt1 = getOptionFromPool(mealType, dayOfWeek + offset);
        String[] opt2 = getOptionFromPool(mealType, dayOfWeek + offset + 3);

        double density1 = Double.parseDouble(opt1[2]);
        double density2 = Double.parseDouble(opt2[2]);

        MealOption m1 = calculateMealOption(opt1[0], mealBudget, proteinRatio, carbsRatio, fatRatio, density1, opt1[1]);
        MealOption m2 = calculateMealOption(opt2[0], mealBudget, proteinRatio, carbsRatio, fatRatio, density2, opt2[1]);

        // 4. Exercise recommendations (2 options)
        List<ActivityInfo> activities = getActivities(goal, weight, dayOfWeek + offset);

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
            sb.append(String.format("    { \"name\": \"%s\", \"durationMinutes\": %d, \"caloriesBurned\": %d }",
                    act.name, act.durationMinutes, act.caloriesBurned));
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
        String name;
        int durationMinutes;
        int caloriesBurned;
        
        ActivityInfo(String name, int durationMinutes, int caloriesBurned) {
            this.name = name;
            this.durationMinutes = durationMinutes;
            this.caloriesBurned = caloriesBurned;
        }
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

    private static String[] getOptionFromPool(String mealType, int index) {
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
            return list[Math.abs(index) % list.length];
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
            return list[Math.abs(index) % list.length];
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
            return list[Math.abs(index) % list.length];
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
            return list[Math.abs(index) % list.length];
        }
    }

    private static List<ActivityInfo> getExerciseOptions(String goal, double weight, int index) {
        List<ActivityInfo> pool = new ArrayList<>();
        if ("LOSE_WEIGHT".equals(goal)) {
            pool.add(new ActivityInfo("Chạy bộ ngoài trời (Cardio giảm mỡ)", 35, calculateCaloriesBurned(8.0, weight, 35)));
            pool.add(new ActivityInfo("Tập HIIT toàn thân đốt mỡ nhanh", 25, calculateCaloriesBurned(8.0, weight, 25)));
            pool.add(new ActivityInfo("Đạp xe thể thao (Cardio sức bền)", 45, calculateCaloriesBurned(6.0, weight, 45)));
            pool.add(new ActivityInfo("Nhảy dây tốc độ trung bình", 25, calculateCaloriesBurned(10.0, weight, 25)));
            pool.add(new ActivityInfo("Bơi lội tự do rèn luyện toàn thân", 40, calculateCaloriesBurned(7.0, weight, 40)));
            pool.add(new ActivityInfo("Đi bộ nhanh ngoài công viên", 50, calculateCaloriesBurned(4.5, weight, 50)));
            pool.add(new ActivityInfo("Tập Yoga kéo giãn sâu toàn thân", 35, calculateCaloriesBurned(2.5, weight, 35)));
        } else if ("GAIN_MUSCLE".equals(goal)) {
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

        List<ActivityInfo> result = new ArrayList<>();
        int size = pool.size();
        if (size > 0) {
            int firstIdx = Math.abs(index) % size;
            int secondIdx = Math.abs(index + 1) % size;
            if (firstIdx == secondIdx) {
                secondIdx = (firstIdx + 1) % size;
            }
            result.add(pool.get(firstIdx));
            result.add(pool.get(secondIdx));
        }
        return result;
    }

    private static List<ActivityInfo> getActivities(String goal, double weight, int index) {
        List<ActivityInfo> list = new ArrayList<>();
        int key = Math.abs(index) % 7;
        if ("LOSE_WEIGHT".equals(goal)) {
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
        } else if ("GAIN_MUSCLE".equals(goal)) {
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
        return list;
    }

    private static int calculateCaloriesBurned(double met, double weight, int durationMinutes) {
        return (int) Math.round(met * weight * (durationMinutes / 60.0));
    }
}
