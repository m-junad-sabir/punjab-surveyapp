# Business logic layer

The BLL contains application rules that sit between HTTP controllers and persistence. Services validate workflows, coordinate repositories and raw SQL, and shape response DTOs for the frontend.

- `services/auth.service.ts`: bcrypt credentials, users, roles, permissions, and JWT claims.
- `services/survey-form.service.ts`: active form loading, ordering, and conditional logic.
- `services/sync.service.ts`: offline batch deduplication, duplicate detection, response persistence, and sync status.
- `services/industrial-unit.service.ts`: unit queries and transactional approval/rejection audit updates.

Keep authorization at the controller/guard boundary, but keep data-integrity and transaction rules here.
