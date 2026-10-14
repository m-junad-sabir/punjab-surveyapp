# Technology Stack

Punjab Industrial Survey is a React Progressive Web App backed by a NestJS REST API and PostgreSQL/PostGIS. The field client is offline-first: form definitions and survey responses are cached locally and synchronized when a connection is available.

## Backend

| Component | Technology | Version line / configuration | Purpose |
|---|---|---|---|
| Runtime | Node.js | Local environment observed: 24.19.0 | Runs API and CLI tooling. |
| Language | TypeScript | 5.x | Backend implementation. |
| API framework | NestJS | 10.x | Controllers, services, modules, and HTTP lifecycle. |
| HTTP adapter | Express | Nest platform-express | JSON API and request body parsing. |
| Persistence | TypeORM | 0.3.x | Repositories and transaction manager. |
| Database driver | `pg` | 8.x | PostgreSQL connection. |
| Authentication | `@nestjs/jwt`, `passport-jwt` | JWT bearer tokens | Login/session token verification. |
| Password hashing | `bcrypt` | 5.x | Password hash comparison and registration. |
| Validation | `class-validator`, `class-transformer` | 0.14.x / 0.5.x | DTO validation and transformation dependencies. |

The backend is organized into `controllers` (HTTP routes), `bll/services` (business rules), `dal/entities` (TypeORM models), `common` (guards/decorators), and `database` (connection configuration). Database synchronization is disabled; use the checked-in SQL schema, seed, and migration files.

## Frontend

| Component | Technology | Version line | Purpose |
|---|---|---|---|
| UI | React | 18.x | Application interface. |
| Language | TypeScript | 5.x | Typed frontend code. |
| Routing | React Router DOM | 6.x | Login, survey, sync, supervisor, and admin routes. |
| Build/dev server | Vite | 5.x | Development server and production build. |
| PWA | `vite-plugin-pwa` / Workbox | 0.19.x | Web app manifest, service worker, asset caching. |
| Offline database | `idb` / IndexedDB | 8.x | Cached form, local responses, and sync logs. |
| Identifiers | `uuid` | 9.x | Client-side survey response IDs. |
| PDF export | `jspdf` | 4.x | On-device survey PDF download. |

Frontend code is divided into `pages`, `components`, `context`, `lib`, `styles`, and `types`. `SurveyContext` tracks connectivity and questionnaire cache/version; `AuthContext` manages the local JWT session and permissions.

## Database

| Component | Technology | Purpose |
|---|---|---|
| Relational database | PostgreSQL 16 schema target | Persistent users, forms, establishments, and normalized survey responses. |
| Spatial support | PostGIS | Establishment GPS point storage and proximity checks. |
| Text search extension | `pg_trgm` | Enabled by the schema for trigram indexing and future similarity queries. |
| Driver | `pg` | Node.js PostgreSQL access. |

The schema contains 64 application tables, plus PostGIS's `spatial_ref_sys` in the inspected live database (65 base tables in that snapshot). `survey_responses` links a capture to its establishment, form, and surveyor. Sections B–K use normalized one-to-one/repeating tables, with generic choice/share/matrix answer tables where appropriate. Sync currently performs establishment-name similarity scoring in the NestJS service and GPS proximity checks through PostGIS.

## Current local development configuration

| Service | Local port | Configuration |
|---|---:|---|
| NestJS API | `3002` | `PORT` in `backend/.env`; launch profile and startup script are aligned to 3002. |
| Vite dev server | `5173` | Proxies `/api` to `http://localhost:3002`. |
| PostgreSQL | `5432` by default | Override with backend database environment settings. |

Runtime database credentials and JWT secrets belong in the local environment and are intentionally not documented here. Do not commit secret values.

## Start locally

Use separate terminals from the repository root:

```powershell
# Terminal 1
cd backend
npm install
npm run start:dev

# Terminal 2
cd frontend
npm install
npm run dev
```

Use exactly one backend process on port 3002. If the port is already occupied, use the process already serving the API or stop that backend before restarting. `npm start` runs `nest start`; `npm run start:dev` runs Nest in watch mode.

For a fresh database, create the PostgreSQL database and apply `database/schema.sql`, then `database/seed.sql`. For an existing version-1 database, apply `database/migrate_full_questionnaire.sql`. TypeORM `synchronize` is false, so startup does not create or migrate application tables.

## Offline/PWA behavior

- The service worker precaches frontend build assets and uses a NetworkFirst rule for its configured API cache pattern.
- The form is fetched from `GET /survey-forms/active`, stored in IndexedDB, and checked against expected form version 2.
- Draft and pending-sync answers remain on the device until explicitly synced.
- Sync batches are sent to `POST /sync`; each response is persisted transactionally by the backend and returns an individual result.
- PDF export is generated locally by `jspdf`; it does not require a server PDF endpoint.

## Implemented API surface

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Authenticate and return a JWT/user profile. |
| `POST` | `/auth/register` | Create an account (`USER_CREATE`). |
| `GET` | `/auth/users` | List accounts (`USER_CREATE`). |
| `PATCH` | `/auth/users/:id/status` | Activate/deactivate an account (`USER_REMOVE`). |
| `GET` | `/auth/me` | Return authenticated user claims. |
| `GET` | `/survey-forms/active` | Return active form definition (`SURVEY_SUBMIT`). |
| `POST` | `/sync` | Process a non-empty response batch (`SURVEY_SUBMIT`). |
| `GET` | `/industrial-units`, `/industrial-units/:id` | List or retrieve units (authenticated). |
| `POST` | `/industrial-units/:id/approve`, `/industrial-units/:id/reject` | Record review decision (`SURVEY_CONFIRM`). |

## Verification commands

```powershell
# Frontend production bundle
cd frontend
npm run build
npx tsc --noEmit

# Backend compile
cd ..\backend
npm run build
```
