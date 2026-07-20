package levels

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"

	"github.com/altair/usbi-backend/internal/repository"
	"github.com/google/uuid"
	"github.com/sqlc-dev/pqtype"
)

var (
	ErrValidation = errors.New("validation error")
	ErrNotFound   = errors.New("not found")
	ErrForbidden  = errors.New("forbidden")
)

type Service struct {
	repo *repository.Queries
}

func NewService(repo *repository.Queries) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateLevel(ctx context.Context, adminID uuid.UUID, req CreateLevelRequest) (LevelResponse, error) {
	if err := validateLevelInput(req.Title, req.Color, req.SectionID, req.TemplateType, req.Difficulty, req.Content); err != nil {
		return LevelResponse{}, ErrValidation
	}

	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return LevelResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	levelID := newID()

	adminUUID := uuid.NullUUID{UUID: adminID, Valid: true}

	level, err := qtx.CreateLevelReturning(ctx, repository.CreateLevelReturningParams{
		ID:               levelID,
		SectionID:        req.SectionID,
		Title:            req.Title,
		Color:            req.Color,
		TemplateType:     req.TemplateType,
		Content:          req.Content,
		Difficulty:       req.Difficulty,
		IsPublished:      false,
		CreatedByAdminID: adminUUID,
	})
	if err != nil {
		return LevelResponse{}, err
	}
	resp := levelToResponse(level)

	if err := logAdminAudit(ctx, qtx, adminID, "level.create", "level", level.ID, nil, levelAuditPayload(resp)); err != nil {
		return LevelResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return LevelResponse{}, err
	}
	return resp, nil
}

func (s *Service) UpdateLevel(ctx context.Context, adminID, levelID uuid.UUID, req UpdateLevelRequest) (LevelResponse, error) {
	if levelID == uuid.Nil {
		return LevelResponse{}, ErrValidation
	}
	if err := validateLevelInput(req.Title, req.Color, uuid.New(), req.TemplateType, req.Difficulty, req.Content); err != nil {
		return LevelResponse{}, ErrValidation
	}

	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return LevelResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	level, err := qtx.UpdateLevel(ctx, repository.UpdateLevelParams{
		ID:           levelID,
		Title:        req.Title,
		Color:        req.Color,
		TemplateType: req.TemplateType,
		Content:      req.Content,
		Difficulty:   req.Difficulty,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return LevelResponse{}, ErrNotFound
		}
		return LevelResponse{}, err
	}
	resp := levelToResponse(level)
	if err := logAdminAudit(ctx, qtx, adminID, "level.update", "level", level.ID, nil, levelAuditPayload(resp)); err != nil {
		return LevelResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return LevelResponse{}, err
	}
	return resp, nil
}

func (s *Service) PublishLevel(ctx context.Context, adminID, levelID uuid.UUID) (LevelResponse, error) {
	if levelID == uuid.Nil {
		return LevelResponse{}, ErrValidation
	}
	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return LevelResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	level, err := qtx.PublishLevel(ctx, levelID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return LevelResponse{}, ErrNotFound
		}
		return LevelResponse{}, err
	}
	resp := levelToResponse(level)
	if err := logAdminAudit(ctx, qtx, adminID, "level.publish", "level", level.ID, nil, levelAuditPayload(resp)); err != nil {
		return LevelResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return LevelResponse{}, err
	}
	return resp, nil
}

func (s *Service) ArchiveLevel(ctx context.Context, adminID, levelID uuid.UUID) (LevelResponse, error) {
	if adminID == uuid.Nil || levelID == uuid.Nil {
		return LevelResponse{}, ErrValidation
	}
	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return LevelResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	level, err := qtx.ArchiveLevel(ctx, repository.ArchiveLevelParams{
		ID:        levelID,
		DeletedBy: uuid.NullUUID{UUID: adminID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return LevelResponse{}, ErrNotFound
		}
		return LevelResponse{}, err
	}
	resp := levelToResponse(level)
	if err := logAdminAudit(ctx, qtx, adminID, "level.archive", "level", level.ID, nil, levelAuditPayload(resp)); err != nil {
		return LevelResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return LevelResponse{}, err
	}
	return resp, nil
}

func (s *Service) GetLevel(ctx context.Context, levelID uuid.UUID, includeUnpublished bool) (LevelResponse, error) {
	if levelID == uuid.Nil {
		return LevelResponse{}, ErrValidation
	}
	level, err := s.repo.GetLevelByID(ctx, levelID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return LevelResponse{}, ErrNotFound
		}
		return LevelResponse{}, err
	}
	if !includeUnpublished && !level.IsPublished {
		return LevelResponse{}, ErrNotFound
	}
	return levelToResponse(level), nil
}

func (s *Service) ListLevels(ctx context.Context, cursor uuid.UUID, sectionID uuid.UUID, includeUnpublished bool, pageSize int32) (LevelsPage, error) {
	if pageSize <= 0 || pageSize > 50 {
		pageSize = 20
	}

	rows, err := s.repo.ListLevels(ctx, repository.ListLevelsParams{
		IncludeUnpublished: includeUnpublished,
		HasSectionID:       sectionID != uuid.Nil,
		SectionID:          sectionID,
		Cursor:             cursor,
		PageSize:           pageSize,
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
			IsPublished:  r.IsPublished,
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

func (s *Service) CreateSection(ctx context.Context, adminID uuid.UUID, req CreateSectionRequest) (SectionResponse, error) {
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Color) == "" {
		return SectionResponse{}, ErrValidation
	}
	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return SectionResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	section, err := qtx.CreateSectionReturning(ctx, repository.CreateSectionReturningParams{
		ID:               newID(),
		Title:            strings.TrimSpace(req.Title),
		Color:            strings.TrimSpace(req.Color),
		IsPublished:      false,
		CreatedByAdminID: uuid.NullUUID{UUID: adminID, Valid: true},
	})
	if err != nil {
		return SectionResponse{}, err
	}
	resp := sectionToResponse(section)
	if err := logAdminAudit(ctx, qtx, adminID, "section.create", "section", section.ID, nil, resp); err != nil {
		return SectionResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return SectionResponse{}, err
	}
	return resp, nil
}

func (s *Service) ListSections(ctx context.Context, includeUnpublished bool) (SectionsResponse, error) {
	sections, err := s.repo.ListSections(ctx, repository.ListSectionsParams{IncludeUnpublished: includeUnpublished})
	if err != nil {
		return SectionsResponse{}, err
	}
	items := make([]SectionResponse, 0, len(sections))
	for _, section := range sections {
		items = append(items, sectionToResponse(section))
	}
	return SectionsResponse{Items: items}, nil
}

func (s *Service) UpdateSection(ctx context.Context, adminID, sectionID uuid.UUID, req UpdateSectionRequest) (SectionResponse, error) {
	if sectionID == uuid.Nil || strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Color) == "" {
		return SectionResponse{}, ErrValidation
	}
	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return SectionResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	section, err := qtx.UpdateSection(ctx, repository.UpdateSectionParams{
		ID:    sectionID,
		Title: strings.TrimSpace(req.Title),
		Color: strings.TrimSpace(req.Color),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SectionResponse{}, ErrNotFound
		}
		return SectionResponse{}, err
	}
	resp := sectionToResponse(section)
	if err := logAdminAudit(ctx, qtx, adminID, "section.update", "section", section.ID, nil, resp); err != nil {
		return SectionResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return SectionResponse{}, err
	}
	return resp, nil
}

func (s *Service) PublishSection(ctx context.Context, adminID, sectionID uuid.UUID) (SectionResponse, error) {
	if sectionID == uuid.Nil {
		return SectionResponse{}, ErrValidation
	}
	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return SectionResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	section, err := qtx.PublishSection(ctx, sectionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SectionResponse{}, ErrNotFound
		}
		return SectionResponse{}, err
	}
	resp := sectionToResponse(section)
	if err := logAdminAudit(ctx, qtx, adminID, "section.publish", "section", section.ID, nil, resp); err != nil {
		return SectionResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return SectionResponse{}, err
	}
	return resp, nil
}

func (s *Service) ArchiveSection(ctx context.Context, adminID, sectionID uuid.UUID) (SectionResponse, error) {
	if sectionID == uuid.Nil {
		return SectionResponse{}, ErrValidation
	}
	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return SectionResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.repo.WithTx(tx)

	section, err := qtx.ArchiveSection(ctx, sectionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SectionResponse{}, ErrNotFound
		}
		return SectionResponse{}, err
	}
	resp := sectionToResponse(section)
	if err := logAdminAudit(ctx, qtx, adminID, "section.archive", "section", section.ID, nil, resp); err != nil {
		return SectionResponse{}, err
	}
	if err := tx.Commit(); err != nil {
		return SectionResponse{}, err
	}
	return resp, nil
}

func (s *Service) CompleteLevel(ctx context.Context, userID, levelID uuid.UUID, req CompleteLevelRequest) (CompleteLevelResponse, error) {
	if userID == uuid.Nil || levelID == uuid.Nil || req.Score < 0 {
		return CompleteLevelResponse{}, ErrValidation
	}

	tx, err := s.repo.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return CompleteLevelResponse{}, err
	}
	defer func() { _ = tx.Rollback() }()

	qtx := s.repo.WithTx(tx)
	level, err := qtx.GetLevelByID(ctx, levelID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return CompleteLevelResponse{}, ErrNotFound
		}
		return CompleteLevelResponse{}, err
	}
	if !level.IsPublished {
		return CompleteLevelResponse{}, ErrNotFound
	}

	attemptDate := completionDate(req.ClientFinishedAt)
	if err := qtx.LockLevelAttempt(ctx, repository.LockLevelAttemptParams{
		UserID:      userID,
		LevelID:     levelID,
		AttemptDate: attemptDate,
	}); err != nil {
		return CompleteLevelResponse{}, fmt.Errorf("locking attempt: %w", err)
	}

	priorAttempts, err := qtx.CountLevelAttemptsByDate(ctx, repository.CountLevelAttemptsByDateParams{
		UserID:      userID,
		LevelID:     levelID,
		AttemptDate: attemptDate,
	})
	if err != nil {
		return CompleteLevelResponse{}, err
	}

	attemptNumber := int32(priorAttempts + 1)
	xpAwarded := CalculateXP(level.Difficulty, attemptNumber, req.Completed)

	if err := qtx.InsertLevelAttempt(ctx, repository.InsertLevelAttemptParams{
		ID:            newID(),
		UserID:        userID,
		LevelID:       levelID,
		AttemptDate:   attemptDate,
		AttemptNumber: attemptNumber,
		XpAwarded:     xpAwarded,
		Completed:     req.Completed,
	}); err != nil {
		return CompleteLevelResponse{}, err
	}

	if err := qtx.UpsertPlayerProgressForAttempt(ctx, repository.UpsertPlayerProgressForAttemptParams{
		UserID:          userID,
		LevelID:         levelID,
		BestScore:       req.Score,
		XpTotalForLevel: xpAwarded,
		Completed:       req.Completed,
	}); err != nil {
		return CompleteLevelResponse{}, err
	}

	if req.Completed {
		if err := qtx.UpsertDailyStreak(ctx, repository.UpsertDailyStreakParams{
			UserID:       userID,
			ActivityDate: attemptDate,
		}); err != nil {
			return CompleteLevelResponse{}, err
		}
	}

	eventType := "level_failed"
	if req.Completed {
		eventType = "level_completed"
	}
	if err := qtx.InsertExperienceHistory(ctx, repository.InsertExperienceHistoryParams{
		ID:                 newID(),
		UserID:             uuid.NullUUID{UUID: userID, Valid: true},
		LevelID:            levelID,
		EventType:          eventType,
		XpGained:           xpAwarded,
		Source:             "online",
		VerificationMethod: "online_direct",
		SyncEventID:        uuid.NullUUID{},
	}); err != nil {
		return CompleteLevelResponse{}, err
	}

	totals, err := qtx.GetUserProgressTotals(ctx, userID)
	if err != nil {
		return CompleteLevelResponse{}, err
	}
	badgesAwarded, err := qtx.AwardEligibleBadges(ctx, repository.AwardEligibleBadgesParams{
		UserID:  userID,
		TotalXP: totals.TotalXP,
	})
	if err != nil {
		return CompleteLevelResponse{}, err
	}
	streakDates, err := qtx.ListDailyStreakDates(ctx, userID, 370)
	if err != nil {
		return CompleteLevelResponse{}, err
	}

	if err := tx.Commit(); err != nil {
		return CompleteLevelResponse{}, err
	}

	return CompleteLevelResponse{
		LevelID:       levelID,
		Completed:     req.Completed,
		AttemptNumber: attemptNumber,
		XPAwarded:     xpAwarded,
		TotalXP:       totals.TotalXP,
		CurrentStreak: calculateCurrentStreak(streakDates),
		BadgesAwarded: badgesToResponse(badgesAwarded),
	}, nil
}

func (s *Service) GetProfileProgress(ctx context.Context, userID uuid.UUID) (ProfileProgressResponse, error) {
	if userID == uuid.Nil {
		return ProfileProgressResponse{}, ErrValidation
	}
	totals, err := s.repo.GetUserProgressTotals(ctx, userID)
	if err != nil {
		return ProfileProgressResponse{}, err
	}
	streakDates, err := s.repo.ListDailyStreakDates(ctx, userID, 370)
	if err != nil {
		return ProfileProgressResponse{}, err
	}
	badgeRows, err := s.repo.ListUserBadges(ctx, userID)
	if err != nil {
		return ProfileProgressResponse{}, err
	}
	progressRows, err := s.repo.ListUserProgressLevels(ctx, userID)
	if err != nil {
		return ProfileProgressResponse{}, err
	}

	levels := make([]ProgressLevelResponse, 0, len(progressRows))
	for _, row := range progressRows {
		item := ProgressLevelResponse{
			LevelID:         row.LevelID,
			Title:           row.Title,
			TemplateType:    row.TemplateType,
			Difficulty:      row.Difficulty,
			BestScore:       row.BestScore,
			XPTotalForLevel: row.XpTotalForLevel,
			AttemptsCount:   row.AttemptsCount,
		}
		if row.FirstCompletedAt.Valid {
			t := row.FirstCompletedAt.Time
			item.FirstCompletedAt = &t
		}
		if row.LastCompletedAt.Valid {
			t := row.LastCompletedAt.Time
			item.LastCompletedAt = &t
		}
		levels = append(levels, item)
	}

	return ProfileProgressResponse{
		TotalXP:         totals.TotalXP,
		CompletedLevels: totals.CompletedLevels,
		TotalAttempts:   totals.TotalAttempts,
		CurrentStreak:   calculateCurrentStreak(streakDates),
		Badges:          badgesToResponse(badgeRows),
		Levels:          levels,
	}, nil
}

func CalculateXP(difficulty int32, attemptNumber int32, completed bool) int32 {
	if !completed || difficulty <= 0 {
		return 0
	}
	base := 4 * difficulty
	switch {
	case attemptNumber == 1:
		return base
	case attemptNumber <= 3:
		return base / 2
	default:
		return 0
	}
}

func validateLevelInput(title, color string, sectionID uuid.UUID, templateType string, difficulty int32, content json.RawMessage) error {
	if strings.TrimSpace(title) == "" || strings.TrimSpace(color) == "" || sectionID == uuid.Nil || templateType == "" {
		return ErrValidation
	}
	if difficulty < 1 || difficulty > 10 {
		return ErrValidation
	}
	if _, ok := AllowedTemplateTypes[templateType]; !ok {
		return ErrValidation
	}
	if len(content) == 0 || len(content) > 5*1024*1024 || !json.Valid(content) {
		return ErrValidation
	}
	if string(content) == "[]" || string(content) == "{}" || string(content) == "null" {
		return ErrValidation
	}
	switch templateType {
	case "trivia":
		return validateTriviaContent(content)
	case "memory":
		return validateMemoryContent(content)
	case "fake_news":
		return validateFakeNewsContent(content)
	case "word_search":
		return validateWordSearchContent(content)
	case "puzzle":
		return validatePuzzleContent(content)
	case "crossword":
		return validateCrosswordContent(content)
	case "snakes_ladders":
		return validateSnakesContent(content)
	default:
		return ErrValidation
	}
}

func validateTriviaContent(content json.RawMessage) error {
	type question struct {
		Question     string   `json:"question"`
		Options      []string `json:"options"`
		CorrectIndex int      `json:"correct_index"`
		MediaURL     string   `json:"media_url,omitempty"`
	}
	type questionEnvelope struct {
		Questions []question `json:"questions"`
	}

	var questions []question
	if err := json.Unmarshal(content, &questions); err != nil {
		var envelope questionEnvelope
		if envelopeErr := json.Unmarshal(content, &envelope); envelopeErr != nil {
			return ErrValidation
		}
		questions = envelope.Questions
	}
	if len(questions) == 0 {
		return ErrValidation
	}
	for _, q := range questions {
		if strings.TrimSpace(q.Question) == "" || len(q.Options) < 2 || len(q.Options) > 4 {
			return ErrValidation
		}
		if q.CorrectIndex < 0 || q.CorrectIndex >= len(q.Options) {
			return ErrValidation
		}
		for _, option := range q.Options {
			if strings.TrimSpace(option) == "" {
				return ErrValidation
			}
		}
	}
	return nil
}

func validateMemoryContent(content json.RawMessage) error {
	type pair struct {
		ID       string `json:"id"`
		Content1 string `json:"content1"`
		Content2 string `json:"content2"`
		Color    string `json:"color,omitempty"`
	}
	var payload struct {
		Pairs []pair `json:"pairs"`
	}
	if err := json.Unmarshal(content, &payload); err != nil || len(payload.Pairs) < 4 {
		return ErrValidation
	}
	for _, pair := range payload.Pairs {
		if strings.TrimSpace(pair.ID) == "" || strings.TrimSpace(pair.Content1) == "" || strings.TrimSpace(pair.Content2) == "" {
			return ErrValidation
		}
	}
	return nil
}

func validateFakeNewsContent(content json.RawMessage) error {
	type item struct {
		Title       string `json:"title"`
		Content     string `json:"content"`
		IsFake      *bool  `json:"isFake"`
		Explanation string `json:"explanation,omitempty"`
		ImageURL    string `json:"imageUrl,omitempty"`
		Reference   string `json:"reference"`
	}
	var payload struct {
		News []item `json:"news"`
	}
	if err := json.Unmarshal(content, &payload); err != nil || len(payload.News) == 0 {
		return ErrValidation
	}
	for _, item := range payload.News {
		if strings.TrimSpace(item.Title) == "" || strings.TrimSpace(item.Content) == "" || item.IsFake == nil || strings.TrimSpace(item.Reference) == "" {
			return ErrValidation
		}
		if strings.TrimSpace(item.ImageURL) != "" && !isHTTPURL(item.ImageURL) {
			return ErrValidation
		}
	}
	return nil
}

func validateWordSearchContent(content json.RawMessage) error {
	var payload struct {
		Words  []string `json:"words"`
		Width  *int32   `json:"width,omitempty"`
		Height *int32   `json:"height,omitempty"`
		Seed   *int32   `json:"seed,omitempty"`
	}
	if err := json.Unmarshal(content, &payload); err != nil || len(payload.Words) < 2 {
		return ErrValidation
	}
	for _, word := range payload.Words {
		if len([]rune(strings.TrimSpace(word))) < 2 {
			return ErrValidation
		}
	}
	if payload.Width != nil && (*payload.Width < 5 || *payload.Width > 24) {
		return ErrValidation
	}
	if payload.Height != nil && (*payload.Height < 5 || *payload.Height > 24) {
		return ErrValidation
	}
	return nil
}

func validatePuzzleContent(content json.RawMessage) error {
	var payload struct {
		ImageURL string `json:"imageUrl"`
		GridSize *int32 `json:"gridSize,omitempty"`
		Seed     *int32 `json:"seed,omitempty"`
	}
	if err := json.Unmarshal(content, &payload); err != nil || !isHTTPURL(payload.ImageURL) {
		return ErrValidation
	}
	if payload.GridSize != nil && (*payload.GridSize < 2 || *payload.GridSize > 10) {
		return ErrValidation
	}
	return nil
}

func validateCrosswordContent(content json.RawMessage) error {
	type word struct {
		Word string `json:"word"`
		Clue string `json:"clue"`
	}
	var payload struct {
		Words []word `json:"words"`
	}
	if err := json.Unmarshal(content, &payload); err != nil || len(payload.Words) < 2 {
		return ErrValidation
	}
	for _, item := range payload.Words {
		if len([]rune(strings.TrimSpace(item.Word))) < 2 || strings.TrimSpace(item.Clue) == "" {
			return ErrValidation
		}
	}
	return nil
}

func validateSnakesContent(content json.RawMessage) error {
	type item struct {
		Start int32 `json:"start"`
		End   int32 `json:"end"`
	}
	var payload struct {
		BoardWidth    int32  `json:"board_width"`
		BoardHeight   int32  `json:"board_height"`
		StartPosition int32  `json:"start_position"`
		EndPosition   int32  `json:"end_position"`
		Snakes        []item `json:"snakes,omitempty"`
		Ladders       []item `json:"ladders,omitempty"`
	}
	if err := json.Unmarshal(content, &payload); err != nil {
		return ErrValidation
	}
	totalCells := payload.BoardWidth * payload.BoardHeight
	if payload.BoardWidth < 1 || payload.BoardHeight < 1 || payload.StartPosition < 1 || payload.EndPosition < 1 || payload.StartPosition > totalCells || payload.EndPosition > totalCells {
		return ErrValidation
	}

	origins := make(map[int32]struct{}, len(payload.Snakes)+len(payload.Ladders))
	for _, snake := range payload.Snakes {
		if snake.Start <= snake.End || !positionInBoard(snake.Start, totalCells) || !positionInBoard(snake.End, totalCells) {
			return ErrValidation
		}
		if _, exists := origins[snake.Start]; exists {
			return ErrValidation
		}
		origins[snake.Start] = struct{}{}
	}
	for _, ladder := range payload.Ladders {
		if ladder.Start >= ladder.End || !positionInBoard(ladder.Start, totalCells) || !positionInBoard(ladder.End, totalCells) {
			return ErrValidation
		}
		if _, exists := origins[ladder.Start]; exists {
			return ErrValidation
		}
		origins[ladder.Start] = struct{}{}
	}
	return nil
}

func positionInBoard(position, totalCells int32) bool {
	return position >= 1 && position <= totalCells
}

func isHTTPURL(rawURL string) bool {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(rawURL))
	if err != nil {
		return false
	}
	return (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

func logAdminAudit(ctx context.Context, repo *repository.Queries, actorID uuid.UUID, action, entityType string, entityID uuid.UUID, beforeState, afterState any) error {
	before, err := auditState(beforeState)
	if err != nil {
		return err
	}
	after, err := auditState(afterState)
	if err != nil {
		return err
	}
	return repo.LogAdminAudit(ctx, repository.LogAdminAuditParams{
		ID:          uuid.New(),
		ActorUserID: uuid.NullUUID{UUID: actorID, Valid: actorID != uuid.Nil},
		Action:      action,
		EntityType:  entityType,
		EntityID:    uuid.NullUUID{UUID: entityID, Valid: entityID != uuid.Nil},
		BeforeState: before,
		AfterState:  after,
		IpAddress:   net.ParseIP("0.0.0.0"),
		UserAgent:   "backend-service",
	})
}

func auditState(value any) (pqtype.NullRawMessage, error) {
	if value == nil {
		return pqtype.NullRawMessage{RawMessage: json.RawMessage(`{}`), Valid: true}, nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return pqtype.NullRawMessage{}, err
	}
	return pqtype.NullRawMessage{RawMessage: data, Valid: true}, nil
}

func levelAuditPayload(level LevelResponse) map[string]any {
	return map[string]any{
		"id":            level.ID,
		"section_id":    level.SectionID,
		"title":         level.Title,
		"color":         level.Color,
		"template_type": level.TemplateType,
		"difficulty":    level.Difficulty,
		"is_published":  level.IsPublished,
	}
}

func levelToResponse(level repository.Level) LevelResponse {
	resp := LevelResponse{
		ID:           level.ID,
		SectionID:    level.SectionID,
		Title:        level.Title,
		Color:        level.Color,
		TemplateType: level.TemplateType,
		Content:      level.Content,
		Difficulty:   level.Difficulty,
		IsPublished:  level.IsPublished,
		CreatedAt:    level.CreatedAt,
		UpdatedAt:    level.UpdatedAt,
	}
	if level.CreatedByAdminID.Valid {
		resp.CreatedByAdminID = level.CreatedByAdminID.UUID
	}
	return resp
}

func sectionToResponse(section repository.Section) SectionResponse {
	resp := SectionResponse{
		ID:          section.ID,
		Title:       section.Title,
		Color:       section.Color,
		IsPublished: section.IsPublished,
		CreatedAt:   section.CreatedAt,
	}
	if section.CreatedByAdminID.Valid {
		resp.CreatedByAdminID = section.CreatedByAdminID.UUID
	}
	return resp
}

func badgesToResponse(rows []repository.BadgeWithEarnedAt) []BadgeResponse {
	badges := make([]BadgeResponse, 0, len(rows))
	for _, row := range rows {
		badges = append(badges, BadgeResponse{
			ID:          row.ID,
			Name:        row.Name,
			XPThreshold: row.XpThreshold,
			IconKey:     row.IconKey,
			EarnedAt:    row.EarnedAt,
		})
	}
	return badges
}

func completionDate(clientFinishedAt string) time.Time {
	now := time.Now().UTC()
	if strings.TrimSpace(clientFinishedAt) != "" {
		if parsed, err := time.Parse(time.RFC3339, clientFinishedAt); err == nil {
			now = parsed.UTC()
		}
	}
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
}

func calculateCurrentStreak(dates []time.Time) int32 {
	if len(dates) == 0 {
		return 0
	}

	seen := make(map[string]struct{}, len(dates))
	for _, date := range dates {
		utc := date.UTC()
		key := time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC).Format("2006-01-02")
		seen[key] = struct{}{}
	}

	cursor := time.Now().UTC()
	today := time.Date(cursor.Year(), cursor.Month(), cursor.Day(), 0, 0, 0, 0, time.UTC)
	if _, ok := seen[today.Format("2006-01-02")]; !ok {
		yesterday := today.AddDate(0, 0, -1)
		if _, ok := seen[yesterday.Format("2006-01-02")]; !ok {
			return 0
		}
		today = yesterday
	}

	var streak int32
	for {
		if _, ok := seen[today.Format("2006-01-02")]; !ok {
			break
		}
		streak++
		today = today.AddDate(0, 0, -1)
	}
	return streak
}

func newID() uuid.UUID {
	id, err := uuid.NewV7()
	if err != nil {
		return uuid.New()
	}
	return id
}
