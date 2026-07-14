package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/altair/usbi-backend/internal/transport"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env (development only).
	// In production, secrets come from the system environment or a vault.
	if err := godotenv.Load(); err != nil {
		log.Println("[WARN] .env file not found, reading from system environment.")
	}

	port := getEnv("SERVER_PORT", "8443")
	certFile := getEnv("TLS_CERT_FILE", "cert.pem")
	keyFile := getEnv("TLS_KEY_FILE", "key.pem")

	r := chi.NewRouter()
	transport.SetupRoutes(r)

	// TLS 1.2+ enforced. TLS 1.0 and 1.1 are explicitly disabled (RF69).
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		CurvePreferences: []tls.CurveID{
			tls.X25519,
			tls.CurveP256,
		},
		PreferServerCipherSuites: true,
	}

	server := &http.Server{
		Addr:      ":" + port,
		Handler:   r,
		TLSConfig: tlsConfig,
	}

	fmt.Printf("[USBI Backend] Starting secure server on :%s (TLS 1.2+)\n", port)
	if err := server.ListenAndServeTLS(certFile, keyFile); err != nil {
		log.Fatalf("[FATAL] Server startup failed: %v", err)
	}
}

// getEnv returns the environment variable value or a fallback default.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
