package health.tracker.services.nutrition.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "food_items", indexes = {
        @Index(name = "idx_food_items_name", columnList = "name"),
        @Index(name = "idx_food_items_category", columnList = "category_id"),
        @Index(name = "idx_food_items_barcode", columnList = "barcode"),
        @Index(name = "idx_food_items_creator", columnList = "created_by_user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "name_vi")
    private String nameVi;

    @Column(length = 100)
    private String brand;

    @Column(unique = true, length = 50)
    private String barcode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private FoodCategory category;

    // ─── Khẩu phần ───────────────────────────────────────────────────────────

    @Column(name = "serving_size_g", nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal servingSizeG = BigDecimal.valueOf(100);

    @Column(name = "serving_description", length = 100)
    private String servingDescription;

    // ─── Giá trị dinh dưỡng (trên mỗi serving) ───────────────────────────────

    @Column(nullable = false, precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal calories = BigDecimal.ZERO;

    @Column(name = "protein_g", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal proteinG = BigDecimal.ZERO;

    @Column(name = "carbs_g", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal carbsG = BigDecimal.ZERO;

    @Column(name = "fat_g", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal fatG = BigDecimal.ZERO;

    @Column(name = "fiber_g", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal fiberG = BigDecimal.ZERO;

    @Column(name = "sugar_g", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal sugarG = BigDecimal.ZERO;

    @Column(name = "sodium_mg", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal sodiumMg = BigDecimal.ZERO;

    @Column(name = "cholesterol_mg", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal cholesterolMg = BigDecimal.ZERO;

    @Column(name = "saturated_fat_g", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal saturatedFatG = BigDecimal.ZERO;

    @Column(name = "potassium_mg", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal potassiumMg = BigDecimal.ZERO;

    @Column(name = "vitamin_c_mg", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal vitaminCMg = BigDecimal.ZERO;

    @Column(name = "calcium_mg", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal calciumMg = BigDecimal.ZERO;

    @Column(name = "iron_mg", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal ironMg = BigDecimal.ZERO;

    // ─── Metadata ─────────────────────────────────────────────────────────────

    /**
     * NULL = dữ liệu hệ thống; có giá trị = người dùng tự thêm
     * (cross-DB ref đến auth_db.users.id)
     */
    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private boolean isPublic = true;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

