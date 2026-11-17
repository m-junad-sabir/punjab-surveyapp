-- Phase 2: Section A interviewees, capital investment, and area units.
-- Safe to re-run. Apply only after migrations 01-07 and the base questionnaire.

BEGIN;

ALTER TABLE industrial_units
  ADD COLUMN IF NOT EXISTS total_capital_investment numeric(18,2),
  ADD COLUMN IF NOT EXISTS capital_investment_unit_id integer REFERENCES lookup_values(id);

CREATE INDEX IF NOT EXISTS idx_industrial_units_capital_investment_unit_id
  ON industrial_units (capital_investment_unit_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'industrial_units'::regclass
       AND conname = 'industrial_units_capital_investment_nonnegative_check'
  ) THEN
    ALTER TABLE industrial_units
      ADD CONSTRAINT industrial_units_capital_investment_nonnegative_check
      CHECK (total_capital_investment IS NULL OR total_capital_investment >= 0);
  END IF;
END $$;

INSERT INTO lookup_types (code, name, description)
VALUES (
  'CAPITAL_INVESTMENT_UNIT',
  'Capital investment currency unit',
  'Currency and scale used for total capital investment'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
SELECT t.id, units.code, units.label, false, units.sort_order, true
  FROM lookup_types t
 CROSS JOIN (VALUES
   ('MILLION_PKR', 'Million PKR', 1),
   ('BILLION_PKR', 'Billion PKR', 2),
   ('MILLION_USD', 'Million USD', 3),
   ('BILLION_USD', 'Billion USD', 4),
   ('MILLION_EURO', 'Million Euro', 5),
   ('BILLION_EURO', 'Billion Euro', 6)
 ) AS units(code, label, sort_order)
 WHERE t.code = 'CAPITAL_INVESTMENT_UNIT'
ON CONFLICT (type_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  requires_text = false,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO measurement_units (code, name, unit_kind)
VALUES
  ('SQKM', 'Square kilometre', 'AREA'),
  ('ARE', 'Are', 'AREA'),
  ('SQM', 'Square metre', 'AREA'),
  ('SQFT', 'Square foot', 'AREA'),
  ('SQYD', 'Square yard (gaz/gazz)', 'AREA'),
  ('MARLA_27225', 'Marla (272.25 sq ft)', 'AREA'),
  ('MARLA_225', 'Marla (225 sq ft local)', 'AREA'),
  ('KANAL_5445', 'Kanal (5,445 sq ft)', 'AREA'),
  ('KANAL_4500', 'Kanal (4,500 sq ft local)', 'AREA'),
  ('ACRE', 'Acre', 'AREA'),
  ('HECTARE', 'Hectare', 'AREA')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  unit_kind = EXCLUDED.unit_kind;

CREATE TABLE IF NOT EXISTS response_interviewees (
  id bigserial PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation text NOT NULL,
  contact_number varchar(11) NOT NULL
    CHECK (contact_number ~ '^[0-9]{11}$')
);

CREATE INDEX IF NOT EXISTS idx_response_interviewees_response_id
  ON response_interviewees (response_id);

DO $$
DECLARE section_id_value integer;
BEGIN
  SELECT s.id INTO section_id_value
    FROM survey_sections s
    JOIN survey_forms f ON f.id = s.form_id
   WHERE f.is_active = true AND s.section_code = 'A'
   ORDER BY f.version DESC, f.id DESC
   LIMIT 1;

  IF section_id_value IS NULL THEN
    RAISE EXCEPTION 'No active form with Section A exists.';
  END IF;

  INSERT INTO survey_questions
    (section_id, question_code, question_no, question_text, answer_type, is_required, stored_in)
  VALUES
    (section_id_value, 'A_INTERVIEWEES', 'i(a)', 'Interviewee biodata', 'REPEATING_GROUP', false, 'response_interviewees'),
    (section_id_value, 'A_TOTAL_CAPITAL_INVESTMENT', 'xv', 'Total capital investment', 'REPEATING_GROUP', false, 'industrial_units')
  ON CONFLICT (question_code) DO UPDATE SET
    section_id = EXCLUDED.section_id,
    question_no = EXCLUDED.question_no,
    question_text = EXCLUDED.question_text,
    answer_type = EXCLUDED.answer_type,
    is_required = EXCLUDED.is_required,
    stored_in = EXCLUDED.stored_in;

  UPDATE survey_questions
     SET question_no = 'xii(a)',
         question_text = 'Parent company details'
   WHERE section_id = section_id_value
     AND question_code = 'A_PARENT_COMPANY_DETAILS';

  UPDATE survey_questions
     SET question_no = 'xiii'
   WHERE section_id = section_id_value
     AND question_code = 'A_ASSOCIATED_ESTABLISHMENTS';

  UPDATE survey_questions
     SET question_no = 'xiv'
   WHERE section_id = section_id_value
     AND question_code = 'A_ESTABLISHMENT_AREA';
END $$;

COMMIT;

-- Verification (run separately after applying):
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'industrial_units'
--    AND column_name IN ('total_capital_investment', 'capital_investment_unit_id');
-- SELECT code, unit_kind FROM measurement_units
--  WHERE code IN ('SQKM', 'ARE', 'MARLA_27225', 'MARLA_225',
--                 'KANAL_5445', 'KANAL_4500');
-- SELECT lt.code, lv.code, lv.label
--   FROM lookup_types lt JOIN lookup_values lv ON lv.type_id = lt.id
--  WHERE lt.code = 'CAPITAL_INVESTMENT_UNIT' ORDER BY lv.sort_order;
-- SELECT question_code, question_no FROM survey_questions
--  WHERE question_code IN ('A_INTERVIEWEES', 'A_PARENT_COMPANY_DETAILS',
--                           'A_ASSOCIATED_ESTABLISHMENTS',
--                           'A_ESTABLISHMENT_AREA', 'A_TOTAL_CAPITAL_INVESTMENT')
--  ORDER BY question_no;
