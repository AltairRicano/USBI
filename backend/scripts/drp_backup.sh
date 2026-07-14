#!/usr/bin/env bash
# ============================================================================
# USBI Platform — DRP Automated Backup Script
# Uses pg_dump + zstd compression. Credentials MUST be provided via
# environment variables (never hardcoded).
# Required env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# Optional env: USBI_BACKUP_DIR (default: /var/backups/usbi_db)
#               USBI_BACKUP_RETENTION_DAYS (default: 30)
# ============================================================================
set -euo pipefail

BACKUP_DIR="${USBI_BACKUP_DIR:-/var/backups/usbi_db}"
RETENTION_DAYS="${USBI_BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/usbi_backup_${TIMESTAMP}.sql.zst"

# Validate required environment variables
for var in PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE; do
    if [ -z "${!var:-}" ]; then
        echo "[ERROR] Required environment variable '$var' is not set." >&2
        exit 1
    fi
done

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Starting USBI DB backup..."
echo "  Host:     ${PGHOST}:${PGPORT}"
echo "  Database: ${PGDATABASE}"
echo "  Output:   ${FILENAME}"

# Run pg_dump and compress inline with zstd (level 3 = fast + good ratio)
PGPASSWORD="${PGPASSWORD}" pg_dump \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    -d "${PGDATABASE}" \
    --no-password \
    --format=plain \
    | zstd -3 -c > "${FILENAME}"

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Backup completed: ${FILENAME}"

# Purge backups older than RETENTION_DAYS to stay within the 20GB on-premise limit
find "${BACKUP_DIR}" -name "usbi_backup_*.sql.zst" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Purged backups older than ${RETENTION_DAYS} days."
