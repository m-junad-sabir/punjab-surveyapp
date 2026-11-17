-- Workplan 2 Phase 11. Run after migration 05 (and the other approved prerequisites).
-- Existing photo rows are retained. Review historical violations before validating.
BEGIN;

ALTER TABLE survey_photo_uploads
  DROP CONSTRAINT IF EXISTS survey_photo_uploads_accuracy_m_check;
ALTER TABLE survey_photo_uploads
  ADD CONSTRAINT survey_photo_uploads_accuracy_m_check
  CHECK (accuracy_m BETWEEN 0 AND 250) NOT VALID;

ALTER TABLE survey_attachments
  DROP CONSTRAINT IF EXISTS survey_attachments_photo_accuracy_check;
ALTER TABLE survey_attachments
  ADD CONSTRAINT survey_attachments_photo_accuracy_check
  CHECK (photo_type IS NULL OR (accuracy_m IS NOT NULL AND accuracy_m BETWEEN 0 AND 250)) NOT VALID;

COMMIT;

-- Owner verification: run separately after backup and review.
-- SELECT conrelid::regclass, conname, convalidated, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conname IN ('survey_photo_uploads_accuracy_m_check', 'survey_attachments_photo_accuracy_check');
-- SELECT photo_id, accuracy_m FROM survey_photo_uploads
--  WHERE accuracy_m NOT BETWEEN 0 AND 250;
-- SELECT id, photo_type, accuracy_m FROM survey_attachments
--  WHERE photo_type IS NOT NULL AND (accuracy_m IS NULL OR accuracy_m NOT BETWEEN 0 AND 250);
-- Only after reviewing/resolving historical violations:
-- ALTER TABLE survey_photo_uploads VALIDATE CONSTRAINT survey_photo_uploads_accuracy_m_check;
-- ALTER TABLE survey_attachments VALIDATE CONSTRAINT survey_attachments_photo_accuracy_check;
