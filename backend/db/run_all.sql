-- ============================================================
-- MASTER SCRIPT - Chạy tất cả SQL files theo thứ tự
-- Sử dụng: mysql -u root -p < run_all.sql
-- ============================================================

-- Tạo tất cả databases
SOURCE 00_init_all_databases.sql;

-- Tạo schema cho từng service
SOURCE 01_auth_db.sql;
SOURCE 02_user_db.sql;
SOURCE 03_nutrition_db.sql;
SOURCE 04_meal_db.sql;
SOURCE 05_activity_db.sql;
SOURCE 06_analytics_db.sql;

SELECT 'All databases and schemas created successfully!' AS status;

