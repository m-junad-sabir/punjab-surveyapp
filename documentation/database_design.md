# Database Design

This document describes the database implemented by [`../database/schema.sql`](../database/schema.sql), its seed data in [`../database/seed.sql`](../database/seed.sql), and the additive upgrade in [`../database/migrate_full_questionnaire.sql`](../database/migrate_full_questionnaire.sql).

## Current implementation snapshot

The configured application database was migrated to the active `INDUSTRIAL_SURVEY` form version 2. The inspected snapshot contains 65 base tables, including PostGIS's `spatial_ref_sys`; the application schema defines 64 application tables. It contains 3 roles, 17 permissions, 57 lookup types, 316 active lookup values, 79 matrix items, and 86 question records across Sections A–K. Counts can change when lookup or questionnaire data is updated.

PostgreSQL is used through TypeORM with `synchronize: false`; schema changes are managed through SQL scripts, not automatic ORM synchronization. PostGIS supplies geometry support, and `pg_trgm` is enabled by the schema for similarity operations.

## Data ownership and relationships

### Identity and access

- `roles`, `permissions`, and `role_permissions` define role-based access.
- `users` stores account identity, bcrypt password hashes, active state, role, and optional self-referencing `supervisor_id`.
- The implemented application roles are `ADMIN`, `SUPERVISOR`, and `SURVEYOR`. Route permissions include user creation/removal, survey submission/sync, and supervisor confirmation.

### Form definition and reference data

- `survey_forms` versions a questionnaire; `survey_sections` orders its sections; `survey_questions` registers each question and its answer type/storage target.
- `lookup_types`, `lookup_values`, and `lookup_value_links` provide choice lists and optional parent-child relationships.
- `matrix_items` defines rows for matrix questions and whether a row accepts a choice or a 1–5 rating.
- Reference tables are provided for geography, PSIC classification, HS codes, measurement units, industrial estates, and industrial clusters.

### Establishment and response records

- `industrial_units` is the establishment master record, including identity, coordinates, contact information, classification, location, and approval status.
- `unit_parent_companies` and `unit_associated_establishments` store Section A related records.
- `survey_responses` represents one survey capture for one unit and links to its form and surveyor.
- `survey_attachments` is the schema location for uploaded-file metadata; the current questionnaire workflow described in the app-flow document does not imply that a live file-upload endpoint is available.
- `unit_approval_log` records approval actions; `response_edit_log` supports response correction history.

### Normalized section data

| Sections | Principal tables |
|---|---|
| B | `sec_b_operations` |
| C | `products`, `product_transformation_stages` |
| D | `workforce_employment`, `workforce_skills` |
| E | `sec_e_supply_chain`, `major_inputs` |
| F | `sec_f_market` |
| G | `sec_g_technology`, `critical_machines`, `machinery_age_profile`, `boilers_pressure_vessels`, `weights_measures_equipment` |
| H | `sec_h_environment`, `energy_consumption`, `energy_generation`, `solid_waste_streams`, `solid_waste_disposals` |
| I | `sec_i_compliance` |
| J | `sec_j_strategy` |
| K | `sec_k_future`, `collaborations`, `collaboration_purposes` |

Questions with general multi-select, percentage-share, or matrix values use `response_choices`, `response_shares`, and `response_matrix_answers`, respectively. Repeating questionnaire groups are written to their specific section tables rather than stored as an opaque JSON answer document.

### Sync, quality, and operations

- `sync_log` records server-side batch sync totals and status.
- `duplicate_flags` records a suspected unit and its matched unit, similarity/distance details, and resolution state.
- `gis_quality_log` and `base_map_layers` support spatial-quality and map metadata.
- `audit_log`, `backup_log`, `system_settings`, `dashboard_kpi_definitions`, and `dashboard_saved_filters` support administration and reporting.
- `mv_units_by_district`, `mv_units_by_psic_division`, and `mv_units_by_cluster` are materialized views; `v_percentage_checks` reports percentage totals needing attention.

## Questionnaire and response status

The active form has 11 sections (A–K) and uses the database's allowed answer types: `TEXT`, `NUMBER`, `YES_NO`, `SINGLE_CHOICE`, `MULTI_CHOICE`, `SHARE_PERCENT`, `MATRIX`, and `REPEATING_GROUP`. GPS is captured as structured input on a `TEXT` question because `GPS` is not an allowed database `answer_type`.

The two status columns on `survey_responses` describe different things:

| Column | Values | Meaning |
|---|---|---|
| `status` | `DRAFT`, `PENDING_CONFIRMATION`, `CONFIRMED`, `RETURNED`, `REJECTED` | Survey/review lifecycle. |
| `sync_status` | `PENDING`, `SYNCED`, `REJECTED`, `DUPLICATE` | Server synchronization and data-quality state. |

The client also has local-only statuses such as `draft`, `pending_sync`, and `failed`; these are not values for the database `status` column.

## Transitional text capture for reference data

The official province/division/district/tehsil, PSIC, HS-code, industrial-estate, and industrial-cluster datasets are not yet populated for the current workflow. As requested, those questionnaire values can currently be entered as text. Corresponding foreign-key IDs remain nullable, while text columns retain the entry. Related free-text columns include `province_name`, `division_name`, `district_name`, `tehsil_name`, `psic_division_text`, `psic_group_text`, `psic_class_text`, `major_activity_text`, `hs_code_text`, `industrial_estate_text`, and `industrial_cluster_text`.

Seed-backed lists such as zone type, ownership, legal structure, measurement units, and section lookup values remain choice controls. Loading verified reference datasets should be followed by restoring validated dependent selectors; it should not silently discard existing text values.

## Integrity and database behavior

- Foreign keys connect responses to units, forms, surveyors, and section records.
- Unique constraints prevent duplicate choice/share values per question and duplicate matrix answers per item.
- Checks constrain numeric shares and ratings and enforce product-kind rules.
- Trigger functions validate lookup-list membership, matrix answer shape, confirmation rules, and update timestamps.
- Weekly/monthly operational hours are generated from daily hours and working days.
- Spatial duplicate checks use PostGIS distance plus establishment-name similarity; flagged records are preserved as new captured units for review rather than silently merged.

## Database setup and upgrade

For a fresh database, apply `database/schema.sql`, then `database/seed.sql`. For a database created from the older version-1 form, apply `database/migrate_full_questionnaire.sql` once. The migration is transactional and upgrades the industrial-unit text fields, registers missing questions, adds the temporary “Other” zone option, and activates form version 2.

Do not run the seed and migration indiscriminately against a live environment: review the target database and take a backup first. Runtime ORM synchronization is disabled.
