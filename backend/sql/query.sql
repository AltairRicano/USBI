-- name: GetUserByEmailHash :one
SELECT id, full_name, pgp_sym_decrypt(email::bytea, sqlc.arg('encryption_key')::text) as email, email_lookup_hash, phone, phone_lookup_hash, password_hash, token_version, is_adult, role, privacy_notice_version, privacy_notice_accepted_at, privacy_acceptance_hash, crypto_key_version, status, age_up_attempts, created_at, updated_at, last_login_at, deleted_at, deletion_reason 
FROM users
WHERE email_lookup_hash = $1 AND deleted_at IS NULL;

-- name: CreateUser :one
INSERT INTO users (
    id, full_name, email, email_lookup_hash, password_hash, token_version, is_adult, role, privacy_notice_version, privacy_notice_accepted_at, privacy_acceptance_hash, crypto_key_version, status
) VALUES (
    $1, $2, pgp_sym_encrypt($3::text, sqlc.arg('encryption_key')::text), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING *;

-- name: LogAdminAudit :exec
INSERT INTO admin_audit_log (
    id, actor_user_id, action, entity_type, entity_id, before_state, after_state, ip_address, user_agent
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
);

-- name: UpsertPlayerProgress :exec
INSERT INTO player_progress (
    user_id, level_id, best_score, xp_total_for_level, attempts_count, first_completed_at, last_completed_at
) VALUES (
    $1, $2, $3, $4, $5, NOW(), NOW()
) ON CONFLICT (user_id, level_id) DO UPDATE SET
    best_score = GREATEST(player_progress.best_score, EXCLUDED.best_score),
    xp_total_for_level = player_progress.xp_total_for_level + EXCLUDED.xp_total_for_level,
    attempts_count = player_progress.attempts_count + 1,
    last_completed_at = NOW();

-- name: GetLevelAttemptsByDate :one
SELECT COUNT(*) as attempt_number 
FROM level_attempts 
WHERE user_id = $1 AND level_id = $2 AND attempt_date = $3
FOR UPDATE;

-- name: InsertLevelAttempt :exec
INSERT INTO level_attempts (
    id, user_id, level_id, attempt_date, attempt_number, xp_awarded, completed
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
);

-- name: UpsertDailyStreak :exec
INSERT INTO daily_streak (
    user_id, activity_date
) VALUES (
    $1, $2
) ON CONFLICT (user_id, activity_date) DO NOTHING;

-- name: InsertExperienceHistory :exec
INSERT INTO experience_history (
    id, user_id, level_id, event_type, xp_gained, source, verification_method, sync_event_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
);

-- name: InsertSyncEvent :exec
INSERT INTO sync_events (
    id, device_id, user_id, payload_hash, hmac_signature, crypto_key_version, hmac_valid, status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
);

-- name: UpdateSyncEventStatus :exec
UPDATE sync_events SET status = $2, processed_at = NOW() WHERE id = $1;

-- name: GetUserTokenVersion :one
SELECT token_version FROM users WHERE id = $1 AND deleted_at IS NULL;

-- name: IncrementTokenVersion :exec
UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1;

-- name: IncrementAgeUpAttempts :one
UPDATE users SET age_up_attempts = age_up_attempts + 1, updated_at = NOW() WHERE id = $1 RETURNING age_up_attempts;

-- name: UpdateUserAdultStatus :exec
UPDATE users SET is_adult = true, status = 'active', updated_at = NOW() WHERE id = $1;

-- name: InsertArcoRequest :exec
INSERT INTO arco_requests (
    id, user_id, requester_type, request_type, status, evidence_hash
) VALUES (
    $1, $2, $3, $4, $5, $6
);
