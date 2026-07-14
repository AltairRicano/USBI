CREATE TABLE users (
    id UUID PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    email BYTEA NOT NULL,
    email_lookup_hash BYTEA NOT NULL,
    phone BYTEA,
    phone_lookup_hash BYTEA,
    password_hash VARCHAR NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 1,
    is_adult BOOLEAN NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('player', 'admin', 'operator', 'director')),
    privacy_notice_version VARCHAR NOT NULL,
    privacy_notice_accepted_at TIMESTAMPTZ NOT NULL,
    privacy_acceptance_hash BYTEA NOT NULL,
    crypto_key_version SMALLINT NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('active', 'suspended', 'pending_tutor_consent', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR
);

CREATE TABLE tutor_consents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_full_name VARCHAR NOT NULL,
    tutor_relationship VARCHAR NOT NULL,
    contact_email BYTEA NOT NULL,
    consent_status VARCHAR NOT NULL CHECK (consent_status IN ('pending', 'approved', 'rejected', 'revoked')),
    consent_hash BYTEA NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE TABLE devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    CONSTRAINT uq_devices_id_user UNIQUE (id, user_id)
);

CREATE TABLE sync_events (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    user_id UUID NOT NULL,
    payload_hash BYTEA NOT NULL,
    hmac_signature BYTEA NOT NULL,
    crypto_key_version SMALLINT NOT NULL,
    hmac_valid BOOLEAN NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('pending', 'processed', 'rejected')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    FOREIGN KEY (device_id, user_id) REFERENCES devices(id, user_id) ON DELETE CASCADE
);

CREATE TABLE sections (
    id UUID PRIMARY KEY,
    title VARCHAR NOT NULL,
    color VARCHAR NOT NULL,
    created_by_admin_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

CREATE TABLE levels (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    title VARCHAR NOT NULL,
    color VARCHAR NOT NULL,
    template_type VARCHAR NOT NULL,
    content JSONB NOT NULL,
    difficulty INTEGER NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_by_admin_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE player_progress (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    best_score INTEGER NOT NULL DEFAULT 0,
    xp_total_for_level INTEGER NOT NULL DEFAULT 0,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    first_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, level_id)
);

CREATE TABLE level_attempts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    attempt_date DATE NOT NULL,
    attempt_number INTEGER NOT NULL,
    xp_awarded INTEGER NOT NULL,
    completed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, level_id, attempt_date, attempt_number)
);

CREATE TABLE daily_streak (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    UNIQUE (user_id, activity_date)
);

CREATE TABLE badges (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    xp_threshold INTEGER NOT NULL,
    icon_key VARCHAR NOT NULL
);

CREATE TABLE user_badges (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE RESTRICT,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE arco_requests (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    requester_type VARCHAR NOT NULL,
    request_type VARCHAR NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    status VARCHAR NOT NULL,
    handled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    response_summary TEXT,
    evidence_hash BYTEA NOT NULL
);

CREATE TABLE security_incidents (
    id UUID PRIMARY KEY,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reported_at TIMESTAMPTZ,
    severity VARCHAR NOT NULL,
    affected_scope TEXT NOT NULL,
    description TEXT NOT NULL,
    containment_actions TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    reported_to_cutai BOOLEAN NOT NULL DEFAULT false,
    notified_to_cutai_at TIMESTAMPTZ,
    notified_to_subjects_at TIMESTAMPTZ,
    evidence_hash BYTEA NOT NULL
);

CREATE TABLE experience_history (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE RESTRICT,
    event_type VARCHAR NOT NULL,
    xp_gained INTEGER NOT NULL,
    source VARCHAR NOT NULL,
    verification_method VARCHAR NOT NULL,
    sync_event_id UUID REFERENCES sync_events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ( (source = 'online' AND verification_method = 'online_direct') OR (source = 'offline_sync' AND verification_method = 'hmac_offline') )
);

CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id UUID,
    before_state JSONB NOT NULL,
    after_state JSONB NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON sync_events(user_id, status);
CREATE INDEX ON experience_history(user_id);
CREATE INDEX ON admin_audit_log(actor_user_id);
CREATE UNIQUE INDEX users_email_lookup_active_idx ON users(email_lookup_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_phone_lookup_active_idx ON users(phone_lookup_hash) WHERE phone_lookup_hash IS NOT NULL AND deleted_at IS NULL;
