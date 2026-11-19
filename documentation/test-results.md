# Test Results — Workplan 1, Phase 13 (Input Validation)

**Date:** 18 November 2026
**Environment:** Windows, local PostgreSQL database `punjab_industrial_survey`, NestJS backend, React/Vite frontend.

## Summary

| Check | Result |
|---|---|
| Backend tests (Jest, full suite) | 182/182 passed (12 suites) |
| Backend TypeScript check | Passed |
| Frontend tests (Node test runner, full suite) | 70/71 passed (see Known failure) |
| Frontend TypeScript check | Passed |
| Live API checks against local PostgreSQL | 17/17 passed |
| Database column limits vs validation metadata | Match |

## Commands

| Suite | Working directory | Command |
|---|---|---|
| Backend tests | `backend` | `npx jest --ci` |
| Backend typecheck | `backend` | `.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` |
| Frontend tests | `frontend` | `npm test` |
| Frontend typecheck | `frontend` | `.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` |

Frontend tests must run from the `frontend` folder; running them from the repository root causes module resolution failures.

## Bug found and fixed during live testing

**Issue:** `/sync` accepted any existing dropdown/checkbox option ID, even one belonging to a different question's list. The database foreign key only checks that the option exists in *some* lookup list, so, for example, a Type of Unit answer could be saved with an unrelated option.

**Fix:** the `/sync` preflight (`validateInputValues` in `backend/src/bll/services/sync.service.ts`) now checks that each selected option belongs to the question's lookup list and returns **400** with `"<QUESTION_CODE>: Select a valid available option."` otherwise.

- Inactive options from the correct list are still accepted, so older offline drafts can sync.
- All 32 choice answers already stored in the local database pass the new check.
- A regression test was added to `backend/src/bll/services/sync.service.spec.ts`.

## Live API checks (17/17 passed)

Run as user `surveyor1` against a backend containing the fix.

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | Surveyor login | 200 | PASS |
| 2 | `/auth/me` returns user ID | user ID present | PASS |
| 3 | Load active survey form | 200 | PASS |
| 4 | `A_UNIT_TYPE` served as ordinary choice | SINGLE_CHOICE, 0 fields | PASS |
| 5 | `D_HIRING_CHANNEL` served as ordinary choice | MULTI_CHOICE, 0 fields | PASS |
| 6 | `F_DEMAND_ASSESSMENT` served as ordinary choice | MULTI_CHOICE, 0 fields | PASS |
| 7 | Constraint metadata served to frontend | fields with max length/precision/scale | PASS (24 fields) |
| 8 | Invalid response UUID | 400 `response_id must be a UUID` | PASS |
| 9 | GPS latitude 95 | 400 `gps_lat must not be greater than 90` | PASS |
| 10 | Invalid date (`yesterday`) | 400 `started_at must be a valid ISO 8601 date string` | PASS |
| 11 | Unknown question ID | 400 `Question 99999999 does not belong to survey form 1.` | PASS |
| 12 | Type of Unit with option from another list | 400 `A_UNIT_TYPE: Select a valid available option.` | PASS |
| 13 | Hiring Channel with wrong answer shape | 400 `D_HIRING_CHANNEL: Answer must contain valid selected options.` | PASS |
| 14 | Establishment year 1700 sent as plain number | 400 `A_ESTABLISHMENT_YEAR: Answer must contain field values.` | PASS |
| 15 | Valid selections for Type of Unit, Hiring Channel, Demand Assessment | pass validation (201) | PASS |
| 16 | Syncing another surveyor's response | 403 | PASS |
| 17 | Request without login | 401 | PASS |

Additional year-range probe (structured answer shape):

| Value | Result |
|---|---|
| 1700 | 400 `Year of establishment must be a whole number between 1800 and 2100.` |
| 2101 | 400 `Year of establishment must be a whole number between 1800 and 2100.` |

Check 15 passes validation; the response itself then fails later with "Select Yes or No for innovation activities in the updated form." because the probe intentionally sends an incomplete survey. No survey responses were created by any probe.

## Database column check

Validation metadata matches the live database columns:

| Table | Column | Database type | Validation limit |
|---|---|---|---|
| industrial_units | contact_name | varchar(120) | max length 120 |
| industrial_units | contact_phone | varchar(20) | max length 20 |
| industrial_units | contact_email | varchar(120) | max length 120 |
| industrial_units | establishment_year | smallint | 1800–2100 (UI picker: 1800–current year) |
| industrial_units | total_area_value | numeric(14,2) | precision 14, scale 2 |
| industrial_units / survey_responses | gps_accuracy_m | numeric(8,2) | 0–999999.99 |
| unit_parent_companies | phone / email | varchar(20) / varchar(120) | max length 20 / 120 |

## Known failure (unrelated to Phase 13)

- **Test:** `the login page retains its sign-in form without the logos` (`frontend/test/branding.test.mjs:60`)
- **Reason:** the test expects no logos on the login page, but commit `c58b8fb` ("updated frontend UI as required") intentionally added them. Either the test or the login page needs updating, depending on the intended design.

## Thousands-separator check (browser, 18 November 2026)

Numeric inputs now show a comma after every third digit. Checked in the running app as `surveyor1`, Section A:

| Action | Result |
|---|---|
| Type `1234567.89` in Total capital investment | Shows `1,234,567.89` |
| Insert `9` after `1,2` | Shows `12,934,567.89`, cursor stays after the `9` |
| Backspace | Back to `1,234,567.89` |
| Type `12a,3x4` | Letters ignored, shows `1,234` |
| Type `25000` in Total establishment area | Shows `25,000` |
| Type `03001234567` in Mobile number | Unchanged, no commas |
| Save draft and read it from browser storage | Stored as plain numbers: `25000`, `1234` |

Frontend tests after this change: 71/72 passed. The only failure is the existing login-logo test listed above.

## Notes

- An extra `unit_id` field in a `/sync` request is silently removed by the global validation pipe and never used; it does not return 400.
- The live checks left six failed sync-log entries (IDs 5–10, device `live-check`) in the local database; no survey responses were created.
- Physical Android device checks for earlier phases have not been performed.
