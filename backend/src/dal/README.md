# Data access layer

The DAL provides TypeORM persistence models under `entities/`. Entities are registered in `AppModule` and injected into services with `@InjectRepository`.

Not every schema table has an entity. Complex workflows such as permissions, approval logs, sync logs, and duplicate checks may use parameterized SQL through TypeORM's `EntityManager`.
