@echo off
title Punjab Survey - Database Setup
color 2F
cls

echo ============================================
echo   Punjab Industrial Survey - DB Setup
echo ============================================
echo.
echo This will create the database, schema, and seed data.
echo PostgreSQL must be running first.
echo.

set PGPASSWORD=postgres123
set PGUSER=postgres
set PGHOST=localhost
set PGPORT=5432
set DBNAME=punjab_industrial_survey

:: ── Find psql ───────────────────────────────────
set PSQL=psql
where psql >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\17\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\15\bin\psql.exe"
    if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set PSQL="C:\Program Files\PostgreSQL\14\bin\psql.exe"
)

echo [1/5] Creating database "%DBNAME%"...
%PSQL% -U %PGUSER% -h %PGHOST% -p %PGPORT% -c "CREATE DATABASE %DBNAME%;" 2>nul
echo       Done (ignore 'already exists' warnings).

echo [2/5] Enabling extensions...
%PSQL% -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %DBNAME% -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pgcrypto;" >nul 2>&1
echo       Done.

echo [3/5] Running schema.sql...
%PSQL% -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %DBNAME% -f "%~dp0database\schema.sql"
echo       Done.

echo [4/5] Running seed.sql (creates users + reference data)...
%PSQL% -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %DBNAME% -f "%~dp0database\seed.sql"
echo       Done.

echo [5/6] Running seed_punjab_geography.sql...
%PSQL% -v ON_ERROR_STOP=1 -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %DBNAME% -f "%~dp0database\seed_punjab_geography.sql"
if errorlevel 1 (
    echo ERROR: Could not load Punjab geography reference data.
    pause
    exit /b 1
)
echo       Done.

echo [6/6] Running seed_classification_codes.sql...
%PSQL% -v ON_ERROR_STOP=1 -U %PGUSER% -h %PGHOST% -p %PGPORT% -d %DBNAME% -f "%~dp0database\seed_classification_codes.sql"
if errorlevel 1 (
    echo ERROR: Could not load PSIC and HS-code reference data.
    pause
    exit /b 1
)
echo       Done.

echo.
echo ============================================
echo   Database setup complete!
echo.
echo   Login Credentials:
echo     admin       / admin123
echo     surveyor    / surveyor123
echo     supervisor  / supervisor123
echo.
echo   Now run START.bat to launch the app.
echo ============================================
echo.
pause
