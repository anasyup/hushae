@echo off
REM ==============================================================
REM  VELOURA — one-click local start (Windows)
REM  Double-click this file. Two windows will open:
REM    1) Veloura API  (backend, port 4000)
REM    2) Veloura Web  (storefront, port 5173)
REM  Then open http://localhost:5173 in your browser.
REM ==============================================================
cd /d %~dp0

echo [1/3] Preparing backend...
cd backend
if not exist node_modules call npm install --no-audit --no-fund
if not exist .env copy .env.example .env >nul
cd ..

echo [2/3] Preparing frontend...
cd frontend
if not exist node_modules call npm install --no-audit --no-fund
if not exist .env copy .env.example .env >nul
cd ..

echo [3/3] Starting VELOURA...
echo.
echo   NOTE: The very first start downloads an embedded MongoDB (~90 MB, one time only).
echo   After that, startup takes just a few seconds.
echo.
start "Veloura API - keep open" cmd /k "cd backend && npm run dev"
timeout /t 6 /nobreak >nul
start "Veloura Web - keep open" cmd /k "cd frontend && npm run dev"

echo.
echo   Storefront:  http://localhost:5173
echo   Admin panel: http://localhost:5173/admin
echo   API health:  http://localhost:4000/api/health
echo.
echo   Admin login: admin@veloura.pk / VelouraAdmin@123
echo.
pause
