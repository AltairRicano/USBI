-- Migration: 0001_initial.up.sql
-- Project: USBI Platform
-- Source of truth: Diccionario de Datos — Plataforma USBI (PostgreSQL On-Premise)
-- NOTE: UUIDv7 is generated at the application layer (Go, github.com/google/uuid v1.6+)
--       because uuid-ossp does NOT support v7 natively. PKs use gen_random_uuid()
--       as DB-level fallback only; application ALWAYS provides UUIDs.

-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. IDENTITY, AUTH & PRIVACY ──────────────────────────────────────────────

CREATE TABLE users (
    id                         UUID          PRIMARY KEY,
    full_name                  VARCHAR(120)  NOT NULL,
    -- email stored encrypted (pgcrypto PGP_SYM_ENCRYPT). Blind index for login.
    email                      BYTEA         NOT NULL,
    email_lookup_hash          BYTEA         NOT NULL,
    phone                      BYTEA,
    phone_lookup_hash          BYTEA,
    password_hash              VARCHAR       NOT NULL, -- Argon2id irreversible hash
    token_version              INTEGER       NOT NULL DEFAULT 1,
    is_adult                   BOOLEAN       NOT NULL,
    role                       VARCHAR       NOT NULL CHECK (role IN ('player', 'admin', 'operator', 'director')),
    privacy_notice_version     VARCHAR       NOT NULL,
    privacy_notice_accepted_at TIMESTAMPTZ   NOT NULL,
    privacy_acceptance_hash    BYTEA         NOT NULL, -- HMAC seal of acceptance record
    crypto_key_version         SMALLINT      NOT NULL,
    status                     VARCHAR       NOT NULL CHECK (status IN ('active', 'suspended', 'pending_tutor_consent', 'deleted')),
    -- Age-up transition attempt counter for Ley 251 self-service endpoint (max 3)
    age_up_attempts            SMALLINT      NOT NULL DEFAULT 0,
    created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_login_at              TIMESTAMPTZ,
    deleted_at                 TIMESTAMPTZ,
    deletion_reason            VARCHAR
);

-- Blind index: unique email per active account only
CREATE UNIQUE INDEX users_email_lookup_active_idx
    ON users(email_lookup_hash)
    WHERE deleted_at IS NULL;

-- Blind index: unique phone per active account only (nullable)
CREATE UNIQUE INDEX users_phone_lookup_active_idx
    ON users(phone_lookup_hash)
    WHERE phone_lookup_hash IS NOT NULL AND deleted_at IS NULL;

-- FK index for cascade purge performance
CREATE INDEX ON users(status);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tutor_consents (
    id                     UUID        PRIMARY KEY,
    user_id                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_name             BYTEA       NOT NULL, -- pgcrypto encrypted
    tutor_email            BYTEA       NOT NULL, -- pgcrypto encrypted
    privacy_notice_version VARCHAR     NOT NULL,
    accepted_at            TIMESTAMPTZ NOT NULL,
    acceptance_ip          INET        NOT NULL,
    acceptance_user_agent  TEXT        NOT NULL,
    consent_signature      BYTEA       NOT NULL, -- HMAC seal (legal evidence)
    crypto_key_version     SMALLINT    NOT NULL,
    revoked_at             TIMESTAMPTZ
);

CREATE INDEX ON tutor_consents(user_id);

-- ── 2. OPERATION & OFFLINE ARCHITECTURE ──────────────────────────────────────

CREATE TABLE devices (
    id              UUID        PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_label    VARCHAR     NOT NULL,
    platform        VARCHAR     NOT NULL CHECK (platform IN ('web', 'tauri')),
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ARCO flag: when true, next sync response MUST inject wipe_local_data=true
    wipe_local_data BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,
    -- Composite unique: enables FK from sync_events(device_id, user_id)
    CONSTRAINT uq_devices_id_user UNIQUE (id, user_id)
);

CREATE INDEX ON devices(user_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sync_events (
    id                 UUID        PRIMARY KEY,
    user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id          UUID        NOT NULL,
    payload            JSONB       NOT NULL, -- No PII: only technical progress events
    payload_hash       BYTEA       NOT NULL,
    hmac_signature     BYTEA       NOT NULL,
    crypto_key_version SMALLINT    NOT NULL,
    hmac_valid         BOOLEAN     NOT NULL, -- Set by Go backend after HMAC validation
    status             VARCHAR     NOT NULL CHECK (status IN ('pending', 'processed', 'rejected')),
    received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at       TIMESTAMPTZ,
    rejection_reason   TEXT,
    -- Composite FK: prevents cross-user device spoofing
    FOREIGN KEY (device_id, user_id) REFERENCES devices(id, user_id) ON DELETE CASCADE
);

CREATE INDEX ON sync_events(user_id, status);

-- ── 3. EDUCATIONAL CONTENT (Soft-Delete) ─────────────────────────────────────

CREATE TABLE sections (
    id                  UUID        PRIMARY KEY,
    title               VARCHAR     NOT NULL,
    color               VARCHAR     NOT NULL,
    created_by_admin_id UUID        REFERENCES users(id) ON DELETE SET NULL,
    is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    archived_at         TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE levels (
    id                  UUID        PRIMARY KEY,
    section_id          UUID        NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    title               VARCHAR     NOT NULL,
    color               VARCHAR     NOT NULL,
    template_type       VARCHAR     NOT NULL,
    -- content: structure & metadata only. NO binary assets.
    content             JSONB       NOT NULL,
    difficulty          INTEGER     NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by_admin_id UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    deleted_by          UUID        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX ON levels(section_id);

-- ── 4. PROGRESS & ACCOUNTABILITY ─────────────────────────────────────────────

CREATE TABLE player_progress (
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id            UUID        NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    best_score          INTEGER     NOT NULL DEFAULT 0,
    xp_total_for_level  INTEGER     NOT NULL DEFAULT 0,
    attempts_count      INTEGER     NOT NULL DEFAULT 0,
    first_completed_at  TIMESTAMPTZ,
    last_completed_at   TIMESTAMPTZ,
    PRIMARY KEY (user_id, level_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CONCURRENCY NOTE (RF15): attempt_number resolution MUST use transactional
-- locking in Go to prevent online/offline sync race conditions.

CREATE TABLE level_attempts (
    id             UUID    PRIMARY KEY,
    user_id        UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id       UUID    NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    attempt_date   DATE    NOT NULL,
    attempt_number INTEGER NOT NULL, -- 1=100% XP, 2-3=50%, >3=0%
    xp_awarded     INTEGER NOT NULL,
    completed      BOOLEAN NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, level_id, attempt_date, attempt_number)
);

CREATE INDEX ON level_attempts(user_id, level_id, attempt_date);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE daily_streak (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    UNIQUE (user_id, activity_date)
);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE badges (
    id            UUID    PRIMARY KEY,
    name          VARCHAR NOT NULL,
    xp_threshold  INTEGER NOT NULL,
    icon_key      VARCHAR NOT NULL
);

CREATE TABLE user_badges (
    user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id  UUID        NOT NULL REFERENCES badges(id) ON DELETE RESTRICT,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- ── 5. AUDIT & LEGAL COMPLIANCE ──────────────────────────────────────────────

CREATE TABLE arco_requests (
    id               UUID        PRIMARY KEY,
    -- SET NULL: preserve record for legal traceability after user deletion
    user_id          UUID        REFERENCES users(id) ON DELETE SET NULL,
    requester_type   VARCHAR     NOT NULL,
    request_type     VARCHAR     NOT NULL CHECK (request_type IN ('acceso', 'rectificacion', 'cancelacion', 'oposicion')),
    received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at      TIMESTAMPTZ,
    status           VARCHAR     NOT NULL,
    handled_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
    response_summary TEXT,
    evidence_hash    BYTEA       NOT NULL -- cryptographic seal for No-Repudio
);

CREATE INDEX ON arco_requests(user_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE security_incidents (
    id                       UUID        PRIMARY KEY,
    detected_at              TIMESTAMPTZ NOT NULL,
    reported_at              TIMESTAMPTZ,
    severity                 VARCHAR     NOT NULL,
    affected_scope           TEXT        NOT NULL,
    description              TEXT        NOT NULL,
    containment_actions      TEXT        NOT NULL,
    resolved_at              TIMESTAMPTZ,
    reported_to_cutai        BOOLEAN     NOT NULL DEFAULT FALSE,
    notified_to_cutai_at     TIMESTAMPTZ,
    notified_to_subjects_at  TIMESTAMPTZ,
    evidence_hash            BYTEA       NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- APPEND-ONLY: no UPDATE/DELETE except SET NULL on user_id for pseudonymization.

CREATE TABLE experience_history (
    id                  UUID        PRIMARY KEY, -- UUIDv7 from app layer
    -- SET NULL: preserve ledger entry after user deletion (pseudonymization)
    user_id             UUID        REFERENCES users(id) ON DELETE SET NULL,
    level_id            UUID        NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    event_type          VARCHAR     NOT NULL,
    xp_gained           INTEGER     NOT NULL,
    source              VARCHAR     NOT NULL,
    verification_method VARCHAR     NOT NULL,
    sync_event_id       UUID        REFERENCES sync_events(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (source = 'online'        AND verification_method = 'online_direct') OR
        (source = 'offline_sync'  AND verification_method = 'hmac_offline')
    )
);

CREATE INDEX ON experience_history(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- APPEND-ONLY: before_state/after_state MUST NOT contain plaintext PII.
-- actor_user_id set to NULL upon ARCO pseudonymization.

CREATE TABLE admin_audit_log (
    id            UUID        PRIMARY KEY,
    actor_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR     NOT NULL,
    entity_type   VARCHAR     NOT NULL,
    entity_id     UUID,
    before_state  JSONB,
    after_state   JSONB,
    ip_address    INET        NOT NULL,
    user_agent    TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON admin_audit_log(actor_user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS experience_history;
DROP TABLE IF EXISTS security_incidents;
DROP TABLE IF EXISTS arco_requests;
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS daily_streak;
DROP TABLE IF EXISTS level_attempts;
DROP TABLE IF EXISTS player_progress;
DROP TABLE IF EXISTS levels;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS sync_events;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS tutor_consents;
DROP TABLE IF EXISTS users;
DROP EXTENSION IF EXISTS "pgcrypto";
-- +goose StatementEnd
