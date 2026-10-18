-- Read-only diagnostic for the active survey form's Photo Evidence section.
-- Run this against the same database used by the backend deployment.

SELECT current_database() AS database_name,
       current_schema() AS schema_name;

WITH expected_questions(question_code) AS (
  VALUES
    ('L_PHOTO_INTERVIEW_SESSION'),
    ('L_PHOTO_ENTRANCE_SIGNBOARD')
)
SELECT f.id AS form_id,
       f.code AS form_code,
       f.version,
       f.is_active,
       s.id AS section_id,
       s.section_code,
       s.title AS section_title,
       e.question_code AS expected_question_code,
       q.answer_type,
       q.is_required,
       CASE WHEN q.id IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS question_status
  FROM survey_forms f
  CROSS JOIN expected_questions e
  LEFT JOIN survey_sections s
    ON s.form_id = f.id
   AND s.section_code = 'L'
  LEFT JOIN survey_questions q
    ON q.section_id = s.id
   AND q.question_code = e.question_code
 WHERE f.is_active = true
 ORDER BY f.version DESC, e.question_code;
