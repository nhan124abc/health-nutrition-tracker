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

    public AiChatService(
            ObjectProvider<ChatClient.Builder> chatClientBuilderProvider,
            ChatMessageRepository chatMessageRepository,
            AiUsageLimitRepository usageLimitRepository,
            ObjectMapper objectMapper,
            NutritionCatalogClient nutritionCatalogClient,
            @Value("${spring.ai.openai.chat.options.model:llama-3.1-8b-instant}") String model,
            @Value("${ai.limits.guest-daily:5}") int guestDailyLimit,
            @Value("${ai.limits.user-daily:50}") int userDailyLimit) {
        this.chatClientBuilderProvider = chatClientBuilderProvider;
        this.chatMessageRepository = chatMessageRepository;
        this.usageLimitRepository = usageLimitRepository;
        this.objectMapper = objectMapper;
        this.nutritionCatalogClient = nutritionCatalogClient;
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

        String systemPrompt = """
                You are the AI assistant inside Health Nutrition Tracker.
                Give concise, practical answers about nutrition, activity, body metrics, and app usage.
                Do not provide medical diagnosis. Encourage users to consult a healthcare professional for medical concerns.
                """;

        String userPrompt = """
                User id: %s
                Guest id: %s
                Username/email: %s
                Optional app context: %s
                Recent conversation:
                %s

                User message:
                %s
                """.formatted(
                owner.userId() == null ? "not logged in" : owner.userId(),
                owner.guestId() == null ? "none" : owner.guestId(),
                username == null || username.isBlank() ? "unknown" : username,
                request.getContext() == null || request.getContext().isBlank() ? "none" : request.getContext(),
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

    private record ChatOwner(String userId, String guestId) {
        boolean isAuthenticated() {
            return userId != null;
        }
    }

    @Transactional
    public String generateDailyPlan(String userId, String guestId, PlannerSuggestRequest context) {
        if ("exercise".equalsIgnoreCase(context.getMealType())) {
            return PlannerRuleEngine.generatePlan(context);
        }

        int budget = calculateMealBudget(context);
        int calorieBuffer = calculateCalorieBuffer(budget);
        try {
            List<NutritionCatalogClient.RecipeCandidate> recipes = getUsableRecipeSuggestions(context, budget + calorieBuffer);
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
            log.warn("AI model is unavailable; using planner fallback");
            return PlannerRuleEngine.generatePlan(context);
        }

        try {
            List<NutritionCatalogClient.FoodCandidate> foods = nutritionCatalogClient.getFoods(100);
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

            String normalized = validateAndNormalizePlan(raw, budget, calorieBuffer, context, foods);
            log.info("Generated planner suggestions with AI model={} for userId={}, budget={}",
                    model, userId, budget);
            return normalized;
        } catch (Exception exception) {
            log.warn("AI planner failed; using rule fallback: {}", exception.getMessage());
            return PlannerRuleEngine.generatePlan(context);
        }
    }

    private int calculateMealBudget(PlannerSuggestRequest context) {
        int goal = context.getDailyCalorieGoal() == null ? 2000 : context.getDailyCalorieGoal();
        int consumed = context.getCaloriesConsumed() == null ? 0 : context.getCaloriesConsumed();
        int remaining = Math.max(100, goal - consumed);
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

    private String buildPlannerPrompt(PlannerSuggestRequest context, int budget, int calorieBuffer,
                                      List<NutritionCatalogClient.FoodCandidate> foods) {
        String catalog = foods.stream()
                .map(food -> "%d | %s | serving %sg | %s kcal | P%s C%s F%s".formatted(
                        food.id(), food.name(), food.servingSizeG(), food.calories(),
                        food.proteinG(), food.carbsG(), food.fatG()))
                .toList().toString();
        return """
                Create exactly 2 different Vietnamese meal dishes for meal type: %s.
                Each dish must be made from 2 to 4 ingredients selected from the database catalog below.
                Goal: %s. Weight: %s kg. Target weight: %s kg. Activity level: %s.
                Daily calorie goal: %s kcal. Calories already consumed: %s kcal.
                Target calories for EACH suggested dish: %d kcal.
                Acceptable calories for EACH suggested dish: %d to %d kcal.
                User selected foods or ingredients: %s.
                Preferred cooking method: %s.
                Do not use these previous dish or food names: %s.
                Database catalog (id | name | serving | nutrition): %s

                Return exactly this JSON shape:
                {
                  "message": "short Vietnamese explanation",
                  "mealBudget": %d,
                  "calorieBuffer": %d,
                  "source": "AI",
                  "options": [
                    {
                      "name": "dish name in Vietnamese",
                      "description": "short cooking instructions in Vietnamese",
                      "ingredients": [
                        {"foodItemId":1, "portionRatio":1.0},
                        {"foodItemId":2, "portionRatio":0.7}
                      ]
                    },
                    {
                      "name": "another dish name in Vietnamese",
                      "description": "short cooking instructions in Vietnamese",
                      "ingredients": [
                        {"foodItemId":3, "portionRatio":1.0},
                        {"foodItemId":4, "portionRatio":0.5}
                      ]
                    }
                  ]
                }
                Use only ids from the catalog. Do not invent food nutrition values.
                If the user selected foods, each dish should use at least one selected food when it exists in the catalog.
                If a cooking method is provided, describe steps that follow that method.
                The dish name may combine the selected ingredients, for example "Com ga ap chao voi bong cai".
                """.formatted(
                context.getMealType(), context.getGoal(), context.getWeightKg(), context.getTargetWeightKg(),
                context.getActivityLevel(), context.getDailyCalorieGoal(), context.getCaloriesConsumed(), budget,
                Math.max(100, budget - calorieBuffer), budget,
                normalizedList(context.getSelectedFoodNames()),
                blankToDefault(context.getCookingMethod(), "not specified"),
                context.getExcludedFoodNames() == null ? List.of() : context.getExcludedFoodNames(), catalog, budget,
                calorieBuffer);
    }

    private String validateAndNormalizePlan(String raw, int budget, int calorieBuffer, PlannerSuggestRequest context,
                                            List<NutritionCatalogClient.FoodCandidate> foods) throws Exception {
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

        for (int i = 0; i < 2; i++) {
            JsonNode option = options.get(i);
            String name = option.path("name").asText("").trim();
            JsonNode ingredientsNode = option.path("ingredients");
            if (name.isBlank() || !(ingredientsNode instanceof ArrayNode ingredients) || ingredients.isEmpty()) {
                throw new IllegalArgumentException("AI response must contain dish name and ingredients");
            }
            if (isExcluded(name, context)) {
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

            BigDecimal targetCalories = BigDecimal.valueOf(budget);
            BigDecimal dishScale = targetCalories.divide(baseCalories, 4, RoundingMode.HALF_UP);
            dishScale = dishScale.min(BigDecimal.valueOf(2.5)).max(BigDecimal.valueOf(0.5));

            ObjectNode normalized = normalizedOptions.addObject();
            normalized.put("name", name);
            normalized.put("description", option.path("description").asText(""));
            normalized.put("cookingMethod", blankToDefault(context.getCookingMethod(), option.path("description").asText("")));
            normalized.put("amount", "1 phần");

            BigDecimal totalServing = BigDecimal.ZERO;
            BigDecimal totalCalories = BigDecimal.ZERO;
            BigDecimal totalProtein = BigDecimal.ZERO;
            BigDecimal totalCarbs = BigDecimal.ZERO;
            BigDecimal totalFat = BigDecimal.ZERO;
            BigDecimal totalFiber = BigDecimal.ZERO;
            BigDecimal totalSodium = BigDecimal.ZERO;
            ArrayNode normalizedIngredients = normalized.putArray("ingredients");

            for (JsonNode ingredient : ingredients) {
                long foodId = ingredient.path("foodItemId").asLong(-1);
                NutritionCatalogClient.FoodCandidate food = foodById.get(foodId);
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
            option.put("recipeId", recipe.id());
            option.put("name", recipe.name());
            option.put("description", recipe.description());
            option.put("cookingMethod", recipe.description());
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

    private List<NutritionCatalogClient.RecipeCandidate> getMatchingRecipes(PlannerSuggestRequest context,
                                                                            int maxCalories) {
        List<Long> selectedFoodIds = normalizedLongList(context.getSelectedFoodIds());
        List<String> keywords = new java.util.ArrayList<>(normalizedList(context.getSelectedFoodNames()));
        String cookingMethod = normalize(context.getCookingMethod());
        if (cookingMethod != null) {
            keywords.add(cookingMethod);
        }

        Map<Long, NutritionCatalogClient.RecipeCandidate> recipes = new java.util.LinkedHashMap<>();
        if (!selectedFoodIds.isEmpty()) {
            nutritionCatalogClient.getRecipes(maxCalories, null, selectedFoodIds, 12)
                    .forEach(recipe -> recipes.putIfAbsent(recipe.id(), recipe));
        }

        if (keywords.isEmpty()) {
            if (recipes.isEmpty()) {
                return nutritionCatalogClient.getRecipes(maxCalories, 12);
            }
            return recipes.values().stream().toList();
        }

        for (String keyword : keywords) {
            nutritionCatalogClient.getRecipes(maxCalories, keyword, 12)
                    .forEach(recipe -> recipes.putIfAbsent(recipe.id(), recipe));
        }

        if (recipes.size() < 2) {
            nutritionCatalogClient.getRecipes(maxCalories, 12)
                    .forEach(recipe -> recipes.putIfAbsent(recipe.id(), recipe));
        }
        return recipes.values().stream().toList();
    }

    private List<NutritionCatalogClient.RecipeCandidate> getUsableRecipeSuggestions(PlannerSuggestRequest context,
                                                                                     int maxCalories) {
        return getMatchingRecipes(context, maxCalories).stream()
                .filter(recipe -> !isExcluded(recipe.name(), context))
                .filter(recipe -> matchesRequestedFoods(recipe, context))
                .filter(recipe -> matchesCookingMethod(recipe, context))
                .limit(2)
                .toList();
    }

    private boolean matchesRequestedFoods(NutritionCatalogClient.RecipeCandidate recipe,
                                          PlannerSuggestRequest context) {
        List<Long> selectedFoodIds = normalizedLongList(context.getSelectedFoodIds());
        if (!selectedFoodIds.isEmpty()) {
            boolean matchesId = recipe.ingredients().stream()
                    .map(NutritionCatalogClient.RecipeIngredientCandidate::foodItemId)
                    .anyMatch(selectedFoodIds::contains);
            if (matchesId) {
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
                .anyMatch(food -> searchable.contains(food.toLowerCase()));
    }

    private boolean matchesCookingMethod(NutritionCatalogClient.RecipeCandidate recipe,
                                         PlannerSuggestRequest context) {
        String cookingMethod = normalize(context.getCookingMethod());
        if (cookingMethod == null) {
            return true;
        }

        String searchable = (recipe.name() + " " + recipe.description()).toLowerCase();
        return searchable.contains(cookingMethod.toLowerCase());
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

    private String blankToDefault(String value, String fallback) {
        String normalized = normalize(value);
        return normalized == null ? fallback : normalized;
    }

    private BigDecimal decimal(JsonNode node, String field, BigDecimal fallback) {
        return node.path(field).isNumber() ? node.path(field).decimalValue() : fallback;
    }

    private BigDecimal scaled(BigDecimal value, BigDecimal scale) {
        return value.multiply(scale).setScale(1, RoundingMode.HALF_UP);
    }
}
