@echo off
setlocal
title HUSHAE Frontend Launcher
cd /d "%~dp0"

echo ==============================================================
echo   HUSHAE - Frontend Quick Launcher (Port 5173)
echo ==============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed! Get it from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

pushd frontend
if not exist node_modules (
    echo Installing frontend dependencies - first run takes a few minutes...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check your internet connection.
        popd
        echo.
        pause
        exit /b 1
    )
)
if not exist .env if exist .env.example copy /y .env.example .env >nul

echo.
echo Starting Vite dev server: http://localhost:5173
echo (API is proxied to the local backend on port 4000 by default.
echo  No local backend? Close this and use start-dev.bat instead -
echo  it falls back to the live API automatically.)
echo.
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
call npm run dev
echo.
echo Dev server stopped.
popd
pause
