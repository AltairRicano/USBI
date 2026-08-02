package maintenance

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/altair/usbi-backend/internal/privacy"
	"github.com/altair/usbi-backend/internal/repository"
	"github.com/google/uuid"
)

type Config struct {
	EncryptionKey        string
	BlindIndexSecret     []byte
	PendingTutorTTL      time.Duration
	InactiveSuspendAfter time.Duration
	SuspendedCancelAfter time.Duration
	BatchSize            int32
}

type Summary struct {
	PendingTutorPurged  int
	InactiveSuspended   int64
	SuspendedCancelled  int
	TutorTokensPurged   int64
	RefreshTokensPurged int64
}

type Service struct {
	queries *repository.Queries
	cfg     Config
}

func NewService(queries *repository.Queries, cfg Config) *Service {
	if cfg.EncryptionKey == "" {
		panic("maintenance.Config: EncryptionKey must not be empty")
	}
	if len(cfg.BlindIndexSecret) == 0 {
		panic("maintenance.Config: BlindIndexSecret must not be empty")
	}
	if cfg.PendingTutorTTL <= 0 {
		cfg.PendingTutorTTL = 48 * time.Hour
	}
	if cfg.InactiveSuspendAfter <= 0 {
		cfg.InactiveSuspendAfter = 365 * 24 * time.Hour
	}
	if cfg.SuspendedCancelAfter <= 0 {
		cfg.SuspendedCancelAfter = 30 * 24 * time.Hour
	}
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 100
	}
	return &Service{queries: queries, cfg: cfg}
}

func (s *Service) RunOnce(ctx context.Context, now time.Time) (Summary, error) {
	now = now.UTC()
	var summary Summary

	pendingIDs, err := s.queries.ListPendingTutorConsentUsers(ctx, now.Add(-s.cfg.PendingTutorTTL), s.cfg.BatchSize)
	if err != nil {
		return summary, fmt.Errorf("listing pending tutor users: %w", err)
	}
	for _, userID := range pendingIDs {
		if err := s.cancelUser(ctx, userID, "pending_tutor_consent_expired"); err != nil {
			return summary, err
		}
		summary.PendingTutorPurged++
	}

	suspended, err := s.queries.SuspendInactivePlayers(ctx, now.Add(-s.cfg.InactiveSuspendAfter))
	if err != nil {
		return summary, fmt.Errorf("suspending inactive players: %w", err)
	}
	summary.InactiveSuspended = suspended

	cancelIDs, err := s.queries.ListSuspendedUsersForCancellation(ctx, now.Add(-s.cfg.SuspendedCancelAfter), s.cfg.BatchSize)
	if err != nil {
		return summary, fmt.Errorf("listing suspended users for cancellation: %w", err)
	}
	for _, userID := range cancelIDs {
		if err := s.cancelUser(ctx, userID, "inactivity_retention_expired"); err != nil {
			return summary, err
		}
		summary.SuspendedCancelled++
	}

	// Housekeeping purges (A8 / A1): drop expired unverified tutor-consent tokens
	// and expired/long-revoked refresh tokens so neither table grows unbounded.
	tutorTokens, err := s.queries.PurgeExpiredTutorConsentTokens(ctx)
	if err != nil {
		return summary, fmt.Errorf("purging expired tutor consent tokens: %w", err)
	}
	summary.TutorTokensPurged = tutorTokens

	refreshTokens, err := s.queries.PurgeExpiredRefreshTokens(ctx)
	if err != nil {
		return summary, fmt.Errorf("purging expired refresh tokens: %w", err)
	}
	summary.RefreshTokensPurged = refreshTokens

	return summary, nil
}

// cancelUser runs the single canonical definitive-cancellation routine shared
// with the ARCO approval path (A4), so an automatic cancellation and an
// admin-approved one always perform exactly the same steps — including NULLing
// the append-only ledgers, which this path previously skipped.
func (s *Service) cancelUser(ctx context.Context, userID uuid.UUID, reason string) error {
	tx, err := s.queries.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.queries.WithTx(tx)

	if err := privacy.CancelUser(ctx, qtx, privacy.CancelParams{
		UserID:           userID,
		Reason:           reason,
		EncryptionKey:    s.cfg.EncryptionKey,
		BlindIndexSecret: s.cfg.BlindIndexSecret,
	}); err != nil {
		return err
	}
	return tx.Commit()
}

func StartScheduler(ctx context.Context, svc *Service, interval time.Duration, logger *log.Logger) {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	if logger == nil {
		logger = log.Default()
	}

	go func() {
		run := func() {
			summary, err := svc.RunOnce(ctx, time.Now())
			if err != nil {
				logger.Printf("[WARN] legal maintenance failed: %v", err)
				return
			}
			if summary.PendingTutorPurged > 0 || summary.InactiveSuspended > 0 || summary.SuspendedCancelled > 0 ||
				summary.TutorTokensPurged > 0 || summary.RefreshTokensPurged > 0 {
				logger.Printf("[INFO] legal maintenance completed: pending_tutor_purged=%d inactive_suspended=%d suspended_cancelled=%d tutor_tokens_purged=%d refresh_tokens_purged=%d",
					summary.PendingTutorPurged, summary.InactiveSuspended, summary.SuspendedCancelled,
					summary.TutorTokensPurged, summary.RefreshTokensPurged)
			}
		}

		run()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				run()
			}
		}
	}()
}
