#!/bin/bash
set -euo pipefail

# =============================================================
# Liberty Command — VPS Setup Script
# Run this ON YOUR UBUNTU VPS after cloning the repo.
#
# Usage:
#   1. SSH into your VPS
#   2. Clone the repo to /var/www/liberty-command
#   3. cd /var/www/liberty-command
#   4. sudo bash deploy/setup.sh yourdomain.com
# =============================================================

DOMAIN="${1:-}"
APP_DIR="/var/www/liberty-command"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────

if [ "$(id -u)" -ne 0 ]; then
  fail "Run this script with sudo: sudo bash deploy/setup.sh yourdomain.com"
fi

if [ -z "$DOMAIN" ]; then
  fail "Usage: sudo bash deploy/setup.sh yourdomain.com"
fi

if [ ! -f "$APP_DIR/package.json" ]; then
  fail "Expected repo at $APP_DIR — clone it there first"
fi

log "Setting up Liberty Command for $DOMAIN"

# ── Step 1: Install system dependencies ─────────────────────

log "Installing Node.js 22.x, nginx, certbot..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y nginx certbot python3-certbot-nginx
npm install -g pm2

log "Node $(node -v) | npm $(npm -v) | PM2 $(pm2 -v)"

# ── Step 2: Install app dependencies ────────────────────────

cd "$APP_DIR"
log "Installing frontend dependencies..."
npm ci --omit=dev 2>/dev/null || npm install

log "Installing server dependencies..."
cd "$APP_DIR/server"
npm ci --omit=dev 2>/dev/null || npm install

# ── Step 3: Build the React frontend ────────────────────────

cd "$APP_DIR"
log "Building frontend..."
npx vite build
log "Frontend built to $APP_DIR/dist"

# ── Step 4: Configure server environment ─────────────────────

SESSION_SECRET=$(openssl rand -hex 32)

if [ ! -f "$APP_DIR/server/.env" ]; then
  cat > "$APP_DIR/server/.env" <<EOF
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://$DOMAIN
DATABASE_PATH=./data/liberty.db
SESSION_SECRET=$SESSION_SECRET
EOF
  log "Created server/.env with generated SESSION_SECRET"
else
  warn "server/.env already exists — skipping (check CORS_ORIGIN and SESSION_SECRET manually)"
fi

# ── Step 5: Seed the database ────────────────────────────────

cd "$APP_DIR/server"
mkdir -p data

if [ ! -f "data/liberty.db" ]; then
  log "Seeding database..."
  node src/db/seed.js
  log "Database seeded. Default password for all users: liberty"
else
  warn "Database already exists — skipping seed"
fi

# ── Step 6: Configure nginx ─────────────────────────────────

NGINX_CONF="/etc/nginx/sites-available/liberty-command"
sed "s/liberty.yourdomain.com/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf" > "$NGINX_CONF"

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/liberty-command
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
log "nginx configured for $DOMAIN"

# ── Step 7: SSL certificate ─────────────────────────────────

log "Requesting SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
  warn "Certbot failed — make sure DNS for $DOMAIN points to this server's IP"
  warn "Run manually later: sudo certbot --nginx -d $DOMAIN"
}

# ── Step 8: Start the app with PM2 ──────────────────────────

cd "$APP_DIR"
pm2 delete liberty-command 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
log "App running via PM2"

# ── Step 9: Firewall ────────────────────────────────────────

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall configured (22, 80, 443 only)"

# ── Step 10: Backup cron ────────────────────────────────────

chmod +x "$APP_DIR/deploy/backup.sh"
CRON_LINE="0 2 * * * $APP_DIR/deploy/backup.sh >> /var/log/liberty-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "liberty-command"; echo "$CRON_LINE") | crontab -
log "Daily backup cron set for 2:00 AM"

# ── Done ─────────────────────────────────────────────────────

echo ""
echo "==========================================="
echo -e "${GREEN}  Liberty Command is live!${NC}"
echo "==========================================="
echo ""
echo "  URL:      https://$DOMAIN"
echo "  Login:    Any team member name"
echo "  Password: liberty  (change after first login)"
echo ""
echo "  Useful commands:"
echo "    pm2 logs liberty-command    — view server logs"
echo "    pm2 restart liberty-command — restart the server"
echo "    pm2 monit                   — real-time monitoring"
echo ""
echo -e "${YELLOW}  IMPORTANT: Have all team members change their${NC}"
echo -e "${YELLOW}  passwords after first login.${NC}"
echo ""
