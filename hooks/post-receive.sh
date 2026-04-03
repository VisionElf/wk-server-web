#!/bin/bash
set -e

echo "=== POST RECEIVE START ==="

source "/home/waserk/.nvm/nvm.sh"
nvm use 20

echo "USER=$(whoami)"
echo "HOME=$HOME"
which node
node -v

BRANCH="main"
REPO_DIR="/home/waserk/git/wk-server-web.git"

APP_DIR="/home/waserk/apps/wk-server-web"
FRONT_DIR="$APP_DIR/frontend/wk-frontend"

echo "--> Checkout code"
git --work-tree="$APP_DIR" --git-dir "$REPO_DIR" checkout -f "$BRANCH"

echo "--> Deploy start ==="

cd "$APP_DIR"

echo "--> Build frontend"

cd "$FRONT_DIR"
npm ci
npm run build

echo "--> Build and restart backend container"
cd "$APP_DIR"
docker compose down
docker compose up -d --build

echo "--> Reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "=== Deploy done ==="