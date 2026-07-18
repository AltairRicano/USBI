package auth

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/altair/usbi-backend/internal/domain"
)

// Handler exposes auth HTTP endpoints.
type Handler struct {
	svc *Service
}

// NewHandler creates an auth.Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Register handles POST /api/v1/auth/register.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request",
			"Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.Register(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrValidation):
			writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error",
				"Validation Error", err.Error())
		case errors.Is(err, ErrEmailConflict):
			writeProblem(w, r, http.StatusConflict, "conflict",
				"Email Already Registered", "An active account with this email already exists")
		default:
			writeProblem(w, r, http.StatusInternalServerError, "internal-error",
				"Internal Server Error", "An unexpected error occurred")
		}
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

// Login handles POST /api/v1/auth/login.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request",
			"Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrValidation):
			writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error",
				"Validation Error", err.Error())
		case errors.Is(err, ErrUserNotFound), errors.Is(err, ErrInvalidPassword):
			// Use identical message for both to prevent user enumeration.
			writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
				"Authentication Failed", "Invalid email or password")
		case errors.Is(err, ErrAccountSuspended):
			writeProblem(w, r, http.StatusForbidden, "forbidden",
				"Account Restricted", "This account has been suspended or deleted")
		default:
			writeProblem(w, r, http.StatusInternalServerError, "internal-error",
				"Internal Server Error", "An unexpected error occurred")
		}
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// Logout handles POST /api/v1/auth/logout.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
			"Unauthorized", "Missing JWT claims in context")
		return
	}

	if err := h.svc.Logout(r.Context(), claims.UserID); err != nil {
		writeProblem(w, r, http.StatusInternalServerError, "internal-error",
			"Internal Server Error", "Could not process logout")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AgeUp handles POST /api/v1/auth/age-up.
func (h *Handler) AgeUp(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
			"Unauthorized", "Missing JWT claims in context")
		return
	}

	if err := h.svc.AgeUp(r.Context(), claims.UserID); err != nil {
		if err.Error() == "maximum age-up attempts exceeded" {
			writeProblem(w, r, http.StatusTooManyRequests, "too-many-requests",
				"Too Many Requests", err.Error())
			return
		}
		writeProblem(w, r, http.StatusInternalServerError, "internal-error",
			"Internal Server Error", "Could not process age-up request")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "success", "message": "User adult status updated"})
}

// Arco handles POST /api/v1/arco.
func (h *Handler) Arco(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
			"Unauthorized", "Missing JWT claims in context")
		return
	}

	var req ArcoRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request",
			"Bad Request", "Invalid JSON body")
		return
	}

	if err := h.svc.SubmitArcoRequest(r.Context(), claims.UserID, req); err != nil {
		writeProblem(w, r, http.StatusInternalServerError, "internal-error",
			"Internal Server Error", "Could not submit ARCO request")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "pending", "message": "ARCO request submitted successfully"})
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// writeProblem emits an RFC 7807 application/problem+json response.
// errorSlug becomes the suffix of the type URI.
func writeProblem(w http.ResponseWriter, r *http.Request, status int, errorSlug, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(domain.ProblemDetails{
		Type:     "https://api.usbi.edu.mx/errors/" + errorSlug,
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: r.URL.Path,
	})
}

// writeJSON serialises v as application/json with the given status.
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
