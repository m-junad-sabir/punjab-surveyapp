# Changelog

All notable application changes are recorded here, grouped by the categories below.

## 2026-11-01 — Workplan 2 Phase 6

### Added

- Added zero defaults and PDF totals for the four Section E/F share distributions, with two-decimal validation and a 100% maximum.
- Added rerunnable migration 11 for the two `Not Formally Tracked` choices and required F matrix defaults, with owner verification queries and setup allowlisting. No migration was executed.
- Added regression coverage for legacy drafts, conditional Other reasons, share totals, matrix choices/ratings, sync, and generated PDFs.

### Changed

- Bumped the offline form-cache revision to 17 and included historical share, reason, and matrix option labels. Invalid or unknown saved data is retained for explicit correction.
- Other share descriptions are optional; Other disruption/demand-gap reasons require text when selected on a visible Yes branch. Unanswered competitor and digital matrix rows default to `Don't Know / NA` and `NA`, respectively.

### Fixed

- Matrix answers now retain supported legacy entry shapes and row text, validate choice/rating values, and display labels rather than internal IDs in PDFs. Other matrix questions do not receive new defaults.

## 2026-11-01 — Workplan 2 Phase 5

### Added

- Added zero-default and subtotal handling for employment and skill counts, including generated PDFs and older queued responses that omit Section D.
- Added workforce validation and regression coverage for all genders, inactive or unknown skill levels, legacy duplicate rows, integer limits, draft storage, sync, and PDFs.

### Changed

- Bumped the frontend form-cache revision to 16. The offline form now includes historical skill-level labels so previously recorded inactive choices remain visible.
- Blank workforce counts are materialized as zero without changing unrelated nullable answers. Invalid counts and unknown skill levels are retained in drafts and reported for correction.

### Fixed

- Section D PDF subtotals now match workforce component sums. Checked-in schema and existing migration 03 use the established `Other` gender value; live database verification remains owner-managed.

## 2026-11-01 — Workplan 2 Phase 4

### Added

- Added the owner-approved 15 product units and 337 main/secondary product choices, filtered by Type of Unit and product kind, with Other (specify).
- Added rerunnable migration 10, product-specific reference metadata, preservation-oriented constraints, and focused catalog, sync, draft, and PDF tests. The owner must review and apply the migration; it has not been run by this implementation.

### Changed

- Existing free-text product names and previously selected legacy unit IDs remain usable. Product quantities and reporting periods remain separate.
- Bumped the frontend form-cache revision to 15 and added migration 10 to the explicit setup allowlist.

### Fixed

- Secondary product rows no longer retain or display main-only transformation-stage, revenue-share, or HS-code fields. Product choices are validated against the selected industry and kind.
- Main-product PDFs resolve the selected HS-code reference label when available. Completion of the HS list and mobile long-description improvements remain deferred.

## 2026-11-01

### Added

- Added Select All/Deselect All for operational months, the `Less than 8 Hours` shift option, and optional working months per year validated as whole numbers from 1 to 12.
- Added rerunnable migration 09 for Section B's working-month column, constraints, shift option, and question heading. The owner must review and apply it; it has not been run by this implementation.
- Added focused frontend and backend coverage for Section B selection, range validation, branch cleanup, sync, and generated PDFs.

### Changed

- Current Operation Status appears first; closed or unselected statuses keep dependent operating values null, while the operating branch retains optional numeric daily hours.
- Working days accept whole numbers from 1 to 7. The existing six-day default for blank operating responses is now explained on the form and identified as a default in the PDF.
- Bumped the frontend form-cache revision to 14 and added migration 09 to the explicit setup allowlist.

### Fixed

- Draft loading no longer restores hidden operating answers after conditional cleanup, and malformed Section B schedule/month payloads are rejected instead of silently discarded.

## 2026-10-30

### Changed

- Completed Workplan 2 Phase 1 for the conditional branches already present in the form by centralizing visibility rules and sharing them between survey UI and PDF generation.
- Permanently closed operation status now hides operational months and hours; dependent parent-company, disruption, demand-gap, and future-plan answers are cleared when their controlling answer makes them hidden.
- Survey payload construction excludes answers for hidden questions.
- Sync processing removes hidden conditional answers before saving normalized records.
- Loaded drafts are normalized against the active form's visibility rules before they are edited or exported.
- Permanently closed operation records persist null operational-hours and working-days values while non-closed records retain the existing six-day default.
- Recorded Workplan 2 Phase 0 repository baseline, form-cache revision, setup migration allowlist, data-flow overview, PDF empty-state behavior, available tests/lists, and outstanding environment/client confirmations.

### Fixed

- Hidden conditional questions are omitted from generated PDFs instead of being rendered with generic empty-answer text.

### Added

- Added optional repeating interviewee biodata after establishment name, stored against each survey response.
- Added Total Capital Investment amount/currency fields and a dedicated currency lookup, plus the Section A area-unit choices from the supplied reference.
- Added associated-establishment PSIC class selection and API-side validation for Section A phone, email, investment, interviewee, currency, and PSIC values.
- Added migration 08 for Section A persistence, lookup values, question numbering, and schema changes. The migration is allowlisted but has not been run against any database.

### Changed

- Section A now labels interviewee biodata as i(a), parent details as xii(a), associated establishments as xiii, area as xiv, and capital investment as xv.
- Linked existing units update only capital investment when both values are supplied; blank optional answers preserve existing investment, and other unit fields remain unchanged.
- Bumped the frontend form-cache revision to 13 so clients refresh the changed Section A definition.
