package transport

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMaxBodyBytesMiddlewareCapsRequestBody(t *testing.T) {
	var readErr error
	handler := maxBodyBytesMiddleware(3)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, readErr = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/test", strings.NewReader("1234"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	var maxBytesErr *http.MaxBytesError
	if !errors.As(readErr, &maxBytesErr) {
		t.Fatalf("io.ReadAll() error = %v, want *http.MaxBytesError", readErr)
	}
}

func TestCorsMiddlewareAllowsListedOrigin(t *testing.T) {
	handler := corsMiddleware("https://usbi.edu.mx,http://localhost:5173")(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want the matched listed origin", got)
	}
}

func TestCorsMiddlewareRejectsUnlistedOrigin(t *testing.T) {
	handler := corsMiddleware("https://usbi.edu.mx")(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "https://evil.example")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want empty for an unlisted origin", got)
	}
}

func TestCorsMiddlewareWildcardOptIn(t *testing.T) {
	handler := corsMiddleware("*")(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "https://anything.example")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want \"*\" under explicit wildcard opt-in", got)
	}
}

func TestAuthRateLimitMiddlewareBlocksAfterBurst(t *testing.T) {
	handler := authRateLimitMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	remoteAddr := "203.0.113.42:12345"
	var lastStatus int
	for i := 0; i < authRateBurst+1; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
		req.RemoteAddr = remoteAddr
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		lastStatus = rr.Code
	}

	if lastStatus != http.StatusTooManyRequests {
		t.Fatalf("status after exhausting burst = %d, want %d", lastStatus, http.StatusTooManyRequests)
	}
}
