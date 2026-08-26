@echo off
setlocal
title HUSHAE Development Launcher
cd /d "%~dp0"

echo ==============================================================
echo   HUSHAE - Local Development Launcher (Windows)
echo ==============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js nahi mila. https://nodejs.org se LTS install karo.
    pause
    exit /b 1
)

echo [1/3] Backend packages...
pushd backend
if not exist node_modules call npm install --no-audit --no-fund
if not exist .env copy /y .env.example .env >nul
popd

echo [2/3] Frontend packages...
pushd frontend
if not exist node_modules call npm install --no-audit --no-fund
REM Force Vite proxy. VITE_API_URL=http://localhost:4000 = Failed to fetch.
echo VITE_API_URL=> .env
popd

echo [3/3] Starting API then website...
echo   Pehli dafa Mongo download ho sakta hai (~90 MB, ek martaba).
echo   DONO black windows khuli rehne do.
echo.

start "HUSHAE API (4000) - keep open" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo   API ka wait (port 4000)...
set /a _n=0
:waitapi
timeout /t 3 /nobreak >nul
curl -sf http://127.0.0.1:4000/api/health >nul 2>&1
if %errorlevel%==0 goto apiready
set /a _n+=1
if %_n% geq 40 goto apiready
goto waitapi

:apiready
start "HUSHAE Web (5173) - keep open" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo   Store:  http://localhost:5173
echo   Admin:  http://localhost:5173/admin
echo   Email:  admin@hushae.local
echo   Pass:   admin123
echo.
echo   Admin tab tab kholo jab API window mein "HUSHAE API is running" likha ho.
echo.
timeout /t 4 /nobreak >nul
start "" http://localhost:5173/admin/login
pause
