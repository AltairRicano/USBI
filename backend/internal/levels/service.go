package levels

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/altair/usbi-backend/internal/repository"
	"github.com/google/uuid"
)

var (
	ErrValidation = errors.New("validation error")
)

type Service struct {
	repo *repository.Queries
}

func NewService(repo *repository.Queries) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateLevel(ctx context.Context, adminID uuid.UUID, req CreateLevelRequest) (LevelResponse, error) {
	if req.Title == "" || req.SectionID == uuid.Nil || req.TemplateType == "" {
		return LevelResponse{}, ErrValidation
	}

	// Validate against the allowed enum — reject unknown template types.
	if _, ok := AllowedTemplateTypes[req.TemplateType]; !ok {
		return LevelResponse{}, ErrValidation
	}

	if !json.Valid(req.Content) {
		return LevelResponse{}, ErrValidation
	}

	// Content must be non-empty (a bare [] or {} is not a real level).
	if string(req.Content) == "[]" || string(req.Content) == "{}" || string(req.Content) == "null" {
		return LevelResponse{}, ErrValidation
	}

	contentBytes, err := req.Content.MarshalJSON()
	if err != nil {
		return LevelResponse{}, ErrValidation
	}

	levelID, err := uuid.NewV7()
	if err != nil {
		return LevelResponse{}, err
	}

	adminUUID := uuid.NullUUID{UUID: adminID, Valid: true}

	err = s.repo.CreateLevel(ctx, repository.CreateLevelParams{
		ID:               levelID,
		SectionID:        req.SectionID,
		Title:            req.Title,
		Color:            req.Color,
		TemplateType:     req.TemplateType,
		Content:          contentBytes,
		Difficulty:       req.Difficulty,
		IsPublished:      false,
		CreatedByAdminID: adminUUID,
	})
	if err != nil {
		return LevelResponse{}, err
	}

	return LevelResponse{
		ID:               levelID,
		SectionID:        req.SectionID,
		Title:            req.Title,
		Color:            req.Color,
		TemplateType:     req.TemplateType,
		Content:          req.Content,
		Difficulty:       req.Difficulty,
		IsPublished:      false,
		CreatedByAdminID: adminID,
	}, nil
}

// ListPublishedLevels returns a cursor-paginated page of published levels (metadata only, no content blob).
// cursor is the last seen level ID; use uuid.Nil to start from the beginning.
// pageSize is capped at 50 to protect the server.
func (s *Service) ListPublishedLevels(ctx context.Context, cursor uuid.UUID, pageSize int32) (LevelsPage, error) {
	if pageSize <= 0 || pageSize > 50 {
		pageSize = 20
	}

	rows, err := s.repo.ListPublishedLevels(ctx, repository.ListPublishedLevelsParams{
		Cursor:   cursor,
		PageSize: pageSize,
	})
	if err != nil {
		return LevelsPage{}, err
	}

	items := make([]LevelSummary, 0, len(rows))
	for _, r := range rows {
		items = append(items, LevelSummary{
			ID:           r.ID,
			SectionID:    r.SectionID,
			Title:        r.Title,
			Color:        r.Color,
			TemplateType: r.TemplateType,
			Difficulty:   r.Difficulty,
			CreatedAt:    r.CreatedAt,
		})
	}

	page := LevelsPage{Items: items}
	if len(items) == int(pageSize) {
		// There may be more pages — return the last ID as cursor.
		page.NextCursor = items[len(items)-1].ID.String()
	}

	return page, nil
}

