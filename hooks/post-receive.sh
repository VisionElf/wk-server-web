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

WEB_ROOT="/var/www/wk-server-web"

echo "--> Checkout code"
git --work-tree="$APP_DIR" --git-dir "$REPO_DIR" checkout -f "$BRANCH"

echo "--> Deploy start ==="

cd "$APP_DIR"

echo "--> Build frontend"

cd "$FRONT_DIR"
npm ci
npm run build

echo "--> Move Front to /var/www/"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete "$FRONT_DIR/dist/" "$WEB_ROOT/"

echo "--> Set permissions"
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo find "$WEB_ROOT" -type d -exec chmod 755 {} \;
sudo find "$WEB_ROOT" -type f -exec chmod 644 {} \;

echo "--> Build and restart backend container"
cd "$APP_DIR"
docker compose down
docker compose up -d --build

echo "=== Deploy done ==="

docker compose ps -a