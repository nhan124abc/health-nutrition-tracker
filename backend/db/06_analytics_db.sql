-- ============================================================
-- ANALYTICS SERVICE DATABASE
-- DB: analytics_db
-- Chức năng: Tổng hợp & báo cáo dữ liệu sức khỏe
--            (aggregated data từ các service khác)
-- Lưu ý: Analytics service lắng nghe events từ các service
--        khác (qua Message Queue) và lưu dữ liệu tổng hợp
-- ============================================================

USE analytics_db;

-- --------------------------------------------------------
-- Bảng daily_summaries: tóm tắt sức khỏe theo ngày
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_summaries (
    id                      BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT          NOT NULL COMMENT 'Tham chiếu auth_db.users.id',
    summary_date            DATE            NOT NULL,

    -- Dinh dưỡng (từ meal-service)
    total_calories_consumed DECIMAL(8,2)    NOT NULL DEFAULT 0 COMMENT 'Tổng calo nạp vào (kcal)',
    total_protein_g         DECIMAL(7,2)    NOT NULL DEFAULT 0,
    total_carbs_g           DECIMAL(7,2)    NOT NULL DEFAULT 0,
    total_fat_g             DECIMAL(7,2)    NOT NULL DEFAULT 0,
    total_fiber_g           DECIMAL(7,2)    NOT NULL DEFAULT 0,
    total_sodium_mg         DECIMAL(8,2)    NOT NULL DEFAULT 0,
    meal_count              INT             NOT NULL DEFAULT 0 COMMENT 'Số bữa ăn trong ngày',

    -- Hoạt động (từ activity-service)
    total_calories_burned   DECIMAL(8,2)    NOT NULL DEFAULT 0 COMMENT 'Tổng calo đốt (kcal)',
    total_active_minutes    INT             NOT NULL DEFAULT 0 COMMENT 'Phút hoạt động',
    total_steps             INT             NOT NULL DEFAULT 0,
    total_distance_km       DECIMAL(6,2)    NOT NULL DEFAULT 0,
    activity_count          INT             NOT NULL DEFAULT 0,

    -- Cân bằng
    net_calories            DECIMAL(8,2)    GENERATED ALWAYS AS (total_calories_consumed - total_calories_burned) STORED COMMENT 'Calo thuần = Nạp vào - Đốt ra',

    -- Nước uống (từ user-service)
    water_intake_ml         INT             NOT NULL DEFAULT 0,

    -- Mục tiêu (snapshot từ user-service lúc tạo)
    calorie_goal            INT             NULL COMMENT 'Mục tiêu calo ngày đó',
    calorie_goal_met        TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = đạt mục tiêu',

    -- Cân nặng (nếu có ghi nhận ngày đó)
    weight_kg               DECIMAL(5,2)    NULL,

    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_daily_user_date (user_id, summary_date),
    INDEX idx_daily_user (user_id),
    INDEX idx_daily_date (summary_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tóm tắt sức khỏe hàng ngày';

-- --------------------------------------------------------
-- Bảng weekly_reports: báo cáo theo tuần
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_reports (
    id                          BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                     BIGINT          NOT NULL,
    week_start_date             DATE            NOT NULL COMMENT 'Ngày đầu tuần (Thứ 2)',
    week_end_date               DATE            NOT NULL COMMENT 'Ngày cuối tuần (CN)',

    -- Dinh dưỡng trung bình
    avg_daily_calories          DECIMAL(7,2)    NULL,
    avg_daily_protein_g         DECIMAL(6,2)    NULL,
    avg_daily_carbs_g           DECIMAL(6,2)    NULL,
    avg_daily_fat_g             DECIMAL(6,2)    NULL,
    avg_daily_water_ml          INT             NULL,

    -- Calo tổng
    total_calories_consumed     DECIMAL(9,2)    NULL,
    total_calories_burned       DECIMAL(9,2)    NULL,

    -- Hoạt động
    avg_daily_steps             INT             NULL,
    total_active_minutes        INT             NULL,
    active_days_count           TINYINT         NULL COMMENT 'Số ngày có vận động',

    -- Cân nặng
    weight_start_kg             DECIMAL(5,2)    NULL COMMENT 'Cân nặng đầu tuần',
    weight_end_kg               DECIMAL(5,2)    NULL COMMENT 'Cân nặng cuối tuần',
    weight_change_kg            DECIMAL(5,2)    GENERATED ALWAYS AS (weight_end_kg - weight_start_kg) STORED,

    -- Số ngày đạt mục tiêu
    goal_met_days               TINYINT         NULL DEFAULT 0,

    created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_weekly_user_week (user_id, week_start_date),
    INDEX idx_weekly_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Báo cáo sức khỏe theo tuần';

-- --------------------------------------------------------
-- Bảng monthly_reports: báo cáo theo tháng
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_reports (
    id                          BIGINT          NOT NULL AUTO_INCREMENT,
    user_id                     BIGINT          NOT NULL,
    report_year                 SMALLINT        NOT NULL,
    report_month                TINYINT         NOT NULL COMMENT '1-12',

    avg_daily_calories          DECIMAL(7,2)    NULL,
    avg_daily_protein_g         DECIMAL(6,2)    NULL,
    avg_daily_carbs_g           DECIMAL(6,2)    NULL,
    avg_daily_fat_g             DECIMAL(6,2)    NULL,
    total_calories_burned       DECIMAL(10,2)   NULL,
    avg_daily_steps             INT             NULL,
    active_days_count           INT             NULL,
    weight_start_kg             DECIMAL(5,2)    NULL,
    weight_end_kg               DECIMAL(5,2)    NULL,
    weight_change_kg            DECIMAL(5,2)    GENERATED ALWAYS AS (weight_end_kg - weight_start_kg) STORED,
    goal_met_days               INT             NULL DEFAULT 0,
    data_days_count             INT             NULL COMMENT 'Số ngày có dữ liệu',

    created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_monthly_user (user_id, report_year, report_month),
    INDEX idx_monthly_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Báo cáo sức khỏe theo tháng';

-- --------------------------------------------------------
-- Bảng nutrition_trends: xu hướng dinh dưỡng (top foods, v.v.)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutrition_trends (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL,
    food_item_id        BIGINT          NOT NULL COMMENT 'nutrition_db.food_items.id',
    food_name           VARCHAR(255)    NOT NULL COMMENT 'Denormalized',
    frequency           INT             NOT NULL DEFAULT 1 COMMENT 'Số lần ăn',
    total_calories      DECIMAL(9,2)    NOT NULL DEFAULT 0,
    period_start        DATE            NOT NULL,
    period_end          DATE            NOT NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_trends_user (user_id),
    UNIQUE KEY uq_trends_user_food_period (user_id, food_item_id, period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Xu hướng thực phẩm thường ăn';

-- --------------------------------------------------------
-- Bảng user_streaks: chuỗi ngày đạt mục tiêu liên tiếp (gamification)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_streaks (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL UNIQUE,
    streak_type         ENUM(
                            'LOGGING_STREAK',   -- Chuỗi ngày ghi nhật ký liên tiếp
                            'GOAL_STREAK',      -- Chuỗi ngày đạt mục tiêu calo
                            'ACTIVITY_STREAK'   -- Chuỗi ngày có vận động
                        ) NOT NULL DEFAULT 'LOGGING_STREAK',
    current_streak      INT             NOT NULL DEFAULT 0 COMMENT 'Số ngày streak hiện tại',
    longest_streak      INT             NOT NULL DEFAULT 0 COMMENT 'Streak dài nhất',
    last_active_date    DATE            NULL,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_streaks_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chuỗi ngày đạt mục tiêu';

-- --------------------------------------------------------
-- Bảng health_insights: nhận xét & gợi ý cá nhân hoá
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_insights (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    user_id         BIGINT          NOT NULL,
    insight_type    ENUM(
                        'NUTRITION_TIP',    -- Gợi ý dinh dưỡng
                        'ACTIVITY_TIP',     -- Gợi ý vận động
                        'GOAL_PROGRESS',    -- Tiến độ mục tiêu
                        'ACHIEVEMENT',      -- Thành tích
                        'WARNING'           -- Cảnh báo (VD: ít uống nước)
                    ) NOT NULL,
    title           VARCHAR(200)    NOT NULL,
    content         TEXT            NOT NULL,
    is_read         TINYINT(1)      NOT NULL DEFAULT 0,
    valid_date      DATE            NULL COMMENT 'Ngày insight có hiệu lực',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_insights_user (user_id),
    INDEX idx_insights_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhận xét & gợi ý cá nhân hoá';

