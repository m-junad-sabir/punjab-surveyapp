# How to Run the Punjab Industrial Survey App

This guide explains how to set up and run the application on a new Windows computer. The app has three parts:

- **Frontend:** React/Vite survey website at `http://localhost:5173`
- **Backend:** NestJS API at `http://localhost:3002`
- **Database:** PostgreSQL with PostGIS at `localhost:5432`

The frontend can save drafts offline in the browser. The backend and database must be running to sign in, download the latest survey form, and synchronize responses.

Delivery checkpoint, 18 October 2026: Phases 0-4 and 7 are implemented. Phase 7
was confirmed working by the owner. Phase 5 was rolled back after login regressions;
Phase 6 autosave/leave protection is deferred. Save drafts explicitly. See the
[workplan](workplan-to-solve-issues.md) for the remaining phases.

## 1. Install the required software

Install the following before starting:

1. **Node.js LTS and npm.** Verify in PowerShell:

   ```powershell
   node --version
   npm --version
   ```

2. **PostgreSQL** (PostgreSQL 16 is the schema's target version) and its **PostGIS** extension. During installation, note the PostgreSQL password, port, and install location.
3. **PostgreSQL command-line tools (`psql`).** Make sure the PostgreSQL `bin` directory is on `PATH`, or use the full path to `psql.exe` in the commands below.
4. **Git**, if you will clone the repository rather than receive a project folder.

The database setup requires a PostgreSQL account that can create databases and install the required extensions (`postgis`, `pg_trgm`, `uuid-ossp`, and `pgcrypto`).

## 2. Get the project files

Clone the repository or extract the project folder somewhere convenient. Open PowerShell in the folder containing `START.bat`, `SETUP_DATABASE.bat`, and the `backend`, `frontend`, and `database` folders.

For example:

```powershell
Set-Location 'C:\Projects\PunjabSurveyApp'
```

Do not share real database passwords, JWT secrets, or production credentials. Each person should use their own local configuration. Before sharing the project folder or a repository, check that no real credentials are included in local configuration files.

## 3. Configure the backend

The API reads settings from `backend\.env`. Create that file if it is missing, then set values for the local PostgreSQL server:

```dotenv
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=REPLACE_WITH_YOUR_LOCAL_POSTGRES_PASSWORD
DB_DATABASE=punjab_industrial_survey
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_LOCAL_SECRET
CORS_ORIGIN=http://localhost:5173
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./uploads
```

Use the username and password created for your PostgreSQL installation. Keep this file private; do not put real secrets in shared source control.

`JWT_SECRET` must contain at least 32 characters; use an independently generated
random secret in each environment. If `DATABASE_URL` is present, the backend
ignores all `DB_*` values. For local PostgreSQL, unset `DATABASE_URL` both in the
shell environment and in `.env`. For Neon, use its URL and TLS settings instead;
no local PostgreSQL service is required. Existing process environment variables
take precedence over `.env`, so restart after configuration changes.

For local frontend development, leave `VITE_API_BASE_URL` unset to use Vite's
`/api` proxy on port 3002. Never put private credentials in `VITE_*` variables.

## 4. Create and populate the database

Start your local PostgreSQL service if using a local database. Do not edit scripts
to save passwords. In PowerShell set the psql connection environment:

```powershell
$env:PGHOST = 'localhost'
$env:PGPORT = '5432'
$env:PGUSER = 'postgres'
$env:DBNAME = 'punjab_industrial_survey'
.\SETUP_DATABASE.bat /plan
# Only for a NEW database:
.\SETUP_DATABASE.bat fresh
```

Use the correct host/user/database for your installation. For Neon set its host,
role and database plus `PGSSLMODE=verify-full`; use `migrate` on a provisioned
Neon database, not `fresh`. Setup reads these PG variables, not backend `.env`
or `DATABASE_URL`. Authentication uses private `%APPDATA%\postgresql\pgpass.conf`
or psql's password prompts. Multiple psql invocations can prompt more than once.

`fresh` creates a NEW database and fails if it already exists. `migrate` keeps
the existing database and never reruns the base schema/seed. Both confirm before
SQL execution and stop on the first SQL error. No arguments show help only;
`/plan` prints the exact sequence without connecting to PostgreSQL.

Fresh setup enables required extensions, loads the unchanged schema/base seed,
then reference seeds/updates and implemented migrations 01-05 and 07. Existing
database migration requires an active form version 3 or newer. Back up before:

```powershell
.\SETUP_DATABASE.bat migrate
```

Phase 5/migration 06, legacy cleanup scripts and credential-reset scripts are
intentionally excluded. If a file fails, earlier files may already be committed;
inspect the error and resume with the appropriate migration, not `fresh` mode.

If `psql` is not found, add the PostgreSQL `bin` directory to `PATH` and reopen PowerShell. The batch file also checks common PostgreSQL install folders, but making `psql` available on `PATH` is the most portable option.

### Manual database setup

Alternatively, run the following from the project root. Replace `postgres` if your database username is different. Enter the password when `psql` prompts; do not put it in a shared command or document.

```powershell
psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE punjab_industrial_survey;"
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\schema.sql
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\seed.sql
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\seed_punjab_geography.sql
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\seed_classification_codes.sql
```

The first command will report an error if the database already exists; for an existing database, skip that command. Do not rerun `schema.sql` on a populated database. The seed files can be rerun to refresh reference data, but `seed.sql` is for initializing a new database.

For an existing database, use the specific migration/update script required for its current schema or survey-form version. Do not run `migrate_full_questionnaire.sql` on a fresh database initialized from the current `schema.sql` and `seed.sql`.

After the manual base/reference setup, run the implemented migrations in order:

```powershell
psql -X -v ON_ERROR_STOP=1 -d punjab_industrial_survey -f database\migration_01_users_token_version.sql
psql -X -v ON_ERROR_STOP=1 -d punjab_industrial_survey -f database\migration_02_audit_roles.sql
psql -X -v ON_ERROR_STOP=1 -d punjab_industrial_survey -f database\migration_03_workforce_gender_other.sql
psql -X -v ON_ERROR_STOP=1 -d punjab_industrial_survey -f database\migration_04_duplicate_flags_details.sql
psql -X -v ON_ERROR_STOP=1 -d punjab_industrial_survey -f database\migration_05_photo_evidence.sql
psql -X -v ON_ERROR_STOP=1 -d punjab_industrial_survey -f database\migration_07_type_of_unit.sql
```

These examples use your psql PG environment; adjust it for the target server.
Review migration 02's role report; it does not automatically correct users.
Migration 07 requires all mapped PSIC classes, including 9609, and aborts if
references are missing. The allowlisted setup modes also run the common units,
zone-type, ownership/legal-structure, and workforce-label updates.

An older version-1 form needs the reviewed full-questionnaire migration, then
the location-selection update to version 3, before these delivery migrations.
Do not apply those legacy form upgrades blindly to a current installation.
For manual SQL, inspect each exit status before proceeding; PowerShell does not
automatically stop a pasted sequence after a failed external command.

### Check that the reference data loaded

Run this query from the project root:

```powershell
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -c "SELECT (SELECT count(*) FROM psic_divisions) AS divisions, (SELECT count(*) FROM psic_groups) AS groups, (SELECT count(*) FROM psic_classes) AS classes, (SELECT count(*) FROM hs_codes) AS hs_codes;"
```

After the classification seed, expected counts are **85 divisions, 234 groups, 415 classes, and 7,512 HS codes**. If the script reports an error or the counts differ, correct the database connection/permissions and rerun `seed_classification_codes.sql` before opening the survey.

## 5. Install application packages

Open a PowerShell window in the project root and install each app's locked dependencies:

```powershell
Set-Location .\backend
npm ci

Set-Location ..\frontend
npm ci

Set-Location ..
```

Run `npm ci` again in the relevant folder after changing computers or when that folder's `node_modules` directory is absent.

## 6. Start the application

### Recommended: use two PowerShell windows

This uses the settings in `backend\.env` directly.

**Window 1 — backend:**

```powershell
Set-Location 'C:\Projects\PunjabSurveyApp\backend'
npm run start:dev
```

Wait for NestJS to report that it is listening on port `3002`.

**Window 2 — frontend:**

```powershell
Set-Location 'C:\Projects\PunjabSurveyApp\frontend'
npm run dev
```

Open **http://localhost:5173** in a browser. Keep both PowerShell windows open while using the application. The Vite development server forwards `/api` requests to the backend on port `3002`.

### Windows shortcut: `START.bat`

Run `START.bat /check` to validate Node/npm, dependency folders and configuration
presence without side effects, then run `START.bat`. It opens two named command
windows and the browser, using `.env` without injecting credentials or changing
execution policy/services. It does not install dependencies or apply SQL. If a
required port is occupied it exits instead of starting another server. Watch both
windows for actual readiness; refresh the browser after they finish booting.

Use `PORT=3002` and frontend port 5173 for this launcher/proxy. A separate preview
on 5174 is not controlled by these scripts. `DATABASE_URL` still takes precedence
over `DB_*`, so Neon works without a local PostgreSQL check.

Stop manually started apps with Ctrl+C in their terminals. `STOP.bat` asks before
closing the launcher's named windows and child processes. `STOP.bat /check`
lists listeners without stopping them. `STOP.bat /ports` is a confirmed fallback
for Node process trees listening on exactly 3002/5173; it could stop another Node
app on those ports, so inspect first. PostgreSQL and browser storage are untouched.

## 7. Sign in and try a survey

Existing users retain their credentials. The current base seed does not create
accounts. For a fresh database, follow the [initial administrator bootstrap](../README.md#4-initial-administrator)
using a bcrypt hash, then sign in and register users through the protected admin
page. Do not depend on or publish demonstration passwords. Advanced user editing
and password reset from Phase 5 are not included in this release.

In Section A, choose Type of Unit at vii. The PSIC class dropdown at viii shows
only L4-mapped classes; changing industry clears the previous class. Group and
division are derived on the server. Other requires specified industry text and
offers PSIC class 9609. The PDF uses the selected industry/class labels. Load
classification references and migration 07 before testing this workflow.

Section L, immediately before submit, requires interview-session and entrance/
signboard photos. Allow camera/location permissions over HTTPS or localhost.
The current rear-camera constraint may reject laptop webcams. On a phone,
accuracy up to 50 m passes; 50-100 m asks for confirmation; over 100 m blocks
capture. Files are watermarked JPEGs stored locally as Blobs and uploaded first.

Local storage uses `backend/uploads` when started from the backend folder. For
Render, use private R2 storage with `STORAGE_DRIVER=s3`, `S3_REGION=auto`,
`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
The endpoint is `https://<account-id>.r2.cloudflarestorage.com`. Do not use
Render's ephemeral filesystem for photos. A future server move requires copying
the objects while preserving stored keys, alongside a database backup.

## 8. Build and type-check

From the project root, run:

```powershell
Set-Location .\frontend
npm run build
npx tsc --noEmit

Set-Location ..\backend
npm run build

Set-Location ..
```

The frontend build is written to `frontend\dist`; the backend build is written to `backend\dist`.

## 9. Offline use

1. Open the app while online and sign in.
2. Download/load the current survey form.
3. After the form has been cached, drafts can be entered while offline in that browser on that device.
4. Reconnect to the internet and use the app's sync action to send pending responses.

Offline drafts are stored in the browser's local storage (IndexedDB). Clearing site data or changing browser/device can remove access to unsynchronized drafts. Sync important work as soon as a connection is available.

Drafts, pending records and sync logs are scoped to their creator. Logout does not
delete them, but another account cannot upload them. Photos remain in the local
Blob store for preview/PDF use. Save explicitly before leaving: autosave and leave
guards are not implemented. Complete an offline-to-online photo sync and confirm
both attachment rows and actual stored/retrievable files before client testing.

## Troubleshooting

### Backend cannot connect to PostgreSQL

- Confirm the PostgreSQL service is running and listening on the configured port (normally `5432`).
- Check `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` in `backend\.env`.
- Check whether `DATABASE_URL` or inherited shell variables are overriding `.env`; the updated launcher no longer injects `DB_*` values.
- Confirm the database exists and the PostgreSQL user can connect to it.

### `psql` is not recognized

Add the PostgreSQL installation's `bin` folder to Windows `PATH`, reopen PowerShell, and try `psql --version`. Alternatively, run `psql.exe` using its full path.

### Database setup reports missing extensions or permission errors

Install the PostgreSQL PostGIS package for your PostgreSQL version and use a database account with permission to create the required extensions. Then rerun the failed setup step.

### Login works but PSIC/HS dropdowns are empty

Run `database\seed_classification_codes.sql` against the same database named by `DB_DATABASE`, then verify the four classification counts in section 4. Refresh the application after the backend is running.

If `DATABASE_URL` is set, inspect that target instead. For PSIC, apply migration
07 and select an industry first; only its mapped classes are offered. Reload
online to fetch form cache revision 12. Do not manually choose group/division.

### Photo Evidence is missing

Run [verify_photo_evidence.sql](../database/verify_photo_evidence.sql) against the
backend's database. Apply migration 05 there if necessary, then reload the app
online. The form API must return both `L_PHOTO_INTERVIEW_SESSION` and
`L_PHOTO_ENTRANCE_SIGNBOARD` as required PHOTO questions. Changing frontend code
alone cannot create questionnaire rows.

### Session invalid or unauthorized after deployment

Inspect the failed request's response message and confirm the backend is actually
running. Secret rotation, account deactivation and token-version changes revoke
sessions. Remove only `survey_token` and `survey_user` from local storage and
sign in again; do not clear IndexedDB. Never share bearer tokens or `.env` values.
If a fresh login still fails, compare account state in the database actually used
by the running backend. Phase 5's reset-token flow is deferred, not deployed.

### Port 3002 or 5173 is already in use

Stop the other process using that port, or close the previous backend/frontend terminal before starting another copy. The frontend development proxy is configured for the backend on port `3002`.

### The browser shows an old form or application build

Refresh online and reopen the installed PWA after closing its tabs. Try a fresh
browser profile to distinguish a stale service worker from a server problem.
Do not use Clear site data or delete IndexedDB while unsynced work exists.
Sync/back up important records before removing any browser data. Form revision
12 refreshes the questionnaire without deleting drafts or photo Blobs.

## 10. Client-testing deployment

On Render, use the Neon `DATABASE_URL`, a strong independent `JWT_SECRET`,
`NODE_ENV=production`, `CORS_ORIGIN=https://<site>.netlify.app`, and the private
R2 settings above. On Netlify set only the public `VITE_API_BASE_URL` to the Render
origin without `/api`, then rebuild. Apply the allowed migrations manually to a
Neon branch first, then main, before deploying dependent application code.
No scripts in this update have been executed against your database by the assistant.

Free Render/Neon services may need time to wake up. A successful survey sync is
not sufficient evidence that image storage works: verify attachment metadata,
private retrieval, the reviewer view and PDF on an actual phone before delivery.

