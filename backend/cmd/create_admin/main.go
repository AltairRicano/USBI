package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/repository"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	loadEnvironment()
	ctx := context.Background()
	dbURL := databaseURL()

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	queries := repository.New(db)
	cfg := auth.Config{
		EncryptionKey:    os.Getenv("PGP_ENCRYPTION_KEY"),
		BlindIndexSecret: []byte(os.Getenv("BLIND_INDEX_SECRET")),
		HMACSecret:       []byte(os.Getenv("HMAC_SECRET")),
		TokenConfig: crypto.TokenConfig{
			Secret: []byte(os.Getenv("JWT_SECRET")),
		},
	}

	svc := auth.NewService(queries, cfg)

	req := auth.RegisterRequest{
		FullName:             "Admin USBI",
		Email:                "admin@usbi.edu.mx",
		Password:             "Password123!",
		IsAdult:              true,
		PrivacyNoticeVersion: "v1.0",
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

	fmt.Println("Success! Admin user created.")
}

func loadEnvironment() {
	if envFile := os.Getenv("USBI_BACKEND_ENV_FILE"); envFile != "" {
		if err := godotenv.Load(envFile); err != nil {
			log.Printf("[WARN] %s not found or unreadable — reading from system environment", envFile)
		}
		return
	}
	if err := godotenv.Load(); err != nil {
		log.Println("[WARN] .env not found — reading from system environment")
	}
}

func databaseURL() string {
	if val := os.Getenv("DATABASE_URL"); val != "" {
		return val
	}

	dsn := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(requireEnv("DB_USER"), requireEnv("DB_PASSWORD")),
		Host:   fmt.Sprintf("%s:%s", requireEnv("DB_HOST"), getEnv("DB_PORT", "5432")),
		Path:   requireEnv("DB_NAME"),
	}
	query := dsn.Query()
	query.Set("sslmode", getEnv("DB_SSLMODE", "disable"))
	dsn.RawQuery = query.Encode()
	return dsn.String()
}

func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("%s is not set", key)
	}
	return val
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
