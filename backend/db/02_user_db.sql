-- ============================================================
-- USER SERVICE DATABASE
-- DB: user_db
-- Chức năng: Hồ sơ người dùng, chỉ số sức khỏe, mục tiêu
-- Lưu ý: user_id tham chiếu tới auth_db.users.id (cross-DB ref)
--        KHÔNG dùng FOREIGN KEY vì khác DB (microservice pattern)
-- ============================================================

USE user_db;

-- --------------------------------------------------------
-- Bảng user_profiles: hồ sơ chi tiết người dùng
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL UNIQUE COMMENT 'Tham chiếu auth_db.users.id',
    username            VARCHAR(50)     NULL UNIQUE,
    date_of_birth       DATE            NULL,
    gender              ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    height_cm           DECIMAL(5,2)    NULL COMMENT 'Chiều cao (cm)',
    weight_kg           DECIMAL(5,2)    NULL COMMENT 'Cân nặng hiện tại (kg)',
    activity_level      ENUM(
                            'SEDENTARY',        -- Ít vận động
                            'LIGHTLY_ACTIVE',   -- Vận động nhẹ 1-3 ngày/tuần
                            'MODERATELY_ACTIVE',-- Vận động vừa 3-5 ngày/tuần
                            'VERY_ACTIVE',      -- Vận động nhiều 6-7 ngày/tuần
                            'EXTRA_ACTIVE'      -- Vận động rất nhiều
                        ) NULL DEFAULT 'SEDENTARY',
    goal                ENUM(
                            'LOSE_WEIGHT',      -- Giảm cân
                            'MAINTAIN_WEIGHT',  -- Duy trì cân nặng
                            'GAIN_MUSCLE',      -- Tăng cơ
                            'IMPROVE_FITNESS'   -- Cải thiện thể lực
                        ) NULL DEFAULT 'MAINTAIN_WEIGHT',
    target_weight_kg    DECIMAL(5,2)    NULL COMMENT 'Cân nặng mục tiêu (kg)',
    daily_calorie_goal  INT             NULL COMMENT 'Mục tiêu calo mỗi ngày (kcal)',
    daily_protein_goal_g INT            NULL COMMENT 'Mục tiêu protein mỗi ngày (g)',
    daily_carbs_goal_g  INT             NULL COMMENT 'Mục tiêu carbs mỗi ngày (g)',
    daily_fat_goal_g    INT             NULL COMMENT 'Mục tiêu chất béo mỗi ngày (g)',
    daily_water_goal_ml INT             NULL DEFAULT 2000 COMMENT 'Mục tiêu nước uống (ml)',
    bio                 TEXT            NULL,
    timezone            VARCHAR(50)     NULL DEFAULT 'UTC',
    plan_start_date     DATE            NULL COMMENT 'Ngày bắt đầu kế hoạch',
    plan_duration_weeks INT             NULL COMMENT 'Thời hạn kế hoạch (số tuần)',
    daily_activity_goal_kcal INT        NULL COMMENT 'Mục tiêu calo vận động hằng ngày (kcal)',
    hidden              TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Ẩn hồ sơ khỏi danh sách user thường',
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_user_profiles_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hồ sơ sức khỏe chi tiết của người dùng';

-- --------------------------------------------------------
-- Bảng body_metrics: lịch sử chỉ số cơ thể (theo dõi cân nặng, v.v.)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS body_metrics (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT          NOT NULL COMMENT 'Tham chiếu auth_db.users.id',
    weight_kg               DECIMAL(5,2)    NULL COMMENT 'Cân nặng (kg)',
    body_fat_percentage     DECIMAL(4,1)    NULL COMMENT 'Tỷ lệ mỡ cơ thể (%)',
    muscle_mass_kg          DECIMAL(5,2)    NULL COMMENT 'Khối lượng cơ (kg)',
    bmi                     DECIMAL(4,1)    NULL COMMENT 'Chỉ số BMI (tính toán từ height & weight)',
    bmr                     DECIMAL(7,0)    NULL COMMENT 'Basal metabolic rate (kcal/day)',
    tdee                    DECIMAL(7,0)    NULL COMMENT 'Total daily energy expenditure (kcal/day)',
    waist_cm                DECIMAL(5,2)    NULL COMMENT 'Vòng eo (cm)',
    hip_cm                  DECIMAL(5,2)    NULL COMMENT 'Vòng hông (cm)',
    chest_cm                DECIMAL(5,2)    NULL COMMENT 'Vòng ngực (cm)',
    notes                   TEXT            NULL,
    recorded_at             DATE            NOT NULL COMMENT 'Ngày ghi nhận',
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_body_metrics_user (user_id),
    INDEX idx_body_metrics_date (user_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử chỉ số cơ thể';

-- --------------------------------------------------------
-- Bảng water_logs: theo dõi lượng nước uống
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_logs (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    user_id     BIGINT      NOT NULL,
    amount_ml   INT         NOT NULL COMMENT 'Lượng nước (ml)',
    logged_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_water_logs_user_date (user_id, logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lịch sử uống nước';

-- --------------------------------------------------------
-- Bảng user_notifications: cài đặt thông báo nhắc nhở
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id                          BIGINT      NOT NULL AUTO_INCREMENT,
    user_id                     BIGINT      NOT NULL UNIQUE,
    meal_reminder_enabled       TINYINT(1)  NOT NULL DEFAULT 1,
    meal_reminder_times         JSON        NULL COMMENT 'VD: ["07:00","12:00","19:00"]',
    water_reminder_enabled      TINYINT(1)  NOT NULL DEFAULT 1,
    water_reminder_interval_min INT         NULL DEFAULT 60,
    weight_reminder_enabled     TINYINT(1)  NOT NULL DEFAULT 1,
    weight_reminder_day         TINYINT     NULL DEFAULT 1 COMMENT '1=Thứ 2, 7=Chủ nhật',
    updated_at                  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_notif_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cài đặt thông báo của người dùng';

