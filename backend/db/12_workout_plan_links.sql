USE activity_db;

ALTER TABLE workout_plans ADD COLUMN plan_date DATE NULL AFTER name;
UPDATE workout_plans
SET plan_date = STR_TO_DATE(RIGHT(name, 10), '%Y-%m-%d')
WHERE plan_date IS NULL AND name REGEXP '[0-9]{4}-[0-9]{2}-[0-9]{2}$';
ALTER TABLE workout_plans MODIFY plan_date DATE NOT NULL;
ALTER TABLE workout_plans ADD UNIQUE KEY uq_workout_plans_user_date (user_id, plan_date);

ALTER TABLE activity_logs ADD COLUMN workout_plan_exercise_id BIGINT NULL AFTER activity_type_id;
ALTER TABLE activity_logs ADD INDEX idx_activity_logs_plan_exercise (workout_plan_exercise_id);
ALTER TABLE activity_logs ADD CONSTRAINT fk_activity_logs_plan_exercise
    FOREIGN KEY (workout_plan_exercise_id) REFERENCES workout_plan_exercises(id) ON DELETE SET NULL;
