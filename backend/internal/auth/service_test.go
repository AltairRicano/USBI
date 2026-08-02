package auth

import (
	"errors"
	"testing"
	"time"

	"github.com/altair/usbi-backend/internal/crypto"
)

func TestNormalizePhone(t *testing.T) {
	got := normalizePhone(" 22 81 23 45 67 ")
	if got != "2281234567" {
		t.Fatalf("normalizePhone() = %q", got)
	}
}

func TestNormalizeIdentifier(t *testing.T) {
	got := normalizeIdentifier("  USER@UV.MX ")
	if got != "user@uv.mx" {
		t.Fatalf("normalizeIdentifier() = %q", got)
	}
}

func TestPasswordHashSemaphoreUsesDefaultLimit(t *testing.T) {
	svc := NewService(nil, testConfig(0))

	release1, err := svc.acquirePasswordHashSlot()
	if err != nil {
		t.Fatalf("first acquirePasswordHashSlot() error = %v", err)
	}
	defer release1()

	release2, err := svc.acquirePasswordHashSlot()
	if err != nil {
		t.Fatalf("second acquirePasswordHashSlot() error = %v", err)
	}
	defer release2()

	_, err = svc.acquirePasswordHashSlot()
	if !errors.Is(err, ErrAuthBusy) {
		t.Fatalf("third acquirePasswordHashSlot() error = %v, want ErrAuthBusy", err)
	}
}

func TestPasswordHashSemaphoreHonorsConfiguredLimit(t *testing.T) {
	svc := NewService(nil, testConfig(1))

	release, err := svc.acquirePasswordHashSlot()
	if err != nil {
		t.Fatalf("first acquirePasswordHashSlot() error = %v", err)
	}
	defer release()

	_, err = svc.acquirePasswordHashSlot()
	if !errors.Is(err, ErrAuthBusy) {
		t.Fatalf("second acquirePasswordHashSlot() error = %v, want ErrAuthBusy", err)
	}
}

func TestDummyPasswordHashIsValidAndUnmatchable(t *testing.T) {
	if dummyPasswordHash == "" {
		t.Fatal("dummyPasswordHash is empty, want a precomputed Argon2id hash")
	}

	ok, err := crypto.VerifyPassword("usbi-timing-safe-dummy-password-do-not-use", dummyPasswordHash)
	if err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}
	if !ok {
		t.Fatal("VerifyPassword() = false for the exact dummy password, want true")
	}

	ok, err = crypto.VerifyPassword("some attacker-supplied password", dummyPasswordHash)
	if err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}
	if ok {
		t.Fatal("VerifyPassword() = true for an unrelated password, want false")
	}
}

func testConfig(maxConcurrentPasswordHashes int) Config {
	return Config{
		EncryptionKey:               "test-encryption-key",
		BlindIndexSecret:            []byte("test-blind-index-secret"),
		HMACSecret:                  []byte("test-hmac-secret"),
		TokenConfig:                 crypto.TokenConfig{Secret: []byte("test-jwt-secret"), AccessExpiry: 15 * time.Minute},
		MaxConcurrentPasswordHashes: maxConcurrentPasswordHashes,
	}
}
