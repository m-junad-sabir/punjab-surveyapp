# Backend

The backend is a NestJS 10 REST API for authentication, survey-form delivery, offline response synchronization, and industrial-unit review. It uses TypeORM with PostgreSQL/PostGIS and follows a controller → business service → data-access/entity structure.

## Runtime flow

`src/main.ts` loads environment variables, enables CORS and validation, and starts the application. `src/app.module.ts` wires controllers, services, TypeORM entities, and JWT support. The API listens on `PORT` or `3000`.

## API surface

| Method | Route | Purpose | Access |
|---|---|---|---|
| POST | `/auth/register` | Create a user | Public |
| POST | `/auth/login` | Issue a JWT and user permissions | Public |
| GET | `/survey-forms/active` | Return the ordered active form | `SURVEY_SUBMIT` |
| POST | `/sync` | Push offline responses | `SURVEY_SUBMIT` |
| GET | `/industrial-units` | List units | Authenticated |
| GET | `/industrial-units/:id` | View one unit | Authenticated |
| POST | `/industrial-units/:id/approve` | Approve a unit | `UNIT_APPROVE` |
| POST | `/industrial-units/:id/reject` | Reject a unit | `UNIT_APPROVE` |

All protected requests use `Authorization: Bearer <jwt>`. See the child directory READMEs for request ownership and persistence details.

## Development

```bash
npm install
npm run start:dev
```

Database configuration is in `src/database`; schema creation and seed data are in `../database`.
