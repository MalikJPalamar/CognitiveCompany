#!/bin/bash
# scripts/validate-env.sh
# Validate that all required environment variables are present before deploying.
# Source your .env first, or pass the path as argument:
#
#   source .env && bash scripts/validate-env.sh
#   bash scripts/validate-env.sh /path/to/.env
#
# Exit codes: 0 = all good, 1 = missing vars

set -euo pipefail

# Optional: load .env file passed as argument
if [ -n "${1:-}" ]; then
  if [ -f "$1" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$1"
    set +a
  else
    echo "ERROR: .env file not found at $1"
    exit 1
  fi
fi

ERRORS=0

check() {
  local var="$1"
  local description="$2"
  local value="${!var:-}"

  if [ -z "${value}" ]; then
    echo "  MISSING  ${var}  —  ${description}"
    ERRORS=$((ERRORS + 1))
  else
    # Mask secrets in output
    if [[ "${var}" == *KEY* ]] || [[ "${var}" == *PASSWORD* ]] || [[ "${var}" == *SECRET* ]] || [[ "${var}" == *TOKEN* ]]; then
      echo "  OK       ${var}  =  ${value:0:6}..."
    else
      echo "  OK       ${var}  =  ${value}"
    fi
  fi
}

echo "=== Environment Validation ==="
echo ""

echo "── Anthropic ───────────────────────────────────────"
check ANTHROPIC_API_KEY "Claude API key (sk-ant-...)"

echo ""
echo "── Memory ──────────────────────────────────────────"
check GRAPHITI_URL      "Graphiti service URL (e.g. http://localhost:8000)"
check NEO4J_PASSWORD    "Neo4j database password"

echo ""
echo "── Trigger.dev ─────────────────────────────────────"
check TRIGGER_SECRET_KEY       "Trigger.dev secret key (32+ chars random)"
check TRIGGER_MAGIC_LINK_SECRET "Trigger.dev magic link secret (32+ chars random)"
check TRIGGER_ENCRYPTION_KEY   "Trigger.dev encryption key (32+ chars random)"
check POSTGRES_PASSWORD        "Postgres password"

echo ""
echo "── Deployment ──────────────────────────────────────"
check VPS_HOST   "VPS IP or hostname"
check VPS_USER   "VPS SSH username"
check DOMAIN     "Root domain (e.g. yourdomain.com)"

echo ""
echo "── API Security ────────────────────────────────────"
check AGENT_API_KEY "Secret key for POST /orchestrate and POST /agent/* endpoints"

echo ""
echo "── External Integrations (optional) ───────────────"
# These are optional but worth surfacing
for var in BRAVE_SEARCH_API_KEY NOTION_TOKEN GITHUB_TOKEN MONDAY_API_KEY; do
  value="${!var:-}"
  if [ -z "${value}" ]; then
    echo "  OPTIONAL ${var}  —  not set (some features will be unavailable)"
  else
    echo "  OK       ${var}  =  ${value:0:6}..."
  fi
done

echo ""

if [ "${ERRORS}" -gt 0 ]; then
  echo "=== FAILED: ${ERRORS} required variable(s) missing ==="
  echo "Copy .env.example to .env and fill in the missing values."
  exit 1
else
  echo "=== All required variables present ==="
fi
