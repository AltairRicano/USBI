-- Migration: 0012_drop_dead_routines.up.sql
-- Purpose: implements audit finding A7's decision (confirmed with the project
-- owner 2026-08-02): Go is the single source of truth for XP calculation,
-- level-attempt processing, and ARCO cancellation. These 5 PL/pgSQL functions
-- from 0006_operational_routines.up.sql were never called from Go — the same
-- logic was independently (and, per finding A2, divergently) reimplemented in
-- internal/levels, internal/sync, and internal/privacy. Keeping unused
-- duplicate business logic in the database is worse than having it only in
-- Go: it's a second place for the A2-style bugs to hide, and a reader has no
-- way to tell from the schema alone that these were dead code.
--
-- NOT dropped: usbi_enforce_append_only_ledgers() and the two triggers that
-- use it (experience_history_append_only_trg, admin_audit_log_append_only_trg)
-- — those ARE active and are exactly the kind of invariant that belongs in the
-- database regardless of which application code writes to these tables.
--
-- Drop order matches dependency order: usbi_complete_level_attempt and
-- usbi_apply_verified_sync_attempt call usbi_calculate_xp and (the former)
-- usbi_current_streak internally, so those two are dropped first.

DROP FUNCTION IF EXISTS usbi_apply_verified_sync_attempt(UUID, UUID, UUID, DATE, BOOLEAN);
DROP FUNCTION IF EXISTS usbi_complete_level_attempt(UUID, UUID, INTEGER, BOOLEAN, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS usbi_resolve_arco_cancellation(UUID, UUID, TEXT, TEXT, BYTEA, TEXT);
DROP FUNCTION IF EXISTS usbi_current_streak(UUID, DATE);
DROP FUNCTION IF EXISTS usbi_calculate_xp(INTEGER, INTEGER, BOOLEAN);
