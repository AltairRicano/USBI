package sync

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/altair/usbi-backend/internal/domain"
)

// Handler exposes the sync HTTP endpoint.
type Handler struct {
	svc *Service
}

// NewHandler creates a sync.Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// SyncData handles POST /api/v1/sync.
//
// Security contract:
//   - The HMAC is verified over a canonical technical payload, not over raw JSON.
//   - hmac_signature in the JSON body is base64-encoded bytes (standard encoding).
//   - The user_id in the body MUST match the JWT claims (checked by middleware).
func (h *Handler) SyncData(w http.ResponseWriter, r *http.Request) {
	// Read the body once. HMAC verification uses the decoded canonical payload.
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeProblem(w, r, http.StatusRequestEntityTooLarge, "payload-too-large",
				"Payload Too Large", "Request body exceeds the configured size limit")
			return
		}
		writeProblem(w, r, http.StatusBadRequest, "bad-request",
			"Bad Request", "Could not read request body")
		return
	}

	var req domain.SyncEventRequest
	if err := json.Unmarshal(rawBody, &req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request",
			"Bad Request", "Invalid JSON payload")
		return
	}
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || claims.UserID != req.UserID {
		writeProblem(w, r, http.StatusUnprocessableEntity, "invalid-sync-user",
			"Invalid Sync Payload", "sync user_id must match the authenticated user")
		return
	}

	resp, err := h.svc.ProcessSync(r.Context(), req, req.HMACSignature)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidPayload):
			writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error",
				"Validation Error", err.Error())
		case errors.Is(err, ErrInvalidSignature):
			writeProblem(w, r, http.StatusUnauthorized, "invalid-signature",
				"HMAC Verification Failed", "The payload signature is invalid")
		default:
			writeProblem(w, r, http.StatusInternalServerError, "internal-error",
				"Internal Server Error", "An unexpected error occurred")
		}
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

func writeProblem(w http.ResponseWriter, r *http.Request, status int, slug, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(domain.ProblemDetails{
		Type:     "https://api.usbi.edu.mx/errors/" + slug,
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: r.URL.Path,
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
