-- Habilitar extensión para cifrado y generación de UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tablas de Identidad, Autenticación y Privacidad

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email BYTEA NOT NULL,
    email_lookup_hash BYTEA NOT NULL,
    phone BYTEA,
    phone_lookup_hash BYTEA,
    password_hash VARCHAR NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 1,
    is_adult BOOLEAN NOT NULL,
    role VARCHAR(30) NOT NULL,
    privacy_notice_version VARCHAR(30) NOT NULL,
    privacy_notice_accepted_at TIMESTAMPTZ NOT NULL,
    privacy_acceptance_hash BYTEA NOT NULL,
    crypto_key_version SMALLINT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR
);

CREATE TABLE tutor_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tutor_name BYTEA NOT NULL,
    tutor_email BYTEA NOT NULL,
    privacy_notice_version VARCHAR(30) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL,
    acceptance_ip INET NOT NULL,
    acceptance_user_agent TEXT NOT NULL,
    consent_signature BYTEA NOT NULL,
    crypto_key_version SMALLINT NOT NULL DEFAULT 1,
    revoked_at TIMESTAMPTZ
);

-- 2. Tablas de Operación y Arquitectura Offline

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_label VARCHAR(150) NOT NULL,
    platform VARCHAR(30) NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    wipe_local_data BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ
);

CREATE TABLE sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_id UUID NOT NULL,
    payload JSONB NOT NULL,
    payload_hash BYTEA NOT NULL,
    hmac_signature BYTEA NOT NULL,
    crypto_key_version SMALLINT NOT NULL DEFAULT 1,
    hmac_valid BOOLEAN,
    status VARCHAR(30) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- 3. Tablas de Contenido Educativo

CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,
    color VARCHAR NOT NULL,
    created_by_admin_id UUID,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

CREATE TABLE levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL,
    title VARCHAR(160) NOT NULL,
    color VARCHAR(30) NOT NULL,
    template_type VARCHAR(40) NOT NULL,
    content JSONB NOT NULL,
    difficulty INTEGER NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_admin_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

-- 4. Tablas de Progreso y Rendición de Cuentas

CREATE TABLE player_progress (
    user_id UUID NOT NULL,
    level_id UUID NOT NULL,
    best_score INTEGER NOT NULL DEFAULT 0,
    xp_total_for_level INTEGER NOT NULL DEFAULT 0,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    first_completed_at TIMESTAMPTZ,
    last_completed_at TIMESTAMPTZ
);

CREATE TABLE level_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    level_id UUID NOT NULL,
    attempt_date DATE NOT NULL,
    attempt_number INTEGER NOT NULL,
    xp_awarded INTEGER NOT NULL,
    completed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_streak (
    user_id UUID NOT NULL,
    activity_date DATE NOT NULL
);

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    xp_threshold INTEGER NOT NULL,
    icon_key VARCHAR(80) NOT NULL
);

CREATE TABLE user_badges (
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bitácoras de Auditoría y Cumplimiento Normativo

CREATE TABLE arco_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    requester_type VARCHAR(30) NOT NULL,
    request_type VARCHAR(30) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL,
    handled_by UUID,
    response_summary TEXT,
    evidence_hash BYTEA NOT NULL
);

CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detected_at TIMESTAMPTZ NOT NULL,
    reported_at TIMESTAMPTZ,
    severity VARCHAR(20) NOT NULL,
    affected_scope TEXT NOT NULL,
    description TEXT NOT NULL,
    containment_actions TEXT NOT NULL,
    resolved_at TIMESTAMPTZ,
    reported_to_cutai BOOLEAN NOT NULL DEFAULT FALSE,
    notified_to_cutai_at TIMESTAMPTZ,
    notified_to_subjects_at TIMESTAMPTZ,
    evidence_hash BYTEA NOT NULL
);

CREATE TABLE experience_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    level_id UUID NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    xp_gained INTEGER NOT NULL,
    source VARCHAR(40) NOT NULL,
    verification_method VARCHAR(30) NOT NULL,
    sync_event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- =        Llaves Foráneas (Foreign Keys)  =
-- ==========================================

-- ARCO Reglas:
-- Datos funcionales -> ON DELETE CASCADE
-- Registros legales/documentales -> ON DELETE SET NULL

ALTER TABLE devices ADD CONSTRAINT uq_devices_id_user UNIQUE (id, user_id);

ALTER TABLE tutor_consents ADD CONSTRAINT fk_tutor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE devices ADD CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sync_events ADD CONSTRAINT fk_sync_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sync_events ADD CONSTRAINT fk_sync_device_user FOREIGN KEY (device_id, user_id) REFERENCES devices(id, user_id) ON DELETE CASCADE;

ALTER TABLE sections ADD CONSTRAINT fk_section_creator FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE levels ADD CONSTRAINT fk_level_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
ALTER TABLE levels ADD CONSTRAINT fk_level_deleter FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE levels ADD CONSTRAINT fk_level_creator FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE player_progress ADD CONSTRAINT fk_prog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE player_progress ADD CONSTRAINT fk_prog_level FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT;

ALTER TABLE level_attempts ADD CONSTRAINT fk_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE level_attempts ADD CONSTRAINT fk_attempt_level FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT;

ALTER TABLE daily_streak ADD CONSTRAINT fk_streak_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_badges ADD CONSTRAINT fk_ub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_badges ADD CONSTRAINT fk_ub_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE RESTRICT;

-- Auditoría Legal (ON DELETE SET NULL para pseudonimización)
ALTER TABLE arco_requests ADD CONSTRAINT fk_arco_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE arco_requests ADD CONSTRAINT fk_arco_handler FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE experience_history ADD CONSTRAINT fk_hist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE experience_history ADD CONSTRAINT fk_hist_level FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE RESTRICT;
ALTER TABLE experience_history ADD CONSTRAINT fk_hist_sync FOREIGN KEY (sync_event_id) REFERENCES sync_events(id) ON DELETE SET NULL;

ALTER TABLE admin_audit_log ADD CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ==========================================
-- = Otras Restricciones (Check, Unique)    =
-- ==========================================

-- Tablas de progreso (Primary Keys Compuestas y Unique)
ALTER TABLE player_progress ADD CONSTRAINT pk_player_progress PRIMARY KEY (user_id, level_id);
ALTER TABLE daily_streak ADD CONSTRAINT pk_daily_streak PRIMARY KEY (user_id, activity_date);
ALTER TABLE user_badges ADD CONSTRAINT pk_user_badges PRIMARY KEY (user_id, badge_id);
ALTER TABLE level_attempts ADD CONSTRAINT uq_level_attempts UNIQUE (user_id, level_id, attempt_date, attempt_number);

-- Constraints de dominio (CHECKs)
ALTER TABLE users ADD CONSTRAINT chk_user_token_version CHECK (token_version >= 1);
ALTER TABLE users ADD CONSTRAINT chk_user_role CHECK (role IN ('player', 'admin', 'operator', 'director'));
ALTER TABLE users ADD CONSTRAINT chk_user_status CHECK (status IN ('active', 'suspended', 'pending_tutor_consent', 'deleted'));
ALTER TABLE users ADD CONSTRAINT chk_deleted_status_consistency CHECK ((status = 'deleted' AND deleted_at IS NOT NULL) OR (status <> 'deleted' AND deleted_at IS NULL));
ALTER TABLE users ADD CONSTRAINT chk_deleted_reason_consistency CHECK ((status = 'deleted' AND deletion_reason IS NOT NULL) OR (status <> 'deleted'));
ALTER TABLE devices ADD CONSTRAINT chk_device_platform CHECK (platform IN ('web', 'tauri'));
ALTER TABLE sync_events ADD CONSTRAINT chk_sync_status CHECK (status IN ('pending', 'processed', 'rejected'));
ALTER TABLE sync_events ADD CONSTRAINT chk_sync_hmac_processed CHECK ((status = 'pending' AND hmac_valid IS NULL) OR (status IN ('processed', 'rejected') AND hmac_valid IS NOT NULL));
ALTER TABLE sync_events ADD CONSTRAINT chk_sync_processed_at CHECK ((status = 'pending' AND processed_at IS NULL) OR (status IN ('processed', 'rejected') AND processed_at IS NOT NULL));
ALTER TABLE sync_events ADD CONSTRAINT chk_sync_rejection_reason CHECK ((status = 'rejected' AND rejection_reason IS NOT NULL) OR (status <> 'rejected'));
ALTER TABLE levels ADD CONSTRAINT chk_level_diff CHECK (difficulty BETWEEN 1 AND 10);
ALTER TABLE levels ADD CONSTRAINT chk_level_template CHECK (template_type IN ('trivia', 'puzzle', 'word_search', 'fake_news', 'crossword', 'memory', 'snakes_ladders'));
ALTER TABLE player_progress ADD CONSTRAINT chk_progress_nonnegative CHECK (best_score >= 0 AND xp_total_for_level >= 0 AND attempts_count >= 0);
ALTER TABLE level_attempts ADD CONSTRAINT chk_attempts_valid CHECK (attempt_number >= 1 AND xp_awarded >= 0);
ALTER TABLE experience_history ADD CONSTRAINT chk_history_xp_nonnegative CHECK (xp_gained >= 0);
ALTER TABLE experience_history ADD CONSTRAINT chk_history_source CHECK (source IN ('online', 'offline_sync'));
ALTER TABLE experience_history ADD CONSTRAINT chk_history_event_type CHECK (event_type IN ('level_completed', 'level_retried', 'badge_earned', 'xp_adjustment', 'sync_rejected'));
ALTER TABLE experience_history ADD CONSTRAINT chk_history_verification CHECK (verification_method IN ('online_direct', 'hmac_offline'));
ALTER TABLE experience_history ADD CONSTRAINT chk_history_source_verification CHECK ((source = 'online' AND verification_method = 'online_direct') OR (source = 'offline_sync' AND verification_method = 'hmac_offline'));
ALTER TABLE badges ADD CONSTRAINT chk_badges_xp_nonnegative CHECK (xp_threshold >= 0);
ALTER TABLE arco_requests ADD CONSTRAINT chk_arco_requester_type CHECK (requester_type IN ('titular', 'tutor', 'representante'));
ALTER TABLE arco_requests ADD CONSTRAINT chk_arco_type CHECK (request_type IN ('acceso', 'rectificacion', 'cancelacion', 'oposicion'));
ALTER TABLE arco_requests ADD CONSTRAINT chk_arco_status CHECK (status IN ('received', 'in_review', 'resolved', 'rejected'));
ALTER TABLE security_incidents ADD CONSTRAINT chk_incident_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- ==========================================
-- =        Índices de Rendimiento          =
-- ==========================================

CREATE INDEX idx_sync_events_user_status ON sync_events(user_id, status);
CREATE INDEX idx_experience_history_user ON experience_history(user_id);
CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log(actor_user_id);

-- Índices sobre llaves foráneas para evitar escaneos secuenciales en ON DELETE CASCADE/SET NULL
CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_tutor_consents_user ON tutor_consents(user_id);
CREATE INDEX idx_sync_events_device ON sync_events(device_id);
CREATE INDEX idx_levels_section ON levels(section_id);
CREATE INDEX idx_level_attempts_level ON level_attempts(level_id);
CREATE INDEX idx_experience_history_level ON experience_history(level_id);
CREATE INDEX idx_arco_requests_user ON arco_requests(user_id);

-- Índices parciales únicos para correos y teléfonos (ARCO reusability)
CREATE UNIQUE INDEX users_email_lookup_active_idx ON users(email_lookup_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_phone_lookup_active_idx ON users(phone_lookup_hash) WHERE phone_lookup_hash IS NOT NULL AND deleted_at IS NULL;

-- ==========================================
-- =        Triggers Automáticos            =
-- ==========================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_levels_updated_at
BEFORE UPDATE ON levels
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Las bitácoras son append-only. La única actualización permitida es
-- la pseudonimización automática del usuario por ON DELETE SET NULL.
CREATE OR REPLACE FUNCTION protect_append_only_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    old_row JSONB;
    new_row JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'audit table % is append-only', TG_TABLE_NAME;
    END IF;

    old_row := to_jsonb(OLD);
    new_row := to_jsonb(NEW);

    IF TG_TABLE_NAME = 'experience_history'
       AND old_row->>'user_id' IS NOT NULL
       AND new_row->>'user_id' IS NULL
       AND (new_row - 'user_id') = (old_row - 'user_id') THEN
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'admin_audit_log'
       AND old_row->>'actor_user_id' IS NOT NULL
       AND new_row->>'actor_user_id' IS NULL
       AND (new_row - 'actor_user_id') = (old_row - 'actor_user_id') THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'audit table % is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_experience_history_append_only
BEFORE UPDATE OR DELETE ON experience_history
FOR EACH ROW
EXECUTE FUNCTION protect_append_only_audit_log();

CREATE TRIGGER trg_admin_audit_log_append_only
BEFORE UPDATE OR DELETE ON admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION protect_append_only_audit_log();
