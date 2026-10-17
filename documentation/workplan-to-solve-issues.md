# Workplan to Solve Issues

Source: investigation reports 2 and 3, plus owner's improvement list.
Environments: **localhost** (developer machine) and **testing production** (Netlify free + Render free + Neon free).

## Conventions

- **DB changes:** every change is a standalone `.sql` file in `database/`, named `migration_NN_<topic>.sql`. The owner runs them manually: Neon branch first, then Neon main, then localhost. Scripts are safe to re-run (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, `ON CONFLICT DO NOTHING`) and wrapped in `BEGIN/COMMIT`.
- [SETUP_DATABASE.bat](../SETUP_DATABASE.bat) is updated at the end so fresh installs run all migrations.
- Each phase ends with a verification checklist. Do not start the next phase until it passes.

## Decisions Log

| Topic | Decision |
|---|---|
| Plain-text password backup | **Rejected** (security risk). Replaced with admin password reset + forced change on next login (Phase 5). |
| Photo position | New final section **"L – Photo Evidence"**, shown after Section K, before submit. |
| Photos | 2 required: `L_PHOTO_INTERVIEW_SESSION`, `L_PHOTO_ENTRANCE_SIGNBOARD`. Live camera only (no gallery), **rear camera** for both. |
| Photo GPS accuracy | Accept ≤ 50 m. Warn but allow 50–100 m. Block > 100 m or no fix. |
| Photo storage (testing) | Cloudflare R2 (S3-compatible, 10 GB free). Full scale: own server via `STORAGE_DRIVER=local` (or MinIO). DB stores only `storage_key`. |
| Type of Unit options | Industry list L1 (60 items) + "Other (specify)". Section A question **vii**; later questions shift by one (14 → 15). |
| Gender | Keep existing value `'Other'` (mixed case) to match frontend, writer and `schema.sql`. |
| `.env` | Removed from Git tracking; all secrets that were committed are rotated. |

---

## Phase 0 — Secrets & Environment Setup

**Steps**
1. `git rm --cached backend/.env frontend/.env*`, then commit. Make sure `.gitignore` contains `.env`, `.env.*` and `!.env.example`.
2. Rotate the Neon DB password and the `JWT_SECRET` (the old values are in Git history).
3. Add `backend/.env.example` and `frontend/.env.example` with placeholder values only.
4. Add the new keys to [render.yaml](../render.yaml) with `sync: false`.

**Environment variables**

| Variable | Localhost | Render | Netlify |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | — |
| `DATABASE_URL` | unset (uses `DB_*`) | Neon pooled URL with `?sslmode=require` | — |
| `DB_HOST/PORT/USERNAME/PASSWORD/DATABASE` | local Postgres | — | — |
| `JWT_SECRET` | random, ≥ 32 chars | random, ≥ 32 chars (different value) | never |
| `CORS_ORIGIN` | `http://localhost:5173` | `https://<site>.netlify.app` | — |
| `STORAGE_DRIVER` | `local` | `s3` | — |
| `STORAGE_LOCAL_DIR` | `./uploads` | — | — |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION=auto` | — | R2 values | — |
| `VITE_API_BASE_URL` | unset (Vite proxy `/api`) | — | `https://<app>.onrender.com` |

`VITE_*` values are compiled into public JavaScript, so only URLs go there, never secrets.

**Verify:** `git ls-files | findstr .env` shows only `.env.example` files; the app runs on localhost and on Render with the new secrets.

---

## Phase 1 — JWT Fallback (+ Dev Quick Sign-in Removal)

**SQL:** `database/migration_01_users_token_version.sql`. Adds `users.token_version int DEFAULT 0 NOT NULL` and `users.must_change_password boolean DEFAULT false NOT NULL`.

**Code**
1. `backend/src/main.ts`: refuse to start if `JWT_SECRET` is missing or shorter than 32 chars. Replace `origin: '*'` with `CORS_ORIGIN`. Fix the startup log so it doesn't print `DB_*` when `DATABASE_URL` is used.
2. `app.module.ts` and `rbac.guard.ts`: remove the hard-coded fallback secret. The guard uses the injected `JwtService` config.
3. The JWT payload includes `token_version`. The guard checks `is_active` and `token_version` with one indexed query per request; any mismatch returns 401.
4. `LoginPage.tsx`: render the quick sign-in panel only when `import.meta.env.DEV`.

**Verify:** no secret means no boot; a forged or expired token gets 401; a deactivated user gets 401 on their next request; the production build has no quick sign-in.

---

## Phase 2 — Role IDs + Gender "Other"

**SQL**
- `database/migration_02_audit_roles.sql`: read-only `SELECT`s listing role IDs/codes and each user's effective role, to find users wrongly created as ADMIN.
- `database/migration_03_workforce_gender_other.sql`: recreates the gender CHECK constraints on `workforce_employment` and `workforce_skills` as `('MALE','FEMALE','Other')`.

**Code**
1. New endpoint `GET /auth/roles` returns `{id, code, name}`.
2. Register (and later Edit) accept `role_code`; the server resolves the ID and rejects unknown codes.
3. `AdminPage.tsx`: remove the hard-coded `ROLES` list, load roles from the API, and default to `SURVEYOR`.

**Verify:** each UI role creates a user with the matching `roles.code` and permissions; a Section D survey with "Other" counts syncs.

---

## Phase 3 — Offline Ownership + Duplicate-Flag Fix

**SQL:** `database/migration_04_duplicate_flags_details.sql`. Adds `duplicate_flags.details text`. `reason` keeps its CHECK codes.

**Code**
1. IndexedDB v6: compound index `[surveyor_id, sync_status]`. Records without an owner are marked `unassigned` and shown only to admins, who can claim them.
2. Survey list and Sync page show and sync only the current user's records.
3. The sync payload includes `surveyor_id`. The backend returns `owner_mismatch` if it differs from the JWT user and never silently reassigns a survey.
4. Logging out with unsynced work shows a warning dialog. IndexedDB data is never deleted on logout or on a 401.
5. Call `navigator.storage.persist()` after login.
6. `sync.service.ts`: `reason` is `NAME_SIMILARITY`, `GPS_PROXIMITY` or `BOTH`; the readable sentence goes into `details`. Update the entity to match.

**Verify:** user B can't sync user A's pending work; A's work survives logout/login; a near-duplicate survey commits as `duplicate_flagged`.

---

## Phase 4 — Photo Capture (Section L, Camera Only, Geotagged)

**SQL:** `database/migration_05_photo_evidence.sql`
- Adds `PHOTO` to the allowed `survey_questions.answer_type` values.
- Inserts section `L` "Photo Evidence" (last `sort_order`) into the active form, with questions `L_PHOTO_INTERVIEW_SESSION` (i) and `L_PHOTO_ENTRANCE_SIGNBOARD` (ii). Both are required.
- Extends `survey_attachments` with `photo_type`, `mime_type`, `size_bytes`, `sha256`, `latitude`, `longitude`, `accuracy_m`, `uploaded_by`, `created_at`, plus `UNIQUE (response_id, photo_type)`.

**Frontend**
1. A `CameraCapture` component: live `getUserMedia({ video: { facingMode: 'environment' } })` viewfinder, capture via `<canvas>`. No `<input type=file>`.
2. Geolocation at the moment of capture: ≤ 50 m OK, 50–100 m warning, > 100 m or denied blocks the capture.
3. Watermark burned into the image (date/time, lat/lng ± accuracy, unit name).
4. Resize to 1600 px on the longest side, JPEG quality ~0.75 (~300 KB).
5. The image is stored as a Blob in a new IndexedDB `photos` store. The answer holds only `{photo_id, lat, lng, accuracy_m, captured_at}`.
6. Photos appear in the PDF and in the unit detail / supervisor view.

**Backend**
1. `StorageService` with two drivers: `local` (disk) and `s3` (R2/MinIO), chosen by `STORAGE_DRIVER`.
2. `POST /sync/photos` (multipart, max 3 MB): checks the JPEG content (magic bytes), owner and SHA-256. Re-uploading the same `photo_id` is safe.
3. Sync order: photos first, then the response. The server rejects a response if a required photo is missing or belongs to another user.
4. `GET /attachments/:id` (permission-checked) streams the file or redirects to a short-lived signed URL. The bucket is never public.
5. Reduce the JSON body limit from 25 MB to 2 MB.

**Verify:** both photos taken offline, then synced; rows appear in `survey_attachments` and files in R2/disk; gallery upload is impossible; photos > 100 m accuracy are blocked.

---

## Phase 5 — Admin User Management Page

**SQL:** `database/migration_06_user_admin_audit.sql`. New table `user_admin_audit` (actor, target, action, changes jsonb, created_at).

**Backend:** `GET /auth/users` (search, role filter, pagination), `PATCH /auth/users/:id` (name, email, phone, role, supervisor), status toggle, and `POST /auth/users/:id/reset-password`.
- Reset generates a temporary password shown once, sets `must_change_password`, and bumps `token_version`.
- Login with `must_change_password` forces a change-password screen.
- Guards: an admin can't deactivate or demote themselves, and the last active admin can't be removed.

**Frontend:** user list (cards on mobile, table on desktop), edit drawer, activate/deactivate with confirmation, reset-password dialog.

---

## Phase 6 — Leave Guard + 30 s Autosave

1. Migrate `BrowserRouter` to `createBrowserRouter` + `RouterProvider` (required for `useBlocker`).
2. Survey page: `useBlocker` dialog with "Save draft & leave" / "Stay", plus `beforeunload` and Android back-button handling.
3. Autosave every 30 s when something changed, and on `visibilitychange → hidden`. Show a "Saved hh:mm:ss" indicator.

---

## Phase 7 — Type of Unit (Section A, Question vii)

**SQL:** `database/migration_07_type_of_unit.sql`
- Lookup type `UNIT_TYPE` with the 60 L1 industries (`sort_order` 1–60) plus `OTHER` "Other (specify)" (`requires_text = true`, sort 61).
- `industrial_units.unit_type_id` (FK `lookup_values`) and `unit_type_other_text`.
- In Section A of the active form, every question numbered vii and later moves one numeral up (vii→viii … xiii→xiv, including both `xi` rows).
- Inserts `A_UNIT_TYPE`, question_no `vii`, `SINGLE_CHOICE`, stored in `industrial_units.unit_type_id`, required.
- Questions are ordered by `question_no` numeral in `survey-form.service.ts`, which already supports up to xvi.

**Code:** writer branch in `survey-response-writer.ts`; bump `CURRENT_FORM_CACHE_REVISION` (currently 9 → 10); add to the PDF.

---

## Phase 8 — Months of Operation "Select All"

Frontend only: a "Select all 12 months" checkbox (with a partial state) above the `B_OPERATION_MONTHS` options. No DB change.

---

## Phase 9 — Animated Sync Progress

1. Step-by-step sync: wake-up `/health` ping (Render cold start) → per-photo upload with progress (`XMLHttpRequest.upload.onprogress`) → responses in small batches.
2. Animated progress bar (CSS width transition + moving stripes), counters for synced / duplicate / failed, a per-survey status list, and a "Retry failed" button.

---

## Phase 10 — Remaining Findings (Reports 2 & 3)

1. Scope unit list/detail/approve/reject to the supervisor's team; check that the response belongs to the unit; run approval writes in one transaction.
2. Runtime DTO validation for `/sync`: whitelist fields (reject `unit_id`), active form only, required answers, GPS ranges, batch-size limit.
3. Entity `survey_responses.status` length 20 → 25; remove or fix the orphan entities (`sync-log`, `section-record`).
4. Duplicate detection via `pg_trgm` `similarity()` using the existing GIN index.
5. Fix the PWA runtime cache URL rule; fix the misleading "can submit" message.
6. Pagination, login rate limiting (`@nestjs/throttler`), `helmet`.
7. Tests: auth, roles, sync ownership, duplicate flag, photos, approval.
8. Update `SETUP_DATABASE.bat` to run all `migration_NN_*.sql` files.

---

## Phase 11 — Responsive Mobile UI

Waiting for the owner's screenshots. Expected scope: remove the phone-frame wrapper, fluid layout with breakpoints (360 / 768 / 1024), `100dvh`, safe-area insets, ≥ 44 px tap targets, PWA `display: standalone`.

---

## Progress Tracker

| Phase | Status |
|---|---|
| 0 Secrets & env | Done |
| 1 JWT fallback | Code done — awaiting migration_01 + verification |
| 2 Roles + Gender | Code done — awaiting role audit and gender migration |
| 3 Offline ownership + duplicate flag | Code done — awaiting migration_04 + account-switch verification |
| 4 Photo capture | Not started |
| 5 Admin users | Not started |
| 6 Leave guard + autosave | Not started |
| 7 Type of Unit | Not started |
| 8 Months select all | Not started |
| 9 Sync progress | Not started |
| 10 Remaining findings | Not started |
| 11 Responsive UI | Not started |
