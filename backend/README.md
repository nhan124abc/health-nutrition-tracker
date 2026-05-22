# 🥗 Health Nutrition Tracker

> **Nền tảng theo dõi sức khỏe & dinh dưỡng cá nhân** xây dựng theo kiến trúc **Microservices** với Spring Boot 3.x.

[![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-green?logo=springboot)](https://spring.io/projects/spring-boot)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?logo=mysql)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-3.x-black?logo=apachekafka)](https://kafka.apache.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)

---

## 📋 Mục lục

- [Tổng quan kiến trúc](#-tổng-quan-kiến-trúc)
- [Danh sách Services](#-danh-sách-services)
- [Chi tiết từng Service](#-chi-tiết-từng-service)
  - [API Gateway](#1-api-gateway--port-8080)
  - [Auth Service](#2-auth-service--port-8081)
  - [User Service](#3-user-service--port-8082)
  - [Nutrition Service](#4-nutrition-service--port-8083)
  - [Meal Service](#5-meal-service--port-8084)
  - [Activity Service](#6-activity-service--port-8085)
  - [Analytics Service](#7-analytics-service--port-8086)
- [Luồng hoạt động](#-luồng-hoạt-động)
- [Database Design](#%EF%B8%8F-database-design)
- [Cấu trúc Project](#-cấu-trúc-project)
- [🐳 Chạy bằng Docker](#-chạy-bằng-docker)
  - [Yêu cầu](#yêu-cầu)
  - [Cấu hình môi trường](#1-cấu-hình-môi-trường)
  - [Chạy toàn bộ hệ thống](#2-chạy-toàn-bộ-hệ-thống)
  - [Chạy riêng Infrastructure](#3-chạy-riêng-infrastructure--spring-boot-locally)
  - [Quản lý containers](#4-quản-lý-containers)
  - [Xem Logs](#5-xem-logs)
  - [Troubleshooting](#-troubleshooting)
- [💡 Chạy bằng IntelliJ IDEA](#-chạy-bằng-intellij-idea)
  - [Yêu cầu IntelliJ](#yêu-cầu)
  - [Import project](#bước-1-import-project)
  - [Cấu hình Run Configuration](#bước-2-tạo-run-configurations)
  - [Chạy theo thứ tự](#bước-3-chạy-theo-thứ-tự)
  - [Sử dụng Services panel](#bước-4-sử-dụng-services-panel-intellij-ultimate)
- [🧪 Test bằng Postman](#-test-bằng-postman)
  - [Setup Environment](#1-tạo-environment)
  - [Luồng Authentication](#2-luồng-authentication)
  - [Auth Service APIs](#3-auth-service-apis)
  - [User Service APIs](#4-user-service-apis)
  - [Nutrition Service APIs](#5-nutrition-service-apis)
  - [Meal Service APIs](#6-meal-service-apis)
  - [Activity Service APIs](#7-activity-service-apis)
  - [Analytics Service APIs](#8-analytics-service-apis)
  - [Pre-request Script tự động](#9-pre-request-script-tự-động-renew-token)
- [API Reference](#-api-reference)
- [Tech Stack](#-tech-stack)

---

## 🏛 Tổng quan kiến trúc

```
                           ┌─────────────────────────────────────────────┐
                           │              CLIENT APPLICATIONS            │
                           │    Web App (React/Angular)  │  Mobile App   │
                           └──────────────────┬──────────────────────────┘
                                              │ HTTPS
                                              ▼
                           ┌─────────────────────────────────────────────┐
                           │             API GATEWAY  :8080              │
                           │  • JWT Validation & Routing                 │
                           │  • CORS, Rate Limiting, Logging             │
                           │  • Inject X-User-Id / X-User-Role headers   │
                           │  • Inject X-Internal-Secret (security)      │
                           └──┬──────┬──────┬──────┬──────┬──────┬───────┘
                              │      │      │      │      │      │
              ┌───────────────┼──────┼──────┼──────┼──────┼──────┼──────────┐
              │               │      │      │      │      │      │          │
         /api/auth       /api/users /api/ /api/  /api/  /api/               │
              │               │  nutrition meals activ. analytics           │
              ▼               ▼      ▼      ▼      ▼      ▼                 │
         ┌────────┐  ┌──────────┐ ┌────┐ ┌────┐ ┌────┐ ┌─────────┐        │
         │  Auth  │  │  User    │ │Nut.│ │Meal│ │Act.│ │Analytics│        │
         │ :8081  │  │  :8082   │ │:83 │ │:84 │ │:85 │ │  :8086  │        │
         │(expose)│  │(expose)  │ │(ex)│ │(ex)│ │(ex)│ │(expose) │        │
         └───┬────┘  └────┬─────┘ └─┬──┘ └─┬──┘ └─┬──┘ └────┬────┘        │
             │            │         │      │      │           │             │
             ▼            ▼         ▼      │      │           │             │
         auth_db      user_db  nutrit_db   │      │      analytics_db       │
                                           ▼      ▼                         │
                                       meal_db  activ_db                    │
                                           │      │       ▲      ▲          │
                                           └──────┴───────┘      │          │
                                              Kafka Events    (consume)     │
                                                                            │
         ┌──────────────────────────────────────────────────────────────────┘
         │              SHARED INFRASTRUCTURE
         │  Redis :6379 (JWT blacklist, OTP, Rate limiting, Cache)
         │  MySQL :3306 (6 databases riêng biệt)
         │  Kafka (Event streaming giữa services)
         └─────────────────────────────────────────────────────────────────
```

> 🔒 **Bảo mật:** Khi chạy Docker, chỉ có **port 8080** (API Gateway) được expose ra host. Các service nội bộ (8081-8086) chỉ giao tiếp trong Docker network và được bảo vệ bởi header `X-Internal-Secret`.

---

## 📦 Danh sách Services

| Service | Internal Port | Exposed | Database | Mô tả ngắn |
|---------|--------------|---------|----------|------------|
| **api-gateway** | 8080 | ✅ `0.0.0.0:8080` | — | Cổng vào duy nhất, JWT validation & routing |
| **auth-service** | 8081 | ❌ Docker only | `auth_db` | Xác thực, cấp JWT, OAuth2, OTP |
| **user-service** | 8082 | ❌ Docker only | `user_db` | Hồ sơ sức khỏe, chỉ số cơ thể |
| **nutrition-service** | 8083 | ❌ Docker only | `nutrition_db` | Cơ sở dữ liệu thực phẩm & dinh dưỡng |
| **meal-service** | 8084 | ❌ Docker only | `meal_db` | Nhật ký bữa ăn, kế hoạch ăn uống |
| **activity-service** | 8085 | ❌ Docker only | `activity_db` | Nhật ký vận động, kế hoạch tập luyện |
| **analytics-service** | 8086 | ❌ Docker only | `analytics_db` | Báo cáo, thống kê, gợi ý sức khỏe |

---

## 🔍 Chi tiết từng Service

### 1. API Gateway — Port `8080`

**Vai trò:** Điểm vào duy nhất (Single Entry Point) cho toàn bộ hệ thống.

**Chức năng chính:**
- **JWT Authentication Filter:** Kiểm tra `Authorization: Bearer <token>` với mọi request (trừ public endpoints). Validate chữ ký + hạn dùng token.
- **Identity Propagation:** Sau khi validate thành công, gateway inject các header `X-User-Id`, `X-User-Name`, `X-User-Role` vào request trước khi forward đến downstream services — giúp các service không cần validate JWT lần nữa.
- **Role-Based Access:** Các path `/api/analytics/admin/**`, `/api/users/admin/**`, `/api/nutrition/admin/**` chỉ được phép với role `ADMIN`.
- **Routing:** Điều hướng request đến đúng service theo path prefix.
- **CORS:** Cho phép cross-origin từ `localhost:3000` (React) và `localhost:4200` (Angular).
- **Logging Filter:** Ghi log mọi request/response.

**Public Endpoints** (không cần JWT):
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/verify-email
GET  /actuator/**
```

---

### 2. Auth Service — Port `8081`

**Database:** `auth_db` | **Entities:** `User`, `RefreshToken`, `LoginAudit`

**Chức năng chính:**

#### 🔐 Xác thực cơ bản (Email/Password)
- **Đăng ký:** Hash password bằng BCrypt, tạo tài khoản mới, cấp JWT ngay lập tức.
- **Đăng nhập:** Xác thực credential, trả về `access_token` (1 ngày) + `refresh_token` (7 ngày).
- **Refresh Token:** Đổi refresh token lấy access token mới mà không cần đăng nhập lại.
- **Đăng xuất:** Blacklist access token trong Redis (TTL = thời gian còn lại của token).

#### 🌐 OAuth2 Social Login
- Hỗ trợ đăng nhập qua **Google** và **Facebook**.
- Tự động tạo tài khoản nếu email chưa tồn tại.
- Liên kết tài khoản nếu email đã đăng ký bằng phương thức khác.

#### 🛡️ Bảo mật nâng cao
- **Brute-force protection:** Khóa tài khoản 15 phút sau 5 lần đăng nhập sai (Redis counter).
- **OTP Reset Password:** Gửi mã OTP qua email, lưu trong Redis với TTL 5 phút.
- **Login Audit:** Ghi log toàn bộ lịch sử đăng nhập (IP, User-Agent, thành công/thất bại).
- **User Cache:** Cache thông tin user trong Redis để giảm tải DB.

**Key APIs:**
```
POST   /api/v1/auth/register              # Đăng ký
POST   /api/v1/auth/login                 # Đăng nhập
POST   /api/v1/auth/refresh               # Làm mới token
POST   /api/v1/auth/logout                # Đăng xuất
POST   /api/v1/auth/password/forgot       # Yêu cầu OTP reset password
POST   /api/v1/auth/password/reset        # Xác nhận OTP & đặt mật khẩu mới
GET    /api/v1/auth/me                    # Thông tin user hiện tại
GET    /api/v1/auth/oauth2/authorize/{provider}   # Bắt đầu OAuth2
GET    /api/v1/auth/oauth2/callback/{provider}    # OAuth2 callback
```

---

### 3. User Service — Port `8082`

**Database:** `user_db` | **Entities:** `UserProfile`, `BodyMetric`, `WaterLog`, `UserNotificationSetting`

**Chức năng chính:**

#### 👤 Hồ sơ sức khỏe
- Quản lý thông tin cơ bản: Tên, ngày sinh, giới tính, múi giờ.
- Chỉ số thể chất: Chiều cao, cân nặng hiện tại.
- **Mức độ vận động** (SEDENTARY → EXTRA_ACTIVE) dùng để tính TDEE (Total Daily Energy Expenditure).
- **Mục tiêu sức khỏe:** Giảm cân / Duy trì / Tăng cơ / Cải thiện thể lực.
- **Mục tiêu dinh dưỡng hàng ngày:** Calo, Protein, Carbs, Fat, Nước.

#### 📊 Theo dõi chỉ số cơ thể theo thời gian
- Ghi nhận cân nặng, % mỡ, khối lượng cơ, BMI, vòng eo/hông theo ngày.
- Xem lịch sử tiến trình (phục vụ analytics charts).

#### 💧 Theo dõi lượng nước uống
- Ghi log từng lần uống nước trong ngày.
- So sánh với mục tiêu uống nước hàng ngày.

#### 🔔 Cài đặt thông báo
- Nhắc nhở bữa ăn theo giờ tùy chỉnh (JSON array).
- Nhắc uống nước định kỳ (theo khoảng thời gian).
- Nhắc cân hàng tuần (chọn ngày trong tuần).

**Key APIs:**
```
GET    /api/users/me/profile               # Xem hồ sơ
PUT    /api/users/me/profile               # Cập nhật hồ sơ
POST   /api/users/me/metrics               # Ghi chỉ số cơ thể mới
GET    /api/users/me/metrics               # Lịch sử chỉ số cơ thể
POST   /api/users/me/water                 # Log lượng nước
GET    /api/users/me/water/today           # Tổng nước uống hôm nay
GET    /api/users/me/notifications         # Cài đặt thông báo
PUT    /api/users/me/notifications         # Cập nhật cài đặt thông báo
```

---

### 4. Nutrition Service — Port `8083`

**Database:** `nutrition_db` | **Entities:** `FoodCategory`, `FoodItem`, `Recipe`, `RecipeIngredient`

**Chức năng chính:**

#### 🍎 Cơ sở dữ liệu thực phẩm
- Kho dữ liệu thực phẩm với **thông tin dinh dưỡng đầy đủ:** Calo, Protein, Carbs, Fat, Chất xơ, Đường, Natri, Cholesterol, Vitamin C, Canxi, Sắt...
- Phân loại theo **14 danh mục** (Ngũ cốc, Rau củ, Trái cây, Thịt, Hải sản, Sữa, Đậu, v.v.).
- Dữ liệu có sẵn: **17 thực phẩm phổ biến Việt Nam** (cơm, phở, bún, thịt heo, ức gà, rau muống...).
- Tìm kiếm thực phẩm bằng **FULLTEXT index** (tên tiếng Anh, tiếng Việt, thương hiệu).
- Hỗ trợ tra cứu bằng **mã vạch** sản phẩm.

#### 🍳 Công thức nấu ăn (Recipes)
- Người dùng tự tạo công thức từ các thực phẩm có trong hệ thống.
- Tự động **tính tổng dinh dưỡng** từ danh sách nguyên liệu.
- Chia sẻ công thức public/private.

#### 🔍 Tra cứu dinh dưỡng
- Tính toán giá trị dinh dưỡng theo khẩu phần tùy chỉnh.
- Người dùng có thể **thêm thực phẩm mới** (chờ admin xác nhận `is_verified`).

**Key APIs:**
```
GET    /api/nutrition/foods                # Danh sách thực phẩm (có filter, pagination)
GET    /api/nutrition/foods/search?q=      # Tìm kiếm thực phẩm
GET    /api/nutrition/foods/{id}           # Chi tiết thực phẩm
GET    /api/nutrition/foods/barcode/{code} # Tra cứu theo mã vạch
POST   /api/nutrition/foods                # Thêm thực phẩm mới
GET    /api/nutrition/categories           # Danh mục thực phẩm
GET    /api/nutrition/recipes              # Danh sách công thức
POST   /api/nutrition/recipes              # Tạo công thức mới
GET    /api/nutrition/recipes/{id}         # Chi tiết công thức
```

---

### 5. Meal Service — Port `8084`

**Database:** `meal_db` | **Entities:** `Meal`, `MealItem`, `MealPlan`, `MealPlanEntry`, `FavoriteFood`
**Message Broker:** Kafka (Producer — publish events sau mỗi bữa ăn)

**Chức năng chính:**

#### 🍽️ Nhật ký bữa ăn hàng ngày
- Ghi lại **6 loại bữa ăn:** Sáng, Ăn nhẹ sáng, Trưa, Ăn nhẹ chiều, Tối, Ăn nhẹ tối.
- Thêm thực phẩm từ **nutrition-service** (cross-DB: lưu `food_item_id` + denormalize `food_name`, calories...).
- Hỗ trợ cả **food items** và **recipes** làm nguyên liệu bữa ăn.
- Tự động tính **tổng calo + macro** cho mỗi bữa.

#### 📅 Kế hoạch ăn uống
- Tạo kế hoạch ăn theo **tuần/tháng** với tên và mô tả.
- Lên lịch chi tiết từng bữa từng ngày trong kế hoạch.
- Bật/tắt kế hoạch đang áp dụng.

#### ⭐ Thực phẩm yêu thích
- Lưu các thực phẩm/công thức hay dùng để thêm nhanh vào bữa ăn.

#### 📡 Event Publishing (Kafka)
Sau khi user ghi nhận bữa ăn, Meal Service publish event lên Kafka để:
- **Analytics Service** cập nhật `daily_summaries`.

**Key APIs:**
```
GET    /api/meals?date=                    # Bữa ăn trong ngày
POST   /api/meals                          # Tạo bữa ăn mới
GET    /api/meals/{id}                     # Chi tiết bữa ăn
PUT    /api/meals/{id}                     # Cập nhật bữa ăn
DELETE /api/meals/{id}                     # Xóa bữa ăn
POST   /api/meals/{id}/items               # Thêm món vào bữa ăn
DELETE /api/meals/{id}/items/{itemId}      # Xóa món khỏi bữa ăn
GET    /api/meals/plans                    # Danh sách kế hoạch ăn
POST   /api/meals/plans                    # Tạo kế hoạch ăn
GET    /api/meals/favorites                # Thực phẩm yêu thích
POST   /api/meals/favorites                # Thêm yêu thích
```

---

### 6. Activity Service — Port `8085`

**Database:** `activity_db` | **Entities:** `ActivityType`, `ActivityLog`, `WorkoutPlan`, `WorkoutPlanExercise`, `StepLog`

**Chức năng chính:**

#### 🏃 Nhật ký hoạt động thể chất
- Ghi lại vận động với **6 danh mục:** Cardio, Sức mạnh, Linh hoạt, Thể thao, Hoạt động thường ngày, Khác.
- **20 loại hoạt động có sẵn** với giá trị **MET** (Metabolic Equivalent of Task).
- Tính calo đốt tự động: `Calories = MET × Cân nặng (kg) × Thời gian (giờ)`.
- Lưu thông số chi tiết:
  - **Cardio:** Khoảng cách, nhịp tim trung bình/tối đa.
  - **Strength:** Số hiệp (sets), số lần (reps), trọng lượng (kg).
  - **General:** Số bước chân.

#### 💪 Kế hoạch tập luyện
- Tạo kế hoạch tập theo **mục tiêu:** Giảm cân / Tăng cơ / Sức bền / Thể lực tổng quát.
- Lên lịch bài tập theo **từng ngày trong tuần** (Thứ 2 → Chủ nhật).
- Quản lý số hiệp, số lần, thời gian cho từng bài.

#### 👣 Theo dõi số bước chân
- Tích hợp dữ liệu từ thiết bị đeo (Fitbit, Apple Health, Google Fit).
- Nhập thủ công nếu không có thiết bị.
- Lưu trữ theo ngày (`UNIQUE` per user per date).

**Key APIs:**
```
GET    /api/activities?date=               # Hoạt động trong ngày
POST   /api/activities                     # Log hoạt động mới
GET    /api/activities/{id}                # Chi tiết hoạt động
DELETE /api/activities/{id}                # Xóa log
GET    /api/activities/types               # Danh mục hoạt động
POST   /api/activities/plans               # Tạo kế hoạch tập
GET    /api/activities/plans               # Danh sách kế hoạch
GET    /api/activities/steps?date=         # Bước chân trong ngày
POST   /api/activities/steps               # Log số bước chân
```

---

### 7. Analytics Service — Port `8086`

**Database:** `analytics_db` | **Entities:** `DailySummary`, `WeeklyReport`, `MonthlyReport`, `NutritionTrend`, `UserStreak`, `HealthInsight`
**Message Broker:** Kafka (Consumer — lắng nghe events từ meal-service và activity-service)

**Chức năng chính:**

#### 📊 Tóm tắt hàng ngày (Daily Summary)
- Tự động tổng hợp dữ liệu từ các service khác qua **Kafka events**.
- Theo dõi: Tổng calo nạp vào, calo đốt, cân bằng calo thuần (`net_calories`).
- Theo dõi: Macro dinh dưỡng (Protein, Carbs, Fat, Chất xơ), Natri, Số bữa ăn.
- Theo dõi: Phút vận động, bước chân, khoảng cách, số hoạt động.
- So sánh với **mục tiêu calo** của người dùng.

#### 📈 Báo cáo tuần & tháng
- Tự động tổng hợp từ `daily_summaries` vào cuối tuần/tháng.
- Các chỉ số trung bình, tổng, thay đổi cân nặng trong kỳ.
- Số ngày đạt mục tiêu trong tuần/tháng.

#### 🔥 Xu hướng thực phẩm (Nutrition Trends)
- Phân tích thực phẩm/món ăn được ăn thường xuyên nhất.
- Thống kê theo khoảng thời gian.

#### 🏆 Streak & Gamification
- **Logging Streak:** Chuỗi ngày ghi nhật ký liên tiếp.
- **Goal Streak:** Chuỗi ngày đạt mục tiêu calo.
- **Activity Streak:** Chuỗi ngày có vận động.
- Lưu streak hiện tại + streak dài nhất từ trước tới nay.

#### 💡 Gợi ý sức khỏe cá nhân hoá (Health Insights)
- 5 loại: Gợi ý dinh dưỡng, Gợi ý vận động, Tiến độ mục tiêu, Thành tích, Cảnh báo.
- Đánh dấu đã đọc/chưa đọc.

**Key APIs:**
```
GET    /api/analytics/daily?date=          # Tóm tắt ngày cụ thể
GET    /api/analytics/weekly?week=         # Báo cáo tuần
GET    /api/analytics/monthly?year=&month= # Báo cáo tháng
GET    /api/analytics/trends               # Xu hướng thực phẩm
GET    /api/analytics/streak               # Streak hiện tại
GET    /api/analytics/insights             # Gợi ý sức khỏe
PUT    /api/analytics/insights/{id}/read   # Đánh dấu đã đọc
GET    /api/analytics/admin/overview       # 🔒 ADMIN: tổng quan toàn hệ thống
```

---

## 🔄 Luồng hoạt động

### Luồng 1: Đăng ký & Đăng nhập

```
Client                API Gateway           Auth Service           Redis/DB
  │                       │                     │                     │
  ├─POST /api/auth/register─►                   │                     │
  │                       ├─forward─────────────►                     │
  │                       │                     ├─hash password───────►
  │                       │                     ├─save user──────────►│
  │                       │                     ├─generate JWT        │
  │◄──── 201 {access_token, refresh_token} ─────┤                     │
  │                       │                     │                     │
  ├─POST /api/auth/login──►                     │                     │
  │                       ├─forward─────────────►                     │
  │                       │                     ├─verify password     │
  │                       │                     ├─check brute-force──►│ (Redis)
  │                       │                     ├─generate JWT        │
  │◄──── 200 {access_token, refresh_token} ─────┤                     │
```

### Luồng 2: Request sau khi đăng nhập (JWT Flow)

```
Client                API Gateway           Service (VD: Meal)
  │                       │                     │
  ├─GET /api/meals?date=TODAY                   │
  │  Authorization: Bearer <token>              │
  │                       │                     │
  │              [JwtAuthFilter]                │
  │                ├─validate token             │
  │                ├─extract claims             │
  │                ├─inject headers:            │
  │                │  X-User-Id: 42             │
  │                │  X-User-Name: john@...     │
  │                │  X-User-Role: USER         │
  │                │  X-Internal-Secret: ***    │
  │                ├─forward request ──────────►│
  │                │                     ├─validate X-Internal-Secret
  │                │                     ├─read X-User-Id header
  │                │                     ├─query meal_db WHERE user_id = 42
  │◄───────────── 200 [meals array] ────────────┤
```

### Luồng 3: Ghi nhận bữa ăn → Cập nhật Analytics

```
Client          Meal Service       Kafka           Analytics Service      DB
  │                  │               │                    │                │
  ├─POST /api/meals──►               │                    │                │
  │                  ├─save meal──────────────────────────────────────────►│ (meal_db)
  │                  ├─publish event─►                    │                │
  │◄── 201 Created ──┤  "meal.logged"│                    │                │
  │                  │  {userId, date│                    │                │
  │                  │   calories...}│                    │                │
  │                  │               ├──consume event──►  │                │
  │                  │               │                    ├─upsert daily──►│ (analytics_db)
  │                  │               │                    │  summary       │
  │                  │               │                    ├─update streak─►│
  │                  │               │                    ├─check goals    │
  │                  │               │                    │  → create insight if needed
```

### Luồng 4: Theo dõi tiến trình sức khỏe

```
                       ┌─────────────────────────────────┐
                       │         USER DASHBOARD          │
                       └──────────────┬──────────────────┘
                                      │ GET /api/analytics/daily
                                      ▼
                 ┌────────────────────────────────────────┐
                 │           Analytics Service            │
                 │                                        │
                 │  today = {                             │
                 │    calories_consumed: 1840 kcal        │
                 │    calories_burned:    420 kcal        │
                 │    net_calories:      1420 kcal        │  ← GENERATED COLUMN
                 │    protein_g:          95g             │
                 │    water_ml:         1800ml (90%)      │
                 │    steps:            8432              │
                 │    calorie_goal_met: false             │
                 │    current_streak:   7 days            │
                 │  }                                     │
                 └────────────────────────────────────────┘
```

### Luồng 5: OAuth2 Social Login (Google/Facebook)

```
Client          API Gateway      Auth Service       Google/Facebook
  │                  │                │                    │
  ├─GET /api/auth/oauth2/authorize/google                  │
  │◄────redirected to────────────────────────────────────► │
  │                                                        │
  │              user grants permission                    │
  │◄──────────── callback with authorization code ──────── ┤
  │                  │                │                    │
  ├─GET /api/auth/oauth2/callback/google?code=xxx          │
  │                  ├─forward────────►                    │
  │                  │                ├─exchange code for user profile
  │                  │                ├─find or create User in DB
  │                  │                ├─generate JWT
  │◄─── redirect to frontend with token ─────────────────► │
  │     http://localhost:3000/oauth2/redirect?token=...
```

---

## 🗄️ Database Design

Mô hình **Database-per-Service** — mỗi service có database riêng biệt, không chia sẻ DB.

```
auth_db                user_db             nutrition_db
┌─────────────┐        ┌──────────────┐    ┌────────────────┐
│ users       │        │ user_profiles│    │ food_categories│
│ refresh_    │        │ body_metrics │    │ food_items     │
│   tokens    │        │ water_logs   │    │ recipes        │
│ login_audit │        │ user_notif.. │    │ recipe_ingred. │
└─────────────┘        └──────────────┘    └────────────────┘

meal_db                activity_db         analytics_db
┌─────────────┐        ┌──────────────┐    ┌────────────────┐
│ meals       │        │ activity_    │    │ daily_summaries│
│ meal_items  │        │   types      │    │ weekly_reports │
│ meal_plans  │        │ activity_logs│    │ monthly_reports│
│ meal_plan_  │        │ workout_plans│    │ nutrition_     │
│   entries   │        │ workout_plan_│    │   trends       │
│ favorite_   │        │   exercises  │    │ user_streaks   │
│   foods     │        │ step_logs    │    │ health_insight │
└─────────────┘        └──────────────┘    └────────────────┘
```

> 📁 Xem chi tiết schema SQL tại thư mục [`db/`](./db/)

**Nguyên tắc cross-service data:**
- **Không dùng FOREIGN KEY** giữa các databases.
- **Denormalization:** Copy `food_name`, `activity_name`... vào bảng của service khác để tránh join cross-DB.
- **Event-Driven:** Dùng Kafka để đồng bộ dữ liệu bất đồng bộ.

---

## 📁 Cấu trúc Project

```
health-nutrition-tracker/
├── api-gateway/                    # Spring Cloud Gateway
│   └── src/main/java/.../gateway/
│       ├── filter/
│       │   ├── JwtAuthenticationFilter.java   # JWT validation
│       │   └── LoggingFilter.java
│       ├── config/
│       │   ├── JwtProperties.java
│       │   └── SecurityConfig.java
│       └── util/JwtUtil.java
│
├── auth-service/                   # Xác thực & phân quyền
│   └── src/main/java/.../auth/
│       ├── entity/                 # User, RefreshToken, LoginAudit
│       ├── controller/AuthController.java
│       ├── service/                # AuthService, OtpService, LoginRateLimitService
│       └── security/               # JWT, OAuth2, UserDetails
│
├── user-service/                   # Hồ sơ sức khỏe
│   └── src/main/java/.../user/
│       └── entity/                 # UserProfile, BodyMetric, WaterLog, ...
│
├── nutrition-service/              # Cơ sở dữ liệu thực phẩm
│   └── src/main/java/.../nutrition/
│       └── entity/                 # FoodCategory, FoodItem, Recipe, ...
│
├── meal-service/                   # Nhật ký bữa ăn
│   └── src/main/java/.../meal/
│       └── entity/                 # Meal, MealItem, MealPlan, ...
│
├── activity-service/               # Nhật ký vận động
│   └── src/main/java/.../activity/
│       └── entity/                 # ActivityType, ActivityLog, WorkoutPlan, ...
│
├── analytics-service/              # Báo cáo & thống kê
│   └── src/main/java/.../analytics/
│       └── entity/                 # DailySummary, WeeklyReport, UserStreak, ...
│
├── db/                             # SQL scripts
│   ├── 00_init_all_databases.sql   # Tạo 6 databases
│   ├── 01_auth_db.sql
│   ├── 02_user_db.sql
│   ├── 03_nutrition_db.sql         # Có data mẫu thực phẩm Việt Nam
│   ├── 04_meal_db.sql
│   ├── 05_activity_db.sql          # Có data mẫu 20 loại vận động
│   ├── 06_analytics_db.sql
│   ├── run_all.sql                 # Chạy tất cả
│   └── README.md
│
├── logs/                           # Log files (bind mount từ Docker)
│   ├── api-gateway/
│   ├── auth-service/
│   ├── user-service/
│   └── ...
│
└── docker-compse.yml               # Infrastructure + Services
```

---

## 🐳 Chạy bằng Docker

> **Cách nhanh nhất** — không cần cài Java, Maven, MySQL, Redis, Kafka trên máy.

### Yêu cầu

| Công cụ | Phiên bản | Kiểm tra |
|---------|-----------|---------|
| **Docker Desktop** | 24+ | `docker --version` |
| **Docker Compose** | v2.20+ | `docker compose version` |
| **Git** | bất kỳ | `git --version` |

---

### 1. Cấu hình môi trường

```bash
# Clone project
git clone <repo-url>
cd health-nutrition-tracker

# Copy file env mẫu
cp .env.example .env
```

Mở `.env` và chỉnh các giá trị cần thiết:

```env
# ── Bắt buộc đổi ─────────────────────────────────────────
DB_PASSWORD=your_strong_db_password
JWT_SECRET=your-super-secret-key-at-least-32-chars-long!!

# ── OAuth2 (bỏ qua nếu không dùng Social Login) ──────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# ── Tuỳ chỉnh (có thể giữ nguyên mặc định) ───────────────
FRONTEND_URL=http://localhost:3000
SPRING_PROFILES_ACTIVE=dev
INTERNAL_SECRET=Ht!InternalS3cret#OnlyGateway2Service
```

---

### 2. Chạy toàn bộ hệ thống

#### Lần đầu tiên (build images + start)

```bash
docker compose -f docker-compse.yml up -d --build
```

> 🕐 Lần đầu mất **5-15 phút** do phải build 7 Docker images và tải dependencies Maven.

#### Các lần sau (không cần build lại)

```bash
docker compose -f docker-compse.yml up -d
```

#### Theo dõi quá trình khởi động

```bash
# Xem trạng thái tất cả containers
docker compose -f docker-compse.yml ps

# Xem log realtime của tất cả (Ctrl+C để thoát)
docker compose -f docker-compse.yml logs -f

# Xem log riêng 1 service
docker compose -f docker-compse.yml logs -f auth-service
docker compose -f docker-compse.yml logs -f api-gateway
```

#### Kiểm tra health sau khi khởi động

```bash
# Chỉ API Gateway mới exposed ra host (port 8080)
# Các service khác chỉ accessible qua Gateway
curl -s http://localhost:8080/actuator/health

# Kiểm tra từng service qua Gateway
curl -s http://localhost:8080/actuator/health
```

> ✅ Kết quả mong đợi: `{"status":"UP","components":{...}}`

#### Trạng thái containers sau khi khởi động thành công

```
NAME                    IMAGE                          STATUS          PORTS
ht-mysql                mysql:8.0                      Up (healthy)    0.0.0.0:3306->3306/tcp
ht-redis                redis:7-alpine                 Up (healthy)    0.0.0.0:6379->6379/tcp
ht-kafka                bitnami/kafka:3.7              Up (healthy)    0.0.0.0:9092->9092/tcp
ht-api-gateway          ht/api-gateway:latest          Up (healthy)    0.0.0.0:8080->8080/tcp  ← duy nhất exposed
ht-auth-service         ht/auth-service:latest         Up (healthy)    8081/tcp                ← internal only
ht-user-service         ht/user-service:latest         Up (healthy)    8082/tcp                ← internal only
ht-nutrition-service    ht/nutrition-service:latest    Up (healthy)    8083/tcp                ← internal only
ht-meal-service         ht/meal-service:latest         Up (healthy)    8084/tcp                ← internal only
ht-activity-service     ht/activity-service:latest     Up (healthy)    8085/tcp                ← internal only
ht-analytics-service    ht/analytics-service:latest    Up (healthy)    8086/tcp                ← internal only
```

---

### 3. Chạy riêng Infrastructure (Spring Boot locally)

Phù hợp khi **phát triển** — chạy infra bằng Docker, Spring Boot chạy trực tiếp trên máy để hot-reload nhanh hơn.

```bash
# Bước 1: Chỉ khởi động MySQL, Redis, Kafka (profile "infra")
docker compose -f docker-compse.yml --profile infra up -d

# Bước 2: Kiểm tra status infrastructure
docker compose -f docker-compse.yml ps

# Bước 3: Khởi tạo schema + data mẫu (chỉ cần làm 1 lần)
# Docker đã tự chạy 00_init_all_databases.sql khi mysql container khởi động
# Chạy thêm các schema còn lại:
docker exec -i ht-mysql mysql -u root -psecret < db/01_auth_db.sql
docker exec -i ht-mysql mysql -u root -psecret < db/02_user_db.sql
docker exec -i ht-mysql mysql -u root -psecret < db/03_nutrition_db.sql
docker exec -i ht-mysql mysql -u root -psecret < db/04_meal_db.sql
docker exec -i ht-mysql mysql -u root -psecret < db/05_activity_db.sql
docker exec -i ht-mysql mysql -u root -psecret < db/06_analytics_db.sql
```

Sau đó chạy các service Spring Boot — xem phần [Chạy bằng IntelliJ IDEA](#-chạy-bằng-intellij-idea) bên dưới.

---

### 4. Quản lý containers

#### Dừng & khởi động lại

```bash
# Dừng tất cả (giữ nguyên data volumes)
docker compose -f docker-compse.yml down

# Dừng 1 service cụ thể
docker compose -f docker-compse.yml stop meal-service

# Khởi động lại 1 service
docker compose -f docker-compse.yml restart auth-service

# Rebuild và restart 1 service sau khi sửa code
docker compose -f docker-compse.yml up -d --build auth-service
```

#### Scale service (chạy nhiều instance)

```bash
# Chạy 2 instance nutrition-service (chỉ áp dụng khi dùng load balancer)
docker compose -f docker-compse.yml up -d --scale nutrition-service=2
```

#### Dọn dẹp hoàn toàn

```bash
# Xoá containers + networks (giữ data volumes)
docker compose -f docker-compse.yml down

# Xoá containers + networks + data volumes (⚠️ mất hết data DB)
docker compose -f docker-compse.yml down -v

# Xoá tất cả images đã build
docker compose -f docker-compse.yml down --rmi local
```

---

### 5. Xem Logs

#### Log qua Docker

```bash
# Theo dõi realtime
docker compose -f docker-compse.yml logs -f api-gateway
docker compose -f docker-compse.yml logs -f auth-service

# Xem 100 dòng cuối
docker compose -f docker-compse.yml logs --tail=100 meal-service

# Xem log từ 1 giờ trước
docker compose -f docker-compse.yml logs --since=1h analytics-service
```

#### Log files trực tiếp trên máy host (bind mount)

Log được mount vào thư mục `./logs/` trên máy host:

```
logs/
├── api-gateway/
│   ├── api-gateway.log           # Log chính
│   └── api-gateway-error.log     # Log lỗi
├── auth-service/
│   ├── auth-service.log
│   └── auth-service-error.log
├── meal-service/
│   ├── meal-service.log
│   └── meal-service-error.log
└── ...
```

```bash
# Xem log realtime trực tiếp trên host (Windows)
Get-Content logs\auth-service\auth-service.log -Wait -Tail 50

# macOS/Linux
tail -f logs/auth-service/auth-service.log
tail -f logs/auth-service/auth-service-error.log
```

#### Kafka UI (xem message queue)

```bash
# Bật Kafka UI (profile "dev-tools")
docker compose -f docker-compse.yml --profile dev-tools up -d kafka-ui

# Truy cập tại: http://localhost:8090
# Xem topics, messages, consumer groups
```

---

### 🔧 Troubleshooting

<details>
<summary>▶ MySQL khởi động chậm / service báo "Connection refused"</summary>

Các Spring Boot service có `depends_on: condition: service_healthy` — chúng sẽ **tự chờ** MySQL healthy. Nếu vẫn lỗi, chờ thêm vài phút.

```bash
# Kiểm tra MySQL đã healthy chưa
docker inspect ht-mysql --format='{{.State.Health.Status}}'
# Kết quả mong đợi: healthy

# Xem log MySQL
docker compose -f docker-compse.yml logs mysql
```

</details>

<details>
<summary>▶ Lỗi "Port already in use"</summary>

```bash
# Windows — kiểm tra port đang dùng
netstat -ano | findstr :3306
netstat -ano | findstr :8080

# macOS/Linux
lsof -i :3306

# Đổi port trong .env
MYSQL_PORT=3307
REDIS_PORT=6380
KAFKA_PORT=9093
```

</details>

<details>
<summary>▶ Kafka không kết nối được</summary>

```bash
# Kiểm tra Kafka logs
docker compose -f docker-compse.yml logs kafka

# List topics
docker exec ht-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

</details>

<details>
<summary>▶ Build Maven lâu hoặc thất bại</summary>

```bash
# Xoá cache và rebuild
docker compose -f docker-compse.yml build --no-cache auth-service

# Build tất cả từ đầu
docker compose -f docker-compse.yml build --no-cache
```

</details>

---

## 💡 Chạy bằng IntelliJ IDEA

> **Cách tốt nhất để phát triển** — debug, hot reload, xem stack trace trực tiếp trong IDE.

### Yêu cầu

| Công cụ | Phiên bản | Ghi chú |
|---------|-----------|---------|
| **IntelliJ IDEA** | 2023.1+ | Community hoặc Ultimate |
| **Java JDK** | 17+ | Cài qua IntelliJ hoặc tải từ [Adoptium](https://adoptium.net/) |
| **Maven** | 3.8+ | Đã có sẵn trong IntelliJ (bundled) |
| **Docker Desktop** | 24+ | Để chạy MySQL, Redis, Kafka |

---

### Bước 1: Import Project

1. Mở **IntelliJ IDEA** → **File → Open**
2. Chọn thư mục gốc `health-nutrition-tracker/`
3. IntelliJ tự nhận diện `pom.xml` ở root → click **"Open as Maven Project"** (hoặc **"Trust Project"**)
4. Chờ IntelliJ **index** và **download dependencies** (lần đầu ~5 phút)
5. Verify: Cửa sổ **Maven** bên phải phải hiện đủ 7 modules:
   ```
   health-tracker-parent
   ├── api-gateway
   ├── auth-service
   ├── user-service
   ├── nutrition-service
   ├── meal-service
   ├── activity-service
   └── analytics-service
   ```

---

### Bước 2: Tạo Run Configurations

**Cách 1: Dùng Spring Boot Run Configuration (Recommended)**

Tạo riêng cho từng service qua menu **Run → Edit Configurations → + → Spring Boot**:

| Name | Main class | Module | VM Options |
|------|-----------|--------|-----------|
| `AuthService` | `health.tracker.services.auth.AuthServiceApplication` | `auth-service` | _(xem bên dưới)_ |
| `UserService` | `health.tracker.services.user.UserServiceApplication` | `user-service` | |
| `NutritionService` | `health.tracker.services.nutrition.NutritionServiceApplication` | `nutrition-service` | |
| `MealService` | `health.tracker.services.meal.MealServiceApplication` | `meal-service` | |
| `ActivityService` | `health.tracker.services.activity.ActivityServiceApplication` | `activity-service` | |
| `AnalyticsService` | `health.tracker.services.analytics.AnalyticsServiceApplication` | `analytics-service` | |
| `ApiGateway` | `health.tracker.gateway.ApiGatewayApplication` | `api-gateway` | |

**Environment Variables** — thêm vào tab **"Environment variables"** của mỗi Run Configuration:

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=secret
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
JWT_SECRET=H3@lthNutrit10nTrackerSuperSecretKey!MustBe256BitsLong
INTERNAL_SECRET=dev-local-secret
SPRING_PROFILES_ACTIVE=dev
```

> 💡 **Tip:** Click icon **"Paste"** trong ô Environment variables để paste nhiều dòng cùng lúc.

**Cách 2: Dùng file `.env.local` + EnvFile plugin**

Cài plugin **EnvFile** (Settings → Plugins → tìm "EnvFile"):
1. Tạo file `.env.local` ở root project với nội dung như bảng trên
2. Trong Run Configuration → tab **EnvFile** → check **"Enable EnvFile"** → thêm `.env.local`

---

### Bước 3: Chạy theo thứ tự

#### 3.1. Khởi động Infrastructure trước

```bash
# Terminal trong IntelliJ (Alt+F12) hoặc ngoài:
docker compose -f docker-compse.yml --profile infra up -d

# Đợi healthy (khoảng 30-60 giây)
docker compose -f docker-compse.yml ps
```

Hoặc dùng **Docker plugin** trong IntelliJ: View → Tool Windows → **Services** → Docker.

#### 3.2. Chạy Schema DB (lần đầu)

Mở **Database tool** trong IntelliJ (View → Tool Windows → Database):
1. **[+] → Data Source → MySQL**
2. Host: `localhost`, Port: `3306`, User: `root`, Password: `secret`
3. Mở từng file SQL trong `db/` và **Run** (Ctrl+Enter):
   - `01_auth_db.sql` → `02_user_db.sql` → ... → `06_analytics_db.sql`

Hoặc chạy qua terminal:
```bash
# Windows CMD
for %f in (db\01_auth_db.sql db\02_user_db.sql db\03_nutrition_db.sql db\04_meal_db.sql db\05_activity_db.sql db\06_analytics_db.sql) do docker exec -i ht-mysql mysql -u root -psecret < %f
```

#### 3.3. Chạy services theo thứ tự

Chạy theo thứ tự **từ dưới lên** (dependencies trước):

```
1. auth-service      (port 8081)   — cần MySQL + Redis
2. user-service      (port 8082)   — cần MySQL + Redis
3. nutrition-service (port 8083)   — cần MySQL
4. meal-service      (port 8084)   — cần MySQL + Redis + Kafka
5. activity-service  (port 8085)   — cần MySQL
6. analytics-service (port 8086)   — cần MySQL + Kafka
7. api-gateway       (port 8080)   — cần tất cả services trên
```

Click **Run** (▶) hoặc **Debug** (🐛) cho từng service trong Run Configurations.

---

### Bước 4: Sử dụng Services panel (IntelliJ Ultimate)

IntelliJ IDEA **Ultimate** có **Services panel** (View → Tool Windows → Services) cho phép quản lý tất cả Spring Boot instances trong 1 nơi:

```
Services
└── Spring Boot
    ├── 🟢 AuthService          :8081  [Running]
    ├── 🟢 UserService          :8082  [Running]
    ├── 🟢 NutritionService     :8083  [Running]
    ├── 🟢 MealService          :8084  [Running]
    ├── 🟢 ActivityService      :8085  [Running]
    ├── 🟢 AnalyticsService     :8086  [Running]
    └── 🟢 ApiGateway           :8080  [Running]
```

**Compound Run Configuration** — chạy tất cả cùng lúc:
1. **Run → Edit Configurations → + → Compound**
2. Đặt tên `All Services`
3. Thêm tất cả 7 Run Configurations vào
4. Click Run một lần → cả 7 service khởi động song song

> ⚠️ **Lưu ý:** Khi chạy local, `INTERNAL_SECRET` có thể để trống hoặc set cùng giá trị giữa gateway và các service. `InternalRequestFilter` sẽ bỏ qua kiểm tra nếu secret rỗng.

---

### Tips IntelliJ

| Tính năng | Cách dùng |
|-----------|----------- |
| **Hot Reload** | Ctrl+F9 (Build) sau khi sửa code — Spring DevTools tự reload |
| **Debug** | Đặt breakpoint → chạy Debug mode → Postman gọi API |
| **Endpoints panel** | View → Tool Windows → Endpoints → xem tất cả REST APIs |
| **Database** | View → Tool Windows → Database → kết nối MySQL xem data |
| **Log** | Mỗi service có tab Console riêng trong Services panel |
| **Actuator** | `http://localhost:808x/actuator` xem health, beans, metrics |

---

## 🧪 Test bằng Postman

### 1. Tạo Environment

Trong Postman, tạo **Environment** tên `Health Tracker - Local`:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `baseUrl` | `http://localhost:8080` | `http://localhost:8080` |
| `accessToken` | _(để trống)_ | _(tự cập nhật)_ |
| `refreshToken` | _(để trống)_ | _(tự cập nhật)_ |
| `userId` | _(để trống)_ | _(tự cập nhật)_ |

> 💡 **Chọn environment này** trước khi test (góc phải trên trong Postman).

---

### 2. Luồng Authentication

Thực hiện theo đúng thứ tự sau lần đầu:

#### 📝 Step 1 — Đăng ký tài khoản

```
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "fullName": "Nguyễn Văn A"
}
```

**Response 201:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4-e5f6-...",
  "tokenType": "Bearer",
  "expiresIn": 86400000,
  "userId": 1,
  "email": "user@example.com"
}
```

**Tests script** (tab Tests trong Postman — tự lưu token):
```javascript
const res = pm.response.json();
pm.environment.set("accessToken", res.accessToken);
pm.environment.set("refreshToken", res.refreshToken);
pm.environment.set("userId", res.userId);
console.log("✅ Registered! Token saved.");
```

#### 🔑 Step 2 — Đăng nhập

```
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

**Tests script:**
```javascript
const res = pm.response.json();
pm.environment.set("accessToken", res.accessToken);
pm.environment.set("refreshToken", res.refreshToken);
pm.environment.set("userId", res.userId);
console.log("✅ Logged in! Token expires in:", res.expiresIn / 1000 / 60, "minutes");
```

#### 🔄 Step 3 — Refresh Token (khi access token hết hạn)

```
POST {{baseUrl}}/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refreshToken}}"
}
```

**Tests script:**
```javascript
const res = pm.response.json();
pm.environment.set("accessToken", res.accessToken);
console.log("✅ Token refreshed!");
```

#### 🚪 Đăng xuất

```
POST {{baseUrl}}/api/auth/logout
Authorization: Bearer {{accessToken}}
```

---

### 3. Auth Service APIs

> Tất cả request bên dưới đều dùng tab **Authorization → Bearer Token → `{{accessToken}}`**

#### Xem thông tin tài khoản hiện tại

```
GET {{baseUrl}}/api/auth/me
Authorization: Bearer {{accessToken}}
```

#### Đổi mật khẩu (quên mật khẩu)

**Bước 1 — Yêu cầu OTP:**
```
POST {{baseUrl}}/api/auth/password/forgot
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Bước 2 — Xác nhận OTP và đặt mật khẩu mới:**
```
POST {{baseUrl}}/api/auth/password/reset
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewStrongPass456!"
}
```

---

### 4. User Service APIs

#### Xem hồ sơ sức khỏe

```
GET {{baseUrl}}/api/users/me/profile
Authorization: Bearer {{accessToken}}
```

#### Cập nhật hồ sơ

```
PUT {{baseUrl}}/api/users/me/profile
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "fullName": "Nguyễn Văn A",
  "dateOfBirth": "1995-03-15",
  "gender": "MALE",
  "heightCm": 175.0,
  "weightKg": 70.0,
  "activityLevel": "MODERATELY_ACTIVE",
  "healthGoal": "LOSE_WEIGHT",
  "dailyCalorieGoal": 1800,
  "dailyProteinGoalG": 120,
  "dailyCarbsGoalG": 200,
  "dailyFatGoalG": 60,
  "dailyWaterGoalMl": 2500,
  "timezone": "Asia/Ho_Chi_Minh"
}
```

**`activityLevel` values:** `SEDENTARY` | `LIGHTLY_ACTIVE` | `MODERATELY_ACTIVE` | `VERY_ACTIVE` | `EXTRA_ACTIVE`

**`healthGoal` values:** `LOSE_WEIGHT` | `MAINTAIN_WEIGHT` | `GAIN_MUSCLE` | `IMPROVE_FITNESS`

#### Ghi chỉ số cơ thể

```
POST {{baseUrl}}/api/users/me/metrics
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "recordedDate": "2026-05-14",
  "weightKg": 69.5,
  "bodyFatPercent": 18.5,
  "muscleMassKg": 56.8,
  "bmi": 22.7,
  "waistCm": 82.0,
  "hipCm": 95.0
}
```

#### Log nước uống

```
POST {{baseUrl}}/api/users/me/water
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "loggedAt": "2026-05-14T09:30:00",
  "amountMl": 250,
  "notes": "Uống sau khi tập"
}
```

```
GET {{baseUrl}}/api/users/me/water/today
Authorization: Bearer {{accessToken}}
```

---

### 5. Nutrition Service APIs

#### Tìm kiếm thực phẩm

```
GET {{baseUrl}}/api/nutrition/foods/search?q=cơm
Authorization: Bearer {{accessToken}}
```

```
GET {{baseUrl}}/api/nutrition/foods/search?q=chicken&page=0&size=10
Authorization: Bearer {{accessToken}}
```

#### Xem danh sách theo category

```
GET {{baseUrl}}/api/nutrition/foods?categoryId=1&page=0&size=20
Authorization: Bearer {{accessToken}}
```

#### Xem chi tiết thực phẩm

```
GET {{baseUrl}}/api/nutrition/foods/1
Authorization: Bearer {{accessToken}}
```

**Response mẫu:**
```json
{
  "id": 1,
  "name": "Cơm trắng",
  "nameVi": "Cơm trắng",
  "caloriesPer100g": 130,
  "proteinG": 2.7,
  "carbsG": 28.2,
  "fatG": 0.3,
  "fiberG": 0.4,
  "category": { "id": 1, "name": "Grains & Cereals" }
}
```

#### Tra cứu theo mã vạch

```
GET {{baseUrl}}/api/nutrition/foods/barcode/8934673407018
Authorization: Bearer {{accessToken}}
```

#### Xem danh mục thực phẩm

```
GET {{baseUrl}}/api/nutrition/categories
Authorization: Bearer {{accessToken}}
```

#### Tạo thực phẩm mới (user submit)

```
POST {{baseUrl}}/api/nutrition/foods
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Bánh mì sandwich",
  "nameVi": "Bánh mì sandwich",
  "caloriesPer100g": 265,
  "proteinG": 9.0,
  "carbsG": 49.0,
  "fatG": 3.2,
  "categoryId": 1
}
```

---

### 6. Meal Service APIs

> **Lưu ý:** `foodItemId` lấy từ kết quả API Nutrition Service ở bước trên.

#### Tạo bữa ăn

```
POST {{baseUrl}}/api/meals
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "mealType": "LUNCH",
  "mealDate": "2026-05-14",
  "notes": "Bữa trưa tại nhà",
  "items": [
    {
      "foodItemId": 1,
      "foodName": "Cơm trắng",
      "servingSizeG": 200,
      "quantity": 1,
      "calories": 260,
      "proteinG": 5.4,
      "carbsG": 56.4,
      "fatG": 0.6
    },
    {
      "foodItemId": 8,
      "foodName": "Ức gà luộc",
      "servingSizeG": 150,
      "quantity": 1,
      "calories": 248,
      "proteinG": 46.5,
      "carbsG": 0,
      "fatG": 5.3
    }
  ]
}
```

**`mealType` values:** `BREAKFAST` | `MORNING_SNACK` | `LUNCH` | `AFTERNOON_SNACK` | `DINNER` | `EVENING_SNACK`

**Tests script** (lưu meal ID):
```javascript
const res = pm.response.json();
pm.environment.set("mealId", res.id);
```

#### Xem bữa ăn trong ngày

```
GET {{baseUrl}}/api/meals?date=2026-05-14
Authorization: Bearer {{accessToken}}
```

#### Thêm món vào bữa ăn đã tạo

```
POST {{baseUrl}}/api/meals/{{mealId}}/items
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "foodItemId": 14,
  "foodName": "Rau muống xào",
  "servingSizeG": 100,
  "quantity": 1,
  "calories": 55
}
```

#### Xóa món khỏi bữa ăn

```
DELETE {{baseUrl}}/api/meals/{{mealId}}/items/1
Authorization: Bearer {{accessToken}}
```

#### Tạo kế hoạch ăn

```
POST {{baseUrl}}/api/meals/plans
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Kế hoạch giảm cân tháng 5",
  "description": "1800 kcal/ngày, nhiều protein",
  "startDate": "2026-05-14",
  "endDate": "2026-06-14"
}
```

---

### 7. Activity Service APIs

#### Log hoạt động thể chất

```
POST {{baseUrl}}/api/activities
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "activityTypeId": 1,
  "activityName": "Chạy bộ",
  "startTime": "2026-05-14T06:00:00",
  "endTime": "2026-05-14T06:45:00",
  "durationMinutes": 45,
  "caloriesBurned": 380,
  "distanceKm": 6.5,
  "avgHeartRate": 145,
  "notes": "Chạy buổi sáng quanh hồ"
}
```

#### Xem danh sách hoạt động hôm nay

```
GET {{baseUrl}}/api/activities?date=2026-05-14
Authorization: Bearer {{accessToken}}
```

#### Xem danh mục hoạt động

```
GET {{baseUrl}}/api/activities/types
Authorization: Bearer {{accessToken}}
```

**Response mẫu:**
```json
[
  { "id": 1, "name": "Running",     "category": "CARDIO",    "metValue": 9.8 },
  { "id": 2, "name": "Cycling",     "category": "CARDIO",    "metValue": 7.5 },
  { "id": 3, "name": "Swimming",    "category": "CARDIO",    "metValue": 8.0 },
  { "id": 11, "name": "Weight Lifting", "category": "STRENGTH", "metValue": 5.0 }
]
```

#### Log số bước chân

```
POST {{baseUrl}}/api/activities/steps
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "stepDate": "2026-05-14",
  "stepCount": 8432,
  "distanceKm": 6.2,
  "caloriesBurned": 315,
  "source": "MANUAL"
}
```

#### Tạo kế hoạch tập luyện

```
POST {{baseUrl}}/api/activities/plans
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Kế hoạch giảm mỡ 8 tuần",
  "goal": "WEIGHT_LOSS",
  "startDate": "2026-05-14",
  "endDate": "2026-07-09",
  "exercises": [
    {
      "activityTypeId": 1,
      "dayOfWeek": "MONDAY",
      "durationMinutes": 40,
      "notes": "Chạy bộ tốc độ vừa"
    },
    {
      "activityTypeId": 11,
      "dayOfWeek": "WEDNESDAY",
      "sets": 4,
      "reps": 12,
      "notes": "Tập tạ upper body"
    }
  ]
}
```

**`goal` values:** `WEIGHT_LOSS` | `MUSCLE_GAIN` | `ENDURANCE` | `GENERAL_FITNESS`

---

### 8. Analytics Service APIs

#### Xem tóm tắt ngày hôm nay

```
GET {{baseUrl}}/api/analytics/daily?date=2026-05-14
Authorization: Bearer {{accessToken}}
```

**Response mẫu:**
```json
{
  "date": "2026-05-14",
  "caloriesConsumed": 1840,
  "caloriesBurned": 420,
  "netCalories": 1420,
  "proteinG": 95.0,
  "carbsG": 210.0,
  "fatG": 58.0,
  "fiberG": 22.0,
  "waterMl": 1800,
  "steps": 8432,
  "activeMinutes": 65,
  "mealCount": 3,
  "calorieGoal": 1800,
  "calorieGoalMet": true
}
```

#### Xem báo cáo tuần

```
GET {{baseUrl}}/api/analytics/weekly?week=2026-W20
Authorization: Bearer {{accessToken}}
```

#### Xem báo cáo tháng

```
GET {{baseUrl}}/api/analytics/monthly?year=2026&month=5
Authorization: Bearer {{accessToken}}
```

#### Xem streak hiện tại

```
GET {{baseUrl}}/api/analytics/streak
Authorization: Bearer {{accessToken}}
```

**Response mẫu:**
```json
{
  "loggingStreak": 7,
  "longestLoggingStreak": 15,
  "goalStreak": 4,
  "activityStreak": 3
}
```

#### Xem gợi ý sức khỏe

```
GET {{baseUrl}}/api/analytics/insights?unreadOnly=true
Authorization: Bearer {{accessToken}}
```

#### Đánh dấu đã đọc

```
PUT {{baseUrl}}/api/analytics/insights/1/read
Authorization: Bearer {{accessToken}}
```

#### [ADMIN] Xem tổng quan hệ thống

> ⚠️ Yêu cầu đăng nhập bằng tài khoản **ADMIN**

```
GET {{baseUrl}}/api/analytics/admin/overview
Authorization: Bearer {{adminToken}}
```

---

### 9. Pre-request Script tự động renew token

Để Postman tự động refresh token khi hết hạn, thêm script này vào **Collection → Pre-request Script**:

```javascript
// Tự động refresh access token nếu sắp hết hạn
const accessToken = pm.environment.get("accessToken");
const refreshToken = pm.environment.get("refreshToken");

if (!accessToken || !refreshToken) return;

// Decode JWT để kiểm tra expiry
try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiry = payload.exp * 1000; // convert to ms
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Nếu token còn hơn 5 phút thì không cần refresh
    if (expiry - now > fiveMinutes) return;

    console.log("⏰ Access token sắp hết hạn, đang refresh...");

    pm.sendRequest({
        url: pm.environment.get("baseUrl") + "/api/auth/refresh",
        method: "POST",
        header: { "Content-Type": "application/json" },
        body: {
            mode: "raw",
            raw: JSON.stringify({ refreshToken: refreshToken })
        }
    }, (err, res) => {
        if (!err && res.code === 200) {
            const body = res.json();
            pm.environment.set("accessToken", body.accessToken);
            console.log("✅ Token refreshed tự động!");
        } else {
            console.log("❌ Refresh thất bại, cần login lại");
        }
    });
} catch (e) {
    console.log("Token không hợp lệ:", e.message);
}
```

---

### 📁 Import Collection nhanh

Tạo file `health-tracker.postman_collection.json` để share với team — import vào Postman:
1. **File → Import** → kéo thả file JSON
2. Chọn environment `Health Tracker - Local`
3. Chạy **Register** → **Login** → test các API khác
