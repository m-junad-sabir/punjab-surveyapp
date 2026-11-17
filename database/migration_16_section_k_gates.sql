-- Workplan 2 Phase 10: Section K future-plan and barrier branches.
-- Existing future-plan answers and barrier ratings are preserved.
BEGIN;

ALTER TABLE sec_k_future
  ADD COLUMN IF NOT EXISTS has_barriers boolean;

UPDATE survey_questions
   SET question_no = 'iv(a)',
       question_text = 'Rate barriers and bottlenecks: 1 = Don''t happen, 2 = Rarely happen, 3 = Happens, 4 = Happens more often, 5 = Happens frequently.'
 WHERE question_code = 'K_BARRIERS';

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type,
   lookup_type_id, is_required, stored_in)
SELECT section_id, 'K_BARRIERS_GATE', 'iv',
       'Does the establishment face any barriers or bottlenecks?',
       'YES_NO', NULL, true, 'sec_k_future.has_barriers'
  FROM survey_questions
 WHERE question_code = 'K_BARRIERS'
ON CONFLICT (question_code) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_no = EXCLUDED.question_no,
  question_text = EXCLUDED.question_text,
  answer_type = EXCLUDED.answer_type,
  lookup_type_id = NULL,
  is_required = true,
  stored_in = EXCLUDED.stored_in;

UPDATE survey_questions
   SET is_required = true
 WHERE question_code IN ('K_FUTURE_PLAN', 'K_BARRIERS_GATE');

COMMIT;

-- Owner verification (run separately after backup and review):
-- SELECT column_name, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name = 'sec_k_future'
--    AND column_name = 'has_barriers';
-- SELECT question_code, question_no, question_text, answer_type, is_required, stored_in
--   FROM survey_questions
--  WHERE question_code IN ('K_FUTURE_PLAN', 'K_COLLABORATIONS', 'K_BARRIERS_GATE', 'K_BARRIERS');
-- SELECT mi.item_code, mi.item_label, mi.answer_type
--   FROM matrix_items mi
--   JOIN survey_questions q ON q.id = mi.question_id
--  WHERE q.question_code = 'K_BARRIERS'
--  ORDER BY mi.sort_order, mi.id;
