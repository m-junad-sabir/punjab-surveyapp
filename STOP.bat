@echo off
setlocal
title Punjab Survey - Stop Launcher Servers
if /i "%~1"=="/help" goto help
if /i "%~1"=="--help" goto help
if /i "%~1"=="/check" goto check
if /i "%~1"=="/ports" goto ports
if not "%~1"=="" goto help

echo Closing only the command windows created by START.bat and their child processes.
echo Unsaved in-memory form changes should be saved before stopping servers.
choice /c YN /n /m "Stop the launcher servers? [Y/N] "
if errorlevel 2 exit /b 0
taskkill /FI "WINDOWTITLE eq Survey Backend :3002" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Survey Frontend :5173" /T /F >nul 2>&1
echo Stop requested. Manually started terminals and PostgreSQL are left alone.
echo If a watcher renamed a window, use Ctrl+C in its terminal or STOP.bat /ports.
exit /b 0

:check
powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3002, 5173 } | Select-Object LocalPort, OwningProcess | Format-Table"
echo Dry run only. No processes were stopped.
exit /b 0

:ports
echo This stops Node process trees listening on exactly ports 3002 and 5173.
echo Another Node application on those ports would also be stopped.
choice /c YN /n /m "Continue? [Y/N] "
if errorlevel 2 exit /b 0
powershell -NoProfile -Command "$ids = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3002, 5173 } | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $ids) { $process = Get-Process -Id $processId -ErrorAction SilentlyContinue; if ($process.ProcessName -eq 'node') { taskkill.exe /PID $processId /T /F } }"
exit /b %errorlevel%

:help
echo Usage: STOP.bat [/check ^| /ports ^| /help]
echo Default: confirm and close only START.bat's named command windows.
echo /check lists listeners without stopping anything.
echo /ports confirms before stopping Node listeners on ports 3002 and 5173.
echo Other ports, PostgreSQL, and browser offline data are not touched.
exit /b 0
