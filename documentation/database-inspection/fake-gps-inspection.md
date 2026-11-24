# Inspection Report — Fake / Spoofed GPS Locations

**Related plan:** [workplan-to-solve-issues-3.md](../workplan-to-solve-issues-3.md) (Phase 1)  
**Companion report:** [fake-timestamp-inspection.md](./fake-timestamp-inspection.md)  
**Schema reference:** [master-inspection-query.md](./master-inspection-query.md)  
**Mode:** Read-only. Every query below is a `SELECT` (PostGIS required). Run on a **Neon branch** first.

---

## 1. Why GPS can be faked today

| Location | Table.column | Source | Current server check |
|---|---|---|---|
| Unit location (Section A GPS) | `survey_responses.gps_lat/gps_lng/gps_accuracy_m`, `industrial_units.location`, `industrial_units.gps_accuracy_m` | Browser `getCurrentPosition` (no fix time stored) | Range only (−90..90, −180..180) |
| Interview photo | `survey_attachments.latitude/longitude/accuracy_m` (`photo_type = 'L_PHOTO_INTERVIEW_SESSION'`) | Browser `getCurrentPosition`, `maximumAge: 0` | Range + accuracy 0–250 m |
| Signboard photo | same, `photo_type = 'L_PHOTO_ENTRANCE_SIGNBOARD'` | same | same |

The app is a browser PWA. Browsers **do not expose** Android's "mock location" flag, so a fake-GPS app (developer option
"Select mock location app") feeds coordinates that look valid. The server cannot see spoofing directly. It can only
detect **inconsistencies**: location vs administrative boundary, photo vs unit, travel speed, and repeated or unnaturally
clean values.

## 2. Thresholds used (tune in Workplan Phase 0)

| Parameter | Default | Meaning |
|---|---|---|
| Punjab bounding box | lat 27.6–34.1, lng 69.2–75.5 | Approximate envelope; prefer province/district polygons when `geom` is loaded |
| `photo_to_unit_max` | 250 m | Photo must be taken near the recorded unit location (matches max accuracy) |
| `photo_pair_max` | 150 m | Interview and signboard photos of one response should be close together |
| `max_speed` | 120 km/h | Faster travel between two consecutive captures by one enumerator is implausible |
| `min_travel_gap` | 2 minutes | Skip speed checks for very close timestamps (GPS noise dominates) |
| `same_spot_radius` | 30 m | Different units surveyed from the "same spot" by one enumerator |
| Suspicious accuracy | `0`, or one exact value repeated in most of an enumerator's fixes | Typical of mock providers |

---

## 3. Checks

### G1 — Outside Punjab envelope or at "null island"  (Severity: HIGH)

```sql
SELECT 'response' AS source, r.id AS record_id, u.username, r.gps_lat AS lat, r.gps_lng AS lng, r.gps_accuracy_m AS accuracy_m
  FROM survey_responses r JOIN users u ON u.id = r.surveyor_id
 WHERE r.gps_lat IS NOT NULL
   AND (r.gps_lat NOT BETWEEN 27.6 AND 34.1 OR r.gps_lng NOT BETWEEN 69.2 AND 75.5
        OR (r.gps_lat = 0 AND r.gps_lng = 0))
UNION ALL
SELECT 'photo:' || a.photo_type, a.id, u.username, a.latitude, a.longitude, a.accuracy_m
  FROM survey_attachments a JOIN users u ON u.id = a.uploaded_by
 WHERE a.photo_type IS NOT NULL
   AND (a.latitude NOT BETWEEN 27.6 AND 34.1 OR a.longitude NOT BETWEEN 69.2 AND 75.5
        OR (a.latitude = 0 AND a.longitude = 0))
ORDER BY username;
```

### G2 — Unit location not inside its declared district / tehsil  (Severity: HIGH)

Runs only where boundary polygons are loaded (`geom IS NOT NULL`).

```sql
SELECT iu.id AS unit_id, iu.name, iu.district_name, iu.tehsil_name,
       ST_Y(iu.location) AS lat, ST_X(iu.location) AS lng,
       NOT ST_Covers(d.geom, iu.location) AS outside_district,
       (t.geom IS NOT NULL AND NOT ST_Covers(t.geom, iu.location)) AS outside_tehsil,
       round(ST_Distance(d.geom::geography, iu.location::geography)::numeric, 0) AS metres_from_district
  FROM industrial_units iu
  JOIN districts d ON d.id = iu.district_id
  LEFT JOIN tehsils t ON t.id = iu.tehsil_id
 WHERE iu.location IS NOT NULL
   AND d.geom IS NOT NULL
   AND (NOT ST_Covers(d.geom, iu.location)
        OR (t.geom IS NOT NULL AND NOT ST_Covers(t.geom, iu.location)))
 ORDER BY metres_from_district DESC;

-- Coverage check: how many districts/tehsils have polygons at all?
SELECT 'districts' AS level, count(*) FILTER (WHERE geom IS NOT NULL) AS with_geom, count(*) AS total FROM districts
UNION ALL
SELECT 'tehsils', count(*) FILTER (WHERE geom IS NOT NULL), count(*) FROM tehsils;
```

**Interpretation:** A unit claimed in district X but located in district Y means the location was faked, the enumerator
chose the wrong district, or the unit sits near a boundary. Check `metres_from_district`: a few hundred metres is usually a
boundary/accuracy issue, while kilometres need investigation.

### G3 — Photo taken far from the unit location  (Severity: HIGH)

```sql
SELECT a.id AS attachment_id, a.response_id, a.photo_type, u.username,
       round(ST_Distance(
         ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(r.gps_lng,  r.gps_lat),  4326)::geography)::numeric, 0) AS distance_m,
       a.accuracy_m AS photo_accuracy_m, r.gps_accuracy_m AS unit_accuracy_m
  FROM survey_attachments a
  JOIN survey_responses r ON r.id = a.response_id
  JOIN users u ON u.id = r.surveyor_id
 WHERE a.photo_type IS NOT NULL
   AND r.gps_lat IS NOT NULL AND r.gps_lng IS NOT NULL
   AND ST_Distance(
         ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(r.gps_lng,  r.gps_lat),  4326)::geography) > 250
 ORDER BY distance_m DESC;
```

**Interpretation:** Both values are captured at the premises. A large gap means one of them was spoofed or captured elsewhere (for example, the unit GPS was captured at the office).

### G4 — Interview and signboard photos far apart  (Severity: MEDIUM)

```sql
SELECT p1.response_id, u.username,
       round(ST_Distance(
         ST_SetSRID(ST_MakePoint(p1.longitude, p1.latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(p2.longitude, p2.latitude), 4326)::geography)::numeric, 0) AS distance_m
  FROM survey_attachments p1
  JOIN survey_attachments p2
    ON p2.response_id = p1.response_id
   AND p1.photo_type = 'L_PHOTO_INTERVIEW_SESSION'
   AND p2.photo_type = 'L_PHOTO_ENTRANCE_SIGNBOARD'
  JOIN survey_responses r ON r.id = p1.response_id
  JOIN users u ON u.id = r.surveyor_id
 WHERE ST_Distance(
         ST_SetSRID(ST_MakePoint(p1.longitude, p1.latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint(p2.longitude, p2.latitude), 4326)::geography) > 150
 ORDER BY distance_m DESC;
```

### G5 — Identical coordinates reused across different responses  (Severity: HIGH)

Real GPS fixes almost never repeat to 6 decimals (about 0.1 m) at different visits. Mock apps that use a saved
"favourite" location repeat the exact point.

```sql
WITH pts AS (
  SELECT r.surveyor_id, r.id AS response_id, r.gps_lat AS lat, r.gps_lng AS lng, 'unit' AS kind
    FROM survey_responses r WHERE r.gps_lat IS NOT NULL
  UNION ALL
  SELECT r.surveyor_id, a.response_id, a.latitude, a.longitude, 'photo'
    FROM survey_attachments a JOIN survey_responses r ON r.id = a.response_id
   WHERE a.photo_type IS NOT NULL
)
SELECT p.lat, p.lng,
       count(DISTINCT p.response_id) AS responses,
       array_agg(DISTINCT u.username) AS enumerators,
       array_agg(DISTINCT p.kind)     AS kinds
  FROM pts p JOIN users u ON u.id = p.surveyor_id
 GROUP BY p.lat, p.lng
HAVING count(DISTINCT p.response_id) > 1
 ORDER BY responses DESC;
```

### G6 — Many different units surveyed from the same spot  (Severity: HIGH)

Catches "desk surveys", where many units are recorded from one location, even when coordinates are slightly jittered.

```sql
SELECT a.surveyor_id, u.username,
       a.id AS response_a, b.id AS response_b,
       a.unit_id AS unit_a, b.unit_id AS unit_b,
       round(ST_Distance(
         ST_SetSRID(ST_MakePoint(a.gps_lng, a.gps_lat), 4326)::geography,
         ST_SetSRID(ST_MakePoint(b.gps_lng, b.gps_lat), 4326)::geography)::numeric, 1) AS distance_m
  FROM survey_responses a
  JOIN survey_responses b
    ON b.surveyor_id = a.surveyor_id
   AND b.id > a.id
   AND b.unit_id <> a.unit_id
  JOIN users u ON u.id = a.surveyor_id
 WHERE a.gps_lat IS NOT NULL AND b.gps_lat IS NOT NULL
   AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(a.gps_lng, a.gps_lat), 4326)::geography,
         ST_SetSRID(ST_MakePoint(b.gps_lng, b.gps_lat), 4326)::geography, 30)
 ORDER BY u.username, distance_m;
```

**Interpretation:** This is legitimate inside multi-unit buildings or small industrial estates. Compare with
`industrial_estate_id` and photos before concluding. Many hits for one enumerator spread over many days is a strong
signal.

### G7 — Impossible travel speed between consecutive captures  (Severity: HIGH)

```sql
WITH caps AS (
  SELECT r.surveyor_id, a.response_id, a.photo_type, a.captured_at,
         ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography AS g
    FROM survey_attachments a JOIN survey_responses r ON r.id = a.response_id
   WHERE a.photo_type IS NOT NULL
), seq AS (
  SELECT c.*,
         lag(c.captured_at) OVER w AS prev_at,
         lag(c.g)           OVER w AS prev_g,
         lag(c.response_id) OVER w AS prev_response
    FROM caps c
  WINDOW w AS (PARTITION BY c.surveyor_id ORDER BY c.captured_at)
)
SELECT s.surveyor_id, u.username, s.prev_response, s.response_id,
       s.prev_at, s.captured_at,
       round((ST_Distance(s.prev_g, s.g) / 1000)::numeric, 2) AS km,
       round((ST_Distance(s.prev_g, s.g) / 1000
              / (extract(epoch FROM s.captured_at - s.prev_at) / 3600.0))::numeric, 1) AS km_per_h
  FROM seq s JOIN users u ON u.id = s.surveyor_id
 WHERE s.prev_at IS NOT NULL
   AND s.captured_at - s.prev_at >= interval '2 minutes'
   AND ST_Distance(s.prev_g, s.g) / 1000 / (extract(epoch FROM s.captured_at - s.prev_at) / 3600.0) > 120
 ORDER BY km_per_h DESC;
```

**Interpretation:** Jumping tens of kilometres in minutes means at least one location or one timestamp is fake. This rule
links the GPS checks with the timestamp checks.

### G8 — Unnatural accuracy patterns per enumerator  (Severity: MEDIUM)

Real fixes vary (for example 4.7, 12.3, 18.0 m). Mock providers often report `0`, a fixed value such as `1`, `3`, or `5`, or whole numbers.

```sql
WITH acc AS (
  SELECT r.surveyor_id, a.accuracy_m FROM survey_attachments a
    JOIN survey_responses r ON r.id = a.response_id WHERE a.photo_type IS NOT NULL
  UNION ALL
  SELECT surveyor_id, gps_accuracy_m FROM survey_responses WHERE gps_accuracy_m IS NOT NULL
), stats AS (
  SELECT surveyor_id,
         count(*)                                               AS fixes,
         count(DISTINCT accuracy_m)                             AS distinct_values,
         count(*) FILTER (WHERE accuracy_m = 0)                 AS zero_accuracy,
         count(*) FILTER (WHERE accuracy_m = trunc(accuracy_m)) AS whole_number,
         mode() WITHIN GROUP (ORDER BY accuracy_m)              AS most_common_value
    FROM acc GROUP BY surveyor_id
)
SELECT u.username, s.*,
       round(100.0 * s.whole_number / s.fixes, 1)  AS whole_number_pct,
       round(100.0 * (SELECT count(*) FROM acc x WHERE x.surveyor_id = s.surveyor_id AND x.accuracy_m = s.most_common_value)
             / s.fixes, 1)                          AS most_common_pct
  FROM stats s JOIN users u ON u.id = s.surveyor_id
 WHERE s.fixes >= 5
 ORDER BY most_common_pct DESC, zero_accuracy DESC;
```

**Interpretation:** Investigate if `most_common_pct` is above about 50%, if `zero_accuracy` is greater than 0, or if `whole_number_pct` is near 100%.
Columns are `numeric(8,2)`. Some browsers round accuracy, so compare enumerators rather than using an absolute rule.

### G9 — Low-precision ("typed in") coordinates  (Severity: MEDIUM)

```sql
SELECT 'response' AS source, r.id, u.username, r.gps_lat AS lat, r.gps_lng AS lng
  FROM survey_responses r JOIN users u ON u.id = r.surveyor_id
 WHERE r.gps_lat IS NOT NULL
   AND r.gps_lat = round(r.gps_lat, 4) AND r.gps_lng = round(r.gps_lng, 4)
UNION ALL
SELECT 'photo:' || a.photo_type, a.id, u.username, a.latitude, a.longitude
  FROM survey_attachments a JOIN users u ON u.id = a.uploaded_by
 WHERE a.photo_type IS NOT NULL
   AND a.latitude = round(a.latitude, 4) AND a.longitude = round(a.longitude, 4);
```

**Interpretation:** About 1 in 10,000 real fixes would match by chance. Mock apps where the user drops a pin or types
coordinates often produce 4 decimals or fewer.

### G10 — Missing or weak unit GPS  (Severity: LOW)

```sql
SELECT r.id AS response_id, u.username, r.gps_lat, r.gps_lng, r.gps_accuracy_m
  FROM survey_responses r JOIN users u ON u.id = r.surveyor_id
 WHERE r.gps_lat IS NULL OR r.gps_lng IS NULL
    OR r.gps_accuracy_m IS NULL OR r.gps_accuracy_m > 250
 ORDER BY u.username;
```

---

## 4. Combined enumerator risk scorecard (GPS + time)

```sql
WITH flags AS (
  -- G3 photo far from unit
  SELECT r.surveyor_id, 'G3' AS rule FROM survey_attachments a JOIN survey_responses r ON r.id = a.response_id
   WHERE a.photo_type IS NOT NULL AND r.gps_lat IS NOT NULL
     AND ST_Distance(ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
                     ST_SetSRID(ST_MakePoint(r.gps_lng, r.gps_lat), 4326)::geography) > 250
  UNION ALL
  -- G9 low precision
  SELECT r.surveyor_id, 'G9' FROM survey_responses r
   WHERE r.gps_lat IS NOT NULL AND r.gps_lat = round(r.gps_lat, 4) AND r.gps_lng = round(r.gps_lng, 4)
  UNION ALL
  -- T1 future device time
  SELECT r.surveyor_id, 'T1' FROM survey_responses r
   WHERE r.synced_at IS NOT NULL AND r.submitted_at > r.synced_at + interval '5 minutes'
  UNION ALL
  -- T4 photo outside survey window
  SELECT r.surveyor_id, 'T4' FROM survey_attachments a JOIN survey_responses r ON r.id = a.response_id
   WHERE a.photo_type IS NOT NULL
     AND (a.captured_at < r.started_at - interval '60 minutes' OR a.captured_at > r.submitted_at + interval '15 minutes')
  UNION ALL
  -- T3 too-short interview
  SELECT r.surveyor_id, 'T3' FROM survey_responses r
   WHERE r.started_at <= r.submitted_at AND r.submitted_at - r.started_at < interval '10 minutes'
), totals AS (
  SELECT surveyor_id, count(*) AS responses FROM survey_responses GROUP BY surveyor_id
)
SELECT u.username, t.responses,
       count(f.rule)                                   AS total_flags,
       count(*) FILTER (WHERE f.rule = 'G3')           AS g3,
       count(*) FILTER (WHERE f.rule = 'G9')           AS g9,
       count(*) FILTER (WHERE f.rule = 'T1')           AS t1,
       count(*) FILTER (WHERE f.rule = 'T3')           AS t3,
       count(*) FILTER (WHERE f.rule = 'T4')           AS t4,
       round(100.0 * count(f.rule) / t.responses, 1)   AS flags_per_100_responses
  FROM totals t
  JOIN users u ON u.id = t.surveyor_id
  LEFT JOIN flags f ON f.surveyor_id = t.surveyor_id
 GROUP BY u.username, t.responses
 ORDER BY flags_per_100_responses DESC;
```

Use this to prioritise field back-checks; it is **not** proof of fraud on its own.

## 5. Evidence gaps (fix in the workplan)

1. No mock-location / developer-mode signal (browser limitation) → Strategy C, Workplan Phase 8.
2. Single GPS sample per capture: no jitter, altitude, speed, or heading to compare with real GNSS behaviour → Phase 5.
3. Unit GPS (`A_LOCATION_GPS`) has no fix timestamp, so it cannot be tied to the interview window → Phase 5.
4. Results are not stored; reviewers cannot mark a finding as cleared/confirmed → Phase 2 (`integrity_flags`).
5. District/tehsil `geom` may be empty in some environments; G2 then returns nothing → Phase 0 (load boundaries).

## 6. Results log (fill per run)

| Run date | Database | Run by | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G8 enumerators | G9 | G10 | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-24 | local `punjab_industrial_survey` (2 surveys, 0 photos) | hashimz | 0 | 0 (inactive: no polygons) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | Local baseline. G3, G4, G7 had no photos to check. |
| 2026-11-24 | local `punjab_stress_test` (synthetic load data) | hashimz | 2 | 0 (inactive: no polygons) | 48 | 0 | 13 | 12 | 2 | 1 | 4592 | 3 | Not field data; see notes. |

**Run notes (2026-11-24)**

- The local `punjab_industrial_survey` holds only 2 surveys (`admin` and `surveyor1`, 12 Oct 2026) and 0 photos, so G3, G4 and G7 had nothing to check. None of the 36 districts or 130 tehsils has boundary polygons, so G2 could not run. Load the polygons first (workplan Phase 0).
- G10 on the local database: both surveys have no unit GPS (latitude, longitude and accuracy are all empty). The server accepts a survey with no unit location, so this is a gap, not evidence of faking. Whether a missing location should be blocked or flagged needs an owner decision.
- `punjab_stress_test` is a throwaway copy filled by our load-test scripts (1,533 surveys, 3,062 photos, 3 accounts), so its counts are synthetic and are not findings. They only show that the queries run at scale. G9 (4,592 rows) matches nearly every record, probably because the scripts wrote coordinates with few decimals. The 2 rows for G1 were not investigated.
- All statements ran without errors on both databases. Repeat the run on a Neon branch before treating any numbers as real field data.