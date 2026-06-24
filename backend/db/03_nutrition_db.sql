-- ============================================================
-- NUTRITION SERVICE DATABASE
-- DB: nutrition_db
-- Chức năng: Danh mục thực phẩm, thông tin dinh dưỡng
--            (đây là "food database" - tra cứu thực phẩm)
-- ============================================================

USE nutrition_db;

-- --------------------------------------------------------
-- Bảng food_categories: danh mục thực phẩm
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_categories (
    id          INT             NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    name_vi     VARCHAR(100)    NULL COMMENT 'Tên tiếng Việt',
    icon        VARCHAR(50)     NULL COMMENT 'Icon emoji hoặc tên icon',
    description TEXT            NULL,
    hidden      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Ẩn danh mục khỏi danh sách người dùng',
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu mẫu danh mục thực phẩm
INSERT INTO food_categories (name, name_vi, icon) VALUES
('Grains & Rice',       'Ngũ cốc & Gạo',            '🍚'),
('Vegetables',          'Rau củ',                    '🥦'),
('Fruits',              'Trái cây',                   '🍎'),
('Meat & Poultry',      'Thịt & Gia cầm',            '🍗'),
('Seafood & Fish',      'Hải sản & Cá',              '🐟'),
('Dairy & Eggs',        'Sữa & Trứng',               '🥚'),
('Legumes & Beans',     'Đậu & Các loại đậu',        '🫘'),
('Nuts & Seeds',        'Hạt & Các loại hạt',        '🥜'),
('Beverages',           'Đồ uống',                   '🥤'),
('Snacks & Fast Food',  'Đồ ăn vặt & Thức ăn nhanh', '🍟'),
('Condiments & Sauces', 'Gia vị & Nước chấm',        '🧂'),
('Processed Foods',     'Thực phẩm chế biến sẵn',    '🥫'),
('Sweets & Desserts',   'Đồ ngọt & Tráng miệng',     '🍰'),
('Supplements',         'Thực phẩm bổ sung',          '💊');

-- --------------------------------------------------------
-- Bảng food_items: danh sách thực phẩm và giá trị dinh dưỡng
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_items (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    name                VARCHAR(255)    NOT NULL,
    name_vi             VARCHAR(255)    NULL COMMENT 'Tên tiếng Việt',
    brand               VARCHAR(100)    NULL COMMENT 'Thương hiệu (NULL = thực phẩm tự nhiên)',
    barcode             VARCHAR(50)     NULL UNIQUE COMMENT 'Mã vạch sản phẩm',
    category_id         INT             NULL,

    -- Khẩu phần chuẩn
    serving_size_g      DECIMAL(7,2)    NOT NULL DEFAULT 100 COMMENT 'Khẩu phần (g)',
    serving_description VARCHAR(100)    NULL COMMENT 'VD: "1 bát (200g)", "1 quả vừa"',

    -- Giá trị dinh dưỡng (trên mỗi serving_size_g)
    calories            DECIMAL(7,2)    NOT NULL DEFAULT 0 COMMENT 'Calo (kcal)',
    protein_g           DECIMAL(6,2)    NOT NULL DEFAULT 0 COMMENT 'Protein (g)',
    carbs_g             DECIMAL(6,2)    NOT NULL DEFAULT 0 COMMENT 'Carbohydrate (g)',
    fat_g               DECIMAL(6,2)    NOT NULL DEFAULT 0 COMMENT 'Chất béo (g)',
    fiber_g             DECIMAL(6,2)    NULL DEFAULT 0 COMMENT 'Chất xơ (g)',
    sugar_g             DECIMAL(6,2)    NULL DEFAULT 0 COMMENT 'Đường (g)',
    sodium_mg           DECIMAL(7,2)    NULL DEFAULT 0 COMMENT 'Natri (mg)',
    cholesterol_mg      DECIMAL(7,2)    NULL DEFAULT 0 COMMENT 'Cholesterol (mg)',
    saturated_fat_g     DECIMAL(6,2)    NULL DEFAULT 0 COMMENT 'Chất béo bão hòa (g)',
    potassium_mg        DECIMAL(7,2)    NULL DEFAULT 0 COMMENT 'Kali (mg)',
    vitamin_c_mg        DECIMAL(6,2)    NULL DEFAULT 0 COMMENT 'Vitamin C (mg)',
    calcium_mg          DECIMAL(7,2)    NULL DEFAULT 0 COMMENT 'Canxi (mg)',
    iron_mg             DECIMAL(6,2)    NULL DEFAULT 0 COMMENT 'Sắt (mg)',

    -- Metadata
    created_by_user_id  BIGINT          NULL COMMENT 'NULL = dữ liệu hệ thống, có giá trị = người dùng tự thêm',
    is_verified         TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = đã được admin xác nhận',
    is_public           TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '0 = chỉ người tạo mới thấy',
    image_url           TEXT            NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_food_items_name (name),
    INDEX idx_food_items_category (category_id),
    INDEX idx_food_items_barcode (barcode),
    INDEX idx_food_items_creator (created_by_user_id),
    FULLTEXT idx_food_items_search (name, name_vi, brand),
    CONSTRAINT fk_food_items_category FOREIGN KEY (category_id) REFERENCES food_categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh sách thực phẩm và giá trị dinh dưỡng';

-- Dữ liệu mẫu thực phẩm phổ biến ở Việt Nam
INSERT INTO food_items (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, is_verified, is_public) VALUES
-- Gạo & Ngũ cốc
('White Rice (cooked)',     'Cơm trắng',            1, 100, '1 bát nhỏ (100g)', 130, 2.7, 28.2, 0.3, 0.4, 1, 1),
('Brown Rice (cooked)',     'Gạo lứt nấu chín',     1, 100, '1 bát nhỏ (100g)', 112, 2.6, 23.5, 0.9, 1.8, 1, 1),
('Pho Noodles (cooked)',    'Bánh phở nấu chín',    1, 200, '1 tô (200g)',       280, 5.6, 60.0, 0.6, 0.4, 1, 1),
('Bread (white)',           'Bánh mì trắng',         1, 50,  '1 lát (50g)',        132, 4.0, 25.0, 1.5, 1.2, 1, 1),

-- Thịt
('Pork Belly (cooked)',     'Thịt ba chỉ heo',      4, 100, '100g',              518, 9.3, 0,    53.0, 0,   1, 1),
('Chicken Breast (cooked)', 'Ức gà luộc',            4, 100, '100g',              165, 31.0, 0,    3.6, 0,   1, 1),
('Beef (lean, cooked)',     'Thịt bò nạc',           4, 100, '100g',              250, 26.0, 0,    15.0, 0,  1, 1),

-- Rau
('Morning Glory',           'Rau muống',             2, 100, '100g rau luộc',     19,  2.6, 3.1,  0.2, 1.5, 1, 1),
('Bean Sprouts',            'Giá đỗ',                2, 100, '100g',              31,  3.0, 5.9,  0.2, 1.8, 1, 1),
('Broccoli (cooked)',       'Bông cải xanh',         2, 100, '100g',              35,  2.3, 7.2,  0.4, 2.6, 1, 1),

-- Trái cây
('Banana',                  'Chuối',                 3, 120, '1 quả vừa (120g)', 107, 1.3, 27.0, 0.4, 3.1, 1, 1),
('Watermelon',              'Dưa hấu',               3, 200, '2 lát (200g)',       60, 1.2, 15.2, 0.2, 0.6, 1, 1),
('Mango',                   'Xoài',                  3, 150, '1 quả vừa (150g)', 99,  1.4, 24.7, 0.6, 2.6, 1, 1),

-- Trứng & Sữa
('Chicken Egg (boiled)',    'Trứng gà luộc',         6, 60,  '1 quả (60g)',        78, 6.3, 0.6,  5.3, 0,   1, 1),
('Fresh Milk (whole)',      'Sữa tươi nguyên kem',   6, 240, '1 ly (240ml)',      149, 8.0, 11.7, 8.0, 0,   1, 1),

-- Hải sản
('Shrimp (cooked)',         'Tôm luộc',              5, 100, '100g',               99, 24.0, 0.2,  0.3, 0,  1, 1),
('Tilapia (cooked)',        'Cá rô phi',             5, 100, '100g',              128, 26.2, 0,    2.7, 0,   1, 1);

-- --------------------------------------------------------
-- Bảng custom_food_items: thực phẩm do người dùng tự tạo (recipe)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL COMMENT 'Người tạo công thức',
    name            VARCHAR(255)    NOT NULL,
    description     TEXT            NULL,
    servings        INT             NOT NULL DEFAULT 1 COMMENT 'Số khẩu phần từ công thức này',
    image_url       TEXT            NULL,
    is_public       TINYINT(1)      NOT NULL DEFAULT 0,

    -- Tổng dinh dưỡng (tính toán từ ingredients)
    total_calories  DECIMAL(8,2)    NULL,
    total_protein_g DECIMAL(7,2)    NULL,
    total_carbs_g   DECIMAL(7,2)    NULL,
    total_fat_g     DECIMAL(7,2)    NULL,

    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_recipes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Công thức nấu ăn của người dùng';

-- --------------------------------------------------------
-- Bảng recipe_ingredients: nguyên liệu trong công thức
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    recipe_id       BIGINT          NOT NULL,
    food_item_id    BIGINT          NOT NULL,
    food_name       VARCHAR(255)    NOT NULL COMMENT 'Denormalized - tên thực phẩm lúc thêm vào',
    quantity_g      DECIMAL(7,2)    NOT NULL COMMENT 'Khối lượng (g)',
    calories        DECIMAL(7,2)    NOT NULL DEFAULT 0,
    protein_g       DECIMAL(6,2)    NOT NULL DEFAULT 0,
    carbs_g         DECIMAL(6,2)    NOT NULL DEFAULT 0,
    fat_g           DECIMAL(6,2)    NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    INDEX idx_recipe_ingredients_recipe (recipe_id),
    CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_ingredients_food FOREIGN KEY (food_item_id) REFERENCES food_items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nguyên liệu trong công thức nấu ăn';

