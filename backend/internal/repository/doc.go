// Package repository is the data-access layer for the USBI backend. It is a
// hand-written Go source file (not generated), so it survives `sqlc generate`
// re-runs and is the right place to document how this package's query
// sourcing actually works — a question audit finding B7 raised and got wrong
// in its first pass, corrected here after verifying real usage (2026-08-02).
//
// # Query sourcing: two coexisting, both real
//
// sqlc.yaml + sql/query.sql generate db.go, models.go, querier.go, and
// query.sql.go from the 18 queries listed there. Audit finding B7 originally
// claimed "none of the 18 generated queries are used outside this package" —
// that was WRONG. A grep-verified check found 14 of the 18 ARE called
// directly from service code: CreateLevel, CreateSection, CreateUser,
// GetUserByEmailHash, GetUserTokenVersion, IncrementAgeUpAttempts,
// IncrementTokenVersion, InsertArcoRequest, InsertExperienceHistory,
// InsertLevelAttempt, LogAdminAudit, UpdateSyncEventStatus,
// UpdateUserAdultStatus, UpsertDailyStreak are all load-bearing production
// code. Only 4 are genuinely dead (superseded by hand-written equivalents):
// GetLevelAttemptsByDate, InsertSyncEvent (see InsertSyncEventWithPayload in
// content_queries.go), ListPublishedLevels, UpsertPlayerProgress (see
// UpsertPlayerProgressForAttempt in content_queries.go).
//
// The other ~35+ real queries (auth, ARCO, levels, devices, badges,
// maintenance, tutor consent, security incidents) are hand-written in
// *_queries.go files in this package, following the exact same
// (ctx, Params struct) -> (Result, error) shape as the generated ones, so
// callers can't tell which is which — and shouldn't need to.
//
// # What finding B7 actually needed to say
//
// Not "sqlc has zero coverage" (false) but: sqlc.yaml only tracks 18 of ~50+
// real queries, so a schema migration that breaks a hand-written query gets
// NO compile-time or generation-time signal — only the 18 tracked ones would.
// That imbalance is real; deleting the sqlc pipeline was the wrong fix for it
// (it would strand 14 in-use generated functions with no regeneration path
// for zero benefit). The confirmed decision (2026-08-02, alongside A7): Go
// stays the single source of truth for business logic, and this package's
// hand-written *_queries.go pattern is the one new queries should follow —
// sql/query.sql + sqlc.yaml are left in place (still useful for the 18 they
// already cover) but are NOT expanded to chase full coverage, and are not
// treated as proof the schema is safe. Verify hand-written queries against
// backend/migrations/ manually when the schema changes.
package repository
