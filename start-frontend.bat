@echo off
title HUSHAE Frontend Launcher
cd /d "%~dp0"

echo ==============================================================
echo   HUSHAE — Storefront Quick Launcher (Port 5173)
echo ==============================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

echo.
echo Starting Vite Dev Server on http://localhost:5173...
echo (APIs are automatically proxied to live production server)
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173

call npm run dev
pause
