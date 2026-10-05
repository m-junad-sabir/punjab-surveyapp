# TypeORM entities

These classes map application objects to PostgreSQL tables and describe relations used by services:

- Identity: `user.entity.ts`, `role.entity.ts`
- Survey definition: `survey-form.entity.ts`, `survey-section.entity.ts`, `survey-question.entity.ts`, `survey-question-logic.entity.ts`
- Survey data quality: `survey-response.entity.ts`, `survey-answer.entity.ts`, `duplicate-flag.entity.ts`
- Industrial master data: `industrial-unit.entity.ts`

The SQL schema in `database/schema.sql` is authoritative for database structure. `synchronize` is disabled, so entity changes require a deliberate SQL migration/schema update.
