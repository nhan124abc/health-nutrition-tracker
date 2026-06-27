-- ============================================================
-- COMPREHENSIVE FOOD AND ACTIVITY CATALOG
-- Databases: nutrition_db, activity_db
-- Run manually after 03_nutrition_db.sql and 05_activity_db.sql.
--
-- Nutrition values are stored per serving_size_g. Most foods below use
-- a 100 g edible portion so users can scale quantities consistently.
-- Activity MET values follow the adult Compendium convention used by
-- ActivityType: kcal = MET * body_weight_kg * duration_hours.
--
-- Safe to run repeatedly:
--   * categories and activity types are updated by their unique name;
--   * food items are inserted only when the English system name is absent.
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
START TRANSACTION;

-- ============================================================
-- 1) Food categories
-- ============================================================

USE nutrition_db;

INSERT INTO food_categories (name, name_vi, icon, description, hidden) VALUES
('Grains & Rice',       'Ngũ cốc & Gạo',              'rice',       'Gạo, bún, mì, yến mạch, bánh mì và các loại ngũ cốc.', 0),
('Tubers & Roots',      'Củ giàu tinh bột',           'root',       'Khoai lang, khoai tây, khoai môn, sắn và các loại củ giàu tinh bột.', 0),
('Vegetables',          'Rau củ',                     'vegetable',  'Rau lá, rau họ cải và rau củ ít năng lượng.', 0),
('Mushrooms',           'Nấm',                        'mushroom',   'Các loại nấm ăn được.', 0),
('Herbs & Aromatics',   'Rau thơm & Gia vị tươi',     'herb',       'Rau thơm, hành, tỏi và nguyên liệu tạo mùi.', 0),
('Fruits',              'Trái cây',                   'fruit',      'Trái cây tươi và phần ăn được.', 0),
('Meat & Poultry',      'Thịt & Gia cầm',             'meat',       'Thịt heo, bò, gà và gia cầm.', 0),
('Seafood & Fish',      'Hải sản & Cá',               'fish',       'Cá, tôm và các loại thủy hải sản.', 0),
('Dairy & Eggs',        'Sữa & Trứng',                'egg',        'Sữa, sữa chua, phô mai và trứng.', 0),
('Legumes & Beans',     'Đậu & Các loại đậu',         'beans',      'Đậu hũ, đậu xanh, đậu đen và các loại đậu.', 0),
('Nuts & Seeds',        'Hạt & Các loại hạt',         'nuts',       'Hạt dinh dưỡng và hạt có dầu.', 0),
('Oils & Fats',         'Dầu & Chất béo',             'oil',        'Dầu ăn và các nguồn chất béo dùng khi chế biến.', 0),
('Beverages',           'Đồ uống',                    'beverage',   'Nước và đồ uống không thuộc nhóm sữa.', 0),
('Condiments & Sauces', 'Gia vị & Nước chấm',         'seasoning',  'Nước chấm, nước sốt và gia vị đóng gói.', 0),
('Snacks & Fast Food',  'Đồ ăn vặt & Thức ăn nhanh',  'snack',      'Thực phẩm ăn nhanh hoặc dùng giữa các bữa.', 0),
('Processed Foods',     'Thực phẩm chế biến sẵn',     'processed',  'Thực phẩm đóng gói hoặc đã qua chế biến công nghiệp.', 0),
('Sweets & Desserts',   'Đồ ngọt & Tráng miệng',      'dessert',    'Bánh, kẹo và món tráng miệng.', 0),
('Supplements',         'Thực phẩm bổ sung',          'supplement', 'Sản phẩm bổ sung dinh dưỡng; giá trị phụ thuộc nhãn sản phẩm.', 0)
ON DUPLICATE KEY UPDATE
    name_vi = VALUES(name_vi),
    icon = VALUES(icon),
    description = VALUES(description),
    hidden = VALUES(hidden);

-- ============================================================
-- 2) Verified system foods
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS seed_food_catalog;
CREATE TEMPORARY TABLE seed_food_catalog (
    name                VARCHAR(255) NOT NULL PRIMARY KEY,
    name_vi             VARCHAR(255) NOT NULL,
    category_name       VARCHAR(100) NOT NULL,
    serving_size_g      DECIMAL(7,2) NOT NULL,
    serving_description VARCHAR(100) NOT NULL,
    calories            DECIMAL(7,2) NOT NULL,
    protein_g           DECIMAL(6,2) NOT NULL,
    carbs_g             DECIMAL(6,2) NOT NULL,
    fat_g               DECIMAL(6,2) NOT NULL,
    fiber_g             DECIMAL(6,2) NOT NULL,
    sugar_g             DECIMAL(6,2) NOT NULL,
    sodium_mg           DECIMAL(7,2) NOT NULL,
    cholesterol_mg      DECIMAL(7,2) NOT NULL,
    saturated_fat_g     DECIMAL(6,2) NOT NULL,
    potassium_mg        DECIMAL(7,2) NOT NULL,
    vitamin_c_mg        DECIMAL(6,2) NOT NULL,
    calcium_mg          DECIMAL(7,2) NOT NULL,
    iron_mg             DECIMAL(6,2) NOT NULL
) ENGINE=InnoDB;

INSERT INTO seed_food_catalog VALUES
-- Grains and cereal products: cooked unless explicitly marked dry.
('Jasmine Rice (cooked)', 'Cơm gạo thơm nấu chín', 'Grains & Rice', 100, '100g cơm chín', 130, 2.4, 28.7, 0.2, 0.4, 0.1, 1, 0, 0.1, 35, 0, 10, 0.2),
('Brown Rice (cooked, unsalted)', 'Cơm gạo lứt nấu chín không muối', 'Grains & Rice', 100, '100g cơm chín', 123, 2.7, 25.6, 1.0, 1.6, 0.2, 4, 0, 0.3, 86, 0, 3, 0.6),
('Rice Vermicelli (cooked, plain)', 'Bún tươi không gia vị', 'Grains & Rice', 100, '100g bún tươi', 109, 1.8, 24.9, 0.2, 1.0, 0.1, 8, 0, 0.1, 4, 0, 5, 0.2),
('Pho Rice Noodles (cooked, plain)', 'Bánh phở chín không gia vị', 'Grains & Rice', 100, '100g bánh phở chín', 109, 1.8, 24.9, 0.2, 1.0, 0.1, 8, 0, 0.1, 4, 0, 5, 0.2),
('Rolled Oats (dry, plain)', 'Yến mạch cán dẹt khô', 'Grains & Rice', 40, '40g yến mạch khô', 152, 5.1, 27.1, 3.2, 4.0, 0.4, 2, 0, 0.6, 150, 0, 21, 1.7),
('Whole Wheat Bread', 'Bánh mì nguyên cám', 'Grains & Rice', 50, '2 lát mỏng (50g)', 124, 6.5, 20.6, 2.1, 3.5, 2.9, 225, 0, 0.4, 115, 0, 82, 1.2),
('Sweet Corn (boiled)', 'Bắp ngọt luộc', 'Grains & Rice', 100, '100g hạt bắp luộc', 96, 3.4, 21.0, 1.5, 2.4, 4.5, 1, 0, 0.2, 218, 5.5, 3, 0.5),

-- Starchy roots.
('Sweet Potato (boiled, without skin)', 'Khoai lang luộc bỏ vỏ', 'Tubers & Roots', 100, '100g khoai luộc', 76, 1.4, 17.7, 0.1, 2.5, 5.7, 27, 0, 0.0, 230, 12.8, 27, 0.7),
('Potato (boiled, without skin)', 'Khoai tây luộc bỏ vỏ', 'Tubers & Roots', 100, '100g khoai luộc', 87, 1.9, 20.1, 0.1, 1.8, 0.9, 4, 0, 0.0, 379, 13.0, 5, 0.3),
('Taro (cooked)', 'Khoai môn nấu chín', 'Tubers & Roots', 100, '100g khoai môn chín', 142, 0.5, 34.6, 0.1, 5.1, 0.5, 1, 0, 0.0, 484, 5.0, 18, 0.7),
('Cassava (boiled)', 'Sắn luộc', 'Tubers & Roots', 100, '100g sắn luộc', 112, 1.0, 27.8, 0.3, 1.8, 1.2, 14, 0, 0.1, 271, 20.6, 16, 0.3),

-- Vegetables and mushrooms.
('Water Spinach (boiled, drained)', 'Rau muống luộc để ráo', 'Vegetables', 100, '100g rau chín', 19, 2.6, 3.1, 0.2, 2.1, 0.4, 30, 0, 0.0, 312, 55.0, 77, 1.7),
('Bok Choy (cooked)', 'Cải thìa nấu chín', 'Vegetables', 100, '100g cải thìa chín', 12, 1.6, 1.8, 0.2, 1.0, 0.8, 34, 0, 0.0, 371, 26.0, 93, 1.8),
('Broccoli (steamed)', 'Bông cải xanh hấp', 'Vegetables', 100, '100g bông cải hấp', 35, 2.4, 7.2, 0.4, 3.3, 1.4, 41, 0, 0.1, 293, 64.9, 40, 0.7),
('Cabbage (cooked)', 'Bắp cải nấu chín', 'Vegetables', 100, '100g bắp cải chín', 23, 1.3, 5.5, 0.1, 1.9, 2.8, 8, 0, 0.0, 196, 37.5, 48, 0.2),
('Pumpkin (cooked)', 'Bí đỏ nấu chín', 'Vegetables', 100, '100g bí đỏ chín', 20, 0.7, 4.9, 0.1, 1.1, 2.1, 1, 0, 0.0, 230, 4.7, 15, 0.6),
('Chayote (cooked)', 'Su su nấu chín', 'Vegetables', 100, '100g su su chín', 24, 0.6, 5.1, 0.5, 2.8, 2.0, 2, 0, 0.1, 173, 7.7, 14, 0.3),
('Bean Sprouts (raw)', 'Giá đỗ sống', 'Vegetables', 100, '100g giá đỗ', 30, 3.0, 5.9, 0.2, 1.8, 4.1, 6, 0, 0.0, 149, 13.2, 13, 0.9),
('Cucumber (raw, with peel)', 'Dưa leo sống có vỏ', 'Vegetables', 100, '100g dưa leo', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2, 0, 0.0, 147, 2.8, 16, 0.3),
('Tomato (raw)', 'Cà chua sống', 'Vegetables', 100, '100g cà chua', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 0, 0.0, 237, 13.7, 10, 0.3),
('Carrot (raw)', 'Cà rốt sống', 'Vegetables', 100, '100g cà rốt', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69, 0, 0.0, 320, 5.9, 33, 0.3),
('Oyster Mushrooms (cooked)', 'Nấm bào ngư nấu chín', 'Mushrooms', 100, '100g nấm chín', 33, 3.3, 6.1, 0.4, 2.3, 1.1, 18, 0, 0.1, 420, 0, 3, 1.3),
('Shiitake Mushrooms (cooked)', 'Nấm hương nấu chín', 'Mushrooms', 100, '100g nấm chín', 56, 1.6, 14.4, 0.2, 2.1, 3.8, 4, 0, 0.1, 117, 0.3, 3, 0.4),

-- Fresh herbs and aromatics.
('Cilantro (raw)', 'Rau mùi sống', 'Herbs & Aromatics', 100, '100g rau mùi', 23, 2.1, 3.7, 0.5, 2.8, 0.9, 46, 0, 0.0, 521, 27.0, 67, 1.8),
('Thai Basil (raw)', 'Húng quế sống', 'Herbs & Aromatics', 100, '100g húng quế', 23, 3.2, 2.7, 0.6, 1.6, 0.3, 4, 0, 0.0, 295, 18.0, 177, 3.2),
('Scallions (raw)', 'Hành lá sống', 'Herbs & Aromatics', 100, '100g hành lá', 32, 1.8, 7.3, 0.2, 2.6, 2.3, 16, 0, 0.0, 276, 18.8, 72, 1.5),
('Garlic (raw)', 'Tỏi sống', 'Herbs & Aromatics', 100, '100g tỏi', 149, 6.4, 33.1, 0.5, 2.1, 1.0, 17, 0, 0.1, 401, 31.2, 181, 1.7),

-- Fruits, edible portion.
('Banana (raw)', 'Chuối chín', 'Fruits', 100, '100g phần ăn được', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1, 0, 0.1, 358, 8.7, 5, 0.3),
('Guava (raw)', 'Ổi tươi', 'Fruits', 100, '100g phần ăn được', 68, 2.6, 14.3, 1.0, 5.4, 8.9, 2, 0, 0.3, 417, 228.3, 18, 0.3),
('Papaya (raw)', 'Đu đủ chín', 'Fruits', 100, '100g phần ăn được', 43, 0.5, 10.8, 0.3, 1.7, 7.8, 8, 0, 0.1, 182, 60.9, 20, 0.3),
('Dragon Fruit (raw)', 'Thanh long tươi', 'Fruits', 100, '100g phần ăn được', 57, 0.4, 13.0, 0.1, 3.0, 8.0, 0, 0, 0.0, 116, 3.0, 18, 0.7),
('Orange (raw)', 'Cam tươi', 'Fruits', 100, '100g phần ăn được', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0, 0, 0.0, 181, 53.2, 40, 0.1),
('Mango (raw)', 'Xoài chín', 'Fruits', 100, '100g phần ăn được', 60, 0.8, 15.0, 0.4, 1.6, 13.7, 1, 0, 0.1, 168, 36.4, 11, 0.2),
('Watermelon (raw)', 'Dưa hấu tươi', 'Fruits', 100, '100g phần ăn được', 30, 0.6, 7.6, 0.2, 0.4, 6.2, 1, 0, 0.0, 112, 8.1, 7, 0.2),
('Avocado (raw)', 'Bơ tươi', 'Fruits', 100, '100g phần ăn được', 160, 2.0, 8.5, 14.7, 6.7, 0.7, 7, 0, 2.1, 485, 10.0, 12, 0.6),

-- Meat and poultry: cooked edible portion, no added oil or sauce.
('Chicken Breast (roasted, skinless)', 'Ức gà nướng bỏ da', 'Meat & Poultry', 100, '100g thịt chín', 165, 31.0, 0.0, 3.6, 0.0, 0.0, 74, 85, 1.0, 256, 0, 15, 1.0),
('Chicken Thigh (roasted, skinless)', 'Đùi gà nướng bỏ da', 'Meat & Poultry', 100, '100g thịt chín', 209, 26.0, 0.0, 10.9, 0.0, 0.0, 90, 135, 3.0, 240, 0, 13, 1.3),
('Pork Tenderloin (roasted)', 'Thăn heo nướng', 'Meat & Poultry', 100, '100g thịt chín', 143, 26.0, 0.0, 3.5, 0.0, 0.0, 57, 73, 1.2, 421, 0, 6, 1.0),
('Pork Loin (roasted, lean only)', 'Thịt nạc lưng heo nướng', 'Meat & Poultry', 100, '100g thịt chín', 196, 29.0, 0.0, 7.7, 0.0, 0.0, 62, 88, 2.7, 362, 0, 19, 0.9),
('Beef Sirloin (grilled, lean only)', 'Thăn ngoại bò nướng bỏ mỡ', 'Meat & Poultry', 100, '100g thịt chín', 206, 29.0, 0.0, 9.0, 0.0, 0.0, 55, 89, 3.5, 315, 0, 12, 2.6),

-- Fish and seafood: cooked without added oil unless stated.
('Tilapia (baked)', 'Cá rô phi nướng', 'Seafood & Fish', 100, '100g cá chín', 128, 26.2, 0.0, 2.7, 0.0, 0.0, 56, 57, 0.9, 380, 0, 14, 0.7),
('Salmon (baked)', 'Cá hồi nướng', 'Seafood & Fish', 100, '100g cá chín', 206, 22.1, 0.0, 12.4, 0.0, 0.0, 61, 63, 2.4, 384, 0, 15, 0.3),
('Mackerel (grilled)', 'Cá thu nướng', 'Seafood & Fish', 100, '100g cá chín', 262, 23.9, 0.0, 17.8, 0.0, 0.0, 83, 75, 4.2, 401, 0, 15, 1.6),
('Shrimp (steamed)', 'Tôm hấp', 'Seafood & Fish', 100, '100g tôm chín', 99, 24.0, 0.2, 0.3, 0.0, 0.0, 111, 189, 0.1, 259, 0, 70, 0.5),
('Tuna (canned in water, drained)', 'Cá ngừ hộp ngâm nước để ráo', 'Seafood & Fish', 100, '100g cá để ráo', 116, 25.5, 0.0, 0.8, 0.0, 0.0, 247, 30, 0.2, 237, 0, 11, 1.2),

-- Eggs, dairy and plant protein.
('Chicken Egg (boiled)', 'Trứng gà luộc', 'Dairy & Eggs', 50, '1 quả cỡ vừa (50g)', 78, 6.3, 0.6, 5.3, 0.0, 0.6, 62, 186, 1.6, 63, 0, 25, 0.6),
('Milk (low fat 1%)', 'Sữa bò ít béo 1%', 'Dairy & Eggs', 240, '1 ly (240ml)', 102, 8.2, 12.2, 2.4, 0.0, 12.2, 107, 12, 1.5, 366, 0, 305, 0.1),
('Greek Yogurt (plain, nonfat)', 'Sữa chua Hy Lạp không đường không béo', 'Dairy & Eggs', 100, '100g sữa chua', 59, 10.3, 3.6, 0.4, 0.0, 3.2, 36, 5, 0.1, 141, 0, 110, 0.1),
('Firm Tofu (calcium-set)', 'Đậu hũ trắng cứng', 'Legumes & Beans', 100, '100g đậu hũ', 76, 8.1, 1.9, 4.8, 0.3, 0.6, 7, 0, 0.7, 121, 0.1, 350, 5.4),
('Mung Beans (cooked, unsalted)', 'Đậu xanh nấu chín không muối', 'Legumes & Beans', 100, '100g đậu chín', 105, 7.0, 19.2, 0.4, 7.6, 2.0, 2, 0, 0.1, 266, 1.0, 27, 1.4),
('Black Beans (cooked, unsalted)', 'Đậu đen nấu chín không muối', 'Legumes & Beans', 100, '100g đậu chín', 132, 8.9, 23.7, 0.5, 8.7, 0.3, 1, 0, 0.1, 355, 0, 27, 2.1),

-- Nuts, seeds and cooking fats.
('Peanuts (dry roasted, unsalted)', 'Đậu phộng rang không muối', 'Nuts & Seeds', 30, '30g hạt', 176, 7.3, 6.4, 14.9, 2.5, 1.4, 2, 0, 2.1, 190, 0, 16, 0.7),
('Cashews (dry roasted, unsalted)', 'Hạt điều rang không muối', 'Nuts & Seeds', 30, '30g hạt', 172, 4.6, 9.8, 13.9, 0.9, 1.7, 5, 0, 2.3, 190, 0, 14, 1.8),
('Sesame Seeds (toasted)', 'Mè rang', 'Nuts & Seeds', 15, '1 muỗng canh (15g)', 85, 2.6, 3.5, 7.5, 1.8, 0.0, 2, 0, 1.0, 70, 0, 146, 2.2),
('Chia Seeds (dry)', 'Hạt chia khô', 'Nuts & Seeds', 15, '1 muỗng canh (15g)', 73, 2.5, 6.3, 4.6, 5.2, 0.0, 2, 0, 0.5, 61, 0.2, 95, 1.2),
('Olive Oil', 'Dầu ô liu', 'Oils & Fats', 10, '2 muỗng cà phê (10g)', 88, 0.0, 0.0, 10.0, 0.0, 0.0, 0, 0, 1.4, 0, 0, 0, 0.1),
('Canola Oil', 'Dầu hạt cải', 'Oils & Fats', 10, '2 muỗng cà phê (10g)', 88, 0.0, 0.0, 10.0, 0.0, 0.0, 0, 0, 0.7, 0, 0, 0, 0.0),

-- Common beverage and condiment entries where sodium/sugar matters.
('Unsweetened Soy Milk', 'Sữa đậu nành không đường', 'Beverages', 240, '1 ly (240ml)', 80, 7.0, 4.0, 4.0, 2.0, 1.0, 90, 0, 0.5, 300, 0, 300, 1.1),
('Fish Sauce', 'Nước mắm', 'Condiments & Sauces', 15, '1 muỗng canh (15ml)', 10, 2.0, 0.7, 0.0, 0.0, 0.3, 1410, 0, 0.0, 52, 0, 10, 0.2),
('Soy Sauce (regular)', 'Nước tương thường', 'Condiments & Sauces', 15, '1 muỗng canh (15ml)', 9, 1.3, 0.8, 0.1, 0.1, 0.1, 879, 0, 0.0, 70, 0, 5, 0.4);

INSERT INTO food_items (
    name, name_vi, category_id, serving_size_g, serving_description,
    calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg,
    cholesterol_mg, saturated_fat_g, potassium_mg, vitamin_c_mg,
    calcium_mg, iron_mg, created_by_user_id, is_verified, is_public
)
SELECT
    seed.name, seed.name_vi, category.id, seed.serving_size_g, seed.serving_description,
    seed.calories, seed.protein_g, seed.carbs_g, seed.fat_g, seed.fiber_g,
    seed.sugar_g, seed.sodium_mg, seed.cholesterol_mg, seed.saturated_fat_g,
    seed.potassium_mg, seed.vitamin_c_mg, seed.calcium_mg, seed.iron_mg,
    NULL, 1, 1
FROM seed_food_catalog seed
JOIN food_categories category ON category.name = seed.category_name
LEFT JOIN food_items existing ON existing.name = seed.name
WHERE existing.id IS NULL;

DROP TEMPORARY TABLE seed_food_catalog;

-- ============================================================
-- 3) System activity catalog
-- MET is an estimate for a representative adult, not a medical measurement.
-- ============================================================

USE activity_db;

INSERT INTO activity_types
    (name, name_vi, category, met_value, icon, description, is_system, hidden)
VALUES
('Walking (3.2 km/h)', 'Đi bộ chậm (3,2 km/h)', 'DAILY', 2.8, 'walking', 'Đi bộ trên mặt phẳng với tốc độ chậm.', 1, 0),
('Walking (4.8 km/h)', 'Đi bộ vừa (4,8 km/h)', 'DAILY', 3.5, 'walking', 'Đi bộ trên mặt phẳng với tốc độ vừa.', 1, 0),
('Walking (5.6 km/h)', 'Đi bộ nhanh (5,6 km/h)', 'CARDIO', 4.3, 'walking', 'Đi bộ nhanh trên mặt phẳng.', 1, 0),
('Walking Uphill (moderate)', 'Đi bộ lên dốc vừa', 'CARDIO', 5.3, 'hiking', 'Đi bộ lên dốc ở cường độ vừa.', 1, 0),
('Running (8 km/h)', 'Chạy bộ (8 km/h)', 'CARDIO', 8.3, 'running', 'Chạy đều khoảng 8 km/h.', 1, 0),
('Running (10 km/h)', 'Chạy bộ (10 km/h)', 'CARDIO', 9.8, 'running', 'Chạy đều khoảng 10 km/h.', 1, 0),
('Running (12 km/h)', 'Chạy bộ (12 km/h)', 'CARDIO', 11.5, 'running', 'Chạy nhanh khoảng 12 km/h.', 1, 0),
('Cycling (leisure, under 16 km/h)', 'Đạp xe thư giãn dưới 16 km/h', 'CARDIO', 4.0, 'cycling', 'Đạp xe ngoài trời tốc độ nhẹ.', 1, 0),
('Cycling (moderate, 16-19 km/h)', 'Đạp xe vừa (16-19 km/h)', 'CARDIO', 6.8, 'cycling', 'Đạp xe ngoài trời cường độ vừa.', 1, 0),
('Cycling (vigorous, 20-23 km/h)', 'Đạp xe mạnh (20-23 km/h)', 'CARDIO', 10.0, 'cycling', 'Đạp xe ngoài trời cường độ cao.', 1, 0),
('Swimming (leisure)', 'Bơi thư giãn', 'CARDIO', 6.0, 'swimming', 'Bơi không thi đấu với nhịp thoải mái.', 1, 0),
('Swimming Laps (moderate)', 'Bơi nhiều vòng cường độ vừa', 'CARDIO', 8.0, 'swimming', 'Bơi liên tục nhiều vòng ở cường độ vừa.', 1, 0),
('Jump Rope (moderate)', 'Nhảy dây cường độ vừa', 'CARDIO', 11.8, 'jump-rope', 'Nhảy dây liên tục ở nhịp vừa.', 1, 0),
('Elliptical Trainer (moderate)', 'Máy elliptical cường độ vừa', 'CARDIO', 5.0, 'elliptical', 'Tập máy elliptical ở mức gắng sức vừa.', 1, 0),
('Rowing Machine (moderate)', 'Máy chèo thuyền cường độ vừa', 'CARDIO', 7.0, 'rowing', 'Chèo máy công suất vừa, vận động toàn thân.', 1, 0),
('Weight Training (light to moderate)', 'Tập tạ nhẹ đến vừa', 'STRENGTH', 3.5, 'weights', 'Tập tạ nhiều bài, có thời gian nghỉ giữa hiệp.', 1, 0),
('Weight Training (vigorous)', 'Tập tạ cường độ cao', 'STRENGTH', 6.0, 'weights', 'Tập tạ nặng hoặc mật độ tập cao.', 1, 0),
('Circuit Training (moderate)', 'Circuit cường độ vừa', 'STRENGTH', 5.0, 'circuit', 'Luân phiên bài sức mạnh và thể lực với nghỉ ngắn.', 1, 0),
('Calisthenics (moderate)', 'Thể dục trọng lượng cơ thể vừa', 'STRENGTH', 3.8, 'calisthenics', 'Hít đất, squat, gập bụng và bài trọng lượng cơ thể ở nhịp vừa.', 1, 0),
('Calisthenics (vigorous)', 'Thể dục trọng lượng cơ thể mạnh', 'STRENGTH', 8.0, 'calisthenics', 'Bài trọng lượng cơ thể liên tục ở cường độ cao.', 1, 0),
('Core Workout', 'Tập cơ lõi', 'STRENGTH', 4.0, 'core', 'Plank, dead bug, bird dog và các bài cơ lõi có nghỉ.', 1, 0),
('Hatha Yoga', 'Yoga Hatha', 'FLEXIBILITY', 2.5, 'yoga', 'Yoga Hatha với chuyển động chậm và giữ tư thế.', 1, 0),
('Pilates (general)', 'Pilates cơ bản', 'FLEXIBILITY', 3.0, 'pilates', 'Pilates tập trung kiểm soát cơ lõi và tư thế.', 1, 0),
('Stretching (mild)', 'Giãn cơ nhẹ', 'FLEXIBILITY', 2.3, 'stretching', 'Giãn cơ chủ động hoặc tĩnh ở mức nhẹ.', 1, 0),
('Tai Chi', 'Thái cực quyền', 'FLEXIBILITY', 3.0, 'tai-chi', 'Chuỗi chuyển động chậm, liên tục, chú trọng thăng bằng.', 1, 0),
('Football / Soccer (casual)', 'Bóng đá phong trào', 'SPORTS', 7.0, 'soccer', 'Đá bóng phong trào, gồm cả thời gian di chuyển và dừng ngắn.', 1, 0),
('Badminton (recreational)', 'Cầu lông phong trào', 'SPORTS', 5.5, 'badminton', 'Đánh cầu lông không thi đấu.', 1, 0),
('Tennis (singles)', 'Quần vợt đơn', 'SPORTS', 8.0, 'tennis', 'Đánh quần vợt đơn.', 1, 0),
('Table Tennis', 'Bóng bàn', 'SPORTS', 4.0, 'table-tennis', 'Đánh bóng bàn phong trào.', 1, 0),
('Basketball (game)', 'Bóng rổ thi đấu', 'SPORTS', 8.0, 'basketball', 'Chơi bóng rổ theo trận.', 1, 0),
('Volleyball (recreational)', 'Bóng chuyền phong trào', 'SPORTS', 3.0, 'volleyball', 'Chơi bóng chuyền phong trào, không thi đấu cường độ cao.', 1, 0),
('Stair Climbing (general)', 'Leo cầu thang', 'DAILY', 6.8, 'stairs', 'Đi lên cầu thang liên tục ở nhịp thông thường.', 1, 0),
('House Cleaning (moderate)', 'Dọn nhà cường độ vừa', 'DAILY', 3.3, 'home', 'Quét, lau nhà và dọn dẹp liên tục.', 1, 0),
('Gardening (general)', 'Làm vườn', 'DAILY', 4.0, 'gardening', 'Trồng cây, làm cỏ và công việc vườn thông thường.', 1, 0),
('Dancing (general)', 'Nhảy múa thông thường', 'CARDIO', 5.0, 'dance', 'Nhảy liên tục ở cường độ vừa.', 1, 0)
ON DUPLICATE KEY UPDATE
    name_vi = VALUES(name_vi),
    category = VALUES(category),
    met_value = VALUES(met_value),
    icon = VALUES(icon),
    description = VALUES(description),
    is_system = VALUES(is_system),
    hidden = VALUES(hidden);

COMMIT;

-- Verification summary. The sample count below must be 6.
SELECT COUNT(*) AS sample_catalog_foods_present
FROM nutrition_db.food_items item
WHERE item.name IN (
    'Jasmine Rice (cooked)', 'Brown Rice (cooked, unsalted)',
    'Chicken Breast (roasted, skinless)', 'Tilapia (baked)',
    'Guava (raw)', 'Firm Tofu (calcium-set)'
);

SELECT COUNT(*) AS visible_food_categories
FROM nutrition_db.food_categories
WHERE hidden = 0;

SELECT COUNT(*) AS system_activity_types
FROM activity_db.activity_types
WHERE is_system = 1 AND hidden = 0;
