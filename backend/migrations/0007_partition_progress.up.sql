-- Migration: 0007_partition_progress.up.sql

-- Partition level_attempts
CREATE TABLE level_attempts_partitioned (
    id             UUID    NOT NULL,
    user_id        UUID    NOT NULL,
    level_id       UUID    NOT NULL,
    attempt_date   DATE    NOT NULL,
    attempt_number INTEGER NOT NULL,
    xp_awarded     INTEGER NOT NULL,
    completed      BOOLEAN NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, attempt_date),
    UNIQUE (user_id, level_id, attempt_date, attempt_number)
) PARTITION BY RANGE (attempt_date);

-- Create initial partitions for a few years
CREATE TABLE level_attempts_2025 PARTITION OF level_attempts_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE level_attempts_2026 PARTITION OF level_attempts_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE level_attempts_2027 PARTITION OF level_attempts_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Migrate data
INSERT INTO level_attempts_partitioned
SELECT * FROM level_attempts;

-- Replace old table
DROP TABLE level_attempts CASCADE;
ALTER TABLE level_attempts_partitioned RENAME TO level_attempts;

CREATE INDEX ON level_attempts(user_id, level_id, attempt_date);

-- -------------------------------------------------------------
-- Partition daily_streak
CREATE TABLE daily_streak_partitioned (
    user_id       UUID NOT NULL,
    activity_date DATE NOT NULL,
    PRIMARY KEY (user_id, activity_date)
) PARTITION BY RANGE (activity_date);

-- Create initial partitions for a few years
CREATE TABLE daily_streak_2025 PARTITION OF daily_streak_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE daily_streak_2026 PARTITION OF daily_streak_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE daily_streak_2027 PARTITION OF daily_streak_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Migrate data
INSERT INTO daily_streak_partitioned
SELECT * FROM daily_streak;

-- Replace old table
DROP TABLE daily_streak CASCADE;
ALTER TABLE daily_streak_partitioned RENAME TO daily_streak;

ALTER TABLE level_attempts ADD CONSTRAINT level_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE level_attempts ADD CONSTRAINT level_attempts_level_id_fkey FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT;
ALTER TABLE daily_streak ADD CONSTRAINT daily_streak_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

