package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type InsertRefreshTokenParams struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash []byte
	ExpiresAt time.Time
}

func (q *Queries) InsertRefreshToken(ctx context.Context, arg InsertRefreshTokenParams) error {
	_, err := q.db.ExecContext(ctx, `
INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
VALUES ($1, $2, $3, $4)
`, arg.ID, arg.UserID, arg.TokenHash, arg.ExpiresAt)
	return err
}

type RefreshTokenUser struct {
	TokenID      uuid.UUID
	UserID       uuid.UUID
	FullName     string
	IsAdult      bool
	Role         string
	Status       string
	TokenVersion int32
	CreatedAt    time.Time
}

func (q *Queries) GetRefreshTokenUser(ctx context.Context, tokenHash []byte) (RefreshTokenUser, error) {
	var row RefreshTokenUser
	err := q.db.QueryRowContext(ctx, `
SELECT rt.id, u.id, u.full_name, u.is_adult, u.role, u.status, u.token_version, u.created_at
FROM refresh_tokens rt
JOIN users u ON u.id = rt.user_id
WHERE rt.token_hash = $1
  AND rt.revoked_at IS NULL
  AND rt.expires_at > NOW()
  AND u.deleted_at IS NULL
`, tokenHash).Scan(
		&row.TokenID,
		&row.UserID,
		&row.FullName,
		&row.IsAdult,
		&row.Role,
		&row.Status,
		&row.TokenVersion,
		&row.CreatedAt,
	)
	return row, err
}

func (q *Queries) RevokeRefreshToken(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.ExecContext(ctx, `
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE id = $1 AND revoked_at IS NULL
`, id)
	return err
}

func (q *Queries) RevokeRefreshTokensForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := q.db.ExecContext(ctx, `
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL
`, userID)
	return err
}

func IsNoRows(err error) bool {
	return err == sql.ErrNoRows
}
