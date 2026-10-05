
# App Design Brief

## 1. Purpose & Scope

This document explains the data architecture behind the five project workstreams defined in the original activity plan: the Mobile Survey Application (E), the Centralized Industrial Survey Database (F), the GIS Data Types (G), IT Architecture & Security (H), and the Dashboard & Visualization layer (I). It is meant to be read alongside the accompanying schema.sql file, which contains the actual, tested PostgreSQL + PostGIS data definition.

Every table in the schema is traceable back to a specific activity code from the project plan (e.g. F9, G11), so the rationale for each design decision can always be tied back to a stated requirement.

## **2. Technology Stack**

| **Layer** | **Technology** | **Why** |
| --- | --- | --- |
| Field data collection | React and Vite React (PWA) + Typescript + IndexedDB + Tailwind CSS | Runs in the Android browser, works fully offline, and syncs to the server once connectivity returns. |
| Application / API | Node.js + NestJS (REST API) + Typescript | 3 Layer architecture. DAL and BLL layers that enforces validation, RBAC, and duplicate/conflict checks before data reaches Postgres. |
| Central database | PostgreSQL with PostGIS | One relational engine holds both the tabular survey data and the spatial (GIS) data types — no second GIS-only database to keep in sync. With 3N or 4N DB Mapping. |
| GIS service | Location fetching system via PostGIS + Dashboard Mapbox/Maplibre GL JS | The survey app can use it for GPS and the dashboard for GIS data mapping. |
| Dashboard | React and Vite React + Tables, Charting and Statistics + Map View | Consumes KPI views and spatial data from the same Postgres instance, so numbers never drift from the source data. |
| App Deployment VM | AWS | Most affordable and manage traffic by app usage time |

## How offline sync works

- The React app writes every new industrial unit, survey response, and answer to IndexedDB first — the user is never blocked by a missing connection (activity E11).
- Each survey_responses row is created with a client-generated UUID, so records created offline never collide when multiple devices sync later (supports E12/E13).
- When connectivity returns, the Sync Service pushes queued records in batches, and the API returns a per-record status (synced / rejected / duplicate) that the app reflects back to the surveyor (E19).
- The Sync Service runs duplicate and completeness checks against industrial_units and survey_responses before committing, logging any conflicts to duplicate_flags for a supervisor to resolve (E14, F15).

## **5. Module-by-Module Breakdown**

Each module below maps directly to a section of the original project activity plan.

### 5.1 Identity, Roles & Access Control (covers E4, E5, F19, H6, H7)

Tables: roles, permissions, role_permissions, users.

Implements role-based access control so surveyors, supervisors, database administrators, GIS analysts, and DGI/IPAC viewers each see only what their role permits. Permissions are granular (e.g. UNIT_CREATE, UNIT_APPROVE) rather than hard-coded per role, so new roles can be added without schema changes.

### 5.2 Administrative / Geographic Reference (covers F6, G4, G5)

Tables: provinces, divisions, districts, tehsils.

A four-level administrative hierarchy, each level carrying its own PostGIS boundary geometry. Every industrial unit is tagged against all four levels directly (not just the lowest level) so district- or division-level dashboard rollups (I5) don't require repeated joins up the hierarchy at query time.

### 5.3 Sector, Estate & Cluster Reference (covers F5, F7, G6, G7)

Tables: sectors, industrial_estates, industrial_clusters.

sectors is self-referencing (parent_sector_id) to support sector/sub-sector classification. industrial_estates and industrial_clusters both carry optional polygon geometry, since estates/SEZs and clusters are areas, not points — this feeds the cluster and estate visualizations required in G6/G7 and I6.

### 5.4 Industrial Unit Master Table (covers F3, F4, F9, F10, G9, G10)

Table: industrial_units.

This is the single source of truth for "what industrial units exist." Each row carries a human-readable unique code (unit_code, e.g. PK-PB-LHR-00001 — satisfying F9), a PostGIS point geometry for its geotagged location (G9), and foreign keys into every reference table in 5.2 and 5.3 (satisfying the relationship requirements in F10). operational_status and is_verified track the record through its lifecycle from first survey capture to verified/approved status.

### 5.5 Questionnaire Definition (covers E6, E7, E8)

Tables: survey_forms, survey_sections, survey_questions, survey_question_logic.

The questionnaire itself is data, not code — a new survey round or a revised question set is a new row in survey_forms with its own version, not a redeployment of the app. validation_rule and options are stored as JSONB so field-level validation (E7) can express min/max, regex, or required-option rules without new columns. survey_question_logic implements conditional/skip logic (E8): each rule says "if question X = value Y, then show/hide/skip-to question Z."

### 5.6 Survey Responses & Data Capture (covers E9–E19, F11)

Tables: survey_responses, survey_answers, survey_attachments, response_edit_log, unit_approval_log.

- survey_responses carries the GPS capture (gps_lat/gps_lng/gps_accuracy_m — E9), the surveyor/device/timestamp trio (E17), and a sync_status flag (E19).
- survey_answers stores one row per question per response, keeping the schema stable even as questions are added or changed between form versions.
- response_edit_log gives a full before/after audit trail for every correction (E18), independent of the general audit_log used for administrative tables.
- unit_approval_log implements the approve/reject/revise workflow requirement (F16) at the unit level, separate from the response-level edit trail.

### 5.7 Offline Sync & Data Quality (covers E11–E14, F14, F15, G12)

Tables: sync_log, duplicate_flags, gis_quality_log.

sync_log gives an auditable record of every sync session per device (useful for diagnosing a surveyor's connectivity issues in the field). duplicate_flags records why two records were suspected to be the same unit (e.g. name similarity plus GPS points within 50 metres) and whether a supervisor has resolved it. gis_quality_log tracks spatial QC checks such as points falling outside their claimed administrative boundary (G12).

### 5.8 GIS Base Layers (covers G8, G16)

Table: base_map_layers.

A small registry of background map sources (satellite imagery, OSM, or a licensed basemap) so the map layer used by both the field app and the dashboard is centrally configured rather than hard-coded in the frontend.

### 5.9 Security, Audit & Backup (covers H8–H12, F17–F19)

Tables: audit_log, backup_log, system_settings.

audit_log is a generic before/after change log usable by a database trigger on any sensitive table (old_data/new_data are JSONB snapshots). backup_log records each full/incremental backup job's outcome, supporting the disaster-recovery requirement (H11/H12) with a verifiable history rather than trusting that a cron job silently succeeded.

### 5.10 Dashboard & Visualization (covers I2, I3, I9, I10)

Tables/views: dashboard_kpi_definitions, dashboard_saved_filters, and materialized views mv_units_by_sector, mv_units_by_district, mv_units_by_cluster.

KPIs are defined as data (a name plus the SQL/view that calculates it) so new indicators can be added by the database administrator without a frontend release. The three materialized views are working examples of the sector-wise, district-wise, and cluster-wise rollups called for in I4–I6; they refresh on a schedule (e.g. every 15 minutes) rather than recalculating on every dashboard page load.

## **6. Full Table Index**

All 31 tables, grouped by module, for quick reference. (spatial_ref_sys is created automatically by the PostGIS extension and is not part of the application schema.)

| **Module** | **Tables** |
| --- | --- |
| Identity & Access | roles, permissions, role_permissions, users |
| Admin/Geo Reference | provinces, divisions, districts, tehsils |
| Sector/Estate/Cluster | sectors, industrial_estates, industrial_clusters |
| Industrial Unit Master | industrial_units |
| Questionnaire | survey_forms, survey_sections, survey_questions, survey_question_logic |
| Survey Capture | survey_responses, survey_answers, survey_attachments, response_edit_log, unit_approval_log |
| Sync & Data Quality | sync_log, duplicate_flags, gis_quality_log |
| GIS | base_map_layers |
| Security & Audit | audit_log, backup_log, system_settings |
| Dashboard | dashboard_kpi_definitions, dashboard_saved_filters, mv_units_by_sector, mv_units_by_district, mv_units_by_cluster |

## **7. Key Design Decisions**

### Why one database for survey + GIS + dashboard

PostGIS extends PostgreSQL with spatial types and functions rather than requiring a separate GIS database. Industrial unit points, administrative boundaries, and estate/cluster polygons all live as ordinary columns (type geometry) in the same tables as their attribute data — so a query like "active textile-sector units in Lahore district" is a single SQL statement with no cross-database join, and the dashboard, GIS server, and survey app all read the same live numbers.

### Why client-generated UUIDs for survey_responses

If the primary key were an auto-incrementing integer assigned by the server, two offline devices could each create "record #204" and collide on sync. A UUID generated on the device the moment a survey starts eliminates that collision entirely, and lets the app track a response before it has ever touched the server.

### Why answers are stored as JSONB rather than one column per question

Survey questions change between rounds. A fixed column-per-question design means a schema migration every time a question is added, removed, or a form is revised. Storing survey_answers as one row per (response, question) with a JSONB value keeps the schema stable across form versions while still being indexable and queryable.

### Why verification/approval is tracked separately from edits

response_edit_log answers "what changed in this specific survey response, field by field." unit_approval_log answers a different question — "has this industrial unit's master record been reviewed and approved." Keeping them separate means an approval workflow can be reported on without wading through every minor field correction.

## **8. Suggested Implementation Order**

- Stand up PostgreSQL + PostGIS and run schema.sql (tested and verified against PostgreSQL 16 / PostGIS 3.4).
- Seed the reference tables first: provinces → divisions → districts → tehsils, then sectors, then estates/clusters.
- Build the Node.js API's auth layer (roles/permissions/users) before any data-entry endpoints, since every other table depends on created_by/surveyor_id.
- Build the survey_forms/survey_questions admin screens so the questionnaire can be digitized and versioned (E6).
- Build the React field app against IndexedDB first, with sync stubbed out, so offline capture can be tested before the network layer exists.
- Implement the Sync Service (batched upsert, duplicate detection) and wire it to the field app.
- Publish GIS layers and build the dashboard's KPI views last, once real survey data exists to visualize.