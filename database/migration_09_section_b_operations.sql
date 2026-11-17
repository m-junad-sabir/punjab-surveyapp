-- Workplan 2 Phase 3: Section B working months and shift options.
-- Re-runnable; existing answers are not modified.

BEGIN;

ALTER TABLE sec_b_operations
  ADD COLUMN IF NOT EXISTS working_months_per_year smallint;

DO $$
BEGIN
  IF (
    SELECT atttypid <> 'smallint'::regtype
      FROM pg_attribute
     WHERE attrelid = 'sec_b_operations'::regclass
       AND attname = 'working_months_per_year' AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Existing working_months_per_year column is not smallint; review its data and type before migrating.';
  END IF;

  IF (
    SELECT attnotnull
      FROM pg_attribute
     WHERE attrelid = 'sec_b_operations'::regclass
       AND attname = 'working_months_per_year' AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Existing working_months_per_year column is not nullable; review it before migrating.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'sec_b_operations'::regclass
       AND conname = 'sec_b_operations_working_months_per_year_check'
  ) THEN
    ALTER TABLE sec_b_operations
      ADD CONSTRAINT sec_b_operations_working_months_per_year_check
      CHECK (working_months_per_year BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'sec_b_operations'::regclass
       AND conname = 'sec_b_operations_working_days_per_week_check'
  ) THEN
    ALTER TABLE sec_b_operations
      ADD CONSTRAINT sec_b_operations_working_days_per_week_check
      CHECK (working_days_per_week BETWEEN 1 AND 7) NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  shift_type_id integer;
  section_id_value integer;
BEGIN
  SELECT id INTO shift_type_id FROM lookup_types WHERE code = 'DAILY_HOURS';
  IF shift_type_id IS NULL THEN
    RAISE EXCEPTION 'The DAILY_HOURS lookup type is missing.';
  END IF;

  SELECT s.id INTO section_id_value
    FROM survey_sections s
    JOIN survey_forms f ON f.id = s.form_id
   WHERE f.is_active = true AND s.section_code = 'B'
   ORDER BY f.version DESC, f.id DESC
   LIMIT 1;
  IF section_id_value IS NULL THEN
    RAISE EXCEPTION 'No active form with Section B exists.';
  END IF;

  INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
  VALUES (shift_type_id, 'LESS_THAN_8', 'Less than 8 Hours', false, 0, true)
  ON CONFLICT (type_id, code) DO UPDATE SET
    label = EXCLUDED.label,
    requires_text = EXCLUDED.requires_text,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

  UPDATE survey_questions
     SET question_text = 'Daily operating hours / shift and working schedule'
   WHERE section_id = section_id_value
     AND question_code = 'B_OPERATIONAL_HOURS';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The active Section B has no B_OPERATIONAL_HOURS question.';
  END IF;
END $$;

COMMIT;

-- Verification (run separately after applying):
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--  WHERE table_schema = current_schema() AND table_name = 'sec_b_operations'
--    AND column_name = 'working_months_per_year';
-- SELECT conname, convalidated, pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid = 'sec_b_operations'::regclass
--    AND conname IN ('sec_b_operations_working_days_per_week_check',
--                    'sec_b_operations_working_months_per_year_check');
-- SELECT response_id, working_days_per_week, working_months_per_year FROM sec_b_operations
--  WHERE working_days_per_week NOT BETWEEN 1 AND 7
--     OR working_months_per_year NOT BETWEEN 1 AND 12;
-- If the working-days check is not validated, review any reported historical
-- rows before an owner runs ALTER TABLE sec_b_operations VALIDATE CONSTRAINT.
-- SELECT lv.code, lv.label, lv.sort_order, lv.is_active FROM lookup_values lv
--   JOIN lookup_types lt ON lt.id = lv.type_id
--  WHERE lt.code = 'DAILY_HOURS' ORDER BY lv.sort_order, lv.id;
-- SELECT question_code, question_text FROM survey_questions
--  WHERE question_code = 'B_OPERATIONAL_HOURS';
