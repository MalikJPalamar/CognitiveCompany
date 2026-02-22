#!/bin/bash
# scripts/configure-nginx.sh
# Configure nginx reverse proxy using the domain in .env.
#
# Run AFTER provision-vps.sh and AFTER copying .env to the VPS:
#   bash scripts/configure-nginx.sh
#
# Can be re-run safely (idempotent).

set -euo pipefail

APP_DIR="/opt/agent-system"
NGINX_AVAILABLE="/etc/nginx/sites-available/agent-system"
NGINX_ENABLED="/etc/nginx/sites-enabled/agent-system"
CONF_TEMPLATE="${APP_DIR}/nginx/agent-system.conf"

# ── Load domain from .env ─────────────────────────────────────────────────────
if [ -f "${APP_DIR}/.env" ]; then
  # Source only the DOMAIN line to avoid polluting the environment
  DOMAIN="$(grep -E '^DOMAIN=' "${APP_DIR}/.env" | cut -d= -f2 | tr -d '[:space:]')"
fi

DOMAIN="${DOMAIN:-}"

if [ -z "${DOMAIN}" ]; then
  echo "ERROR: DOMAIN is not set. Add DOMAIN=yourdomain.com to ${APP_DIR}/.env"
  exit 1
fi

echo "=== Configuring nginx for domain: ${DOMAIN} ==="

# ── Substitute domain placeholder in conf template ───────────────────────────
# We replace only the literal string "yourdomain.com" — not any nginx variables
# like $host or $http_upgrade — so sed is safer than envsubst here.
sed "s/yourdomain.com/${DOMAIN}/g" "${CONF_TEMPLATE}" > "${NGINX_AVAILABLE}"

echo "  ✓ Config written to ${NGINX_AVAILABLE}"

# ── Enable site ───────────────────────────────────────────────────────────────
if [ ! -L "${NGINX_ENABLED}" ]; then
  ln -s "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
  echo "  ✓ Site enabled"
fi

# Disable the default nginx site (conflicts with our config)
if [ -L "/etc/nginx/sites-enabled/default" ]; then
  rm /etc/nginx/sites-enabled/default
  echo "  ✓ Default nginx site disabled"
fi

# ── Test and reload ───────────────────────────────────────────────────────────
nginx -t
systemctl reload nginx

echo ""
echo "=== Nginx configured for ${DOMAIN} ==="
echo ""
echo "Next: issue SSL certs:"
echo "  sudo certbot --nginx \\"
echo "    -d api.${DOMAIN} \\"
echo "    -d trigger.${DOMAIN} \\"
echo "    --agree-tos --non-interactive --email your@email.com"
echo ""
