# Changelog

All notable application changes are recorded here, grouped by the categories below.

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
