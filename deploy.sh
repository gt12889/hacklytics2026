#!/usr/bin/env bash
# deploy.sh — Deploy RxGuard to Vultr VPS (66.42.91.56)
# Run this script ON the Vultr server after cloning the repo.
#
# Usage:
#   ssh root@66.42.91.56
#   git clone <repo-url> hacklytics2026
#   cd hacklytics2026
#   bash deploy.sh
set -euo pipefail

echo "=== RxGuard Deployment ==="

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "[1/5] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
else
    echo "[1/5] Docker already installed."
fi

# 2. Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo "[2/5] Installing Docker Compose plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
else
    echo "[2/5] Docker Compose already installed."
fi

# 3. Open firewall ports
echo "[3/5] Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    echo "y" | ufw enable || true
fi

# 4. Create .env if missing
if [ ! -f .env ]; then
    echo "[4/5] Creating .env template..."
    cat > .env <<'ENVEOF'
# RxGuard Environment Configuration
# GEMINI_API_KEY=your-gemini-api-key-here
# FDA_API_KEY=your-fda-api-key-here
VECTORDB_ADDRESS=vectoraidb:50051
ENVEOF
    echo "  -> Edit .env with your API keys before starting the app."
else
    echo "[4/5] .env already exists."
fi

# 5. Build and start all services
echo "[5/5] Building and starting containers..."
docker compose up --build -d

echo ""
echo "=== Deployment Complete ==="
echo "RxGuard is now running at:"
echo "  http://rxguard.live"
echo "  http://66.42.91.56"
echo ""
echo "To add HTTPS (recommended), run:"
echo "  docker run --rm -v certbot-webroot:/var/www/certbot -v letsencrypt:/etc/letsencrypt \\"
echo "    certbot/certbot certonly --webroot -w /var/www/certbot -d rxguard.live -d www.rxguard.live"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f          # View logs"
echo "  docker compose ps               # Check service status"
echo "  docker compose down              # Stop all services"
echo "  docker compose up --build -d     # Rebuild and restart"
