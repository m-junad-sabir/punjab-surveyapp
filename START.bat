@echo off
title Punjab Industrial Survey - Launcher
color 1F
cls

echo ============================================
echo   Punjab Industrial Survey App
echo   Starting Backend + Frontend...
echo ============================================
echo.

:: ── Fix PowerShell execution policy ──────────────
powershell -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force" >nul 2>&1

:: ── Check PostgreSQL is running ───────────────────
echo [0/4] Checking PostgreSQL...
sc query postgresql-x64-14 >nul 2>&1
if %errorlevel% neq 0 (
    sc query postgresql-x64-15 >nul 2>&1
    if %errorlevel% neq 0 (
        sc query postgresql-x64-16 >nul 2>&1
        if %errorlevel% neq 0 (
            :: Try starting any postgresql service
            echo       Attempting to start PostgreSQL...
            for /f "tokens=1" %%s in ('sc query type^= all state^= all ^| findstr /i "postgresql"') do (
                net start %%s >nul 2>&1
            )
        )
    )
)

:: Check port 5432 is open
netstat -an | findstr ":5432" >nul 2>&1
if %errorlevel% neq 0 (
    color 4F
    echo.
    echo  ERROR: PostgreSQL is NOT running on port 5432!
    echo.
    echo  Please start PostgreSQL first:
    echo  1. Open "Services" (Win+R, type services.msc)
    echo  2. Find "postgresql-x64-XX" and click Start
    echo  3. OR open pgAdmin and start the server
    echo  4. Then run START.bat again
    echo.
    pause
    exit /b 1
)
echo       PostgreSQL is running on port 5432. OK.

:: ── Install Backend deps if needed ───────────────
echo [1/4] Checking backend dependencies...
if not exist "%~dp0backend\node_modules\@nestjs" (
    echo       Installing backend packages (first time, please wait)...
    cd /d "%~dp0backend"
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo  ERROR: npm install failed for backend!
        pause
        exit /b 1
    )
) else (
    echo       Backend packages OK.
)

:: ── Install Frontend deps if needed ──────────────
echo [2/4] Checking frontend dependencies...
if not exist "%~dp0frontend\node_modules\react" (
    echo       Installing frontend packages (first time, please wait)...
    cd /d "%~dp0frontend"
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo  ERROR: npm install failed for frontend!
        pause
        exit /b 1
    )
) else (
    echo       Frontend packages OK.
)

:: ── Start Backend in new window ───────────────────
echo [3/4] Starting Backend on http://localhost:3000 ...
start "Survey Backend :3000" cmd /k "title Survey Backend :3000 && cd /d "%~dp0backend" && set DB_PASSWORD=postgres123&& set DB_USERNAME=postgres&& set DB_DATABASE=punjab_industrial_survey&& set DB_HOST=localhost&& set DB_PORT=5432&& set PORT=3000&& npm.cmd run start:dev"

:: Wait 5 seconds for NestJS to boot
timeout /t 5 /nobreak >nul

:: ── Start Frontend in new window ──────────────────
echo [4/4] Starting Frontend on http://localhost:5173 ...
start "Survey Frontend :5173" cmd /k "title Survey Frontend :5173 && cd /d "%~dp0frontend" && npm.cmd run dev"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Both servers are starting up!
echo.
echo   Backend  : http://localhost:3000
echo   Frontend : http://localhost:5173
echo.
echo   Test Accounts:
echo     admin       / admin123
echo     surveyor    / surveyor123
echo     supervisor  / supervisor123
echo ============================================
echo.
start "" "http://localhost:5173"
echo   Browser opened. Close this window when done.
echo   To stop servers: run STOP.bat
echo.
pause >nul
