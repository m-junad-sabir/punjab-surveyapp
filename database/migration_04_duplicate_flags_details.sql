-- Phase 3: store the constrained duplicate reason code separately from its explanation.
-- Safe to re-run. Existing reason values and flags are preserved.

BEGIN;

ALTER TABLE duplicate_flags
  ADD COLUMN IF NOT EXISTS details text;

COMMIT;

-- Verify
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = current_schema()
   AND table_name = 'duplicate_flags'
   AND column_name IN ('reason', 'details')
 ORDER BY column_name;
