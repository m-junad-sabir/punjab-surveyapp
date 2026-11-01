# Workplan 2 — Resolve Issues Raised After App Testing

**Source:** [app-evaluation-report.md](./app-evaluation-report.md)  
**Related references:** [workplan-to-solve-issues.md](./workplan-to-solve-issues.md), [database-inspection](./database-inspection/), [Lists](./Lists/)  
**Purpose:** Convert the post-testing findings into a sequenced, verifiable delivery plan. This plan covers the reported Section A–L behavior, database mapping, PDF output, and survey UI/UX.

## Scope and delivery rules

- Work section by section, with shared data/PDF behavior addressed before section-specific changes.
- Treat the evaluation report as the requirements source. Preserve its items marked “will do later” or “will do by self” as deferred unless the owner approves them for a later delivery.
- The owner remains responsible for confirming domain-specific lookup values and manually running database migrations against each target database.
- Do not run database scripts, deploy, or assume a migration has been applied as part of implementing application code.
- Follow the migration conventions in [workplan-to-solve-issues.md](./workplan-to-solve-issues.md): standalone, rerunnable `database/migration_NN_<topic>.sql` files, explicit setup-script allowlisting, and no globbing all migrations.
- Make each phase independently reviewable. Update `Changelog.md` with the phase’s Added, Changed, Deprecated, Removed, Fixed, and/or Security entries when applicable.
- Keep online, offline-draft, sync, API validation, and PDF behavior consistent. A frontend-only conditional is not sufficient where submitted data or PDF output could contradict it.
- Before changing an answer type or persisted representation, inspect the current form definition, API DTOs, persistence code, schema, and PDF renderer. Preserve existing responses or document an approved migration strategy.

## Shared acceptance rules

1. **Conditional questions:** Hidden follow-up questions must not appear in the active form or PDF. Clear stale dependent answers when a controlling answer changes, and ensure offline drafts and synchronized responses follow the same rule.
2. **Blank, zero, and not applicable are different states:** Apply zero defaults only to the specific questions that request them. Do not turn every blank into zero. Use the requirement-specific value (`Not Applicable`, `N/A`, `No Plan`, or `No`) only where the report calls for it.
3. **PDF output:** Do not print generic “not provided” or “no entries recorded” for deliberately hidden or inapplicable questions. Show explicit zero/default values where required, and omit conditional children when their parent answer makes them irrelevant.
4. **Validation:** Enforce important input constraints in both the UI and backend; database constraints should support, not replace, application validation.
5. **Schema and form compatibility:** Version or invalidate cached form definitions when question definitions, lookup lists, or answer structures change. Keep PDF labels and offline lookup data aligned with the active form.
6. **Database delivery:** Each migration must be reviewed for existing-data impact, include safe rerun behavior, and have a verification query/checklist. The owner applies it to Neon branch, Neon main, and localhost as appropriate before the corresponding app release.
7. **Verification:** For every changed section, test empty answers, explicit zero, positive/valid answers, invalid values, conditional Yes/No paths, stale-answer clearing, draft reload, sync, and generated PDF.

## Phase 0 — Baseline, decisions, and shared infrastructure

**Purpose:** Establish the current behavior and resolve prerequisites before introducing multiple conditional and schema changes.

1. Record the current application/form revision, migration allowlist, database schema state, PDF output, and existing tests.
2. Inventory `survey_questions`, lookup types/values, section-specific tables, form rendering, draft serialization, sync DTOs/persistence, and PDF rendering for Sections A–L.
3. Confirm the authoritative versions of all client-provided lists and their industry mappings. Use the supplied area, product-unit, L3, and L5 references where applicable; verify the L2 product and machinery list files and their mapping keys before implementation.
4. Agree on canonical values for the conditional states and their stored/PDF representation:
   - Parent company absent: PDF says `Not Applicable`; related answers are absent.
   - Section G machinery age / requested percentage fields: unfilled categories become zero only where explicitly required.
   - Section G innovation, Section I, Section J, Section K, and Section H defaults follow their individual requirements below.
5. Add or update regression-test fixtures for a response containing blank answers, intentional zeros, conditional branches, and repeating-group entries.
6. Create/update `Changelog.md` using the categories requested in the evaluation report. Keep one dated/versioned entry per delivered phase.

### Repository baseline recorded

- **Repository snapshot:** inspected at commit `e91d2e9` (`Fixes (#51) made workplan 2 after app testing`). The working tree also contains the Phase 1 implementation in this delivery; it is not a clean-commit snapshot.
- **Form revisions:** the frontend cache revision is now `15` after the Section C questionnaire changes; the frontend accepts backend form versions `2` and later. The active database form version cannot be inferred safely from repository files and has not been queried.
- **Form/data flow:** the backend loads active sections/questions/lookups and `QUESTION_INPUTS`; the frontend renders structured/repeating answers and stores drafts in IndexedDB; sync maps question codes into normalized survey tables and generic choice/share/matrix tables; the frontend generates the PDF from the saved response and form definition.
- **PDF baseline:** unanswered scalar/field values render as `Not provided`; empty repeating groups render as `No entries recorded`; empty share categories render as `Not provided`. Phase 1 now omits questions hidden by the existing parent-company, operation-status, supply-disruption, demand-gap, and future-plan conditions. Section-specific zero/default and not-applicable behavior remains assigned to later phases.
- **Test baseline:** backend Jest tests cover hidden-answer normalization, Section B validation, and closed-status persistence. The frontend has a Node test script for month selection, validation, conditional visibility, draft cleanup, and generated PDFs, as well as build and TypeScript-check commands.
- **Migration/setup baseline:** `SETUP_DATABASE.bat` statically allowlists geography/classification/unit reference scripts and migrations 01–05 and 07–10; it omits migration 06 and legacy cleanup/reset scripts. Migrations 08–10 were added for Sections A–C; no migration or database setup command has been run by this implementation.
- **Schema evidence:** repository inspection documents describe a schema snapshot, not proof of any live environment's current migration state.
- **Available list references:** the repository contains area and product-unit lists, L1, L2 main/secondary product and machine/spec lists, and the L3/L5 equipment briefs. The owner approved the checked-in L2 product lists, their mapping to the existing `UNIT_TYPE` codes, and the product-unit minimum list for Phase 4. Other list authority and live mappings remain to be confirmed.

### Remaining Phase 0 prerequisites

- Confirm the active form version and applied migration state against each target database. This requires owner-approved access/verification in Neon branch, Neon main, and/or localhost; static files cannot establish live state. The attempted setup-plan command was declined, so it was not run.
- Confirm with the owner/client that the remaining checked-in L1, machinery L2, L3/L5, and other unit lists are authoritative, and verify mappings against each live database. The L2 **product** lists and the 15-unit product minimum have been approved for Phase 4; do not load unapproved lists.
- Confirm the Section H quantity label and unit: the evaluation report requests `kW` for monthly energy consumption, but that is a power unit and may not describe monthly energy quantity. This decision is needed before Phase 8 implementation, not before unrelated phases.
- Keep operational condition semantics tied to active lookup codes. In the checked-in seed, the stable closure code is `PERM_CLOSED` while its label is “Permanently Close”; the evaluation report says “Permanently closed.” Any label change should be approved and made consistently in the form reference data.
- The default/sentinel behavior for each later section remains governed by its requirements below; do not generalize Section D/E/F/G zero defaults to all blank values.

**Exit checks:** Repository-level revision, migration allowlist, architecture/data-flow inventory, PDF defaults, available test tooling, and available list files are recorded above. Phase 0 remains open until live migration/form state and list authority/mapping are confirmed; the Section H unit decision is a Phase 8 prerequisite. Do not block unrelated phases on the Section H decision.

## Phase 1 — Shared conditional-answer and PDF behavior

**Purpose:** Fix the common source of misleading PDFs and inconsistent conditional answers before section-specific rollout.

1. Implement shared conditional visibility/answer-clearing behavior that can be expressed using the existing form-definition patterns.
2. Ensure the renderer and PDF generator use the same conditions, including nested conditions and “Other (specify)” inputs.
3. Define per-question empty-state presentation rather than applying one blanket fallback:
   - Hide dependent questions when their controlling answer excludes them.
   - Print requested explicit zero/default values.
   - Print `Not Applicable`, `N/A`, `No Plan`, or `No` only where specified.
   - Use a neutral empty state only for applicable questions that genuinely remain unanswered.
4. Ensure values in hidden branches are not accidentally resubmitted from cached drafts. Preserve unrelated answers.
5. Add integration tests for each supported conditional pattern and for PDF parity with the live form.

**Exit checks:** A shared test fixture proves the same conditions in the form, persisted payload, and PDF; hidden stale answers cannot leak into a PDF or overwrite valid data.

## Phase 2 — Section A: Establishment and parent-company information

**Database / form definition**

1. Add a repeating interviewee biodata group (name, designation, contact number) immediately after establishment name; support multiple interviewees.
2. Add Total Capital Investment as Section A question **xv**, with a numeric amount and a dedicated unit dropdown limited to Million PKR, Billion PKR, Million USD, Billion USD, Million Euro, and Billion Euro.
3. Provide a dedicated area-unit list for Total Establishment Area (question xiv), based on [area-units-list.md](./Lists/area-units-list.md). Keep area units distinct from general measurement/product units.
4. Correct the parent-company question labels. When “No” is selected, hide parent-company details and associated establishments and show `Not Applicable` in the PDF. When “Yes” is selected, show the related details and associated-establishment question.
5. Make the associated-establishment major activity field a PSIC class dropdown, using the existing `psic_classes` reference.
6. Add client-approved lookup corrections for zone type, ownership, and legal structure only after the owner supplies/confirms the values. The report says the owner will make these corrections; do not guess or override them.
7. When a survey is linked to an existing `unit_id`, update only capital investment if both amount and currency are supplied; an empty optional answer preserves the existing values. Do not overwrite other existing Section A fields.

**Frontend / API**

1. Validate establishment contact mobile as exactly 11 digits and email using a standard email syntax check.
2. Validate parent-company phone and cell numbers as exactly 11 digits and email syntax. Keep phone values as strings to preserve leading zeroes.
3. Validate required investment amount/unit pairing and interviewee repeat rows consistently in UI and API.
4. Clear dependent parent-company and associated-establishment values if the answer changes from Yes to No.

**PDF / verification**

- Show repeat interviewee rows and investment amount with its selected unit.
- Show area with its selected area unit.
- Verify both parent-company branches, PSIC selection, phone/email boundaries, multiple interviewees, offline save/reload, sync, and PDF.

## Phase 3 — Section B: Operational status and hours

1. Present Current Operation Status first. If permanently closed, show Reason for Closure and omit months/hours from the form and PDF; keep dependent database fields null. For other statuses, show Months of Operation and operational-hours questions.
2. Add a Select All months action that selects all 12 months and remains synchronized with individual month selection.
3. Align the daily operating hours/shift question and its related working-days-per-week and working-months-per-year fields with the specified survey sequence and actual `sec_b_operations` representation.
4. Add the `Less than 8 Hours` shift option.
5. Validate working days per week (1–7) and optional working months per year (whole numbers 1–12) in the UI and API; confirm the appropriate database constraints.
6. Clear hours/months answers when the permanently-closed path is selected. Do not silently turn the dependent fields into zero.

### Implementation and verification

- The owner approved optional whole-number working months from 1 to 12 and retaining numeric daily hours as an optional fourth field after shift, working days, and working months.
- Status is presented first. Permanently closed or unselected status clears and persists null for dependent months/hours; other statuses display the operating fields. Month selection supports select all, individual changes, and deselect all.
- The existing six-day working-week default remains for a selected non-closed status when working days are blank. The form explains this default and the PDF labels it as a default; it is not applied to closed or unselected status.
- Migration 09 adds nullable `working_months_per_year` with a 1–12 check, adds the `LESS_THAN_8` shift option, and updates the question heading. The existing daily-hours and generated weekly/monthly-hours columns remain. If the working-days check is missing, the migration adds it `NOT VALID` to preserve historical rows while enforcing future writes.
- Verification completed: 49 focused backend Jest tests and five frontend tests, including actual generated PDFs; backend/frontend TypeScript checks and a frontend production build. Mocked browser checks exercised month selection, validation, status branches, draft reload/cleanup, and the default hint. The offline check used a cached synthetic form and simulated offline state while assets were served locally; it was not a fully disconnected-device or live-sync test.
- **Owner action before release:** review [migration 09](../database/migration_09_section_b_operations.sql), back up each target, and apply it after the required earlier migrations. Run its verification queries in each environment; review any invalid historical working-day rows and the constraint's `convalidated` state before deciding whether to validate it. Confirm the new lookup and column, then smoke-test the live API, real offline draft/sync, and PDF. No database or deployment was changed by this implementation.

**Exit checks:** Closed and operating branches render and export correctly; month Select All and deselect-all behavior work; invalid ranges are rejected by both client and API.

## Phase 4 — Section C: Products, units, and HS codes

1. Expand and standardize daily-output, annual-production, and installed-capacity unit dropdowns using [products-unit-list.md](./Lists/products-unit-list.md), after confirming any additional domain-specific units. Keep production quantity units separate from area units and rate/period fields.
2. Add the approved industry-specific L2 list to Main Product and Secondary Product selection, keyed to the establishment’s Type of Unit. Include `Other (specify)` with a correctly conditional text field.
3. Confirm the secondary-product persistence contract. Secondary products must not store main-product-only fields such as transformation stage, revenue share, and HS code; align UI, API, schema constraints, and PDF.
4. **Deferred:** Completion of the approximately 9,000-entry HS code list and mobile presentation of its long descriptions are marked “will do later” in the evaluation report. Do not claim this item complete in this phase. Keep current HS behavior stable and record a separate follow-up when the authoritative dataset is available.

**Exit checks:** Unit options and L2 entries are stable, correctly filtered, and available offline; Other text round-trips; secondary product payload and PDF contain no main-only fields.

### Implementation and outstanding verification

- The owner approved the 15 options under “Suggested minimum dropdown for a first release” in the product-unit list, plus the checked-in L2 main- and secondary-product lists mapped to existing Type of Unit codes. All 60 numbered industry labels match migration 07: 101 main and 236 secondary product entries. The separate Other industry uses Other (specify).
- Migration 10 seeds those options by stable industry code. Product units remain separate from reporting periods; `TONNE` is distinct from the existing `TON`. Existing unit IDs and historical free-text product names are preserved. Previously selected units outside the new list remain visible as disabled choices and can still sync.
- Product choices are filtered by Type of Unit and product kind. Other requires text. Changing the industry or kind clears the dependent product selection, while changing a previously missing industry or kind preserves legacy free-text names. Secondary rows discard transformation stages, revenue share, and HS code fields in the form, sync, and PDF.
- Migration 10 adds constraints for future writes without rewriting historical rows; its `NOT VALID` checks/foreign key require review of existing violations before validation. Automated tests cover list fidelity, references, validation, sync, legacy drafts, conditional cleanup, and generated PDFs. A mocked mobile-size browser check covered selection and draft reload; it was not a live or disconnected-device test.
- **Owner action before release:** review [migration 10](../database/migration_10_section_c_products.sql), back up each target, apply it after migration 07, and run its verification queries. Confirm all 15 active product units, the 101/236 product counts and industry mappings, and any historical constraint violations. Review before validating constraints. Apply the migration before deploying the API and refresh the revision-15 form online before offline use. Live sync, PDF, and genuinely offline-device verification remain outstanding; no database script or deployment was run by this implementation.
- The complete HS dataset and mobile presentation of long descriptions remain deferred.

## Phase 5 — Section D: Workforce values and subtotals

1. For questions D(i) and D(ii), persist and display zero for unfilled numeric count fields as requested, without changing unrelated nullable fields.
2. Add employee subtotals for both questions to the PDF and confirm they agree with the database-derived values.
3. Verify gender categories, including the established `Other` value, remain compatible with existing schema constraints.

**Exit checks:** Empty numeric categories are explicit zero, totals equal component sums, and all values render consistently in the UI, stored response, and PDF.

## Phase 6 — Sections E and F: Supply chain and market shares/matrices

### Section E

1. For sourcing type and raw-material origin shares, persist omitted categories as zero as required and show each category plus the total out of 100 in the PDF.
2. Add concise helper text for “Other (specify)” in sourcing type.
3. Add `Not Formally Tracked` to the on-time delivery reliability and product acceptance lookup values, ensuring the API/PDF can resolve the label.
4. **Deferred:** Supply-disruption heading changes are owner-managed. Major-input unit expansion and HS list completion are marked “will do later”; do not include speculative values or claim completion.

### Section F

1. For buyer-type and buyer-location share distributions, persist omitted categories as zero and show totals out of 100 in the PDF.
2. Add concise helper text for “Other (specify)” in buyer types.
3. For competitor strength/weakness matrix rows, default unanswered rows to the agreed `Don't know / NA` option and display that value in the PDF. Validate the matrix choice/rating behavior across all matrix answer types.
4. For digital presence, default unanswered options to `NA` and display the persisted/default value in the PDF.

**Exit checks:** Share totals are computed from persisted values; non-share percentages are not conflated with input sums; matrix answers persist and render row-by-row; requested defaults are explicit.

## Phase 7 — Section G: Machinery, capacity, and innovation

1. Add industry-filtered L2 machine names and specifications for Critical Machines, plus `Other (specify)`. Verify offline availability and PDF labels.
2. If Critical Machines has no entries, show `Not Applicable` in the PDF rather than `no entries recorded`.
3. Show Reason for Low Utilization only when utilization is below 75%; keep form and PDF conditions identical and clear the reason when the answer becomes 75% or higher.
4. For Automation Level, persist unfilled share categories as zero and show category values and total out of 100.
5. Change Machinery Age Profile from machine counts to percent share per age bracket, with zero defaults for omitted brackets. Add a migration for the persisted representation, with a documented strategy for existing count data; do not reinterpret historical counts as percentages without approval. Enforce/report the total according to the agreed share rule and show each bracket and total in the PDF.
6. Replace the current boiler/pressure-vessel entry structure with the separate, type-specific forms in [L5-list.md](./Lists/L5-list.md). Add the client-provided boiler and vessel type/unit lookups, required “Other” text, numeric precision/range validation, and raw-value/unit preservation. Store conversion fields only if the project approves the recommended conversions.
7. Implement Weights and Measures rows from [L3-list.md](./Lists/L3-list.md): equipment type, compatible unit, capacity value, instrument count, and required Other text. Keep raw entries; conversion fields are optional and must not discard user input.
8. When no boilers/vessels or weights/measures rows exist, show `Not Applicable` in the PDF.
9. Add an innovation Yes/No gate. No hides dependent questions in the form/PDF and stores `No Plan` for every specified dependent field; Yes reveals the detail questions. Add `No Plan` options where required and ensure the API accepts only defined values.
10. Keep Plant Processing Capacity help-text changes owner-managed as marked in the report.

**Exit checks:** Validate each equipment row, unit compatibility, Other text, age percentage values, the 75% threshold boundary, innovation branches, PDF output, and existing-data migration behavior.

## Phase 8 — Section H: Energy, water, waste, and green practices

1. Refine Monthly Energy Consumption by Source to the three specified fields: source, quantity per month, and energy-use share. Label the quantity with `kW` only if the owner confirms that is the intended unit for this measurement; otherwise resolve the report’s apparent dimensional mismatch before release. Persist omitted share categories as zero where requested and show each value plus the total.
2. Align Power Generation by Source to power source, capacity (kW), and export (kW). Calculate Total Captive Capacity from rows and retain Total Export Capacity as a separately entered field. Confirm persistence in `energy_generation` and `sec_h_environment`.
3. Add a Yes/No gate for water-waste management. No hides follow-ups and stores the requested `No` values; Yes reveals the details.
4. Change Solid Waste and By-products to one top-level generation Yes/No question. No hides waste-type/disposal questions and omits their PDF answers; Yes reveals them. Remove duplicate Other disposal options and show Other text only when selected.
5. Add a Yes/No gate for Green Practice and Circular Economy. No hides dependent questions and stores the requested `No` values; Yes reveals them.
6. Review the database model and migration needs before changing energy answer types or moving the waste-generation gate. Preserve existing responses and avoid duplicate representations.

**Exit checks:** Source row totals and separately entered export capacity are correct; every gate behaves consistently in UI/API/PDF; Other disposal text is captured once; migration preserves existing survey data.

## Phase 9 — Sections I and J: Compliance and strategy

### Section I

1. Add a Yes/No gate to Factory Safety and Environmental Compliance. No hides details and stores `N/A` for the specified dependent values; Yes reveals them.
2. Add a Yes/No gate to Quality, Safety, Export, and Green Certifications with the same conditional behavior and `N/A` requirement.
3. Fix `Other (specify)` on both questions so selecting Other reveals and persists its text.

### Section J

1. Add a top-level “Do you have a Strategic Business Plan?” Yes/No gate. No is shown in the PDF and all dependent questions are omitted; Yes reveals Section J details.
2. Add a Yes/No gate to Operational Planning. No hides its details and stores `No Plan` for each specified dependent field; Yes reveals the details.
3. Fix Primary Area of Reinvestment so the Other text input appears only when the Other option is selected, and is not asked redundantly.

**Exit checks:** Test outer and inner gates independently, including changing Yes to No after entering details; verify specified sentinel values and PDF omission rules.

## Phase 10 — Section K: Future plans and barriers

1. When “Do they have a future plan?” is No, show the No answer in the PDF and omit all dependent future-plan answers.
2. If Potential Collaborator is “Not interested in any collaboration,” hide and clear Purpose of Collaboration; otherwise show it.
3. Add a Yes/No gate to Barriers & Bottlenecks. No hides details and leaves dependent rating values null as specified; Yes reveals the ratings.
4. Show the rating definition to surveyors: 1 = Don’t happen, 2 = Rarely happen, 3 = Happens, 4 = Happens more often, 5 = Happens frequently.

**Exit checks:** No-plan, collaboration, and barriers branches clear stale answers and render only applicable PDF content; null ratings remain null on the No branch.

## Phase 11 — Section L: Photo GPS accuracy

1. Raise the GPS accuracy radius to 250 m only after confirming this is the intended policy for both required photos.
2. Update the camera-capture UI, backend validation, persistence constraints, API DTOs, and PDF/metadata checks together. Reconcile the existing database limit of 100 m and earlier photo-capture policy before migration.
3. Keep location acquisition and camera-only capture requirements intact; do not relax unrelated photo ownership, MIME, size, or location-coordinate checks.

**Exit checks:** Test accuracy below, at, and above 250 m, missing location, both photo types, offline capture/sync, and enforcement by API and database.

## Phase 12 — Survey navigation and section status UI

1. Ensure Next and section-button navigation opens a section at the top of the page, including browser history/navigation behavior.
2. Correct section B–K completion indicators so they do not show Done by default. Define completion from the section’s actual requirements and conditional visibility; current section status must remain distinct from completed status.
3. Verify Section A and Section L status behavior remains correct.
4. **Deferred:** Removing question codes from all questions is explicitly marked “will do later”; leave it out of this delivery unless separately approved.

**Exit checks:** Test section navigation on desktop and mobile-sized viewports; empty, partial, completed, and conditionally complete sections show the correct status.

## Phase 13 — Full regression, migration readiness, and release

1. Run focused tests per phase, backend/frontend type checks, frontend production build, and the repository’s configured test suite for affected functionality.
2. Exercise a complete survey through create, offline draft, reload, sync, supervisor review, and PDF generation, including all conditional branches and explicit zero/default states.
3. Review each migration against the inspected schema and current migration numbering. Ensure `SETUP_DATABASE.bat` has an explicit allowlist of approved migrations only.
4. Produce a database verification checklist and owner-run instructions for Neon branch, Neon main, and localhost. Verify migration state in each environment before deploying compatible code.
5. Update `Changelog.md`, this workplan’s progress tracker, and user-facing setup/documentation where behavior or environment requirements changed.
6. Do not deploy until code checks pass, all required migrations have been confirmed by the owner, and a smoke test verifies API, frontend, sync, and PDF against the target environment.

## Deferred or owner-managed items from the evaluation report

| Item | Handling |
|---|---|
| Zone type, ownership, and legal-structure lookup corrections | Owner supplies/applies approved values; do not infer them. |
| Supply-disruption heading changes | Owner-managed; excluded unless explicitly handed over. |
| Plant processing capacity helper text | Owner-managed; excluded unless explicitly handed over. |
| Major-input unit improvements and complete HS code list/mobile long descriptions | Deferred by the report; requires confirmed source data and separate scope. |
| Removal of question codes | Deferred by the report. |
| Any additional requested UI labels or source-list values not represented in the supplied references | Confirm with the owner/client before adding data. |

## Progress tracker

| Phase | Status |
|---|---|
| 0 Baseline, decisions, shared infrastructure | In progress — L2 product lists and product units approved; live database/form-state verification and approval of other lists and mappings remain |
| 1 Shared conditional-answer and PDF behavior | Complete for the existing parent-company, operation-status, disruption, demand-gap, and future-plan branches; subsequent section-specific gates remain in their corresponding phases |
| 2 Section A | In progress — implementation underway; owner confirmed interviewee biodata as i(a), optional rows that must be complete when entered, dedicated response-linked storage, labeled local area-unit variants, and updating only capital investment on existing units when supplied; validation and migration review remain |
| 3 Section B | In progress — implementation, automated tests, and mocked browser checks complete; owner-managed migration 09 and live end-to-end/offline verification remain |
| 4 Section C | In progress — implementation, automated tests, and mocked browser checks complete; owner-managed migration 10 and live end-to-end/offline verification remain |
| 5 Section D | Not started |
| 6 Sections E and F | Not started |
| 7 Section G | Not started |
| 8 Section H | Not started |
| 9 Sections I and J | Not started |
| 10 Section K | Not started |
| 11 Section L | Not started |
| 12 Navigation and section status UI | Not started |
| 13 Regression, migration readiness, and release | Not started |
