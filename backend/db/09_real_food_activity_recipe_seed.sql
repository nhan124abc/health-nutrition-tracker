-- ============================================================
-- REALISTIC FOOD, ACTIVITY AND RECIPE SEED DATA
-- Databases: nutrition_db, activity_db
-- Safe to run after 03_nutrition_db.sql and 05_activity_db.sql.
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- 1) Nutrition categories and food items
-- ============================================================

USE nutrition_db;

INSERT INTO food_categories (name, name_vi, icon) VALUES
('Grains & Rice',       'Ngũ cốc & Gạo',              'rice'),
('Vegetables',          'Rau củ',                     'vegetable'),
('Fruits',              'Trái cây',                   'fruit'),
('Meat & Poultry',      'Thịt & Gia cầm',             'meat'),
('Seafood & Fish',      'Hải sản & Cá',               'fish'),
('Dairy & Eggs',        'Sữa & Trứng',                'egg'),
('Legumes & Beans',     'Đậu & Các loại đậu',         'beans'),
('Nuts & Seeds',        'Hạt & Các loại hạt',         'nuts'),
('Condiments & Sauces', 'Gia vị & Nước chấm',         'seasoning')
ON DUPLICATE KEY UPDATE
    name_vi = VALUES(name_vi),
    icon = VALUES(icon);

SET @cat_grains = (SELECT id FROM food_categories WHERE name = 'Grains & Rice' LIMIT 1);
SET @cat_vegetables = (SELECT id FROM food_categories WHERE name = 'Vegetables' LIMIT 1);
SET @cat_fruits = (SELECT id FROM food_categories WHERE name = 'Fruits' LIMIT 1);
SET @cat_meat = (SELECT id FROM food_categories WHERE name = 'Meat & Poultry' LIMIT 1);
SET @cat_seafood = (SELECT id FROM food_categories WHERE name = 'Seafood & Fish' LIMIT 1);
SET @cat_dairy = (SELECT id FROM food_categories WHERE name = 'Dairy & Eggs' LIMIT 1);
SET @cat_legumes = (SELECT id FROM food_categories WHERE name = 'Legumes & Beans' LIMIT 1);
SET @cat_nuts = (SELECT id FROM food_categories WHERE name = 'Nuts & Seeds' LIMIT 1);
SET @cat_condiments = (SELECT id FROM food_categories WHERE name = 'Condiments & Sauces' LIMIT 1);

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Rolled Oats', 'Yến mạch cán dẹt', @cat_grains, 40, '40g yến mạch khô', 150, 5.0, 27.0, 3.0, 4.0, 1.0, 2.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Rolled Oats');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Sweet Potato (boiled)', 'Khoai lang luộc', @cat_grains, 100, '100g khoai lang luộc', 86, 1.6, 20.1, 0.1, 3.0, 4.2, 55.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Sweet Potato (boiled)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Rice Vermicelli (cooked)', 'Bún tươi', @cat_grains, 100, '100g bún tươi', 110, 2.0, 24.0, 0.2, 0.8, 0.2, 5.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Rice Vermicelli (cooked)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Quinoa (cooked)', 'Hạt quinoa nấu chín', @cat_grains, 100, '100g quinoa nấu chín', 120, 4.4, 21.3, 1.9, 2.8, 0.9, 7.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Quinoa (cooked)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Chicken Thigh (skinless cooked)', 'Đùi gà bỏ da nấu chín', @cat_meat, 100, '100g đùi gà bỏ da', 209, 26.0, 0.0, 10.9, 0.0, 0.0, 90.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Chicken Thigh (skinless cooked)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Pork Tenderloin (cooked)', 'Thịt thăn heo nấu chín', @cat_meat, 100, '100g thịt thăn heo', 143, 26.0, 0.0, 3.5, 0.0, 0.0, 57.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Pork Tenderloin (cooked)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Salmon (grilled)', 'Cá hồi nướng', @cat_seafood, 100, '100g cá hồi nướng', 208, 20.4, 0.0, 13.4, 0.0, 0.0, 59.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Salmon (grilled)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Tuna (water packed)', 'Cá ngừ ngâm nước', @cat_seafood, 100, '100g cá ngừ', 116, 25.5, 0.0, 0.8, 0.0, 0.0, 247.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Tuna (water packed)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Firm Tofu', 'Đậu hũ trắng', @cat_legumes, 100, '100g đậu hũ', 76, 8.1, 1.9, 4.8, 0.3, 0.6, 7.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Firm Tofu');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Black Beans (cooked)', 'Đậu đen nấu chín', @cat_legumes, 100, '100g đậu đen', 132, 8.9, 23.7, 0.5, 8.7, 0.3, 1.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Black Beans (cooked)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Spinach', 'Rau bina', @cat_vegetables, 100, '100g rau bina', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Spinach');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Cucumber', 'Dưa leo', @cat_vegetables, 100, '100g dưa leo', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Cucumber');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Tomato', 'Cà chua', @cat_vegetables, 100, '100g cà chua', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Tomato');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Carrot', 'Cà rốt', @cat_vegetables, 100, '100g cà rốt', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Carrot');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Avocado', 'Bơ sáp', @cat_fruits, 100, '100g bơ', 160, 2.0, 8.5, 14.7, 6.7, 0.7, 7.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Avocado');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Apple', 'Táo', @cat_fruits, 100, '100g táo', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Apple');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Greek Yogurt (plain)', 'Sữa chua Hy Lạp không đường', @cat_dairy, 100, '100g sữa chua Hy Lạp', 59, 10.0, 3.6, 0.4, 0.0, 3.2, 36.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Greek Yogurt (plain)');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Peanuts', 'Đậu phộng rang', @cat_nuts, 30, '30g đậu phộng', 170, 7.3, 4.8, 14.0, 2.4, 1.4, 5.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Peanuts');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Olive Oil', 'Dầu ô liu', @cat_condiments, 10, '1 muỗng canh nhỏ (10g)', 88, 0.0, 0.0, 10.0, 0.0, 0.0, 0.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Olive Oil');

INSERT INTO food_items
    (name, name_vi, category_id, serving_size_g, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, is_verified, is_public)
SELECT 'Low Sodium Soy Sauce', 'Nước tương ít muối', @cat_condiments, 15, '1 muỗng canh (15ml)', 8, 1.0, 1.0, 0.0, 0.1, 0.2, 575.0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM food_items WHERE name = 'Low Sodium Soy Sauce');

-- ============================================================
-- 2) Recipes and recipe ingredients
-- user_id has no FK in nutrition_db, so 1 is safe for shared seed data.
-- ============================================================

SET @seed_user_id = 1;

INSERT INTO recipes (user_id, name, description, servings, is_public, total_calories, total_protein_g, total_carbs_g, total_fat_g)
SELECT @seed_user_id, 'Cơm gà áp chảo bông cải', 'Áp chảo ức gà với ít dầu ô liu, ăn cùng cơm trắng và bông cải luộc.', 1, 1, 462, 40.1, 46.2, 13.7
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE name = 'Cơm gà áp chảo bông cải');

INSERT INTO recipes (user_id, name, description, servings, is_public, total_calories, total_protein_g, total_carbs_g, total_fat_g)
SELECT @seed_user_id, 'Bún cá ngừ rau củ', 'Trộn bún tươi với cá ngừ, dưa leo, cà chua và nước tương ít muối.', 1, 1, 276, 29.8, 38.2, 1.3
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE name = 'Bún cá ngừ rau củ');

INSERT INTO recipes (user_id, name, description, servings, is_public, total_calories, total_protein_g, total_carbs_g, total_fat_g)
SELECT @seed_user_id, 'Salad cá hồi bơ cà chua', 'Cá hồi nướng ăn cùng bơ, cà chua, dưa leo và rau bina.', 1, 1, 402, 26.2, 17.3, 27.6
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE name = 'Salad cá hồi bơ cà chua');

INSERT INTO recipes (user_id, name, description, servings, is_public, total_calories, total_protein_g, total_carbs_g, total_fat_g)
SELECT @seed_user_id, 'Đậu hũ sốt cà chua ăn khoai lang', 'Đậu hũ nấu sốt cà chua, ăn cùng khoai lang luộc và rau bina.', 1, 1, 285, 13.0, 40.0, 8.4
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE name = 'Đậu hũ sốt cà chua ăn khoai lang');

INSERT INTO recipes (user_id, name, description, servings, is_public, total_calories, total_protein_g, total_carbs_g, total_fat_g)
SELECT @seed_user_id, 'Yến mạch sữa chua táo đậu phộng', 'Trộn yến mạch, sữa chua Hy Lạp, táo cắt hạt lựu và đậu phộng rang.', 1, 1, 363, 18.0, 48.2, 12.8
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE name = 'Yến mạch sữa chua táo đậu phộng');

INSERT INTO recipes (user_id, name, description, servings, is_public, total_calories, total_protein_g, total_carbs_g, total_fat_g)
SELECT @seed_user_id, 'Quinoa đậu đen ức gà', 'Quinoa trộn đậu đen, ức gà xé và cà chua, phù hợp bữa trưa giàu protein.', 1, 1, 430, 43.8, 51.6, 6.5
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE name = 'Quinoa đậu đen ức gà');

-- Cơm gà áp chảo bông cải
SET @recipe_id = (SELECT id FROM recipes WHERE name = 'Cơm gà áp chảo bông cải' LIMIT 1);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 120, 156, 3.2, 33.8, 0.4 FROM food_items WHERE name = 'White Rice (cooked)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 120, 198, 37.2, 0, 4.3 FROM food_items WHERE name = 'Chicken Breast (cooked)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 100, 35, 2.3, 7.2, 0.4 FROM food_items WHERE name = 'Broccoli (cooked)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 8, 70, 0, 0, 8 FROM food_items WHERE name = 'Olive Oil'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);

-- Bún cá ngừ rau củ
SET @recipe_id = (SELECT id FROM recipes WHERE name = 'Bún cá ngừ rau củ' LIMIT 1);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 120, 132, 2.4, 28.8, 0.2 FROM food_items WHERE name = 'Rice Vermicelli (cooked)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 100, 116, 25.5, 0, 0.8 FROM food_items WHERE name = 'Tuna (water packed)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 80, 12, 0.6, 2.9, 0.1 FROM food_items WHERE name = 'Cucumber'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 80, 14, 0.7, 3.1, 0.2 FROM food_items WHERE name = 'Tomato'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);

-- Salad cá hồi bơ cà chua
SET @recipe_id = (SELECT id FROM recipes WHERE name = 'Salad cá hồi bơ cà chua' LIMIT 1);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 120, 250, 24.5, 0, 16.1 FROM food_items WHERE name = 'Salmon (grilled)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 70, 112, 1.4, 6.0, 10.3 FROM food_items WHERE name = 'Avocado'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 100, 23, 2.9, 3.6, 0.4 FROM food_items WHERE name = 'Spinach'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 90, 16, 0.8, 3.5, 0.2 FROM food_items WHERE name = 'Tomato'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);

-- Đậu hũ sốt cà chua ăn khoai lang
SET @recipe_id = (SELECT id FROM recipes WHERE name = 'Đậu hũ sốt cà chua ăn khoai lang' LIMIT 1);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 130, 99, 10.5, 2.5, 6.2 FROM food_items WHERE name = 'Firm Tofu'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 150, 129, 2.4, 30.2, 0.2 FROM food_items WHERE name = 'Sweet Potato (boiled)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 120, 22, 1.1, 4.7, 0.2 FROM food_items WHERE name = 'Tomato'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 80, 18, 2.3, 2.9, 0.3 FROM food_items WHERE name = 'Spinach'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);

-- Yến mạch sữa chua táo đậu phộng
SET @recipe_id = (SELECT id FROM recipes WHERE name = 'Yến mạch sữa chua táo đậu phộng' LIMIT 1);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 40, 150, 5.0, 27.0, 3.0 FROM food_items WHERE name = 'Rolled Oats'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 120, 71, 12.0, 4.3, 0.5 FROM food_items WHERE name = 'Greek Yogurt (plain)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 100, 52, 0.3, 13.8, 0.2 FROM food_items WHERE name = 'Apple'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 15, 85, 3.7, 2.4, 7.0 FROM food_items WHERE name = 'Peanuts'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);

-- Quinoa đậu đen ức gà
SET @recipe_id = (SELECT id FROM recipes WHERE name = 'Quinoa đậu đen ức gà' LIMIT 1);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 120, 144, 5.3, 25.6, 2.3 FROM food_items WHERE name = 'Quinoa (cooked)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 80, 106, 7.1, 19.0, 0.4 FROM food_items WHERE name = 'Black Beans (cooked)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 100, 165, 31.0, 0, 3.6 FROM food_items WHERE name = 'Chicken Breast (cooked)'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);
INSERT INTO recipe_ingredients (recipe_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
SELECT @recipe_id, id, name_vi, 80, 14, 0.7, 3.1, 0.2 FROM food_items WHERE name = 'Tomato'
AND NOT EXISTS (SELECT 1 FROM recipe_ingredients WHERE recipe_id = @recipe_id AND food_item_id = food_items.id);

-- ============================================================
-- 3) Activity types
-- ============================================================

USE activity_db;

INSERT INTO activity_types (name, name_vi, category, met_value, icon, description, is_system) VALUES
('Hiking', 'Đi bộ đường dài', 'CARDIO', 6.0, 'hiking', 'Đi bộ đường dài hoặc leo dốc nhẹ ngoài trời.', 1),
('Elliptical Trainer', 'Máy elliptical', 'CARDIO', 5.0, 'elliptical', 'Tập cardio trên máy elliptical, ít áp lực lên khớp gối.', 1),
('Rowing Machine', 'Máy chèo thuyền', 'CARDIO', 7.0, 'rowing', 'Tập toàn thân trên máy chèo thuyền.', 1),
('Pilates', 'Pilates', 'FLEXIBILITY', 3.0, 'pilates', 'Tăng sức mạnh cơ lõi, kiểm soát chuyển động và độ linh hoạt.', 1),
('Zumba', 'Zumba', 'CARDIO', 6.5, 'dance', 'Nhảy theo nhạc cường độ vừa đến cao.', 1),
('Tai Chi', 'Thái cực quyền', 'FLEXIBILITY', 2.5, 'tai-chi', 'Vận động chậm, hỗ trợ thăng bằng và thư giãn.', 1),
('Tennis', 'Quần vợt', 'SPORTS', 7.3, 'tennis', 'Vận động thể thao cường độ vừa đến cao.', 1),
('Strength Circuit', 'Circuit sức mạnh', 'STRENGTH', 6.0, 'circuit', 'Tập luân phiên nhiều bài sức mạnh với nghỉ ngắn.', 1),
('Squat', 'Squat', 'STRENGTH', 5.0, 'squat', 'Bài tập thân dưới tập trung cơ đùi và mông.', 1),
('Deadlift', 'Deadlift', 'STRENGTH', 6.0, 'deadlift', 'Bài tập sức mạnh chuỗi sau, cần kỹ thuật đúng.', 1),
('Bench Press', 'Đẩy ngực', 'STRENGTH', 5.0, 'bench-press', 'Bài tập thân trên tập trung ngực, vai trước và tay sau.', 1),
('Core Workout', 'Tập cơ lõi', 'STRENGTH', 4.0, 'core', 'Các bài plank, crunch, dead bug và biến thể cơ bụng.', 1)
ON DUPLICATE KEY UPDATE
    name_vi = VALUES(name_vi),
    category = VALUES(category),
    met_value = VALUES(met_value),
    icon = VALUES(icon),
    description = VALUES(description),
    is_system = VALUES(is_system);

-- Quick checks
SELECT COUNT(*) AS seeded_food_count
FROM nutrition_db.food_items
WHERE name IN (
    'Rolled Oats', 'Sweet Potato (boiled)', 'Rice Vermicelli (cooked)', 'Quinoa (cooked)',
    'Chicken Thigh (skinless cooked)', 'Pork Tenderloin (cooked)', 'Salmon (grilled)',
    'Tuna (water packed)', 'Firm Tofu', 'Black Beans (cooked)', 'Spinach', 'Cucumber',
    'Tomato', 'Carrot', 'Avocado', 'Apple', 'Greek Yogurt (plain)', 'Peanuts',
    'Olive Oil', 'Low Sodium Soy Sauce'
);

SELECT COUNT(*) AS seeded_recipe_count
FROM nutrition_db.recipes
WHERE name IN (
    'Cơm gà áp chảo bông cải',
    'Bún cá ngừ rau củ',
    'Salad cá hồi bơ cà chua',
    'Đậu hũ sốt cà chua ăn khoai lang',
    'Yến mạch sữa chua táo đậu phộng',
    'Quinoa đậu đen ức gà'
);

SELECT COUNT(*) AS seeded_activity_count
FROM activity_db.activity_types
WHERE name IN (
    'Hiking', 'Elliptical Trainer', 'Rowing Machine', 'Pilates', 'Zumba', 'Tai Chi',
    'Tennis', 'Strength Circuit', 'Squat', 'Deadlift', 'Bench Press', 'Core Workout'
);
