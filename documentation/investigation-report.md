I’ll treat the attached audit prompts as one read-only investigation: the first defines the report structure, and the second adds verbatim evidence and dependency/repository checks where available. I’ll verify implementation rather than comments, avoid exposing secret values, and I won’t modify project files or touch the database.

Searched for files matching `**/backend/**/*.{spec,test}.ts`, no matches

Searched for files matching `**/database/*.{sql,bat}`, 14 matches

Searched for files matching `**/.github/workflows/**`, no matches

Read 

Read 

Read 

Read , lines 1 to 480

So far the backend source confirms the main audit risks are around authorization scope, JWT freshness, and sync validation/retry semantics rather than basic route wiring. The repository search found no backend test files or GitHub workflow files under the searched patterns; next I’m tracing the response writer and exact guard/service branches, then I’ll do the requested read-only audit/history checks if the terminal capability is available.

Read , lines 400 to 737

Read 

Read 

Read 

Read 

Read 



The sync path is per-response transactional, while sync-log writes are outside those transactions; question IDs are checked against the submitted `form_id`, but I haven’t found a check that the form is currently active or that required answers are complete. I’m now gathering the remaining evidence on entity mappings, attachment persistence, tests, and deployment hygiene; the requested terminal checks are not exposed as an available tool here, so I won’t claim to have run them.

Searched for files matching `**/{package-lock.json,pnpm-lock.yaml,yarn.lock,.gitignore}`, 4 matches

Searched for regex `JWT_SECRET|expiresIn|issuer|audience|jwtService\.(sign|verify)|is_active|bcrypt\.(hash|compare)|@RequirePermissions|@UseGuards` (`**/backend/src/**/*.ts`), 33 results

Searched for regex `@Entity|geometry|Geometry|MultiPolygon|Point` (`**/backend/src/dal/entities/*.ts`), 37 results

Searched for files matching `**/*.{spec,test}.{ts,tsx,js,jsx}`, no matches

Searched for regex `survey_attachments|FileInterceptor|Multer|base64|data:image|answer_type === 'PHOTO'|preview` (`**/backend/src/**/*.ts`), 1 result

Read 

Read 

Searched for regex `app\.use\(require\('express'\)\.json|enableCors|origin:|methods:|new ValidationPipe|whitelist:|transform:|forbidNonWhitelisted|process\.env\.PORT` (`**/backend/src/main.ts`), 10 results

Searched for regex `async findAll|unitRepo\.find|async approveUnit|async rejectUnit|unitRepo\.update|INSERT INTO unit_approval_log|UPDATE survey_responses|@RequirePermissions|@UseGuards` (`**/backend/src/{bll/services/industrial-unit.service.ts,controllers/industrial-unit.controller.ts}`), 15 results

Searched for regex `secret:|expiresIn|bcrypt\.hash|bcrypt\.compare|const payload|access_token|is_active|setActiveStatus|findOne\(` (`**/backend/src/{app.module.ts,bll/services/auth.service.ts,common/guards/rbac.guard.ts}`), 16 results

Searched for regex `openDB|survey-pwa|upgrade\(|oldVersion|deleteObjectStore|offline_responses|localStorage|survey:unauthorized|removeItem|api\.sync\.push|saveResponse\(|pending_sync|sync_status: result` (`**/frontend/src/{lib/db.ts,context/AuthContext.tsx,pages/SyncPage.tsx,pages/SurveyPage.tsx}`), 30 results

Searched for regex `dataSource\.transaction|findOne\(SurveyResponse|questionIds|ANY\(\$1::int\[\]\)|ST_Distance|ST_DWithin|createIndustrialUnit|trx\.save\(SurveyResponse|saveNormalizedSurveyAnswers|duplicate_flagged|UPDATE sync_log` (`**/backend/src/bll/services/sync.service.ts`), 18 results

Searched for regex `@Controller|@Get|@Post|@Patch|@UseGuards|@RequirePermissions|async (login|register|listUsers|setUserStatus|me|findAll|findOne|approve|reject|syncBatch|getActiveForm)` (`**/backend/src/controllers/*.ts`), 40 results

Read 

Searched for regex `const ROLES|Surveyor|Supervisor|DB Admin|sync: \{|SYNC_DATA|SURVEY_SUBMIT|device_id:|responses: pending|result\.status|duplicate_flagged|failed` (`**/frontend/src/{pages/AdminPage.tsx,lib/api.ts,pages/SyncPage.tsx,types/index.ts}`), 35 results

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for regex `MINIMUM_FORM_VERSION|CURRENT_FORM_CACHE_REVISION|version <|cached\.version|client_cache_revision|fetchForm\(` (`**/frontend/src/context/SurveyContext.tsx`), 9 results

Searched for regex `@PrimaryColumn|@PrimaryGeneratedColumn|@Entity|@Column\(\{ type: 'geometry'|spatialFeatureType|srid|password_hash` (`**/backend/src/dal/entities/*.ts`), 55 results

Searched for regex `CREATE TABLE survey_attachments|storage_path|file_type|file_name|CREATE TABLE survey_responses|CREATE TABLE roles|INSERT INTO roles|INSERT INTO permissions|INSERT INTO role_permissions|CREATE TRIGGER trg_confirm_check|CREATE FUNCTION fn_check_confirmation` (`**/database/{schema.sql,seed.sql}`), 11 results

Searched for regex `synchronize:|DATABASE_URL|ssl|max:|retryAttempts|entities:|JWT_SECRET|PORT=` (`**/backend/src/{database/database.config.ts,main.ts,app.module.ts}`), 6 results

Searched for regex `data:image|reader\.readAsDataURL|onChange\(\{ file_name|preview|has_future_plan|otherSectionErrors|can submit now|incompleteSection|saveResponse\(buildResponse\('pending_sync'\)\)` (`**/frontend/src/pages/SurveyPage.tsx`), 18 results

Searched for regex `scripts|dependencies|helmet|throttler|compression|swagger|@nestjs/throttler|helmet|compression` (`**/{backend/package.json,frontend/package.json}`), 6 results

Searched for files matching `**/backend/test/**`, no matches

Searched for regex `@Entity|async findAll|async findOne|async approveUnit|async rejectUnit|unitRepo\.find|unitRepo\.update|INSERT INTO unit_approval_log|UPDATE survey_responses` (`**/backend/src/{dal/entities/industrial-unit.entity.ts,bll/services/industrial-unit.service.ts}`), 13 results

Searched for regex `VitePWA|registerType|runtimeCaching|localhost:3002|handler: 'NetworkFirst'|/api` (`**/frontend/vite.config.ts`), 9 results

Searched for regex `@Post\(\)|responses: Array|Request must include|@RequirePermissions\('SURVEY_SUBMIT'\)|unit_id\?:|resp\.unit_id|new Date\(resp\.|status: 'PENDING_CONFIRMATION'` (`**/backend/src/controllers/sync.controller.ts`), 4 results

Searched for regex `@Body\(\) body:|interface RegisterBody|interface LoginBody|password: string|role_id: number|@Post\('register'\)|@Patch\('users/:id/status'\)|@Get\('users'\)` (`**/backend/src/controllers/auth.controller.ts`), 11 results

Searched for regex `CREATE TABLE survey_responses|PRIMARY KEY|CREATE TABLE survey_attachments|storage_path|CREATE FUNCTION fn_check_confirmation|filler_sup|Only the surveyor` (`**/database/schema.sql`), 72 results

Searched for files matching `**/frontend/**/*test*`, no matches

Searched for regex `useState<User|TOKEN_KEY|localStorage\.setItem|localStorage\.removeItem|handleUnauthorized|survey:unauthorized|window\.addEventListener` (`**/frontend/src/context/AuthContext.tsx`), 10 results

A concrete schema-contract issue surfaced in the duplicate path: the service appears to persist its human-readable proximity/name explanation into the database `reason` column, while the attached schema constrains that column to a small set of reason codes. I’m verifying the entity and checking whether any migration changes that constraint before treating it as a confirmed finding; I’m also checking exact line references for the final report.

Searched for regex `matchReason|reason:|name_similarity:|distance_m:|ST_Distance|ST_DWithin` (`**/backend/src/bll/services/sync.service.ts`), 8 results

Searched for regex `duplicate_flags|name_similarity|distance_m|reason varchar|CHECK \(reason` (`**/database/**/*.sql`), 16 results

Searched for regex `@Entity|name:|@Column|type: 'geometry'|spatialFeatureType|srid` (`**/backend/src/dal/entities/{industrial-unit.entity.ts,survey-submission.entity.ts,reference.entity.ts,section-record.entity.ts}`), 115 results

Searched for regex `jsonb\(\{ limit|urlencoded|PORT|ssl|pool|synchronize|retryAttempts` (`**/backend/src/{main.ts,database/database.config.ts}`), 15 results

Searched for regex `@RequirePermissions|PERMISSIONS_KEY|reflector|getAllAndOverride|userPermissions|request\.user|UnauthorizedException|ForbiddenException` (`**/backend/src/common/**/*.ts`), 16 results

Read 

Searched for regex `\.env|backend/\.env|frontend/\.env` (`**/.gitignore`), 6 results

Searched for regex `@Column\(\{ length: 255 \}\)|reason: string|@Entity\(\{ name: 'duplicate_flags' \}\)|CREATE TABLE duplicate_flags|reason varchar\(30\)|CHECK \(reason` (`**/backend/src/dal/entities/duplicate-flag.entity.ts`), 3 results

Searched for regex `const inserted = await manager\.query|The establishment name is required|legacyLocationFallback|WHERE d\.id = \$1|INSERT INTO industrial_units|async function createIndustrialUnit|answerOptionId|question\.answer_type` (`**/backend/src/bll/services/survey-response-writer.ts`), 34 results

Searched for regex `role_id: number|JWT|signOptions|expiresIn|where: \{ is_active|MINIMUM_FORM_VERSION|CURRENT_FORM_CACHE_REVISION|oldVersion >= 1 && oldVersion < 5|deleteObjectStore|return database\.getAllFromIndex` (`**/{backend/src/app.module.ts,backend/src/bll/services/survey-form.service.ts,frontend/src/context/SurveyContext.tsx,frontend/src/lib/db.ts}`), 16 results

Searched for regex `INSERT INTO roles|ADMIN','Admin|SUPERVISOR','Supervisor|SURVEYOR','Surveyor|role_permissions` (`**/database/seed.sql`), 5 results

Searched for regex `VITE_API_BASE_URL|const BASE|survey_token|Authorization|survey:unauthorized|failed|pending_sync|saveSyncLog|handleSync|navigator\.storage` (`**/frontend/src/{lib/api.ts,pages/SyncPage.tsx,context/AuthContext.tsx,lib/db.ts}`), 18 results

Searched for regex `const matchReason|reason: *matchReason|if \(isDuplicate && matchedUnitId\)|await trx\.save\(DuplicateFlag|const linkedUnitId|if \(existing\)|syncBatch\(payload\)|const finalStatus` (`**/backend/src/bll/services/sync.service.ts`), 6 results

## A. Executive Summary
Read-only audit of the implementation in `src`, `src`, the attached database SQL, and package configuration. No files or database were changed.

The most consequential findings are: the UI maps roles to IDs differently from the seed order; suspected-duplicate syncs conflict with the schema’s `duplicate_flags.reason` constraint; and authenticated users can list all units while supervisor actions lack an application-level assignment check. JWTs also use a hard-coded fallback secret if the environment variable is missing or empty, and deactivating a user does not revoke an already-issued token.

## B. Verified Flows
- **Authentication:** `auth.service.ts:68` looks up an active user, verifies the password with bcrypt, loads the role’s permissions, and signs a JWT. Passwords are hashed with bcrypt on registration. The token expires after one day; no issuer or audience is configured in `app.module.ts:49`. `JWT_SECRET` is used when set, otherwise signing and verification both use a hard-coded fallback. The `.env` file is ignored by `.gitignore:7`, but ignore rules do not prove it is absent from Git history.
- **JWT guard:** `rbac.guard.ts:24` rejects missing, malformed, expired, or incorrectly signed tokens; it attaches decoded claims to `request.user` and checks required permission metadata. It does not query the database. Permissions can therefore remain stale until token expiry, and a deactivated user’s existing token remains usable until then.
- **Frontend session:** `AuthContext.tsx:13` restores user and token from `localStorage`; logout removes only those two entries. A `401` triggers logout, but does not clear IndexedDB. `/auth/me` exists but is not used to validate the restored session.
- **Offline survey:** `SurveyPage.tsx:1264` creates a UUID-backed local response and saves drafts or completed responses in `db.ts:41`. `SyncPage.tsx:26` batches pending records to `/sync`. The backend checks each response in its own transaction, saves normalized answers and unit data, and returns a result per response. The sync log is written outside those item transactions.

## C. API Authorization Matrix
All paths are relative to the backend root; there is no global prefix.

| Method | Route | Effective access |
|---|---|---|
| `POST` | `/auth/login` | Public |
| `POST` | `/auth/register` | Bearer JWT + `USER_CREATE` |
| `GET` | `/auth/users` | Bearer JWT + `USER_CREATE` |
| `PATCH` | `/auth/users/:id/status` | Bearer JWT + `USER_REMOVE` |
| `GET` | `/auth/me` | Bearer JWT |
| `GET` | `/survey-forms/active` | Bearer JWT + `SURVEY_SUBMIT` |
| `POST` | `/sync` | Bearer JWT + `SURVEY_SUBMIT` |
| `GET` | `/industrial-units` | Bearer JWT |
| `GET` | `/industrial-units/:id` | Bearer JWT |
| `POST` | `/industrial-units/:id/approve` | Bearer JWT + `SURVEY_CONFIRM` |
| `POST` | `/industrial-units/:id/reject` | Bearer JWT + `SURVEY_CONFIRM` |

Routes are declared in `auth.controller.ts:46`, `survey-form.controller.ts:16`, `sync.controller.ts:37`, and `industrial-unit.controller.ts:17`. Every route except login is guarded. Missing permission metadata means “authenticated only”; the guard does not accidentally make an unguarded route public.

## D. Findings Register
- **F1 — Medium, confirmed on a fresh seeded database: role labels do not match role IDs.** `seed.sql:4` inserts `ADMIN`, `SUPERVISOR`, then `SURVEYOR`, while `AdminPage.tsx:14` labels IDs 1, 2, 3 as Surveyor, Supervisor, DB Admin. On a fresh schema, choosing Surveyor creates an Admin; choosing DB Admin creates a Surveyor. Verify live IDs before remediation. Regression test: assert each UI role value resolves to the intended role code.
- **F2 — Medium, confirmed against the attached `schema.sql`: duplicate flags fail to persist.** Sync builds a descriptive string and saves it as `reason` (`sync.service.ts:182`, `sync.service.ts:226`); schema limits `reason` to `NAME_SIMILARITY`, `GPS_PROXIMITY`, or `BOTH` (`schema.sql:642`). A matching duplicate therefore raises a database error inside that response transaction; the response, unit, and flag roll back, and the item is returned as failed rather than duplicate-flagged. Regression test: sync a nearby same-name unit against this schema and assert a committed flag.
- **F3 — Medium, confirmed: unit data and actions are not scoped to an assigned survey team.** `findAll()` returns every unit and `findOne()` looks up only by ID (`industrial-unit.service.ts:21`). Approval/rejection checks the permission but not the unit’s surveyor or assigned supervisor (IndustrialUnitController.ts, service.ts). There is no pagination. Regression test: a supervisor must not see or action a unit outside their assigned team.
- **F4 — Medium, confirmed: approval writes are not atomic or cross-checked.** The service updates the unit, inserts a log, then optionally updates the supplied response ID as separate writes (`industrial-unit.service.ts:38`, `industrial-unit.service.ts:48`). The database trigger checks supervisor assignment only when a response is confirmed (`schema.sql:882`); it does not establish that the response belongs to the route’s unit. A failure on the final write can leave the unit and log changed. Regression test: mismatch the unit and response IDs and force the response update to fail.
- **F5 — Medium, confirmed: sync’s server-side validation is incomplete.** The controller checks only that `responses` is a non-empty array (`sync.controller.ts:15`, `sync.controller.ts:42`). The service verifies submitted question IDs belong to the supplied form (`sync.service.ts:104`), but does not require that form to be active, validate required answers or answer types, or range-check GPS. Its internal payload accepts `unit_id` (`sync.service.ts:188`), though the controller’s TypeScript interface omits it; interfaces are not runtime DTO validation, and the global pipe does not reject extra properties. A crafted request can link a response to an existing unit. Regression tests should cover extra `unit_id`, inactive form, malformed GPS and missing required answers.
- **F6 — Medium, confirmed: logout/account switching leaves survey records behind.** Logout only removes local-storage keys (`AuthContext.tsx:34`); IndexedDB retains responses (`db.ts:91`). The backend assigns `surveyor_id` from the current JWT rather than the client’s saved response owner (`sync.controller.ts:42`). Thus, unsynced work left on a shared device can be uploaded under another logged-in account. Regression test: logout A, login B, sync A’s pending response, and assert it is not reassigned.
- **F7 — Medium, confirmed: photos have no backend persistence path.** The frontend reads files as data URLs and puts them in `answer_value` (`SurveyPage.tsx:80`). The backend has no photo/file handler or attachment write (search found no `FileInterceptor`, base64 handler, or `survey_attachments` write); its normalized writer handles multi-choice, shares, and matrices (`survey-response-writer.ts:678`). The SQL attachment table stores only a `storage_path` (`schema.sql:311`). Photos sent in answers are not saved as attachments.
- **F8 — Conditional High, confirmed configuration: JWT fallback is hard-coded.** If `JWT_SECRET` is unset or empty, the same compiled-in fallback is used for signing and verification (`app.module.ts:50`, `rbac.guard.ts:33`). No startup validation requires a production secret. Remediation: require a strong environment secret and fail startup if absent; test missing/empty configuration.
- **F9 — Conditional Medium, confirmed UI: development quick sign-in is shipped in the login page.** `LoginPage.tsx:5` contains fixed development account/password pairs and displays them in the quick-sign-in panel. If matching accounts exist in the deployed database, those credentials are exposed to anyone who can reach the page. Remove or build-gate the panel; test that production builds do not render it.
- **F10 — Low, confirmed: incomplete-survey message contradicts submit behavior.** `SurveyPage.tsx:1321` blocks submission while visible required questions remain unanswered, but its warning says the survey can be submitted ([line 1497](frontend/src/pages/SurveyPage.tsx#L1497)). Align the message and add a UI validation test.

## E. Offline Data Integrity
1. **Retry duplicates:** The response ID is checked before processing and is the database primary key (`sync.service.ts:94`, `schema.sql:291`). Normal retries return `already_synced`; concurrent requests with the same new ID can race, but the primary key prevents two committed responses. The losing item may be reported failed and succeed as `already_synced` on retry.
2. **Batch behavior:** Each item has its own transaction (`sync.service.ts:91`); invalid items roll back while valid ones commit. Results are per item; final status is partial if some fail. Sync-log creation/final update are outside item transactions.
3. **Network loss:** If the server commits but the response is lost, the frontend leaves the response pending; retrying its UUID receives `already_synced`, then the frontend marks it synced. Server item failures are marked `failed`, but the pending index includes only `pending_sync` (`db.ts:108`); failed entries need manual edit/resubmit.
4. **Form and answer validation:** The server checks question IDs against `form_id`, not whether it is the active form. It does not comprehensively validate answer types, required fields, dates, GPS ranges, or nested sizes. Some writer checks and database constraints catch selected invalid values.
5. **Duplicate detection:** PostGIS checks units within 50 metres using `ST_DWithin`/`ST_Distance`; a Levenshtein name similarity above 0.6 flags a match (`sync.service.ts:161`). The reason-column mismatch in F2 prevents this flag path from committing under the attached schema.
6. **Payloads/photos/limits:** Photos are data URLs in answer JSON, not separate files. `main.ts` accepts JSON up to 25 MB (`main.ts:39`); there is no per-batch, per-response, or per-photo limit. A request exceeding the body limit is rejected before per-item handling. Largest legitimate payload and load behavior were not tested.
7. **Atomicity/concurrency:** Unit creation, response insertion, normalized answers, and duplicate flag are in one item transaction. Different response IDs for the same establishment can still create separate units; duplicate detection is heuristic rather than a uniqueness constraint. Concurrent approval actions are not transactional.
8. **Stale clients:** Form version 3 is seeded and the frontend minimum is 2 (`SurveyContext.tsx:20`). A stale client can still submit an older form ID if its question IDs belong to that form; sync does not enforce current-active form/version.

## F. Tests and Verification
No matching backend or frontend test files were found. Backend has Jest scripts and a test regex in `package.json`; frontend has no test script in `package.json`. No GitHub workflow files were found. Backend `lint` uses `--fix`, so it was not run in this read-only audit. No tests or builds were run.

The requested `npm audit --omit=dev`, `git check-ignore`, and `git log` checks were **not run**: no terminal-execution tool is available in this session. The checked-in `.gitignore` contains environment-file patterns (`.gitignore:7`), but whether either `.env` is tracked or appears in history remains unverified. No secret values are reproduced here.

Backend dependencies include NestJS, TypeORM, PostgreSQL, bcrypt, JWT/passport, class-validator/transformer; no Helmet, throttler, or compression package appears in `package.json`. Frontend uses React, Vite, IndexedDB `idb`, UUID, jsPDF, and `vite-plugin-pwa`. No rate limiter is present in the inspected code.

## G. Database and Frontend Notes
TypeORM uses PostgreSQL, supports `DATABASE_URL` or discrete DB environment variables, has `synchronize: false`, three connection retries, and no explicit SSL or pool-size configuration (`database.config.ts:5`). The backend entity glob loads 14 entity files. Core mappings include users, roles, survey forms/sections/questions/responses, choices, units, duplicate flags, lookups, and sync logs. Other entity files map districts, tehsils, sectors, industrial estates, `survey_submissions`, and legacy `section_*` tables. Several of those mappings do not appear in the attached `schema.sql`, while that schema contains normalized tables without matching entity classes. With synchronization disabled, SQL migrations must keep the deployed database aligned.

Spatial types: SQL schema uses PostGIS geometries, including `industrial_units` Point and geography/estate/cluster MultiPolygons; entity files declare Point/SRID 4326 for industrial-unit location and survey-submission geometry (`industrial-unit.entity.ts:23`, `survey-submission.entity.ts:32`).

The IndexedDB v5 upgrade recreates the form cache for versions 1–4 but preserves response and sync-log stores (`db.ts:60`). No `navigator.storage.persist()` call was found. The PWA uses `autoUpdate`, but its API `NetworkFirst` rule targets `localhost:3002/api` (`vite.config.ts:28`); the default client calls relative `/api` through Vite’s port-5173 proxy (`api.ts:6`, `vite.config.ts:39`), so that runtime cache rule does not match the default request URL.

Database SQL files present: `add_common_measurement_units.sql`, `cleanup_redundant_tables.sql`, `create_tables.sql`, `migrate_full_questionnaire.sql`, `schema.sql`, `seed_classification_codes.sql`, `seed_punjab_geography.sql`, `seed.sql`, `update_credentials.sql`, `update_location_selection_form.sql`, `update_ownership_legal_structure_options.sql`, `update_schema_to_new_design.sql`, `update_section_d_workforce_labels.sql`, and `update_zone_type_options.sql`. Backend package scripts define no migration or seed command; setup is via `SETUP_DATABASE.bat`.

## H. Priorities and Unknowns
1. **Immediate:** remove the JWT fallback; gate development sign-in; fix role ID mapping; correct duplicate reason persistence; enforce supervisor/team and unit-response ownership checks.
2. **Data integrity:** add runtime-validated DTOs and active-form/required-answer validation; define attachment storage; preserve local records safely across logout/account changes; add sync and approval transaction tests.
3. **Maintainability:** align TypeORM entities, SQL schema, and migrations; add pagination and request/batch limits; correct misleading frontend sync/submit comments.
4. **Unknown:** live database constraints and applied migrations, production environment values and HTTPS, whether quick-login accounts exist, `.env` Git history, dependency audit results, actual browser-storage persistence, and load/concurrency behavior were not verified.