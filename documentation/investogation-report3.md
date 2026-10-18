# REPORT PART ONE:

I can see you have `investigation-four.md` open. Let me read it to understand the context.This is a thorough database audit prompt. Let me gather all the relevant files and conduct the investigation.Now let me read the SETUP_DATABASE.bat file and the remaining truncated files:Now let me read the remaining continuation of seed_classification_codes.sql:I now have all the essential content from every requested file. The `seed_classification_codes.sql` file is extremely large (containing the full PSIC Rev.4 hierarchy plus the full Pakistan Customs Tariff HS codes list continuing for many hundreds more entries of the same pattern). I have sufficient content to provide a comprehensive answer covering the full verbatim text of all 14 SQL files and the batch script.The context-gatherer returned the analysis but not the raw file content I need. Let me read the files directly.Now let me read the entity files and the remaining database scripts in parallel:Now let me read the remaining service files and migration scripts:Now let me read the remaining update scripts and the app module to understand what schema the application actually registers:Now let me check for a SETUP_DATABASE.bat file and look at a couple more remaining update scripts:I now have a comprehensive picture of the entire database architecture. Let me compile the full audit report:The audit is complete. Here is a summary of what was found.

---

## Canonical Setup

`SETUP_DATABASE.bat` is the only automated installer. It runs six steps in dependency order: `schema.sql` → `seed.sql` → `seed_punjab_geography.sql` → `seed_classification_codes.sql`. The remaining twelve SQL files in `database/` are incremental patches or legacy scripts — none are run by the batch file.

The fresh install is **not safely repeatable**: `schema.sql` uses bare `CREATE TABLE` (no `IF NOT EXISTS` on most tables) and `seed.sql` uses bare `INSERT` with no `ON CONFLICT` guards. A re-run on a populated database will error midway through.

---

## Critical Findings

**Finding A — `duplicate_flags.reason` (P1 blocker):** The SQL schema enforces a `CHECK (reason IN ('NAME_SIMILARITY','GPS_PROXIMITY','BOTH'))` on a `varchar(30)` column. `sync.service.ts` stores a free-text description like `"25m from \"ACME Textiles\" (82% name match)"`. Every sync that detects a duplicate will roll back the entire transaction, silently losing the response and its industrial unit. Fix: store the structured code in `reason`; move the human-readable text elsewhere.

**Finding B — `survey_responses.status` (P1 near-miss):** The entity declares `length: 20` but the value `PENDING_CONFIRMATION` is 21 characters. The DB column is `varchar(25)` so today's inserts succeed at the PostgreSQL level, but any TypeORM-generated migration will create `varchar(20)` and break it permanently.

**Finding C — Approval atomicity (P2):** `approveUnit` / `rejectUnit` issue three separate, non-transactional writes (unit UPDATE → approval log INSERT → response UPDATE). A mid-sequence failure leaves the unit and response in inconsistent states.

**Finding F/G — Orphaned entity files:** `sync-log.entity.ts` maps entirely wrong column names. `section-record.entity.ts` maps to `survey_submissions`-based tables that do not exist in the canonical schema. Neither file is registered in `AppModule` so there is no runtime failure today, but they are serious documentation hazards.

**Finding E — Attachments inaccessible:** `survey_attachments` exists in `schema.sql` but has no service, controller or entity. `cleanup_redundant_tables.sql` drops it. The application cannot save or retrieve attachments regardless of which path was used.

---

The artifact above contains the full discrepancy matrix, business relationship map, all eight findings with line-number evidence, the legacy schema path risk analysis, and the prioritised non-destructive remediation plan including verification queries.

# REPORT PART TWO:

Let me read all the open files to understand the live database state before re-evaluating.Excellent. I now have the exact live database schema. Let me do a careful diff of every finding from the previous report against the live reality, then produce a corrected report.Here is a summary of what changed and what the live database revealed.

---

## What the Live DB Confirmed or Corrected

**Setup path confirmed:** The live database is the canonical `schema.sql` installation. `cleanup_redundant_tables.sql` was never run. The migration script (`migrate_full_questionnaire.sql`) was applied — confirmed because `industrial_units` has `province_name`, `division_name`, `district_name`, `tehsil_name` as NOT NULL columns.

**Finding A (P1 — active bug) — CONFIRMED.** The live DB `duplicate_flags_reason_check` constraint is exactly `reason IN ('NAME_SIMILARITY','GPS_PROXIMITY','BOTH')`. `sync.service.ts` stores a free-text sentence. Every sync that triggers duplicate detection rolls back, losing the entire response. This is the most urgent fix.

**Finding B (was P1, now P2) — revised downward.** The live `survey_responses.status` column is `varchar(25)`, not 20. `PENDING_CONFIRMATION` (21 chars) fits. Not an active crash today, but the entity's `length: 20` annotation is still wrong and will break things the moment anyone runs `typeorm migration:generate`.

**Finding C (P2) — confirmed.** Approval code is non-transactional. `unit_approval_log` and `survey_attachments` are both live in the database.

**Two new findings added:**

- **Finding I (P2 — new):** Live DB `workforce_employment` and `workforce_skills` have `gender IN ('MALE','FEMALE')`. The application code allows `Other` at the TypeScript layer. Any response submitting a third gender option rolls back.
- **Finding J (P3 — new):** `sec_b_operations.weekly_hours` and `monthly_hours` are generated columns in the live DB. Informational only.

**Performance observation added:** The `idx_units_name_trgm` GIN trigram index exists in the live DB but the duplicate detection code uses a JavaScript Levenshtein function instead. The index is entirely unused. A simple SQL change would use it and scale much better.