-- ============================================================
-- ACTIVITY SERVICE DATABASE
-- DB: activity_db
-- Chức năng: Theo dõi hoạt động thể chất, tập luyện
-- ============================================================

USE activity_db;

-- --------------------------------------------------------
-- Bảng activity_types: danh mục các loại hoạt động
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_types (
    id          INT             NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    name_vi     VARCHAR(100)    NULL COMMENT 'Tên tiếng Việt',
    category    ENUM(
                    'CARDIO',       -- Tim mạch: chạy bộ, bơi lội, đạp xe
                    'STRENGTH',     -- Sức mạnh: nâng tạ, gym
                    'FLEXIBILITY',  -- Linh hoạt: yoga, giãn cơ
                    'SPORTS',       -- Thể thao: bóng đá, cầu lông
                    'DAILY',        -- Hoạt động thường ngày: đi bộ, leo cầu thang
                    'OTHER'         -- Khác
                ) NOT NULL DEFAULT 'OTHER',
    met_value   DECIMAL(4,1)    NOT NULL DEFAULT 3.0 COMMENT 'Metabolic Equivalent of Task - dùng tính calo đốt',
    icon        VARCHAR(50)     NULL,
    description TEXT            NULL,
    is_system   TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '1 = hoạt động hệ thống, 0 = người dùng tự thêm',
    hidden      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Ẩn loại hoạt động khỏi danh sách người dùng',
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_activity_types_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục các loại hoạt động thể chất';

-- Dữ liệu mẫu loại hoạt động (MET values từ Compendium of Physical Activities)
INSERT INTO activity_types (name, name_vi, category, met_value, icon) VALUES
-- Cardio
('Running (8 km/h)',        'Chạy bộ (8 km/h)',         'CARDIO',   8.0,  '🏃'),
('Running (12 km/h)',       'Chạy bộ (12 km/h)',        'CARDIO',   11.5, '🏃'),
('Cycling (moderate)',      'Đạp xe (vừa phải)',        'CARDIO',   8.0,  '🚴'),
('Swimming (freestyle)',    'Bơi lội (tự do)',          'CARDIO',   10.0, '🏊'),
('Jump Rope',               'Nhảy dây',                 'CARDIO',   12.3, '⏭️'),
('Walking (5 km/h)',        'Đi bộ (5 km/h)',           'DAILY',    3.5,  '🚶'),
('Stair Climbing',          'Leo cầu thang',            'DAILY',    8.0,  '🪜'),
-- Sức mạnh
('Weight Training',         'Tập tạ',                   'STRENGTH', 5.0,  '🏋️'),
('Push-ups',                'Hít đất',                  'STRENGTH', 3.8,  '💪'),
('Pull-ups',                'Xà đơn',                   'STRENGTH', 4.0,  '🤸'),
('Plank',                   'Plank',                    'STRENGTH', 3.5,  '🧘'),
-- Thể thao
('Football / Soccer',       'Bóng đá',                  'SPORTS',   7.0,  '⚽'),
('Badminton',               'Cầu lông',                 'SPORTS',   5.5,  '🏸'),
('Basketball',              'Bóng rổ',                  'SPORTS',   8.0,  '🏀'),
('Table Tennis',            'Bóng bàn',                 'SPORTS',   4.0,  '🏓'),
('Volleyball',              'Bóng chuyền',              'SPORTS',   4.0,  '🏐'),
-- Linh hoạt
('Yoga',                    'Yoga',                     'FLEXIBILITY', 3.0, '🧘'),
('Stretching',              'Giãn cơ',                  'FLEXIBILITY', 2.5, '🤸'),
-- Hoạt động thường ngày
('Household Chores',        'Dọn dẹp nhà cửa',         'DAILY',    3.3,  '🏠'),
('Dancing',                 'Nhảy múa',                 'CARDIO',   5.0,  '💃');

-- --------------------------------------------------------
-- Bảng activity_logs: nhật ký hoạt động của người dùng
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    user_id             BIGINT          NOT NULL COMMENT 'Tham chiếu auth_db.users.id',
    activity_type_id    INT             NULL,

    -- Denormalized từ activity_types
    activity_name       VARCHAR(100)    NOT NULL COMMENT 'Tên hoạt động lúc log',
    category            VARCHAR(20)     NOT NULL,

    -- Thông số chung
    duration_minutes    INT             NOT NULL COMMENT 'Thời gian (phút)',
    calories_burned     DECIMAL(7,2)    NOT NULL DEFAULT 0 COMMENT 'Calo đốt (kcal)',
    notes               TEXT            NULL,
    logged_at           DATETIME        NOT NULL COMMENT 'Thời điểm thực hiện',

    -- Thông số Cardio
    distance_km         DECIMAL(6,2)    NULL COMMENT 'Quãng đường (km)',
    avg_heart_rate      INT             NULL COMMENT 'Nhịp tim trung bình (bpm)',
    max_heart_rate      INT             NULL COMMENT 'Nhịp tim tối đa (bpm)',

    -- Thông số Strength
    sets                INT             NULL COMMENT 'Số hiệp',
    reps_per_set        INT             NULL COMMENT 'Số lần/hiệp',
    weight_kg           DECIMAL(5,2)    NULL COMMENT 'Trọng lượng tập (kg)',

    -- Thông số Steps
    steps               INT             NULL COMMENT 'Số bước chân',

    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_date (user_id, logged_at),
    CONSTRAINT fk_activity_logs_type FOREIGN KEY (activity_type_id) REFERENCES activity_types (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký hoạt động thể chất';

-- --------------------------------------------------------
-- Bảng workout_plans: kế hoạch tập luyện
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_plans (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    user_id     BIGINT          NOT NULL,
    name        VARCHAR(100)    NOT NULL COMMENT 'VD: "Lịch tập 5 ngày/tuần"',
    description TEXT            NULL,
    goal        ENUM('WEIGHT_LOSS','MUSCLE_GAIN','ENDURANCE','GENERAL_FITNESS') NULL,
    duration_weeks INT          NULL COMMENT 'Số tuần thực hiện',
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_workout_plans_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Kế hoạch tập luyện';

-- --------------------------------------------------------
-- Bảng workout_plan_exercises: bài tập trong kế hoạch
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_plan_exercises (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    plan_id             BIGINT          NOT NULL,
    day_of_week         TINYINT         NOT NULL COMMENT '1=Thứ 2 ... 7=CN',
    activity_type_id    INT             NULL,
    exercise_name       VARCHAR(100)    NOT NULL,
    sets                INT             NULL,
    reps                INT             NULL,
    duration_minutes    INT             NULL,
    sort_order          INT             NOT NULL DEFAULT 0,
    notes               TEXT            NULL,

    PRIMARY KEY (id),
    INDEX idx_wpe_plan (plan_id),
    CONSTRAINT fk_wpe_plan FOREIGN KEY (plan_id) REFERENCES workout_plans (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bài tập trong kế hoạch luyện tập';

-- --------------------------------------------------------
-- Bảng step_logs: số bước chân hàng ngày (từ thiết bị đeo)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS step_logs (
    id          BIGINT      NOT NULL AUTO_INCREMENT,
    user_id     BIGINT      NOT NULL,
    log_date    DATE        NOT NULL,
    steps       INT         NOT NULL DEFAULT 0,
    distance_km DECIMAL(6,2) NULL,
    calories    DECIMAL(6,2) NULL,
    source      VARCHAR(50) NULL COMMENT 'VD: fitbit, apple_health, manual',
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_step_logs_user_date (user_id, log_date),
    INDEX idx_step_logs_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Số bước chân hàng ngày';

