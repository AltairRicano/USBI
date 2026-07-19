package levels

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

// MockRepository is a basic mock for testing CreateLevel logic without a DB.
type MockRepository struct {
	createdID uuid.UUID
	shouldErr bool
}

func (m *MockRepository) CreateLevel(ctx context.Context, arg interface{}) error {
	if m.shouldErr {
		return ErrValidation
	}
	return nil
}

func TestCreateLevel_Validation(t *testing.T) {
	// Not testing full DB injection here, just the service validation logic.
	// Since the service depends on *repository.Queries which is a concrete type, 
	// we will just test the pure validation cases.

	svc := NewService(nil) // Will panic if DB is called, but we expect validation to catch it first.

	ctx := context.Background()
	adminID := uuid.New()

	tests := []struct {
		name    string
		req     CreateLevelRequest
		wantErr bool
	}{
		{
			name: "Missing Title",
			req: CreateLevelRequest{
				SectionID:    uuid.New(),
				TemplateType: "flashcards",
				Content:      json.RawMessage(`[]`),
			},
			wantErr: true,
		},
		{
			name: "Missing SectionID",
			req: CreateLevelRequest{
				Title:        "Test Level",
				TemplateType: "flashcards",
				Content:      json.RawMessage(`[]`),
			},
			wantErr: true,
		},
		{
			name: "Missing TemplateType",
			req: CreateLevelRequest{
				Title:     "Test Level",
				SectionID: uuid.New(),
				Content:   json.RawMessage(`[]`),
			},
			wantErr: true,
		},
		{
			name: "Invalid JSON Content",
			req: CreateLevelRequest{
				Title:        "Test Level",
				SectionID:    uuid.New(),
				TemplateType: "flashcards",
				Content:      json.RawMessage(`invalid`),
			},
			wantErr: true,
		},
		{
			name: "Invalid TemplateType enum",
			req: CreateLevelRequest{
				Title:        "Test Level",
				SectionID:    uuid.New(),
				TemplateType: "unknown_type",
				Content:      json.RawMessage(`[{"question":"q","answer":"a"}]`),
			},
			wantErr: true,
		},
		{
			name: "Empty content array",
			req: CreateLevelRequest{
				Title:        "Test Level",
				SectionID:    uuid.New(),
				TemplateType: "flashcards",
				Content:      json.RawMessage(`[]`),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.CreateLevel(ctx, adminID, tt.req)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateLevel() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
