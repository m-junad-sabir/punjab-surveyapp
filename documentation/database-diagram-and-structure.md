# Database Diagram & Structure — Punjab Industrial Survey

**Database:** `punjab_industrial_survey`  
**Engine:** PostgreSQL 14+ with PostGIS 3+  
**Extensions:** `uuid-ossp`, `pgcrypto`, `postgis`

---

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTH & ACCESS CONTROL                           │
│                                                                         │
│  roles ──────────────── role_permissions ──────── permissions          │
│    │                                                                     │
│    └──────────────────── users                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       ADMINISTRATIVE GEOGRAPHY                          │
│                                                                         │
│  provinces → divisions → districts → tehsils                           │
│                                ↓                                        │
│                       industrial_estates                                │
│                                                                         │
│  sectors (self-referencing hierarchy: parent_sector_id)                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    QUESTIONNAIRE DEFINITION                             │
│                                                                         │
│  survey_forms                                                           │
│      └── survey_sections (sort_order)                                  │
│              └── survey_questions (sort_order)                         │
│                      └── survey_question_logic (skip rules)            │
│                                                                         │
│  system_settings (key/value config: GPS accuracy, duplicate radius)    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       RESPONSE & UNIT STORAGE                          │
│                                                                         │
│  industrial_units  ←──────── survey_responses ──────── survey_answers  │
│        ↓                           ↓                                   │
│  unit_approval_log          duplicate_flags                             │
│                                    ↓                                   │
│                               sync_log                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Table Reference

### 1. AUTH & USER MANAGEMENT

#### `roles`
| Column | Type | Notes |
|---|---|---|
| role_id | INTEGER PK | 1=Surveyor, 2=Supervisor, 3=DB Admin |
| role_name | VARCHAR(50) UNIQUE | |
| description | TEXT | |

#### `permissions`
| Column | Type | Notes |
|---|---|---|
| permission_id | INTEGER PK | |
| permission_code | VARCHAR(100) UNIQUE | UNIT_CREATE, UNIT_APPROVE, SURVEY_SUBMIT, USER_MANAGE |
| description | TEXT | |

#### `role_permissions`
| Column | Type | Notes |
|---|---|---|
| role_id | INTEGER FK → roles | Composite PK |
| permission_id | INTEGER FK → permissions | Composite PK |

**Permission matrix:**
```
Role          UNIT_CREATE   UNIT_APPROVE   SURVEY_SUBMIT   USER_MANAGE
─────────────────────────────────────────────────────────────────────────
Surveyor          ✓                            ✓
Supervisor        ✓              ✓             ✓
DB Admin          ✓              ✓             ✓               ✓
```

#### `users`
| Column | Type | Notes |
|---|---|---|
| user_id | UUID PK | uuid_generate_v4() |
| username | VARCHAR(60) UNIQUE | |
| full_name | VARCHAR(150) | |
| email | VARCHAR(150) UNIQUE | nullable |
| phone | VARCHAR(20) | nullable |
| password_hash | TEXT | bcrypt, salt=10 |
| role_id | INTEGER FK → roles | |
| is_active | BOOLEAN | default TRUE |
| last_login_at | TIMESTAMPTZ | updated on login |

**Seeded accounts:**
```
username      password        role
surveyor1     surveyor123     Surveyor
supervisor1   supervisor123   Supervisor
admin         admin123        DB Admin
```

---

### 2. ADMINISTRATIVE GEOGRAPHY

All geography tables carry a `geom geometry(MultiPolygon, 4326)` column for PostGIS spatial queries.

```
provinces (1)
    └── divisions (1)
            └── districts (1)
                    ├── tehsils (2: Lahore City, Shalimar)
                    └── industrial_estates (1: Sundar Industrial Estate)

sectors (15 seeded, self-referencing)
    ├── Textile and Apparel
    │       ├── Spinning and Weaving
    │       └── Garments and Ready-made
    ├── Leather and Footwear
    │       └── Tanning and Processing
    ├── Chemical and Allied
    │       └── Pharmaceuticals
    ├── Food and Beverages
    ├── Engineering and Metals
    ├── Printing and Packaging
    ├── Wood and Furniture
    ├── Plastics and Rubber
    ├── Construction Materials
    ├── Electronics and Electrical
    └── Other Manufacturing
```

---

### 3. QUESTIONNAIRE DEFINITION

#### `survey_forms`
| Column | Type | Notes |
|---|---|---|
| form_id | INTEGER PK | |
| title | VARCHAR(150) | |
| version | VARCHAR(20) | current: "2.0" |
| description | TEXT | |
| is_active | BOOLEAN | only one active at a time |

#### `survey_sections`
| Column | Type | Notes |
|---|---|---|
| section_id | INTEGER PK | 1–11 |
| form_id | INTEGER FK → survey_forms | |
| title | VARCHAR(150) | "Section A: Establishment Identity" etc. |
| sort_order | INTEGER | display order |

**11 sections:**
```
ID   Title                                    Questions
─────────────────────────────────────────────────────────
 1   Section A: Establishment Identity            27
 2   Section B: Operational Details               6
 3   Section C: Core and Secondary Activities     25
 4   Section D: Workforce                         19
 5   Section E: Backward Linkages                 34
 6   Section F: Forward Linkages                  47
 7   Section G: Technology and Production         50
 8   Section H: Energy and Waste Management       33
 9   Section I: Certifications and Compliances    16
10   Section J: Strategic Business Plan           19
11   Section K: Future Collaborations & Barriers  20
                                          TOTAL: 296
```

#### `survey_questions`
| Column | Type | Notes |
|---|---|---|
| question_id | INTEGER PK | 1–296 |
| section_id | INTEGER FK → survey_sections | |
| question_code | VARCHAR(30) | HDR.GPS, A.1, B.3a, K.4 etc. |
| question_text | TEXT | display label |
| question_type | VARCHAR(20) | see types below |
| is_mandatory | BOOLEAN | drives completeness score |
| validation_rule | JSONB | `{"min":0,"max":100}` or `{"regex":"..."}` |
| options | JSONB | string array for select/multiselect |
| sort_order | INTEGER | display order within section |

**Question types:**
```
text          → plain text input
number        → numeric input with optional min/max validation
date          → date picker
select        → single-choice dropdown
multiselect   → multi-checkbox list
boolean       → Yes/No toggle
gps           → GPS coordinate capture (lat/lng/accuracy)
photo         → camera capture / file upload
```

**Special question IDs (hardcoded in app logic):**
```
question_id=1   HDR.GPS   GPS location — feeds duplicate detection
question_id=4   A.1       Name of Establishment — feeds unit_name
question_id=19  A.9       Ownership — feeds ownership_type
```

#### `survey_question_logic`
Skip/show rules evaluated client-side.

| Column | Type | Notes |
|---|---|---|
| logic_id | INTEGER PK | |
| question_id | INTEGER FK | the question being shown/hidden |
| condition_question_id | INTEGER FK | the trigger question |
| condition_operator | VARCHAR(10) | `=` `!=` `>` `<` `>=` `<=` `in` |
| condition_value | TEXT | value to compare against |
| action | VARCHAR(15) | `show` or `hide` |

**29 rules seeded.** Key examples:
```
Show A.8x (specify)     if A.8  = "Other"
Show A.10x (specify)    if A.10 = "Others"
Show B.1s (period)      if B.1  = "Seasonal"
Show B.2  (closure)     if B.1  = "Temporarily Closed" OR "Permanently Closed"
Show G.4  (reasons)     if G.3  = "40-59%" OR "60-74%"
Show H.7ad (disposal)   if H.7a = true  (scrap generated)
Show E.6r (reasons)     if E.6  = true  (disruption occurred)
Show J.6-J.7 (planning) if J.5 != "No expansion plans currently"
```

---

### 4. RESPONSE & UNIT STORAGE

#### `industrial_units`
Auto-created by sync service when a new unique survey is submitted.

| Column | Type | Notes |
|---|---|---|
| unit_id | UUID PK | uuid_generate_v4() |
| unit_code | VARCHAR(30) UNIQUE | Format: `PK-PB-LHR-XXXXX` |
| unit_name | VARCHAR(200) | From answer question_id=4 |
| sector_id | INTEGER | FK → sectors |
| province_id / division_id / district_id / tehsil_id | INTEGER | FK → geography |
| ownership_type | VARCHAR(30) | From answer question_id=19 |
| employment_size | INTEGER | |
| operational_status | VARCHAR(20) | Default: `Unverified` → `Active` after approval |
| geom | geometry(Point, 4326) | PostGIS point from GPS answer |
| gps_accuracy_m | NUMERIC(6,2) | |
| is_verified | BOOLEAN | Default FALSE; TRUE after supervisor approval |
| verified_by | VARCHAR(150) | Supervisor name |
| verified_at | TIMESTAMPTZ | |
| created_by | UUID | surveyor user_id |

#### `survey_responses`
One row per survey submission.

| Column | Type | Notes |
|---|---|---|
| response_id | UUID PK | **Client-generated** (enables idempotent sync) |
| form_id | INTEGER FK | |
| unit_id | UUID FK → industrial_units | nullable, linked at sync time |
| surveyor_id | UUID | |
| device_id | VARCHAR(100) | Format: `DEV-XXXXXXXX` |
| gps_lat / gps_lng | NUMERIC(9,6) | From GPS answer |
| gps_accuracy_m | NUMERIC(6,2) | |
| started_at / submitted_at | TIMESTAMPTZ | |
| sync_status | VARCHAR(15) | `draft` → `pending_sync` → `synced` / `rejected` |
| is_offline_capture | BOOLEAN | Always TRUE from field app |
| completeness_score | NUMERIC(5,2) | 0–100, mandatory answered / total mandatory |
| is_duplicate | BOOLEAN | Set by duplicate detection |

#### `survey_answers`
One row per question per response.

| Column | Type | Notes |
|---|---|---|
| answer_id | BIGSERIAL PK | |
| response_id | UUID FK → survey_responses | |
| question_id | INTEGER FK → survey_questions | |
| answer_value | JSONB | Any type: string, number, array, `{lat,lng,accuracy}` |
| answered_at | TIMESTAMPTZ | |

#### `duplicate_flags`
Created when two surveys are within 50m and name similarity > 60%.

| Column | Type | Notes |
|---|---|---|
| flag_id | BIGSERIAL PK | |
| response_id | UUID FK | the new (duplicate) response |
| matched_unit_id | UUID FK | the existing unit it matched |
| match_reason | TEXT | distance + similarity score description |
| is_resolved | BOOLEAN | resolved by supervisor |
| resolved_by / resolved_at | UUID / TIMESTAMPTZ | |

#### `sync_log`
Audit trail of every sync operation.

| Column | Type | Notes |
|---|---|---|
| sync_id | BIGSERIAL PK | |
| device_id | VARCHAR(100) | |
| user_id | UUID FK → users | |
| sync_started_at | TIMESTAMPTZ | |
| sync_completed_at | TIMESTAMPTZ | |
| records_pushed | INTEGER | successful records in batch |
| status | VARCHAR(20) | `success` / `partial` / `failed` |

---

## Duplicate Detection Logic

```
For each incoming response:
  1. Find all industrial_units within 50 metres (PostGIS ST_DWithin on geography)
  2. For each nearby unit, compute Levenshtein string similarity:
       similarity = 1 - (edit_distance / max_length)
  3. If similarity > 0.60 → mark as duplicate
     → response.sync_status = 'pending_sync' (held for supervisor review)
     → duplicate_flags row created with distance + similarity in match_reason
  4. If NOT duplicate → create new industrial_unit, response.sync_status = 'synced'
```

---

## Key Indexes

```sql
-- Spatial
CREATE INDEX idx_industrial_units_geom    ON industrial_units    USING GIST (geom);
CREATE INDEX idx_survey_submissions_geom  ON survey_submissions  USING GIST (geom);

-- Query performance
CREATE INDEX idx_survey_submissions_sync  ON survey_submissions  (sync_status);
CREATE INDEX idx_sec_a_assoc_survey       ON section_a_associated_establishments (survey_id);
CREATE INDEX idx_sec_c_products_survey    ON section_c_products  (survey_id);
CREATE INDEX idx_sec_e_raw_materials_survey ON section_e_raw_materials (survey_id);
CREATE INDEX idx_sec_f_sales_survey       ON section_f_product_sales (survey_id);
CREATE INDEX idx_sec_g_machines_survey    ON section_g_critical_machines (survey_id);
CREATE INDEX idx_sec_g_boilers_survey     ON section_g_boilers_pressure_vessels (survey_id);
CREATE INDEX idx_sec_g_weights_survey     ON section_g_weights_measures (survey_id);
```

---

## SQL Files

| File | Purpose |
|---|---|
| `database/create_tables.sql` | Creates all tables, indexes, and extensions |
| `database/seed.sql` | Inserts roles, users, geography, form, 296 questions, 29 logic rules |
| `database/schema.sql` | Extended section tables (A–K) for future detailed storage |
| `database/update_schema_to_new_design.sql` | Migration script |
| `database/update_credentials.sql` | Update user passwords |

**Run order:**
```powershell
psql -U postgres -d punjab_industrial_survey -f database/create_tables.sql
psql -U postgres -d punjab_industrial_survey -f database/seed.sql
```
