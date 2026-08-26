@echo off

setlocal

title HUSHAE Development Launcher

cd /d "%~dp0"



echo ==============================================================

echo   HUSHAE - Local Development Launcher (Windows)

echo ==============================================================

echo.



REM ---------- 1. Node.js check ----------

where node >nul 2>&1

if errorlevel 1 (

    echo [ERROR] Node.js is not installed or not in PATH.

    echo Install the LTS version from https://nodejs.org/ and try again.

    echo.

    pause

    exit /b 1

)

where npm >nul 2>&1

if errorlevel 1 (

    echo [ERROR] npm is not recognized. Please reinstall Node.js.

    echo.

    pause

    exit /b 1

)



REM ---------- 2. Frontend dependencies ----------

echo [1/4] Checking frontend dependencies...

pushd frontend

if not exist node_modules (

    echo     Installing frontend packages - first run takes a few minutes...

    call npm install --no-audit --no-fund

    if errorlevel 1 (

        echo [ERROR] Frontend npm install failed. Check your internet connection.

        popd

        echo.

        pause

        exit /b 1

    )

)

if not exist .env if exist .env.example copy /y .env.example .env >nul

popd



REM ---------- 3. Backend dependencies ----------

echo [2/4] Checking backend dependencies...

pushd backend

if not exist node_modules (

    echo     Installing backend packages...

    call npm install --no-audit --no-fund

    if errorlevel 1 (

        echo [ERROR] Backend npm install failed. Check your internet connection.

        popd

        echo.

        pause

        exit /b 1

    )

)

if not exist .env if exist .env.example copy /y .env.example .env >nul

popd



REM ---------- 4. MongoDB check: full stack or frontend-only ----------

echo [3/4] Checking MongoDB...

where mongod >nul 2>&1

if errorlevel 1 goto FRONTEND_ONLY



echo     MongoDB found - starting FULL STACK (backend + frontend).

echo.

echo [4/4] Starting servers in separate windows...

start "HUSHAE Backend API (4000)" cmd /k "cd /d ""%~dp0backend"" && npm run dev"

timeout /t 2 /nobreak >nul

start "HUSHAE Frontend (5173)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

goto SUMMARY



:FRONTEND_ONLY

echo     [NOTE] MongoDB is not installed on this PC.

echo     Starting FRONTEND ONLY - API requests will be proxied to the

echo     LIVE backend (https://hushae1.vercel.app) so the UI fully works.

echo     Want the local backend too? Install MongoDB Community Server:

echo     https://www.mongodb.com/try/download/community

echo.

echo [4/4] Starting frontend in live-data mode...

start "HUSHAE Frontend (5173 - live data)" cmd /k "cd /d ""%~dp0frontend"" && set VITE_API_URL=&& set VITE_API_PROXY=https://hushae1.vercel.app&& npm run dev"



:SUMMARY

echo.

echo ==============================================================

echo   Storefront:   http://localhost:5173

echo   Admin Panel:  http://localhost:5173/admin

echo   API Health:   http://localhost:4000/api/health  (full-stack mode)

echo.

echo   Full-stack first run: edit backend\.env - set MONGODB_URI,

echo   JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (details: LOCAL_SETUP.md)

echo ==============================================================

echo.

timeout /t 3 /nobreak >nul

start "" http://localhost:5173

echo Press any key to close this launcher (servers keep running).

pause >nul

