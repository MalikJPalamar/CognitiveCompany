#!/bin/bash
# scripts/provision-vps.sh
# Run ONCE on a fresh Hostinger VPS to set up the base infrastructure.
# Usage: bash scripts/provision-vps.sh

set -euo pipefail

echo "=== Provisioning Agent Infrastructure ==="
echo "Target: $(hostname) — $(date)"

# ── 1. System updates ────────────────────────────────────────────────────────
echo "[1/8] System updates..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Essential packages ─────────────────────────────────────────────────────
echo "[2/8] Installing essentials..."
apt-get install -y -qq \
  curl \
  wget \
  git \
  unzip \
  htop \
  ufw \
  fail2ban

# ── 3. Docker ─────────────────────────────────────────────────────────────────
echo "[3/8] Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Add current user to docker group
usermod -aG docker "${SUDO_USER:-$USER}"

# Docker Compose plugin
apt-get install -y docker-compose-plugin

# ── 4. Node.js 20 ─────────────────────────────────────────────────────────────
echo "[4/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify
node --version
npm --version

# ── 5. Nginx + Certbot ────────────────────────────────────────────────────────
echo "[5/8] Installing Nginx and Certbot..."
apt-get install -y nginx certbot python3-certbot-nginx

systemctl enable nginx
systemctl start nginx

# ── 6. App directory ─────────────────────────────────────────────────────────
echo "[6/8] Creating app directory..."
APP_DIR="/opt/agent-system"
mkdir -p "${APP_DIR}"
chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "${APP_DIR}"

# ── 7. Firewall ───────────────────────────────────────────────────────────────
echo "[7/8] Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (for certbot)
ufw allow 443/tcp   # HTTPS
ufw --force enable

# ── 8. fail2ban (SSH brute-force protection) ──────────────────────────────────
echo "[8/8] Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "=== Provisioning complete ==="
echo ""
echo "Next steps (run from your LOCAL machine unless noted):"
echo "  1. Copy your .env:        scp .env ${SUDO_USER:-user}@<VPS_IP>:${APP_DIR}/.env"
echo "  2. Validate env vars:     ssh <VPS_IP> 'bash ${APP_DIR}/scripts/validate-env.sh ${APP_DIR}/.env'"
echo "  3. Configure nginx:       ssh <VPS_IP> 'bash ${APP_DIR}/scripts/configure-nginx.sh'"
echo "  4. First deploy:          bash scripts/deploy.sh"
echo "  5. Issue SSL certs:       ssh <VPS_IP> 'certbot --nginx -d api.YOURDOMAIN -d trigger.YOURDOMAIN --agree-tos -m your@email.com'"
echo "  6. Verify health:         curl https://api.YOURDOMAIN/health"
echo ""
echo "IMPORTANT: Log out and back in for docker group membership to take effect."
