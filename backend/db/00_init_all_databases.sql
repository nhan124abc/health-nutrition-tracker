-- ============================================================
-- Health Nutrition Tracker - Khởi tạo tất cả databases
-- Mô hình: Database-per-Service (mỗi microservice 1 DB riêng)
-- ============================================================
--
-- Lý do dùng Database-per-Service thay vì Shared Database:
--   ✅ Loose coupling: mỗi service độc lập hoàn toàn
--   ✅ Có thể scale từng service riêng biệt
--   ✅ Có thể dùng loại DB khác nhau cho từng service nếu cần
--   ✅ Thay đổi schema 1 service không ảnh hưởng service khác
--   ✅ Phù hợp với microservice best practice
--
-- Mỗi service có DB riêng:
--   auth-service       → auth_db
--   user-service       → user_db
--   nutrition-service  → nutrition_db
--   meal-service       → meal_db
--   activity-service   → activity_db
--   analytics-service  → analytics_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS user_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS nutrition_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS meal_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS activity_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS analytics_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS ai_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
