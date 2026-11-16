-- Workplan 2 Phase 9: Section I compliance and Section J strategy gates.
-- Historical gate values remain NULL; existing matrix answers are not rewritten.
BEGIN;

ALTER TABLE sec_i_compliance
  ADD COLUMN IF NOT EXISTS has_factory_compliance boolean,
  ADD COLUMN IF NOT EXISTS has_certifications boolean;

ALTER TABLE sec_j_strategy
  ADD COLUMN IF NOT EXISTS has_strategic_business_plan boolean,
  ADD COLUMN IF NOT EXISTS has_operational_planning boolean;

UPDATE survey_questions
   SET question_no = CASE question_code
       WHEN 'I_COMPLIANCE_PERMITS' THEN 'i(a)'
       WHEN 'I_CERTIFICATIONS' THEN 'ii(a)'
       WHEN 'J_PLANNING_AREAS' THEN 'i(b)'
       ELSE question_no
     END
 WHERE question_code IN ('I_COMPLIANCE_PERMITS', 'I_CERTIFICATIONS', 'J_PLANNING_AREAS');

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type,
   lookup_type_id, is_required, stored_in)
SELECT section_id, gates.question_code, gates.question_no, gates.question_text,
       'YES_NO', NULL, true, gates.stored_in
  FROM survey_questions section_question
  JOIN (VALUES
    ('I', 'I_COMPLIANCE_GATE', 'i',
     'Does the establishment have factory safety and environmental compliance?', 'sec_i_compliance.has_factory_compliance'),
    ('I', 'I_CERTIFICATIONS_GATE', 'ii',
     'Does the establishment have quality, safety, export, or green certifications?', 'sec_i_compliance.has_certifications'),
    ('J', 'J_STRATEGIC_PLAN_GATE', 'i',
     'Do you have a Strategic Business Plan?', 'sec_j_strategy.has_strategic_business_plan'),
    ('J', 'J_OPERATIONAL_PLANNING_GATE', 'i(a)',
     'Does the establishment have operational planning?', 'sec_j_strategy.has_operational_planning')
  ) AS gates(section_code, question_code, question_no, question_text, stored_in)
    ON true
  JOIN survey_sections section ON section.id = section_question.section_id
                              AND section.section_code = gates.section_code
 WHERE section_question.question_code = CASE gates.section_code
       WHEN 'I' THEN 'I_SAFETY_TRAINING'
       WHEN 'J' THEN 'J_REINVESTMENT_LEVEL'
     END
ON CONFLICT (question_code) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_no = EXCLUDED.question_no,
  question_text = EXCLUDED.question_text,
  answer_type = EXCLUDED.answer_type,
  lookup_type_id = NULL,
  is_required = true,
  stored_in = EXCLUDED.stored_in;

COMMIT;

-- Owner verification (run separately after backup and review):
-- SELECT column_name, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND (table_name, column_name) IN (
--      ('sec_i_compliance', 'has_factory_compliance'),
--      ('sec_i_compliance', 'has_certifications'),
--      ('sec_j_strategy', 'has_strategic_business_plan'),
--      ('sec_j_strategy', 'has_operational_planning')
--    )
--  ORDER BY table_name, column_name;
-- SELECT question_code, question_no, answer_type, is_required, stored_in
--   FROM survey_questions
--  WHERE question_code IN (
--    'I_COMPLIANCE_GATE', 'I_CERTIFICATIONS_GATE', 'I_COMPLIANCE_PERMITS',
--    'I_CERTIFICATIONS', 'J_STRATEGIC_PLAN_GATE', 'J_OPERATIONAL_PLANNING_GATE',
--    'J_PLANNING_AREAS'
--  )
--  ORDER BY section_id, question_no;
-- SELECT section_code, question_no, question_code
--   FROM survey_questions q
--   JOIN survey_sections s ON s.id = q.section_id
--  WHERE section_code IN ('I', 'J')
--  ORDER BY section_code, question_no, q.id;
