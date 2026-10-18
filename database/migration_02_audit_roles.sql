-- Phase 2: inspect actual role IDs before correcting users created with the old UI mapping.
-- Read-only; safe to run against production.

SELECT id, code, name
  FROM roles
 ORDER BY id;

SELECT u.id AS user_id,
       u.username,
       u.full_name,
       u.is_active,
       r.id AS role_id,
       r.code AS role_code,
       r.name AS role_name
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
 ORDER BY u.created_at, u.username;
