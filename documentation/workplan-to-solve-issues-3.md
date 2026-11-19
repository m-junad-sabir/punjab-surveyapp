# Workplan 3 — Fake Timestamps and Fake GPS

**Issues addressed:**
1. **Fake timestamp:** Enumerators can change the device date/time, or work offline and sync later, so `started_at`, `submitted_at`, photo `captured_at`, and the photo watermark show an untrue time.
2. **Fake GPS:** Enumerators can use a mock-location app or developer option, so the unit location and photo coordinates show a place they never visited.

**Inspection reports (run first):**
- [fake-timestamp-inspection.md](./database-inspection/fake-timestamp-inspection.md)
- [fake-gps-inspection.md](./database-inspection/fake-gps-inspection.md)

**Related:** [workplan-to-solve-issues.md](./workplan-to-solve-issues.md), [workplan-to-solve-issues-2.md](./workplan-to-solve-issues-2.md), [master-inspection-query.md](./database-inspection/master-inspection-query.md)

---

## 1. Current state (code evidence)

| Area | What happens today | Gap |
|---|---|---|
| Survey start/submit time | `startedAt` from `new Date()` in [SurveyPage.tsx](../frontend/src/pages/SurveyPage.tsx); `submitted_at` from device clock | Device clock is trusted as-is |
| Photo time | `captured_at = new Date(position.timestamp)` (device clock); watermark uses the same value | No server cross-check; any ISO date is accepted, including future dates ([photo.service.ts](../backend/src/bll/services/photo.service.ts)) |
| Server time | `synced_at = new Date()` on the server ([sync.service.ts](../backend/src/bll/services/sync.service.ts)); `survey_attachments.created_at = now()` | Upload time is lost because the `survey_photo_uploads` row is deleted on attach |
| Unit GPS (`A_LOCATION_GPS`) | One `getCurrentPosition` sample, stores `{lat, lng, accuracy}` only | No fix time, no sample variance, and no boundary check |
| Photo GPS | One fresh sample (`maximumAge: 0`); accuracy must be 0–250 m ([photoCapture.ts](../frontend/src/lib/photoCapture.ts)) | Server checks ranges only; no distance to unit, travel-speed, or boundary checks |
| Platform | Browser PWA (Vite/React) | Browsers cannot read Android's mock-location flag, auto-time setting, or root status |
| Anomaly storage | `gis_quality_log` and `duplicate_flags` exist; there is no timestamp/GPS integrity record | Reviewers cannot see, clear, or confirm findings |

---

## 2. Three strategies

### Strategy A — Server-authoritative evidence and detection

Do not trust device values. Measure them against **server time** and **geography**, then flag anomalies for supervisor review.

- **Timestamps:** Record server receive times (upload + sync), send the device clock reading with each sync batch to compute **clock skew**, and reject or flag future, out-of-order, or out-of-window times. Also flag very short or very long interviews and overlapping interviews by one enumerator.
- **GPS:** Hard-reject points outside Punjab. Flag a unit that falls outside its declared district/tehsil polygon, a photo more than 250 m from the unit, two photos more than 150 m apart, impossible travel (>120 km/h), repeated identical coordinates, desk-survey clusters, and unnatural accuracy or precision patterns.
- **Output:** A new `integrity_flags` table, a supervisor review queue, and an enumerator risk scorecard.

| Pros | Cons |
|---|---|
| No app reinstall or new platform; works with offline-first sync | Detects problems after the fact; it does not prevent them |
| Also applies to historical data (inspection reports) | A careful spoofer with consistent fake GPS and time can pass some rules |
| Low cost; reuses PostGIS and the existing sync pipeline | Needs boundary polygons loaded and supervisor time for review |

**Effort:** Medium · **Assurance:** Medium · **Risk to field work:** Low

### Strategy B — Hardened PWA capture (trusted time anchor + sensor consistency)

Make faking harder and more visible **at capture time** without leaving the browser.

- **Timestamps:** The server issues a signed **time anchor** (`server_time`, `nonce`, HMAC) at login and on each online sync. The client stores it with the device time at receipt and uses `performance.now()` (monotonic) to detect clock changes during a session. Each capture records `device_time`, `anchor_id`, and `elapsed_since_anchor`. If the device clock differs by more than 2 minutes while online, the user gets a warning and the event is recorded. Captures can be **hash-chained** (each capture includes the previous capture's hash) so reordering or back-dating becomes tamper-evident.
- **GPS:** Use `watchPosition` for several samples over 5–10 seconds instead of one. Store sample count, spread (jitter), accuracy range, and whether altitude, speed, and heading are present. Mock providers often return zero jitter, constant accuracy, and null altitude. Add a fix timestamp to `A_LOCATION_GPS`. The server re-verifies the anchor signature and the chain.

| Pros | Cons |
|---|---|
| Stays a PWA, so there is no app-store distribution | Still cannot read the mock-location flag or detect a rooted device |
| Gives the server evidence that Strategy A can score | Adds client complexity, a form-cache revision, and offline anchor expiry rules |
| Makes casual faking (changing the phone clock, simple mock app) visible | Sophisticated mock apps can add fake jitter |

**Effort:** Medium–High · **Assurance:** Medium–High · **Risk to field work:** Low–Medium (slightly slower GPS capture)

### Strategy C — Native Android capture module (Capacitor) with OS-level integrity

Wrap the existing web app in Capacitor and add a small native plugin for capture.

- **Timestamps:** Use the GNSS fix time (`Location.getTime()` from satellites) and `SystemClock.elapsedRealtime()`. Read `Settings.Global.AUTO_TIME`/`AUTO_TIME_ZONE` and block capture when automatic time is off.
- **GPS:** Use `Location.isMock()` (Android 12+) / `isFromMockProvider()` and detect installed mock-location apps and developer options. Read GNSS status (satellite count, signal strength) to separate real sky fixes from injected points.
- **Device integrity:** The **Play Integrity API** verdict is verified server-side, and each capture payload is signed with an Android Keystore key.

| Pros | Cons |
|---|---|
| Strongest assurance; can **block** spoofing at source | New build/distribution channel (APK/Play/MDM), signing keys, Google Cloud project |
| Trusted satellite time does not depend on the user's clock | Android only; ongoing native maintenance; regression risk for camera/offline flows |
| Detects most mock apps and rooted or tampered devices | Hooking frameworks on rooted devices can still bypass checks (Play Integrity reduces this) |

**Effort:** High · **Assurance:** High · **Risk to field work:** Medium (new app rollout and device compatibility)

### Comparison and recommendation

| Criterion | A — Server detection | B — Hardened PWA | C — Native module |
|---|---|---|---|
| Prevents faking at capture | No | Partly (warn/flag) | Yes (block) |
| Detects historical fakes | **Yes** | No | No |
| Detects mock-location app directly | No | Indirectly (jitter) | **Yes** |
| Detects device clock change | Yes (at sync) | **Yes (at capture)** | **Yes (GNSS time)** |
| Needs new app distribution | No | No | **Yes** |
| Delivery effort | Medium | Medium–High | High |

**Recommended:** **A + B as one layered approach** (Phases 0–7), with **C as an optional Phase 8** that starts only if the
Phase 1 inspection or post-rollout flag rates show organised spoofing that A + B cannot control. A provides evidence and
review, B improves the quality of that evidence at source, and C is held back because of its distribution cost.

> **Owner decision required in Phase 0:** approve strategy (A, A+B, or A+B+C), the thresholds in §3, and the
> **flag-vs-block policy** for each rule.

---

## 3. Delivery rules and default thresholds

- Follow the conventions in [workplan-to-solve-issues.md](./workplan-to-solve-issues.md): standalone, rerunnable `database/migration_NN_<topic>.sql` (next number: **17**), explicit allowlisting in [SETUP_DATABASE.bat](../SETUP_DATABASE.bat), `BEGIN/COMMIT`, and a verification query. The owner applies migrations: Neon branch → Neon main → localhost.
- Never silently change or "correct" stored device timestamps. Keep the device value **and** the server value, plus the derived skew.
- Hard-reject only values that are impossible (outside Punjab, timestamps after the server receipt beyond tolerance, start after submit). Store everything else as **flags** so offline field work is not lost.
- Keep online, offline-draft, sync, API validation, and PDF behaviour consistent. Bump the frontend form-cache revision when the stored answer shape changes.
- Update [Changelog.md](./Changelog.md) per delivered phase.

| Rule | Default | Action |
|---|---|---|
| Device time ahead of server | > 5 min | Reject photo upload / flag response HIGH |
| Interview duration | < 10 min or > 3 days | Flag MEDIUM |
| Photo outside survey window | < start − 60 min or > submit + 15 min | Flag HIGH |
| Photo pair time gap | > 3 h | Flag MEDIUM |
| Overlapping interviews (same enumerator) | any overlap | Flag HIGH |
| Location outside Punjab envelope / polygon | lat 27.6–34.1, lng 69.2–75.5 | **Reject** |
| Unit outside declared district/tehsil | polygon mismatch | Flag HIGH (MEDIUM if < 500 m from the boundary) |
| Photo to unit distance | > 250 m | Flag HIGH |
| Interview photo to signboard photo | > 150 m | Flag MEDIUM |
| Travel speed between consecutive captures | > 120 km/h (gap ≥ 2 min) | Flag HIGH |
| Different units from same spot | ≤ 30 m | Flag MEDIUM |
| Accuracy pattern | `0`, or one value in > 50% of an enumerator's fixes | Flag MEDIUM |
| Coordinate precision | ≤ 4 decimals in both axes | Flag MEDIUM |
| GPS jitter (Strategy B) | all samples identical | Flag HIGH |

---

## Phase 0 — Decisions and baseline

**Purpose:** Agree on the approach before code or schema changes.

1. Owner selects the strategy (recommended A + B) and approves the thresholds and flag-vs-block policy above.
2. Confirm the time zone (`Asia/Karachi`) and field working hours used for informational flags.
3. Check whether `provinces`, `districts`, and `tehsils` have `geom` loaded in each environment (coverage query in [fake-gps-inspection.md](./database-inspection/fake-gps-inspection.md) G2). If not, source and load approved Punjab boundary polygons. Without them, rule G2 is inactive.
4. Agree on who reviews flags (supervisor/admin role) and what a confirmed fake means operationally (re-visit, rejection, disciplinary SOP).
5. Record the current commit, migration state, and frontend form-cache revision.

**Exit checks:** Decisions recorded in this file's Decisions Log (below); boundary coverage known per environment.

**Status:** Not started.

---

## Phase 1 — Inspect historical data (read-only)

**Purpose:** Measure the size of the problem and calibrate thresholds using real data.

1. Run every query in [fake-timestamp-inspection.md](./database-inspection/fake-timestamp-inspection.md) (T1–T10) and [fake-gps-inspection.md](./database-inspection/fake-gps-inspection.md) (G1–G10 + scorecard) on a Neon **branch**.
2. Fill each report's Results log. Export the flagged rows (CSV) for supervisor back-checks.
3. Back-check a sample (for example, the top 10 enumerators from the scorecard, and 5 random flagged responses per rule) by phone or a field re-visit to measure false-positive rates.
4. Adjust the thresholds in §3 where the false-positive rate is unacceptable. Record the changes in the Decisions Log.
5. Decide whether the evidence justifies Strategy C (Phase 8).

**Exit checks:** Results logs filled; thresholds confirmed; back-check outcome documented.

**Status:** Not started.

---

## Phase 2 — Server time evidence and integrity-flag schema (`migration_17_integrity_evidence.sql`)

**Purpose:** Persist the trusted server references and a place to store and review findings.

1. `survey_responses`: add `server_received_at timestamptz` (set by the server at sync), `device_clock_at_sync timestamptz` (from the batch), and `clock_skew_seconds integer` (= device − server).
2. `survey_attachments`: add `server_uploaded_at timestamptz`, copied from `survey_photo_uploads.created_at` before that row is deleted in `attachRequiredPhotos`.
3. New table `integrity_flags`:
   - `id bigserial PK`, `response_id uuid FK → survey_responses (CASCADE)`, `unit_id uuid FK → industrial_units`, `surveyor_id uuid FK → users`, `attachment_id uuid NULL FK → survey_attachments`
   - `category varchar(10) CHECK (category IN ('TIMESTAMP','GPS'))`, `rule_code varchar(10)` (for example `T1`, `G3`), `severity varchar(6) CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH'))`
   - `detail jsonb` (measured values and thresholds), `status varchar(15) DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLEARED','CONFIRMED_FAKE'))`, `reviewed_by uuid FK → users`, `reviewed_at timestamptz`, `review_note text`, `created_at timestamptz DEFAULT now()`
   - Unique index on `(response_id, rule_code, COALESCE(attachment_id, '00000000-0000-0000-0000-000000000000'::uuid))` so re-sync is idempotent; index on `(status, severity)` and `(surveyor_id)`.
4. Sync API: add optional `client_sent_at` (ISO-8601) to `SyncBatchDto` in [sync.dto.ts](../backend/src/controllers/sync.dto.ts). Keep it optional for older clients and treat a missing value as unknown skew.
5. Add the migration to the `SETUP_DATABASE.bat` allowlist and update [master-inspection-query.md](./database-inspection/master-inspection-query.md) with the new columns and table.

**Exit checks:** The migration is rerunnable and the verification query lists the new columns and table. Existing sync and photo tests pass. A sync without `client_sent_at` still succeeds.

**Status:** Not started.

---

## Phase 3 — Server-side timestamp rules (Strategy A)

**Purpose:** Turn report checks T1–T9 into live validation at upload/sync time.

1. In [photo.service.ts](../backend/src/bll/services/photo.service.ts) `uploadPhoto`: **reject** `captured_at` more than 5 minutes after server `now()`, and reject values older than the maximum offline window (for example 30 days).
2. In [sync.service.ts](../backend/src/bll/services/sync.service.ts): compute `clock_skew_seconds` from `client_sent_at`. Reject `started_at > submitted_at` and device times after server receipt beyond tolerance.
3. Add a rule module (for example `bll/services/integrity-rules.ts`) that writes `integrity_flags` inside the same transaction for T3 duration, T4 photo window, T5 photo pair gap, T6 overlap with the enumerator's other responses, T8 sync lag, and T9 off-hours. Use thresholds from one config object, with optional `system_settings` overrides.
4. When the skew is known, store skew-corrected times in `detail` for the reviewer. Do not overwrite device values.
5. Add focused Jest tests in the existing spec files (`photo.service.spec.ts`, `sync.service.spec.ts`): future capture rejected, start-after-submit rejected, out-of-window photo flagged, overlap flagged, and a missing `client_sent_at` accepted.

**Exit checks:** `npx jest --ci` passes in `backend`. A manual sync with a phone clock set 1 day ahead is rejected or flagged as designed.

**Status:** Not started.

---

## Phase 4 — Server-side GPS rules (Strategy A)

**Purpose:** Turn report checks G1–G9 into live validation.

1. **Reject** unit or photo coordinates outside the Punjab envelope or `(0,0)`, in both the sync and photo upload paths. Add the matching client-side message in [photoCapture.ts](../frontend/src/lib/photoCapture.ts) and the GPS widget.
2. Flag rules (in the rule module from Phase 3):
   - G2 unit outside declared district/tehsil polygon (only when `geom` exists); include distance to boundary.
   - G3 photo > 250 m from unit GPS; G4 photo pair > 150 m.
   - G5 exact coordinate reuse across responses; G6 different units within 30 m by the same enumerator (exclude the same `industrial_estate_id` when the owner approves).
   - G7 travel speed > 120 km/h against the enumerator's previous capture.
   - G8 accuracy `0` / dominant constant; G9 ≤ 4-decimal precision.
3. Optionally also write a G2 result to `gis_quality_log` for consistency with existing GIS checks.
4. Jest tests: outside Punjab rejected, district mismatch flagged, photo-far-from-unit flagged, impossible-travel flagged, and a normal survey with no flags.

**Exit checks:** Backend tests pass. A test survey taken with a mock-location app set to a different city produces G3/G7 flags.

**Status:** Not started.

---

## Phase 5 — Hardened PWA capture (Strategy B)

**Purpose:** Collect stronger evidence at capture so the server rules have more signals.

1. **Time anchor:** Add `GET /time` (or a response header on login and sync) returning `{ server_time, anchor_id, signature }` (HMAC with a server secret from env; never committed). Store the latest anchor in IndexedDB with the device time at receipt.
2. **Clock-change detection:** In-session, compare `Date.now() - performance.now()` against its value at page load. A jump of more than 2 minutes means the clock was changed, so record a `clock_changed` event in the draft. While online, warn the enumerator if the device differs from server time by more than 2 minutes.
3. **Capture record:** Each photo and `A_LOCATION_GPS` capture stores `device_time`, `anchor_id`, `ms_since_anchor`, and `fix_timestamp`. The watermark adds the short `anchor_id`.
4. **Multi-sample GPS:** Replace the single `getCurrentPosition` with a `watchPosition` window (for example 5 samples or 10 s). Store the best fix plus `sample_count`, `jitter_m`, `accuracy_min/max`, and `has_altitude/speed/heading`. Keep the existing 50 m warning and 250 m limit.
5. **Optional hash chain:** Each capture stores `sha256(prev_hash + photo_sha256 + device_time + lat + lng)`. The server verifies the chain per device at sync.
6. Server: verify the anchor signature and age, and flag `T_ANCHOR_MISSING`/`T_CLOCK_CHANGED`, `G_ZERO_JITTER` (all samples identical), and broken chains.
7. Bump the frontend form-cache revision. Keep accepting old answer shapes (no anchor/jitter → flag `INFO`, not reject) until all devices update.
8. Tests: frontend `npm test` (from `frontend/`) for anchor storage, clock-change detection, and jitter calculation. Backend tests for signature verification.

**Exit checks:** On a real Android phone, a normal capture produces no flags. Changing the phone clock mid-session and enabling a mock-location app each produce the expected flags.

**Status:** Not started.

---

## Phase 6 — Review queue, unit view, and reporting

**Purpose:** Make the findings usable by supervisors.

1. API: `GET /integrity-flags?status=&severity=&surveyor=` and `PATCH /integrity-flags/:id` (status + note). Restrict to the supervisor/admin roles in [migration_02_audit_roles.sql](../database/migration_02_audit_roles.sql). Write changes to `audit_log`.
2. UI: an **Integrity Review** page listing open flags with a map (unit point, photo points, district boundary), timestamps (device vs server vs skew), and the photos.
3. [UnitDetailPage.tsx](../frontend/src/pages/UnitDetailPage.tsx): show a flag badge and details for supervisors.
4. Approval rule: units/responses with an **open HIGH** flag cannot be approved until the flag is cleared or confirmed.
5. Enumerator risk scorecard (from the GPS report §4) as a supervisor dashboard widget.
6. PDF: no change for enumerators. Optionally add an internal "Integrity notes" appendix for supervisors (owner decision).

**Exit checks:** A supervisor can review, clear, or confirm a flag. Approval is blocked while HIGH flags are open. Enumerators cannot see or edit flags.

**Status:** Not started.

---

## Phase 7 — Rollout, training, and threshold tuning

1. Deploy backend first (new fields optional), then frontend. Confirm old cached clients can still sync.
2. Field SOP: automatic date/time and time zone **ON**, location mode **High accuracy**, no mock-location apps, developer options off. Enumerators sign an acknowledgement.
3. Re-run both inspection reports after 2 weeks. Compare flag rates per rule with the Phase 1 baseline and tune thresholds.
4. Review monthly: false-positive rate, confirmed fakes, and enumerators with repeat flags.
5. Decide on Phase 8 based on these numbers.

**Exit checks:** Flag rate and false-positive rate reported to the owner. Thresholds frozen or adjusted.

**Status:** Not started.

---

## Phase 8 (optional) — Native Android capture module (Strategy C)

**Start only if approved after Phase 1 or Phase 7.**

1. Add Capacitor around the existing frontend build. Keep the web/PWA path working.
2. Build a native plugin `SecureCapture` that returns the photo, a GNSS fix with `isMock`, satellite count/CN0, GNSS time, `elapsedRealtime`, `AUTO_TIME` state, and a Keystore signature.
3. Server: verify the Play Integrity token and capture signature. Reject `isMock = true`, auto-time off, or a failed integrity verdict, according to policy.
4. Distribution: signed APK via MDM or a Play internal track; device minimum Android version agreed with the owner.
5. Regression-test offline drafts, sync, the photo flow, and the PDF on target devices.

**Exit checks:** A mock-location app and a manual clock change are both blocked on test devices. Field pilot with 3–5 enumerators passes.

**Status:** Not started (optional).

---

## Decisions Log

| Date | Topic | Decision | By |
|---|---|---|---|
| | Strategy selected (A / A+B / A+B+C) | | |
| | Thresholds (§3) approved / changed | | |
| | Flag-vs-block policy | | |
| | Boundary polygons source & coverage | | |
| | Flag reviewers (roles) | | |
| | Phase 8 go / no-go | | |
