package health.tracker.services.nutrition.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import health.tracker.services.nutrition.dto.FoodItemResponse;
import health.tracker.services.nutrition.dto.RecipeSuggestionResponse;
import health.tracker.services.nutrition.entity.FoodCategory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.StringJoiner;

@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionCacheService {

    private static final String PREFIX = "nutrition:";
    private static final String FOOD_SEARCH_PREFIX = PREFIX + "foods:search:";
    private static final String RECIPE_SUGGEST_PREFIX = PREFIX + "recipes:suggest:";
    private static final String CATEGORY_PREFIX = PREFIX + "categories:";

    private static final Duration FOOD_SEARCH_TTL = Duration.ofMinutes(10);
    private static final Duration RECIPE_SUGGEST_TTL = Duration.ofMinutes(15);
    private static final Duration CATEGORY_TTL = Duration.ofHours(1);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public String foodSearchKey(String keyword, Integer categoryId, Long userId, boolean recipeFirst, Pageable pageable) {
        StringJoiner key = new StringJoiner("|", FOOD_SEARCH_PREFIX, "");
        key.add("q=" + normalize(keyword));
        key.add("category=" + valueOrAll(categoryId));
        key.add("user=" + valueOrAll(userId));
        key.add("recipeFirst=" + recipeFirst);
        key.add("page=" + pageable.getPageNumber());
        key.add("size=" + pageable.getPageSize());
        key.add("sort=" + pageable.getSort());
        return key.toString();
    }

    public Optional<Page<FoodItemResponse>> getFoodSearch(String key) {
        return getPage(key, FoodItemResponse.class);
    }

    public void putFoodSearch(String key, Page<FoodItemResponse> page) {
        put(key, CachedPage.from(page), FOOD_SEARCH_TTL);
    }

    public String recipeSuggestionKey(BigDecimal maxCalories, String keyword, List<Long> foodIds,
                                      String goal, String mealType, int limit) {
        List<Long> normalizedFoodIds = foodIds == null ? List.of() : foodIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .sorted(Comparator.naturalOrder())
                .toList();

        StringJoiner key = new StringJoiner("|", RECIPE_SUGGEST_PREFIX, "");
        key.add("maxCalories=" + normalize(maxCalories));
        key.add("q=" + normalize(keyword));
        key.add("foodIds=" + normalizedFoodIds);
        key.add("goal=" + normalize(goal));
        key.add("mealType=" + normalize(mealType));
        key.add("limit=" + limit);
        return key.toString();
    }

    public Optional<List<RecipeSuggestionResponse>> getRecipeSuggestions(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putRecipeSuggestions(String key, List<RecipeSuggestionResponse> suggestions) {
        put(key, suggestions, RECIPE_SUGGEST_TTL);
    }

    public String visibleCategoriesKey() {
        return CATEGORY_PREFIX + "visible";
    }

    public String adminCategoriesKey(Boolean hidden) {
        return CATEGORY_PREFIX + "admin:hidden=" + valueOrAll(hidden);
    }

    public Optional<List<FoodCategory>> getCategories(String key) {
        return get(key, new TypeReference<>() {
        });
    }

    public void putCategories(String key, List<FoodCategory> categories) {
        put(key, categories, CATEGORY_TTL);
    }

    public void evictAllNutritionCaches() {
        try {
            List<String> keys = scanKeys(PREFIX + "*");
            if (!keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception ex) {
            log.warn("Could not evict nutrition cache: {}", ex.getMessage());
        }
    }

    private <T> Optional<T> get(String key, TypeReference<T> typeReference) {
        try {
            String json = redis.opsForValue().get(key);
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, typeReference));
        } catch (Exception ex) {
            log.debug("Nutrition cache read failed for key {}: {}", key, ex.getMessage());
            return Optional.empty();
        }
    }

    private <T> Optional<Page<T>> getPage(String key, Class<T> itemClass) {
        try {
            String json = redis.opsForValue().get(key);
            if (json == null) {
                return Optional.empty();
            }
            JavaType itemType = objectMapper.getTypeFactory().constructType(itemClass);
            JavaType pageType = objectMapper.getTypeFactory().constructParametricType(CachedPage.class, itemType);
            CachedPage<T> cachedPage = objectMapper.readValue(json, pageType);
            return Optional.of(cachedPage.toPage());
        } catch (Exception ex) {
            log.debug("Nutrition page cache read failed for key {}: {}", key, ex.getMessage());
            return Optional.empty();
        }
    }

    private void put(String key, Object value, Duration ttl) {
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception ex) {
            log.debug("Nutrition cache write failed for key {}: {}", key, ex.getMessage());
        }
    }

    private List<String> scanKeys(String pattern) {
        return redis.execute((RedisCallback<List<String>>) connection -> {
            List<String> keys = new ArrayList<>();
            ScanOptions options = ScanOptions.scanOptions().match(pattern).count(100).build();
            try (Cursor<byte[]> cursor = connection.keyCommands().scan(options)) {
                cursor.forEachRemaining(key -> keys.add(new String(key, StandardCharsets.UTF_8)));
            }
            return keys;
        });
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? "all" : value.trim().toLowerCase();
    }

    private String normalize(BigDecimal value) {
        return value == null ? "all" : value.stripTrailingZeros().toPlainString();
    }

    private String valueOrAll(Object value) {
        return value == null ? "all" : String.valueOf(value);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    private static class CachedPage<T> {
        private List<T> content;
        private int page;
        private int size;
        private long totalElements;

        static <T> CachedPage<T> from(Page<T> page) {
            return new CachedPage<>(
                    page.getContent(),
                    page.getNumber(),
                    page.getSize(),
                    page.getTotalElements()
            );
        }

        Page<T> toPage() {
            return new PageImpl<>(content, PageRequest.of(page, size), totalElements);
        }
    }
}
