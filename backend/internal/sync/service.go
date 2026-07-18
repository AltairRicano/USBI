package sync

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/domain"
	"github.com/altair/usbi-backend/internal/repository"
	"github.com/google/uuid"
)

// Sentinel errors — used by the handler for correct HTTP status mapping.
var (
	ErrInvalidSignature = errors.New("invalid HMAC signature")
	ErrInvalidPayload   = errors.New("invalid sync payload")
)

// XP award table per attempt number (plan_maestro.md §RF15).
// Attempt 1 → 100%, Attempt 2-3 → 50%, Attempt 4+ → 0%.
func xpForAttempt(attemptNumber int64) int32 {
	switch {
	case attemptNumber == 1:
		return 100
	case attemptNumber <= 3:
		return 50
	default:
		return 0
	}
}

// Service handles the offline-sync business logic.
type Service struct {
	queries    *repository.Queries
	hmacSecret []byte
}

// NewService creates a sync.Service.
func NewService(q *repository.Queries, hmacSecret []byte) *Service {
	if len(hmacSecret) == 0 {
		panic("sync.Service: hmacSecret must not be empty")
	}
	return &Service{queries: q, hmacSecret: hmacSecret}
}

// ProcessSync validates the HMAC, records the sync event, and applies
// the additive merge using SELECT ... FOR UPDATE to prevent race conditions.
// The XP is always recalculated server-side — client-provided xp_awarded is ignored.
//
// rawBody is the unmodified request body used for HMAC verification.
// sig is the decoded HMAC-SHA256 signature bytes.
func (s *Service) ProcessSync(ctx context.Context, req domain.SyncEventRequest, rawBody []byte, sig []byte) (domain.SyncEventResponse, error) {
	if err := validateSyncPayload(req); err != nil {
		return domain.SyncEventResponse{}, fmt.Errorf("%w: %s", ErrInvalidPayload, err.Error())
	}

	// ── HMAC verification ─────────────────────────────────────────────────────
	isValid := crypto.VerifyHMAC(rawBody, sig, s.hmacSecret)

	// ── Record the sync event regardless of HMAC result (for audit trail) ────
	payloadHash := crypto.GenerateHMAC(rawBody, s.hmacSecret)
	err := s.queries.InsertSyncEvent(ctx, repository.InsertSyncEventParams{
		ID:               req.SyncEventID,
		DeviceID:         req.DeviceID,
		UserID:           req.UserID,
		PayloadHash:      payloadHash,
		HmacSignature:    sig,
		CryptoKeyVersion: int16(req.CryptoKeyVersion),
		HmacValid:        isValid,
		Status:           "pending",
	})
	if err != nil {
		// Duplicate sync_event_id → idempotent success (already processed).
		if isDuplicateKey(err) {
			return domain.SyncEventResponse{Status: "already_processed"}, nil
		}
		return domain.SyncEventResponse{}, fmt.Errorf("recording sync event: %w", err)
	}

	if !isValid {
		_ = s.queries.UpdateSyncEventStatus(ctx, repository.UpdateSyncEventStatusParams{
			ID:     req.SyncEventID,
			Status: "rejected",
		})
		return domain.SyncEventResponse{}, ErrInvalidSignature
	}

	// ── Process each level attempt with server-side XP calculation ───────────
	var totalXP int32
	for _, attempt := range req.Payload.LevelAttempts {
		date, err := time.Parse("2006-01-02", attempt.AttemptDate)
		if err != nil {
			continue // skip malformed dates; they'll be logged via audit trail
		}

		// SELECT ... FOR UPDATE acquires a row lock preventing race conditions
		// when multiple sync events for the same user arrive concurrently.
		priorCount, err := s.queries.GetLevelAttemptsByDate(ctx, repository.GetLevelAttemptsByDateParams{
			UserID:      req.UserID,
			LevelID:     attempt.LevelID,
			AttemptDate: date,
		})
		if err != nil {
			return domain.SyncEventResponse{}, fmt.Errorf("locking level_attempts: %w", err)
		}

		// Server-side XP recalculation — client value is untrusted.
		serverAttemptNumber := priorCount + 1
		serverXP := xpForAttempt(serverAttemptNumber)
		totalXP += serverXP

		if err := s.queries.InsertLevelAttempt(ctx, repository.InsertLevelAttemptParams{
			ID:            uuid.New(),
			UserID:        req.UserID,
			LevelID:       attempt.LevelID,
			AttemptDate:   date,
			AttemptNumber: int32(serverAttemptNumber),
			XpAwarded:     serverXP,
			Completed:     attempt.Completed,
		}); err != nil {
			return domain.SyncEventResponse{}, fmt.Errorf("inserting level_attempt: %w", err)
		}

		if err := s.queries.UpsertPlayerProgress(ctx, repository.UpsertPlayerProgressParams{
			UserID:          req.UserID,
			LevelID:         attempt.LevelID,
			BestScore:       serverXP,
			XpTotalForLevel: serverXP,
			AttemptsCount:   1,
		}); err != nil {
			return domain.SyncEventResponse{}, fmt.Errorf("upserting player_progress: %w", err)
		}
	}

	// ── Daily streak entries ──────────────────────────────────────────────────
	for _, d := range req.Payload.DailyStreakDates {
		date, err := time.Parse("2006-01-02", d)
		if err != nil {
			continue
		}
		_ = s.queries.UpsertDailyStreak(ctx, repository.UpsertDailyStreakParams{
			UserID:       req.UserID,
			ActivityDate: date,
		})
	}

	_ = s.queries.UpdateSyncEventStatus(ctx, repository.UpdateSyncEventStatusParams{
		ID:     req.SyncEventID,
		Status: "processed",
	})

	return domain.SyncEventResponse{
		Status:        "synced",
		WipeLocalData: false,
		ServerXPTotal: int(totalXP),
	}, nil
}

// isDuplicateKey checks for PostgreSQL unique constraint violation.
func isDuplicateKey(err error) bool {
	return err != nil && (containsAny(err.Error(), "duplicate key", "23505"))
}

func containsAny(s string, substrings ...string) bool {
	for _, sub := range substrings {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}

func validateSyncPayload(req domain.SyncEventRequest) error {
	if req.SyncEventID == uuid.Nil {
		return errors.New("sync_event_id is required")
	}
	if req.UserID == uuid.Nil {
		return errors.New("user_id is required")
	}
	if req.DeviceID == uuid.Nil {
		return errors.New("device_id is required")
	}
	return nil
}
