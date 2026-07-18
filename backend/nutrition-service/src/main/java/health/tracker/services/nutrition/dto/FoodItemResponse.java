package health.tracker.services.nutrition.dto;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodItemResponse {

    private Long id;
    private String name;
    private String nameVi;
    private String brand;
    private String barcode;

    private CategoryInfo category;

    // Khẩu phần
    private BigDecimal servingSizeG;
    private String servingDescription;

    // Macro (trên mỗi serving)
    private BigDecimal calories;
    private BigDecimal proteinG;
    private BigDecimal carbsG;
    private BigDecimal fatG;
    private BigDecimal fiberG;
    private BigDecimal sugarG;

    // Micro
    private BigDecimal sodiumMg;
    private BigDecimal cholesterolMg;
    private BigDecimal saturatedFatG;
    private BigDecimal potassiumMg;
    private BigDecimal vitaminCMg;
    private BigDecimal calciumMg;
    private BigDecimal ironMg;

    private String imageUrl;
    private boolean verified;
    private boolean isPublic;
    private Long createdByUserId;

    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryInfo {
        private Integer id;
        private String name;
        private String nameVi;
        private String icon;
    }
}

