-- Migration: 0010_fk_indexes.up.sql
-- Purpose: index the foreign keys behind RESTRICT/CASCADE relationships
-- (audit finding A6). PostgreSQL does NOT auto-index foreign keys; without these,
-- deleting or archiving a RESTRICT-protected level/badge, or cascading a device
-- delete, does a sequential scan over these tables as they grow toward the
-- documented scale (10k users / 5k levels).
--
-- Plain CREATE INDEX (matching the convention already used in 0007) — safe and
-- instant on the empty tables of a first deployment. To add these to an
-- ALREADY-LARGE live database instead, build each one with
-- CREATE INDEX CONCURRENTLY run OUTSIDE a transaction (one statement at a time).

CREATE INDEX IF NOT EXISTS player_progress_level_id_idx   ON player_progress(level_id);
CREATE INDEX IF NOT EXISTS experience_history_level_id_idx ON experience_history(level_id);
CREATE INDEX IF NOT EXISTS level_attempts_level_id_idx     ON level_attempts(level_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx        ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS sync_events_device_id_idx       ON sync_events(device_id);
