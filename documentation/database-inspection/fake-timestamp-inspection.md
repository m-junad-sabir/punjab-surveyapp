# Inspection Report — Fake / Manipulated Timestamps

**Related plan:** [workplan-to-solve-issues-3.md](../workplan-to-solve-issues-3.md) (Phase 1)  
**Companion report:** [fake-gps-inspection.md](./fake-gps-inspection.md)  
**Schema reference:** [master-inspection-query.md](./master-inspection-query.md)  
**Mode:** Read-only. Every query below is a `SELECT`. Run on a **Neon branch** first, then Neon main / localhost.

---

## 1. Why timestamps can be faked today

| Timestamp | Table.column | Source | Trust level |
|---|---|---|---|
| Survey start | `survey_responses.started_at` | Device clock (`new Date()` when the survey page opens) | Untrusted |
| Survey submit | `survey_responses.submitted_at` | Device clock | Untrusted |
| Survey completed | `survey_responses.completed_at` | Not written by sync today | n/a |
| Photo capture | `survey_attachments.captured_at` | `GeolocationPosition.timestamp` on device | Untrusted (device clock) |
| Photo watermark text | burned into JPEG | Device clock (`toLocaleString`) | Untrusted |
| Sync received | `survey_responses.synced_at` | **Server** `new Date()` | Trusted |
| Photo attached | `survey_attachments.created_at` | **Server** `now()` at sync | Trusted |
| Photo uploaded | `survey_photo_uploads.created_at` | **Server** — row is **deleted** after attach | Lost |
| Sync batch | `sync_log.started_at` / `finished_at` | **Server** | Trusted |

An enumerator can change the phone's date/time, turn off automatic time, or stay offline and sync later. Today the server
only checks that timestamps are valid ISO‑8601 dates ([sync.dto.ts](../../backend/src/controllers/sync.dto.ts),
[photo.service.ts](../../backend/src/bll/services/photo.service.ts)). The only trusted reference points are
`synced_at`, `survey_attachments.created_at`, and `sync_log`.

## 2. Thresholds used (tune in Workplan Phase 0)

| Parameter | Default | Meaning |
|---|---|---|
| `future_tolerance` | 5 minutes | Device time may be ahead of server by this much before flagging |
| `min_interview` | 10 minutes | Shorter `started_at → submitted_at` is implausible for the full questionnaire |
| `max_interview` | 3 days | Longer suggests a reused draft or a manipulated clock |
| `max_sync_lag` | 7 days | Offline backlog longer than this needs review |
| `photo_window_before` | 60 minutes | Photo may be captured this long before `started_at` |
| `photo_window_after` | 15 minutes | Photo may be captured this long after `submitted_at` |
| `photo_pair_gap` | 3 hours | Max gap between interview photo and signboard photo of one response |
| Working hours | 07:00–20:00 Asia/Karachi | Outside → informational flag only |

Thresholds are written as literals so each query runs standalone; change them in place.

---

## 3. Checks

### T1 — Device timestamps in the future relative to server receipt  (Severity: HIGH)

A response or photo cannot be submitted/captured after the server received it. A positive gap means the device clock was ahead.

```sql
SELECT r.id                AS response_id,
       u.username,
       r.device_id,
       r.started_at,
       r.submitted_at,
       r.synced_at,
       r.submitted_at - r.synced_at AS device_ahead_by
  FROM survey_responses r
  JOIN users u ON u.id = r.surveyor_id
 WHERE r.synced_at IS NOT NULL
   AND (r.submitted_at > r.synced_at + interval '5 minutes'
     OR r.started_at   > r.synced_at + interval '5 minutes')
 ORDER BY device_ahead_by DESC;

-- Photos captured "after" the server attached them
SELECT a.id AS attachment_id, a.response_id, a.photo_type, u.username,
       a.captured_at, a.created_at AS server_attached_at,
       a.captured_at - a.created_at AS device_ahead_by
  FROM survey_attachments a
  JOIN users u ON u.id = a.uploaded_by
 WHERE a.photo_type IS NOT NULL
   AND a.captured_at > a.created_at + interval '5 minutes'
 ORDER BY device_ahead_by DESC;
```

**Interpretation:** Any row is strong evidence of a wrong/manipulated clock. A constant offset across one device suggests a mis-set clock;
varying offsets suggest deliberate changes.

### T2 — Impossible ordering  (Severity: HIGH)

```sql
SELECT r.id AS response_id, u.username, r.started_at, r.submitted_at, r.completed_at, r.synced_at
  FROM survey_responses r
  JOIN users u ON u.id = r.surveyor_id
 WHERE r.started_at > r.submitted_at
    OR (r.completed_at IS NOT NULL AND (r.completed_at < r.started_at OR r.completed_at > r.submitted_at))
    OR (r.synced_at IS NOT NULL AND r.synced_at < r.started_at - interval '5 minutes')
 ORDER BY r.started_at;
```

**Interpretation:** Start after submit, or a server sync time before the claimed start, can only happen if the clock moved backwards or the payload was altered.

### T3 — Implausible interview duration  (Severity: MEDIUM)

```sql
SELECT r.id AS response_id, u.username,
       r.started_at, r.submitted_at,
       r.submitted_at - r.started_at AS duration,
       CASE WHEN r.submitted_at - r.started_at < interval '10 minutes' THEN 'TOO_SHORT'
            ELSE 'TOO_LONG' END AS rule
  FROM survey_responses r
  JOIN users u ON u.id = r.surveyor_id
 WHERE r.started_at <= r.submitted_at
   AND (r.submitted_at - r.started_at < interval '10 minutes'
     OR r.submitted_at - r.started_at > interval '3 days')
 ORDER BY duration;
```

**Interpretation:** Very short = desk filling / copy of another form. Very long = draft reused or clock moved. Confirm with the PDF and photos.

### T4 — Photo captured outside the survey window  (Severity: HIGH)

```sql
SELECT a.id AS attachment_id, a.response_id, a.photo_type, u.username,
       r.started_at, a.captured_at, r.submitted_at,
       CASE WHEN a.captured_at < r.started_at - interval '60 minutes' THEN 'BEFORE_SURVEY'
            ELSE 'AFTER_SUBMIT' END AS rule
  FROM survey_attachments a
  JOIN survey_responses r ON r.id = a.response_id
  JOIN users u ON u.id = r.surveyor_id
 WHERE a.photo_type IS NOT NULL
   AND (a.captured_at < r.started_at   - interval '60 minutes'
     OR a.captured_at > r.submitted_at + interval '15 minutes')
 ORDER BY u.username, a.captured_at;
```

**Interpretation:** Photos are captured live in Section L, so they must fall inside the interview window. A photo days earlier suggests a photo reused from another visit or a changed clock.

### T5 — Interview and signboard photos too far apart  (Severity: MEDIUM)

```sql
SELECT p1.response_id, u.username,
       p1.captured_at AS interview_photo_at,
       p2.captured_at AS signboard_photo_at,
       abs(extract(epoch FROM p1.captured_at - p2.captured_at)) / 3600.0 AS gap_hours
  FROM survey_attachments p1
  JOIN survey_attachments p2
    ON p2.response_id = p1.response_id
   AND p1.photo_type = 'L_PHOTO_INTERVIEW_SESSION'
   AND p2.photo_type = 'L_PHOTO_ENTRANCE_SIGNBOARD'
  JOIN survey_responses r ON r.id = p1.response_id
  JOIN users u ON u.id = r.surveyor_id
 WHERE abs(extract(epoch FROM p1.captured_at - p2.captured_at)) > 3 * 3600
 ORDER BY gap_hours DESC;
```

### T6 — Same enumerator in two interviews at once  (Severity: HIGH)

```sql
SELECT a.surveyor_id, u.username,
       a.id AS response_a, a.started_at AS a_start, a.submitted_at AS a_submit,
       b.id AS response_b, b.started_at AS b_start, b.submitted_at AS b_submit
  FROM survey_responses a
  JOIN survey_responses b
    ON b.surveyor_id = a.surveyor_id
   AND b.id > a.id
  JOIN users u ON u.id = a.surveyor_id
 WHERE a.started_at <= a.submitted_at
   AND b.started_at <= b.submitted_at
   AND tstzrange(a.started_at, a.submitted_at) && tstzrange(b.started_at, b.submitted_at)
 ORDER BY u.username, a.started_at;
```

**Interpretation:** Overlapping windows are expected only if drafts are kept open in parallel. Overlap combined with photo times that also overlap (T4/T5) or photos at different places (GPS report G7) is strong evidence of fabrication.

### T7 — Per-device clock skew profile  (Severity: INFO → drives review)

```sql
SELECT r.device_id,
       u.username,
       count(*)                                                     AS responses,
       max(r.submitted_at - r.synced_at)                            AS max_device_ahead,
       min(r.synced_at - r.submitted_at)                            AS min_sync_lag,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM r.synced_at - r.submitted_at)) / 3600.0
                                                                    AS median_sync_lag_hours,
       count(*) FILTER (WHERE r.submitted_at > r.synced_at)         AS future_count
  FROM survey_responses r
  JOIN users u ON u.id = r.surveyor_id
 WHERE r.synced_at IS NOT NULL
 GROUP BY r.device_id, u.username
 ORDER BY future_count DESC, max_device_ahead DESC NULLS LAST;
```

**Interpretation:** Online submissions should sync within seconds (`min_sync_lag` near zero). A device whose minimum lag is
consistently negative has a clock ahead of the server. `device_id` is client-supplied and may be `'unknown'`.

### T8 — Long offline backlog  (Severity: LOW)

```sql
SELECT r.id AS response_id, u.username, r.device_id, r.submitted_at, r.synced_at,
       r.synced_at - r.submitted_at AS sync_lag
  FROM survey_responses r
  JOIN users u ON u.id = r.surveyor_id
 WHERE r.synced_at - r.submitted_at > interval '7 days'
 ORDER BY sync_lag DESC;
```

**Interpretation:** A long lag is not fraud by itself, but the device timestamps of these records cannot be checked against server time.

### T9 — Captures outside working hours (Asia/Karachi)  (Severity: INFO)

```sql
SELECT a.response_id, a.photo_type, u.username,
       a.captured_at AT TIME ZONE 'Asia/Karachi' AS local_capture_time
  FROM survey_attachments a
  JOIN users u ON u.id = a.uploaded_by
 WHERE a.photo_type IS NOT NULL
   AND (extract(hour FROM a.captured_at AT TIME ZONE 'Asia/Karachi') < 7
     OR extract(hour FROM a.captured_at AT TIME ZONE 'Asia/Karachi') >= 20)
 ORDER BY local_capture_time;
```

### T10 — Timestamps that are "too neat"  (Severity: LOW)

Hand-entered or scripted values often have zero seconds/milliseconds.

```sql
SELECT 'survey_responses.started_at' AS field, count(*) FILTER (WHERE date_trunc('minute', started_at) = started_at) AS whole_minute, count(*) AS total
  FROM survey_responses
UNION ALL
SELECT 'survey_responses.submitted_at', count(*) FILTER (WHERE date_trunc('minute', submitted_at) = submitted_at), count(*)
  FROM survey_responses
UNION ALL
SELECT 'survey_attachments.captured_at', count(*) FILTER (WHERE date_trunc('minute', captured_at) = captured_at), count(*)
  FROM survey_attachments WHERE photo_type IS NOT NULL;
```

**Interpretation:** About 1 in 60 values should land on a whole minute by chance. A much higher share needs investigation.

---

## 4. Summary query (counts per rule)

```sql
SELECT 'T1_future_response' AS rule, count(*) FROM survey_responses
 WHERE synced_at IS NOT NULL AND (submitted_at > synced_at + interval '5 minutes' OR started_at > synced_at + interval '5 minutes')
UNION ALL
SELECT 'T1_future_photo', count(*) FROM survey_attachments
 WHERE photo_type IS NOT NULL AND captured_at > created_at + interval '5 minutes'
UNION ALL
SELECT 'T2_bad_order', count(*) FROM survey_responses
 WHERE started_at > submitted_at
UNION ALL
SELECT 'T3_duration', count(*) FROM survey_responses
 WHERE started_at <= submitted_at
   AND (submitted_at - started_at < interval '10 minutes' OR submitted_at - started_at > interval '3 days')
UNION ALL
SELECT 'T4_photo_window', count(*) FROM survey_attachments a JOIN survey_responses r ON r.id = a.response_id
 WHERE a.photo_type IS NOT NULL
   AND (a.captured_at < r.started_at - interval '60 minutes' OR a.captured_at > r.submitted_at + interval '15 minutes')
UNION ALL
SELECT 'T8_sync_lag', count(*) FROM survey_responses
 WHERE synced_at - submitted_at > interval '7 days';
```

## 5. Evidence gaps (fix in the workplan)

1. No server receive time for the photo **upload** (the `survey_photo_uploads` row is deleted on attach) → Workplan Phase 2.
2. No device clock reading at sync time, so per-batch clock skew cannot be measured exactly → Phase 2/5.
3. `A_LOCATION_GPS` answer has no fix timestamp → Phase 5.
4. No persisted flag/review state for detected anomalies → Phase 2 (`integrity_flags`).

## 6. Results log (fill per run)

| Run date | Database (branch/main/local) | Run by | T1 | T2 | T3 | T4 | T5 | T6 | T7 devices flagged | T8 | T9 | T10 | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-24 | local `punjab_industrial_survey` (2 surveys, 0 photos) | hashimz | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Local baseline. Photo checks had nothing to examine. |
| 2026-11-24 | local `punjab_stress_test` (synthetic load data) | hashimz | 0 | 0 | 5 | 2 | 0 | 765885 | 0 | 0 | 0 | 0 | Not field data; see notes. |

**Run notes (2026-11-24)**

- The local `punjab_industrial_survey` holds only 2 surveys (`admin` and `surveyor1`, 12 Oct 2026) and 0 photos, so the photo parts of T1, T4, T5 and T9 had nothing to check, and the T10 photo row has no data. For the 2 surveys themselves, no check fired: interviews lasted about 57 and 42 minutes, and each synced within about 20 seconds of submission. No device clock is ahead of the server (T7).
- Both surveys were submitted from the same device ID (`DEV-E0F3A918`) under two different accounts (`admin` and `surveyor1`). Device IDs are supplied by the client, so this is only a note for reviewers.
- `punjab_stress_test` is a throwaway copy filled by our load-test scripts (1,533 surveys, 3,062 photos, 3 accounts), so its counts are synthetic and are not findings. They only show that the queries run at scale. T6 returned 765,885 pairs because the scripts reused the same start and submit times, and it compares every pair of surveys per enumerator, so on a large production table it will be slow. Run it on a Neon branch, or limit it to a date range.
- In the T7 column, the number is devices with a clock ahead of the server (0 in both databases). In the T10 column, the number is whole-minute timestamps found (0 in both).
- All statements ran without errors on both databases. Repeat the run on a Neon branch before treating any numbers as real field data.