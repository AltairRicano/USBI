package auth

import (
	"context"
	"errors"
	"fmt"
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
	emailHash := crypto.BlindIndexHMAC(
		strings.ToLower(strings.TrimSpace(req.Email)),
		s.cfg.BlindIndexSecret,
	)

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

	emailHash := crypto.BlindIndexHMAC(
		strings.ToLower(strings.TrimSpace(req.Email)),
		s.cfg.BlindIndexSecret,
	)

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

	// Argon2id verification (constant-time).
	ok, err := crypto.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !ok {
		return LoginResponse{}, ErrInvalidPassword
	}

	// Generate JWT with token_version for revocation support.
	claims := domain.JWTClaims{
		UserID:       user.ID,
		Role:         domain.UserRole(user.Role),
		TokenVersion: int(user.TokenVersion),
	}
	token, err := crypto.GenerateToken(claims, s.cfg.TokenConfig)
	if err != nil {
		return LoginResponse{}, fmt.Errorf("generating token: %w", err)
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
		AccessToken: token,
		TokenType:   "Bearer",
		User:        userDTO,
	}, nil
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
