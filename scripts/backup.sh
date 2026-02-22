#!/bin/bash
# scripts/backup.sh
# Backup Neo4j and Postgres data from VPS.
# Run via cron: 0 2 * * * /opt/agent-system/scripts/backup.sh
# Retains last 7 daily backups.

set -euo pipefail

BACKUP_DIR="/opt/backups/agent-system"
DATE=$(date +%Y-%m-%d)
RETAIN_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup..."

# ── Neo4j dump ────────────────────────────────────────────────────────────────
echo "  → Backing up Neo4j..."
docker compose -f /opt/agent-system/docker-compose.prod.yml exec -T neo4j \
  neo4j-admin database dump --database=neo4j \
  > "${BACKUP_DIR}/neo4j-${DATE}.dump"

echo "  ✓ Neo4j: ${BACKUP_DIR}/neo4j-${DATE}.dump"

# ── Postgres dump ─────────────────────────────────────────────────────────────
echo "  → Backing up Postgres..."
docker compose -f /opt/agent-system/docker-compose.prod.yml exec -T postgres \
  pg_dump -U trigger trigger_dev \
  > "${BACKUP_DIR}/postgres-${DATE}.sql"

echo "  ✓ Postgres: ${BACKUP_DIR}/postgres-${DATE}.sql"

# ── Compress ──────────────────────────────────────────────────────────────────
tar -czf "${BACKUP_DIR}/backup-${DATE}.tar.gz" \
  "${BACKUP_DIR}/neo4j-${DATE}.dump" \
  "${BACKUP_DIR}/postgres-${DATE}.sql"

rm -f "${BACKUP_DIR}/neo4j-${DATE}.dump" "${BACKUP_DIR}/postgres-${DATE}.sql"

# ── Rotate old backups ────────────────────────────────────────────────────────
find "${BACKUP_DIR}" -name "backup-*.tar.gz" -mtime "+${RETAIN_DAYS}" -delete

echo "[$(date)] Backup complete: ${BACKUP_DIR}/backup-${DATE}.tar.gz"
