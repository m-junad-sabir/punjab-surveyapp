# How to Run the Punjab Industrial Survey App

This guide explains how to set up and run the application on a new Windows computer. The app has three parts:

- **Frontend:** React/Vite survey website at `http://localhost:5173`
- **Backend:** NestJS API at `http://localhost:3002`
- **Database:** PostgreSQL with PostGIS at `localhost:5432`

The frontend can save drafts offline in the browser. The backend and database must be running to sign in, download the latest survey form, and synchronize responses.

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
```

Use the username and password created for your PostgreSQL installation. Keep this file private; do not put real secrets in shared source control.

## 4. Create and populate the database

Start the PostgreSQL service first. The simplest Windows setup is:

1. Open `SETUP_DATABASE.bat` in a text editor.
2. Set its `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`, and `DBNAME` values to match your local PostgreSQL server and the backend settings above. The batch file has local defaults; do not assume those credentials match a newly installed PostgreSQL server.
3. Save the file and run it from File Explorer, or from PowerShell:

   ```powershell
   .\SETUP_DATABASE.bat
   ```

The script creates the `punjab_industrial_survey` database (if it does not exist), then loads the schema and base, Punjab geography, PSIC and HS-code reference data. It is intended for initial setup. If the database already exists, the script may print an “already exists” message while continuing.

If `psql` is not found, add the PostgreSQL `bin` directory to `PATH` and reopen PowerShell. The batch file also checks common PostgreSQL install folders, but making `psql` available on `PATH` is the most portable option.

### Manual database setup

Alternatively, run the following from the project root. Replace `postgres` if your database username is different. Enter the password when `psql` prompts; do not put it in a shared command or document.

```powershell
psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE punjab_industrial_survey;"
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\schema.sql
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\seed.sql
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\seed_punjab_geography.sql
psql -U postgres -h localhost -p 5432 -d punjab_industrial_survey -v ON_ERROR_STOP=1 -f database\seed_classification_codes.sql
```

The first command will report an error if the database already exists; for an existing database, skip that command. Do not rerun `schema.sql` on a populated database. The seed files can be rerun to refresh reference data, but `seed.sql` is for initializing a new database.

For an existing database, use the specific migration/update script required for its current schema or survey-form version. Do not run `migrate_full_questionnaire.sql` on a fresh database initialized from the current `schema.sql` and `seed.sql`.

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

You can also run `START.bat` from File Explorer. It checks PostgreSQL, installs packages if it does not find them, starts the backend and frontend in separate command windows, and opens the browser.

The launcher sets database connection values for the backend process itself. If you use `START.bat` with a non-default database password, host, port, or name, edit the `DB_PASSWORD`, `DB_USERNAME`, `DB_DATABASE`, and related `DB_*` values in the launcher so they agree with `backend\.env` and `SETUP_DATABASE.bat`. Treat any password saved in the launcher as a secret and do not share it. The two-window method above avoids this launcher override.

To stop the app, close the two server windows. `STOP.bat` is also provided for Windows.

## 7. Sign in and try a survey

The seed data provides demonstration accounts:

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Surveyor | `surveyor1` | `surveyor123` |
| Supervisor | `supervisor1` | `supervisor123` |

Use these accounts only for local demonstration. Change or disable default accounts before exposing the application to other people or networks. An administrator can create user accounts from the application.

For PSIC and HS-code dropdowns, confirm the classification seed completed and the four reference-table counts above are non-zero. A surveyor can save a draft locally; syncing requires the backend and database to be available.

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

## Troubleshooting

### Backend cannot connect to PostgreSQL

- Confirm the PostgreSQL service is running and listening on the configured port (normally `5432`).
- Check `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` in `backend\.env`.
- If using `START.bat`, also check that its `DB_*` values match; the launcher overrides some `.env` values.
- Confirm the database exists and the PostgreSQL user can connect to it.

### `psql` is not recognized

Add the PostgreSQL installation's `bin` folder to Windows `PATH`, reopen PowerShell, and try `psql --version`. Alternatively, run `psql.exe` using its full path.

### Database setup reports missing extensions or permission errors

Install the PostgreSQL PostGIS package for your PostgreSQL version and use a database account with permission to create the required extensions. Then rerun the failed setup step.

### Login works but PSIC/HS dropdowns are empty

Run `database\seed_classification_codes.sql` against the same database named by `DB_DATABASE`, then verify the four classification counts in section 4. Refresh the application after the backend is running.

### Port 3002 or 5173 is already in use

Stop the other process using that port, or close the previous backend/frontend terminal before starting another copy. The frontend development proxy is configured for the backend on port `3002`.

### The browser shows an old form or application build

Refresh the page. If the installed PWA continues to show an old version, close its tabs and clear that site's cached data/service worker in the browser's site settings, then open `http://localhost:5173` again while online.

