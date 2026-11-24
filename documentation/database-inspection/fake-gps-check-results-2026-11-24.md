# GPS checks G1 to G10: what each does and what it returned

Date: 2026-11-24. Each query of [fake-gps-inspection.md](./fake-gps-inspection.md) was run on its own. Every query is a read-only SELECT.

Two databases were used, so repeat the run there before treating any number as real field data.

- Local: local database (2 real surveys, 0 photos)
- Stress (synthetic): stress database (synthetic load data, not field findings)

Output is cut to the first 12 rows. The row count under each result is the full count.

| Check | Severity | Local rows | Stress (synthetic) rows |
|---|---|---|---|
| G1 | HIGH | 0 | 2 |
| G2 | HIGH | 0 / 2 | 0 / 2 |
| G3 | HIGH | 0 | 48 |
| G4 | MEDIUM | 0 | 0 |
| G5 | HIGH | 0 | 13 |
| G6 | HIGH | 0 | 12 |
| G7 | HIGH | 0 | 2 |
| G8 | MEDIUM | 0 | 1 |
| G9 | MEDIUM | 0 | 4592 |
| G10 | LOW | 2 | 3 |

## G1 — Outside Punjab envelope or at "null island"

**Severity:** HIGH

**What it does:** Lists surveys and photos whose coordinates are outside the Punjab bounding box or exactly at 0,0.

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 source | record_id | username | lat | lng | accuracy_m 
--------+-----------+----------+-----+-----+------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 2 row(s)

```text
  source  |              record_id               |     username     |    lat     |    lng    | accuracy_m 
----------+--------------------------------------+------------------+------------+-----------+------------
 response | 65bf1136-2cb4-4a1f-96f7-14a07654d9c8 | stress-test-user | 999.000000 | 70.000000 |      12.00
 response | 1b0991fa-20c3-497e-87ee-5182677a42ef | stress-test-user | 999.000000 | 70.000000 |      12.00
(2 rows)
```

## G2 — Unit location not inside its declared district / tehsil

**Severity:** HIGH

**What it does:** Finds units whose recorded location is not inside their declared district or tehsil polygon. The second query counts how many districts and tehsils have polygons loaded; without polygons the first query cannot return anything.

**From the report:**

> Runs only where boundary polygons are loaded (`geom IS NOT NULL`).
>
> **Interpretation:** A unit claimed in district X but located in district Y means the location was faked, the enumerator
>
> chose the wrong district, or the unit sits near a boundary. Check `metres_from_district`: a few hundred metres is usually a
>
> boundary/accuracy issue, while kilometres need investigation.
>

**Result on the local database (2 real surveys, 0 photos) (query 1 of 2):** 0 row(s)

```text
 unit_id | name | district_name | tehsil_name | lat | lng | outside_district | outside_tehsil | metres_from_district 
---------+------+---------------+-------------+-----+-----+------------------+----------------+----------------------
(0 rows)
```

**Result on the local database (2 real surveys, 0 photos) (query 2 of 2):** 2 row(s)

```text
   level   | with_geom | total 
-----------+-----------+-------
 districts |         0 |    36
 tehsils   |         0 |   130
(2 rows)
```

**Result on the stress database (synthetic load data, not field findings) (query 1 of 2):** 0 row(s)

```text
 unit_id | name | district_name | tehsil_name | lat | lng | outside_district | outside_tehsil | metres_from_district 
---------+------+---------------+-------------+-----+-----+------------------+----------------+----------------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings) (query 2 of 2):** 2 row(s)

```text
   level   | with_geom | total 
-----------+-----------+-------
 districts |         0 |    36
 tehsils   |         0 |   130
(2 rows)
```

## G3 — Photo taken far from the unit location

**Severity:** HIGH

**What it does:** Lists photos taken more than 250 m from the unit location recorded in the same survey.

**From the report:**

> **Interpretation:** Both values are captured at the premises. A large gap means one of them was spoofed or captured elsewhere (for example, the unit GPS was captured at the office).
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 attachment_id | response_id | photo_type | username | distance_m | photo_accuracy_m | unit_accuracy_m 
---------------+-------------+------------+----------+------------+------------------+-----------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 48 row(s)

```text
            attachment_id             |             response_id              |         photo_type         |     username     | distance_m | photo_accuracy_m | unit_accuracy_m 
--------------------------------------+--------------------------------------+----------------------------+------------------+------------+------------------+-----------------
 6fdfb6ca-501e-4e63-8063-57df330558e4 | 65bf1136-2cb4-4a1f-96f7-14a07654d9c8 | L_PHOTO_ENTRANCE_SIGNBOARD | stress-test-user |   12485818 |            12.00 |           12.00
 d67d9cb7-d647-44d3-bbac-32fcdba62683 | 65bf1136-2cb4-4a1f-96f7-14a07654d9c8 | L_PHOTO_INTERVIEW_SESSION  | stress-test-user |   12485818 |            12.00 |           12.00
 a8e2fb93-ace5-420d-967e-f4201d31c7f3 | 1b0991fa-20c3-497e-87ee-5182677a42ef | L_PHOTO_ENTRANCE_SIGNBOARD | stress-test-user |   12485818 |            12.00 |           12.00
 62781c8c-1824-42b7-af82-56b9079be95f | 1b0991fa-20c3-497e-87ee-5182677a42ef | L_PHOTO_INTERVIEW_SESSION  | stress-test-user |   12485818 |            12.00 |           12.00
 9f3e30ab-e3c2-424c-a5f5-4d233f3e43a5 | 376bb4af-147e-49f1-beeb-c612680f7426 | L_PHOTO_ENTRANCE_SIGNBOARD | stress-test-user |     568673 |            12.00 |           12.00
 f0dda94e-d3de-4328-829f-9abd7ff0961d | 4b2cfae0-7d5f-4332-aca7-0cf42e548732 | L_PHOTO_ENTRANCE_SIGNBOARD | stress-test-user |     568673 |            12.00 |           12.00
 0506b346-bc9e-45f8-950d-3dd43b861f13 | 4b2cfae0-7d5f-4332-aca7-0cf42e548732 | L_PHOTO_INTERVIEW_SESSION  | stress-test-user |     568673 |            12.00 |           12.00
 2dddc84a-9b1c-4486-8508-33334bebdfbb | 376bb4af-147e-49f1-beeb-c612680f7426 | L_PHOTO_INTERVIEW_SESSION  | stress-test-user |     568673 |            12.00 |           12.00
 ae95e2ba-4a1e-4ae5-910c-1cb5ec2cfd96 | 3fe22637-0814-4ce7-b46e-b0b87e47938f | L_PHOTO_ENTRANCE_SIGNBOARD | stress-test-user |     568519 |            12.00 |           12.00
 f559fe8f-16ca-4a2d-a9b5-0b9599d81e1f | 3fe22637-0814-4ce7-b46e-b0b87e47938f | L_PHOTO_INTERVIEW_SESSION  | stress-test-user |     568519 |            12.00 |           12.00
 8ebfc780-5b0d-4602-ada8-b64814e1c561 | f99ccc95-7170-4063-93c5-650cf644843c | L_PHOTO_INTERVIEW_SESSION  | stress-test-user |     568519 |            12.00 |           12.00
 a23d7865-8730-4f6a-a52b-48db85332b32 | f99ccc95-7170-4063-93c5-650cf644843c | L_PHOTO_ENTRANCE_SIGNBOARD | stress-test-user |     568519 |            12.00 |           12.00
... 36 more rows not shown
(48 rows)
```

## G4 — Interview and signboard photos far apart

**Severity:** MEDIUM

**What it does:** Lists surveys whose interview photo and signboard photo were taken more than 150 m apart.

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 response_id | username | distance_m 
-------------+----------+------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 0 row(s)

```text
 response_id | username | distance_m 
-------------+----------+------------
(0 rows)
```

## G5 — Identical coordinates reused across different responses

**Severity:** HIGH

**What it does:** Finds identical coordinates reused across different surveys, which a saved fake location would produce.

**From the report:**

> Real GPS fixes almost never repeat to 6 decimals (about 0.1 m) at different visits. Mock apps that use a saved
>
> "favourite" location repeat the exact point.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 lat | lng | responses | enumerators | kinds 
-----+-----+-----------+-------------+-------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 13 row(s)

```text
    lat     |    lng    | responses |    enumerators     |  kinds  
------------+-----------+-----------+--------------------+---------
  31.500000 | 74.300000 |        24 | {stress-test-user} | {photo}
  28.002000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.004000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.006000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.008000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.010000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.012000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.016000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.018000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.034000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.036000 | 70.000000 |         2 | {stress-test-user} | {unit}
  28.000000 | 70.000000 |         2 | {stress-test-user} | {unit}
... 1 more rows not shown
(13 rows)
```

## G6 — Many different units surveyed from the same spot

**Severity:** HIGH

**What it does:** Finds pairs of different units that one enumerator recorded within 30 m of each other (possible desk surveys).

**From the report:**

> Catches "desk surveys", where many units are recorded from one location, even when coordinates are slightly jittered.
>
> **Interpretation:** This is legitimate inside multi-unit buildings or small industrial estates. Compare with
>
> `industrial_estate_id` and photos before concluding. Many hits for one enumerator spread over many days is a strong
>
> signal.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 surveyor_id | username | response_a | response_b | unit_a | unit_b | distance_m 
-------------+----------+------------+------------+--------+--------+------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 12 row(s)

```text
             surveyor_id              |     username     |              response_a              |              response_b              |                unit_a                |                unit_b                | distance_m 
--------------------------------------+------------------+--------------------------------------+--------------------------------------+--------------------------------------+--------------------------------------+------------
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 376bb4af-147e-49f1-beeb-c612680f7426 | 4b2cfae0-7d5f-4332-aca7-0cf42e548732 | af5a2c16-0e40-4de2-b7d1-caca2882798b | 1d7a4ccc-53ad-40b3-86de-75fe2e07b85d |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 03ca9f22-892d-45c4-aa74-df93cde6c44e | 0b919625-70f1-4940-b407-333c625f59c3 | bfed2550-cdd2-4f78-bd51-ba1c288bb819 | 34aa7bc9-f2e8-4f62-8906-58ee8a6843df |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 1f7775f3-de24-4315-95cd-0c89c33e6ecc | fdeb580a-62d9-4f33-909c-98bb6d06639f | 36fc8351-0804-455e-8d70-b3af5f124793 | 1d1c3600-7c98-4dfb-be7a-0677a2f6937e |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 1ea4b0a3-fc31-45ea-974e-5a1229779f0f | 57fdd8f5-9c33-4cd3-b774-39a964924254 | b12fd6cf-7656-41ca-815d-04f41039127a | dc180477-00df-43fb-980f-32da22f1e376 |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 3fe22637-0814-4ce7-b46e-b0b87e47938f | f99ccc95-7170-4063-93c5-650cf644843c | d09e19fb-92bb-48a3-9695-0e0cdf21ba04 | ee138009-adad-434a-98f2-c55e0a0ad54b |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | d2f4fe35-cbee-466a-9638-5586fe380a2f | fc92d38e-a11b-4451-a2a0-61099478885b | 07b64f6a-72ed-47ec-bd4c-481e9aa7a5a7 | bc5dc4e0-607a-4db7-a37b-36d18b11e7a9 |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 8c0826b3-ed75-432e-a92b-688f5fd0de40 | 9f9603a2-8d05-4433-a2e8-bca24fd44204 | c315c7ac-a9f7-4340-bde6-204ed21b2b34 | 18ec11aa-4273-4a3e-9247-5a2347979ef9 |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 3ca2b5f6-727b-4e2a-880a-aa849f030d8d | 80776b68-3e8b-47e0-889d-415c8cab6a5a | 2235789b-f219-4cdb-8681-80d113f6ca78 | 658ab22a-e382-4ca0-ba70-b8568dd835a7 |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 0740ce6a-e749-41f1-aa1b-4b6ba219c21c | c3c5e24f-ff3c-4f28-b8e9-4ced55319cd7 | 38b836cf-1404-4ca2-aabf-4ec77b39a772 | 91b6032a-b801-4322-a885-7e07f4f2551a |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 1b0991fa-20c3-497e-87ee-5182677a42ef | 65bf1136-2cb4-4a1f-96f7-14a07654d9c8 | 8d15ee19-5ab7-4ca4-b77f-2f1f313ebb3b | 038a650b-a8a7-49ef-a0e5-494556d56e81 |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 1e110dc6-6bf5-4ec6-894c-7d96078a3e9f | b598dca5-9321-44bb-b55d-6b92d23b7136 | 62ffb123-6d57-48b0-970e-58463c4c6416 | 65d4b2e5-4660-4d3d-9a83-e1369cbcc01a |        0.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | b1bb91ab-8173-48a2-8710-772ec28fc2f0 | de105cf3-8946-4bf0-a437-98b3f94415cc | 33ef55df-ea27-4076-955c-aefa772b394b | 77b95a93-dc24-42b4-90fe-67e5341ede18 |        0.0
(12 rows)
```

## G7 — Impossible travel speed between consecutive captures

**Severity:** HIGH

**What it does:** Finds an enumerator moving faster than 120 km/h between two consecutive photo captures at least 2 minutes apart.

**From the report:**

> **Interpretation:** Jumping tens of kilometres in minutes means at least one location or one timestamp is fake. This rule
>
> links the GPS checks with the timestamp checks.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 surveyor_id | username | prev_response | response_id | prev_at | captured_at | km | km_per_h 
-------------+----------+---------------+-------------+---------+-------------+----+----------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 2 row(s)

```text
             surveyor_id              |     username     |            prev_response             |             response_id              |          prev_at           |        captured_at         |  km   | km_per_h 
--------------------------------------+------------------+--------------------------------------+--------------------------------------+----------------------------+----------------------------+-------+----------
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | 6d1e984e-a5e0-40b1-9d75-c0e6ce7a4125 | 4620f876-c968-465b-b4b5-5d22213ea908 | 2026-11-17 15:16:37.043+05 | 2026-11-17 15:18:59.423+05 | 15.74 |    398.0
 2c3502d1-e4df-4187-9901-fee3a558f3df | stress-test-user | c401219b-82c1-41ac-8973-445abec6e1b6 | 6d1e984e-a5e0-40b1-9d75-c0e6ce7a4125 | 2026-11-17 15:12:19.331+05 | 2026-11-17 15:16:37.043+05 | 26.83 |    374.8
(2 rows)
```

## G8 — Unnatural accuracy patterns per enumerator

**Severity:** MEDIUM

**What it does:** Summarises the GPS accuracy values of each enumerator (zeros, whole numbers, one repeated value), for enumerators with at least 5 fixes.

**From the report:**

> Real fixes vary (for example 4.7, 12.3, 18.0 m). Mock providers often report `0`, a fixed value such as `1`, `3`, or `5`, or whole numbers.
>
> **Interpretation:** Investigate if `most_common_pct` is above about 50%, if `zero_accuracy` is greater than 0, or if `whole_number_pct` is near 100%.
>
> Columns are `numeric(8,2)`. Some browsers round accuracy, so compare enumerators rather than using an absolute rule.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 username | surveyor_id | fixes | distinct_values | zero_accuracy | whole_number | most_common_value | whole_number_pct | most_common_pct 
----------+-------------+-------+-----------------+---------------+--------------+-------------------+------------------+-----------------
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 1 row(s)

```text
     username     |             surveyor_id              | fixes | distinct_values | zero_accuracy | whole_number | most_common_value | whole_number_pct | most_common_pct 
------------------+--------------------------------------+-------+-----------------+---------------+--------------+-------------------+------------------+-----------------
 stress-test-user | 2c3502d1-e4df-4187-9901-fee3a558f3df |  4592 |               1 |             0 |         4592 |             12.00 |            100.0 |           100.0
(1 row)
```

## G9 — Low-precision ("typed in") coordinates

**Severity:** MEDIUM

**What it does:** Lists coordinates with 4 decimals or fewer, which looks like a typed-in or dropped-pin location.

**From the report:**

> **Interpretation:** About 1 in 10,000 real fixes would match by chance. Mock apps where the user drops a pin or types
>
> coordinates often produce 4 decimals or fewer.
>

**Result on the local database (2 real surveys, 0 photos):** 0 row(s)

```text
 source | id | username | lat | lng 
--------+----+----------+-----+-----
(0 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 4592 row(s)

```text
              source              |                  id                  |     username     |    lat     |    lng    
----------------------------------+--------------------------------------+------------------+------------+-----------
 response                         | 408b3567-7819-45bd-8839-47dd9f350676 | stress-test-user |  31.201000 | 74.000000
 response                         | 497ae682-4b3e-465e-9644-626bb2a8adb6 | stress-test-user |  31.202000 | 74.000000
 response                         | 0abff519-ae65-4ca0-9c67-c7306df542e9 | stress-test-user |  31.203000 | 74.000000
 response                         | e285e554-8663-4d9b-bd68-5e95650403c3 | stress-test-user |  31.204000 | 74.000000
 response                         | 8782d63a-c108-46a2-bd24-4ae323d0ddac | stress-test-user |  31.205000 | 74.000000
 response                         | 26c2a202-82e0-4b8c-8a72-9016c1660f2d | stress-test-user |  31.206000 | 74.000000
 response                         | c4a44352-adb6-4911-9019-af9705720080 | stress-test-user |  31.207000 | 74.000000
 response                         | ca1d6418-8535-44e3-99e5-906c32c29359 | stress-test-user |  31.208000 | 74.000000
 response                         | 2298904e-1d63-4714-b607-1cc66e454cd8 | stress-test-user |  31.209000 | 74.000000
 response                         | d8c3c77d-251f-40c2-98b4-7d83dce09fef | stress-test-user |  31.210000 | 74.000000
 response                         | 11ed3b0a-3f71-40b4-ad8b-5a04cd855e5c | stress-test-user |  31.211000 | 74.000000
 response                         | 201c92e2-9b18-44fe-8616-bc296f451f38 | stress-test-user |  31.212000 | 74.000000
... 4580 more rows not shown
(4592 rows)
```

## G10 — Missing or weak unit GPS

**Severity:** LOW

**What it does:** Lists surveys with missing unit coordinates, missing accuracy, or accuracy worse than 250 m.

**Result on the local database (2 real surveys, 0 photos):** 2 row(s)

```text
             response_id              | username  | gps_lat | gps_lng | gps_accuracy_m 
--------------------------------------+-----------+---------+---------+----------------
 33a2b85f-d4ed-44dc-ab85-992e7326319e | admin     |         |         |               
 2d79a8eb-b226-46dc-b476-36b7bc1cc06b | surveyor1 |         |         |               
(2 rows)
```

**Result on the stress database (synthetic load data, not field findings):** 3 row(s)

```text
             response_id              |     username     | gps_lat | gps_lng | gps_accuracy_m 
--------------------------------------+------------------+---------+---------+----------------
 33a2b85f-d4ed-44dc-ab85-992e7326319e | admin            |         |         |               
 27a74c49-9b65-4449-8327-8f1a976c32aa | stress-test-user |         |         |               
 2d79a8eb-b226-46dc-b476-36b7bc1cc06b | surveyor1        |         |         |               
(3 rows)
```

