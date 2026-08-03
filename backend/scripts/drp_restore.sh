#!/usr/bin/env bash
# ============================================================================
# USBI Platform — DRP Restore Script (companion to drp_backup.sh)
# Restores a .sql.zst backup produced by drp_backup.sh via psql. Verifies the
# accompanying .sha256 checksum first when present.
#
# Required env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# Usage:        drp_restore.sh <path-to-backup.sql.zst> [--yes]
#
# DESTRUCTIVE: this restores INTO PGDATABASE, which must already exist and be
# empty (or acceptably overwritable) — a plain-format pg_dump replays CREATE
# TABLE/INSERT statements and will error on objects that already exist. It
# does not drop or create the target database itself; that is a deliberate
# choice so this script can never accidentally destroy the wrong database by
# typo — create/drop PGDATABASE yourself first if you're restoring in place.
#
# Without --yes, asks for interactive confirmation naming the exact target
# (host/database) before doing anything.
# ============================================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
CONFIRM_FLAG="${2:-}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "[ERROR] Usage: $0 <path-to-backup.sql.zst> [--yes]" >&2
    exit 1
fi
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup file not found: ${BACKUP_FILE}" >&2
    exit 1
fi

for var in PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE; do
    if [ -z "${!var:-}" ]; then
        echo "[ERROR] Required environment variable '$var' is not set." >&2
        exit 1
    fi
done

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Verifying checksum..."
    if ! sha256sum -c "${CHECKSUM_FILE}"; then
        echo "[ERROR] Checksum verification FAILED — backup file may be corrupt. Aborting." >&2
        exit 1
    fi
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Checksum OK."
else
    echo "[WARN] No checksum file found at ${CHECKSUM_FILE} — this backup predates" >&2
    echo "[WARN] checksum support, or the sidecar was lost. Proceeding without" >&2
    echo "[WARN] integrity verification." >&2
fi

if [ "${CONFIRM_FLAG}" != "--yes" ]; then
    echo ""
    echo "About to restore:"
    echo "  Source: ${BACKUP_FILE}"
    echo "  Target: ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"
    echo ""
    echo "This will replay every statement in the dump against that database."
    echo "It is NOT a clean slate: existing tables/rows with the same identity"
    echo "will cause errors or duplicate-key failures partway through."
    echo ""
    read -r -p "Type the database name (${PGDATABASE}) to confirm: " typed
    if [ "${typed}" != "${PGDATABASE}" ]; then
        echo "[ERROR] Confirmation did not match. Aborting." >&2
        exit 1
    fi
fi

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Restoring ${BACKUP_FILE} into ${PGDATABASE}..."
zstd -dc "${BACKUP_FILE}" | PGPASSWORD="${PGPASSWORD}" psql \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    -d "${PGDATABASE}" \
    --no-password \
    -v ON_ERROR_STOP=1 \
    --single-transaction

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Restore completed successfully."
