-- Add creator ownership for user-created activity types.
USE activity_db;

SET @has_activity_type_creator_column = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'activity_types'
      AND COLUMN_NAME = 'created_by_user_id'
);

SET @add_activity_type_creator_column = IF(
    @has_activity_type_creator_column = 0,
    'ALTER TABLE activity_types ADD COLUMN created_by_user_id BIGINT NULL COMMENT ''NULL = system, otherwise auth_db.users.id of creator'' AFTER is_system',
    'SELECT 1'
);

PREPARE add_activity_type_creator_column_stmt FROM @add_activity_type_creator_column;
EXECUTE add_activity_type_creator_column_stmt;
DEALLOCATE PREPARE add_activity_type_creator_column_stmt;

SET @has_activity_type_creator_index = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'activity_types'
      AND INDEX_NAME = 'idx_activity_types_creator'
);

SET @add_activity_type_creator_index = IF(
    @has_activity_type_creator_index = 0,
    'CREATE INDEX idx_activity_types_creator ON activity_types (created_by_user_id)',
    'SELECT 1'
);

PREPARE add_activity_type_creator_index_stmt FROM @add_activity_type_creator_index;
EXECUTE add_activity_type_creator_index_stmt;
DEALLOCATE PREPARE add_activity_type_creator_index_stmt;
