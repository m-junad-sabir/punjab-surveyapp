-- Phase 2: align deployed workforce gender constraints with the application and schema.sql.
-- Safe to re-run. The migration only alters CHECK constraints involving the gender column.

BEGIN;

ALTER TABLE workforce_employment
  DROP CONSTRAINT IF EXISTS workforce_employment_gender_check;
ALTER TABLE workforce_skills
  DROP CONSTRAINT IF EXISTS workforce_skills_gender_check;

ALTER TABLE workforce_employment
  ADD CONSTRAINT workforce_employment_gender_check
  CHECK (gender IN ('MALE', 'FEMALE', 'Other'));

ALTER TABLE workforce_skills
  ADD CONSTRAINT workforce_skills_gender_check
  CHECK (gender IN ('MALE', 'FEMALE', 'Other'));

COMMIT;

-- Verify
SELECT table_name, constraint_name, check_clause
  FROM information_schema.check_constraints cc
  JOIN information_schema.table_constraints tc USING (constraint_catalog, constraint_schema, constraint_name)
 WHERE tc.table_schema = current_schema()
   AND tc.table_name IN ('workforce_employment', 'workforce_skills')
   AND tc.constraint_type = 'CHECK'
   AND cc.check_clause ILIKE '%gender%';
