# Punjab Industrial Survey App

## Stack
- **Backend**: NestJS 10 + TypeORM + PostgreSQL/PostGIS
- **Frontend**: React 18 + Vite + PWA (offline-capable)

---

## 1. Database Setup

```bash
# Create DB and run schema
psql -U postgres -c "CREATE DATABASE punjab_industrial_survey;"
psql -U postgres -d punjab_industrial_survey -f database/schema.sql
psql -U postgres -d punjab_industrial_survey -f database/seed.sql
```

---

## 2. Start the Backend

```bash
cd backend
npm install
npm run start:dev
# Running on http://localhost:3000
```

---

## 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 4. Test Accounts

| Username      | Password      | Role        |
|---------------|---------------|-------------|
| `surveyor1`   | `password123` | Surveyor    |
| `supervisor1` | `password123` | Supervisor  |
| `admin`       | `password123` | DB Admin    |

---

## 5. PWA Offline Testing

1. Login → Dashboard → click **Download Form** (requires internet once)
2. In browser DevTools → Application → Service Workers → check **Offline**
3. Fill out a survey — it saves to IndexedDB
4. Uncheck Offline → go to **Sync** → click **Sync Now**

---

## API Endpoints

| Method | Route                           | Auth Required    |
|--------|---------------------------------|------------------|
| POST   | /auth/login                     | No               |
| POST   | /auth/register                  | No               |
| GET    | /survey-forms/active            | SURVEY_SUBMIT    |
| POST   | /sync                           | SURVEY_SUBMIT    |
| GET    | /industrial-units               | Authenticated    |
| GET    | /industrial-units/:id           | Authenticated    |
| POST   | /industrial-units/:id/approve   | UNIT_APPROVE     |
| POST   | /industrial-units/:id/reject    | UNIT_APPROVE     |
