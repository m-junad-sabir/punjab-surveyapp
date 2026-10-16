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
psql -U postgres -d punjab_industrial_survey -f database/seed_punjab_geography.sql
psql -U postgres -d punjab_industrial_survey -f database/seed_classification_codes.sql
```

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
| `surveyor`   | `surveyor123` | Surveyor    |
| `supervisor` | `supervisor123` | Supervisor  |
| `admin`      | `admin123` | DB Admin    |

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
