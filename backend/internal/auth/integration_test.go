package auth_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/domain"
	"github.com/altair/usbi-backend/internal/testdb"
	"github.com/google/uuid"
)

// Integration coverage for ResolveArcoRequest against a real Postgres schema
// (audit findings B9 / A3 / A4): approving an ARCO cancelación must
// pseudonymize the user, NULL the append-only ledgers, and — this is what A3
// fixed — write a No-Repudio entry to admin_audit_log, which this endpoint
// previously never did.

func TestResolveArcoRequestApprovedCancelacion(t *testing.T) {
	ctx := context.Background()
	q, db := testdb.Setup(t)

	svc := auth.NewService(q, auth.Config{
		EncryptionKey:    "integration-test-pgp-key-32-bytes-min!!",
		BlindIndexSecret: []byte("integration-test-blind-index-32-bytes!!"),
		HMACSecret:       []byte("integration-test-hmac-secret-32-bytes!!"),
		TokenConfig:      crypto.TokenConfig{Secret: []byte("integration-test-jwt-secret-32-bytes!!!"), AccessExpiry: time.Hour},
	})

	subject, err := svc.Register(ctx, auth.RegisterRequest{
		FullName: "IT Arco Subject", Email: "arco-it-" + uuid.NewString() + "@example.test",
		Password: "correct horse battery staple", IsAdult: true, PrivacyNoticeVersion: "v1.0",
	})
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	requestID, err := svc.SubmitArcoRequest(ctx, subject.UserID, auth.ArcoRequestDTO{
		RequestType: domain.ArcoCancelacion, Details: "please delete my account",
	})
	if err != nil {
		t.Fatalf("SubmitArcoRequest() error = %v", err)
	}

	admin, err := svc.Register(ctx, auth.RegisterRequest{
		FullName: "IT Admin", Email: "arco-it-admin-" + uuid.NewString() + "@example.test",
		Password: "correct horse battery staple", IsAdult: true, PrivacyNoticeVersion: "v1.0",
	})
	if err != nil {
		t.Fatalf("Register(admin) error = %v", err)
	}
	actor := domain.JWTClaims{UserID: admin.UserID, Role: domain.RoleAdmin}

	if err := svc.ResolveArcoRequest(ctx, actor, requestID, auth.ResolveArcoRequestDTO{
		Approved: true, ResponseSummary: "Cuenta cancelada por solicitud ARCO (integration test)",
	}, "203.0.113.9", "integration-test-agent"); err != nil {
		t.Fatalf("ResolveArcoRequest() error = %v", err)
	}

	var status string
	var deletedAt sql.NullTime
	var deletionReason sql.NullString
	if err := db.QueryRowContext(ctx, `SELECT status, deleted_at, deletion_reason FROM users WHERE id = $1`, subject.UserID).
		Scan(&status, &deletedAt, &deletionReason); err != nil {
		t.Fatalf("querying user: %v", err)
	}
	if status != "deleted" || !deletedAt.Valid {
		t.Fatalf("user status = %q, deleted_at.Valid = %v, want deleted/true", status, deletedAt.Valid)
	}
	if deletionReason.String != "arco_cancelacion" {
		t.Fatalf("deletion_reason = %q, want arco_cancelacion", deletionReason.String)
	}

	var arcoStatus string
	if err := db.QueryRowContext(ctx, `SELECT status FROM arco_requests WHERE id = $1`, requestID).Scan(&arcoStatus); err != nil {
		t.Fatalf("querying arco_requests: %v", err)
	}
	if arcoStatus != "resolved" {
		t.Fatalf("arco_requests.status = %q, want resolved", arcoStatus)
	}

	// A3: this is the specific regression this test guards — ResolveArcoRequest
	// previously wrote nothing to admin_audit_log at all.
	var auditCount int
	if err := db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM admin_audit_log
WHERE actor_user_id = $1 AND action = 'arco.resolve' AND entity_id = $2
`, admin.UserID, requestID).Scan(&auditCount); err != nil {
		t.Fatalf("querying admin_audit_log: %v", err)
	}
	if auditCount != 1 {
		t.Fatalf("admin_audit_log rows for this resolution = %d, want 1 (A3: admin actions must be audited)", auditCount)
	}
}
