package devices

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/altair/usbi-backend/internal/domain"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterDevice(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized", "Unauthorized", "Missing JWT claims in context")
		return
	}

	var req RegisterDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeDecodeProblem(w, r, err)
		return
	}

	resp, err := h.svc.RegisterDevice(r.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error", "Validation Error", err.Error())
			return
		}
		writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not register device")
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) ListDevices(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized", "Unauthorized", "Missing JWT claims in context")
		return
	}
	resp, err := h.svc.ListDevices(r.Context(), claims.UserID)
	if err != nil {
		writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not list devices")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func writeDecodeProblem(w http.ResponseWriter, r *http.Request, err error) {
	var maxBytesErr *http.MaxBytesError
	if errors.As(err, &maxBytesErr) {
		writeProblem(w, r, http.StatusRequestEntityTooLarge, "payload-too-large",
			"Payload Too Large", "Request body exceeds the configured size limit")
		return
	}

	writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "Invalid JSON body")
}

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

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
