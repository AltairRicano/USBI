package transport

import (
	"encoding/json"
	"net/http"

	"github.com/altair/usbi-backend/internal/domain"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// SetupRoutes registers all HTTP routes with their middleware chain.
// Auth middleware is applied at the group level; public routes are excluded.
func SetupRoutes(r chi.Router) {
	// Global middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	r.Route("/api/v1", func(r chi.Router) {
		// ── Public routes (no JWT required) ──────────────────────────────────
		r.Group(func(r chi.Router) {
			r.Post("/auth/register", notImplementedHandler("auth.register"))
			r.Post("/auth/login", notImplementedHandler("auth.login"))
			r.Post("/auth/tutor-consent", notImplementedHandler("auth.tutorConsent"))
		})

		// ── Authenticated routes (JWT required) ───────────────────────────────
		r.Group(func(r chi.Router) {
			r.Use(jwtAuthMiddleware)

			r.Post("/auth/logout", notImplementedHandler("auth.logout"))
			r.Post("/auth/age-up", notImplementedHandler("auth.ageUp"))
			r.Post("/sync", notImplementedHandler("sync.offlineProgress"))
			r.Post("/arco", notImplementedHandler("arco.submitRequest"))

			// Level routes
			r.Get("/levels", notImplementedHandler("levels.list"))
			r.Post("/levels", notImplementedHandler("levels.create"))
		})
	})

	// Health check — no auth, no versioning
	r.Get("/health", healthHandler)
}

// healthHandler is a simple liveness probe endpoint.
func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","service":"usbi-backend"}`))
}

// notImplementedHandler returns a 501 stub for routes pending Phase 2 implementation.
// This makes routing discoverable and testable before business logic is wired.
func notImplementedHandler(operation string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeProblem(w, http.StatusNotImplemented, domain.ProblemDetails{
			Type:     "https://api.usbi.edu.mx/errors/not-implemented",
			Title:    "Not Implemented",
			Status:   http.StatusNotImplemented,
			Detail:   "Operation '" + operation + "' is pending Phase 2 implementation.",
			Instance: r.URL.Path,
		})
	}
}

// corsMiddleware applies strict CORS headers.
// Origins must be tightened to specific domains before production.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "https://usbi.edu.mx")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// jwtAuthMiddleware is a placeholder for the JWT validation middleware.
// Full implementation (token_version check against DB) goes in Phase 2.
func jwtAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			writeProblem(w, http.StatusUnauthorized, domain.ProblemDetails{
				Type:     "https://api.usbi.edu.mx/errors/unauthorized",
				Title:    "Unauthorized",
				Status:   http.StatusUnauthorized,
				Detail:   "Missing or malformed Authorization header.",
				Instance: r.URL.Path,
			})
			return
		}
		// TODO Phase 2: parse JWT, validate token_version against DB,
		// inject JWTClaims into request context.
		next.ServeHTTP(w, r)
	})
}

// writeProblem serializes a ProblemDetails as RFC 7807 (application/problem+json).
func writeProblem(w http.ResponseWriter, status int, p domain.ProblemDetails) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(p)
}
