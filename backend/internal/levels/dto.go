package levels

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// AllowedTemplateTypes are the valid values for template_type.
var AllowedTemplateTypes = map[string]struct{}{
	"flashcards":      {},
	"multiple_choice": {},
	"drag_and_drop":   {},
	"memory":          {},
}

type CreateLevelRequest struct {
	SectionID    uuid.UUID       `json:"section_id"`
	Title        string          `json:"title"`
	Color        string          `json:"color"`
	TemplateType string          `json:"template_type"`
	Content      json.RawMessage `json:"content"`
	Difficulty   int32           `json:"difficulty"`
}

type LevelResponse struct {
	ID                 uuid.UUID       `json:"id"`
	SectionID          uuid.UUID       `json:"section_id"`
	Title              string          `json:"title"`
	Color              string          `json:"color"`
	TemplateType       string          `json:"template_type"`
	Content            json.RawMessage `json:"content"`
	Difficulty         int32           `json:"difficulty"`
	IsPublished        bool            `json:"is_published"`
	CreatedByAdminID   uuid.UUID       `json:"created_by_admin_id,omitempty"`
}

type CreateSectionRequest struct {
	Title string `json:"title"`
	Color string `json:"color"`
}

type SectionResponse struct {
	ID               uuid.UUID `json:"id"`
	Title            string    `json:"title"`
	Color            string    `json:"color"`
	IsPublished      bool      `json:"is_published"`
	CreatedByAdminID uuid.UUID `json:"created_by_admin_id,omitempty"`
}

// LevelSummary is the public-safe DTO for listing levels (no content blob).
type LevelSummary struct {
	ID           uuid.UUID `json:"id"`
	SectionID    uuid.UUID `json:"section_id"`
	Title        string    `json:"title"`
	Color        string    `json:"color"`
	TemplateType string    `json:"template_type"`
	Difficulty   int32     `json:"difficulty"`
	CreatedAt    time.Time `json:"created_at"`
}

// LevelsPage is the paginated response for GET /levels.
type LevelsPage struct {
	Items      []LevelSummary `json:"items"`
	NextCursor string         `json:"next_cursor,omitempty"` // UUID string of last item, empty if no more pages
}
