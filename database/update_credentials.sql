-- ============================================================================
-- UPDATE USER CREDENTIALS
-- Run this after seed.sql if passwords need to be reset.
--
-- All hashes below are bcrypt (salt rounds = 10).
--   admin       → admin123
--   surveyor1   → surveyor123
--   supervisor1 → supervisor123
-- ============================================================================

-- Admin (already in DB from seed)
UPDATE users
   SET password_hash = '$2b$10$YjfAnezJbGbMH0rOs9LvaOgQ8IkjQF7DqUTCmbiO8GGHQ2ibQFcZe',
       full_name     = 'System Administrator'
 WHERE username = 'admin';
