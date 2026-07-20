package auth

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strconv"

	"github.com/altair/usbi-backend/internal/domain"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
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
		case errors.Is(err, ErrPendingTutor):
			writeProblem(w, r, http.StatusForbidden, "pending-tutor-consent",
				"Tutor Consent Required", "Tutor consent is required before login")
		default:
			writeProblem(w, r, http.StatusInternalServerError, "internal-error",
				"Internal Server Error", "An unexpected error occurred")
		}
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request",
			"Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.Refresh(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidRefresh):
			writeProblem(w, r, http.StatusUnauthorized, "invalid-refresh-token",
				"Authentication Failed", "Invalid refresh token")
		case errors.Is(err, ErrAccountSuspended):
			writeProblem(w, r, http.StatusForbidden, "forbidden",
				"Account Restricted", "This account has been suspended or deleted")
		case errors.Is(err, ErrPendingTutor):
			writeProblem(w, r, http.StatusForbidden, "pending-tutor-consent",
				"Tutor Consent Required", "Tutor consent is required before login")
		default:
			writeProblem(w, r, http.StatusInternalServerError, "internal-error",
				"Internal Server Error", "An unexpected error occurred")
		}
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) TutorConsent(w http.ResponseWriter, r *http.Request) {
	var req TutorConsentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request",
			"Bad Request", "Invalid JSON body")
		return
	}

	ip := net.ParseIP("0.0.0.0")
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		if parsed := net.ParseIP(host); parsed != nil {
			ip = parsed
		}
	}

	if err := h.svc.SubmitTutorConsent(r.Context(), req, ip, r.UserAgent()); err != nil {
		switch {
		case errors.Is(err, ErrValidation):
			writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error",
				"Validation Error", err.Error())
		default:
			writeProblem(w, r, http.StatusInternalServerError, "internal-error",
				"Internal Server Error", "Could not register tutor consent")
		}
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "active", "message": "Tutor consent registered"})
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

	requestID, err := h.svc.SubmitArcoRequest(r.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			writeProblem(w, r, http.StatusBadRequest, "validation-error",
				"Validation Error", "Invalid ARCO request")
		} else {
			writeProblem(w, r, http.StatusInternalServerError, "internal-error",
				"Internal Server Error", "Could not submit ARCO request")
		}
		return
	}

	writeJSON(w, http.StatusCreated, ArcoResponseDTO{
		RequestID: requestID,
		Status:    "pending",
		Message:   "ARCO request submitted successfully",
	})
}

func (h *Handler) ListPendingArco(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
			"Unauthorized", "Missing JWT claims in context")
		return
	}

	limit := int32(50)
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed < 1 || parsed > 100 {
			writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "limit must be between 1 and 100")
			return
		}
		limit = int32(parsed)
	}

	resp, err := h.svc.ListPendingArcoRequests(r.Context(), *claims, limit)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only admins or directors can list ARCO requests")
		} else {
			writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not list ARCO requests")
		}
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ResolveArco(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
			"Unauthorized", "Missing JWT claims in context")
		return
	}

	requestID, err := uuid.Parse(chi.URLParam(r, "request_id"))
	if err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "request_id must be a valid UUID")
		return
	}

	var req ResolveArcoRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "Invalid JSON body")
		return
	}

	if err := h.svc.ResolveArcoRequest(r.Context(), *claims, requestID, req); err != nil {
		switch {
		case errors.Is(err, ErrForbidden):
			writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only admins or directors can resolve ARCO requests")
		case errors.Is(err, ErrValidation):
			writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error", "Validation Error", err.Error())
		default:
			writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not resolve ARCO request")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "resolved"})
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
