I’ll re-open the current implementation for each of the six claims and trace the full paths again, with special attention to SQL migrations that could change the earlier conclusions. I’ll keep this read-only, avoid showing secrets, and distinguish what follows from checked-in files from what requires the live database or deployment settings.

Searched for regex `duplicate_flags|reason varchar|CHECK \(reason|DROP TABLE.*duplicate_flags|ALTER TABLE.*duplicate_flags|CREATE TABLE.*duplicate_flags` (`**/database/**/*.sql`), 14 results

Read 

Read 

Read 

Read 

Read 

The re-opened source confirms JWT fallback and no per-request user/permission refresh. For duplicate flags, there are multiple legacy schema scripts, so I’m comparing all their definitions rather than assuming `schema.sql` is the only install path; I’m also checking the supervisor trigger and exact role inserts before classifying those two findings.

Read , lines 630 to 650

Read , lines 880 to 915

Read , lines 280 to 350

Read , lines 45 to 82

Searched for regex `survey_attachments|FileInterceptor|readAsDataURL|preview|base64|storage_path|survey_attachments` (`**/{backend/src,frontend/src,database}/**/*`), 18 results

Searched for regex `INSERT INTO roles|UPDATE roles|DELETE FROM roles|roles \(.*code|ADMIN.*Admin|SUPERVISOR.*Supervisor|SURVEYOR.*Surveyor` (`**/database/**/*.sql`), 21 results

Read , lines 210 to 246

Read , lines 212 to 250

Read 

Read 

Read , lines 625 to 700

Searched for regex `PHOTO|answer_type.*PHOTO|photo|survey_attachments` (`**/database/{schema.sql,seed.sql,migrate_full_questionnaire.sql,update_location_selection_form.sql,update_schema_to_new_design.sql}`), 6 results

Read 

Read 

Read 

Read 

Read 

Read , lines 650 to 737

Read , lines 20 to 90

Read , lines 60 to 115

Read , lines 1250 to 1345

Read , lines 1 to 125

Read , lines 80 to 277

Read 

The deeper pass changes two earlier certainty statements. The role mismatch is definite for the repository’s `SETUP_DATABASE.bat` fresh-install path, but an alternate legacy migration hard-codes a different role order; the duplicate mismatch is definite in current `schema.sql`, while other legacy SQL recreates incompatible older table layouts rather than fixing the current one. I’m gathering final line anchors and checking what the canonical seed actually contains so the verdicts are precise.

Searched for regex `readAsDataURL|file_name: file\.name|preview: dataUrl|case 'PHOTO'|question\.answer_type === 'MULTI_CHOICE'|question\.answer_type === 'MATRIX'|CREATE TABLE survey_attachments|storage_path text|photo_interview_session|photo_entrance_signboard|PHOTO` (`**/{frontend/src/pages/SurveyPage.tsx,backend/src/bll/services/survey-response-writer.ts,database/schema.sql,database/update_schema_to_new_design.sql,backend/src/dal/entities/survey-submission.entity.ts}`), 18 results

Searched for regex `if \(!user \|\| !user\.is_active\)|bcrypt\.compare|SELECT p\.code|WHERE rp\.role_id|const payload|jwtService\.sign|async setActiveStatus|is_active: isActive` (`**/backend/src/bll/services/auth.service.ts`), 8 results

Searched for regex `role_id: 1|const ROLES|\{ id: 1|\{ id: 2|\{ id: 3|INSERT INTO roles|smallserial NOT NULL PRIMARY KEY` (`**/{frontend/src/pages/AdminPage.tsx,database/seed.sql,database/schema.sql}`), 10 results

Searched for regex `IF NEW\.status = 'CONFIRMED'|confirmed_by IS NULL|conf_role NOT IN|filler_sup IS DISTINCT FROM NEW\.confirmed_by|CREATE TABLE unit_approval_log|response_id uuid REFERENCES survey_responses` (`**/database/schema.sql`), 6 results

Searched for regex `@Post\('register'\)|role_id: number|role_id: *body\.role_id|USER_CREATE` (`**/backend/src/controllers/auth.controller.ts`), 5 results

Searched for regex `async findAll|unitRepo\.find|async findOne|unitRepo\.findOne|@RequirePermissions\('SURVEY_CONFIRM'\)|unitRepo\.update|INSERT INTO unit_approval_log|UPDATE survey_responses|WHERE id = \$2` (`**/{backend/src/controllers/industrial-unit.controller.ts,backend/src/bll/services/industrial-unit.service.ts}`), 16 results

Searched for regex `secret: *process\.env\.JWT_SECRET|signOptions: *\{ expiresIn|jwtService\.verify|process\.env\.JWT_SECRET|request\.user|payload\.permissions` (`**/backend/src/{app.module.ts,common/guards/rbac.guard.ts}`), 6 results

Searched for regex `surveyor_id: *user!\.user_id|survey_token|removeItem\(TOKEN_KEY|removeItem\(USER_KEY|responses: pending\.map|response_id: *r\.response_id|sync_status: result\.status|user_id: *user\.user_id|surveyor_id: *user_id` (`**/{frontend/src/pages/SurveyPage.tsx,frontend/src/pages/SyncPage.tsx,frontend/src/context/AuthContext.tsx,backend/src/controllers/sync.controller.ts,backend/src/bll/services/sync.service.ts}`), 9 results

Searched for regex `dataSource\.transaction|if \(existing\)|questionIds|questions\.length !==|matchReason *=|trx\.save\(SurveyResponse|saveNormalizedSurveyAnswers|trx\.save\(DuplicateFlag|status: *\(isDuplicate|catch \(err` (`**/backend/src/bll/services/sync.service.ts`), 14 results

Searching for regex `INSERT INTO roles|('ADMIN','Admin'|('SUPERVISOR','Supervisor'|('SURVEYOR','Surveyor'|('ADMIN','USER_CREATE'|('SURVEYOR','SURVEY_SUBMIT'` (`**/database/seed.sql`)
Tool execution failed: Regex parse error: missing closing parenthesis

Searched for regex `INSERT INTO roles \(role_id, role_name|\(1, 'Surveyor'|\(2, 'Supervisor'|\(3, 'DB Admin'|Upload Photo of the Unit Frontage|photo_interview_session|photo_entrance_signboard` (`**/database/update_schema_to_new_design.sql`), 7 results

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for regex `answer_type varchar\(20\)|CHECK \(answer_type IN|CREATE TABLE duplicate_flags|reason varchar\(30\)|CHECK \(reason|match_reason.*TEXT|CREATE TABLE IF NOT EXISTS duplicate_flags` (`**/database/{schema.sql,create_tables.sql,update_schema_to_new_design.sql,cleanup_redundant_tables.sql}`), 10 results

Searched for regex `case 'PHOTO'|readAsDataURL|file_name: file\.name|question\.answer_type === 'MULTI_CHOICE'|question\.answer_type === 'SHARE_PERCENT'|question\.answer_type === 'MATRIX'` (`**/{frontend/src/pages/SurveyPage.tsx,backend/src/bll/services/survey-response-writer.ts}`), 6 results

Searched for regex `USER_CREATE|USER_REMOVE|SURVEY_CONFIRM|permissions p|WHERE rp\.role_id` (`**/database/seed.sql`), 4 results

The current photo finding needs a narrower verdict: the canonical schema and seed do not define a `PHOTO` question, so I can’t claim this happens in the normal fresh setup. However, the frontend has a `PHOTO` renderer, the legacy migration includes a lowercase `photo` question and photo columns, and the current sync writer has no photo branch; I’m treating loss as conditional on such an answer reaching the current sync path.

## Finding 1 — JWT Fallback and Revocation
- **Verdict:** Confirmed configuration weakness; exploitability is conditional on deployment omitting or setting an empty `JWT_SECRET`. **Severity: High under that condition**, because a party with source access could forge claims accepted by the guard.
- **Evidence:** Signing uses `process.env.JWT_SECRET || <hard-coded fallback>` and a one-day expiry in `app.module.ts:49-51`; verification uses the same fallback in `rbac.guard.ts:31-38`. `verify()` checks signature and expiry by default. No issuer or audience is configured.
- **Execution path:** Login checks `is_active` and bcrypt, loads permissions, and signs those claims in `auth.service.ts:68-103`. The guard then trusts JWT permissions without a database lookup. Deactivation only changes the database for future logins (`auth.service.ts:136-143`); existing tokens remain valid until expiration.
- **Revocation:** No token denylist, token version, refresh-session registry, or other revocation mechanism was found. Missing/empty secret does not prevent startup.
- **Minimum remediation:** Require a strong secret at startup in deployed environments; fail closed if missing. Rotate any secret that may have been exposed. Add revocation or short-lived access tokens if immediate deactivation is required.
- **Regression tests:** Missing/empty production secret prevents boot; expired and invalid-signature tokens fail; deactivated users and changed permissions behave according to the chosen revocation policy.

## Finding 2 — Duplicate-Flag Schema Mismatch
- **Verdict:** Confirmed against the current `schema.sql` and the setup batch’s schema path. **Severity: Medium**, because suspected duplicates fail as whole response transactions.
- **Evidence:** The service builds a descriptive string such as `20m from "Example Unit" (90% name match)` and passes it as `reason` (`sync.service.ts:153-183`, `sync.service.ts:222`). TypeORM maps `reason` as `varchar(255)` (`duplicate-flag.entity.ts:17-20`); current SQL instead restricts it to `NAME_SIMILARITY`, `GPS_PROXIMITY`, or `BOTH` (`schema.sql:638-644`).
- **Execution path and impact:** Unit creation, response insertion, answer writes, and duplicate-flag insertion happen within one per-response transaction (`sync.service.ts:91-92`, `sync.service.ts:188-228`). The constraint violation rolls all of those writes back; the surrounding catch returns `failed`, not `duplicate_flagged` (`sync.service.ts:245-250`).
- **Other SQL definitions:** `create_tables.sql` and `update_schema_to_new_design.sql` use legacy `match_reason`/`response_id` columns; `cleanup_redundant_tables.sql` recreates `survey_id`/`matched_survey_id`. They do not migrate the current table to accept the service’s `reason` string. `SETUP_DATABASE.bat` runs `schema.sql` and `seed.sql` (`SETUP_DATABASE.bat:30-38`).
- **Minimum remediation:** Choose one contract: persist a constrained reason code and keep the explanation separately, or change the schema to store the service’s explanation. Apply it through a migration matching the deployed schema.
- **Regression test:** Against the canonical schema, sync a response near an existing similarly named unit; assert the response, unit, and duplicate flag commit and return `duplicate_flagged`.

## Finding 3 — Frontend Role IDs
- **Verdict:** Confirmed for a fresh database created through `SETUP_DATABASE.bat`; conditional for an existing database created through another path. **Severity: High** because the default “Surveyor” selection can create an Admin.
- **Evidence:** `roles.id` is `smallserial` (`schema.sql:9-10`); canonical `seed.sql` inserts Admin, Supervisor, Surveyor in that order (`seed.sql:4-7`). The UI labels IDs 1/2/3 as Surveyor/Supervisor/DB Admin and defaults to 1 (`AdminPage.tsx:14-28`). The controller forwards numeric `role_id` (`auth.controller.ts:63-71`); registration persists it directly (`auth.service.ts:42-64`). Login derives permissions from that role ID (`auth.service.ts:82-103`).
- **Alternate path:** `update_schema_to_new_design.sql` explicitly assigns IDs 1/2/3 as Surveyor/Supervisor/DB Admin (`update_schema_to_new_design.sql:633-636`), but it is a legacy schema with different table/column contracts. IDs are not universally stable across database histories.
- **Practical impact:** On the canonical fresh setup, a user created with the UI’s default role ID 1 receives the Admin role and its seeded permissions.
- **Minimum remediation:** Send role codes, or fetch role IDs from the backend rather than embedding serial IDs. Validate requested role assignment on the server.
- **Regression test:** In a fresh canonical database, select each UI role and verify the created user’s role code and effective permissions.

## Finding 4 — Unit Scope and Approval Atomicity
- **Verdict:** Confirmed missing application-level scope and consistency checks. **Severity: Medium**, elevated if supervisors are intended to act only on assigned surveyors’ units.
- **Evidence:** The controller applies `RbacGuard` to the unit routes; approve/reject additionally require `SURVEY_CONFIRM` (`industrial-unit.controller.ts:17-18`, `industrial-unit.controller.ts:46-63`). `findAll()` returns every unit and `findOne()` filters only by unit ID (`industrial-unit.service.ts:21-27`).
- **Execution path:** Approval updates the unit, inserts an approval log, then optionally updates the supplied response by response ID only (`industrial-unit.service.ts:31-50`). There is no transaction and no check that the response belongs to the route’s unit. Rejection follows the same write ordering (`industrial-unit.service.ts:57-75`).
- **Database check:** The trigger enforces role and assigned-supervisor checks only when a response becomes `CONFIRMED` (`schema.sql:882-899`). It does not tie the response to the route’s unit. It does not run its checks for `REJECTED`; omitting `response_id` also avoids it. A trigger failure on approval can occur after the unit and log writes have already committed.
- **Minimum remediation:** Scope unit queries and actions to the actor’s permitted team; verify response/unit association; perform state update and approval-log writes in one transaction.
- **Regression tests:** Out-of-team list/detail/action denied; mismatched unit/response IDs rejected; forced trigger failure leaves no partial unit or log changes.

## Finding 5 — Offline Work and Account Switching
- **Verdict:** Confirmed. **Severity: Medium**, due to incorrect attribution and possible exposure on shared devices.
- **Evidence and path:** Survey creation stores `surveyor_id` locally (`SurveyPage.tsx:1264-1272`); logout removes only token and user from local storage (`AuthContext.tsx:32-36`), leaving IndexedDB responses intact (`db.ts:91-108`). `SyncPage` sends response IDs, form IDs and answers, but omits the stored surveyor ID (`SyncPage.tsx:35-46`). The controller sets `user_id` from the current JWT (`sync.controller.ts:42-48`); the service persists that user as `surveyor_id` (`sync.service.ts:201-207`).
- **Impact:** If A creates a pending response, logs out, and B logs in on the same browser, B can sync A’s response and the backend attributes it to B. A `401` also logs out without clearing or partitioning offline records.
- **Safe remediation:** Preserve unsynced records, but bind them to their creator and only upload them under that account; show a clear account mismatch and require original-owner login or an audited transfer. Do not silently delete work on logout.
- **Regression test:** Create pending work as A, switch to B, and verify it cannot sync as B; verify A’s work remains available after logout and re-login.

## Finding 6 — Photo Persistence
- **Verdict:** Conditional; the earlier claim that this is a current canonical-form failure was too broad. **Severity: Low currently; potentially Medium if a photo is required by an active form.**
- **Evidence:** The frontend’s `PhotoField` converts files to data URLs and stores `{ file_name, preview, type }` in the answer (`SurveyPage.tsx:71-83`); it renders only for exact `PHOTO` (`SurveyPage.tsx:1041-1043`). Sync sends answers as JSON (`SyncPage.tsx:35-46`). The current SQL answer-type constraint excludes `PHOTO` (`schema.sql:183`); the canonical seed contains no `PHOTO` question. The legacy migration has a lowercase `photo` question and old photo text columns (`update_schema_to_new_design.sql:245-246`, `update_schema_to_new_design.sql:749`), which do not match the current uppercase renderer/current response flow.
- **Persistence path:** The current writer persists multi-choice, share, and matrix answers, but has no photo branch (`survey-response-writer.ts:678-731`). The current `survey_attachments` table stores a `storage_path`, but no sync writer inserts into it (`schema.sql:311-318`). If an uppercase `PHOTO` answer reaches this sync implementation, the response can succeed while the photo is ignored as an attachment. The browser’s PDF helper may read the local preview, but that is not server persistence.
- **Minimum remediation:** Decide whether the active form supports photos; if so, define a validated upload/storage contract and persist attachment metadata and storage path within the response workflow.
- **Regression test:** Submit an image through the active form, then verify durable server-side attachment metadata and retrievable content; do not treat response success alone as proof.

## Revised Ranking
1. **JWT fallback** — conditional High; must confirm deployed `JWT_SECRET` configuration.
2. **Role ID mapping** — High on canonical fresh setup; verify live role IDs.
3. **Unit authorization/atomicity** — Medium; confirmed missing checks.
4. **Duplicate-flag schema mismatch** — Medium; confirmed for canonical setup.
5. **Offline ownership across logout** — Medium; confirmed.
6. **Photo persistence** — conditional Low/Medium; no canonical `PHOTO` question is seeded.

## Contradictions and Unknowns
The role mismatch is not universal across every legacy database path, but is confirmed for the repository’s fresh setup sequence. The photo issue is not demonstrated for the canonical seeded form; only the conditional code path is established. The duplicate mismatch remains confirmed for `schema.sql`; the other SQL files define older incompatible shapes, not a corrective migration.

Live database schema and constraints, applied migration history, actual role IDs, active form contents, production secret configuration, deployment exposure, and whether older migration paths were used all require environment verification. No tests, token forgery, external upload, or database operation was performed.

**Fix first:** require the JWT secret at startup and correct the role-ID contract. Next, enforce supervisor/unit/response scope and atomic approval writes; then resolve the duplicate-flag column contract and prevent cross-account offline sync. Treat photo handling as a product/schema contract decision after confirming the active form.