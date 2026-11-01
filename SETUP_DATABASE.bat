@echo off
setlocal
title Punjab Survey - Database Setup
if /i "%~1"=="/plan" goto plan
if /i "%~1"=="fresh" goto configure
if /i "%~1"=="migrate" goto configure
goto help

:configure
set "SETUP_MODE=%~1"
if not defined PGHOST set "PGHOST=localhost"
if not defined PGPORT set "PGPORT=5432"
if not defined PGUSER set "PGUSER=postgres"
if not defined DBNAME set "DBNAME=%PGDATABASE%"
if not defined DBNAME set "DBNAME=punjab_industrial_survey"
powershell -NoProfile -Command "if ($env:DBNAME -notmatch '^[A-Za-z_][A-Za-z0-9_]{0,62}$') { exit 1 }"
if errorlevel 1 (
    echo ERROR: DBNAME must be a simple PostgreSQL identifier, at most 63 characters.
    exit /b 1
)

set "PSQL_EXE="
for /f "delims=" %%p in ('where psql.exe 2^>nul') do if not defined PSQL_EXE set "PSQL_EXE=%%p"
if not defined PSQL_EXE for %%v in (18 17 16 15 14) do if not defined PSQL_EXE if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
if not defined PSQL_EXE (
    echo ERROR: Install psql or add the PostgreSQL bin directory to PATH.
    exit /b 1
)

echo Mode: %SETUP_MODE%. Review PGHOST, PGPORT, PGUSER and DBNAME in your own environment.
echo This script does not read backend\.env or DATABASE_URL.
echo Back up existing data before migrating. No credentials are set by this script.
choice /c YN /n /m "Apply SQL to the configured database? [Y/N] "
if errorlevel 2 exit /b 0
if /i "%SETUP_MODE%"=="migrate" goto migrate

echo Creating a NEW database. An existing database makes this step fail safely.
"%PSQL_EXE%" -X -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE %DBNAME%;"
if errorlevel 1 goto failed
"%PSQL_EXE%" -X -v ON_ERROR_STOP=1 -d "%DBNAME%" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
if errorlevel 1 goto failed
call :run schema.sql
if errorlevel 1 goto failed
call :run seed.sql
if errorlevel 1 goto failed
goto references

:migrate
"%PSQL_EXE%" -X -v ON_ERROR_STOP=1 -d "%DBNAME%" -c "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM survey_forms WHERE is_active AND version >= 3) THEN RAISE EXCEPTION 'Upgrade the existing form to version 3 first; see documentation/how-to-run.md'; END IF; END $$;"
if errorlevel 1 goto failed

:references
call :run seed_punjab_geography.sql
if errorlevel 1 goto failed
call :run seed_classification_codes.sql
if errorlevel 1 goto failed
call :run add_common_measurement_units.sql
if errorlevel 1 goto failed
call :run update_zone_type_options.sql
if errorlevel 1 goto failed
call :run update_ownership_legal_structure_options.sql
if errorlevel 1 goto failed
call :run update_section_d_workforce_labels.sql
if errorlevel 1 goto failed
call :run migration_01_users_token_version.sql
if errorlevel 1 goto failed
call :run migration_02_audit_roles.sql
if errorlevel 1 goto failed
call :run migration_03_workforce_gender_other.sql
if errorlevel 1 goto failed
call :run migration_04_duplicate_flags_details.sql
if errorlevel 1 goto failed
call :run migration_05_photo_evidence.sql
if errorlevel 1 goto failed
call :run migration_07_type_of_unit.sql
if errorlevel 1 goto failed
call :run migration_08_section_a_additions.sql
if errorlevel 1 goto failed
call :run migration_09_section_b_operations.sql
if errorlevel 1 goto failed
call :run migration_10_section_c_products.sql
if errorlevel 1 goto failed
echo Setup completed. Phase 5 is deferred; no migration_06 script was executed.
echo Review the role audit above. Existing account roles are never reassigned automatically.
echo Fresh installs need an administrator account provisioned separately; see README.md.
echo Reload the application online to download the latest questionnaire.
exit /b 0

:run
echo Running %~1 ...
"%PSQL_EXE%" -X -v ON_ERROR_STOP=1 -d "%DBNAME%" -f "%~dp0database\%~1"
exit /b %errorlevel%

:failed
echo ERROR: Setup stopped at the first failed command. Review its error above.
echo Earlier files may already have committed. Do not rerun fresh mode on an existing database.
exit /b 1

:plan
echo No SQL will be executed.
echo fresh: create a NEW database; enable pgcrypto and uuid-ossp; schema.sql; seed.sql.
echo migrate: keep the existing database; require active form version 3 or newer.
echo Both modes then run:
echo seed_punjab_geography.sql
echo seed_classification_codes.sql
echo add_common_measurement_units.sql
echo update_zone_type_options.sql
echo update_ownership_legal_structure_options.sql
echo update_section_d_workforce_labels.sql
echo migration_01_users_token_version.sql
echo migration_02_audit_roles.sql [read-only role audit]
echo migration_03_workforce_gender_other.sql
echo migration_04_duplicate_flags_details.sql
echo migration_05_photo_evidence.sql
echo migration_07_type_of_unit.sql
echo migration_08_section_a_additions.sql
echo migration_09_section_b_operations.sql
echo migration_10_section_c_products.sql
echo Phase 5 / migration_06 and legacy cleanup/reset scripts are excluded.
exit /b 0

:help
echo Usage: SETUP_DATABASE.bat fresh ^| migrate ^| /plan
echo No argument displays help without executing SQL.
echo Set PGHOST, PGPORT, PGUSER and DBNAME or PGDATABASE in your environment.
echo Use a private pgpass.conf or enter the password at psql prompts.
echo For Neon also configure PGSSLMODE=verify-full and the correct host/user/database.
echo This script does not load backend\.env or use DATABASE_URL.
echo fresh refuses an existing database. migrate never reruns schema.sql or seed.sql.
echo /plan prints the allowlisted SQL sequence without connecting to any database.
exit /b 0
