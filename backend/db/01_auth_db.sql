-- ============================================================
-- AUTH SERVICE DATABASE
-- DB: auth_db
-- Chức năng: Xác thực, phân quyền, JWT, OAuth2
-- ============================================================

USE auth_db;

-- --------------------------------------------------------
-- Bảng users: tài khoản đăng nhập
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password        VARCHAR(255)    NULL COMMENT 'NULL nếu đăng nhập OAuth2',
    full_name       VARCHAR(100)    NULL,
    avatar_url      TEXT            NULL,
    role            ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    auth_provider   ENUM('LOCAL', 'GOOGLE', 'FACEBOOK') NOT NULL DEFAULT 'LOCAL',
    provider_id     VARCHAR(255)    NULL COMMENT 'ID từ Google / Facebook',
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    email_verified  TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_users_email (email),
    INDEX idx_users_provider (auth_provider, provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tài khoản đăng nhập của người dùng';

-- --------------------------------------------------------
-- Bảng refresh_tokens: lưu JWT refresh token
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    user_id     BIGINT          NOT NULL,
    token       VARCHAR(512)    NOT NULL UNIQUE,
    expiry_date DATETIME        NOT NULL,
    is_revoked  TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_refresh_token_user (user_id),
    INDEX idx_refresh_token_token (token),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='JWT Refresh Token';

