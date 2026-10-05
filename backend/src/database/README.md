# Backend database configuration

`database.config.ts` creates the TypeORM PostgreSQL configuration used by `AppModule`. It reads connection settings from environment variables, discovers entity classes, configures retry behavior, and keeps `synchronize: false`.

Use the repository-level `database/` scripts to create and seed the database. Do not rely on TypeORM startup to alter production schemas.
