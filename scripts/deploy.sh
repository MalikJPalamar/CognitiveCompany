#!/bin/bash
# scripts/deploy.sh
# Deploy agent system to Hostinger VPS.
# Run from local machine: bash scripts/deploy.sh
#
# Required env vars (set in your local shell or .env):
#   VPS_HOST  — VPS IP or hostname
#   VPS_USER  — SSH username (default: malik)

set -euo pipefail

VPS_HOST="${VPS_HOST:?VPS_HOST not set}"
VPS_USER="${VPS_USER:-malik}"
APP_DIR="/opt/agent-system"

echo "=== Deploying to ${VPS_USER}@${VPS_HOST}:${APP_DIR} ==="
echo "Timestamp: $(date)"

# ── Pre-flight: validate env vars ─────────────────────────────────────────────
echo "[0/4] Validating environment..."
bash "$(dirname "$0")/validate-env.sh"

# ── 1. Sync files ─────────────────────────────────────────────────────────────
echo "[1/4] Syncing files..."
rsync -avz \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.docker-data' \
  --exclude='*.log' \
  ./ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/"

# ── 2. SSH and deploy ─────────────────────────────────────────────────────────
echo "[2/4] Running remote deployment..."
# shellcheck disable=SC2087
ssh "${VPS_USER}@${VPS_HOST}" << 'REMOTE_EOF'
  set -euo pipefail
  cd /opt/agent-system

  echo "  → Installing dependencies..."
  npm install --production

  echo "  → Pulling Docker images..."
  docker compose -f docker-compose.prod.yml pull --quiet

  echo "  → Starting / updating services..."
  docker compose -f docker-compose.prod.yml up -d \
    --remove-orphans \
    --no-deps \
    neo4j graphiti chroma postgres redis

  echo "  → Waiting for core services to be healthy..."
  sleep 10

  echo "  → Starting application services..."
  docker compose -f docker-compose.prod.yml up -d \
    --no-deps \
    trigger-webapp agent-api

  echo "  → Service status:"
  docker compose -f docker-compose.prod.yml ps
REMOTE_EOF

# ── 3. Health check ───────────────────────────────────────────────────────────
echo "[3/4] Running health check..."
sleep 5

# Check agent API (via nginx proxy)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Api-Key: ${AGENT_API_KEY:-}" \
  "https://api.${DOMAIN:-yourdomain.com}/health" 2>/dev/null || echo "000")

if [ "${HTTP_STATUS}" = "200" ]; then
  echo "  ✓ Agent API healthy (HTTP ${HTTP_STATUS})"
else
  echo "  ! Agent API returned HTTP ${HTTP_STATUS} — check logs"
fi

# ── 4. Summary ────────────────────────────────────────────────────────────────
echo "[4/4] Deployment complete"
echo ""
echo "Services:"
echo "  Trigger.dev UI → https://trigger.${DOMAIN:-yourdomain.com}"
echo "  Agent API      → https://api.${DOMAIN:-yourdomain.com}"
echo "  Neo4j Browser  → http://${VPS_HOST}:7474 (internal only)"
