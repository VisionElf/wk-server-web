#!/bin/bash
set -e

echo "=== POST RECEIVE START ==="

HOME_DIR="/home/waserk"

source "$HOME_DIR/.nvm/nvm.sh"
nvm use 20

echo "USER=$(whoami)"
which node
node -v

BRANCH="main"
REPO_DIR="$HOME_DIR/git/wk-server-web.git"

APP_DIR="$HOME_DIR/apps/wk-server-web"
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