@echo off
setlocal
title Punjab Industrial Survey - Launcher
if /i "%~1"=="/help" goto help
if /i "%~1"=="--help" goto help
if not "%~1"=="" if /i not "%~1"=="/check" goto help

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Install Node.js LTS and reopen this window.
    exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm.cmd is not on PATH.
    exit /b 1
)
if not exist "%~dp0backend\.env" if not defined JWT_SECRET (
    echo ERROR: Configure backend\.env before starting. See documentation\how-to-run.md.
    exit /b 1
)
if not exist "%~dp0backend\node_modules\@nestjs\core\package.json" (
    echo ERROR: Run npm ci in the backend folder first.
    exit /b 1
)
if not exist "%~dp0frontend\node_modules\vite\package.json" (
    echo ERROR: Run npm ci in the frontend folder first.
    exit /b 1
)
if /i "%~1"=="/check" (
    echo Launcher prerequisites found. No servers were started.
    echo The backend checks configuration values and database connectivity at startup.
    exit /b 0
)

powershell -NoProfile -Command "$ports = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3002, 5173 }; if ($ports) { $ports | Select-Object LocalPort, OwningProcess | Format-Table; exit 1 }"
if errorlevel 1 (
    echo ERROR: A required port is occupied, or the port check failed.
    echo Close the existing server before starting another copy. No processes were stopped.
    exit /b 1
)

start "Survey Backend :3002" cmd /k "cd /d ""%~dp0backend"" && title Survey Backend :3002 && npm.cmd run start:dev"
start "Survey Frontend :5173" cmd /k "cd /d ""%~dp0frontend"" && title Survey Frontend :5173 && npm.cmd run dev -- --port 5173 --strictPort"
echo Backend and frontend startup requested. Check both windows for errors.
echo Backend reads backend\.env; existing environment variables take precedence.
echo Use PORT=3002 for the local Vite proxy. DATABASE_URL overrides DB_* settings.
echo Backend: http://localhost:3002
echo Frontend: http://localhost:5173
echo Refresh the browser once both servers report ready.
start "" "http://localhost:5173"
exit /b 0

:help
echo Usage: START.bat [/check ^| /help]
echo Starts the backend and frontend in separate named command windows.
echo /check validates prerequisites without installing packages or starting servers.
echo Configure backend\.env first; no database credentials are set by this launcher.
echo Local PostgreSQL is optional when DATABASE_URL points to Neon.
exit /b 0
