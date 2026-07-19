package levels

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/altair/usbi-backend/internal/domain"
	"github.com/google/uuid"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) CreateLevel(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || claims.Role != "admin" {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only admins can create levels")
		return
	}

	var req CreateLevelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.CreateLevel(r.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error", "Validation Error", err.Error())
		} else {
			writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not create level")
		}
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

// ListLevels handles GET /api/v1/levels.
// Query params: cursor (UUID, optional), page_size (int, 1-50, default 20).
// Available to all authenticated users.
func (h *Handler) ListLevels(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	cursor := uuid.Nil
	if c := q.Get("cursor"); c != "" {
		parsed, err := uuid.Parse(c)
		if err != nil {
			writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "cursor must be a valid UUID")
			return
		}
		cursor = parsed
	}

	pageSize := int32(20)
	if ps := q.Get("page_size"); ps != "" {
		n, err := strconv.Atoi(ps)
		if err != nil || n < 1 || n > 50 {
			writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "page_size must be between 1 and 50")
			return
		}
		pageSize = int32(n)
	}

	page, err := h.svc.ListPublishedLevels(r.Context(), cursor, pageSize)
	if err != nil {
		writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not retrieve levels")
		return
	}

	writeJSON(w, http.StatusOK, page)
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

