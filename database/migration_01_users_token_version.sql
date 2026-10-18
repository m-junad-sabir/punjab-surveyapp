-- Phase 1: token revocation support.
-- token_version is embedded in each JWT; bumping it invalidates all tokens already issued to that user.
-- must_change_password is used by the admin password-reset flow (Phase 5).
-- Safe to re-run.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false NOT NULL;

COMMIT;

-- Verify
SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
 WHERE table_name = 'users'
   AND column_name IN ('token_version', 'must_change_password');
