// Package privacy holds the single, canonical "definitive cancellation" routine
// shared by BOTH the automatic legal-maintenance job and an approved ARCO
// cancelación, so the two paths can never drift apart (audit finding A4).
package privacy

import (
	"context"
	"fmt"

	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/repository"
	"github.com/google/uuid"
)

// CancelParams carries the identifiers and secrets needed for cancellation.
type CancelParams struct {
	UserID           uuid.UUID
	Reason           string
	EncryptionKey    string
	BlindIndexSecret []byte
}

// CancelUser performs a definitive account cancellation within the caller's
// transaction. It:
//
//  1. pseudonymizes the tutor consents and the user's PII (email/phone/name),
//     marking the account deleted and rotating token_version;
//  2. NULLs the user in the append-only ledgers (experience_history,
//     admin_audit_log) — preserving No-Repudio evidence, never destroying it;
//  3. purges non-ledger personal progress data (player_progress, level_attempts,
//     daily_streak, user_badges) for data minimization — this is what the
//     schema's ON DELETE CASCADE was meant to achieve, but never did because the
//     users row is pseudonymized rather than physically deleted. sync_events is
//     deliberately NOT purged: deleting it would cascade an ON DELETE SET NULL
//     onto experience_history.sync_event_id, which the append-only trigger
//     rejects (it only permits the user_id -> NULL pseudonymization), aborting
//     the whole transaction. sync_events holds only technical, non-PII progress.
//  4. marks the user's devices for local wipe and revokes refresh tokens.
//
// qtx MUST be a transactional *repository.Queries (from WithTx).
func CancelUser(ctx context.Context, qtx *repository.Queries, p CancelParams) error {
	pseudonymEmail := "deleted-" + p.UserID.String() + "@pseudonymized.usbi.invalid"
	emailHash := crypto.BlindIndexHMAC(pseudonymEmail, p.BlindIndexSecret)

	if err := qtx.PseudonymizeTutorConsents(ctx, repository.PseudonymizeTutorConsentsParams{
		UserID:        p.UserID,
		EncryptionKey: p.EncryptionKey,
	}); err != nil {
		return fmt.Errorf("pseudonymizing tutor consents: %w", err)
	}
	if err := qtx.PseudonymizeUser(ctx, repository.PseudonymizeUserParams{
		UserID:          p.UserID,
		PseudonymEmail:  pseudonymEmail,
		EmailLookupHash: emailHash,
		EncryptionKey:   p.EncryptionKey,
		DeletionReason:  p.Reason,
	}); err != nil {
		return fmt.Errorf("pseudonymizing user: %w", err)
	}
	if err := qtx.NullUserInPseudonymizableLedgers(ctx, p.UserID); err != nil {
		return fmt.Errorf("pseudonymizing ledgers: %w", err)
	}
	if err := qtx.PurgeUserProgressData(ctx, p.UserID); err != nil {
		return fmt.Errorf("purging progress data: %w", err)
	}
	if err := qtx.MarkUserDevicesForWipe(ctx, p.UserID); err != nil {
		return fmt.Errorf("marking devices for wipe: %w", err)
	}
	if err := qtx.RevokeRefreshTokensForUser(ctx, p.UserID); err != nil {
		return fmt.Errorf("revoking refresh tokens: %w", err)
	}
	return nil
}
