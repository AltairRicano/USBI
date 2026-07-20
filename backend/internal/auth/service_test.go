package auth

import "testing"

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
