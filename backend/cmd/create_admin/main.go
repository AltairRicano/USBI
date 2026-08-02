package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"github.com/altair/usbi-backend/internal/audit"
	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/config"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/repository"
	_ "github.com/lib/pq"
)

func main() {
	config.LoadEnvironment()
	ctx := context.Background()
	dbURL := config.DatabaseURL()

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	queries := repository.New(db)
	cfg := auth.Config{
		EncryptionKey:    config.RequireSecret("PGP_ENCRYPTION_KEY"),
		BlindIndexSecret: []byte(config.RequireSecret("BLIND_INDEX_SECRET")),
		HMACSecret:       []byte(config.RequireSecret("HMAC_SECRET")),
		TokenConfig: crypto.TokenConfig{
			Secret: []byte(config.RequireSecret("JWT_SECRET")),
		},
	}

	svc := auth.NewService(queries, cfg)

	// Credentials come from the environment — never hardcoded. Without this the
	// initial admin login would be public knowledge from the repository.
	adminPassword := config.RequireEnv("ADMIN_PASSWORD")
	if len(adminPassword) < 12 {
		log.Fatalf("ADMIN_PASSWORD must be at least 12 characters (got %d)", len(adminPassword))
	}
	req := auth.RegisterRequest{
		FullName:             config.GetEnv("ADMIN_FULL_NAME", "Admin USBI"),
		Email:                config.RequireEnv("ADMIN_EMAIL"),
		Password:             adminPassword,
		IsAdult:              true,
		PrivacyNoticeVersion: config.GetEnv("ADMIN_PRIVACY_NOTICE_VERSION", "v1.0"),
	}

	resp, err := svc.Register(ctx, req)
	if err != nil {
		log.Fatalf("Failed to register: %v", err)
	}

	fmt.Printf("Registered user: %v\n", resp.UserID)

	// Now promote to admin
	_, err = db.ExecContext(ctx, "UPDATE users SET role = 'admin' WHERE id = $1", resp.UserID)
	if err != nil {
		log.Fatalf("Failed to promote: %v", err)
	}

	// No-Repudio: record the privilege escalation in the audit ledger (A3).
	if err := audit.Log(ctx, queries, audit.Entry{
		ActorID:    resp.UserID,
		Action:     "admin.bootstrap",
		EntityType: "user",
		EntityID:   resp.UserID,
		Before:     map[string]any{"role": "player"},
		After:      map[string]any{"role": "admin"},
		UserAgent:  "create_admin-cli",
	}); err != nil {
		log.Fatalf("Failed to write audit log: %v", err)
	}

	fmt.Println("Success! Admin user created.")
}
