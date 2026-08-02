-- Migration: 0009_tutor_consent_tokens.up.sql
-- Purpose: real tutor "double opt-in" (audit finding A1).
--
-- Before this migration, POST /auth/tutor-consent activated a minor's account in
-- the same request that captured the tutor's data, with no email verification —
-- so anyone who knew or guessed a user_id could self-activate a minor's account.
--
-- Now the tutor's data is stored as a PENDING request together with a single-use
-- token (HMAC-hashed, 24h expiry) that is emailed to the tutor. The account is
-- activated only when the tutor clicks the verification link, and the legally
-- binding IP / user-agent recorded are those of the CLICK, not of whoever filled
-- the form. This satisfies "Condiciones y acuerdos de la USBI" and the EIPDP:
-- token único de 24h enviado al correo del tutor, clic de verificación,
-- IP/fecha/hora del clic registrados.

CREATE TABLE IF NOT EXISTS tutor_consent_tokens (
    id                      UUID        PRIMARY KEY,
    user_id                 UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Tutor data captured at request time, encrypted (pgcrypto PGP_SYM_ENCRYPT).
    tutor_name              BYTEA       NOT NULL,
    tutor_email             BYTEA       NOT NULL,
    privacy_notice_version  VARCHAR     NOT NULL,
    -- HMAC-SHA256 of the raw token handed to the tutor via email. The raw token
    -- is never stored, so a DB leak alone cannot forge a valid verification link.
    token_hash              BYTEA       NOT NULL,
    -- IP / user-agent of whoever SUBMITTED the form. This is audit of initiation,
    -- NOT the legal consent evidence — that is the click, recorded on verify.
    requested_ip            INET        NOT NULL,
    requested_user_agent    TEXT        NOT NULL,
    crypto_key_version      SMALLINT    NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMPTZ NOT NULL,
    -- Set exactly once, on the tutor's click. NULL = still pending verification.
    verified_at             TIMESTAMPTZ,
    verification_ip         INET,
    verification_user_agent TEXT
);

-- One row per raw token; also the lookup path used on verification.
CREATE UNIQUE INDEX IF NOT EXISTS tutor_consent_tokens_token_hash_idx
    ON tutor_consent_tokens(token_hash);

CREATE INDEX IF NOT EXISTS tutor_consent_tokens_user_id_idx
    ON tutor_consent_tokens(user_id);

-- Supports both the expiry-purge job and "supersede previous pending token for
-- this user" on re-submission (resend).
CREATE INDEX IF NOT EXISTS tutor_consent_tokens_pending_idx
    ON tutor_consent_tokens(user_id, expires_at)
    WHERE verified_at IS NULL;
