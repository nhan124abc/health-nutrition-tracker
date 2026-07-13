package health.tracker.services.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health.tracker.services.ai.dto.ChatRequest;
import health.tracker.services.ai.dto.ChatMessageDto;
import health.tracker.services.ai.dto.ChatResponse;
import health.tracker.services.ai.dto.PlannerSuggestRequest;
import health.tracker.services.ai.entity.AiUsageLimit;
import health.tracker.services.ai.entity.ChatMessage;
import health.tracker.services.ai.exception.AppException;
import health.tracker.services.ai.repository.AiUsageLimitRepository;
import health.tracker.services.ai.repository.ChatMessageRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
public class AiChatService {

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;
    private final ChatMessageRepository chatMessageRepository;
    private final AiUsageLimitRepository usageLimitRepository;
    private final String model;
    private final int guestDailyLimit;
    private final int userDailyLimit;
    private final ObjectMapper objectMapper;
    private final NutritionCatalogClient nutritionCatalogClient;
    private final ActivityCatalogClient activityCatalogClient;
    private final UserContextClient userContextClient;

    public AiChatService(
            ObjectProvider<ChatClient.Builder> chatClientBuilderProvider,
            ChatMessageRepository chatMessageRepository,
            AiUsageLimitRepository usageLimitRepository,
            ObjectMapper objectMapper,
            NutritionCatalogClient nutritionCatalogClient,
            ActivityCatalogClient activityCatalogClient,
            UserContextClient userContextClient,
            @Value("${spring.ai.openai.chat.options.model:llama-3.1-8b-instant}") String model,
            @Value("${ai.limits.guest-daily:5}") int guestDailyLimit,
            @Value("${ai.limits.user-daily:50}") int userDailyLimit) {
        this.chatClientBuilderProvider = chatClientBuilderProvider;
        this.chatMessageRepository = chatMessageRepository;
        this.usageLimitRepository = usageLimitRepository;
        this.objectMapper = objectMapper;
        this.nutritionCatalogClient = nutritionCatalogClient;
        this.activityCatalogClient = activityCatalogClient;
        this.userContextClient = userContextClient;
        this.model = model;
        this.guestDailyLimit = guestDailyLimit;
        this.userDailyLimit = userDailyLimit;
    }

    @Transactional
    public ChatResponse chat(String userId, String guestId, String username, String role, ChatRequest request) {
        ChatOwner owner = resolveOwner(userId, guestId);
        enforceDailyLimit(owner, role);

        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();

        if (builder == null) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "AI model is not configured");
        }

        chatMessageRepository.save(ChatMessage.builder()
                .userId(owner.userId())
                .guestId(owner.guestId())
                .role(ChatMessage.Role.USER)
                .content(request.getMessage())
                .build());

        List<ChatMessage> recentMessages = recentMessages(owner, 10);
        String userHealthSnapshot = userContextClient.buildSnapshot(owner.userId());

        String systemPrompt = """
                You are the AI assistant inside Health Nutrition Tracker.
                Give concise, practical answers about nutrition, activity, body metrics, and app usage.
                Personalize advice using the saved user health snapshot when it is available.
                If saved data is missing or unknown, say what information is missing instead of inventing numbers.
                Do not provide medical diagnosis. Encourage users to consult a healthcare professional for medical concerns.
                """;

        String userPrompt = """
                User id: %s
                Guest id: %s
                Username/email: %s
                Optional app context: %s
                Saved user health snapshot:
                %s

                Recent conversation:
                %s

                User message:
                %s
                """.formatted(
                owner.userId() == null ? "not logged in" : owner.userId(),
                owner.guestId() == null ? "none" : owner.guestId(),
                username == null || username.isBlank() ? "unknown" : username,
                request.getContext() == null || request.getContext().isBlank() ? "none" : request.getContext(),
                userHealthSnapshot,
                formatRecentMessages(recentMessages),
                request.getMessage()
        );

        String reply = builder
                .defaultSystem(systemPrompt)
                .build()
                .prompt()
                .user(userPrompt)
                .call()
                .content();

        ChatMessage assistantMessage = chatMessageRepository.save(ChatMessage.builder()
                .userId(owner.userId())
                .guestId(owner.guestId())
                .role(ChatMessage.Role.ASSISTANT)
                .content(reply)
                .model(model)
                .build());

        return ChatResponse.builder()
                .reply(reply)
                .model(model)
                .createdAt(assistantMessage.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getHistory(String userId, String guestId) {
        return recentMessages(resolveOwner(userId, guestId), 50)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void clearHistory(String userId, String guestId) {
        ChatOwner owner = resolveOwner(userId, guestId);

        if (owner.isAuthenticated()) {
            chatMessageRepository.deleteByUserId(owner.userId());
            return;
        }

        chatMessageRepository.deleteByGuestId(owner.guestId());
    }

    private void enforceDailyLimit(ChatOwner owner, String role) {
        if ("ADMIN".equalsIgnoreCase(role)) {
            return;
        }

        int limit = owner.isAuthenticated() ? userDailyLimit : guestDailyLimit;
        LocalDate today = LocalDate.now();
        AiUsageLimit usage = owner.isAuthenticated()
                ? usageLimitRepository.findByUserIdAndRequestDate(owner.userId(), today)
                        .orElseGet(() -> newUsage(owner, today))
                : usageLimitRepository.findByGuestIdAndRequestDate(owner.guestId(), today)
                        .orElseGet(() -> newUsage(owner, today));

        if (usage.getRequestCount() >= limit) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS,
                    "You reached today's AI question limit. Please try again tomorrow.");
        }

        usage.setRequestCount(usage.getRequestCount() + 1);
        usageLimitRepository.save(usage);
    }

    private AiUsageLimit newUsage(ChatOwner owner, LocalDate date) {
        return AiUsageLimit.builder()
                .userId(owner.userId())
                .guestId(owner.guestId())
                .requestDate(date)
                .requestCount(0)
                .build();
    }

    private List<ChatMessage> recentMessages(ChatOwner owner, int limit) {
        List<ChatMessage> messages;

        if (owner.isAuthenticated()) {
            messages = limit == 10
                    ? chatMessageRepository.findTop10ByUserIdOrderByCreatedAtDesc(owner.userId())
                    : chatMessageRepository.findTop50ByUserIdOrderByCreatedAtDesc(owner.userId());
        } else {
            messages = limit == 10
                    ? chatMessageRepository.findTop10ByGuestIdOrderByCreatedAtDesc(owner.guestId())
                    : chatMessageRepository.findTop50ByGuestIdOrderByCreatedAtDesc(owner.guestId());
        }

        Collections.reverse(messages);
        return messages;
    }

    private ChatOwner resolveOwner(String userId, String guestId) {
        String normalizedUserId = normalize(userId);
        String normalizedGuestId = normalize(guestId);

        if (normalizedUserId != null) {
            return new ChatOwner(normalizedUserId, null);
        }

        if (normalizedGuestId != null) {
            return new ChatOwner(null, normalizedGuestId);
        }

        throw new AppException(HttpStatus.BAD_REQUEST, "Missing user or guest identity");
    }

    private String formatRecentMessages(List<ChatMessage> messages) {
        if (messages.isEmpty()) {
            return "none";
        }

        return messages.stream()
                .map(message -> "%s: %s".formatted(message.getRole().name().toLowerCase(), message.getContent()))
                .toList()
                .toString();
    }

    private ChatMessageDto toDto(ChatMessage message) {
        return ChatMessageDto.builder()
                .id(message.getId())
                .role(message.getRole().name().toLowerCase())
                .content(message.getContent())
                .model(message.getModel())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeGoal(String goal) {
        String normalized = normalize(goal);
        if (normalized == null) {
            return "MAINTAIN_WEIGHT";
        }

        normalized = normalized.toUpperCase();
        return "IMPROVE_HEALTH".equals(normalized) ? "IMPROVE_FITNESS" : normalized;
    }

    private record ChatOwner(String userId, String guestId) {
        boolean isAuthenticated() {
            return userId != null;
        }
    }

    @Transactional
    public String generateDailyPlan(String userId, String guestId, PlannerSuggestRequest context) {
        if ("exercise".equalsIgnoreCase(context.getMealType())) {
            return generateFallbackPlan(context);
        }

        int budget = calculateMealBudget(context);
        int calorieBuffer = calculateCalorieBuffer(budget);
        try {
            // A recipe must fit the real meal budget. The UI must never
            // receive an option that will be rejected later on selection.
            List<NutritionCatalogClient.RecipeCandidate> recipes = getUsableRecipeSuggestions(context, budget);
            // Return the two existing recipes required by the planner before
            // considering any AI-generated fallback.
            if (recipes.size() >= 2) {
                log.info("Generated planner suggestions from nutrition recipes for userId={}, budget={}",
                        userId, budget);
                return normalizeRecipeSuggestions(recipes, budget, calorieBuffer, context);
            }
        } catch (Exception exception) {
            log.warn("Nutrition recipe lookup failed; continuing with AI/fallback planner: {}", exception.getMessage());
        }

        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();
        if (builder == null) {
            try {
                return generateCatalogFoodPlan(context, budget, calorieBuffer);
            } catch (Exception exception) {
                log.warn("Nutrition catalog fallback failed while AI model is unavailable: {}", exception.getMessage());
            }
            if (hasSelectedFoods(context)) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Không tìm thấy gợi ý phù hợp với thực phẩm đã chọn. Hãy chọn ít nguyên liệu hơn hoặc thử công thức đã lưu.");
            }
            log.warn("AI model is unavailable; using planner fallback");
            return generateFallbackPlan(context);
        }

        try {
            List<NutritionCatalogClient.FoodCandidate> foods = getPlannerFoodCatalog(context);
            if (foods.size() < 2) throw new IllegalStateException("Nutrition database has too few foods");
            String prompt = buildPlannerPrompt(context, budget, calorieBuffer, foods);
            String raw = builder
                    .defaultSystem("""
                            You are a Vietnamese nutrition meal planner. Return JSON only, without markdown.
                            Suggestions are informational and must use common foods with realistic nutrition values.
                            """)
                    .build()
                    .prompt()
                    .user(prompt)
                    .call()
                    .content();

            String normalized = validateAndNormalizePlan(raw, budget, calorieBuffer, context, foods, builder);
            normalized = persistGeneratedRecipes(userId, context, normalized);
            log.info("Generated planner suggestions with AI model={} for userId={}, budget={}",
                    model, userId, budget);
            return normalized;
        } catch (Exception exception) {
            try {
                return generateCatalogFoodPlan(context, budget, calorieBuffer, builder);
            } catch (Exception fallbackException) {
                log.warn("Nutrition catalog fallback failed after AI planner failure: {}", fallbackException.getMessage());
            }
            if (hasSelectedFoods(context)) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Không tìm thấy gợi ý phù hợp với thực phẩm đã chọn. Hãy chọn ít nguyên liệu hơn hoặc thử công thức đã lưu.");
            }
            log.warn("AI planner failed; using rule fallback: {}", exception.getMessage());
            return generateFallbackPlan(context);
        }
    }

    /** Save validated AI dishes as reusable recipes before returning them to Planner. */
    private String persistGeneratedRecipes(String userId, PlannerSuggestRequest context, String planJson) throws Exception {
        List<Long> selectedIds = normalizedLongList(context.getSelectedFoodIds());
        if (userId == null || selectedIds.isEmpty() || selectedIds.size() > 2) return planJson;

        long ownerId;
        try { ownerId = Long.parseLong(userId); } catch (NumberFormatException exception) { return planJson; }
        ObjectNode plan = (ObjectNode) objectMapper.readTree(planJson);
        for (JsonNode optionNode : plan.withArray("options")) {
            if (!(optionNode instanceof ObjectNode option)) continue;
            List<Map<String, Object>> ingredients = new java.util.ArrayList<>();
            for (JsonNode ingredient : option.withArray("ingredients")) {
                ingredients.add(Map.of(
                        "foodItemId", ingredient.path("foodItemId").asLong(),
                        "quantityG", ingredient.path("servingSizeG").decimalValue()));
            }
            long recipeId = nutritionCatalogClient.createRecipe(
                    ownerId,
                    option.path("nameEn").asText(option.path("name").asText()),
                    option.path("nameVi").asText(option.path("name").asText()),
                    option.path("preparation").asText(),
                    ingredients);
            option.put("recipeId", recipeId);
            option.put("source", "AI_SAVED_RECIPE");
        }
        plan.put("source", "AI_SAVED_RECIPE");
        return objectMapper.writeValueAsString(plan);
    }

    private String generateCatalogFoodPlan(PlannerSuggestRequest context, int budget, int calorieBuffer) throws Exception {
        return generateCatalogFoodPlan(context, budget, calorieBuffer, null);
    }

    private String generateCatalogFoodPlan(PlannerSuggestRequest context, int budget, int calorieBuffer,
                                           ChatClient.Builder builder) throws Exception {
        List<NutritionCatalogClient.FoodCandidate> foods = getPlannerFoodCatalog(context);
        if (foods.size() < 2) {
            throw new IllegalStateException("Nutrition database has too few foods");
        }

        Map<Long, NutritionCatalogClient.FoodCandidate> foodById = new java.util.LinkedHashMap<>();
        foods.forEach(food -> foodById.putIfAbsent(food.id(), food));
        List<Long> requiredFoodIds = selectedFoodIdsInCatalog(context, foods);
        if (requiredFoodIds.size() > 4) {
            throw new IllegalStateException("Too many required foods for one suggestion");
        }
        if (!normalizedLongList(context.getSelectedFoodIds()).isEmpty()
                && requiredFoodIds.size() < normalizedLongList(context.getSelectedFoodIds()).size()) {
            throw new IllegalStateException("Some selected foods are missing from nutrition catalog");
        }

        List<NutritionCatalogClient.FoodCandidate> requiredFoods = requiredFoodIds.stream()
                .map(foodById::get)
                .filter(java.util.Objects::nonNull)
                .toList();
        List<NutritionCatalogClient.FoodCandidate> optionalFoods = foods.stream()
                .filter(food -> !requiredFoodIds.contains(food.id()))
                .filter(food -> !isExcluded(food.name(), context))
                .toList();

        ObjectNode result = objectMapper.createObjectNode();
        result.put("message", "Gợi ý được tạo từ dữ liệu thực phẩm có sẵn trong hệ thống.");
        result.put("mealBudget", budget);
        result.put("calorieBuffer", calorieBuffer);
        result.put("source", "FOOD_DB");
        ArrayNode options = result.putArray("options");

        int offset = context.getSuggestionOffset() == null ? 0 : Math.max(0, context.getSuggestionOffset());
        for (int optionIndex = 0; optionIndex < 2; optionIndex++) {
            List<NutritionCatalogClient.FoodCandidate> selected = new java.util.ArrayList<>(requiredFoods);
            int targetCount = Math.max(2, Math.min(4, requiredFoods.size() + 2));
            int cursor = offset + optionIndex * 2;
            while (selected.size() < targetCount && !optionalFoods.isEmpty()) {
                NutritionCatalogClient.FoodCandidate candidate = optionalFoods.get(Math.abs(cursor) % optionalFoods.size());
                if (selected.stream().noneMatch(food -> food.id() == candidate.id())) {
                    selected.add(candidate);
                }
                cursor++;
                if (cursor > offset + optionalFoods.size() + 8) {
                    break;
                }
            }

            if (selected.size() < 2) {
                throw new IllegalStateException("Not enough catalog foods to build meal suggestion");
            }

            addCatalogMealOption(options, selected, budget, context, optionIndex, builder);
        }

        return objectMapper.writeValueAsString(result);
    }

    private void addCatalogMealOption(ArrayNode options,
                                      List<NutritionCatalogClient.FoodCandidate> foods,
                                      int budget,
                                      PlannerSuggestRequest context,
                                      int optionIndex,
                                      ChatClient.Builder builder) {
        BigDecimal baseCalories = foods.stream()
                .map(NutritionCatalogClient.FoodCandidate::calories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal scale = BigDecimal.valueOf(budget).divide(baseCalories, 4, RoundingMode.HALF_UP)
                .min(BigDecimal.valueOf(2.5))
                .max(BigDecimal.valueOf(0.5));

        ObjectNode option = options.addObject();
        option.put("amount", "1 phần");

        String dishName = buildDishName(foods, optionIndex);
        option.put("name", dishName);
        List<String> foodNames = foods.stream().map(NutritionCatalogClient.FoodCandidate::name).toList();
        List<String> preparationSteps = buildAiPreparationSteps(builder, dishName, foodNames)
                .orElseGet(() -> buildPreparationStepsFromFoodNames(foodNames));
        option.put("preparation", String.join(" ", preparationSteps));
        ArrayNode preparationStepsNode = option.putArray("preparationSteps");
        preparationSteps.forEach(preparationStepsNode::add);

        BigDecimal totalServing = BigDecimal.ZERO;
        BigDecimal totalCalories = BigDecimal.ZERO;
        BigDecimal totalProtein = BigDecimal.ZERO;
        BigDecimal totalCarbs = BigDecimal.ZERO;
        BigDecimal totalFat = BigDecimal.ZERO;
        BigDecimal totalFiber = BigDecimal.ZERO;
        BigDecimal totalSodium = BigDecimal.ZERO;
        ArrayNode ingredients = option.putArray("ingredients");

        for (NutritionCatalogClient.FoodCandidate food : foods) {
            BigDecimal servingSize = food.servingSizeG().multiply(scale).setScale(0, RoundingMode.HALF_UP);
            BigDecimal calories = food.calories().multiply(scale).setScale(0, RoundingMode.HALF_UP);
            BigDecimal protein = scaled(food.proteinG(), scale);
            BigDecimal carbs = scaled(food.carbsG(), scale);
            BigDecimal fat = scaled(food.fatG(), scale);
            BigDecimal fiber = scaled(food.fiberG(), scale);
            BigDecimal sodium = scaled(food.sodiumMg(), scale);

            ObjectNode ingredient = ingredients.addObject();
            ingredient.put("foodItemId", food.id());
            ingredient.put("name", food.name());
            ingredient.put("servingSizeG", servingSize);
            ingredient.put("quantity", 1);
            ingredient.put("calories", calories);
            ingredient.put("proteinG", protein);
            ingredient.put("carbsG", carbs);
            ingredient.put("fatG", fat);
            ingredient.put("fiberG", fiber);
            ingredient.put("sodiumMg", sodium);

            totalServing = totalServing.add(servingSize);
            totalCalories = totalCalories.add(calories);
            totalProtein = totalProtein.add(protein);
            totalCarbs = totalCarbs.add(carbs);
            totalFat = totalFat.add(fat);
            totalFiber = totalFiber.add(fiber);
            totalSodium = totalSodium.add(sodium);
        }

        option.put("servingSizeG", totalServing);
        option.put("calories", totalCalories);
        option.put("proteinG", totalProtein);
        option.put("carbsG", totalCarbs);
        option.put("fatG", totalFat);
        option.put("fiberG", totalFiber);
        option.put("sodiumMg", totalSodium);
    }

    private String generateFallbackPlan(PlannerSuggestRequest context) {
        try {
            return PlannerRuleEngine.generatePlan(context, activityCatalogClient.getActivityTypes());
        } catch (Exception exception) {
            log.warn("Activity catalog lookup failed; using static activity estimates: {}", exception.getMessage());
            return PlannerRuleEngine.generatePlan(context);
        }
    }

    private int calculateMealBudget(PlannerSuggestRequest context) {
        int goal = context.getDailyCalorieGoal() == null ? 2000 : context.getDailyCalorieGoal();
        int consumed = context.getCaloriesConsumed() == null ? 0 : context.getCaloriesConsumed();
        int remaining = Math.max(100, goal - consumed);
        if (context.getMealBudgetKcal() != null && context.getMealBudgetKcal() > 0) {
            return Math.max(100, Math.min(context.getMealBudgetKcal(), remaining));
        }
        String mealType = context.getMealType() == null ? "lunch" : context.getMealType().toLowerCase();
        double share = switch (mealType) {
            case "breakfast" -> 0.25;
            case "dinner" -> 0.27;
            case "snack", "snacks", "afternoon_snack" -> 0.10;
            default -> 0.38;
        };
        return Math.max(100, Math.min((int) Math.round(goal * share), remaining));
    }

    private int calculateCalorieBuffer(int budget) {
        return Math.max(50, (int) Math.round(budget * 0.12));
    }

    private boolean hasSelectedFoods(PlannerSuggestRequest context) {
        return !normalizedLongList(context.getSelectedFoodIds()).isEmpty()
                || !normalizedList(context.getSelectedFoodNames()).isEmpty();
    }

    private String buildPlannerPrompt(PlannerSuggestRequest context, int budget, int calorieBuffer,
                                      List<NutritionCatalogClient.FoodCandidate> foods) {
        List<Long> requiredFoodIds = selectedFoodIdsInCatalog(context, foods);
        int maxIngredientCount = Math.max(4, Math.min(6, requiredFoodIds.size() + 3));
        String catalog = foods.stream()
                .map(food -> "%d | %s | serving %sg | %s kcal | P%s C%s F%s".formatted(
                        food.id(), food.name(), food.servingSizeG(), food.calories(),
                        food.proteinG(), food.carbsG(), food.fatG()))
                .toList().toString();
        return """
                Create exactly 2 different Vietnamese meal dishes for meal type: %s.
                Each dish must be made from 2 to 4 ingredients selected from the database catalog below.
                Goal: %s. Weight: %s kg. Target weight: %s kg. Activity level: %s.
                Goal guidance: %s.
                Daily calorie goal: %s kcal. Calories already consumed: %s kcal.
                Target calories for EACH suggested dish: %d kcal.
                Acceptable calories for EACH suggested dish: %d to %d kcal.
                User selected foods or ingredients: %s.
                Do not use these previous dish or food names: %s.
                Required selected food ids for every suggested dish: %s.
                Database catalog (id | name | serving | nutrition): %s

                Return exactly this JSON shape:
                {
                  "message": "short Vietnamese explanation",
                  "mealBudget": %d,
                  "calorieBuffer": %d,
                  "source": "AI",
                  "options": [
                    {
                      "nameEn": "short natural English dish name",
                      "nameVi": "tên món tiếng Việt tự nhiên",
                      "preparation": "2-3 sentence cooking method in Vietnamese",
                      "preparationSteps": ["short step 1", "short step 2", "short step 3"],
                      "ingredients": [
                        {"foodItemId":1, "portionRatio":1.0},
                        {"foodItemId":2, "portionRatio":0.7}
                      ]
                    },
                    {
                      "nameEn": "another short natural English dish name",
                      "nameVi": "tên món tiếng Việt tự nhiên khác",
                      "preparation": "2-3 sentence cooking method in Vietnamese",
                      "preparationSteps": ["short step 1", "short step 2", "short step 3"],
                      "ingredients": [
                        {"foodItemId":3, "portionRatio":1.0},
                        {"foodItemId":4, "portionRatio":0.5}
                      ]
                    }
                  ]
                }
                Use only ids from the catalog. Do not invent food nutrition values.
                The preparation and preparationSteps must use only the selected ingredients and simple healthy methods such as boiling, steaming, sauteing with little oil, grilling, or mixing.
                Each dish must have 2 to %d ingredients.
                If required selected food ids is not empty, every dish must include all required selected food ids.
                The dish name may combine the selected ingredients, for example "Com ga ap chao voi bong cai".
                """.formatted(
                context.getMealType(), normalizeGoal(context.getGoal()), context.getWeightKg(), context.getTargetWeightKg(),
                context.getActivityLevel(), goalGuidance(context.getGoal()), context.getDailyCalorieGoal(), context.getCaloriesConsumed(), budget,
                Math.max(100, budget - calorieBuffer), budget,
                normalizedList(context.getSelectedFoodNames()),
                context.getExcludedFoodNames() == null ? List.of() : context.getExcludedFoodNames(),
                requiredFoodIds, catalog, budget, calorieBuffer, maxIngredientCount);
    }

    private String goalGuidance(String goal) {
        return switch (normalizeGoal(goal)) {
            case "LOSE_WEIGHT" -> "prioritize high protein, vegetables, lower calorie density, and controlled carbs";
            case "CUTTING" -> "prioritize high protein, low-to-moderate fat, high fiber, and muscle-preserving meals";
            case "GAIN_WEIGHT" -> "prioritize adequate calories, carbs, healthy fats, and enough protein";
            case "GAIN_MUSCLE" -> "prioritize high protein, sufficient carbs around training, and moderate healthy fats";
            case "BODY_RECOMPOSITION" -> "prioritize high protein, balanced calories, vegetables, and steady carbs";
            case "IMPROVE_FITNESS" -> "prioritize balanced macros, micronutrient-rich foods, and sustained energy";
            default -> "prioritize balanced macros and stable calories";
        };
    }

    private String validateAndNormalizePlan(String raw, int budget, int calorieBuffer, PlannerSuggestRequest context,
                                            List<NutritionCatalogClient.FoodCandidate> foods,
                                            ChatClient.Builder builder) throws Exception {
        if (raw == null || raw.isBlank()) throw new IllegalArgumentException("AI returned an empty response");
        String json = raw.trim().replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        JsonNode parsed = objectMapper.readTree(json);
        JsonNode optionsNode = parsed.get("options");
        if (!(optionsNode instanceof ArrayNode options) || options.size() < 2) {
            throw new IllegalArgumentException("AI response must contain two meal options");
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("message", parsed.path("message").asText("Gợi ý bữa ăn do AI tạo theo lượng calo còn lại."));
        result.put("mealBudget", budget);
        result.put("calorieBuffer", calorieBuffer);
        result.put("source", "AI");
        ArrayNode normalizedOptions = result.putArray("options");
        Map<Long, NutritionCatalogClient.FoodCandidate> foodById = new HashMap<>();
        foods.forEach(food -> foodById.put(food.id(), food));
        List<Long> requiredFoodIds = selectedFoodIdsInCatalog(context, foods);

        for (int i = 0; i < 2; i++) {
            JsonNode option = options.get(i);
            String nameEn = option.path("nameEn").asText("").trim();
            String nameVi = option.path("nameVi").asText("").trim();
            if (nameEn.isBlank()) nameEn = option.path("name").asText("").trim();
            if (nameVi.isBlank()) nameVi = nameEn;
            JsonNode ingredientsNode = option.path("ingredients");
            if (nameEn.isBlank() || !(ingredientsNode instanceof ArrayNode ingredients) || ingredients.isEmpty()) {
                throw new IllegalArgumentException("AI response must contain English/Vietnamese dish names and ingredients");
            }
            if (isExcluded(nameEn, context) || isExcluded(nameVi, context)) {
                throw new IllegalArgumentException("AI repeated an excluded meal");
            }

            BigDecimal baseCalories = BigDecimal.ZERO;
            java.util.Set<Long> usedFoodIds = new java.util.HashSet<>();
            for (JsonNode ingredient : ingredients) {
                long foodId = ingredient.path("foodItemId").asLong(-1);
                NutritionCatalogClient.FoodCandidate food = foodById.get(foodId);
                if (food == null || !usedFoodIds.add(foodId)) {
                    throw new IllegalArgumentException("AI selected an unknown or duplicate food id");
                }
                BigDecimal portionRatio = decimal(ingredient, "portionRatio", BigDecimal.ONE);
                baseCalories = baseCalories.add(food.calories().multiply(portionRatio));
            }
            if (baseCalories.signum() <= 0) {
                throw new IllegalArgumentException("AI selected ingredients with invalid calories");
            }
            if (!usedFoodIds.containsAll(requiredFoodIds)) {
                throw new IllegalArgumentException("AI omitted a required selected food");
            }

            BigDecimal targetCalories = BigDecimal.valueOf(budget);
            BigDecimal dishScale = targetCalories.divide(baseCalories, 4, RoundingMode.HALF_UP);
            dishScale = dishScale.min(BigDecimal.valueOf(2.5)).max(BigDecimal.valueOf(0.5));

            ObjectNode normalized = normalizedOptions.addObject();
            normalized.put("name", nameEn);
            normalized.put("nameEn", nameEn);
            normalized.put("nameVi", nameVi);
            normalized.put("amount", "1 phần");
            String preparation = normalizePreparation(option);
            ArrayNode preparationSteps = normalized.putArray("preparationSteps");
            normalizePreparationSteps(option).forEach(preparationSteps::add);

            BigDecimal totalServing = BigDecimal.ZERO;
            BigDecimal totalCalories = BigDecimal.ZERO;
            BigDecimal totalProtein = BigDecimal.ZERO;
            BigDecimal totalCarbs = BigDecimal.ZERO;
            BigDecimal totalFat = BigDecimal.ZERO;
            BigDecimal totalFiber = BigDecimal.ZERO;
            BigDecimal totalSodium = BigDecimal.ZERO;
            ArrayNode normalizedIngredients = normalized.putArray("ingredients");
            List<String> ingredientNames = new java.util.ArrayList<>();

            for (JsonNode ingredient : ingredients) {
                long foodId = ingredient.path("foodItemId").asLong(-1);
                NutritionCatalogClient.FoodCandidate food = foodById.get(foodId);
                ingredientNames.add(food.name());
                BigDecimal portionRatio = decimal(ingredient, "portionRatio", BigDecimal.ONE);
                BigDecimal ingredientScale = portionRatio.multiply(dishScale);
                BigDecimal servingSize = food.servingSizeG().multiply(ingredientScale).setScale(0, RoundingMode.HALF_UP);
                BigDecimal calories = food.calories().multiply(ingredientScale).setScale(0, RoundingMode.HALF_UP);
                BigDecimal protein = scaled(food.proteinG(), ingredientScale);
                BigDecimal carbs = scaled(food.carbsG(), ingredientScale);
                BigDecimal fat = scaled(food.fatG(), ingredientScale);
                BigDecimal fiber = scaled(food.fiberG(), ingredientScale);
                BigDecimal sodium = scaled(food.sodiumMg(), ingredientScale);

                ObjectNode normalizedIngredient = normalizedIngredients.addObject();
                normalizedIngredient.put("foodItemId", food.id());
                normalizedIngredient.put("name", food.name());
                normalizedIngredient.put("servingSizeG", servingSize);
                normalizedIngredient.put("quantity", 1);
                normalizedIngredient.put("calories", calories);
                normalizedIngredient.put("proteinG", protein);
                normalizedIngredient.put("carbsG", carbs);
                normalizedIngredient.put("fatG", fat);
                normalizedIngredient.put("fiberG", fiber);
                normalizedIngredient.put("sodiumMg", sodium);

                totalServing = totalServing.add(servingSize);
                totalCalories = totalCalories.add(calories);
                totalProtein = totalProtein.add(protein);
                totalCarbs = totalCarbs.add(carbs);
                totalFat = totalFat.add(fat);
                totalFiber = totalFiber.add(fiber);
                totalSodium = totalSodium.add(sodium);
            }

            if (preparation == null) {
                List<String> fallbackSteps = buildAiPreparationSteps(builder, nameVi, ingredientNames)
                        .orElseGet(() -> buildPreparationStepsFromFoodNames(ingredientNames));
                preparation = String.join(" ", fallbackSteps);
                fallbackSteps.forEach(preparationSteps::add);
            }
            normalized.put("preparation", preparation);
            normalized.put("servingSizeG", totalServing);
            normalized.put("calories", totalCalories);
            normalized.put("proteinG", totalProtein);
            normalized.put("carbsG", totalCarbs);
            normalized.put("fatG", totalFat);
            normalized.put("fiberG", totalFiber);
            normalized.put("sodiumMg", totalSodium);
        }
        return objectMapper.writeValueAsString(result);
    }

    private List<NutritionCatalogClient.FoodCandidate> getPlannerFoodCatalog(PlannerSuggestRequest context) {
        Map<Long, NutritionCatalogClient.FoodCandidate> foods = new java.util.LinkedHashMap<>();
        nutritionCatalogClient.getFoods(100)
                .forEach(food -> foods.putIfAbsent(food.id(), food));
        nutritionCatalogClient.getFoodsByIds(normalizedLongList(context.getSelectedFoodIds()))
                .forEach(food -> foods.putIfAbsent(food.id(), food));
        return foods.values().stream().toList();
    }

    private List<Long> selectedFoodIdsInCatalog(PlannerSuggestRequest context,
                                                List<NutritionCatalogClient.FoodCandidate> foods) {
        java.util.Set<Long> availableFoodIds = foods.stream()
                .map(NutritionCatalogClient.FoodCandidate::id)
                .collect(java.util.stream.Collectors.toSet());
        return normalizedLongList(context.getSelectedFoodIds()).stream()
                .filter(availableFoodIds::contains)
                .toList();
    }

    private String normalizeRecipeSuggestions(List<NutritionCatalogClient.RecipeCandidate> recipes,
                                              int budget,
                                              int calorieBuffer,
                                              PlannerSuggestRequest context) throws Exception {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("message", "Gợi ý dựa trên công thức đã lưu trong cơ sở dữ liệu.");
        result.put("mealBudget", budget);
        result.put("calorieBuffer", calorieBuffer);
        result.put("source", "RECIPE_DB");

        ArrayNode options = result.putArray("options");
        for (NutritionCatalogClient.RecipeCandidate recipe : recipes) {
            ObjectNode option = options.addObject();
            String displayNameVi = recipeDisplayName(recipe);
            option.put("recipeId", recipe.id());
            option.put("name", recipe.name());
            option.put("nameEn", recipe.name());
            option.put("nameVi", displayNameVi);
            option.put("description", recipe.description());
            List<String> fallbackSteps = buildPreparationStepsFromFoodNames(
                    recipe.ingredients().stream()
                            .map(NutritionCatalogClient.RecipeIngredientCandidate::name)
                            .toList());
            String preparation = normalize(recipe.description());
            option.put("preparation", preparation != null ? preparation : String.join(" ", fallbackSteps));
            ArrayNode preparationSteps = option.putArray("preparationSteps");
            if (preparation != null) {
                preparationSteps.add(preparation);
            } else {
                fallbackSteps.forEach(preparationSteps::add);
            }
            option.put("amount", recipe.servings() <= 1 ? "1 phần" : recipe.servings() + " phần");
            option.put("servingSizeG", recipe.ingredients().stream()
                    .map(NutritionCatalogClient.RecipeIngredientCandidate::quantityG)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(0, RoundingMode.HALF_UP));
            option.put("calories", recipe.calories().setScale(0, RoundingMode.HALF_UP));
            option.put("proteinG", recipe.proteinG().setScale(1, RoundingMode.HALF_UP));
            option.put("carbsG", recipe.carbsG().setScale(1, RoundingMode.HALF_UP));
            option.put("fatG", recipe.fatG().setScale(1, RoundingMode.HALF_UP));
            option.put("fiberG", BigDecimal.ZERO);
            option.put("sodiumMg", BigDecimal.ZERO);

            ArrayNode ingredients = option.putArray("ingredients");
            for (NutritionCatalogClient.RecipeIngredientCandidate ingredient : recipe.ingredients()) {
                ObjectNode normalizedIngredient = ingredients.addObject();
                normalizedIngredient.put("foodItemId", ingredient.foodItemId());
                normalizedIngredient.put("name", ingredient.name());
                normalizedIngredient.put("nameVi", ingredient.nameVi());
                normalizedIngredient.put("servingSizeG", ingredient.quantityG().setScale(0, RoundingMode.HALF_UP));
                normalizedIngredient.put("quantity", 1);
                normalizedIngredient.put("calories", ingredient.calories().setScale(0, RoundingMode.HALF_UP));
                normalizedIngredient.put("proteinG", ingredient.proteinG().setScale(1, RoundingMode.HALF_UP));
                normalizedIngredient.put("carbsG", ingredient.carbsG().setScale(1, RoundingMode.HALF_UP));
                normalizedIngredient.put("fatG", ingredient.fatG().setScale(1, RoundingMode.HALF_UP));
                normalizedIngredient.put("fiberG", BigDecimal.ZERO);
                normalizedIngredient.put("sodiumMg", BigDecimal.ZERO);
            }
        }
        return objectMapper.writeValueAsString(result);
    }

    /**
     * Seed recipes may have generic titles such as "Món Cá cơm ăn kèm".
     * Use the actual ingredient combination for the Vietnamese display name,
     * so distinct recipes can never appear as the same option in Planner.
     */
    private String recipeDisplayName(NutritionCatalogClient.RecipeCandidate recipe) {
        List<String> ingredients = recipe.ingredients().stream()
                .map(ingredient -> normalize(ingredient.nameVi()) != null ? ingredient.nameVi() : ingredient.name())
                .filter(name -> normalize(name) != null)
                .distinct()
                .toList();
        if (ingredients.isEmpty()) {
            return recipe.nameVi();
        }

        String savedName = normalize(recipe.nameVi());
        boolean genericName = savedName == null
                || savedName.toLowerCase().startsWith("món ")
                || savedName.toLowerCase().startsWith("công thức với");
        if (!genericName) {
            return savedName;
        }
        if (ingredients.size() == 1) {
            return ingredients.get(0);
        }
        if (ingredients.size() == 2) {
            return ingredients.get(0) + " với " + ingredients.get(1);
        }
        return ingredients.get(0) + " với "
                + String.join(", ", ingredients.subList(1, ingredients.size() - 1))
                + " và " + ingredients.get(ingredients.size() - 1);
    }

    private List<NutritionCatalogClient.RecipeCandidate> getMatchingRecipes(PlannerSuggestRequest context,
                                                                            int maxCalories) {
        List<Long> selectedFoodIds = normalizedLongList(context.getSelectedFoodIds());
        List<String> keywords = new java.util.ArrayList<>(normalizedList(context.getSelectedFoodNames()));

        Map<Long, NutritionCatalogClient.RecipeCandidate> recipes = new java.util.LinkedHashMap<>();
        String goal = normalizeGoal(context.getGoal());
        String mealType = normalize(context.getMealType());
        if (!selectedFoodIds.isEmpty()) {
            nutritionCatalogClient.getRecipes(maxCalories, null, selectedFoodIds, goal, mealType, 12)
                    .forEach(recipe -> recipes.putIfAbsent(recipe.id(), recipe));
        }

        if (keywords.isEmpty()) {
            if (recipes.isEmpty()) {
                return nutritionCatalogClient.getRecipes(maxCalories, null, null, goal, mealType, 12);
            }
            return recipes.values().stream().toList();
        }

        for (String keyword : keywords) {
            nutritionCatalogClient.getRecipes(maxCalories, keyword, null, goal, mealType, 12)
                    .forEach(recipe -> recipes.putIfAbsent(recipe.id(), recipe));
        }

        if (recipes.size() < 2) {
            nutritionCatalogClient.getRecipes(maxCalories, null, null, goal, mealType, 12)
                    .forEach(recipe -> recipes.putIfAbsent(recipe.id(), recipe));
        }
        return recipes.values().stream().toList();
    }

    private List<NutritionCatalogClient.RecipeCandidate> getUsableRecipeSuggestions(PlannerSuggestRequest context,
                                                                                     int maxCalories) {
        return getMatchingRecipes(context, maxCalories).stream()
                .filter(recipe -> !isExcluded(recipe.name(), context))
                .filter(recipe -> matchesRequestedFoods(recipe, context))
            .limit(2)
                .toList();
    }

    private boolean matchesRequestedFoods(NutritionCatalogClient.RecipeCandidate recipe,
                                          PlannerSuggestRequest context) {
        List<Long> selectedFoodIds = normalizedLongList(context.getSelectedFoodIds());
        if (!selectedFoodIds.isEmpty()) {
            java.util.Set<Long> recipeFoodIds = recipe.ingredients().stream()
                    .map(NutritionCatalogClient.RecipeIngredientCandidate::foodItemId)
                    .collect(java.util.stream.Collectors.toSet());
            boolean matchesAllIds = recipeFoodIds.containsAll(selectedFoodIds);
            if (matchesAllIds) {
                return true;
            }
        }

        List<String> selectedFoods = normalizedList(context.getSelectedFoodNames());
        if (selectedFoods.isEmpty()) {
            return selectedFoodIds.isEmpty();
        }

        String searchable = (recipe.name() + " " + recipe.description() + " " +
                recipe.ingredients().stream()
                        .map(NutritionCatalogClient.RecipeIngredientCandidate::name)
                        .toList()).toLowerCase();
        return selectedFoods.stream()
                .allMatch(food -> searchable.contains(food.toLowerCase()));
    }

    private boolean isExcluded(String name, PlannerSuggestRequest context) {
        List<String> excluded = context.getExcludedFoodNames() == null ? List.of() : context.getExcludedFoodNames();
        return excluded.stream().anyMatch(item -> item.equalsIgnoreCase(name));
    }

    private List<String> normalizedList(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .map(this::normalize)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
    }

    private List<Long> normalizedLongList(List<Long> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .filter(java.util.Objects::nonNull)
                .filter(value -> value > 0)
                .distinct()
                .toList();
    }

    private String normalizePreparation(JsonNode option) {
        String preparation = normalize(option.path("preparation").asText(""));
        if (preparation != null) {
            return preparation;
        }

        List<String> steps = normalizePreparationSteps(option);
        return String.join(" ", steps);
    }

    private List<String> normalizePreparationSteps(JsonNode option) {
        List<String> steps = new java.util.ArrayList<>();
        JsonNode node = option.path("preparationSteps");
        if (node.isArray()) {
            for (JsonNode step : node) {
                String normalized = normalize(step.asText(""));
                if (normalized != null && normalized.length() <= 220) {
                    steps.add(normalized);
                }
            }
        }

        if (!steps.isEmpty()) {
            return steps.stream().limit(4).toList();
        }

        return List.of();
    }

    private List<String> buildPreparationStepsFromFoodNames(List<String> foodNames) {
        List<String> names = foodNames == null ? List.of() : foodNames.stream()
                .map(this::cleanFoodName)
                .filter(name -> !name.isBlank())
                .distinct()
                .limit(4)
                .toList();
        if (names.isEmpty()) {
            return List.of(
                    "So che nguyen lieu va can dinh luong theo khau phan.",
                    "Che bien bang cach hap, luoc, ap chao it dau hoac tron don gian.",
                    "Nem nhe va dung ngay khi con am de giu huong vi."
            );
        }

        String main = names.get(0);
        String others = names.size() > 1 ? String.join(", ", names.subList(1, names.size())) : "";
        List<String> steps = new java.util.ArrayList<>();
        steps.add("So che " + String.join(", ", names) + " va can dung khau phan goi y.");
        steps.add("Lam chin " + main + " bang cach luoc, hap hoac ap chao it dau den khi vua chin.");
        if (!others.isBlank()) {
            steps.add("Them " + others + " vao cuoi qua trinh nau de giu do tuoi va dinh duong.");
        }
        steps.add("Tron deu, nem nhe voi gia vi don gian va dung ngay.");
        return steps;
    }

    private Optional<List<String>> buildAiPreparationSteps(ChatClient.Builder builder, String dishName, List<String> foodNames) {
        if (builder == null) {
            return Optional.empty();
        }

        List<String> names = foodNames == null ? List.of() : foodNames.stream()
                .map(this::cleanFoodName)
                .filter(name -> !name.isBlank())
                .distinct()
                .limit(6)
                .toList();
        if (names.isEmpty()) {
            return Optional.empty();
        }

        String prompt = """
                Write cooking instructions in Vietnamese for this meal using only the provided food items.
                Dish name: %s
                Food items: %s

                Return JSON only:
                {
                  "preparationSteps": [
                    "short practical step 1",
                    "short practical step 2",
                    "short practical step 3"
                  ]
                }
                Do not add ingredients that are not in the food items list.
                Prefer healthy methods: boiling, steaming, grilling, air-frying, sauteing with little oil, or mixing.
                Keep each step under 160 characters.
                """.formatted(dishName, names);

        try {
            String raw = builder
                    .defaultSystem("You write concise Vietnamese cooking instructions. Return JSON only, without markdown.")
                    .build()
                    .prompt()
                    .user(prompt)
                    .call()
                    .content();
            JsonNode root = objectMapper.readTree(raw.trim()
                    .replaceFirst("^```(?:json)?\\s*", "")
                    .replaceFirst("\\s*```$", ""));
            JsonNode node = root.path("preparationSteps");
            if (!node.isArray()) {
                return Optional.empty();
            }

            List<String> steps = new java.util.ArrayList<>();
            for (JsonNode step : node) {
                String normalized = normalize(step.asText(""));
                if (normalized != null && normalized.length() <= 220) {
                    steps.add(normalized);
                }
            }
            return steps.isEmpty() ? Optional.empty() : Optional.of(steps.stream().limit(4).toList());
        } catch (Exception exception) {
            log.warn("AI preparation generation failed; using local preparation fallback: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private String buildDishName(List<NutritionCatalogClient.FoodCandidate> foods, int optionIndex) {
        List<String> names = foods.stream()
                .map(NutritionCatalogClient.FoodCandidate::name)
                .map(this::cleanFoodName)
                .filter(name -> !name.isBlank())
                .limit(3)
                .toList();
        if (names.isEmpty()) {
            return optionIndex == 0 ? "Bua an can bang" : "Bua an giau dinh duong";
        }
        if (names.size() == 1) {
            return names.get(0);
        }

        String main = names.get(0);
        String side = String.join(", ", names.subList(1, names.size()));
        return optionIndex == 0
                ? main + " ket hop " + side
                : main + " va " + side + " can bang";
    }

    private String cleanFoodName(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return "";
        }
        return normalized
                .replace("(cooked)", "")
                .replace("(raw)", "")
                .replace(" cooked", "")
                .replace(" raw", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private BigDecimal decimal(JsonNode node, String field, BigDecimal fallback) {
        return node.path(field).isNumber() ? node.path(field).decimalValue() : fallback;
    }

    private BigDecimal scaled(BigDecimal value, BigDecimal scale) {
        return value.multiply(scale).setScale(1, RoundingMode.HALF_UP);
    }
}
