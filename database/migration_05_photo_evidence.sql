-- Phase 4: final required photo evidence questions and attachment metadata.
-- Safe to re-run. Run after migration_01 through migration_04.

BEGIN;

ALTER TABLE survey_questions
  DROP CONSTRAINT IF EXISTS survey_questions_answer_type_check;
ALTER TABLE survey_questions
  ADD CONSTRAINT survey_questions_answer_type_check
  CHECK (answer_type IN ('TEXT','NUMBER','YES_NO','SINGLE_CHOICE','MULTI_CHOICE','SHARE_PERCENT','MATRIX','REPEATING_GROUP','PHOTO'));

ALTER TABLE survey_attachments
  ADD COLUMN IF NOT EXISTS photo_type varchar(60),
  ADD COLUMN IF NOT EXISTS mime_type varchar(100),
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS sha256 char(64),
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS accuracy_m numeric(8,2),
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'survey_attachments'::regclass
       AND conname = 'survey_attachments_response_photo_type_key'
  ) THEN
    ALTER TABLE survey_attachments
      ADD CONSTRAINT survey_attachments_response_photo_type_key
      UNIQUE (response_id, photo_type);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS survey_photo_uploads (
  photo_id uuid PRIMARY KEY,
  response_id uuid NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  photo_type varchar(60) NOT NULL CHECK (photo_type IN ('L_PHOTO_INTERVIEW_SESSION', 'L_PHOTO_ENTRANCE_SIGNBOARD')),
  storage_key text NOT NULL,
  mime_type varchar(100) NOT NULL CHECK (mime_type = 'image/jpeg'),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 3145728),
  sha256 char(64) NOT NULL,
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m numeric(8,2) NOT NULL CHECK (accuracy_m BETWEEN 0 AND 100),
  captured_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (response_id, photo_type)
);

CREATE INDEX IF NOT EXISTS idx_survey_photo_uploads_owner_response
  ON survey_photo_uploads (uploaded_by, response_id);

WITH active_form AS (
  SELECT id
    FROM survey_forms
   WHERE is_active = true
   ORDER BY version DESC, id DESC
   LIMIT 1
)
INSERT INTO survey_sections (form_id, section_code, title, sort_order)
SELECT f.id,
       'L',
       'Photo Evidence',
       COALESCE((SELECT MAX(existing.sort_order) FROM survey_sections existing WHERE existing.form_id = f.id), 0) + 1
  FROM active_form f
ON CONFLICT (form_id, section_code)
DO UPDATE SET title = EXCLUDED.title;

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type, lookup_type_id, is_required, stored_in)
SELECT s.id, q.question_code, q.question_no, q.question_text, 'PHOTO', NULL, true, 'survey_attachments'
  FROM survey_sections s
  JOIN survey_forms f ON f.id = s.form_id AND f.is_active = true
  CROSS JOIN (VALUES
    ('L_PHOTO_INTERVIEW_SESSION', 'i', 'Photo of interview session'),
    ('L_PHOTO_ENTRANCE_SIGNBOARD', 'ii', 'Enumerator at the industry entrance with its signboard')
  ) AS q(question_code, question_no, question_text)
 WHERE s.section_code = 'L'
   AND f.id = (SELECT id FROM survey_forms WHERE is_active = true ORDER BY version DESC, id DESC LIMIT 1)
ON CONFLICT (question_code)
DO UPDATE SET section_id = EXCLUDED.section_id,
              question_no = EXCLUDED.question_no,
              question_text = EXCLUDED.question_text,
              answer_type = EXCLUDED.answer_type,
              lookup_type_id = EXCLUDED.lookup_type_id,
              is_required = EXCLUDED.is_required,
              stored_in = EXCLUDED.stored_in;

COMMIT;

-- Verify active form questions and attachment contract.
SELECT f.version, s.section_code, s.title, q.question_no, q.question_code, q.answer_type, q.is_required
  FROM survey_forms f
  JOIN survey_sections s ON s.form_id = f.id
  JOIN survey_questions q ON q.section_id = s.id
 WHERE f.is_active = true
   AND s.section_code = 'L'
 ORDER BY q.question_no;

SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = current_schema()
   AND table_name = 'survey_attachments'
 ORDER BY ordinal_position;
