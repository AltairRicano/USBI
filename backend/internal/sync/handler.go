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
//   - The HMAC is verified over the raw request body bytes, NOT a re-marshaled
//     version, to guarantee byte-for-byte fidelity with the client-signed payload.
//   - hmac_signature in the JSON body is base64-encoded bytes (standard encoding).
//   - The user_id in the body MUST match the JWT claims (checked by middleware).
func (h *Handler) SyncData(w http.ResponseWriter, r *http.Request) {
	// Read the raw body ONCE — it's needed both for JSON decoding and HMAC.
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
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

	// HMAC is transmitted as raw bytes in the JSON field ([]byte → base64 by json).
	// The rawBody used for verification excludes the signature field itself —
	// the signature is computed over the full request body including hmac_signature:""
	// placeholder set by the client before signing. This is by design (same as JWS).
	resp, err := h.svc.ProcessSync(r.Context(), req, rawBody, req.HMACSignature)
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

	writeJSON(w, http.StatusAccepted, resp)
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
