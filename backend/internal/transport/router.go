package transport

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/devices"
	"github.com/altair/usbi-backend/internal/domain"
	"github.com/altair/usbi-backend/internal/levels"
	"github.com/altair/usbi-backend/internal/repository"
	syncHandler "github.com/altair/usbi-backend/internal/sync"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// RouterDependencies holds all handler and config dependencies.
// All fields are required for full Phase 2 functionality.
type RouterDependencies struct {
	AuthHandler    *auth.Handler
	SyncHandler    *syncHandler.Handler
	LevelsHandler  *levels.Handler
	DevicesHandler *devices.Handler
	ReadyCheck     func(context.Context) error
	TokenCfg       crypto.TokenConfig
	Queries        *repository.Queries
	// MaxBodyBytes caps incoming API request bodies. Defaults to 6 MiB.
	MaxBodyBytes int64
	// AllowedOrigin is the CORS Allow-Origin value.
	// Defaults to "https://usbi.edu.mx" if empty.
	AllowedOrigin string
}

const defaultMaxBodyBytes int64 = 6 * 1024 * 1024

// ClaimsFromContext extracts the JWT claims injected by jwtAuthMiddleware.
// Returns nil if no claims are present (public route or missing middleware).
func ClaimsFromContext(ctx context.Context) *domain.JWTClaims {
	if v := ctx.Value(domain.ClaimsKey); v != nil {
		if c, ok := v.(*domain.JWTClaims); ok {
			return c
		}
	}
	return nil
}

// SetupRoutes registers all HTTP routes with their middleware chain.
func SetupRoutes(r chi.Router, deps RouterDependencies) {
	origin := deps.AllowedOrigin
	if origin == "" {
		origin = "https://usbi.edu.mx"
	}

	// Global middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware(origin))
	r.Use(maxBodyBytesMiddleware(deps.MaxBodyBytes))

	r.Route("/api/v1", func(r chi.Router) {
		// ── Public routes ─────────────────────────────────────────────────────
		r.Group(func(r chi.Router) {
			if deps.AuthHandler != nil {
				r.Post("/auth/register", deps.AuthHandler.Register)
				r.Post("/auth/login", deps.AuthHandler.Login)
				r.Post("/auth/refresh", deps.AuthHandler.Refresh)
				r.Post("/auth/tutor-consent", deps.AuthHandler.TutorConsent)
			} else {
				r.Post("/auth/register", notImplementedHandler("auth.register"))
				r.Post("/auth/login", notImplementedHandler("auth.login"))
				r.Post("/auth/refresh", notImplementedHandler("auth.refresh"))
				r.Post("/auth/tutor-consent", notImplementedHandler("auth.tutorConsent"))
			}
		})

		// ── Authenticated routes ──────────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(jwtAuthMiddleware(deps.TokenCfg, deps.Queries))

			if deps.AuthHandler != nil {
				r.Post("/auth/logout", deps.AuthHandler.Logout)
				r.Post("/auth/age-up", deps.AuthHandler.AgeUp)
				r.Post("/arco", deps.AuthHandler.Arco)
				r.Get("/arco/pending", deps.AuthHandler.ListPendingArco)
				r.Post("/arco/{request_id}/resolve", deps.AuthHandler.ResolveArco)
			} else {
				r.Post("/auth/logout", notImplementedHandler("auth.logout"))
				r.Post("/auth/age-up", notImplementedHandler("auth.ageUp"))
				r.Post("/arco", notImplementedHandler("arco.submitRequest"))
				r.Get("/arco/pending", notImplementedHandler("arco.listPending"))
				r.Post("/arco/{request_id}/resolve", notImplementedHandler("arco.resolveRequest"))
			}

			if deps.SyncHandler != nil {
				r.Post("/sync", deps.SyncHandler.SyncData)
			} else {
				r.Post("/sync", notImplementedHandler("sync.offlineProgress"))
			}

			if deps.DevicesHandler != nil {
				r.Post("/devices", deps.DevicesHandler.RegisterDevice)
				r.Get("/devices", deps.DevicesHandler.ListDevices)
			} else {
				r.Post("/devices", notImplementedHandler("devices.register"))
				r.Get("/devices", notImplementedHandler("devices.list"))
			}

			// Level routes (Phase 4 — Maker module)
			if deps.LevelsHandler != nil {
				r.Get("/sections", deps.LevelsHandler.ListSections)
				r.Post("/sections", deps.LevelsHandler.CreateSection)
				r.Patch("/sections/{section_id}", deps.LevelsHandler.UpdateSection)
				r.Post("/sections/{section_id}/publish", deps.LevelsHandler.PublishSection)
				r.Post("/sections/{section_id}/unpublish", deps.LevelsHandler.UnpublishSection)
				r.Post("/sections/{section_id}/archive", deps.LevelsHandler.ArchiveSection)

				r.Post("/levels", deps.LevelsHandler.CreateLevel)
				r.Get("/levels", deps.LevelsHandler.ListLevels)
				r.Get("/levels/{level_id}", deps.LevelsHandler.GetLevel)
				r.Patch("/levels/{level_id}", deps.LevelsHandler.UpdateLevel)
				r.Post("/levels/{level_id}/publish", deps.LevelsHandler.PublishLevel)
				r.Post("/levels/{level_id}/unpublish", deps.LevelsHandler.UnpublishLevel)
				r.Post("/levels/{level_id}/archive", deps.LevelsHandler.ArchiveLevel)
				r.Post("/levels/{level_id}/complete", deps.LevelsHandler.CompleteLevel)

				r.Get("/profile/progress", deps.LevelsHandler.GetProfileProgress)
			} else {
				r.Get("/sections", notImplementedHandler("sections.list"))
				r.Post("/sections", notImplementedHandler("sections.create"))
				r.Post("/levels", notImplementedHandler("levels.create"))
				r.Get("/levels", notImplementedHandler("levels.list"))
				r.Get("/profile/progress", notImplementedHandler("profile.progress"))
			}
		})
	})

	// Health check — unauthenticated, unversioned
	r.Get("/health", healthHandler)
	r.Get("/health/live", healthHandler)
	r.Get("/health/ready", readyHandler(deps.ReadyCheck))
}

func maxBodyBytesMiddleware(maxBytes int64) func(http.Handler) http.Handler {
	if maxBytes <= 0 {
		maxBytes = defaultMaxBodyBytes
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// healthHandler returns a simple liveness probe response.
func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"usbi-backend"}`))
}

func readyHandler(check func(context.Context) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if check == nil {
			healthHandler(w, r)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := check(ctx); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"unavailable","service":"usbi-backend","dependency":"database"}`))
			return
		}

		healthHandler(w, r)
	}
}

// notImplementedHandler returns a 501 stub for routes pending implementation.
func notImplementedHandler(operation string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeProblem(w, r, http.StatusNotImplemented, "not-implemented",
			"Not Implemented",
			"Operation '"+operation+"' is pending implementation.")
	}
}

// corsMiddleware applies CORS headers. The origin is configurable to support
// both production (https://usbi.edu.mx) and local LAN development.
func corsMiddleware(defaultOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "" {
				origin = defaultOrigin
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
			w.Header().Set("Access-Control-Max-Age", "86400")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// jwtAuthMiddleware validates the JWT and injects claims into the request context.
// Downstream handlers retrieve claims via ClaimsFromContext(r.Context()).
func jwtAuthMiddleware(cfg crypto.TokenConfig, queries *repository.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
				writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
					"Unauthorized", "Missing or malformed Authorization header")
				return
			}

			tokenStr := authHeader[7:]

			// Reject if JWT secret is not configured (zero-value cfg).
			if len(cfg.Secret) == 0 {
				writeProblem(w, r, http.StatusServiceUnavailable, "misconfigured",
					"Service Unavailable", "Authentication service is not configured")
				return
			}

			claims, err := crypto.ValidateToken(tokenStr, cfg)
			if err != nil {
				writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
					"Unauthorized", "Invalid or expired token")
				return
			}

			// Verify token_version against the database if queries is provided.
			// This enables immediate token revocation on logout/password change.
			if queries != nil {
				dbVersion, err := queries.GetUserTokenVersion(r.Context(), claims.UserID)
				if err != nil || int(dbVersion) != claims.TokenVersion {
					writeProblem(w, r, http.StatusUnauthorized, "unauthorized",
						"Unauthorized", "Token has been revoked or is invalid")
					return
				}
			}

			// Inject claims into context for downstream handlers.
			ctx := context.WithValue(r.Context(), domain.ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// writeProblem emits an RFC 7807 application/problem+json response.
func writeProblem(w http.ResponseWriter, r *http.Request, status int, slug, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(domain.ProblemDetails{
		Type:     "https://api.usbi.edu.mx/errors/" + slug,
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: r.URL.Path,
	})
}
