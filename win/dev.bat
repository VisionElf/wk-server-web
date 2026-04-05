@echo off
cd /d "%~dp0.."

docker compose down
docker compose up api db -d

cd frontend\wk-frontend
call npm install
call npm run dev
