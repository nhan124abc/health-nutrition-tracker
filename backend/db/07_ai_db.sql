-- ============================================================
-- AI SERVICE DATABASE
-- DB: ai_db
-- Chuc nang: Luu lich su chat AI va gioi han so cau hoi theo ngay
-- ============================================================

USE ai_db;

-- --------------------------------------------------------
-- Bang ai_chat_messages: lich su tin nhan AI
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     VARCHAR(64)  NULL COMMENT 'auth_db.users.id neu nguoi dung da dang nhap',
    guest_id    VARCHAR(100) NULL COMMENT 'ID an danh tu frontend/localStorage neu chua dang nhap',
    role        ENUM('USER', 'ASSISTANT') NOT NULL,
    content     TEXT         NOT NULL,
    model       VARCHAR(100) NULL COMMENT 'Model AI tra loi, vi du llama-3.1-8b-instant',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_ai_chat_user_created (user_id, created_at),
    INDEX idx_ai_chat_guest_created (guest_id, created_at),
    INDEX idx_ai_chat_created (created_at),
    CONSTRAINT chk_ai_chat_owner CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL)
        OR (user_id IS NULL AND guest_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Lich su chat AI theo user da dang nhap hoac guest';

-- --------------------------------------------------------
-- Bang ai_usage_limits: dem so cau hoi AI theo ngay
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_usage_limits (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_id       VARCHAR(64)  NULL COMMENT 'auth_db.users.id neu nguoi dung da dang nhap',
    guest_id      VARCHAR(100) NULL COMMENT 'ID an danh tu frontend/localStorage neu chua dang nhap',
    request_date  DATE         NOT NULL,
    request_count INT          NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_usage_user_date (user_id, request_date),
    UNIQUE KEY uq_ai_usage_guest_date (guest_id, request_date),
    INDEX idx_ai_usage_user (user_id),
    INDEX idx_ai_usage_guest (guest_id),
    INDEX idx_ai_usage_date (request_date),
    CONSTRAINT chk_ai_usage_owner CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL)
        OR (user_id IS NULL AND guest_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Gioi han so luot hoi AI theo ngay';

