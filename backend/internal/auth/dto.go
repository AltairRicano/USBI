package auth

import (
	"github.com/altair/usbi-backend/internal/domain"
	"github.com/google/uuid"
)

// RegisterRequest is the body for POST /api/v1/auth/register.
type RegisterRequest struct {
	FullName             string `json:"full_name"`
	Email                string `json:"email"`
	Phone                string `json:"phone,omitempty"`
	Password             string `json:"password"`
	IsAdult              bool   `json:"is_adult"`
	PrivacyNoticeVersion string `json:"privacy_notice_version"`
}

// RegisterResponse is returned on successful registration.
type RegisterResponse struct {
	UserID  uuid.UUID `json:"user_id"`
	Status  string    `json:"status"`
	Message string    `json:"message"`
}

// LoginRequest is the body for POST /api/v1/auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is returned on successful login.
// User is typed as domain.User — never contains PII or crypto material.
type LoginResponse struct {
	AccessToken string      `json:"access_token"`
	TokenType   string      `json:"token_type"`
	User        domain.User `json:"user"`
}

// TutorConsentRequest is the body for POST /api/v1/auth/tutor-consent.
type TutorConsentRequest struct {
	UserID               uuid.UUID `json:"user_id"`
	TutorName            string    `json:"tutor_name"`
	TutorEmail           string    `json:"tutor_email"`
	PrivacyNoticeVersion string    `json:"privacy_notice_version"`
}

// ArcoRequestDTO is the body for POST /api/v1/arco.
// Uses domain type for compile-time validation.
type ArcoRequestDTO struct {
	RequestType domain.ArcoRequestType `json:"request_type"`
	Details     string                 `json:"details,omitempty"`
}
