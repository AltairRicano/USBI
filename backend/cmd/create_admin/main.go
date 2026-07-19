package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/altair/usbi-backend/internal/auth"
	"github.com/altair/usbi-backend/internal/crypto"
	"github.com/altair/usbi-backend/internal/repository"
	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {}
	ctx := context.Background()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

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
