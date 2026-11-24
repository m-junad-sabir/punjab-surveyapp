# Timestamp checks T1 to T10: what each does and what it returned

Date: 2026-11-24. Each query of [fake-timestamp-inspection.md](./fake-timestamp-inspection.md) was run on its own. Every query is a read-only SELECT.

Two databases were used, so repeat the run there before treating any number as real field data.

- Local: local database (2 real surveys, 0 photos)
- Stress (synthetic): stress database (synthetic load data, not field findings)

Output is cut to the first 12 rows. The row count under each result is the full count.

| Check | Severity | Local rows | Stress (synthetic) rows |
|---|---|---|---|
| T1 | HIGH | 0 / 0 | 0 / 0 |
| T2 | HIGH | 0 | 0 |
| T3 | MEDIUM | 0 | 5 |
| T4 | HIGH | 0 | 2 |
| T5 | MEDIUM | 0 | 0 |
| T6 | HIGH | 0 | 765885 |
| T7 | INFO → drives review | 2 | 5 |
| T8 | LOW | 0 | 0 |
| T9 | INFO | 0 | 0 |
| T10 | LOW | 3 | 3 |

## T1 — Device timestamps in the future relative to server receipt

**Severity:** HIGH

**What it does:** Finds surveys whose device start or submit time is more than 5 minutes after the server received them (query 1), and photos captured after the server attached them (query 2).

**From the report:**

> A response or photo cannot be submitted/captured after the server received it. A positive gap means the device clock was ahead.
>
> **Interpretation:** Any row is strong evidence of a wrong/manipulated clock. A constant offset across one device suggests a mis-set clock;
>
> varying offsets suggest deliberate changes.
>

**Result on the local database (2 real surveys, 0 photos) (query 1 of 2):** 0 row(s)

```text
 response_id | username | device_id | started_at | submitted_at | synced_at | device_ahead_by 
-------------+----------+-----------+------------+--------------+-----------+-----------------
(0 rows)
```

**Result on the local database (2 real surveys, 0 photos) (query 2 of 2):** 0 row(s)

```text
 attachment_id | response_id | photo_type | username | captured_at | server_attached_at | device_ahead_by 
---------------+-------------+------------+----------+-------------+--------------------+-----------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings) (query 1 of 2):** 0 row(s)

```text
 response_id | username | device_id | started_at | submitted_at | synced_at | device_ahead_by 
-------------+----------+-----------+------------+--------------+-----------+-----------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings) (query 2 of 2):** 0 row(s)

```text
 attachment_id | response_id | photo_type | username | captured_at | server_attached_at | device_ahead_by 
---------------+-------------+------------+----------+-------------+--------------------+-----------------
(0 rows)
```

## T2 — Impossible ordering

**Severity:** HIGH

**What it does:** Finds impossible time order: start after submit, completion outside the interview, or a server sync time before the claimed start.

**From the report:**

> **Interpretation:** Start after submit, or a server sync time before the claimed start, can only happen if the clock moved backwards or the payload was altered.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 response_id | username | started_at | submitted_at | completed_at | synced_at 
-------------+----------+------------+--------------+--------------+-----------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 0 row(s)

```text
 response_id | username | started_at | submitted_at | completed_at | synced_at 
-------------+----------+------------+--------------+--------------+-----------
(0 rows)
```

## T3 — Implausible interview duration

**Severity:** MEDIUM

**What it does:** Lists interviews shorter than 10 minutes or longer than 3 days.

**From the report:**

> **Interpretation:** Very short = desk filling / copy of another form. Very long = draft reused or clock moved. Confirm with the PDF and photos.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 response_id | username | started_at | submitted_at | duration | rule 
-------------+----------+------------+--------------+----------+------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 5 row(s)

```text
             response_id              |     username     |         started_at         |        submitted_at        |   duration   |   rule    
--------------------------------------+------------------+----------------------------+----------------------------+--------------+-----------
 27a74c49-9b65-4449-8327-8f1a976c32aa | stress-test-user | 2026-11-18 10:02:25.607+05 | 2026-11-18 10:02:40.07+05  | 00:00:14.463 | TOO_SHORT
 4620f876-c968-465b-b4b5-5d22213ea908 | stress-test-user | 2026-11-17 15:08:59.615+05 | 2026-11-17 15:18:59.423+05 | 00:09:59.808 | TOO_SHORT
 c401219b-82c1-41ac-8973-445abec6e1b6 | stress-test-user | 2026-11-17 15:02:19.477+05 | 2026-11-17 15:12:19.331+05 | 00:09:59.854 | TOO_SHORT
 cdc5b006-2b77-4142-9eb7-5a205bc4de50 | stress-test-user | 2026-11-17 14:26:02.271+05 | 2026-11-17 14:36:02.175+05 | 00:09:59.904 | TOO_SHORT
 6d1e984e-a5e0-40b1-9d75-c0e6ce7a4125 | stress-test-user | 2026-11-17 15:06:37.089+05 | 2026-11-17 15:16:37.043+05 | 00:09:59.954 | TOO_SHORT
(5 rows)
```

## T4 — Photo captured outside the survey window

**Severity:** HIGH

**What it does:** Lists photos captured more than 60 minutes before the survey started or more than 15 minutes after it was submitted.

**From the report:**

> **Interpretation:** Photos are captured live in Section L, so they must fall inside the interview window. A photo days earlier suggests a photo reused from another visit or a changed clock.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 attachment_id | response_id | photo_type | username | started_at | captured_at | submitted_at | rule 
---------------+-------------+------------+----------+------------+-------------+--------------+------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 2 row(s)

```text
            attachment_id             |             response_id              |         photo_type         |     username     |         started_at         |        captured_at         |       submitted_at        |     rule      
--------------------------------------+--------------------------------------+----------------------------+------------------+----------------------------+----------------------------+---------------------------+---------------
 2a41cdae-1e38-422f-a49e-004130af7e7b | 27a74c49-9b65-4449-8327-8f1a976c32aa | L_PHOTO_INTERVIEW_SESSION  | stress-test-user | 2026-11-18 10:02:25.607+05 | 2026-11-17 15:37:00.265+05 | 2026-11-18 10:02:40.07+05 | BEFORE_SURVEY
 4294b645-7858-4a02-a35a-4db999f03844 | 27a74c49-9b65-4449-8327-8f1a976c32aa | L_PHOTO_ENTRANCE_SIGNBOARD | stress-test-user | 2026-11-18 10:02:25.607+05 | 2026-11-17 15:37:00.265+05 | 2026-11-18 10:02:40.07+05 | BEFORE_SURVEY
(2 rows)
```

## T5 — Interview and signboard photos too far apart

**Severity:** MEDIUM

**What it does:** Lists surveys whose interview and signboard photos were captured more than 3 hours apart.

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 response_id | username | interview_photo_at | signboard_photo_at | gap_hours 
-------------+----------+--------------------+--------------------+-----------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 0 row(s)

```text
 response_id | username | interview_photo_at | signboard_photo_at | gap_hours 
-------------+----------+--------------------+--------------------+-----------
(0 rows)
```

## T6 — Same enumerator in two interviews at once

**Severity:** HIGH

**What it does:** Finds pairs of surveys by the same enumerator whose start-to-submit windows overlap.

**From the report:**

> **Interpretation:** Overlapping windows are expected only if drafts are kept open in parallel. Overlap combined with photo times that also overlap (T4/T5) or photos at different places (GPS report G7) is strong evidence of fabrication.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 surveyor_id | username | response_a | a_start | a_submit | response_b | b_start | b_submit 
-------------+----------+------------+---------+----------+------------+---------+----------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 765885 row(s)

```text
             surveyor_id              |     username     |              response_a              |          a_start           |          a_submit          |              response_b              |          b_start           |          b_submit          
--------------------------------------+------------------+--------------------------------------+----------------------------+----------------------------+--------------------------------------+----------------------------+----------------------------
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | 8cf45bdf-dfc7-400d-bebc-33b41bade4af | 2026-11-16 11:23:04.708+05 | 2026-11-16 11:33:04.708+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | 448c1061-5c22-402f-8475-1cc3163822d3 | 2026-11-16 11:23:04.238+05 | 2026-11-16 11:33:04.238+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | f6fbdaab-2faa-4409-8f62-b4b87c8cec4d | 2026-11-16 11:23:04.02+05  | 2026-11-16 11:33:04.02+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | afe79736-04c2-4756-81e5-b24757da4e75 | 2026-11-16 11:23:03.322+05 | 2026-11-16 11:33:03.322+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | 75b360d9-1aeb-47ea-ae5a-95761b46f30d | 2026-11-16 11:23:03.064+05 | 2026-11-16 11:33:03.064+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | 8e53f0b9-5897-4d40-9099-f108aeff4ec4 | 2026-11-16 11:23:02.853+05 | 2026-11-16 11:33:02.853+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | c54e13cc-3362-4612-b841-65a1243f2715 | 2026-11-16 11:23:02.345+05 | 2026-11-16 11:33:02.345+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | b2dcf145-8972-4e2b-a576-471df5d31224 | 2026-11-16 11:23:02.116+05 | 2026-11-16 11:33:02.116+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | d52cfee2-395d-41f8-9629-e6ab5cabbdf4 | 2026-11-16 11:23:01.905+05 | 2026-11-16 11:33:01.905+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | 6fbfd35e-ca9a-482d-85e5-6e28818b5b7f | 2026-11-16 11:23:01.673+05 | 2026-11-16 11:33:01.673+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | 5e30e741-b6b3-41a2-a9fd-d46dd6978339 | 2026-11-16 11:23:01.429+05 | 2026-11-16 11:33:01.429+05
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 408b3567-7819-45bd-8839-47dd9f350676 | 2026-11-16 11:22:28.489+05 | 2026-11-16 11:32:28.491+05 | 990c16b2-a8f6-4db1-81aa-77bcbae9251d | 2026-11-16 11:23:01.184+05 | 2026-11-16 11:33:01.184+05
... 765873 more rows not shown
(765885 rows)
```

## T7 — Per-device clock skew profile

**Severity:** INFO → drives review

**What it does:** Profiles each device and user pair: how far its clock runs ahead of the server and how long it takes to sync.

**From the report:**

> **Interpretation:** Online submissions should sync within seconds (`min_sync_lag` near zero). A device whose minimum lag is
>
> consistently negative has a clock ahead of the server. `device_id` is client-supplied and may be `'unknown'`.
>

**Result on the local database (2 real surveys, 0 photos):** 2 row(s)

```text
  device_id   | username  | responses | max_device_ahead | min_sync_lag | median_sync_lag_hours | future_count 
--------------+-----------+-----------+------------------+--------------+-----------------------+--------------
 DEV-E0F3A918 | admin     |         1 | -00:00:10.909    | 00:00:10.909 |  0.003030277777777778 |            0
 DEV-E0F3A918 | surveyor1 |         1 | -00:00:19.905    | 00:00:19.905 |  0.005529166666666667 |            0
(2 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 5 row(s)

```text
   device_id    |     username     | responses | max_device_ahead | min_sync_lag | median_sync_lag_hours  | future_count 
----------------+------------------+-----------+------------------+--------------+------------------------+--------------
 STRESS-TEST    | stress-test-user |      1502 | -00:00:00.031    | 00:00:00.031 |  6.097222222222222e-05 |            0
 INJECTION-TEST | stress-test-user |        24 | -00:00:00.045    | 00:00:00.045 | 1.4722222222222222e-05 |            0
 DEV-E0F3A918   | admin            |         1 | -00:00:10.909    | 00:00:10.909 |   0.003030277777777778 |            0
 DEV-E0F3A918   | surveyor1        |         1 | -00:00:19.905    | 00:00:19.905 |   0.005529166666666667 |            0
 DEV-D3DD4402   | stress-test-user |         5 | -00:00:43.691    | 00:00:43.691 |              0.1812175 |            0
(5 rows)
```

## T8 — Long offline backlog

**Severity:** LOW

**What it does:** Lists surveys that reached the server more than 7 days after submission.

**From the report:**

> **Interpretation:** A long lag is not fraud by itself, but the device timestamps of these records cannot be checked against server time.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 response_id | username | device_id | submitted_at | synced_at | sync_lag 
-------------+----------+-----------+--------------+-----------+----------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 0 row(s)

```text
 response_id | username | device_id | submitted_at | synced_at | sync_lag 
-------------+----------+-----------+--------------+-----------+----------
(0 rows)
```

## T9 — Captures outside working hours (Asia/Karachi)

**Severity:** INFO

**What it does:** Lists photos captured outside 07:00 to 20:00 Asia/Karachi time.

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 response_id | photo_type | username | local_capture_time 
-------------+------------+----------+--------------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 0 row(s)

```text
 response_id | photo_type | username | local_capture_time 
-------------+------------+----------+--------------------
(0 rows)
```

## T10 — Timestamps that are "too neat"

**Severity:** LOW

**What it does:** Counts how many timestamps fall on an exact minute, which scripted or hand-typed values tend to do.

**From the report:**

> Hand-entered or scripted values often have zero seconds/milliseconds.
>
> **Interpretation:** About 1 in 60 values should land on a whole minute by chance. A much higher share needs investigation.
>

**Result on the local database (2 real surveys, 0 photos):** 3 row(s)

```text
             field              | whole_minute | total 
--------------------------------+--------------+-------
 survey_responses.started_at    |            0 |     2
 survey_responses.submitted_at  |            0 |     2
 survey_attachments.captured_at |            0 |     0
(3 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 3 row(s)

```text
             field              | whole_minute | total 
--------------------------------+--------------+-------
 survey_responses.started_at    |            0 |  1533
 survey_responses.submitted_at  |            0 |  1533
 survey_attachments.captured_at |            0 |  3062
(3 rows)
```

