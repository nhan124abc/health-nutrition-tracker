-- ============================================================
-- MEAL SERVICE DATABASE
-- DB: meal_db
-- Chức năng: Theo dõi bữa ăn hàng ngày của người dùng
-- Lưu ý: food_item_id tham chiếu nutrition_db.food_items (cross-DB)
--        Dùng denormalization (lưu food_name, calories...) để
--        tránh phụ thuộc vào nutrition-service lúc đọc dữ liệu
-- ============================================================

USE meal_db;

-- --------------------------------------------------------
-- Bảng meals: bữa ăn (breakfast, lunch, dinner, snack)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS meals (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL COMMENT 'Tham chiếu auth_db.users.id',
    meal_type       ENUM(
                        'BREAKFAST',  -- Bữa sáng
                        'MORNING_SNACK', -- Ăn nhẹ buổi sáng
                        'LUNCH',      -- Bữa trưa
                        'AFTERNOON_SNACK', -- Ăn nhẹ buổi chiều
                        'DINNER',     -- Bữa tối
                        'EVENING_SNACK'  -- Ăn nhẹ tối
                    ) NOT NULL DEFAULT 'BREAKFAST',
    meal_date       DATE            NOT NULL COMMENT 'Ngày ăn',
    meal_time       TIME            NULL COMMENT 'Giờ ăn (tùy chọn)',
    notes           TEXT            NULL,

    -- Tổng dinh dưỡng của bữa ăn (tính từ meal_items)
    total_calories  DECIMAL(8,2)    NOT NULL DEFAULT 0,
    total_protein_g DECIMAL(7,2)    NOT NULL DEFAULT 0,
    total_carbs_g   DECIMAL(7,2)    NOT NULL DEFAULT 0,
    total_fat_g     DECIMAL(7,2)    NOT NULL DEFAULT 0,
    total_fiber_g   DECIMAL(7,2)    NOT NULL DEFAULT 0,

    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_meals_user_date (user_id, meal_date),
    INDEX idx_meals_user_type_date (user_id, meal_type, meal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bữa ăn hàng ngày';

-- --------------------------------------------------------
-- Bảng meal_items: chi tiết từng món trong bữa ăn
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_items (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    meal_id         BIGINT          NOT NULL,

    -- Tham chiếu tới nutrition_db (cross-DB, không dùng FK)
    food_item_id    BIGINT          NULL COMMENT 'nutrition_db.food_items.id (NULL nếu custom)',
    recipe_id       BIGINT          NULL COMMENT 'nutrition_db.recipes.id (NULL nếu không phải recipe)',
    item_type       ENUM('FOOD', 'RECIPE') NOT NULL DEFAULT 'FOOD',

    -- Denormalized data từ nutrition-service (tránh join cross-DB)
    food_name       VARCHAR(255)    NOT NULL COMMENT 'Tên thực phẩm lúc log (không thay đổi nếu food_item bị sửa)',
    serving_size_g  DECIMAL(7,2)    NOT NULL DEFAULT 100 COMMENT 'Khẩu phần chuẩn (g)',
    quantity        DECIMAL(6,2)    NOT NULL DEFAULT 1 COMMENT 'Số lần khẩu phần',
    total_weight_g  DECIMAL(7,2)    GENERATED ALWAYS AS (serving_size_g * quantity) STORED,

    -- Giá trị dinh dưỡng thực tế (đã nhân với quantity)
    calories        DECIMAL(7,2)    NOT NULL DEFAULT 0,
    protein_g       DECIMAL(6,2)    NOT NULL DEFAULT 0,
    carbs_g         DECIMAL(6,2)    NOT NULL DEFAULT 0,
    fat_g           DECIMAL(6,2)    NOT NULL DEFAULT 0,
    fiber_g         DECIMAL(6,2)    NOT NULL DEFAULT 0,
    sodium_mg       DECIMAL(7,2)    NOT NULL DEFAULT 0,

    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_meal_items_meal (meal_id),
    INDEX idx_meal_items_food (food_item_id),
    CONSTRAINT fk_meal_items_meal FOREIGN KEY (meal_id) REFERENCES meals (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chi tiết từng món ăn trong bữa';

-- --------------------------------------------------------
-- Bảng meal_plans: kế hoạch ăn uống theo tuần/tháng
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plans (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL,
    name            VARCHAR(100)    NOT NULL COMMENT 'Tên kế hoạch, VD: "Giảm cân tháng 5"',
    description     TEXT            NULL,
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_meal_plans_user (user_id),
    INDEX idx_meal_plans_dates (user_id, start_date, end_date),
    CONSTRAINT chk_meal_plans_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Kế hoạch ăn uống';

-- --------------------------------------------------------
-- Bảng meal_plan_entries: chi tiết từng ngày trong kế hoạch
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plan_entries (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    plan_id         BIGINT          NOT NULL,
    plan_date       DATE            NOT NULL,
    meal_type       ENUM('BREAKFAST','MORNING_SNACK','LUNCH','AFTERNOON_SNACK','DINNER','EVENING_SNACK') NOT NULL,
    food_item_id    BIGINT          NULL,
    recipe_id       BIGINT          NULL,
    food_name       VARCHAR(255)    NOT NULL,
    serving_size_g  DECIMAL(7,2)    NOT NULL DEFAULT 100,
    quantity        DECIMAL(6,2)    NOT NULL DEFAULT 1,
    calories        DECIMAL(7,2)    NOT NULL DEFAULT 0,
    notes           TEXT            NULL,

    PRIMARY KEY (id),
    INDEX idx_mpe_plan (plan_id),
    INDEX idx_mpe_date (plan_id, plan_date),
    CONSTRAINT fk_mpe_plan FOREIGN KEY (plan_id) REFERENCES meal_plans (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chi tiết từng bữa trong kế hoạch ăn';

-- --------------------------------------------------------
-- Bảng favorite_foods: thực phẩm yêu thích của người dùng
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorite_foods (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    user_id         BIGINT      NOT NULL,
    food_item_id    BIGINT      NULL COMMENT 'nutrition_db.food_items.id',
    recipe_id       BIGINT      NULL COMMENT 'nutrition_db.recipes.id',
    item_type       ENUM('FOOD', 'RECIPE') NOT NULL DEFAULT 'FOOD',
    food_name       VARCHAR(255) NOT NULL COMMENT 'Denormalized',
    added_at        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_favorite_user_food (user_id, food_item_id),
    INDEX idx_favorites_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Thực phẩm yêu thích';

