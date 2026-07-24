package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRegisterReturnsPayloadTooLarge(t *testing.T) {
	handler := NewHandler(nil)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(`{"email":"user@example.test"}`))
	rr := httptest.NewRecorder()
	req.Body = http.MaxBytesReader(rr, req.Body, 1)

	handler.Register(rr, req)

	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("Register() status = %d, want %d", rr.Code, http.StatusRequestEntityTooLarge)
	}
}

func TestRegisterRejectsUnknownFields(t *testing.T) {
	handler := NewHandler(nil)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(`{
		"full_name":"Usuario USBI",
		"email":"user@example.test",
		"password":"correct-horse-battery",
		"is_adult":true,
		"privacy_notice_version":"2026-07",
		"unexpected":true
	}`))
	rr := httptest.NewRecorder()

	handler.Register(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("Register() status = %d, want %d", rr.Code, http.StatusBadRequest)
	}
}
