package transport

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/devices"
	"github.com/altair/usbi-backend/internal/domain"
	"github.com/altair/usbi-backend/internal/httpproblem"
	"github.com/altair/usbi-backend/internal/httputil"
	"github.com/altair/usbi-backend/internal/incidents"
	"github.com/altair/usbi-backend/internal/levels"
	"github.com/altair/usbi-backend/internal/repository"
	syncHandler "github.com/altair/usbi-backend/internal/sync"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// RouterDependencies holds all handler and config dependencies. A nil handler
// registers a 501 "not implemented" stub for its routes instead of panicking,
// so partial wiring (e.g. in tests) is safe.
type RouterDependencies struct {
	AuthHandler      *auth.Handler
	SyncHandler      *syncHandler.Handler
	LevelsHandler    *levels.Handler
	DevicesHandler   *devices.Handler
	IncidentsHandler *incidents.Handler
	ReadyCheck       func(context.Context) error
	TokenCfg         crypto.TokenConfig
	Queries          *repository.Queries
	// MaxBodyBytes caps incoming API request bodies. Defaults to 6 MiB.
	MaxBodyBytes int64
	// AllowedOrigin is a comma-separated CORS allowlist (or "*" to opt into
	// allowing any origin). Defaults to "https://usbi.edu.mx" if empty.
	AllowedOrigin string
	// TrustProxyHeaders enables chi's RealIP middleware, which rewrites
	// r.RemoteAddr from True-Client-IP/X-Real-IP/X-Forwarded-For headers.
	// MUST stay false unless a reverse proxy in front of this service is
	// confirmed to strip/set those headers itself — otherwise any direct
	// client can spoof its own IP for rate limiting and audit logging.
	TrustProxyHeaders bool
	// RequestTimeout bounds every request via middleware.Timeout. Defaults to 20s.
	RequestTimeout time.Duration
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

	requestTimeout := deps.RequestTimeout
	if requestTimeout <= 0 {
		requestTimeout = 20 * time.Second
	}

	// Global middleware stack
	r.Use(middleware.RequestID)
	if deps.TrustProxyHeaders {
		r.Use(middleware.RealIP)
	}
	r.Use(requestLogger)
	r.Use(middleware.Recoverer)
	// Per-request deadline (B5): cancels the request context so slow queries /
	// blocked advisory locks release their goroutine and pool connection.
	r.Use(middleware.Timeout(requestTimeout))
	r.Use(corsMiddleware(origin))
	r.Use(maxBodyBytesMiddleware(deps.MaxBodyBytes))

	r.Route("/api/v1", func(r chi.Router) {
		// ── Public routes ─────────────────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(authRateLimitMiddleware)
			if deps.AuthHandler != nil {
				r.Post("/auth/register", deps.AuthHandler.Register)
				r.Post("/auth/login", deps.AuthHandler.Login)
				r.Post("/auth/refresh", deps.AuthHandler.Refresh)
				r.Post("/auth/tutor-consent", deps.AuthHandler.TutorConsent)
				r.Get("/auth/tutor-consent/verify", deps.AuthHandler.VerifyTutorConsent)
			} else {
				r.Post("/auth/register", notImplementedHandler("auth.register"))
				r.Post("/auth/login", notImplementedHandler("auth.login"))
				r.Post("/auth/refresh", notImplementedHandler("auth.refresh"))
				r.Post("/auth/tutor-consent", notImplementedHandler("auth.tutorConsent"))
				r.Get("/auth/tutor-consent/verify", notImplementedHandler("auth.verifyTutorConsent"))
			}
		})

		// ── Authenticated routes ──────────────────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(jwtAuthMiddleware(deps.TokenCfg, deps.Queries))
			r.Use(rateLimitMiddleware)

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

			if deps.IncidentsHandler != nil {
				r.Post("/admin/security-incidents", deps.IncidentsHandler.CreateIncident)
			} else {
				r.Post("/admin/security-incidents", notImplementedHandler("admin.createSecurityIncident"))
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

// requestLogger emits one structured slog record per request — method, path,
// status, bytes, latency, request id and client IP (B4). It replaces chi's
// text-only middleware.Logger so logs are machine-readable, and its status +
// duration fields double as the minimal request metrics (rate-limit rejections
// show up as status=429, HMAC failures as the /sync error status, etc.).
func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		slog.Info("http_request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"bytes", ww.BytesWritten(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", middleware.GetReqID(r.Context()),
			"remote_ip", httputil.ClientIP(r),
		)
	})
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
		httpproblem.WriteProblem(w, r, http.StatusNotImplemented, "not-implemented",
			"Not Implemented",
			"Operation '"+operation+"' is pending implementation.")
	}
}

// corsMiddleware applies CORS headers. The origin is configurable to support
// both production (https://usbi.edu.mx) and local LAN development.
// corsMiddleware enforces an allowlist parsed from a comma-separated list of
// origins (e.g. "https://usbi.edu.mx,http://localhost:5173"). A literal "*"
// entry opts into allowing any origin (discouraged outside local development).
// Unlike a naive reflect-any-origin implementation, a request whose Origin
// does not match gets no Access-Control-Allow-Origin header at all, so
// browsers block the cross-origin response as intended.
func corsMiddleware(allowedOrigins string) func(http.Handler) http.Handler {
	origins := make(map[string]struct{})
	wildcard := false
	for _, o := range strings.Split(allowedOrigins, ",") {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		if o == "*" {
			wildcard = true
			continue
		}
		origins[o] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Add("Vary", "Origin")

			reqOrigin := r.Header.Get("Origin")
			if reqOrigin != "" {
				if wildcard {
					w.Header().Set("Access-Control-Allow-Origin", "*")
				} else if _, ok := origins[reqOrigin]; ok {
					w.Header().Set("Access-Control-Allow-Origin", reqOrigin)
				}
			}

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
				httpproblem.WriteProblem(w, r, http.StatusUnauthorized, "unauthorized",
					"Unauthorized", "Missing or malformed Authorization header")
				return
			}

			tokenStr := authHeader[7:]

			// Reject if JWT secret is not configured (zero-value cfg).
			if len(cfg.Secret) == 0 {
				httpproblem.WriteProblem(w, r, http.StatusServiceUnavailable, "misconfigured",
					"Service Unavailable", "Authentication service is not configured")
				return
			}

			claims, err := crypto.ValidateToken(tokenStr, cfg)
			if err != nil {
				httpproblem.WriteProblem(w, r, http.StatusUnauthorized, "unauthorized",
					"Unauthorized", "Invalid or expired token")
				return
			}

			// Verify token_version against the database if queries is provided.
			// This enables immediate token revocation on logout/password change.
			if queries != nil {
				dbVersion, err := queries.GetUserTokenVersion(r.Context(), claims.UserID)
				if err != nil || int(dbVersion) != claims.TokenVersion {
					httpproblem.WriteProblem(w, r, http.StatusUnauthorized, "unauthorized",
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

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// General authenticated-route limiter: 10 rps / burst 20 per IP.
var (
	visitors = make(map[string]*visitor)
	mu       sync.Mutex
)

// Stricter limiter for public auth routes (register/login/refresh/tutor-consent),
// where the cost of a request (Argon2id hashing) makes even modest per-IP rates
// attractive for credential stuffing / brute force. ~1 attempt every 2s with a
// burst of 5 comfortably covers a legitimate user mistyping a password.
const (
	authRateRPS   rate.Limit = 0.5
	authRateBurst            = 5
)

var (
	authVisitors = make(map[string]*visitor)
	authMu       sync.Mutex
)

// Background routine to cleanup old visitors from both limiter maps.
func init() {
	go func() {
		for {
			time.Sleep(time.Minute)
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > 3*time.Minute {
					delete(visitors, ip)
				}
			}
			mu.Unlock()

			authMu.Lock()
			for ip, v := range authVisitors {
				if time.Since(v.lastSeen) > 3*time.Minute {
					delete(authVisitors, ip)
				}
			}
			authMu.Unlock()
		}
	}()
}

// proxyMisconfigWarnThreshold is how many requests must be observed before the
// single-IP-diversity check below fires (avoids a false positive from the first
// few requests at cold start).
const proxyMisconfigWarnThreshold = 50

var (
	visitorRequestCount     int
	authVisitorRequestCount int
	proxyMisconfigWarnOnce  sync.Once
)

// warnIfLikelyProxyMisconfigured logs once if every request so far has come
// from the same IP after a meaningful sample size — the signature of
// TRUST_PROXY_HEADERS=false behind a reverse proxy that strips/rewrites the
// client's real IP, collapsing rate limiting and tutor-consent audit IPs onto
// the proxy's loopback address (audit finding B3).
func warnIfLikelyProxyMisconfigured() {
	mu.Lock()
	distinctGeneral := len(visitors)
	generalCount := visitorRequestCount
	mu.Unlock()

	authMu.Lock()
	distinctAuth := len(authVisitors)
	authCount := authVisitorRequestCount
	authMu.Unlock()

	total := generalCount + authCount
	if total < proxyMisconfigWarnThreshold {
		return
	}
	if distinctGeneral > 1 || distinctAuth > 1 {
		return
	}
	proxyMisconfigWarnOnce.Do(func() {
		slog.Warn("rate limiter has seen only one distinct client IP after many requests; "+
			"if this server sits behind a reverse proxy, TRUST_PROXY_HEADERS is probably "+
			"false when it should be true (see DEPLOYMENT.md)",
			"requests_observed", total)
	})
}

func getVisitor(ip string) *rate.Limiter {
	mu.Lock()
	v, exists := visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(10, 20)
		visitors[ip] = &visitor{limiter, time.Now()}
		v = visitors[ip]
	} else {
		v.lastSeen = time.Now()
	}
	visitorRequestCount++
	mu.Unlock()

	warnIfLikelyProxyMisconfigured()
	return v.limiter
}

func getAuthVisitor(ip string) *rate.Limiter {
	authMu.Lock()
	v, exists := authVisitors[ip]
	if !exists {
		limiter := rate.NewLimiter(authRateRPS, authRateBurst)
		authVisitors[ip] = &visitor{limiter, time.Now()}
		v = authVisitors[ip]
	} else {
		v.lastSeen = time.Now()
	}
	authVisitorRequestCount++
	authMu.Unlock()

	warnIfLikelyProxyMisconfigured()
	return v.limiter
}

func rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		limiter := getVisitor(httputil.ClientIP(r))
		if !limiter.Allow() {
			http.Error(w, `{"error":"too many requests"}`, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// authRateLimitMiddleware applies a much stricter per-IP limit to the public
// authentication routes, which are the most attractive target for credential
// stuffing / brute force and previously had no rate limiting at all.
func authRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		limiter := getAuthVisitor(httputil.ClientIP(r))
		if !limiter.Allow() {
			http.Error(w, `{"error":"too many requests"}`, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
