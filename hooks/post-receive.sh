#!/bin/bash
set -e

echo "Deploy start"

cd "/home/waserk/git/wk-server-web"
docker compose down
docker compose up -d --build

echo "Deploy done"