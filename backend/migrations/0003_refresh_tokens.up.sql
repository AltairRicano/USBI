-- Migration: 0003_refresh_tokens.up.sql
-- Purpose: opaque refresh tokens for seven-day sessions with server-side revocation.

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  BYTEA       NOT NULL UNIQUE,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_active_idx
    ON refresh_tokens(user_id)
    WHERE revoked_at IS NULL;
