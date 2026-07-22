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
