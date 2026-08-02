package maintenance

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/levels"
	"github.com/altair/usbi-backend/internal/repository"
	"github.com/altair/usbi-backend/internal/testdb"
	"github.com/google/uuid"
)

// Integration coverage for the automatic cancellation path (audit finding
// B9 / A4) against a real Postgres schema. Before A4's fix, this path (unlike
// the ARCO-approval path) never NULLed the append-only ledgers — this test
// exists specifically to catch that regression if it ever comes back.

func TestRunOnceCancelsExpiredPendingTutorUser(t *testing.T) {
	ctx := context.Background()
	q, db := testdb.Setup(t)

	encryptionKey := "integration-test-pgp-key-32-bytes-min!!"
	blindIndexSecret := []byte("integration-test-blind-index-32-bytes!!")

	authSvc := auth.NewService(q, auth.Config{
		EncryptionKey:    encryptionKey,
		BlindIndexSecret: blindIndexSecret,
		HMACSecret:       []byte("integration-test-hmac-secret-32-bytes!!"),
		TokenConfig:      crypto.TokenConfig{Secret: []byte("integration-test-jwt-secret-32-bytes!!!"), AccessExpiry: time.Hour},
	})
	levelsSvc := levels.NewService(q)

	// An adult "creator" so we have a valid, published level to attach
	// ledger/progress fixture rows to.
	creator, err := authSvc.Register(ctx, auth.RegisterRequest{
		FullName: "IT Creator", Email: "maint-it-creator-" + uuid.NewString() + "@example.test",
		Password: "correct horse battery staple", IsAdult: true, PrivacyNoticeVersion: "v1.0",
	})
	if err != nil {
		t.Fatalf("Register(creator) error = %v", err)
	}
	section, err := levelsSvc.CreateSection(ctx, creator.UserID, levels.CreateSectionRequest{Title: "IT", Description: "it", Color: "#18529D"})
	if err != nil {
		t.Fatalf("CreateSection() error = %v", err)
	}
	content, _ := json.Marshal(map[string]any{"questions": []map[string]any{{"question": "q", "options": []string{"a", "b"}, "correct_index": 0}}})
	level, err := levelsSvc.CreateLevel(ctx, creator.UserID, levels.CreateLevelRequest{
		SectionID: section.ID, Title: "IT Level", Color: "#18529D", TemplateType: "trivia", Content: content, Difficulty: 3,
	})
	if err != nil {
		t.Fatalf("CreateLevel() error = %v", err)
	}

	// The minor whose pending-tutor-consent window will expire.
	minor, err := authSvc.Register(ctx, auth.RegisterRequest{
		FullName: "IT Minor", Email: "maint-it-minor-" + uuid.NewString() + "@example.test",
		Password: "correct horse battery staple", IsAdult: false, PrivacyNoticeVersion: "v1.0",
	})
	if err != nil {
		t.Fatalf("Register(minor) error = %v", err)
	}

	// Fixture rows proving A4's fix: an append-only ledger entry that must be
	// NULLed (not deleted) and progress data that must be purged.
	historyID := uuid.New()
	if err := q.InsertExperienceHistory(ctx, repository.InsertExperienceHistoryParams{
		ID: historyID, UserID: uuid.NullUUID{UUID: minor.UserID, Valid: true}, LevelID: level.ID,
		EventType: "level_completed", XpGained: 12, Source: "online", VerificationMethod: "online_direct",
	}); err != nil {
		t.Fatalf("InsertExperienceHistory() error = %v", err)
	}
	if err := q.UpsertPlayerProgressForAttempt(ctx, repository.UpsertPlayerProgressForAttemptParams{
		UserID: minor.UserID, LevelID: level.ID, BestScore: 10, XpTotalForLevel: 12, Completed: true,
	}); err != nil {
		t.Fatalf("UpsertPlayerProgressForAttempt() error = %v", err)
	}

	svc := NewService(q, Config{
		EncryptionKey: encryptionKey, BlindIndexSecret: blindIndexSecret,
		PendingTutorTTL: time.Hour,
	})

	// created_at is "now"; run as if PendingTutorTTL + 1h have already
	// elapsed, without needing to backdate any row directly.
	summary, err := svc.RunOnce(ctx, time.Now().UTC().Add(2*time.Hour))
	if err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}
	if summary.PendingTutorPurged != 1 {
		t.Fatalf("RunOnce() PendingTutorPurged = %d, want 1", summary.PendingTutorPurged)
	}

	var status string
	var deletedAt sql.NullTime
	if err := db.QueryRowContext(ctx, `SELECT status, deleted_at FROM users WHERE id = $1`, minor.UserID).Scan(&status, &deletedAt); err != nil {
		t.Fatalf("querying user: %v", err)
	}
	if status != "deleted" || !deletedAt.Valid {
		t.Fatalf("user status = %q, deleted_at.Valid = %v, want deleted/true", status, deletedAt.Valid)
	}

	var historyUserID uuid.NullUUID
	if err := db.QueryRowContext(ctx, `SELECT user_id FROM experience_history WHERE id = $1`, historyID).Scan(&historyUserID); err != nil {
		t.Fatalf("querying experience_history: %v", err)
	}
	if historyUserID.Valid {
		t.Fatalf("experience_history.user_id = %v, want NULL (A4: automatic cancellation must NULL the ledger, not skip it)", historyUserID.UUID)
	}

	var progressCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM player_progress WHERE user_id = $1`, minor.UserID).Scan(&progressCount); err != nil {
		t.Fatalf("querying player_progress: %v", err)
	}
	if progressCount != 0 {
		t.Fatalf("player_progress rows remaining = %d, want 0 (A4: progress data must be purged)", progressCount)
	}
}
