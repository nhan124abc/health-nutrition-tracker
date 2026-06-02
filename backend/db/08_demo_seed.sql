-- ============================================================
-- DEMO SEED DATA
-- Account demo:
--   admin@health.local / password
--   user@health.local  / password
-- ============================================================

USE auth_db;

INSERT IGNORE INTO users (id, email, password, full_name, role, auth_provider, is_active)
VALUES
    (1, 'admin@health.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin Demo', 'ADMIN', 'LOCAL', 1),
    (2, 'user@health.local',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'User Demo',  'USER',  'LOCAL', 1);

USE user_db;

INSERT IGNORE INTO user_profiles (
    id, user_id, username, date_of_birth, gender, height_cm, weight_kg,
    activity_level, goal, target_weight_kg, daily_calorie_goal,
    daily_protein_goal_g, daily_carbs_goal_g, daily_fat_goal_g,
    daily_water_goal_ml, timezone
)
VALUES
    (1, 1, 'admin_demo', '1995-01-01', 'MALE',   170, 68, 'MODERATELY_ACTIVE', 'MAINTAIN_WEIGHT', 68, 2200, 120, 275, 70, 2500, 'Asia/Ho_Chi_Minh'),
    (2, 2, 'user_demo',  '2002-05-20', 'FEMALE', 160, 58, 'LIGHTLY_ACTIVE',    'LOSE_WEIGHT',     54, 1700, 100, 190, 55, 2200, 'Asia/Ho_Chi_Minh');

INSERT IGNORE INTO body_metrics (id, user_id, weight_kg, body_fat_percentage, muscle_mass_kg, bmi, waist_cm, recorded_at, notes)
VALUES
    (1, 2, 59.20, 28.5, 38.0, 23.1, 74, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'Start tracking'),
    (2, 2, 58.70, 27.9, 38.2, 22.9, 73, DATE_SUB(CURDATE(), INTERVAL 7 DAY),  'Week 1 progress'),
    (3, 2, 58.00, 27.4, 38.4, 22.7, 72, CURDATE(),                            'Current weight');

INSERT IGNORE INTO water_logs (id, user_id, amount_ml, logged_at)
VALUES
    (1, 2, 500, CONCAT(CURDATE(), ' 08:30:00')),
    (2, 2, 700, CONCAT(CURDATE(), ' 12:45:00')),
    (3, 2, 600, CONCAT(CURDATE(), ' 18:10:00'));

USE meal_db;

INSERT IGNORE INTO meals (id, user_id, meal_type, meal_date, meal_time, notes, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g)
VALUES
    (1, 2, 'BREAKFAST', CURDATE(), '07:30:00', 'Breakfast demo', 237, 4.0, 55.2, 0.7, 3.5),
    (2, 2, 'LUNCH',     CURDATE(), '12:15:00', 'Lunch demo',     444, 39.0, 59.5, 4.4, 2.3),
    (3, 2, 'DINNER',    CURDATE(), '18:45:00', 'Dinner demo',    331, 32.4, 42.5, 4.5, 5.3);

INSERT IGNORE INTO meal_items (id, meal_id, food_item_id, item_type, food_name, serving_size_g, quantity, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg)
VALUES
    (1, 1, 1,  'FOOD', 'White Rice (cooked)',     100, 1.00, 130, 2.7, 28.2, 0.3, 0.4, 0),
    (2, 1, 11, 'FOOD', 'Banana',                  120, 1.00, 107, 1.3, 27.0, 0.4, 3.1, 1),
    (3, 2, 6,  'FOOD', 'Chicken Breast (cooked)', 100, 1.00, 165, 31.0, 0.0, 3.6, 0.0, 74),
    (4, 2, 1,  'FOOD', 'White Rice (cooked)',     100, 2.00, 260, 5.4, 56.4, 0.6, 0.8, 0),
    (5, 2, 8,  'FOOD', 'Morning Glory',           100, 1.00, 19,  2.6, 3.1,  0.2, 1.5, 30),
    (6, 3, 17, 'FOOD', 'Tilapia (cooked)',        100, 1.00, 128, 26.2, 0.0, 2.7, 0.0, 56),
    (7, 3, 2,  'FOOD', 'Brown Rice (cooked)',     100, 1.50, 168, 3.9, 35.3, 1.4, 2.7, 0),
    (8, 3, 10, 'FOOD', 'Broccoli (cooked)',       100, 1.00, 35,  2.3, 7.2,  0.4, 2.6, 41);

INSERT IGNORE INTO favorite_foods (id, user_id, food_item_id, item_type, food_name)
VALUES
    (1, 2, 6,  'FOOD', 'Chicken Breast (cooked)'),
    (2, 2, 11, 'FOOD', 'Banana'),
    (3, 2, 10, 'FOOD', 'Broccoli (cooked)');

USE activity_db;

INSERT IGNORE INTO activity_logs (
    id, user_id, activity_type_id, activity_name, category, duration_minutes,
    calories_burned, notes, logged_at, distance_km, avg_heart_rate, steps
)
VALUES
    (1, 2, 6, 'Walking (5 km/h)', 'DAILY', 35, 120, 'Morning walk', CONCAT(CURDATE(), ' 06:30:00'), 2.8, 105, 4200),
    (2, 2, 8, 'Weight Training',  'STRENGTH', 45, 180, 'Gym session', DATE_SUB(CONCAT(CURDATE(), ' 17:30:00'), INTERVAL 1 DAY), NULL, 128, NULL);

INSERT IGNORE INTO step_logs (id, user_id, log_date, steps, distance_km, calories, source)
VALUES
    (1, 2, CURDATE(), 7600, 5.20, 245, 'manual'),
    (2, 2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 8400, 5.90, 270, 'manual');

USE analytics_db;

INSERT IGNORE INTO daily_summaries (
    id, user_id, summary_date, total_calories_consumed, total_protein_g,
    total_carbs_g, total_fat_g, total_fiber_g, meal_count,
    total_calories_burned, total_active_minutes, total_steps,
    total_distance_km, activity_count, water_intake_ml,
    calorie_goal, calorie_goal_met, weight_kg
)
VALUES
    (1, 2, CURDATE(), 1110, 73.8, 110.2, 8.2, 9.8, 3, 120, 35, 7600, 5.2, 1, 1800, 1700, 1, 58.0),
    (2, 2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1650, 98.0, 180.0, 48.0, 18.0, 4, 180, 45, 8400, 5.9, 1, 2200, 1700, 1, 58.3);

INSERT IGNORE INTO weekly_reports (
    id, user_id, week_start_date, week_end_date, avg_daily_calories,
    avg_daily_protein_g, avg_daily_carbs_g, avg_daily_fat_g,
    avg_daily_water_ml, total_calories_consumed, total_calories_burned,
    avg_daily_steps, total_active_minutes, active_days_count,
    weight_start_kg, weight_end_kg, goal_met_days
)
VALUES
    (1, 2, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY),
     DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY),
     1510, 92, 168, 44, 2100, 10570, 1380, 7900, 260, 5, 58.7, 58.0, 5);

INSERT IGNORE INTO user_streaks (id, user_id, streak_type, current_streak, longest_streak, last_active_date)
VALUES
    (1, 2, 'LOGGING_STREAK', 7, 12, CURDATE());

INSERT IGNORE INTO health_insights (id, user_id, insight_type, title, content, valid_date)
VALUES
    (1, 2, 'NUTRITION_TIP', 'Protein is on track', 'Your protein intake is close to today goal. Keep meals balanced with vegetables and enough water.', CURDATE()),
    (2, 2, 'ACTIVITY_TIP', 'Add light cardio', 'A 20 minute walk after dinner can help improve your calorie balance today.', CURDATE());
