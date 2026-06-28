USE user_db;

ALTER TABLE body_metrics
    ADD COLUMN IF NOT EXISTS neck_cm DECIMAL(5,2) NULL COMMENT 'Neck circumference (cm)' AFTER waist_cm;
