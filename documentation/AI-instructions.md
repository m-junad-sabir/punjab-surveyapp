# AI Instructions — Punjab Industrial Survey

This file is the definitive guide for any AI assistant (Kiro, Copilot, Claude, GPT) working on this codebase. Read it before making any change.

---

## Project Identity

**Name:** Punjab Industrial Survey — Field Data Collection System  
**Owner:** Government of the Punjab, Directorate General of Industries  
**Purpose:** Map every manufacturing unit in Punjab via offline-first mobile surveys  
**Stack:** NestJS backend (port 3001) + React/TypeScript PWA frontend (port 5173) + PostgreSQL/PostGIS  

---

## Repository Layout

```
v1-deploy/
├── backend/                  NestJS REST API
│   └── src/
│       ├── controllers/      HTTP layer only — no business logic here
│       ├── bll/services/     All business logic lives here
│       ├── dal/entities/     TypeORM entities — one per table
│       ├── common/
│       │   ├── guards/       RbacGuard — JWT + permission enforcement
│       │   └── decorators/   @CurrentUser(), @RequirePermissions()
│       └── database/         TypeORM config (synchronize: false)
├── frontend/                 React + Vite PWA
│   └── src/
│       ├── pages/            Full-page components (one per route)
│       ├── components/       Layout, ProtectedRoute
│       ├── context/          AuthContext, SurveyContext
│       ├── lib/              api.ts, db.ts (IndexedDB), deviceId.ts
│       ├── styles/           global.css (premium navy/gold design system)
│       └── types/            Shared TypeScript interfaces
├── database/
│   ├── create_tables.sql     Run first — creates all tables
│   └── seed.sql              Run second — inserts form, 296 questions, users
└── documentation/            This folder — all project docs
```

---

## Critical Rules Before Touching Anything

### 1. Always read before editing
Never suggest or write code for a file you have not read. Use the file reading tool first, see what's there, then make a targeted change.

### 2. The question ID map is sacred
These IDs are hardcoded in both frontend and backend. Never change without updating all three places:

```
question_id=1   HDR.GPS   GPS capture → feeds gps_lat/lng/accuracy
question_id=4   A.1       Name of Establishment → feeds unit_name
question_id=19  A.9       Ownership → feeds ownership_type
```

Files that reference these:
- `backend/src/bll/services/sync.service.ts` — duplicate detection, unit creation
- `frontend/src/pages/SurveyPage.tsx` — `GPS_QUESTION_ID`, `UNIT_NAME_QUESTION_ID`
- `frontend/src/pages/SyncPage.tsx` — GPS fallback in payload builder
- `frontend/src/pages/DashboardPage.tsx` — unit name display
- `frontend/src/pages/SurveyListPage.tsx` — unit name display

### 3. The backend port is 3001
`.env PORT=3001`. The frontend proxy (`vite.config.ts`) points to `http://localhost:3001`. The VS Code launch config also uses 3001. Never change back to 3000.

### 4. Never hash passwords on the frontend
The login and register API fields are named `password_hash` but they receive **plain text**. bcrypt is applied server-side only. Sending a pre-hashed password will break auth.

### 5. TypeORM synchronize is FALSE
`database.config.ts` has `synchronize: false`. Schema changes go in SQL files, not entities. Modifying an entity does NOT change the database. You must write a migration SQL file manually.

### 6. IndexedDB version is 3
`db.ts` opens `survey-pwa` at version 3. If you add a new store or index, bump to version 4 and add the upgrade path. Never skip a version number.

### 7. The form version constant
`SurveyContext.tsx` has `CURRENT_FORM_VERSION = '2.0'`. When `seed.sql` is re-run with a new form version, update this constant. This triggers auto-refresh of cached forms on every client.

---

## Architecture Decisions (Do Not Change Without Discussion)

| Decision | Reason |
|---|---|
| Client-generated `response_id` (UUID) | Enables idempotent sync — same response can be POSTed multiple times safely |
| JWT permissions embedded in token | No DB lookup on every request; fast RBAC |
| Offline-first with IndexedDB | Surveyors work in industrial areas with no internet |
| Skip logic evaluated client-side | No round-trips needed; form is fully downloaded |
| JSONB for `answer_value` | Supports text, number, GPS objects, arrays from a single column |
| PostGIS for duplicate detection | ST_DWithin on geography is accurate and indexed |
| `synchronize: false` in TypeORM | Prevents accidental schema changes in production |

---

## When Adding New Survey Questions

1. **Edit `database/seed.sql`** — add a new row to the correct section's INSERT block
2. **Increment `question_id`** sequentially (currently max is 296)
3. **Add skip logic** in the `survey_question_logic` INSERT if conditional
4. **Bump `CURRENT_FORM_VERSION`** in `frontend/src/context/SurveyContext.tsx`
5. **Re-run seed** — but first TRUNCATE dependent tables (see seed.sql header)
6. **Hard-refresh the browser** (Ctrl+Shift+R) to wipe the IndexedDB cache

Never edit question IDs 1–27 (Section A) without updating the hardcoded constants above.

---

## When Adding a New API Endpoint

1. Create a method in the appropriate **service** (`bll/services/`)
2. Create or add to the **controller** (`controllers/`)
3. Apply `@UseGuards(RbacGuard)` and `@RequirePermissions('CODE')` decorators
4. Register the service and controller in `app.module.ts`
5. Add a corresponding method to `frontend/src/lib/api.ts`

---

## When Adding a New Frontend Page

1. Create the page in `frontend/src/pages/`
2. Add the route in `App.tsx` inside the `<ProtectedRoute><Layout>` wrapper
3. Add a nav tab entry in `Layout.tsx` (with `hasPermission` guard if role-restricted)
4. If it needs offline data, use `useSurvey()` or read directly from `db.ts`

---

## CSS / Design System Rules

The design system lives entirely in `frontend/src/styles/global.css`. The colour palette:

```css
--primary:        #1A2E4A    /* Deep navy — buttons, labels, app bar */
--primary-light:  #243D5F
--primary-dark:   #0F1E30
--secondary:      #B8860B    /* Warm gold — accents, progress, section codes */
--secondary-light:#D4A017
--success:        #1B6B3A
--warning:        #C0501A
--danger:         #B71C1C
```

**Never use hardcoded hex colours inside component files.** Always use CSS variables.

Key utility classes to use instead of inline styles where possible:
```
.btn .btn-primary .btn-ghost .btn-success .btn-danger .btn-gold
.card .card-header
.form-input .form-select .form-label .form-error
.badge .badge-green .badge-yellow .badge-red .badge-blue
.alert .alert-success .alert-error .alert-warning
.question-card .question-code .question-mandatory
.chip .chip-success .chip-warning .chip-neutral
.section-header
.spinner .spinner-sm
.empty-state
```

---

## Testing Checklist for Any Change

Before saying a change is done, verify:

- [ ] Backend builds without TypeScript errors: `npm run build` in `/backend`
- [ ] API endpoint works: test with the correct JWT in Authorization header
- [ ] Frontend renders without console errors
- [ ] Survey form loads: Dashboard shows `Form v2.0 ready · 296 questions`
- [ ] New survey can be started, sections navigate, GPS captures, submit saves to IDB
- [ ] Sync sends the payload and backend processes without error
- [ ] Skip logic still fires correctly (test Seasonal, Other zone type, closed unit)

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Using `question_id === 1` for unit name | Use `question_id === 4` (A.1) |
| Hashing password before sending to API | Send plain text — backend hashes |
| Running seed.sql without truncating | Add TRUNCATE to top of seed or run separately |
| Adding `em dashes (—)` or special chars in SQL | Use plain ASCII hyphens in SQL string literals |
| Using `\'` to escape quotes in SQL | Use `''` (double single quote) — standard SQL |
| Editing IDB version without upgrade path | Always add `if (oldVersion < N)` block |
| Forgetting to update vite.config.ts when changing backend port | Both `.env` AND `vite.config.ts` must match |
| Writing CSS colours inline in TSX files | Define as CSS variable in global.css first |
| Changing form without bumping CURRENT_FORM_VERSION | Clients will keep serving stale cached form |

---

## Seeded Test Data

Use these credentials for testing every role:

| Username | Password | Role | Can Submit | Can Approve | Can Manage Users |
|---|---|---|---|---|---|
| `surveyor1` | `surveyor123` | Surveyor | ✅ | — | — |
| `supervisor1` | `supervisor123` | Supervisor | ✅ | ✅ | — |
| `admin` | `admin123` | DB Admin | ✅ | ✅ | ✅ |

---

## Environment Quick Reference

```
Backend:   http://localhost:3001
Frontend:  http://localhost:5173
Database:  postgresql://postgres:postgres123@localhost:5432/punjab_industrial_survey
JWT:       secret=punjab-industries-survey-secret-key-2026, expires=1d
```

Start commands:
```powershell
# Terminal 1 — Backend
cd backend ; npm run start:dev

# Terminal 2 — Frontend
cd frontend ; npm run dev

# Run seed (wipes old form, reloads 296 questions)
$env:PGPASSWORD="postgres123"
psql -U postgres -d punjab_industrial_survey -f database/seed.sql
```
