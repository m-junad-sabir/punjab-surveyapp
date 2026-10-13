# Tech Stack — Punjab Industrial Survey

**Government of the Punjab · Directorate General of Industries**  
Mapping of Manufacturing Units in Punjab — Field Data Collection System

---

## Overview

A full-stack offline-first Progressive Web App (PWA) for field surveyors to collect industrial unit census data across Punjab. Surveyors work without internet, sync when connected, and supervisors review from the dashboard.

---

## Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20.x | JavaScript runtime |
| Framework | NestJS | 10.x | Modular REST API framework |
| Language | TypeScript | 5.1.x | Type-safe server code |
| ORM | TypeORM | 0.3.x | Database access layer |
| Database Driver | pg (node-postgres) | 8.11.x | PostgreSQL connection |
| Auth | @nestjs/jwt + passport-jwt | 10.x / 4.x | JWT-based authentication |
| Password Hashing | bcrypt | 5.1.x | Secure password storage |
| Validation | class-validator + class-transformer | 0.14.x | DTO validation |
| HTTP Server | Express (via @nestjs/platform-express) | 4.x | HTTP layer |

### Architecture Pattern

```
src/
├── controllers/        ← HTTP layer (routes, request/response)
├── bll/services/       ← Business logic layer
├── dal/entities/       ← TypeORM entities (database models)
├── common/
│   ├── guards/         ← RbacGuard (JWT + permission check)
│   └── decorators/     ← @CurrentUser(), @RequirePermissions()
└── database/           ← TypeORM configuration
```

### API Endpoints

| Method | Route | Permission | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Login, returns JWT |
| POST | `/auth/register` | None | Register new user |
| GET | `/survey-forms/active` | SURVEY_SUBMIT | Fetch full questionnaire |
| POST | `/sync` | SURVEY_SUBMIT | Bulk sync offline responses |
| GET | `/industrial-units` | Any auth | List all units |
| GET | `/industrial-units/:id` | Any auth | Get unit detail |
| POST | `/industrial-units/:id/approve` | UNIT_APPROVE | Approve unit |
| POST | `/industrial-units/:id/reject` | UNIT_APPROVE | Reject unit |

### Configuration

```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_DATABASE=punjab_industrial_survey
JWT_SECRET=punjab-industries-survey-secret-key-2026
JWT_EXPIRES_IN=1d
```

---

## Database

| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 14+ | Primary relational database |
| PostGIS | 3+ | Spatial/geographic queries |
| uuid-ossp extension | — | UUID primary key generation |
| pgcrypto extension | — | Cryptographic functions |

### Key Database Features Used

- **PostGIS geometry** — stores GPS coordinates as `Point(4326)` and boundaries as `MultiPolygon(4326)`
- **ST_DWithin** — finds duplicate units within 50 metres
- **JSONB columns** — stores flexible survey answers, options arrays, validation rules
- **Generated columns** — auto-computed employment totals in section_d_workforce
- **UUID primary keys** — client-generated response IDs for idempotent offline sync

---

## Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.2.x | UI framework |
| TypeScript | 5.3.x | Type safety |
| React Router DOM | 6.22.x | Client-side routing |
| Vite | 5.1.x | Build tool & dev server |
| vite-plugin-pwa | 0.19.x | Service worker & PWA manifest |
| idb | 8.0.x | IndexedDB wrapper (offline storage) |
| uuid | 9.0.x | Client-side UUID generation |

### Frontend Architecture

```
src/
├── pages/              ← Full page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── SurveyPage.tsx       ← Main survey form (11 sections, 296 questions)
│   ├── SurveyListPage.tsx
│   ├── SyncPage.tsx
│   ├── SupervisorPage.tsx
│   ├── UnitDetailPage.tsx
│   └── AdminPage.tsx
├── components/
│   ├── Layout.tsx           ← App bar + bottom nav + outlet
│   └── ProtectedRoute.tsx   ← JWT auth guard
├── context/
│   ├── AuthContext.tsx      ← Login/logout, permissions, localStorage
│   └── SurveyContext.tsx    ← Form cache, online/offline status
├── lib/
│   ├── api.ts               ← All API calls (fetch wrapper)
│   ├── db.ts                ← IndexedDB CRUD (idb)
│   └── deviceId.ts          ← Persistent device UUID
├── styles/
│   └── global.css           ← Premium navy/gold design system
└── types/
    └── index.ts             ← Shared TypeScript interfaces
```

### Offline-First Strategy

1. Survey form fetched from API and cached in IndexedDB (`survey_form` store)
2. Responses saved locally as `draft` → `pending_sync` states
3. Sync page pushes all `pending_sync` responses to `/sync` endpoint in one batch
4. Server returns per-response status; local records updated accordingly
5. Service Worker (Workbox) caches all static assets for full offline use

### PWA Configuration

- `registerType: autoUpdate` — auto-installs service worker updates
- `display: standalone` — app runs without browser chrome on mobile
- `orientation: portrait` — locked for field use
- Runtime cache: NetworkFirst for API calls with 5s timeout

---

## Development Environment

| Tool | Version |
|---|---|
| OS | Windows |
| Node.js | 20.x |
| npm | 10.x |
| VS Code | Latest |

### Commands

```powershell
# Backend
cd backend
npm install
npm run start:dev        # starts on port 3001

# Frontend
cd frontend
npm install
npm run dev              # starts on port 5173

# Database
$env:PGPASSWORD = "postgres123"
psql -U postgres -d punjab_industrial_survey -f database/create_tables.sql
psql -U postgres -d punjab_industrial_survey -f database/seed.sql
```

### Ports

| Service | Port |
|---|---|
| Backend API | 3001 |
| Frontend Dev Server | 5173 |
| PostgreSQL | 5432 |

---

## Security

| Concern | Implementation |
|---|---|
| Authentication | JWT, 1-day expiry, embedded permissions |
| Authorization | RBAC guard on every protected route |
| Password storage | bcrypt with salt rounds = 10 |
| CORS | Configured per environment |
| SQL injection | Parameterized queries via TypeORM |
| Transport | HTTPS in production |
