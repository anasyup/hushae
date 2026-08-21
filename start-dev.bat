@echo off
setlocal enabledelayedexpansion
title HUSHAE Development Launcher
REM ==============================================================
REM  HUSHAE — One-Click Local Starter (Windows)
REM ==============================================================
cd /d "%~dp0"

echo ==============================================================
echo   HUSHAE — Ultra-Luxury Storefront & API Starter
echo ==============================================================
echo.

REM 1. Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo.
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org/
    echo.
    echo After installing, restart your computer or reopen CMD.
    echo.
    pause
    exit /b 1
)

REM 2. Check if NPM is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not recognized! Please reinstall Node.js.
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking & Installing Frontend Dependencies...
cd frontend
if not exist node_modules (
    echo Installing frontend packages (this only takes a moment on first run)...
    call npm install
)
if not exist .env if exist .env.example copy .env.example .env >nul
cd ..

echo [2/3] Checking & Installing Backend Dependencies...
cd backend
if not exist node_modules (
    echo Installing backend packages (this only takes a moment on first run)...
    call npm install
)
if not exist .env if exist .env.example copy .env.example .env >nul
cd ..

echo.
echo [3/3] Starting HUSHAE Development Servers...
echo.
echo Starting Backend API Server (Port 4000)...
start "HUSHAE Backend API (Port 4000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo Starting Frontend Storefront (Port 5173)...
start "HUSHAE Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==============================================================
echo   Servers are starting up!
echo.
echo   Storefront:  http://localhost:5173
echo   Admin Panel: http://localhost:5173/admin
echo   API Health:  http://localhost:4000/api/health
echo.
echo   Note: If you only want to work on UI/Frontend, the frontend
echo   automatically proxies live data from https://hushae1.vercel.app
echo ==============================================================
echo.

REM Wait 3 seconds and optionally open browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo Press any key to close this launcher window (servers stay running in background).
pause >nul
