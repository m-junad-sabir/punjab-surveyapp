# Punjab Industrial Survey App

## Stack
- **Backend**: NestJS 10 + TypeORM + PostgreSQL/PostGIS
- **Frontend**: React 18 + Vite + PWA (offline-capable)

## Delivery Status - 18 October 2026

Phases 0-4 and 7 are implemented. Phase 7 was confirmed working by the owner.
Phase 5 user-management/password-reset changes were rolled back after login
regressions; Phase 6 autosave/leave protection is deferred. Remaining work
resumes after the delivery pause. See the [workplan](documentation/workplan-to-solve-issues.md).

- Required JWT configuration and code-based role assignment.
- Account-scoped offline surveys and sync history; drafts survive logout.
- Duplicate flags use constrained reason codes and separate explanatory text.
- Final Section L has two required, rear-camera-only, geotagged photos.
- Section A vii has 60 industry types plus Other (specify). Section A viii
   lists only PSIC classes mapped to that industry by L4. The server validates
   the pair and derives group/division. Other uses official PSIC class 9609.
- Form cache revision is 14. Save drafts explicitly; autosave is not implemented.

---

## 1. Database Setup

```powershell
# Windows, from the repository root; /plan executes no SQL
.\SETUP_DATABASE.bat /plan
.\SETUP_DATABASE.bat fresh
```

Use `fresh` only for a NEW database; it refuses an existing database. For a
current existing installation, back it up and use `SETUP_DATABASE.bat migrate`.
Configure `PGHOST`, `PGPORT`, `PGUSER`, and `DBNAME` (or `PGDATABASE`) first;
use psql password prompts or a private `%APPDATA%\postgresql\pgpass.conf`.
The setup script does not load backend `.env` or `DATABASE_URL`. Its PG settings
must target the intended database independently.

The script stops on the first SQL error. Fresh mode runs the base
schema and seed, then reference seeds/updates and implemented migrations
**01, 02 (read-only audit), 03, 04, 05, 07, 08, 09**. Phase 5/migration 06 and legacy
cleanup/credential-reset scripts are excluded. Earlier files can already have
committed if a later file fails; inspect the error before retrying.

For manual upgrades, run these against each target database in order using
`psql -X -v ON_ERROR_STOP=1 -d YOUR_DATABASE -f PATH`:

1. [Migration 01: session fields](database/migration_01_users_token_version.sql)
2. [Migration 02: role audit (read-only)](database/migration_02_audit_roles.sql)
3. [Migration 03: workforce Other gender](database/migration_03_workforce_gender_other.sql)
4. [Migration 04: duplicate details](database/migration_04_duplicate_flags_details.sql)
5. [Migration 05: photo evidence](database/migration_05_photo_evidence.sql)
6. [Migration 07: industry and filtered PSIC](database/migration_07_type_of_unit.sql)
7. [Migration 08: Section A additions](database/migration_08_section_a_additions.sql)
8. [Migration 09: Section B operations](database/migration_09_section_b_operations.sql)

Load classification references before migration 07; it fails if a mapped
class is missing. Apply SQL before deploying its code, then reopen online to
refresh the form. Test on a Neon branch before main. Review the role audit;
no migration automatically reassigns existing users' roles. For migration 09,
run its verification queries and inspect any historical working-day violations
and a `NOT VALID` working-days constraint before validating it.

The geography seed populates Punjab's district and district-linked tehsil options. It uses a
third-party 2019 administrative snapshot (36 districts, 130 tehsil entries), with division
assignments based on the Pakistan Bureau of Statistics' 2023 district list. The source and
snapshot date are recorded in `database/seed_punjab_geography.sql`; verify it against current
Punjab administrative records before relying on it as an authoritative current list.

For an existing database with empty geography reference tables, run:

```bash
psql -U postgres -d punjab_industrial_survey -f database/seed_punjab_geography.sql
```

To populate PSIC divisions/groups/classes and the Pakistan Customs Tariff FY 2026-27 HS codes
in a fresh or existing database, run:

```bash
psql -U postgres -d punjab_industrial_survey -f database/seed_classification_codes.sql
```

For an existing database, add Acre, kilogram, liter, and ton measurement units with:

```bash
psql -U postgres -d punjab_industrial_survey -f database/add_common_measurement_units.sql
```

To add the Section A zone type choices to an existing database, run:

```bash
psql -U postgres -d punjab_industrial_survey -f database/update_zone_type_options.sql
```

To update the Section A ownership and legal-structure choices in an existing database, run:

```bash
psql -U postgres -d punjab_industrial_survey -f database/update_ownership_legal_structure_options.sql
```

To update the Section D workforce skill labels in an existing database, run:

```bash
psql -U postgres -d punjab_industrial_survey -f database/update_section_d_workforce_labels.sql
```

To update an existing survey form to version 3 with district and dependent tehsil selectors, run:

```bash
psql -U postgres -d punjab_industrial_survey -f database/update_location_selection_form.sql
```

For a database still on survey form version 1, run `database/migrate_full_questionnaire.sql` first. Districts and tehsils are loaded from the `districts` and `tehsils` reference tables.

---

## 2. Start the Backend

Configure `backend/.env` first; never commit it:

```dotenv
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=REPLACE_WITH_LOCAL_PASSWORD
DB_DATABASE=punjab_industrial_survey
JWT_SECRET=REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
CORS_ORIGIN=http://localhost:5173
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./uploads
```

`DATABASE_URL`, when set, overrides all `DB_*` settings. For Neon on your laptop,
use that URL with the provider's TLS parameters instead of local database
settings. Existing process environment variables override `.env`. Use separate
JWT secrets and databases for local development and client testing.

```bash
cd backend
npm ci
npm run start:dev
# Running on http://localhost:3002
```

---

## 3. Start the Frontend

```bash
cd frontend
npm ci
npm run dev
# Running on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

Alternatively run `START.bat /check`, then `START.bat`. It opens two named
windows, uses the existing configuration, and refuses occupied ports 3002/5173.
It does not change execution policy, credentials, or Windows services.
Check both windows for readiness; startup never applies migrations.

Use Ctrl+C in manually started terminals. `STOP.bat` confirms before closing
launcher windows; `/check` lists listeners without stopping them. `/ports` is
an explicit confirmed fallback for Node listeners on 3002/5173 only; other
preview ports are not managed by these scripts.

---

## 4. Initial Administrator

The current base seed creates roles/reference data, not user accounts. Existing
installations retain their users/passwords. A fresh install needs an initial
administrator before protected registration can create further users.

Generate a bcrypt hash in the backend folder; the password prompt is hidden:

```powershell
Set-Location backend
$secure = Read-Host 'New administrator password' -AsSecureString
$credential = New-Object System.Net.NetworkCredential('', $secure)
$credential.Password | node -e "let input=''; process.stdin.on('data', data => input += data); process.stdin.on('end', async () => console.log(await require('bcrypt').hash(input.trimEnd(), 12)));"
Remove-Variable secure, credential
```

Use that hash in a query you run yourself, replacing the placeholder:

```sql
INSERT INTO users (username, full_name, password_hash, role_id, is_active)
SELECT 'admin', 'System Administrator', '<BCRYPT_HASH>', id, true
FROM roles WHERE code = 'ADMIN';
```

Do not store readable passwords or reset existing accounts during setup. Local
quick sign-in shortcuts work only for separately provisioned matching accounts;
the shortcuts are absent from production builds.

---

## 5. PWA Offline Testing

1. Login → Dashboard → click **Download Form** (requires internet once)
2. In browser DevTools → Application → Service Workers → check **Offline**
3. Fill out a survey and explicitly save the draft to IndexedDB
4. Uncheck Offline → go to **Sync** → click **Sync Now**

Records and photo Blobs belong to their creator; another account cannot sync
them. Logout preserves drafts, but clearing site data/IndexedDB loses unsynced
work. Failed sync items currently require reopening/resubmitting; the general
retry/progress redesign is still future work.

### Photo Evidence

Section L requires an interview-session photo and an enumerator-at-entrance/
signboard photo. Both use the rear camera with no gallery picker. Camera access
requires HTTPS or localhost and browser permission; a laptop webcam may not
satisfy the required rear-facing camera constraint. Test the workflow on a phone.
GPS accuracy up to 50 m is accepted; 50-100 m asks for confirmation; worse than
100 m or denied location blocks capture. Images are watermarked, JPEG-compressed,
saved offline as Blobs, and uploaded before the survey JSON. The server accepts
at most 3 MB per photo. JPEG/GPS validation does not prove capture authenticity;
browser location metadata can be spoofed.

Use `STORAGE_DRIVER=local` and `STORAGE_LOCAL_DIR=./uploads` locally. On Render's
ephemeral filesystem, use a private Cloudflare R2 bucket instead. Back up both
database metadata and stored objects. A later move to server storage requires
copying objects while preserving their keys, not just changing the driver.

---

## 6. Cloud Deployment (Internal Testing)

### Neon database

1. Create a PostgreSQL project in Neon and copy its pooled connection string with
   `sslmode=require`.
2. Initialize the database by running `database/schema.sql`, `database/seed.sql`,
   `database/seed_punjab_geography.sql`, and
   `database/seed_classification_codes.sql` against that connection.
3. Apply the implemented migrations listed in section 1 (skip deferred Phase 5).
   For an existing database, do not rerun schema/seed. Provision an administrator
   separately for a new installation. Verify migration 05 returns both Section L
   questions and migration 07 returns industry/class mappings.

### Render API

1. Create a Render Blueprint from this repository and use the included
   `render.yaml`. When prompted, provide the Neon connection string as
   `DATABASE_URL`; Render generates `JWT_SECRET`.
2. After the service deploys, copy its public `onrender.com` URL.
3. Set `CORS_ORIGIN=https://<site>.netlify.app` (comma-separated if more origins
   are intentionally allowed), `STORAGE_DRIVER=s3`, and `S3_REGION=auto`.
4. Create a private R2 bucket and set backend-only `S3_ENDPOINT`, `S3_BUCKET`,
   `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`. Endpoint format:
   `https://<account-id>.r2.cloudflarestorage.com`. Never use Render's temporary
   disk for durable evidence. Check the provider's current free allowance and billing.

Render/Neon free services may sleep; allow for cold starts before retrying sync.
Keep JWT secrets at least 32 random characters; changing the secret invalidates
existing sessions. Never expose database, JWT, or storage credentials as `VITE_*`.

### Netlify frontend

1. Import this repository into Netlify; `netlify.toml` configures the frontend
   build and client-side routes.
2. Set the Netlify environment variable `VITE_API_BASE_URL` to the Render URL
   (for example, `https://punjab-survey-api.onrender.com`, without a trailing
   slash or `/api`), then trigger a deploy.

Never commit database connection strings or other secrets. Share the resulting
public service URLs if you need help verifying the deployment.

---

## API Endpoints

| Method | Route                           | Auth Required    |
|--------|---------------------------------|------------------|
| POST   | /auth/login                     | No               |
| POST   | /auth/register                  | USER_CREATE      |
| GET    | /auth/roles                     | USER_CREATE      |
| GET    | /auth/users                     | USER_CREATE      |
| PATCH  | /auth/users/:id/status           | USER_REMOVE      |
| GET    | /auth/me                        | Authenticated    |
| GET    | /survey-forms/active            | SURVEY_SUBMIT    |
| POST   | /sync                           | SURVEY_SUBMIT    |
| GET    | /industrial-units               | Authenticated    |
| GET    | /industrial-units/:id           | Authenticated    |
| POST   | /industrial-units/:id/approve   | SURVEY_CONFIRM   |
| POST   | /industrial-units/:id/reject    | SURVEY_CONFIRM   |
| POST   | /sync/photos                   | SURVEY_SUBMIT    |
| GET    | /attachments/unit/:unitId      | Owner or reviewer |
| GET    | /attachments/:id               | Owner or reviewer |

All non-public routes also require a valid, active bearer session. Phase 5
profile-edit/password-reset endpoints are not part of this delivery.

Detailed Windows setup, migration, troubleshooting, and verification instructions:
[How to run](documentation/how-to-run.md).
