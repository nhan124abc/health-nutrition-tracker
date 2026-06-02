# Database Design - Health Nutrition Tracker

## 🗄️ Kiến trúc Database: **Database-per-Service**

### Tại sao dùng Database-per-Service thay vì Shared Database?

| Tiêu chí | Shared DB | Database-per-Service ✅ |
|----------|-----------|------------------------|
| **Coupling** | Chặt (các service phụ thuộc nhau qua schema) | Lỏng (mỗi service hoàn toàn độc lập) |
| **Scale** | Phải scale cả DB khi 1 service cần | Scale từng DB riêng biệt |
| **Deploy** | Thay đổi schema ảnh hưởng tất cả service | Thay đổi schema 1 service không ảnh hưởng service khác |
| **Tech flexibility** | Phải dùng cùng 1 loại DB | Có thể dùng DB khác nhau (MySQL, PostgreSQL, MongoDB...) |
| **Fault isolation** | 1 DB chết = tất cả chết | 1 DB chết chỉ ảnh hưởng service đó |
| **Microservice best practice** | ❌ Anti-pattern | ✅ Đúng chuẩn |

---

## 📁 Cấu trúc Files SQL

```
db/
├── 00_init_all_databases.sql   # Tạo tất cả databases
├── 01_auth_db.sql              # Auth Service DB
├── 02_user_db.sql              # User Service DB
├── 03_nutrition_db.sql         # Nutrition Service DB
├── 04_meal_db.sql              # Meal Service DB
├── 05_activity_db.sql          # Activity Service DB
├── 06_analytics_db.sql         # Analytics Service DB
├── run_all.sql                 # Script chạy tất cả
└── README.md                   # File này
```

---

## 🗃️ Sơ đồ Database theo Service

### 1. `auth_db` → **Auth Service** (port 8081)
| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản đăng nhập (email/password + OAuth2 Google/Facebook) |
| `refresh_tokens` | JWT Refresh Token |
| `login_audit` | Lịch sử đăng nhập (bảo mật) |

### 2. `user_db` → **User Service**
| Bảng | Mô tả |
|------|-------|
| `user_profiles` | Hồ sơ chi tiết: chiều cao, cân nặng, mục tiêu sức khỏe |
| `body_metrics` | Lịch sử chỉ số cơ thể (cân nặng, BMI, % mỡ...) |
| `water_logs` | Theo dõi lượng nước uống hàng ngày |
| `user_notification_settings` | Cài đặt thông báo nhắc nhở |

### 3. `nutrition_db` → **Nutrition Service**
| Bảng | Mô tả |
|------|-------|
| `food_categories` | Danh mục thực phẩm (14 loại) |
| `food_items` | Danh sách thực phẩm + giá trị dinh dưỡng (có data mẫu VN) |
| `recipes` | Công thức nấu ăn của người dùng |
| `recipe_ingredients` | Nguyên liệu trong công thức |

### 4. `meal_db` → **Meal Service**
| Bảng | Mô tả |
|------|-------|
| `meals` | Bữa ăn (sáng/trưa/tối/snack) |
| `meal_items` | Chi tiết từng món ăn trong bữa |
| `meal_plans` | Kế hoạch ăn uống theo tuần/tháng |
| `meal_plan_entries` | Chi tiết từng ngày trong kế hoạch |
| `favorite_foods` | Thực phẩm yêu thích |

### 5. `activity_db` → **Activity Service**
| Bảng | Mô tả |
|------|-------|
| `activity_types` | Danh mục hoạt động + MET Value (20 loại có sẵn) |
| `activity_logs` | Nhật ký hoạt động thể chất |
| `workout_plans` | Kế hoạch tập luyện cá nhân |
| `workout_plan_exercises` | Bài tập trong kế hoạch |
| `step_logs` | Số bước chân hàng ngày |

### 6. `analytics_db` → **Analytics Service**
| Bảng | Mô tả |
|------|-------|
| `daily_summaries` | Tóm tắt sức khỏe hàng ngày (tổng hợp từ các service) |
| `weekly_reports` | Báo cáo theo tuần |
| `monthly_reports` | Báo cáo theo tháng |
| `nutrition_trends` | Xu hướng thực phẩm thường ăn |
| `user_streaks` | Chuỗi ngày đạt mục tiêu (gamification) |
| `health_insights` | Gợi ý & nhận xét cá nhân hoá |

---

## 🔗 Cross-Service Data Flow

```
auth-service ──(user_id)──► user-service
                       └───► meal-service
                       └───► activity-service
                       └───► analytics-service

nutrition-service ──(food_item_id)──► meal-service
                                 └───► analytics-service

meal-service ──(events)──► analytics-service
activity-service ──(events)──► analytics-service
user-service ──(events)──► analytics-service
```

> ⚠️ **Quan trọng:** Không dùng FOREIGN KEY giữa các databases khác nhau.  
> Thay vào đó, dùng:
> - **Denormalization**: copy dữ liệu cần thiết (food_name, activity_name...)
> - **Event-driven**: publish/subscribe qua Message Queue (Kafka/RabbitMQ)
> - **API calls**: gọi service khác khi cần dữ liệu realtime

---

## 🚀 Cách chạy

### Chạy tất cả cùng lúc:
```bash
mysql -u root -p < db/run_all.sql
```

### Chạy từng file:
```bash
mysql -u root -p < db/00_init_all_databases.sql
mysql -u root -p auth_db < db/01_auth_db.sql
mysql -u root -p user_db < db/02_user_db.sql
mysql -u root -p nutrition_db < db/03_nutrition_db.sql
mysql -u root -p meal_db < db/04_meal_db.sql
mysql -u root -p activity_db < db/05_activity_db.sql
mysql -u root -p analytics_db < db/06_analytics_db.sql
```

---

## ⚙️ Cấu hình application.properties mỗi service

```properties
# auth-service
spring.datasource.url=jdbc:mysql://localhost:3306/auth_db

# user-service
spring.datasource.url=jdbc:mysql://localhost:3306/user_db

# nutrition-service
spring.datasource.url=jdbc:mysql://localhost:3306/nutrition_db

# meal-service
spring.datasource.url=jdbc:mysql://localhost:3306/meal_db

# activity-service
spring.datasource.url=jdbc:mysql://localhost:3306/activity_db

# analytics-service
spring.datasource.url=jdbc:mysql://localhost:3306/analytics_db

# ai-service
spring.datasource.url=jdbc:mysql://localhost:3306/ai_db
```

---

## AI Service DB

File schema: `07_ai_db.sql`

| Bang | Mo ta |
|------|-------|
| `ai_chat_messages` | Luu lich su tin nhan AI cho user da dang nhap hoac guest |
| `ai_usage_limits` | Dem so cau hoi moi ngay de gioi han usage |

Chay rieng schema AI:

```bash
mysql -u root -p < db/00_init_all_databases.sql
mysql -u root -p ai_db < db/07_ai_db.sql
```

