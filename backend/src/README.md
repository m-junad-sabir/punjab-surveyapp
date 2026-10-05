# Backend source

This directory contains the NestJS application source. The request path is:

```text
HTTP request → controller → service (BLL) → TypeORM repository/raw SQL → PostgreSQL/PostGIS
```

- `main.ts` bootstraps the process and global validation.
- `app.module.ts` registers controllers, services, entities, JWT, and database configuration.
- `controllers/` defines HTTP routes and translates request data into service calls.
- `bll/` contains business rules and transactions.
- `common/` contains reusable authentication and permission plumbing.
- `dal/` contains TypeORM persistence models.
- `database/` contains the TypeORM PostgreSQL connection configuration.
