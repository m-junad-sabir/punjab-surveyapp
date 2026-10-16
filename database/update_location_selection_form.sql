BEGIN;

UPDATE survey_forms
   SET is_active = false
 WHERE code = 'INDUSTRIAL_SURVEY'
   AND is_active
   AND version < 3;

UPDATE survey_forms
   SET version = 3,
       is_active = true
 WHERE code = 'INDUSTRIAL_SURVEY'
   AND version = 2
   AND NOT EXISTS (
     SELECT 1
       FROM survey_forms existing
      WHERE existing.code = 'INDUSTRIAL_SURVEY'
        AND existing.version = 3
   );

UPDATE survey_forms
   SET is_active = true
 WHERE code = 'INDUSTRIAL_SURVEY'
   AND version = 3;

UPDATE survey_questions q
   SET question_text = 'District and tehsil'
  FROM survey_sections s
  JOIN survey_forms f ON f.id = s.form_id
 WHERE q.section_id = s.id
   AND f.code = 'INDUSTRIAL_SURVEY'
   AND f.version = 3
   AND q.question_code = 'A_LOCATION';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM survey_forms
     WHERE code = 'INDUSTRIAL_SURVEY'
       AND version = 3
       AND is_active
  ) THEN
    RAISE EXCEPTION 'Could not activate survey form version 3; verify the existing active form version.';
  END IF;
END $$;

COMMIT;
