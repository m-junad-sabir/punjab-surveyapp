@echo off
title Punjab Survey - Stopping Servers
color 4F
echo.
echo  Stopping all Survey App servers...
echo.

:: Kill node processes on port 3002 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002"') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill node processes on port 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Close the named terminal windows
taskkill /FI "WINDOWTITLE eq Survey Backend - NestJS :3002" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Survey Frontend - Vite :5173" /F >nul 2>&1

echo  Done. All servers stopped.
echo.
timeout /t 2 /nobreak >nul
