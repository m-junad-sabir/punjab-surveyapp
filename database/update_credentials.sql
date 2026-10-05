-- ============================================================================
-- UPDATE USER CREDENTIALS
-- ============================================================================
-- This script updates user passwords to:
-- admin / admin123
-- surveyor / surveyor123  
-- supervisor / supervisor123
--
-- NOTE: These hashes are bcrypt hashes for the passwords above
-- Generated with bcrypt salt rounds: 10
--
-- admin123 -> $2b$10$sH7uUkD/q0ExGTF0.T7q8eaT4psaGZfAf2sLDmnZjRRODL2/MpjrG
-- surveyor123 -> $2b$10$QI1VBtvTk38bmYn8iO6KSe/nQJRVcbHenZb72HeYGNUpREMA89lje
-- supervisor123 -> $2b$10$MudrvcUsyUEzm74a.roDYeuBQC7.CHHQHG4dL1I8F8pjGzckV4hGG

-- Update admin user password
UPDATE users
SET password_hash = '$2b$10$sH7uUkD/q0ExGTF0.T7q8eaT4psaGZfAf2sLDmnZjRRODL2/MpjrG'
WHERE username = 'admin';

-- Update surveyor user password
UPDATE users 
SET password_hash = '$2b$10$QI1VBtvTk38bmYn8iO6KSe/nQJRVcbHenZb72HeYGNUpREMA89lje'
WHERE username = 'surveyor';

-- Update supervisor user password
UPDATE users 
SET password_hash = '$2b$10$MudrvcUsyUEzm74a.roDYeuBQC7.CHHQHG4dL1I8F8pjGzckV4hGG'
WHERE username = 'supervisor';

-- Verify the updates
SELECT user_id, username, role_id FROM users WHERE username IN ('admin', 'surveyor', 'supervisor');
