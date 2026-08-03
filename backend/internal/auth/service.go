package auth

import (
	"context"
	cryptorand "crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"

	"github.com/altair/usbi-backend/internal/audit"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/domain"
	"github.com/altair/usbi-backend/internal/mailer"
	"github.com/altair/usbi-backend/internal/privacy"
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
	ErrAuthBusy         = errors.New("authentication service is busy")
	// Tutor double opt-in (A1).
	ErrTutorTokenInvalid = errors.New("tutor consent token invalid")
	ErrTutorTokenExpired = errors.New("tutor consent token expired")
	ErrTutorTokenUsed    = errors.New("tutor consent token already used")
	ErrMailSend          = errors.New("failed to send verification email")
)

const defaultMaxConcurrentPasswordHashes = 2

// dummyPasswordHash is a precomputed Argon2id hash used to pad the "user not
// found" login path with the same CPU cost as a real password verification.
// Without this, an attacker can distinguish a registered email from an
// unregistered one purely by response latency, even though both cases return
// an identical error message.
var dummyPasswordHash string

func init() {
	h, err := crypto.HashPassword("usbi-timing-safe-dummy-password-do-not-use")
	if err != nil {
		panic("auth: failed to precompute dummy password hash: " + err.Error())
	}
	dummyPasswordHash = h
}

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
	// MaxConcurrentPasswordHashes caps concurrent Argon2 work. Defaults to 2.
	MaxConcurrentPasswordHashes int
	// Mailer delivers the tutor verification email. Defaults to a dev LogMailer
	// (which only logs the link) when nil — acceptable for local dev, never prod.
	Mailer mailer.Mailer
	// TutorConsentVerifyURL is the absolute URL of the GET verification endpoint;
	// the raw token is appended as "?token=". e.g.
	// https://usbi.edu.mx/api/v1/auth/tutor-consent/verify
	TutorConsentVerifyURL string
	// TutorConsentTokenTTL is how long a verification token stays valid.
	// Defaults to 24h.
	TutorConsentTokenTTL time.Duration
}

// Service implements the authentication business logic.
type Service struct {
	queries               *repository.Queries
	cfg                   Config
	passwordHashSlots     chan struct{}
	mailer                mailer.Mailer
	tutorConsentVerifyURL string
	tutorConsentTokenTTL  time.Duration
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
	maxHashes := cfg.MaxConcurrentPasswordHashes
	if maxHashes <= 0 {
		maxHashes = defaultMaxConcurrentPasswordHashes
	}
	m := cfg.Mailer
	if m == nil {
		m = mailer.NewLogMailer(nil)
	}
	ttl := cfg.TutorConsentTokenTTL
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	verifyURL := cfg.TutorConsentVerifyURL
	if verifyURL == "" {
		verifyURL = "https://usbi.edu.mx/api/v1/auth/tutor-consent/verify"
	}
	return &Service{
		queries:               q,
		cfg:                   cfg,
		passwordHashSlots:     make(chan struct{}, maxHashes),
		mailer:                m,
		tutorConsentVerifyURL: verifyURL,
		tutorConsentTokenTTL:  ttl,
	}
}

// Register creates a new user account with Argon2id password hash,
// pgcrypto-encrypted email, and blind index for login lookups.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (RegisterResponse, error) {
	// ── Input validation ──────────────────────────────────────────────────────
	if err := validateRegister(req); err != nil {
		return RegisterResponse{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	// ── Password hashing (Argon2id) ───────────────────────────────────────────
	releaseHashSlot, err := s.acquirePasswordHashSlot()
	if err != nil {
		return RegisterResponse{}, err
	}
	defer releaseHashSlot()

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
		Column5:                 phone,
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

	resp := RegisterResponse{
		UserID:  userRow.ID,
		Status:  userRow.Status,
		Message: "User registered successfully",
	}
	if status == domain.StatusPendingTutorConsent {
		resp.RegistrationToken = tutorConsentRegistrationToken(userRow.ID, s.cfg.HMACSecret)
	}
	return resp, nil
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
		// Pay the same Argon2id cost as a real login so response latency
		// doesn't leak whether the email is registered. Result is discarded —
		// this can never succeed since dummyPasswordHash never matches a real
		// password. Skip padding only if the hashing service is saturated
		// (rare, and preferable to blocking this error path).
		if releaseHashSlot, slotErr := s.acquirePasswordHashSlot(); slotErr == nil {
			_, _ = crypto.VerifyPassword(req.Password, dummyPasswordHash)
			releaseHashSlot()
		}
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
	releaseHashSlot, err := s.acquirePasswordHashSlot()
	if err != nil {
		return LoginResponse{}, err
	}
	defer releaseHashSlot()

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

func (s *Service) acquirePasswordHashSlot() (func(), error) {
	select {
	case s.passwordHashSlots <- struct{}{}:
		return func() { <-s.passwordHashSlots }, nil
	default:
		return nil, ErrAuthBusy
	}
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
// ip/userAgent identify the requester for the audit ledger (A3).
func (s *Service) AgeUp(ctx context.Context, userID uuid.UUID, ip, userAgent string) error {
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
	if err := audit.Log(ctx, qtx, audit.Entry{
		ActorID:    userID,
		Action:     "user.age_up",
		EntityType: "user",
		EntityID:   userID,
		After:      map[string]any{"is_adult": true, "age_up_attempts": attempts},
		IP:         ip,
		UserAgent:  userAgent,
	}); err != nil {
		return fmt.Errorf("logging age-up: %w", err)
	}

	return tx.Commit()
}

// SubmitTutorConsent starts the tutor double opt-in. It stores the tutor's data
// as a PENDING request with a single-use token (24h by default) and emails a
// verification link to the tutor. The minor's account is NOT activated here —
// activation happens only when the tutor clicks the link (VerifyTutorConsent),
// at which point the click's IP/user-agent become the legal consent evidence.
//
// requestedIP/userAgent describe whoever submitted the form; they are recorded
// for audit only, not as consent evidence. To avoid account enumeration and
// email-bombing, a token is issued (and an email sent) only when the referenced
// account exists and is actually pending tutor consent; callers always receive
// the same outcome regardless of whether that was the case.
func (s *Service) SubmitTutorConsent(ctx context.Context, req TutorConsentRequest, requestedIP net.IP, userAgent string) error {
	if err := validateTutorConsent(req); err != nil {
		return fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}
	if requestedIP == nil {
		requestedIP = net.ParseIP("0.0.0.0")
	}

	status, err := s.queries.GetUserStatusByID(ctx, req.UserID)
	if err != nil {
		if repository.IsNoRows(err) {
			return nil // Unknown account: behave identically to the success path.
		}
		return fmt.Errorf("looking up user: %w", err)
	}
	if status != string(domain.StatusPendingTutorConsent) {
		return nil // Not pending (active/suspended/deleted): nothing to do, no email.
	}

	// Require proof that the caller was present at registration for this
	// account. Without this check, anyone who learns a pending account's
	// UUID could submit their own tutor_email here, delete the real
	// pending token, and receive the verification link to activate someone
	// else's minor account under their own claimed identity. On mismatch
	// we no-op identically to the unknown-account branch above, so this
	// stays indistinguishable from the outside (no enumeration oracle).
	presentedMAC, decodeErr := base64.RawURLEncoding.DecodeString(req.RegistrationToken)
	if decodeErr != nil {
		return nil
	}
	if !crypto.VerifyHMAC([]byte("tutor-consent-registration|"+req.UserID.String()), presentedMAC, s.cfg.HMACSecret) {
		return nil
	}

	rawToken, err := generateOpaqueToken()
	if err != nil {
		return fmt.Errorf("generating token: %w", err)
	}
	tokenHash := crypto.GenerateHMAC([]byte(rawToken), s.cfg.HMACSecret)
	expiresAt := time.Now().UTC().Add(s.tutorConsentTokenTTL)

	tx, err := s.queries.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.queries.WithTx(tx)

	if err := qtx.DeleteUnverifiedTutorConsentTokensForUser(ctx, req.UserID); err != nil {
		return fmt.Errorf("clearing previous tutor consent tokens: %w", err)
	}
	if err := qtx.InsertTutorConsentToken(ctx, repository.InsertTutorConsentTokenParams{
		ID:                   uuid.New(),
		UserID:               req.UserID,
		TutorName:            strings.TrimSpace(req.TutorName),
		TutorEmail:           strings.ToLower(strings.TrimSpace(req.TutorEmail)),
		PrivacyNoticeVersion: req.PrivacyNoticeVersion,
		TokenHash:            tokenHash,
		RequestedIP:          requestedIP,
		RequestedUserAgent:   userAgent,
		CryptoKeyVersion:     1,
		ExpiresAt:            expiresAt,
		EncryptionKey:        s.cfg.EncryptionKey,
	}); err != nil {
		return fmt.Errorf("inserting tutor consent token: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing tutor consent token: %w", err)
	}

	// Email is sent AFTER commit — never do network I/O inside a DB transaction.
	tutorEmail := strings.ToLower(strings.TrimSpace(req.TutorEmail))
	link := s.tutorConsentVerifyURL + "?token=" + rawToken
	subject := "Verificación de consentimiento — Plataforma USBI"
	body := buildTutorConsentEmail(strings.TrimSpace(req.TutorName), link, s.tutorConsentTokenTTL)
	if err := s.mailer.Send(ctx, tutorEmail, subject, body); err != nil {
		return fmt.Errorf("%w: %v", ErrMailSend, err)
	}
	return nil
}

// VerifyTutorConsent completes the tutor double opt-in. It validates the token
// the tutor clicked, records the click as legal consent evidence (tutor_consents
// row + verified token), and activates the minor's account. The click's IP and
// user-agent are the binding evidence — not those captured at form submission.
func (s *Service) VerifyTutorConsent(ctx context.Context, rawToken string, clickIP net.IP, userAgent string) error {
	if strings.TrimSpace(rawToken) == "" {
		return ErrTutorTokenInvalid
	}
	if clickIP == nil {
		clickIP = net.ParseIP("0.0.0.0")
	}
	tokenHash := crypto.GenerateHMAC([]byte(rawToken), s.cfg.HMACSecret)

	tx, err := s.queries.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	qtx := s.queries.WithTx(tx)

	row, err := qtx.GetTutorConsentTokenByHashForUpdate(ctx, tokenHash, s.cfg.EncryptionKey)
	if err != nil {
		if repository.IsNoRows(err) {
			return ErrTutorTokenInvalid
		}
		return fmt.Errorf("looking up tutor consent token: %w", err)
	}
	if row.VerifiedAt.Valid {
		return ErrTutorTokenUsed
	}
	if time.Now().UTC().After(row.ExpiresAt) {
		return ErrTutorTokenExpired
	}

	tutorEmail := strings.ToLower(strings.TrimSpace(row.TutorEmail))
	signaturePayload := []byte(row.UserID.String() + "|" + tutorEmail + "|" + row.PrivacyNoticeVersion)
	signature := crypto.GenerateHMAC(signaturePayload, s.cfg.HMACSecret)
	now := time.Now().UTC()

	if err := qtx.InsertTutorConsent(ctx, repository.InsertTutorConsentParams{
		ID:                   uuid.New(),
		UserID:               row.UserID,
		TutorName:            strings.TrimSpace(row.TutorName),
		TutorEmail:           tutorEmail,
		PrivacyNoticeVersion: row.PrivacyNoticeVersion,
		AcceptedAt:           now,
		AcceptanceIP:         clickIP,
		AcceptanceUserAgent:  userAgent,
		ConsentSignature:     signature,
		CryptoKeyVersion:     1,
		EncryptionKey:        s.cfg.EncryptionKey,
	}); err != nil {
		return fmt.Errorf("inserting tutor consent: %w", err)
	}
	if err := qtx.MarkTutorConsentTokenVerified(ctx, repository.MarkTutorConsentTokenVerifiedParams{
		ID:                    row.ID,
		VerifiedAt:            now,
		VerificationIP:        clickIP,
		VerificationUserAgent: userAgent,
	}); err != nil {
		return fmt.Errorf("marking tutor consent token verified: %w", err)
	}
	if err := qtx.ActivateTutorConsentUser(ctx, row.UserID); err != nil {
		return fmt.Errorf("activating tutor consent user: %w", err)
	}
	return tx.Commit()
}

// buildTutorConsentEmail renders the Spanish plain-text verification email.
func buildTutorConsentEmail(tutorName, link string, ttl time.Duration) string {
	greeting := "Estimado(a) tutor(a):"
	if tutorName != "" {
		greeting = "Estimado(a) " + tutorName + ":"
	}
	hours := strconv.Itoa(int(ttl.Hours()))
	return greeting + "\n\n" +
		"Un menor de edad le ha registrado como su tutor o tutora en la plataforma " +
		"USBI de la Universidad Veracruzana y proporcionó este correo para solicitar " +
		"su consentimiento sobre el tratamiento de sus datos personales.\n\n" +
		"Para autorizar la creación de la cuenta, abra el siguiente enlace dentro de " +
		"las próximas " + hours + " horas:\n\n" +
		link + "\n\n" +
		"Al abrir el enlace se registrarán la fecha, la hora y la dirección IP de su " +
		"confirmación como evidencia del consentimiento otorgado.\n\n" +
		"Si usted no reconoce esta solicitud, ignore este mensaje: la cuenta no se " +
		"activará y el enlace caducará automáticamente.\n\n" +
		"— Plataforma USBI, Universidad Veracruzana"
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

	// user_id is nullable so the record survives pseudonymization after deletion.
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

func (s *Service) ResolveArcoRequest(ctx context.Context, actor domain.JWTClaims, requestID uuid.UUID, req ResolveArcoRequestDTO, ip, userAgent string) error {
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

	// An approved cancelación runs the single canonical cancellation routine
	// shared with the automatic maintenance job (A4), so the two never drift.
	if req.Approved && arcoReq.RequestType == string(domain.ArcoCancelacion) && arcoReq.UserID.Valid {
		if err := privacy.CancelUser(ctx, qtx, privacy.CancelParams{
			UserID:           arcoReq.UserID.UUID,
			Reason:           "arco_cancelacion",
			EncryptionKey:    s.cfg.EncryptionKey,
			BlindIndexSecret: s.cfg.BlindIndexSecret,
		}); err != nil {
			return fmt.Errorf("cancelling user: %w", err)
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

	// No-Repudio: record the admin decision on this ARCO request (A3). This is
	// the most sensitive administrative action in the system and previously
	// wrote nothing to admin_audit_log.
	var subjectID uuid.UUID
	if arcoReq.UserID.Valid {
		subjectID = arcoReq.UserID.UUID
	}
	if err := audit.Log(ctx, qtx, audit.Entry{
		ActorID:    actor.UserID,
		Action:     "arco.resolve",
		EntityType: "arco_request",
		EntityID:   requestID,
		Before:     map[string]any{"status": "pending", "request_type": arcoReq.RequestType},
		After:      map[string]any{"status": status, "approved": req.Approved, "subject_user_id": subjectID},
		IP:         ip,
		UserAgent:  userAgent,
	}); err != nil {
		return fmt.Errorf("logging arco resolution: %w", err)
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
	token, err := generateOpaqueToken()
	if err != nil {
		return "", time.Time{}, err
	}
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

// generateOpaqueToken returns a URL-safe, 256-bit random token. Used for both
// refresh tokens and tutor-consent verification links.
// tutorConsentRegistrationToken derives a deterministic, verifiable proof that
// the caller was present at registration time for userID. It is handed to the
// client in RegisterResponse and must be echoed back in SubmitTutorConsent —
// without it, anyone who merely learns a pending account's UUID could submit
// themselves as the tutor and hijack the double opt-in (see audit finding).
func tutorConsentRegistrationToken(userID uuid.UUID, secret []byte) string {
	mac := crypto.GenerateHMAC([]byte("tutor-consent-registration|"+userID.String()), secret)
	return base64.RawURLEncoding.EncodeToString(mac)
}

func generateOpaqueToken() (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := cryptorand.Read(tokenBytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(tokenBytes), nil
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
	if strings.TrimSpace(req.RegistrationToken) == "" {
		errs = append(errs, "registration_token is required")
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}
