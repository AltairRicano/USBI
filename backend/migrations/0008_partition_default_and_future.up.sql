-- Migration: 0008_partition_default_and_future.up.sql
--
-- 0007_partition_progress.up.sql converted level_attempts and daily_streak to
-- RANGE partitioning with explicit partitions only for 2025-2027 and no
-- DEFAULT partition. Any INSERT with a date outside that range currently
-- fails with "no partition of relation found for row".
--
-- This migration adds a DEFAULT partition to both tables as a last-resort
-- safety net. The backend's internal/dbmaint scheduler creates explicit
-- yearly partitions well ahead of time (current year + 2), so in normal
-- operation these DEFAULT partitions should remain empty — they only ever
-- catch a date outside the maintained window (e.g. a missed deploy of the
-- scheduler, clock skew, or historical backfill data).
--
-- Apply this once, manually, before deploying the dbmaint scheduler for the
-- first time (see DEPLOYMENT.md — migrations are applied in filename order).

CREATE TABLE level_attempts_default PARTITION OF level_attempts DEFAULT;
CREATE TABLE daily_streak_default PARTITION OF daily_streak DEFAULT;
