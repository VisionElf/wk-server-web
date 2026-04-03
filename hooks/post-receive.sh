#!/bin/bash
set -e

APP_DIR="/home/waserk/apps/wk-server-web"
FRONT_DIR="$APP_DIR/frontend/wk-frontend"

echo "=== Deploy start ==="

cd "$APP_DIR"

echo "[1/3] Build frontend"
cd "$FRONT_DIR"
npm ci
npm run build

echo "[2/3] Build and restart backend container"
cd "$APP_DIR"
docker compose down
docker compose up -d --build

echo "[3/3] Reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "=== Deploy done ==="