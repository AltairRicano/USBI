package main

import (
	"context"
	"crypto/tls"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/devices"
	"github.com/altair/usbi-backend/internal/levels"
	"github.com/altair/usbi-backend/internal/maintenance"
	"github.com/altair/usbi-backend/internal/repository"
	syncSvc "github.com/altair/usbi-backend/internal/sync"
	"github.com/altair/usbi-backend/internal/transport"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	loadEnvironment()

	// ── Required environment variables ────────────────────────────────────────
	dbURL := databaseURL()
	jwtSecret := requireEnv("JWT_SECRET")
	encryptionKey := requireEnv("PGP_ENCRYPTION_KEY")
	blindIndexSecret := requireEnv("BLIND_INDEX_SECRET")
	hmacSecret := requireEnv("HMAC_SECRET")

	// Optional with defaults
	port := getEnv("SERVER_PORT", "8088")
	allowedOrigin := getEnv("CORS_ALLOWED_ORIGIN", "")

	accessExpiryStr := getEnv("JWT_ACCESS_EXPIRY_MINUTES", "15")
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

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(30 * time.Minute)

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
	levelsSvc := levels.NewService(queries)
	devicesSvc := devices.NewService(queries)
	if getBoolEnv("LEGAL_MAINTENANCE_ENABLED", false) {
		maintenanceSvc := maintenance.NewService(queries, maintenance.Config{
			EncryptionKey:        encryptionKey,
			BlindIndexSecret:     []byte(blindIndexSecret),
			PendingTutorTTL:      getDurationEnv("PENDING_TUTOR_TTL", 48*time.Hour),
			InactiveSuspendAfter: getDurationEnv("INACTIVE_SUSPEND_AFTER", 365*24*time.Hour),
			SuspendedCancelAfter: getDurationEnv("SUSPENDED_CANCEL_AFTER", 30*24*time.Hour),
			BatchSize:            getInt32Env("LEGAL_MAINTENANCE_BATCH_SIZE", 100),
		})
		maintenance.StartScheduler(
			context.Background(),
			maintenanceSvc,
			getDurationEnv("LEGAL_MAINTENANCE_INTERVAL", 24*time.Hour),
			log.Default(),
		)
		log.Println("[INFO] Legal maintenance scheduler enabled")
	}

	// ── Router wiring ─────────────────────────────────────────────────────────
	r := chi.NewRouter()
	transport.SetupRoutes(r, transport.RouterDependencies{
		AuthHandler:    auth.NewHandler(authSvc),
		SyncHandler:    syncSvc.NewHandler(syncService),
		LevelsHandler:  levels.NewHandler(levelsSvc),
		DevicesHandler: devices.NewHandler(devicesSvc),
		ReadyCheck:     db.PingContext,
		TokenCfg:       tokenCfg,
		Queries:        queries,
		AllowedOrigin:  allowedOrigin,
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

	fmt.Printf("[USBI Backend] Listening on :%s (HTTP)\n", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("[FATAL] Server startup failed: %v", err)
	}
}

func loadEnvironment() {
	if envFile := os.Getenv("USBI_BACKEND_ENV_FILE"); envFile != "" {
		if err := godotenv.Load(envFile); err != nil {
			log.Printf("[WARN] %s not found or unreadable — reading from system environment", envFile)
		}
		return
	}

	// Load .env in development. In production, vars normally come from systemd,
	// Docker, or the hosting environment.
	if err := godotenv.Load(); err != nil {
		log.Println("[WARN] .env not found — reading from system environment")
	}
}

func databaseURL() string {
	if val := os.Getenv("DATABASE_URL"); val != "" {
		return val
	}

	dbUser := requireEnv("DB_USER")
	dbPassword := requireEnv("DB_PASSWORD")
	dbHost := requireEnv("DB_HOST")
	dbPort := getEnv("DB_PORT", "5432")
	dbName := requireEnv("DB_NAME")
	sslMode := getEnv("DB_SSLMODE", "disable")

	dsn := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(dbUser, dbPassword),
		Host:   fmt.Sprintf("%s:%s", dbHost, dbPort),
		Path:   dbName,
	}
	query := dsn.Query()
	query.Set("sslmode", sslMode)
	dsn.RawQuery = query.Encode()
	return dsn.String()
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

func getBoolEnv(key string, fallback bool) bool {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(val)
	if err != nil {
		log.Fatalf("[FATAL] Invalid %s: %v", key, err)
	}
	return parsed
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(val)
	if err != nil {
		log.Fatalf("[FATAL] Invalid %s: %v", key, err)
	}
	return parsed
}

func getInt32Env(key string, fallback int32) int32 {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(val, 10, 32)
	if err != nil || parsed <= 0 {
		log.Fatalf("[FATAL] Invalid %s: %v", key, err)
	}
	return int32(parsed)
}
