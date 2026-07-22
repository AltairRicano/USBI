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

func testConfig(maxConcurrentPasswordHashes int) Config {
	return Config{
		EncryptionKey:               "test-encryption-key",
		BlindIndexSecret:            []byte("test-blind-index-secret"),
		HMACSecret:                  []byte("test-hmac-secret"),
		TokenConfig:                 crypto.TokenConfig{Secret: []byte("test-jwt-secret"), AccessExpiry: 15 * time.Minute},
		MaxConcurrentPasswordHashes: maxConcurrentPasswordHashes,
	}
}
