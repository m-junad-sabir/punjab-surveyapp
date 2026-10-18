Read-only task. Do NOT modify, create, or delete any files. Do NOT print secret values (passwords, JWT secrets, connection strings, tokens): replace any such value with <REDACTED>, but DO tell me whether it comes from an env variable or is hardcoded or has a fallback default.

For each section below, quote the relevant code verbatim (trimmed to the relevant lines) with its file path and line numbers, then add a 1-2 line factual note. If something does not exist, say "NOT PRESENT" instead of guessing.

A. Auth and JWT
1. Full contents of the RBAC guard (RbacGuard) and any @RequirePermissions-style decorator.
2. auth.service.ts: login(), register(), and anything that signs or verifies a JWT. Show the JwtModule/JwtService configuration (secret source, any fallback like `|| 'something'`, expiresIn).
3. Does the guard or any strategy query the database to re-check the user's is_active status or current permissions on each request? Answer yes/no with the evidence.
4. The auth DTOs (login/register) and the User entity (columns only; show password column definition).

B. Validation and bootstrap
5. Full contents of backend/src/main.ts (redact secrets), including the exact ValidationPipe options and CORS config.
6. Is there any rate limiting (@nestjs/throttler), helmet, or compression? List the relevant packages from backend/package.json dependencies.

C. Sync and photos
7. sync.controller.ts, the sync DTOs, and the full sync.service.ts.
8. How are photos or file attachments received and stored? Show the entity columns that hold them (type, e.g. text/bytea/varchar) and the code that writes them. Is the data base64 inside Postgres, written to local disk, or sent to external storage?
9. How does sync handle a failure in one response within a batch? Is it wrapped in a transaction (whole batch or per item)? What is returned to the client per item?
10. The duplicate-detection logic: show the code and any PostGIS functions or SQL used (ST_DWithin, ST_Distance, etc.).

D. Data access scope
11. industrial-unit.controller.ts and industrial-unit.service.ts: show the query used for GET /industrial-units. Is the result filtered by the logged-in user, district, or role, or does it return all units?
12. Which permission names exist (the permission enum/constants) and which roles get which permissions (seed data or constants)?

E. Database and deployment
13. backend/src/database/database.config.ts in full (redact secrets): SSL options, pool settings, synchronize, entities loading.
14. List all entity files with their table names, and any spatial column definitions (geometry type and SRID).
15. Are there migrations or seed scripts in the repo? List their file names and the npm scripts for them from backend/package.json.
16. Output the "scripts" and "dependencies" sections of backend/package.json and frontend/package.json (versions included).

F. Frontend offline behavior
17. In frontend/src: what happens to IndexedDB (db.ts) and localStorage on logout and on a 401 response? Show the logout() code and the unauthorized event handler.
18. Show the service worker / PWA config (vite-plugin-pwa settings in vite.config.ts, or the sw file): caching strategies, registerType, and runtime caching rules for API calls.
19. Is navigator.storage.persist() called anywhere? Answer yes/no with evidence.

G. Security hygiene
20. Run `npm audit --omit=dev` in /backend and /frontend and list only high and critical findings (package, severity, fix available yes/no).
21. Run `git check-ignore -v backend/.env frontend/.env` and `git log --all --oneline -- backend/.env` and show the output (confirm no secrets in history).

Format: one section per letter, numbered answers matching the questions above, code in fenced blocks. If the output is too long, split it into parts and tell me which parts remain.