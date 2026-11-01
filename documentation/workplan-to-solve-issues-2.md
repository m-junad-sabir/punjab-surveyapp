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
- **Form revisions:** the frontend cache revision is now `18` after the Section G and major-input questionnaire changes; the frontend accepts backend form versions `2` and later. The active database form version cannot be inferred safely from repository files and has not been queried.
- **Form/data flow:** the backend loads active sections/questions/lookups and `QUESTION_INPUTS`; the frontend renders structured/repeating answers and stores drafts in IndexedDB; sync maps question codes into normalized survey tables and generic choice/share/matrix tables; the frontend generates the PDF from the saved response and form definition.
- **PDF baseline:** unanswered scalar/field values render as `Not provided`; empty repeating groups render as `No entries recorded`; empty share categories render as `Not provided`. Phase 1 now omits questions hidden by the existing parent-company, operation-status, supply-disruption, demand-gap, and future-plan conditions. Section-specific zero/default and not-applicable behavior remains assigned to later phases.
- **Test baseline:** backend Jest tests cover hidden-answer normalization, Section B validation, and closed-status persistence. The frontend has a Node test script for month selection, validation, conditional visibility, draft cleanup, and generated PDFs, as well as build and TypeScript-check commands.
- **Migration/setup baseline:** `SETUP_DATABASE.bat` statically allowlists geography/classification/unit reference scripts and migrations 01–05 and 07–12; it omits migration 06 and legacy cleanup/reset scripts. Migrations 08–12 were added for Sections A–G. The local `/plan` check printed the allowlist without connecting to a database; no SQL or database setup was executed.
- **Schema evidence:** repository inspection documents describe a schema snapshot, not proof of any live environment's current migration state.
- **Available list references:** the repository contains area and product-unit lists, L1, L2 main/secondary product and machine/spec lists, and the L3/L5 equipment briefs. The owner approved the checked-in L2 product lists, the 15-unit product minimum, and the L2 machinery and L3/L5 equipment lists for the implemented phases. Other list authority and all live mappings remain to be confirmed.

### Remaining Phase 0 prerequisites

- Confirm the active form version and applied migration state against each target database. This requires owner-approved access/verification in Neon branch, Neon main, and/or localhost; static files and the no-connection setup-plan check cannot establish live state.
- Confirm with the owner/client that the remaining checked-in L1 and other unit lists are authoritative, and verify the approved product, machinery, and equipment mappings against each live database. Do not load unapproved lists.
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
- **Owner action before release:** review [migration 10](../database/migration_10_section_c_products.sql), back up each target, apply it after migration 07, and run its verification queries. Confirm all 15 active product units, the 101/236 product counts and industry mappings, and any historical constraint violations. Review before validating constraints. Apply the migration before deploying the API and refresh the current form online before offline use. Live sync, PDF, and genuinely offline-device verification remain outstanding; no database script or deployment was run by this implementation.
- The complete HS dataset and mobile presentation of long descriptions remain deferred.

## Phase 5 — Section D: Workforce values and subtotals

1. For questions D(i) and D(ii), persist and display zero for unfilled numeric count fields as requested, without changing unrelated nullable fields.
2. Add employee subtotals for both questions to the PDF and confirm they agree with the database-derived values.
3. Verify gender categories, including the established `Other` value, remain compatible with existing schema constraints.

**Exit checks:** Empty numeric categories are explicit zero, totals equal component sums, and all values render consistently in the UI, stored response, and PDF.

### Implementation and outstanding verification

- D(i) displays and saves zero for blank regular, contract, and daily-wage counts for Male, Female, and `Other`. D(ii) does the same for each active skill level and gender. This applies only to these workforce questions; unrelated nullable fields remain unchanged.
- Drafts, sync, and PDFs use the same zero/default behavior. Sync also fills entirely omitted workforce questions from older queued clients, but only when those questions belong to the response's form. Legacy duplicate rows are combined without losing their counts; referenced inactive skill levels remain available and visible. Unknown levels and malformed or out-of-range counts are reported rather than silently discarded.
- The form and PDF show category/skill, gender, and grand subtotals. Application validation rejects negative, fractional, and integer-overflow values, including totals that would overflow the database-generated employment total. The two questions are reported independently; their grand totals are not forced to match.
- Repository schema and existing [migration 03](../database/migration_03_workforce_gender_other.sql) allow the exact gender value `Other`. No new database migration was necessary and no database script was run. Automated tests cover normalization, sync inserts and component sums, invalid inputs, legacy drafts, generated PDFs, and the checked-in constraints. A mocked mobile-size browser check covered default display, editing, validation, draft reload, and historical/unknown skill levels; it was not a live or disconnected-device test.
- **Owner action before release:** verify workforce tables and the `Other` gender constraints in every target database, using the existing migration 03 verification queries. If alignment is needed, review and back up the target before applying migration 03. Verify the active skill-level references, deploy the API before the frontend, and refresh the current revision-17 form online before offline use. Confirm live sync/database-derived totals, PDFs, and an actual offline-device draft round trip. Live migration state and verification remain outstanding.

## Phase 6 — Sections E and F: Supply chain and market shares/matrices

### Section E

1. For sourcing type and raw-material origin shares, persist omitted categories as zero as required and show each category plus the total out of 100 in the PDF.
2. Add concise helper text for “Other (specify)” in sourcing type.
3. Add `Not Formally Tracked` to the on-time delivery reliability and product acceptance lookup values, ensuring the API/PDF can resolve the label.
4. **Deferred:** Supply-disruption heading changes are owner-managed and HS list completion remains deferred. The owner subsequently requested that major inputs reuse the approved product-unit dropdown; no additional units were invented.

### Section F

1. For buyer-type and buyer-location share distributions, persist omitted categories as zero and show totals out of 100 in the PDF.
2. Add concise helper text for “Other (specify)” in buyer types.
3. For competitor strength/weakness matrix rows, default unanswered rows to the agreed `Don't know / NA` option and display that value in the PDF. Validate the matrix choice/rating behavior across all matrix answer types.
4. For digital presence, default unanswered options to `NA` and display the persisted/default value in the PDF.

**Exit checks:** Share totals are computed from persisted values; non-share percentages are not conflated with input sums; matrix answers persist and render row-by-row; requested defaults are explicit.

### Implementation and outstanding verification

- The owner chose values with up to two decimal places and a maximum total of 100% for each of the four distributions. Partial and all-zero totals are allowed. The form, drafts, sync, and PDF materialize omitted categories as zero; older queued responses also receive entirely omitted questions only when those questions belong to their form. The PDF prints each category and its total out of 100. Other descriptions for the sourcing and buyer shares are optional.
- Other descriptions are required for disruption and demand-gap reasons only when Other is selected on the visible Yes branch. Hidden follow-ups are cleared. Invalid shares, missing reason text, and unknown or duplicate saved choices/rows are reported for correction; inactive historical choices and their labels are preserved.
- Unanswered competitor-strength rows use `DK_NA` and unanswered digital-presence rows use `NA`. Matrix choice labels, ratings, and row text now persist and render correctly across matrix questions; unrelated matrices receive no new defaults. Historical code-keyed and scalar entries are normalized without silently dropping them.
- Added rerunnable [migration 11](../database/migration_11_section_e_f_lookups.sql), which makes `Not Formally Tracked` available for both Section E bands and ensures the two F default codes are active. It preserves lookup IDs and does not backfill historical responses. The migration is explicitly allowlisted, and the offline form cache revision is `17`.
- Local checks passed: 99 backend tests, 24 frontend tests, TypeScript checks, isolated builds, generated-PDF tests, and a mocked mobile-size browser check of validation, defaults, draft reload, and legacy correction. The browser check did not use a live API or a physically disconnected device.
- **Owner action before release:** review migration 11, back up each target, apply it after migration 10, and inspect its verification queries. Confirm all four requested lookups and that every configured F matrix row has its active default (the checked-in seed defines six strength rows and five digital-presence rows). Deploy the API before the frontend, then refresh the revision-17 form online before offline use. Verify live sync/database share sums, matrix rows, PDFs, and an actual offline-device draft round trip. Live database state and verification remain outstanding; no database script or deployment was run.
- Supply-disruption heading changes remain owner-managed and HS list completion remains deferred. By subsequent owner request, Section E(ix) now uses the same active product-unit catalog as Section C; historical unit IDs remain visible and valid, while unknown IDs require correction.

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

### Implementation and outstanding verification

- The supplied L2 list contains 216 machine/specification pairs mapped to 60 existing industry codes. Both dropdowns depend on Section A's Type of Unit and support `Other (specify)`; changing a machine clears an incompatible specification. Historical free text is retained. The form cache and PDF include the reference labels.
- Automation and machinery-age shares allow up to two decimals and totals from 0% to 100%, including partial and all-zero totals. Missing categories default to zero. Historical database machine counts are not converted or rewritten. Old drafts show their counts and require explicit percentage re-entry; the original draft counts are retained separately with the synchronized response.
- The low-utilization reason is shown only for the existing 40–59% and 60–74% bands and is cleared at 75% or above. No new band below 40% was added. A saved reason without a valid band requires correction rather than being silently lost.
- L5 boiler/vessel and L3 weights/measures rows use the supplied type-specific fields, compatible units, required Other descriptions, and positive values with at most three decimals. The approved conversions store raw numeric values and units alongside converted values and factors; Other units are flagged for review instead of being assigned a guessed factor. Corrected old equipment fields are retained in `legacy_data`.
- The required innovation gate hides the matrix on No; sync records the defined `No Plan` value for every matrix row. Yes displays the matrix. Existing drafts must answer the new gate; hidden details are not printed in the PDF.
- Added rerunnable [migration 12](../database/migration_12_section_g_machinery.sql), explicitly allowlisted in setup, with catalog/lookups, preservation-oriented columns and `NOT VALID` checks. It does not backfill historical responses. The frontend uses cache revision 18 and refuses to cache a questionnaire missing the updated API/migration metadata.
- Local checks passed: 116 related backend tests, 33 frontend tests, TypeScript checks, isolated builds, and generated-PDF tests. A mocked mobile-size browser check covered dropdown filtering, Other fields, draft reload, share limits, the 75% boundary, innovation, and cached form access with the API unavailable. It did not use a live API or a physically disconnected device.
- **Owner action before release:** review migration 12 and its verification queries; back up each target, apply it after the prerequisite migrations, verify the 216/60 catalog mapping and active lookups, and inspect historical constraint violations before validating any `NOT VALID` constraint. Deploy the updated API before the frontend, then refresh revision 18 online. Verify live database writes/conversions, PDF output, and a real offline-device draft/sync round trip. No SQL, historical backfill, or deployment was performed during implementation.
- Plant Processing Capacity helper text remains owner-managed.

## Phase 8 — Section H: Energy, water, waste, and green practices

1. Keep Monthly Energy Consumption by Source as source, quantity per month, source-dependent unit, and energy-use share. The owner confirmed: Grid = kWh; Diesel and Furnace oil = litre; Gas and Natural gas (for process) = kg; Coal and Biomass = tonne; Solar = kWh; Other = kWh, litre, kg, or tonne. Do not label a monthly quantity as `kW` (power). Persist omitted source shares as zero and show each source value plus the total in the PDF.
2. Align Power Generation by Source to power source, capacity (kW), and export (kW). Calculate Total Captive Capacity from generation rows and retain Total Export Capacity as a separately entered field. Confirm persistence in `energy_generation` and `sec_h_environment`.
3. Add a Yes/No gate for water-waste management. No hides follow-ups and stores the requested `No` values; Yes reveals the details.
4. Change Solid Waste and By-products to one top-level generation Yes/No question. No hides waste-type/disposal questions and omits their PDF answers; Yes reveals them. Remove duplicate Other disposal options and show Other text only when selected.
5. Add a Yes/No gate for Green Practice and Circular Economy. No hides dependent questions and stores the requested `No` values; Yes reveals them.
6. Review the database model and migration needs before changing energy answer types or moving the waste-generation gate. Preserve existing responses and avoid duplicate representations.

**Exit checks:** Source row totals and separately entered export capacity are correct; every gate behaves consistently in UI/API/PDF; Other disposal text is captured once; migration preserves existing survey data.

### Implementation and outstanding verification

- Implemented the owner-approved source-specific energy units, zero-defaulted shares, generation-derived captive capacity, and explicit water, solid-waste, and green-practice gates. Hidden details are cleared locally or normalized to `No` in the API and omitted from PDFs.
- Added migration 13 and fresh-install schema/reference data. The migration adds nullable gates and unit mappings without backfilling or deleting historical answers; setup runs it after migration 12.
- Focused Section H backend and frontend tests cover normalization, writer persistence, conditional behavior, source-unit compatibility, capacity/share totals, and generated PDFs. Full backend/frontend suites and production builds passed during implementation.
- **Owner action before release:** review and back up the target database, apply migration 13 after its prerequisites, run its verification queries, and verify live API writes and PDF output. Then test an offline draft/reload/sync round trip. No SQL, live database verification, or deployment was performed during implementation.

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
| 0 Baseline, decisions, shared infrastructure | In progress — product and machinery/equipment lists approved for implemented phases; live database/form-state verification and approval of remaining lists and mappings remain |
| 1 Shared conditional-answer and PDF behavior | Complete for the existing parent-company, operation-status, disruption, demand-gap, and future-plan branches; subsequent section-specific gates remain in their corresponding phases |
| 2 Section A | In progress — implementation underway; owner confirmed interviewee biodata as i(a), optional rows that must be complete when entered, dedicated response-linked storage, labeled local area-unit variants, and updating only capital investment on existing units when supplied; validation and migration review remain |
| 3 Section B | In progress — implementation, automated tests, and mocked browser checks complete; owner-managed migration 09 and live end-to-end/offline verification remain |
| 4 Section C | In progress — implementation, automated tests, and mocked browser checks complete; owner-managed migration 10 and live end-to-end/offline verification remain |
| 5 Section D | In progress — implementation, automated tests, and mocked browser checks complete; owner-managed database checks and live/offline verification remain |
| 6 Sections E and F | In progress — implementation, automated tests, and mocked browser checks complete; owner-managed migration 11 and live/offline verification remain |
| 7 Section G | In progress — implementation, automated tests, and mocked browser checks complete; owner-managed migration 12 and live/offline verification remain |
| 8 Section H | Implementation and automated tests complete; owner-managed migration 13 and live/offline verification remain |
| 9 Sections I and J | Not started |
| 10 Section K | Not started |
| 11 Section L | Not started |
| 12 Navigation and section status UI | Not started |
| 13 Regression, migration readiness, and release | Not started |
