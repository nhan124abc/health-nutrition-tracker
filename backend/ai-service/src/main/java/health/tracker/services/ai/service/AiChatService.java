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

        ChatClient.Builder builder = chatClientBuilderProvider.getIfAvailable();
        if (builder == null) {
            log.warn("AI model is unavailable; using planner fallback");
            return PlannerRuleEngine.generatePlan(context);
        }

        int budget = calculateMealBudget(context);
        try {
            List<NutritionCatalogClient.FoodCandidate> foods = nutritionCatalogClient.getFoods(100);
            if (foods.size() < 2) throw new IllegalStateException("Nutrition database has too few foods");
            String prompt = buildPlannerPrompt(context, budget, foods);
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

            String normalized = validateAndNormalizePlan(raw, budget, context, foods);
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

    private String buildPlannerPrompt(PlannerSuggestRequest context, int budget,
                                      List<NutritionCatalogClient.FoodCandidate> foods) {
        String catalog = foods.stream()
                .map(food -> "%d | %s | serving %sg | %s kcal | P%s C%s F%s".formatted(
                        food.id(), food.name(), food.servingSizeG(), food.calories(),
                        food.proteinG(), food.carbsG(), food.fatG()))
                .toList().toString();
        return """
                Select exactly 2 different foods for meal type: %s from the database catalog below.
                Goal: %s. Weight: %s kg. Target weight: %s kg. Activity level: %s.
                Daily calorie goal: %s kcal. Calories already consumed: %s kcal.
                Maximum calories for EACH suggested meal: %d kcal.
                Do not use these previous food names: %s.
                Database catalog (id | name | serving | nutrition): %s

                Return exactly this JSON shape:
                {
                  "message": "short Vietnamese explanation",
                  "mealBudget": %d,
                  "source": "AI",
                  "options": [
                    {"foodItemId":1},
                    {"foodItemId":2}
                  ]
                }
                Use only ids from the catalog. Do not invent food names or nutrition values.
                """.formatted(
                context.getMealType(), context.getGoal(), context.getWeightKg(), context.getTargetWeightKg(),
                context.getActivityLevel(), context.getDailyCalorieGoal(), context.getCaloriesConsumed(), budget,
                context.getExcludedFoodNames() == null ? List.of() : context.getExcludedFoodNames(), catalog, budget);
    }

    private String validateAndNormalizePlan(String raw, int budget, PlannerSuggestRequest context,
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
        result.put("source", "AI");
        ArrayNode normalizedOptions = result.putArray("options");
        List<String> excluded = context.getExcludedFoodNames() == null ? List.of() : context.getExcludedFoodNames();
        Map<Long, NutritionCatalogClient.FoodCandidate> foodById = new HashMap<>();
        foods.forEach(food -> foodById.put(food.id(), food));
        long previousId = -1;

        for (int i = 0; i < 2; i++) {
            JsonNode option = options.get(i);
            long foodId = option.path("foodItemId").asLong(-1);
            NutritionCatalogClient.FoodCandidate food = foodById.get(foodId);
            if (food == null || foodId == previousId) {
                throw new IllegalArgumentException("AI selected an unknown or duplicate food id");
            }
            previousId = foodId;
            String name = food.name();
            if (excluded.stream().anyMatch(item -> item.equalsIgnoreCase(name))) {
                throw new IllegalArgumentException("AI repeated an excluded meal");
            }

            BigDecimal targetCalories = BigDecimal.valueOf(budget);
            BigDecimal scale = targetCalories.divide(food.calories(), 4, RoundingMode.HALF_UP);
            scale = scale.min(BigDecimal.valueOf(2.5)).max(BigDecimal.valueOf(0.5));
            BigDecimal calories = food.calories().multiply(scale).setScale(0, RoundingMode.HALF_UP);

            ObjectNode normalized = normalizedOptions.addObject();
            normalized.put("foodItemId", food.id());
            normalized.put("name", name);
            normalized.put("amount", scale.setScale(1, RoundingMode.HALF_UP) + " khẩu phần");
            normalized.put("servingSizeG", food.servingSizeG().multiply(scale).setScale(0, RoundingMode.HALF_UP));
            normalized.put("calories", calories);
            normalized.put("proteinG", scaled(food.proteinG(), scale));
            normalized.put("carbsG", scaled(food.carbsG(), scale));
            normalized.put("fatG", scaled(food.fatG(), scale));
            normalized.put("fiberG", scaled(food.fiberG(), scale));
            normalized.put("sodiumMg", scaled(food.sodiumMg(), scale));
        }
        return objectMapper.writeValueAsString(result);
    }

    private BigDecimal scaled(BigDecimal value, BigDecimal scale) {
        return value.multiply(scale).setScale(1, RoundingMode.HALF_UP);
    }
}
