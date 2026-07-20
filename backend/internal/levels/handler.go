package levels

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/altair/usbi-backend/internal/domain"
	"github.com/go-chi/chi/v5"
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
	if !ok || !canManageContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only content managers can create levels")
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

func (h *Handler) ListLevels(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	claims, _ := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)

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

	sectionID := uuid.Nil
	if rawSectionID := q.Get("section_id"); rawSectionID != "" {
		parsed, err := uuid.Parse(rawSectionID)
		if err != nil {
			writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "section_id must be a valid UUID")
			return
		}
		sectionID = parsed
	}

	includeUnpublished := q.Get("include_unpublished") == "true" && claims != nil && canManageContent(claims.Role)

	page, err := h.svc.ListLevels(r.Context(), cursor, sectionID, includeUnpublished, pageSize)
	if err != nil {
		writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not retrieve levels")
		return
	}

	writeJSON(w, http.StatusOK, page)
}

func (h *Handler) GetLevel(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	levelID, ok := parseURLUUID(w, r, "level_id")
	if !ok {
		return
	}

	includeUnpublished := claims != nil && canManageContent(claims.Role)
	resp, err := h.svc.GetLevel(r.Context(), levelID, includeUnpublished)
	if err != nil {
		writeServiceError(w, r, err, "Could not retrieve level")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) UpdateLevel(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || !canManageContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only content managers can update levels")
		return
	}

	levelID, ok := parseURLUUID(w, r, "level_id")
	if !ok {
		return
	}

	var req UpdateLevelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.UpdateLevel(r.Context(), claims.UserID, levelID, req)
	if err != nil {
		writeServiceError(w, r, err, "Could not update level")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) PublishLevel(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || !canManageContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only content managers can publish levels")
		return
	}

	levelID, ok := parseURLUUID(w, r, "level_id")
	if !ok {
		return
	}

	resp, err := h.svc.PublishLevel(r.Context(), claims.UserID, levelID)
	if err != nil {
		writeServiceError(w, r, err, "Could not publish level")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ArchiveLevel(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || !canArchiveContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only admins or directors can archive levels")
		return
	}

	levelID, ok := parseURLUUID(w, r, "level_id")
	if !ok {
		return
	}

	resp, err := h.svc.ArchiveLevel(r.Context(), claims.UserID, levelID)
	if err != nil {
		writeServiceError(w, r, err, "Could not archive level")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CompleteLevel(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized", "Unauthorized", "Missing JWT claims in context")
		return
	}

	levelID, ok := parseURLUUID(w, r, "level_id")
	if !ok {
		return
	}

	var req CompleteLevelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.CompleteLevel(r.Context(), claims.UserID, levelID, req)
	if err != nil {
		writeServiceError(w, r, err, "Could not complete level")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) GetProfileProgress(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok {
		writeProblem(w, r, http.StatusUnauthorized, "unauthorized", "Unauthorized", "Missing JWT claims in context")
		return
	}

	resp, err := h.svc.GetProfileProgress(r.Context(), claims.UserID)
	if err != nil {
		writeServiceError(w, r, err, "Could not retrieve progress")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreateSection(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || !canManageContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only content managers can create sections")
		return
	}

	var req CreateSectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.CreateSection(r.Context(), claims.UserID, req)
	if err != nil {
		writeServiceError(w, r, err, "Could not create section")
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) ListSections(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	includeUnpublished := r.URL.Query().Get("include_unpublished") == "true" && claims != nil && canManageContent(claims.Role)

	resp, err := h.svc.ListSections(r.Context(), includeUnpublished)
	if err != nil {
		writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", "Could not retrieve sections")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) UpdateSection(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || !canManageContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only content managers can update sections")
		return
	}

	sectionID, ok := parseURLUUID(w, r, "section_id")
	if !ok {
		return
	}

	var req UpdateSectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", "Invalid JSON body")
		return
	}

	resp, err := h.svc.UpdateSection(r.Context(), claims.UserID, sectionID, req)
	if err != nil {
		writeServiceError(w, r, err, "Could not update section")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) PublishSection(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || !canManageContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only content managers can publish sections")
		return
	}

	sectionID, ok := parseURLUUID(w, r, "section_id")
	if !ok {
		return
	}

	resp, err := h.svc.PublishSection(r.Context(), claims.UserID, sectionID)
	if err != nil {
		writeServiceError(w, r, err, "Could not publish section")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ArchiveSection(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(domain.ClaimsKey).(*domain.JWTClaims)
	if !ok || !canArchiveContent(claims.Role) {
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", "Only admins or directors can archive sections")
		return
	}

	sectionID, ok := parseURLUUID(w, r, "section_id")
	if !ok {
		return
	}

	resp, err := h.svc.ArchiveSection(r.Context(), claims.UserID, sectionID)
	if err != nil {
		writeServiceError(w, r, err, "Could not archive section")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func parseURLUUID(w http.ResponseWriter, r *http.Request, key string) (uuid.UUID, bool) {
	parsed, err := uuid.Parse(chi.URLParam(r, key))
	if err != nil {
		writeProblem(w, r, http.StatusBadRequest, "bad-request", "Bad Request", key+" must be a valid UUID")
		return uuid.Nil, false
	}
	return parsed, true
}

func writeServiceError(w http.ResponseWriter, r *http.Request, err error, fallback string) {
	switch {
	case errors.Is(err, ErrValidation):
		writeProblem(w, r, http.StatusUnprocessableEntity, "validation-error", "Validation Error", err.Error())
	case errors.Is(err, ErrNotFound):
		writeProblem(w, r, http.StatusNotFound, "not-found", "Not Found", "Resource not found")
	case errors.Is(err, ErrForbidden):
		writeProblem(w, r, http.StatusForbidden, "forbidden", "Forbidden", err.Error())
	default:
		writeProblem(w, r, http.StatusInternalServerError, "internal-error", "Internal Server Error", fallback)
	}
}

func canManageContent(role domain.UserRole) bool {
	return role == domain.RoleAdmin || role == domain.RoleOperator || role == domain.RoleDirector
}

func canArchiveContent(role domain.UserRole) bool {
	return role == domain.RoleAdmin || role == domain.RoleDirector
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
