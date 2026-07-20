package auth

import (
	"context"
	cryptorand "crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/domain"
	"github.com/altair/usbi-backend/internal/repository"
	"github.com/google/uuid"
)

// Sentinel errors — used by handler for correct HTTP status mapping.
var (
	ErrUserNotFound     = errors.New("user not found")
	ErrInvalidPassword  = errors.New("invalid credentials")
	ErrAccountSuspended = errors.New("account suspended or deleted")
	ErrEmailConflict    = errors.New("email already registered")
	ErrValidation       = errors.New("validation error")
	ErrPendingTutor     = errors.New("pending tutor consent")
	ErrInvalidRefresh   = errors.New("invalid refresh token")
	ErrForbidden        = errors.New("forbidden")
)

// Config holds all secrets and settings needed by auth.Service.
// Every field is required; zero values indicate a misconfiguration.
type Config struct {
	// EncryptionKey is the symmetric key for pgp_sym_encrypt/decrypt (pgcrypto).
	// Must be loaded from PGP_ENCRYPTION_KEY env var — never hardcoded.
	EncryptionKey string
	// BlindIndexSecret is the HMAC key for email/phone lookup hashes.
	// Must be loaded from BLIND_INDEX_SECRET env var.
	BlindIndexSecret []byte
	// HMACSecret signs the privacy acceptance seal for No-Repudio.
	HMACSecret []byte
	// TokenConfig carries the JWT signing key and expiry duration.
	TokenConfig crypto.TokenConfig
}

// Service implements the authentication business logic.
type Service struct {
	queries *repository.Queries
	cfg     Config
}

// NewService creates an auth.Service. It panics if cfg contains zero values
// for required secrets, preventing silent misconfigurations at startup.
func NewService(q *repository.Queries, cfg Config) *Service {
	if len(cfg.BlindIndexSecret) == 0 {
		panic("auth.Config: BlindIndexSecret must not be empty")
	}
	if len(cfg.HMACSecret) == 0 {
		panic("auth.Config: HMACSecret must not be empty")
	}
	if cfg.EncryptionKey == "" {
		panic("auth.Config: EncryptionKey must not be empty")
	}
	if len(cfg.TokenConfig.Secret) == 0 {
		panic("auth.Config: TokenConfig.Secret must not be empty")
	}
	return &Service{queries: q, cfg: cfg}
}

// Register creates a new user account with Argon2id password hash,
// pgcrypto-encrypted email, and blind index for login lookups.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (RegisterResponse, error) {
	// ── Input validation ──────────────────────────────────────────────────────
	if err := validateRegister(req); err != nil {
		return RegisterResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	// ── Password hashing (Argon2id) ───────────────────────────────────────────
	passwordHash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return RegisterResponse{}, fmt.Errorf("hashing password: %w", err)
	}

	// ── Blind index for email lookup ──────────────────────────────────────────
	emailHash := crypto.BlindIndexHMAC(normalizeIdentifier(req.Email), s.cfg.BlindIndexSecret)
	phone := strings.TrimSpace(req.Phone)
	var phoneHash []byte
	if phone != "" {
		phoneHash = crypto.BlindIndexHMAC(normalizePhone(phone), s.cfg.BlindIndexSecret)
	}

	// ── Privacy acceptance cryptographic seal (No-Repudio) ───────────────────
	sealPayload := []byte(req.Email + "|" + req.PrivacyNoticeVersion)
	acceptanceHash := crypto.GenerateHMAC(sealPayload, s.cfg.HMACSecret)

	// ── Account status: minors require tutor consent first ───────────────────
	status := domain.StatusActive
	if !req.IsAdult {
		status = domain.StatusPendingTutorConsent
	}

	userID := uuid.New()

	userRow, err := s.queries.CreateUser(ctx, repository.CreateUserParams{
		ID:                      userID,
		FullName:                req.FullName,
		Column3:                 strings.TrimSpace(req.Email), // $3 → pgp_sym_encrypt(email)
		EmailLookupHash:         emailHash,
		Phone:                   phone,
		PhoneLookupHash:         phoneHash,
		PasswordHash:            passwordHash,
		TokenVersion:            1,
		IsAdult:                 req.IsAdult,
		Role:                    string(domain.RolePlayer),
		PrivacyNoticeVersion:    req.PrivacyNoticeVersion,
		PrivacyNoticeAcceptedAt: time.Now().UTC(),
		PrivacyAcceptanceHash:   acceptanceHash,
		CryptoKeyVersion:        1,
		Status:                  string(status),
		EncryptionKey:           s.cfg.EncryptionKey,
	})
	if err != nil {
		// PostgreSQL unique constraint violation (email_lookup_hash)
		if strings.Contains(err.Error(), "users_email_lookup_active_idx") ||
			strings.Contains(err.Error(), "duplicate key") {
			return RegisterResponse{}, ErrEmailConflict
		}
		return RegisterResponse{}, fmt.Errorf("creating user: %w", err)
	}

	return RegisterResponse{
		UserID:  userRow.ID,
		Status:  userRow.Status,
		Message: "User registered successfully",
	}, nil
}

// Login validates credentials and returns a signed JWT.
// Uses constant-time comparison for password verification (timing-safe).
func (s *Service) Login(ctx context.Context, req LoginRequest) (LoginResponse, error) {
	if err := validateLogin(req); err != nil {
		return LoginResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	emailHash := crypto.BlindIndexHMAC(normalizeIdentifier(req.Email), s.cfg.BlindIndexSecret)

	user, err := s.queries.GetUserByEmailHash(ctx, repository.GetUserByEmailHashParams{
		EmailLookupHash: emailHash,
		EncryptionKey:   s.cfg.EncryptionKey,
	})
	if err != nil {
		// Return generic error — don't leak whether email exists.
		return LoginResponse{}, ErrUserNotFound
	}

	// Block suspended or deleted accounts before expensive hash check.
	if user.Status == string(domain.StatusSuspended) ||
		user.Status == string(domain.StatusDeleted) {
		return LoginResponse{}, ErrAccountSuspended
	}
	if user.Status == string(domain.StatusPendingTutorConsent) {
		return LoginResponse{}, ErrPendingTutor
	}

	// Argon2id verification (constant-time).
	ok, err := crypto.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !ok {
		return LoginResponse{}, ErrInvalidPassword
	}

	accessToken, err := s.generateAccessToken(user.ID, domain.UserRole(user.Role), int(user.TokenVersion))
	if err != nil {
		return LoginResponse{}, fmt.Errorf("generating token: %w", err)
	}
	refreshToken, refreshExpiresAt, err := s.issueRefreshToken(ctx, user.ID)
	if err != nil {
		return LoginResponse{}, fmt.Errorf("issuing refresh token: %w", err)
	}

	// Safe user DTO — never includes password_hash, email ciphertext, or keys.
	userDTO := domain.User{
		ID:        user.ID,
		FullName:  user.FullName,
		IsAdult:   user.IsAdult,
		Role:      domain.UserRole(user.Role),
		Status:    domain.UserStatus(user.Status),
		CreatedAt: user.CreatedAt,
	}

	return LoginResponse{
		AccessToken:           accessToken,
		RefreshToken:          refreshToken,
		TokenType:             "Bearer",
		AccessTokenExpiresIn:  int64(s.cfg.TokenConfig.AccessExpiry.Seconds()),
		RefreshTokenExpiresAt: refreshExpiresAt,
		User:                  userDTO,
	}, nil
}

func (s *Service) Refresh(ctx context.Context, req RefreshRequest) (LoginResponse, error) {
	if strings.TrimSpace(req.RefreshToken) == "" {
		return LoginResponse{}, ErrInvalidRefresh
	}
	tokenHash := crypto.GenerateHMAC([]byte(req.RefreshToken), s.cfg.HMACSecret)
	refreshUser, err := s.queries.GetRefreshTokenUser(ctx, tokenHash)
	if err != nil {
		if repository.IsNoRows(err) {
			return LoginResponse{}, ErrInvalidRefresh
		}
		return LoginResponse{}, err
	}
	if refreshUser.Status == string(domain.StatusSuspended) || refreshUser.Status == string(domain.StatusDeleted) {
		return LoginResponse{}, ErrAccountSuspended
	}
	if refreshUser.Status == string(domain.StatusPendingTutorConsent) {
		return LoginResponse{}, ErrPendingTutor
	}
	if err := s.queries.RevokeRefreshToken(ctx, refreshUser.TokenID); err != nil {
		return LoginResponse{}, err
	}

	accessToken, err := s.generateAccessToken(refreshUser.UserID, domain.UserRole(refreshUser.Role), int(refreshUser.TokenVersion))
	if err != nil {
		return LoginResponse{}, err
	}
	refreshToken, refreshExpiresAt, err := s.issueRefreshToken(ctx, refreshUser.UserID)
	if err != nil {
		return LoginResponse{}, err
	}

	return LoginResponse{
		AccessToken:           accessToken,
		RefreshToken:          refreshToken,
		TokenType:             "Bearer",
		AccessTokenExpiresIn:  int64(s.cfg.TokenConfig.AccessExpiry.Seconds()),
		RefreshTokenExpiresAt: refreshExpiresAt,
		User: domain.User{
			ID:        refreshUser.UserID,
			FullName:  refreshUser.FullName,
			IsAdult:   refreshUser.IsAdult,
			Role:      domain.UserRole(refreshUser.Role),
			Status:    domain.UserStatus(refreshUser.Status),
			CreatedAt: refreshUser.CreatedAt,
		},
	}, nil
}

// Logout increments the user's token_version, invalidating all their current JWTs.
func (s *Service) Logout(ctx context.Context, userID uuid.UUID) error {
	if userID == uuid.Nil {
		return ErrValidation
	}
	err := s.queries.IncrementTokenVersion(ctx, userID)
	if err != nil {
		return fmt.Errorf("incrementing token_version: %w", err)
	}
	if err := s.queries.RevokeRefreshTokensForUser(ctx, userID); err != nil {
		return fmt.Errorf("revoking refresh tokens: %w", err)
	}
	return nil
}

// AgeUp attempts to transition a user from pending_tutor_consent to active.
func (s *Service) AgeUp(ctx context.Context, userID uuid.UUID) error {
	if userID == uuid.Nil {
		return ErrValidation
	}

	tx, err := s.queries.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.queries.WithTx(tx)

	attempts, err := qtx.IncrementAgeUpAttempts(ctx, userID)
	if err != nil {
		return fmt.Errorf("incrementing age_up_attempts: %w", err)
	}

	if attempts > 3 {
		return errors.New("maximum age-up attempts exceeded")
	}

	if err := qtx.UpdateUserAdultStatus(ctx, userID); err != nil {
		return fmt.Errorf("updating user adult status: %w", err)
	}
	if err := qtx.PseudonymizeTutorConsents(ctx, repository.PseudonymizeTutorConsentsParams{
		UserID:        userID,
		EncryptionKey: s.cfg.EncryptionKey,
	}); err != nil {
		return fmt.Errorf("pseudonymizing tutor consents after age-up: %w", err)
	}

	return tx.Commit()
}

func (s *Service) SubmitTutorConsent(ctx context.Context, req TutorConsentRequest, acceptanceIP net.IP, userAgent string) error {
	if err := validateTutorConsent(req); err != nil {
		return fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}
	if acceptanceIP == nil {
		acceptanceIP = net.ParseIP("0.0.0.0")
	}

	signaturePayload := []byte(req.UserID.String() + "|" + strings.ToLower(strings.TrimSpace(req.TutorEmail)) + "|" + req.PrivacyNoticeVersion)
	signature := crypto.GenerateHMAC(signaturePayload, s.cfg.HMACSecret)

	tx, err := s.queries.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.queries.WithTx(tx)

	if err := qtx.InsertTutorConsent(ctx, repository.InsertTutorConsentParams{
		ID:                   uuid.New(),
		UserID:               req.UserID,
		TutorName:            strings.TrimSpace(req.TutorName),
		TutorEmail:           strings.ToLower(strings.TrimSpace(req.TutorEmail)),
		PrivacyNoticeVersion: req.PrivacyNoticeVersion,
		AcceptedAt:           time.Now().UTC(),
		AcceptanceIP:         acceptanceIP,
		AcceptanceUserAgent:  userAgent,
		ConsentSignature:     signature,
		CryptoKeyVersion:     1,
		EncryptionKey:        s.cfg.EncryptionKey,
	}); err != nil {
		return fmt.Errorf("inserting tutor consent: %w", err)
	}
	if err := qtx.ActivateTutorConsentUser(ctx, req.UserID); err != nil {
		return fmt.Errorf("activating tutor consent user: %w", err)
	}
	return tx.Commit()
}

// SubmitArcoRequest records an ARCO request from the user.
func (s *Service) SubmitArcoRequest(ctx context.Context, userID uuid.UUID, req ArcoRequestDTO) (uuid.UUID, error) {
	if userID == uuid.Nil {
		return uuid.Nil, ErrValidation
	}
	if !isValidArcoRequestType(req.RequestType) || len(strings.TrimSpace(req.Details)) > 1000 {
		return uuid.Nil, ErrValidation
	}

	// Create the cryptographic seal for No-Repudio
	payload := []byte(userID.String() + "|" + string(req.RequestType) + "|" + req.Details)
	evidenceHash := crypto.GenerateHMAC(payload, s.cfg.HMACSecret)
	requestID := uuid.New()

	// Since database schema allows NULL for user_id to preserve record after deletion,
	// sqlc generated user_id as pgtype.UUID or uuid.NullUUID.
	// sqlc uses pgtype by default in v2 unless configured otherwise. Let's check repository types.
	// Actually we should just pass it, assuming repository.InsertArcoRequestParams has UserID: uuid.NullUUID.
	err := s.queries.InsertArcoRequest(ctx, repository.InsertArcoRequestParams{
		ID:            requestID,
		UserID:        uuid.NullUUID{UUID: userID, Valid: true},
		RequesterType: "user",
		RequestType:   string(req.RequestType),
		Status:        "pending",
		EvidenceHash:  evidenceHash,
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("inserting arco request: %w", err)
	}
	if req.RequestType == domain.ArcoCancelacion {
		if err := s.queries.MarkUserDevicesForWipe(ctx, userID); err != nil {
			return uuid.Nil, fmt.Errorf("marking devices for wipe: %w", err)
		}
	}

	return requestID, nil
}

func isValidArcoRequestType(requestType domain.ArcoRequestType) bool {
	switch requestType {
	case domain.ArcoAcceso, domain.ArcoRectificacion, domain.ArcoCancelacion, domain.ArcoOposicion:
		return true
	default:
		return false
	}
}

func (s *Service) ListPendingArcoRequests(ctx context.Context, actor domain.JWTClaims, limit int32) (ArcoPendingListDTO, error) {
	if actor.Role != domain.RoleAdmin && actor.Role != domain.RoleDirector {
		return ArcoPendingListDTO{}, ErrForbidden
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.queries.ListPendingArcoRequests(ctx, limit)
	if err != nil {
		return ArcoPendingListDTO{}, err
	}
	items := make([]ArcoPendingItemDTO, 0, len(rows))
	for _, row := range rows {
		items = append(items, ArcoPendingItemDTO{
			ID:            row.ID,
			RequesterType: row.RequesterType,
			RequestType:   row.RequestType,
			Status:        row.Status,
			ReceivedAt:    row.ReceivedAt,
		})
	}
	return ArcoPendingListDTO{Items: items}, nil
}

func (s *Service) ResolveArcoRequest(ctx context.Context, actor domain.JWTClaims, requestID uuid.UUID, req ResolveArcoRequestDTO) error {
	if actor.Role != domain.RoleAdmin && actor.Role != domain.RoleDirector {
		return ErrForbidden
	}
	if requestID == uuid.Nil || strings.TrimSpace(req.ResponseSummary) == "" {
		return ErrValidation
	}

	tx, err := s.queries.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.queries.WithTx(tx)

	arcoReq, err := qtx.GetArcoRequestForUpdate(ctx, requestID)
	if err != nil {
		return err
	}
	if arcoReq.Status != "pending" {
		return ErrValidation
	}

	status := "rejected"
	if req.Approved {
		status = "resolved"
	}

	if req.Approved && arcoReq.RequestType == string(domain.ArcoCancelacion) && arcoReq.UserID.Valid {
		pseudonymEmail := "deleted-" + arcoReq.UserID.UUID.String() + "@pseudonymized.usbi.invalid"
		emailHash := crypto.BlindIndexHMAC(pseudonymEmail, s.cfg.BlindIndexSecret)

		if err := qtx.PseudonymizeTutorConsents(ctx, repository.PseudonymizeTutorConsentsParams{
			UserID:        arcoReq.UserID.UUID,
			EncryptionKey: s.cfg.EncryptionKey,
		}); err != nil {
			return fmt.Errorf("pseudonymizing tutor consents: %w", err)
		}
		if err := qtx.PseudonymizeUser(ctx, repository.PseudonymizeUserParams{
			UserID:          arcoReq.UserID.UUID,
			PseudonymEmail:  pseudonymEmail,
			EmailLookupHash: emailHash,
			EncryptionKey:   s.cfg.EncryptionKey,
			DeletionReason:  "arco_cancelacion",
		}); err != nil {
			return fmt.Errorf("pseudonymizing user: %w", err)
		}
		if err := qtx.NullUserInPseudonymizableLedgers(ctx, arcoReq.UserID.UUID); err != nil {
			return fmt.Errorf("pseudonymizing ledgers: %w", err)
		}
		if err := qtx.MarkUserDevicesForWipe(ctx, arcoReq.UserID.UUID); err != nil {
			return fmt.Errorf("marking devices for wipe: %w", err)
		}
		if err := qtx.RevokeRefreshTokensForUser(ctx, arcoReq.UserID.UUID); err != nil {
			return fmt.Errorf("revoking refresh tokens: %w", err)
		}
	}

	if err := qtx.ResolveArcoRequest(ctx, repository.ResolveArcoRequestParams{
		ID:              requestID,
		HandledBy:       uuid.NullUUID{UUID: actor.UserID, Valid: true},
		Status:          status,
		ResponseSummary: strings.TrimSpace(req.ResponseSummary),
	}); err != nil {
		return fmt.Errorf("resolving arco request: %w", err)
	}

	return tx.Commit()
}

// ── Validation helpers ────────────────────────────────────────────────────────

func validateRegister(req RegisterRequest) error {
	var errs []string
	if strings.TrimSpace(req.FullName) == "" {
		errs = append(errs, "full_name is required")
	}
	if len(req.FullName) > 120 {
		errs = append(errs, "full_name exceeds 120 characters")
	}
	if !strings.Contains(req.Email, "@") || len(req.Email) < 5 {
		errs = append(errs, "email is invalid")
	}
	if len(req.Password) < 8 {
		errs = append(errs, "password must be at least 8 characters")
	}
	if req.PrivacyNoticeVersion == "" {
		errs = append(errs, "privacy_notice_version is required")
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}

func validateLogin(req LoginRequest) error {
	var errs []string
	if !strings.Contains(req.Email, "@") || len(req.Email) < 5 {
		errs = append(errs, "email is invalid")
	}
	if req.Password == "" {
		errs = append(errs, "password is required")
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}

func (s *Service) generateAccessToken(userID uuid.UUID, role domain.UserRole, tokenVersion int) (string, error) {
	claims := domain.JWTClaims{
		UserID:       userID,
		Role:         role,
		TokenVersion: tokenVersion,
	}
	return crypto.GenerateToken(claims, s.cfg.TokenConfig)
}

func (s *Service) issueRefreshToken(ctx context.Context, userID uuid.UUID) (string, time.Time, error) {
	tokenBytes := make([]byte, 32)
	if _, err := cryptorand.Read(tokenBytes); err != nil {
		return "", time.Time{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	tokenHash := crypto.GenerateHMAC([]byte(token), s.cfg.HMACSecret)
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	if err := s.queries.InsertRefreshToken(ctx, repository.InsertRefreshTokenParams{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	}); err != nil {
		return "", time.Time{}, err
	}
	return token, expiresAt, nil
}

func normalizeIdentifier(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizePhone(value string) string {
	return strings.Join(strings.Fields(value), "")
}

func validateTutorConsent(req TutorConsentRequest) error {
	var errs []string
	if req.UserID == uuid.Nil {
		errs = append(errs, "user_id is required")
	}
	if strings.TrimSpace(req.TutorName) == "" {
		errs = append(errs, "tutor_name is required")
	}
	if !strings.Contains(req.TutorEmail, "@") || len(req.TutorEmail) < 5 {
		errs = append(errs, "tutor_email is invalid")
	}
	if req.PrivacyNoticeVersion == "" {
		errs = append(errs, "privacy_notice_version is required")
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}
