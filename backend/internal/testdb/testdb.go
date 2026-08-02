// Package testdb provides an isolated, real-Postgres test database for
// integration tests (audit finding B9). It exists specifically so
// internal/sync, internal/maintenance, and internal/auth can test their
// transactional, security-relevant paths (HMAC rejection, idempotency,
// pseudonymization, audit logging) against real SQL — never mocked, per this
// project's own rule against mocking cryptography/security behavior in tests
// that claim to validate it.
//
// Isolation model: every call to Setup creates a brand-new, randomly-named
// Postgres SCHEMA (e.g. "usbi_test_a1b2c3d4") inside whatever database
// TEST_DATABASE_URL points at, applies every migration from backend/migrations
// into that schema only (via search_path — never touching the "public"
// schema other than to resolve pgcrypto's functions), and drops the schema
// again in t.Cleanup. It is safe to point TEST_DATABASE_URL at a real
// development database that already has real data in "public": these tests
// never read or write anything outside their own throwaway schema.
//
// TEST_DATABASE_URL is intentionally opt-in: if it's unset, Setup calls
// t.Skip so `go test ./...` stays green in any environment without a
// reachable Postgres (CI runners, other machines, etc).
package testdb

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"

	"github.com/altair/usbi-backend/internal/repository"
	"github.com/lib/pq"
)

// migrationsDir is resolved relative to this source file, not the caller's
// working directory, so Setup works identically no matter which package
// imports testdb.
func migrationsDir() string {
	_, thisFile, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "migrations")
}

// Setup creates an isolated schema, applies all migrations into it, and
// returns both a *repository.Queries scoped to it and the underlying *sql.DB
// (for tests that need to assert on rows directly with plain SQL, since
// repository.Queries doesn't expose an ad-hoc query method). Every pooled
// connection is pinned to the schema via the connection-level
// `options=-c search_path=...` parameter, so this is safe under concurrent
// queries within a test, not just a single connection.
func Setup(t *testing.T) (*repository.Queries, *sql.DB) {
	t.Helper()

	rawDSN := os.Getenv("TEST_DATABASE_URL")
	if rawDSN == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping integration test (see internal/testdb doc comment)")
	}

	kvDSN, err := toKeywordDSN(rawDSN)
	if err != nil {
		t.Fatalf("testdb: parsing TEST_DATABASE_URL: %v", err)
	}

	admin, err := sql.Open("postgres", kvDSN)
	if err != nil {
		t.Fatalf("testdb: opening admin connection: %v", err)
	}
	t.Cleanup(func() { _ = admin.Close() })
	if err := admin.Ping(); err != nil {
		t.Fatalf("testdb: TEST_DATABASE_URL unreachable: %v", err)
	}

	schema := "usbi_test_" + randomHex(8)
	if _, err := admin.Exec(fmt.Sprintf(`CREATE SCHEMA %s`, quoteIdent(schema))); err != nil {
		t.Fatalf("testdb: creating schema %s: %v", schema, err)
	}
	t.Cleanup(func() {
		if _, err := admin.Exec(fmt.Sprintf(`DROP SCHEMA IF EXISTS %s CASCADE`, quoteIdent(schema))); err != nil {
			t.Logf("testdb: failed to drop schema %s (manual cleanup may be needed): %v", schema, err)
		}
	})

	// Every connection in this second pool gets search_path pinned to our
	// schema (falling back to public for pgcrypto's functions) at connection
	// startup — a plain `SET search_path` on one pooled connection would not
	// apply to the others database/sql opens later.
	scopedDSN := fmt.Sprintf("%s options='-c search_path=%s,public'", kvDSN, schema)
	db, err := sql.Open("postgres", scopedDSN)
	if err != nil {
		t.Fatalf("testdb: opening scoped connection: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatalf("testdb: scoped connection unreachable: %v", err)
	}

	applyMigrations(t, db)

	return repository.New(db), db
}

func applyMigrations(t *testing.T, db *sql.DB) {
	t.Helper()

	dir := migrationsDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("testdb: reading migrations dir %s: %v", dir, err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files) // filenames are zero-padded (0001_, 0002_, ...): lexical order == intended order.

	for _, name := range files {
		raw, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatalf("testdb: reading migration %s: %v", name, err)
		}
		if _, err := db.Exec(upOnly(string(raw))); err != nil {
			t.Fatalf("testdb: applying migration %s: %v", name, err)
		}
	}
}

// upOnly strips a goose "-- +goose Down" section and everything after it.
// Only 0001_initial.up.sql has goose annotations (an Up section followed by a
// Down section with DROP TABLE statements); every later migration is plain
// forward-only SQL and this is a no-op for those.
func upOnly(raw string) string {
	if idx := strings.Index(raw, "-- +goose Down"); idx != -1 {
		return raw[:idx]
	}
	return raw
}

// toKeywordDSN normalises either a postgres:// URL or an already-keyword=value
// DSN into keyword=value form, so callers can safely append ` options=...`.
func toKeywordDSN(dsn string) (string, error) {
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		return pq.ParseURL(dsn)
	}
	return dsn, nil
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func randomHex(n int) string {
	b := make([]byte, n/2)
	if _, err := rand.Read(b); err != nil {
		panic(err) // crypto/rand failing is unrecoverable
	}
	return hex.EncodeToString(b)
}
