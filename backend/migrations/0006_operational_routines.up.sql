-- Migration: 0006_operational_routines.up.sql
-- Purpose: database-side transactional routines for progress, ARCO cancellation,
-- and append-only ledger protection.

CREATE OR REPLACE FUNCTION usbi_calculate_xp(
    p_difficulty INTEGER,
    p_attempt_number INTEGER,
    p_completed BOOLEAN
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_base INTEGER;
BEGIN
    IF p_completed IS NOT TRUE OR p_difficulty <= 0 THEN
        RETURN 0;
    END IF;

    v_base := 4 * p_difficulty;

    IF p_attempt_number = 1 THEN
        RETURN v_base;
    ELSIF p_attempt_number <= 3 THEN
        RETURN v_base / 2;
    END IF;

    RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION usbi_current_streak(
    p_user_id UUID,
    p_as_of DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cursor DATE := p_as_of;
    v_count INTEGER := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM daily_streak
        WHERE user_id = p_user_id AND activity_date = v_cursor
    ) THEN
        v_cursor := v_cursor - 1;
        IF NOT EXISTS (
            SELECT 1 FROM daily_streak
            WHERE user_id = p_user_id AND activity_date = v_cursor
        ) THEN
            RETURN 0;
        END IF;
    END IF;

    LOOP
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM daily_streak
            WHERE user_id = p_user_id AND activity_date = v_cursor
        );
        v_count := v_count + 1;
        v_cursor := v_cursor - 1;
    END LOOP;

    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION usbi_complete_level_attempt(
    p_user_id UUID,
    p_level_id UUID,
    p_score INTEGER,
    p_completed BOOLEAN,
    p_client_finished_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    level_id UUID,
    completed BOOLEAN,
    attempt_number INTEGER,
    xp_awarded INTEGER,
    total_xp INTEGER,
    current_streak INTEGER,
    badges_awarded JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_difficulty INTEGER;
    v_attempt_date DATE := (COALESCE(p_client_finished_at, NOW()) AT TIME ZONE 'UTC')::date;
    v_attempt_number INTEGER;
    v_xp_awarded INTEGER;
    v_total_xp INTEGER;
    v_current_streak INTEGER;
    v_badges_awarded JSONB := '[]'::jsonb;
    v_event_type TEXT;
BEGIN
    IF p_user_id IS NULL OR p_level_id IS NULL OR p_score IS NULL OR p_score < 0 OR p_completed IS NULL THEN
        RAISE EXCEPTION 'validation error' USING ERRCODE = '22023';
    END IF;

    SELECT l.difficulty
    INTO v_difficulty
    FROM levels l
    WHERE l.id = p_level_id
      AND l.is_published = TRUE
      AND l.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'level not found or unpublished' USING ERRCODE = 'P0002';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_level_id::text || ':' || v_attempt_date::text));

    SELECT COUNT(*)::integer + 1
    INTO v_attempt_number
    FROM level_attempts
    WHERE user_id = p_user_id
      AND level_id = p_level_id
      AND attempt_date = v_attempt_date;

    v_xp_awarded := usbi_calculate_xp(v_difficulty, v_attempt_number, p_completed);

    INSERT INTO level_attempts (
        id, user_id, level_id, attempt_date, attempt_number, xp_awarded, completed
    ) VALUES (
        gen_random_uuid(), p_user_id, p_level_id, v_attempt_date,
        v_attempt_number, v_xp_awarded, p_completed
    );

    INSERT INTO player_progress (
        user_id, level_id, best_score, xp_total_for_level, attempts_count,
        first_completed_at, last_completed_at
    ) VALUES (
        p_user_id,
        p_level_id,
        p_score,
        v_xp_awarded,
        1,
        CASE WHEN p_completed THEN NOW() ELSE NULL END,
        CASE WHEN p_completed THEN NOW() ELSE NULL END
    ) ON CONFLICT (user_id, level_id) DO UPDATE SET
        best_score = GREATEST(player_progress.best_score, EXCLUDED.best_score),
        xp_total_for_level = player_progress.xp_total_for_level + EXCLUDED.xp_total_for_level,
        attempts_count = player_progress.attempts_count + 1,
        first_completed_at = CASE
            WHEN p_completed AND player_progress.first_completed_at IS NULL THEN NOW()
            ELSE player_progress.first_completed_at
        END,
        last_completed_at = CASE
            WHEN p_completed THEN NOW()
            ELSE player_progress.last_completed_at
        END;

    IF p_completed THEN
        INSERT INTO daily_streak (user_id, activity_date)
        VALUES (p_user_id, v_attempt_date)
        ON CONFLICT (user_id, activity_date) DO NOTHING;
    END IF;

    v_event_type := CASE WHEN p_completed THEN 'level_completed' ELSE 'level_failed' END;
    INSERT INTO experience_history (
        id, user_id, level_id, event_type, xp_gained, source, verification_method, sync_event_id
    ) VALUES (
        gen_random_uuid(), p_user_id, p_level_id, v_event_type, v_xp_awarded,
        'online', 'online_direct', NULL
    );

    SELECT COALESCE(SUM(xp_gained)::integer, 0)
    INTO v_total_xp
    FROM experience_history
    WHERE user_id = p_user_id;

    WITH awarded AS (
        INSERT INTO user_badges (user_id, badge_id)
        SELECT p_user_id, b.id
        FROM badges b
        WHERE b.xp_threshold <= v_total_xp
        ON CONFLICT (user_id, badge_id) DO NOTHING
        RETURNING badge_id, earned_at
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'xp_threshold', b.xp_threshold,
        'icon_key', b.icon_key,
        'earned_at', awarded.earned_at
    ) ORDER BY b.xp_threshold ASC), '[]'::jsonb)
    INTO v_badges_awarded
    FROM awarded
    JOIN badges b ON b.id = awarded.badge_id;

    v_current_streak := usbi_current_streak(p_user_id, (NOW() AT TIME ZONE 'UTC')::date);

    RETURN QUERY SELECT
        p_level_id,
        p_completed,
        v_attempt_number,
        v_xp_awarded,
        v_total_xp,
        v_current_streak,
        v_badges_awarded;
END;
$$;

CREATE OR REPLACE FUNCTION usbi_apply_verified_sync_attempt(
    p_sync_event_id UUID,
    p_user_id UUID,
    p_level_id UUID,
    p_attempt_date DATE,
    p_completed BOOLEAN
) RETURNS TABLE (
    attempt_number INTEGER,
    xp_awarded INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_difficulty INTEGER;
    v_attempt_number INTEGER;
    v_xp_awarded INTEGER;
    v_event_type TEXT;
BEGIN
    IF p_sync_event_id IS NULL OR p_user_id IS NULL OR p_level_id IS NULL OR p_attempt_date IS NULL OR p_completed IS NULL THEN
        RAISE EXCEPTION 'validation error' USING ERRCODE = '22023';
    END IF;

    SELECT l.difficulty
    INTO v_difficulty
    FROM levels l
    WHERE l.id = p_level_id
      AND l.is_published = TRUE
      AND l.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'level not found or unpublished' USING ERRCODE = 'P0002';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_level_id::text || ':' || p_attempt_date::text));

    SELECT COUNT(*)::integer + 1
    INTO v_attempt_number
    FROM level_attempts
    WHERE user_id = p_user_id
      AND level_id = p_level_id
      AND attempt_date = p_attempt_date;

    v_xp_awarded := usbi_calculate_xp(v_difficulty, v_attempt_number, p_completed);

    INSERT INTO level_attempts (
        id, user_id, level_id, attempt_date, attempt_number, xp_awarded, completed
    ) VALUES (
        gen_random_uuid(), p_user_id, p_level_id, p_attempt_date,
        v_attempt_number, v_xp_awarded, p_completed
    );

    INSERT INTO player_progress (
        user_id, level_id, best_score, xp_total_for_level, attempts_count,
        first_completed_at, last_completed_at
    ) VALUES (
        p_user_id,
        p_level_id,
        v_xp_awarded,
        v_xp_awarded,
        1,
        CASE WHEN p_completed THEN NOW() ELSE NULL END,
        CASE WHEN p_completed THEN NOW() ELSE NULL END
    ) ON CONFLICT (user_id, level_id) DO UPDATE SET
        best_score = GREATEST(player_progress.best_score, EXCLUDED.best_score),
        xp_total_for_level = player_progress.xp_total_for_level + EXCLUDED.xp_total_for_level,
        attempts_count = player_progress.attempts_count + 1,
        first_completed_at = CASE
            WHEN p_completed AND player_progress.first_completed_at IS NULL THEN NOW()
            ELSE player_progress.first_completed_at
        END,
        last_completed_at = CASE
            WHEN p_completed THEN NOW()
            ELSE player_progress.last_completed_at
        END;

    v_event_type := CASE WHEN p_completed THEN 'sync_level_completed' ELSE 'sync_failed_attempt' END;
    INSERT INTO experience_history (
        id, user_id, level_id, event_type, xp_gained, source, verification_method, sync_event_id
    ) VALUES (
        gen_random_uuid(), p_user_id, p_level_id, v_event_type, v_xp_awarded,
        'offline_sync', 'hmac_offline', p_sync_event_id
    );

    RETURN QUERY SELECT v_attempt_number, v_xp_awarded;
END;
$$;

CREATE OR REPLACE FUNCTION usbi_resolve_arco_cancellation(
    p_request_id UUID,
    p_actor_id UUID,
    p_response_summary TEXT,
    p_pseudonym_email TEXT,
    p_email_lookup_hash BYTEA,
    p_encryption_key TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id
    INTO v_user_id
    FROM arco_requests
    WHERE id = p_request_id
      AND request_type = 'cancelacion'
      AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'pending cancellation request not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_user_id IS NOT NULL THEN
        UPDATE tutor_consents
        SET tutor_name = pgp_sym_encrypt('Tutor pseudonimizado'::text, p_encryption_key),
            tutor_email = pgp_sym_encrypt('tutor-pseudonimizado@example.invalid'::text, p_encryption_key),
            revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = v_user_id;

        UPDATE users
        SET full_name = 'Usuario pseudonimizado',
            email = pgp_sym_encrypt(p_pseudonym_email::text, p_encryption_key),
            email_lookup_hash = p_email_lookup_hash,
            phone = NULL,
            phone_lookup_hash = NULL,
            status = 'deleted',
            deleted_at = COALESCE(deleted_at, NOW()),
            deletion_reason = 'arco_cancelacion',
            token_version = token_version + 1,
            updated_at = NOW()
        WHERE id = v_user_id
          AND deleted_at IS NULL;

        UPDATE devices
        SET wipe_local_data = TRUE
        WHERE user_id = v_user_id
          AND revoked_at IS NULL;

        UPDATE refresh_tokens
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = v_user_id
          AND revoked_at IS NULL;

        UPDATE experience_history
        SET user_id = NULL
        WHERE user_id = v_user_id;

        UPDATE admin_audit_log
        SET actor_user_id = NULL
        WHERE actor_user_id = v_user_id;
    END IF;

    UPDATE arco_requests
    SET status = 'resolved',
        resolved_at = NOW(),
        handled_by = p_actor_id,
        response_summary = p_response_summary
    WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION usbi_enforce_append_only_ledgers()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
    END IF;

    IF TG_TABLE_NAME = 'experience_history' THEN
        IF OLD.user_id IS NOT NULL
           AND NEW.user_id IS NULL
           AND NEW.id IS NOT DISTINCT FROM OLD.id
           AND NEW.level_id IS NOT DISTINCT FROM OLD.level_id
           AND NEW.event_type IS NOT DISTINCT FROM OLD.event_type
           AND NEW.xp_gained IS NOT DISTINCT FROM OLD.xp_gained
           AND NEW.source IS NOT DISTINCT FROM OLD.source
           AND NEW.verification_method IS NOT DISTINCT FROM OLD.verification_method
           AND NEW.sync_event_id IS NOT DISTINCT FROM OLD.sync_event_id
           AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
            RETURN NEW;
        END IF;
    ELSIF TG_TABLE_NAME = 'admin_audit_log' THEN
        IF OLD.actor_user_id IS NOT NULL
           AND NEW.actor_user_id IS NULL
           AND NEW.id IS NOT DISTINCT FROM OLD.id
           AND NEW.action IS NOT DISTINCT FROM OLD.action
           AND NEW.entity_type IS NOT DISTINCT FROM OLD.entity_type
           AND NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id
           AND NEW.before_state IS NOT DISTINCT FROM OLD.before_state
           AND NEW.after_state IS NOT DISTINCT FROM OLD.after_state
           AND NEW.ip_address IS NOT DISTINCT FROM OLD.ip_address
           AND NEW.user_agent IS NOT DISTINCT FROM OLD.user_agent
           AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION '% is append-only; only user pseudonymization SET NULL is allowed', TG_TABLE_NAME
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS experience_history_append_only_trg ON experience_history;
CREATE TRIGGER experience_history_append_only_trg
BEFORE UPDATE OR DELETE ON experience_history
FOR EACH ROW EXECUTE FUNCTION usbi_enforce_append_only_ledgers();

DROP TRIGGER IF EXISTS admin_audit_log_append_only_trg ON admin_audit_log;
CREATE TRIGGER admin_audit_log_append_only_trg
BEFORE UPDATE OR DELETE ON admin_audit_log
FOR EACH ROW EXECUTE FUNCTION usbi_enforce_append_only_ledgers();
