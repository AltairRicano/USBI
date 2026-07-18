package main

import (
	"crypto/tls"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/repository"
	syncSvc "github.com/altair/usbi-backend/internal/sync"
	"github.com/altair/usbi-backend/internal/transport"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env in development. In production, vars come from the system environment.
	if err := godotenv.Load(); err != nil {
		log.Println("[WARN] .env not found — reading from system environment")
	}

	// ── Required environment variables ────────────────────────────────────────
	dbURL := requireEnv("DATABASE_URL")
	jwtSecret := requireEnv("JWT_SECRET")
	encryptionKey := requireEnv("PGP_ENCRYPTION_KEY")
	blindIndexSecret := requireEnv("BLIND_INDEX_SECRET")
	hmacSecret := requireEnv("HMAC_SECRET")

	// ── Optional with defaults ────────────────────────────────────────────────
	port := getEnv("SERVER_PORT", "8443")
	certFile := getEnv("TLS_CERT_FILE", "cert.pem")
	keyFile := getEnv("TLS_KEY_FILE", "key.pem")
	allowedOrigin := getEnv("CORS_ALLOWED_ORIGIN", "")

	accessExpiryStr := getEnv("JWT_ACCESS_EXPIRY_MINUTES", "60")
	accessExpiryMinutes, err := strconv.Atoi(accessExpiryStr)
	if err != nil {
		log.Fatalf("[FATAL] Invalid JWT_ACCESS_EXPIRY_MINUTES: %v", err)
	}

	// ── Database connection ───────────────────────────────────────────────────
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("[FATAL] Opening database: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("[FATAL] Database unreachable: %v", err)
	}
	log.Println("[INFO] Database connection established")

	// ── Repository & Services ─────────────────────────────────────────────────
	queries := repository.New(db)

	tokenCfg := crypto.TokenConfig{
		Secret:       []byte(jwtSecret),
		AccessExpiry: time.Duration(accessExpiryMinutes) * time.Minute,
	}

	authSvc := auth.NewService(queries, auth.Config{
		EncryptionKey:    encryptionKey,
		BlindIndexSecret: []byte(blindIndexSecret),
		HMACSecret:       []byte(hmacSecret),
		TokenConfig:      tokenCfg,
	})

	syncService := syncSvc.NewService(queries, []byte(hmacSecret))

	// ── Router wiring ─────────────────────────────────────────────────────────
	r := chi.NewRouter()
	transport.SetupRoutes(r, transport.RouterDependencies{
		AuthHandler:   auth.NewHandler(authSvc),
		SyncHandler:   syncSvc.NewHandler(syncService),
		TokenCfg:      tokenCfg,
		Queries:       queries,
		AllowedOrigin: allowedOrigin,
	})

	// ── TLS 1.2+ (RF69 — TLS 1.0/1.1 explicitly disabled) ────────────────────
	tlsCfg := &tls.Config{
		MinVersion: tls.VersionTLS12,
		CurvePreferences: []tls.CurveID{
			tls.X25519,
			tls.CurveP256,
		},
		PreferServerCipherSuites: true,
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		TLSConfig:    tlsCfg,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	fmt.Printf("[USBI Backend] Listening on :%s (TLS 1.2+)\n", port)
	if err := server.ListenAndServeTLS(certFile, keyFile); err != nil {
		log.Fatalf("[FATAL] Server startup failed: %v", err)
	}
}

// requireEnv panics at startup if the environment variable is missing or empty.
// This surfaces misconfigurations immediately instead of silently failing later.
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("[FATAL] Required environment variable %q is not set", key)
	}
	return val
}

// getEnv returns the environment variable value or a fallback default.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
