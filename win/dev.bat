@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

docker compose down
docker compose up -d api db --build
if errorlevel 1 (
  echo docker compose failed. Is Docker Desktop running?
  exit /b 1
)

echo Waiting for HTTP 200 from http://127.0.0.1:5122/openapi/v1.json ...
set /a retries=0
:wait_api
curl.exe -sf -o NUL "http://127.0.0.1:5122/openapi/v1.json"
if not errorlevel 1 goto api_ready
set /a retries+=1
if !retries! geq 45 (
  echo.
  echo ERROR: API did not return HTTP 200 on /openapi/v1.json after ~90s.
  echo Check: docker compose ps
  echo Logs: docker compose logs api
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto wait_api

:api_ready
echo API is reachable.

cd frontend\wk-frontend
call npm install
call npm run dev
