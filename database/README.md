# Database scripts

These PostgreSQL/PostGIS scripts define and initialize the application database:

- `schema.sql` enables required extensions and creates identity/RBAC, geography, industrial-unit, survey-form, response, approval, sync, duplicate-quality, GIS, and audit tables.
- `seed.sql` inserts roles, permissions, initial users, reference geography, the active survey form/questions, conditional logic, and system settings.
- `update_credentials.sql` is for credential maintenance; review its statements before applying it to an existing environment.

Typical setup:

```bash
psql -U postgres -c "CREATE DATABASE punjab_industrial_survey;"
psql -U postgres -d punjab_industrial_survey -f schema.sql
psql -U postgres -d punjab_industrial_survey -f seed.sql
```

The backend expects PostgreSQL with PostGIS available and does not auto-synchronize schema changes.
