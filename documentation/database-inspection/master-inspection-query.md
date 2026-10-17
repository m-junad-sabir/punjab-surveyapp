# Database Schema Documentation

## Overview

This document describes the complete database schema, organized by table. Each table entry lists its columns, data types, constraints, defaults, and foreign key relationships.

---

## Table: `audit_log`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('audit_log_id_seq'::regclass) | YES | — | Generated ID |
| table_name | character varying | 60 | NO | — | NO | — | |
| record_id | text | — | YES | — | NO | — | |
| action | character varying | 10 | NO | — | NO | — | |
| old_data | jsonb | — | YES | — | NO | — | |
| new_data | jsonb | — | YES | — | NO | — | |
| changed_by | uuid | — | YES | — | NO | → users.id (NO ACTION / NO ACTION) | |
| changed_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `backup_log`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('backup_log_id_seq'::regclass) | YES | — | Generated ID |
| backup_type | character varying | 15 | NO | — | NO | — | |
| started_at | timestamp with time zone | — | NO | — | NO | — | |
| finished_at | timestamp with time zone | — | YES | — | NO | — | |
| status | character varying | 10 | NO | — | NO | — | |
| size_mb | numeric | 12 | YES | — | NO | — | |
| storage_location | text | — | YES | — | NO | — | |
| verified | boolean | — | NO | false | NO | — | |

---

## Table: `base_map_layers`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('base_map_layers_id_seq'::regclass) | YES | — | Generated ID |
| name | character varying | 80 | NO | — | NO | — | |
| layer_type | character varying | 15 | NO | — | NO | — | |
| url_template | text | — | NO | — | NO | — | |
| attribution | text | — | YES | — | NO | — | |
| is_default | boolean | — | NO | false | NO | — | |
| is_active | boolean | — | NO | true | NO | — | |

---

## Table: `boilers_pressure_vessels`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('boilers_pressure_vessels_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| vessel_type | text | — | NO | — | NO | — | |
| capacity_tph | numeric | 10 | YES | — | NO | — | |
| heating_surface | text | — | YES | — | NO | — | |

---

## Table: `collaboration_purposes`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| collaboration_id | bigint | 64 | NO | — | YES | → collaborations.id (NO ACTION / CASCADE) | |
| purpose_id | integer | 32 | NO | — | YES | → lookup_values.id (NO ACTION / NO ACTION) | |

---

## Table: `collaborations`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('collaborations_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| collaborator_type_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |

---

## Table: `critical_machines`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('critical_machines_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| machine_name | text | — | NO | — | NO | — | |
| quantity | integer | 32 | YES | — | NO | — | |
| specification | text | — | YES | — | NO | — | |

---

## Table: `dashboard_kpi_definitions`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('dashboard_kpi_definitions_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 50 | NO | — | NO | — | |
| name | text | — | NO | — | NO | — | |
| description | text | — | YES | — | NO | — | |
| sql_view_name | character varying | 80 | NO | — | NO | — | |
| unit_label | character varying | 30 | YES | — | NO | — | |
| is_active | boolean | — | NO | true | NO | — | |

---

## Table: `dashboard_saved_filters`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('dashboard_saved_filters_id_seq'::regclass) | YES | — | Generated ID |
| user_id | uuid | — | NO | — | NO | → users.id (NO ACTION / CASCADE) | |
| name | character varying | 100 | NO | — | NO | — | |
| filter_json | jsonb | — | NO | — | NO | — | |
| created_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `districts`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('districts_id_seq'::regclass) | YES | — | Generated ID |
| division_id | integer | 32 | NO | — | NO | → divisions.id (NO ACTION / NO ACTION) | |
| code | character varying | 10 | NO | — | NO | — | |
| name | character varying | 80 | NO | — | NO | — | |
| geom | USER-DEFINED | — | YES | — | NO | — | Geometry: MULTIPOLYGON, SRID 4326 |

---

## Table: `divisions`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('divisions_id_seq'::regclass) | YES | — | Generated ID |
| province_id | smallint | 16 | NO | — | NO | → provinces.id (NO ACTION / NO ACTION) | |
| code | character varying | 10 | NO | — | NO | — | |
| name | character varying | 80 | NO | — | NO | — | |
| geom | USER-DEFINED | — | YES | — | NO | — | Geometry: MULTIPOLYGON, SRID 4326 |

---

## Table: `duplicate_flags`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('duplicate_flags_id_seq'::regclass) | YES | — | Generated ID |
| unit_id | uuid | — | NO | — | NO | → industrial_units.id (NO ACTION / NO ACTION) | |
| matched_unit_id | uuid | — | NO | — | NO | → industrial_units.id (NO ACTION / NO ACTION) | |
| reason | character varying | 30 | NO | — | NO | — | |
| name_similarity | numeric | 4 | YES | — | NO | — | |
| distance_m | numeric | 10 | YES | — | NO | — | |
| resolution | character varying | 25 | NO | 'OPEN'::character varying | NO | — | |
| resolved_by | uuid | — | YES | — | NO | → users.id (NO ACTION / NO ACTION) | |
| resolved_at | timestamp with time zone | — | YES | — | NO | — | |
| created_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `energy_consumption`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('energy_consumption_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| energy_source_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| other_text | text | — | YES | — | NO | — | |
| quantity_per_month | numeric | 16 | YES | — | NO | — | |
| unit_id | integer | 32 | YES | — | NO | → measurement_units.id (NO ACTION / NO ACTION) | |
| share_pct | numeric | 5 | YES | — | NO | — | |

---

## Table: `energy_generation`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('energy_generation_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| power_source_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| other_text | text | — | YES | — | NO | — | |
| capacity_kw | numeric | 12 | YES | — | NO | — | |
| export_kw | numeric | 12 | YES | — | NO | — | |

---

## Table: `geography_columns` (PostGIS system view)

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| f_table_catalog | name | — | YES | — | NO | — | |
| f_table_schema | name | — | YES | — | NO | — | |
| f_table_name | name | — | YES | — | NO | — | |
| f_geography_column | name | — | YES | — | NO | — | |
| coord_dimension | integer | 32 | YES | — | NO | — | |
| srid | integer | 32 | YES | — | NO | — | |
| type | text | — | YES | — | NO | — | |

---

## Table: `geometry_columns` (PostGIS system view)

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| f_table_catalog | character varying | 256 | YES | — | NO | — | |
| f_table_schema | name | — | YES | — | NO | — | |
| f_table_name | name | — | YES | — | NO | — | |
| f_geometry_column | name | — | YES | — | NO | — | |
| coord_dimension | integer | 32 | YES | — | NO | — | |
| srid | integer | 32 | YES | — | NO | — | |
| type | character varying | 30 | YES | — | NO | — | |

---

## Table: `gis_quality_log`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('gis_quality_log_id_seq'::regclass) | YES | — | Generated ID |
| unit_id | uuid | — | NO | — | NO | → industrial_units.id (NO ACTION / NO ACTION) | |
| check_type | character varying | 40 | NO | — | NO | — | |
| result | character varying | 10 | NO | — | NO | — | |
| detail | text | — | YES | — | NO | — | |
| checked_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `hs_codes`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('hs_codes_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 12 | NO | — | NO | — | |
| description | text | — | NO | — | NO | — | |

---

## Table: `industrial_clusters`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('industrial_clusters_id_seq'::regclass) | YES | — | Generated ID |
| name | text | — | NO | — | NO | — | |
| district_id | integer | 32 | YES | — | NO | → districts.id (NO ACTION / NO ACTION) | |
| geom | USER-DEFINED | — | YES | — | NO | — | Geometry: MULTIPOLYGON, SRID 4326 |

---

## Table: `industrial_estates`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('industrial_estates_id_seq'::regclass) | YES | — | Generated ID |
| name | text | — | NO | — | NO | — | |
| district_id | integer | 32 | YES | — | NO | → districts.id (NO ACTION / NO ACTION) | |
| geom | USER-DEFINED | — | YES | — | NO | — | Geometry: MULTIPOLYGON, SRID 4326 |

---

## Table: `industrial_units`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | uuid | — | NO | gen_random_uuid() | YES | — | |
| unit_code | character varying | 30 | YES | — | NO | — | |
| name | text | — | NO | — | NO | — | |
| establishment_year | smallint | 16 | YES | — | NO | — | |
| location | USER-DEFINED | — | YES | — | NO | — | Geometry: POINT, SRID 4326 |
| gps_accuracy_m | numeric | 8 | YES | — | NO | — | |
| address | text | — | YES | — | NO | — | |
| province_id | smallint | 16 | YES | — | NO | → provinces.id (NO ACTION / NO ACTION) | |
| division_id | integer | 32 | YES | — | NO | → divisions.id (NO ACTION / NO ACTION) | |
| district_id | integer | 32 | YES | — | NO | → districts.id (NO ACTION / NO ACTION) | |
| tehsil_id | integer | 32 | YES | — | NO | → tehsils.id (NO ACTION / NO ACTION) | |
| contact_name | character varying | 120 | YES | — | NO | — | |
| contact_phone | character varying | 20 | YES | — | NO | — | |
| contact_email | character varying | 120 | YES | — | NO | — | |
| website | character varying | 200 | YES | — | NO | — | |
| psic_division_id | integer | 32 | YES | — | NO | → psic_divisions.id (NO ACTION / NO ACTION) | |
| psic_group_id | integer | 32 | YES | — | NO | → psic_groups.id (NO ACTION / NO ACTION) | |
| psic_class_id | integer | 32 | YES | — | NO | → psic_classes.id (NO ACTION / NO ACTION) | |
| zone_type_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| ownership_type_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| ownership_other_text | text | — | YES | — | NO | — | |
| legal_structure_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| legal_structure_other_text | text | — | YES | — | NO | — | |
| has_parent_company | boolean | — | YES | — | NO | — | |
| total_area_value | numeric | 14 | YES | — | NO | — | |
| total_area_unit_id | integer | 32 | YES | — | NO | → measurement_units.id (NO ACTION / NO ACTION) | |
| industrial_estate_id | integer | 32 | YES | — | NO | → industrial_estates.id (NO ACTION / NO ACTION) | |
| industrial_cluster_id | integer | 32 | YES | — | NO | → industrial_clusters.id (NO ACTION / NO ACTION) | |
| approval_status | character varying | 20 | NO | 'PENDING'::character varying | NO | — | |
| created_by | uuid | — | YES | — | NO | → users.id (NO ACTION / NO ACTION) | |
| created_at | timestamp with time zone | — | NO | now() | NO | — | |
| updated_at | timestamp with time zone | — | NO | now() | NO | — | |
| province_name | text | — | NO | — | NO | — | Denormalized |
| division_name | text | — | NO | — | NO | — | Denormalized |
| district_name | text | — | NO | — | NO | — | Denormalized |
| tehsil_name | text | — | NO | — | NO | — | Denormalized |
| psic_division_text | text | — | YES | — | NO | — | Denormalized |
| psic_group_text | text | — | YES | — | NO | — | Denormalized |
| psic_class_text | text | — | YES | — | NO | — | Denormalized |
| zone_type_other_text | text | — | YES | — | NO | — | |
| industrial_estate_text | text | — | YES | — | NO | — | Denormalized |
| industrial_cluster_text | text | — | YES | — | NO | — | Denormalized |

---

## Table: `lookup_types`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('lookup_types_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 50 | NO | — | NO | — | |
| name | character varying | 100 | NO | — | NO | — | |
| description | text | — | YES | — | NO | — | |

---

## Table: `lookup_value_links`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| parent_value_id | integer | 32 | NO | — | YES | → lookup_values.id (NO ACTION / CASCADE) | |
| child_value_id | integer | 32 | NO | — | YES | → lookup_values.id (NO ACTION / CASCADE) | |

---

## Table: `lookup_values`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('lookup_values_id_seq'::regclass) | YES | — | Generated ID |
| type_id | integer | 32 | NO | — | NO | → lookup_types.id (NO ACTION / CASCADE) | |
| code | character varying | 60 | NO | — | NO | — | |
| label | text | — | NO | — | NO | — | |
| requires_text | boolean | — | NO | false | NO | — | |
| numeric_value | numeric | 10 | YES | — | NO | — | |
| sort_order | smallint | 16 | NO | 0 | NO | — | |
| is_active | boolean | — | NO | true | NO | — | |

---

## Table: `machinery_age_profile`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('machinery_age_profile_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| age_bracket_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| machine_count | integer | 32 | NO | 0 | NO | — | |

---

## Table: `major_inputs`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('major_inputs_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| input_name | text | — | NO | — | NO | — | |
| unit_id | integer | 32 | YES | — | NO | → measurement_units.id (NO ACTION / NO ACTION) | |
| cost_share_pct | numeric | 5 | YES | — | NO | — | |
| hs_code_id | integer | 32 | YES | — | NO | → hs_codes.id (NO ACTION / NO ACTION) | |
| transformation_stage_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| hs_code_text | text | — | YES | — | NO | — | Denormalized |

---

## Table: `matrix_items`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('matrix_items_id_seq'::regclass) | YES | — | Generated ID |
| question_id | integer | 32 | NO | — | NO | → survey_questions.id (NO ACTION / CASCADE) | |
| group_label | character varying | 100 | YES | — | NO | — | |
| item_code | character varying | 60 | NO | — | NO | — | |
| item_label | text | — | NO | — | NO | — | |
| answer_type | character varying | 15 | NO | — | NO | — | |
| scale_type_id | integer | 32 | YES | — | NO | → lookup_types.id (NO ACTION / NO ACTION) | |
| allows_text | boolean | — | NO | false | NO | — | |
| sort_order | smallint | 16 | NO | 0 | NO | — | |

---

## Table: `measurement_units`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('measurement_units_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 20 | NO | — | NO | — | |
| name | character varying | 60 | NO | — | NO | — | |
| unit_kind | character varying | 20 | NO | — | NO | — | |

---

## Table: `permissions`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | smallint | 16 | NO | nextval('permissions_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 60 | NO | — | NO | — | |
| description | text | — | YES | — | NO | — | |

---

## Table: `product_transformation_stages`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| product_id | bigint | 64 | NO | — | YES | → products.id (NO ACTION / CASCADE) | |
| stage_id | integer | 32 | NO | — | YES | → lookup_values.id (NO ACTION / NO ACTION) | |

---

## Table: `products`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('products_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| product_kind | character varying | 10 | NO | — | NO | — | |
| product_name | text | — | NO | — | NO | — | |
| daily_avg_output | numeric | 18 | YES | — | NO | — | |
| daily_output_unit_id | integer | 32 | YES | — | NO | → measurement_units.id (NO ACTION / NO ACTION) | |
| annual_production | numeric | 18 | YES | — | NO | — | |
| annual_production_unit_id | integer | 32 | YES | — | NO | → measurement_units.id (NO ACTION / NO ACTION) | |
| installed_capacity | numeric | 18 | YES | — | NO | — | |
| installed_capacity_period | character varying | 10 | YES | — | NO | — | |
| unit_of_measurement_id | integer | 32 | YES | — | NO | → measurement_units.id (NO ACTION / NO ACTION) | |
| revenue_share_pct | numeric | 5 | YES | — | NO | — | |
| hs_code_id | integer | 32 | YES | — | NO | → hs_codes.id (NO ACTION / NO ACTION) | |
| sort_order | smallint | 16 | YES | 0 | NO | — | |
| hs_code_text | text | — | YES | — | NO | — | Denormalized |

---

## Table: `provinces`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | smallint | 16 | NO | nextval('provinces_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 10 | NO | — | NO | — | |
| name | character varying | 80 | NO | — | NO | — | |
| geom | USER-DEFINED | — | YES | — | NO | — | Geometry: MULTIPOLYGON, SRID 4326 |

---

## Table: `psic_classes`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('psic_classes_id_seq'::regclass) | YES | — | Generated ID |
| group_id | integer | 32 | NO | — | NO | → psic_groups.id (NO ACTION / NO ACTION) | |
| code | character varying | 10 | NO | — | NO | — | |
| name | text | — | NO | — | NO | — | |

---

## Table: `psic_divisions`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('psic_divisions_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 10 | NO | — | NO | — | |
| name | text | — | NO | — | NO | — | |

---

## Table: `psic_groups`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('psic_groups_id_seq'::regclass) | YES | — | Generated ID |
| division_id | integer | 32 | NO | — | NO | → psic_divisions.id (NO ACTION / NO ACTION) | |
| code | character varying | 10 | NO | — | NO | — | |
| name | text | — | NO | — | NO | — | |

---

## Table: `response_choices`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('response_choices_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| question_id | integer | 32 | NO | — | NO | → survey_questions.id (NO ACTION / NO ACTION) | |
| option_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| other_text | text | — | YES | — | NO | — | |

---

## Table: `response_edit_log`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('response_edit_log_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| edited_by | uuid | — | NO | — | NO | → users.id (NO ACTION / NO ACTION) | |
| table_name | character varying | 60 | NO | — | NO | — | |
| record_id | text | — | YES | — | NO | — | |
| field_name | character varying | 80 | YES | — | NO | — | |
| old_value | jsonb | — | YES | — | NO | — | |
| new_value | jsonb | — | YES | — | NO | — | |
| edited_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `response_matrix_answers`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('response_matrix_answers_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| item_id | integer | 32 | NO | — | NO | → matrix_items.id (NO ACTION / NO ACTION) | |
| choice_value_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| rating | smallint | 16 | YES | — | NO | — | |
| other_text | text | — | YES | — | NO | — | |

---

## Table: `response_shares`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('response_shares_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| question_id | integer | 32 | NO | — | NO | → survey_questions.id (NO ACTION / NO ACTION) | |
| option_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| percent_value | numeric | 5 | NO | — | NO | — | |
| other_text | text | — | YES | — | NO | — | |

---

## Table: `role_permissions`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| role_id | smallint | 16 | NO | — | YES | → roles.id (NO ACTION / CASCADE) | |
| permission_id | smallint | 16 | NO | — | YES | → permissions.id (NO ACTION / CASCADE) | |

---

## Table: `roles`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | smallint | 16 | NO | nextval('roles_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 30 | NO | — | NO | — | |
| name | character varying | 60 | NO | — | NO | — | |
| description | text | — | YES | — | NO | — | |

---

## Table: `sec_b_operations`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| operating_months | ARRAY | — | YES | — | NO | — | |
| operation_status_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| closure_reason | text | — | YES | — | NO | — | |
| daily_shift_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| daily_hours | numeric | 4 | YES | — | NO | — | |
| working_days_per_week | smallint | 16 | YES | 6 | NO | — | |
| weekly_hours | numeric | 5 | YES | — | NO | — | Generated column |
| monthly_hours | numeric | 6 | YES | — | NO | — | Generated column |

---

## Table: `sec_e_supply_chain`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| active_suppliers_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| supplier_dependency_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| procurement_mode_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| had_supply_disruption | boolean | — | YES | — | NO | — | |
| ontime_delivery_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| product_acceptance_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |

---

## Table: `sec_f_market`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| global_supply_chain_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| active_buyers_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| buyer_availability_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| sales_mode_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| payment_terms_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| had_demand_gap | boolean | — | YES | — | NO | — | |
| subcontract_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |

---

## Table: `sec_g_technology`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| plant_processing_capacity | text | — | YES | — | NO | — | |
| utilization_rate_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| integration_level_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| machine_source_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| spare_parts_source_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| breakdown_frequency_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| maintenance_approach_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| production_planning_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| inventory_system_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| rnd_expenditure_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |

---

## Table: `sec_h_environment`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| captive_capacity_kw | numeric | 12 | YES | — | NO | — | |
| export_capacity_kw | numeric | 12 | YES | — | NO | — | |

---

## Table: `sec_i_compliance`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| safety_trained_workers | integer | 32 | YES | — | NO | — | |

---

## Table: `sec_j_strategy`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| reinvestment_level_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| reinvestment_area_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| reinvestment_area_other | text | — | YES | — | NO | — | |
| upscaling_time_id | integer | 32 | YES | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |

---

## Table: `sec_k_future`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | NO | — | YES | → survey_responses.id (NO ACTION / CASCADE) | |
| has_future_plan | boolean | — | YES | — | NO | — | |
| most_critical_barrier | text | — | YES | — | NO | — | |

---

## Table: `solid_waste_disposals`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| stream_id | bigint | 64 | NO | — | YES | → solid_waste_streams.id (NO ACTION / CASCADE) | |
| disposal_method_id | integer | 32 | NO | — | YES | → lookup_values.id (NO ACTION / NO ACTION) | |
| other_text | text | — | YES | — | NO | — | |

---

## Table: `solid_waste_streams`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('solid_waste_streams_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| waste_type_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| is_generated | boolean | — | NO | false | NO | — | |

---

## Table: `spatial_ref_sys` (PostGIS system table)

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| srid | integer | 32 | NO | — | YES | — | |
| auth_name | character varying | 256 | YES | — | NO | — | |
| auth_srid | integer | 32 | YES | — | NO | — | |
| srtext | character varying | 2048 | YES | — | NO | — | |
| proj4text | character varying | 2048 | YES | — | NO | — | |

---

## Table: `survey_attachments`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | uuid | — | NO | gen_random_uuid() | YES | — | |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| section_code | character | 1 | YES | — | NO | — | |
| file_type | character varying | 20 | YES | — | NO | — | |
| file_name | text | — | YES | — | NO | — | |
| storage_path | text | — | NO | — | NO | — | |
| captured_at | timestamp with time zone | — | YES | — | NO | — | |

---

## Table: `survey_forms`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('survey_forms_id_seq'::regclass) | YES | — | Generated ID |
| code | character varying | 40 | NO | — | NO | — | |
| title | text | — | NO | — | NO | — | |
| version | integer | 32 | NO | 1 | NO | — | |
| is_active | boolean | — | NO | true | NO | — | |
| created_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `survey_questions`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('survey_questions_id_seq'::regclass) | YES | — | Generated ID |
| section_id | integer | 32 | NO | — | NO | → survey_sections.id (NO ACTION / CASCADE) | |
| question_code | character varying | 60 | NO | — | NO | — | |
| question_no | character varying | 10 | YES | — | NO | — | |
| question_text | text | — | NO | — | NO | — | |
| answer_type | character varying | 20 | NO | — | NO | — | |
| lookup_type_id | integer | 32 | YES | — | NO | → lookup_types.id (NO ACTION / NO ACTION) | |
| is_required | boolean | — | NO | false | NO | — | |
| stored_in | character varying | 80 | YES | — | NO | — | |

---

## Table: `survey_responses`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | uuid | — | NO | — | YES | — | |
| form_id | integer | 32 | NO | — | NO | → survey_forms.id (NO ACTION / NO ACTION) | |
| unit_id | uuid | — | NO | — | NO | → industrial_units.id (NO ACTION / NO ACTION) | |
| surveyor_id | uuid | — | NO | — | NO | → users.id (NO ACTION / NO ACTION) | |
| device_id | character varying | 100 | YES | — | NO | — | |
| gps_lat | numeric | 9 | YES | — | NO | — | |
| gps_lng | numeric | 9 | YES | — | NO | — | |
| gps_accuracy_m | numeric | 8 | YES | — | NO | — | |
| status | character varying | 25 | NO | 'DRAFT'::character varying | NO | — | |
| sync_status | character varying | 20 | NO | 'PENDING'::character varying | NO | — | |
| started_at | timestamp with time zone | — | NO | — | NO | — | |
| completed_at | timestamp with time zone | — | YES | — | NO | — | |
| submitted_at | timestamp with time zone | — | YES | — | NO | — | |
| confirmed_by | uuid | — | YES | — | NO | → users.id (NO ACTION / NO ACTION) | |
| confirmed_at | timestamp with time zone | — | YES | — | NO | — | |
| synced_at | timestamp with time zone | — | YES | — | NO | — | |
| app_version | character varying | 20 | YES | — | NO | — | |

---

## Table: `survey_sections`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('survey_sections_id_seq'::regclass) | YES | — | Generated ID |
| form_id | integer | 32 | NO | — | NO | → survey_forms.id (NO ACTION / CASCADE) | |
| section_code | character | 1 | NO | — | NO | — | |
| title | text | — | NO | — | NO | — | |
| sort_order | smallint | 16 | NO | 0 | NO | — | |

---

## Table: `sync_log`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('sync_log_id_seq'::regclass) | YES | — | Generated ID |
| surveyor_id | uuid | — | NO | — | NO | → users.id (NO ACTION / NO ACTION) | |
| device_id | character varying | 100 | YES | — | NO | — | |
| started_at | timestamp with time zone | — | NO | — | NO | — | |
| finished_at | timestamp with time zone | — | YES | — | NO | — | |
| records_sent | integer | 32 | YES | 0 | NO | — | |
| records_synced | integer | 32 | YES | 0 | NO | — | |
| records_rejected | integer | 32 | YES | 0 | NO | — | |
| records_duplicate | integer | 32 | YES | 0 | NO | — | |
| status | character varying | 20 | YES | — | NO | — | |
| error_message | text | — | YES | — | NO | — | |

---

## Table: `system_settings`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| key | character varying | 80 | NO | — | YES | — | |
| value | jsonb | — | NO | — | NO | — | |
| description | text | — | YES | — | NO | — | |
| updated_by | uuid | — | YES | — | NO | → users.id (NO ACTION / NO ACTION) | |
| updated_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `tehsils`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | integer | 32 | NO | nextval('tehsils_id_seq'::regclass) | YES | — | Generated ID |
| district_id | integer | 32 | NO | — | NO | → districts.id (NO ACTION / NO ACTION) | |
| code | character varying | 10 | NO | — | NO | — | |
| name | character varying | 80 | NO | — | NO | — | |
| geom | USER-DEFINED | — | YES | — | NO | — | Geometry: MULTIPOLYGON, SRID 4326 |

---

## Table: `unit_approval_log`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('unit_approval_log_id_seq'::regclass) | YES | — | Generated ID |
| unit_id | uuid | — | NO | — | NO | → industrial_units.id (NO ACTION / NO ACTION) | |
| response_id | uuid | — | YES | — | NO | → survey_responses.id (NO ACTION / NO ACTION) | |
| action | character varying | 25 | NO | — | NO | — | |
| acted_by | uuid | — | NO | — | NO | → users.id (NO ACTION / NO ACTION) | |
| remarks | text | — | YES | — | NO | — | |
| acted_at | timestamp with time zone | — | NO | now() | NO | — | |

---

## Table: `unit_associated_establishments`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('unit_associated_establishments_id_seq'::regclass) | YES | — | Generated ID |
| unit_id | uuid | — | NO | — | NO | → industrial_units.id (NO ACTION / CASCADE) | |
| name | text | — | NO | — | NO | — | |
| address | text | — | YES | — | NO | — | |
| major_activity_psic_class_id | integer | 32 | YES | — | NO | → psic_classes.id (NO ACTION / NO ACTION) | |
| major_activity_text | text | — | YES | — | NO | — | |

---

## Table: `unit_parent_companies`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| unit_id | uuid | — | NO | — | YES | → industrial_units.id (NO ACTION / CASCADE) | |
| company_name | text | — | NO | — | NO | — | |
| company_address | text | — | YES | — | NO | — | |
| phone | character varying | 20 | YES | — | NO | — | |
| cell | character varying | 20 | YES | — | NO | — | |
| email | character varying | 120 | YES | — | NO | — | |

---

## Table: `users`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | uuid | — | NO | gen_random_uuid() | YES | — | |
| username | character varying | 50 | NO | — | NO | — | |
| full_name | character varying | 120 | NO | — | NO | — | |
| designation | character varying | 80 | YES | — | NO | — | |
| email | character varying | 120 | YES | — | NO | — | |
| phone | character varying | 20 | YES | — | NO | — | |
| password_hash | text | — | NO | — | NO | — | |
| role_id | smallint | 16 | NO | — | NO | → roles.id (NO ACTION / NO ACTION) | |
| supervisor_id | uuid | — | YES | — | NO | → users.id (NO ACTION / NO ACTION) | Self-referential |
| is_active | boolean | — | NO | true | NO | — | |
| created_by | uuid | — | YES | — | NO | → users.id (NO ACTION / NO ACTION) | Self-referential |
| created_at | timestamp with time zone | — | NO | now() | NO | — | |
| deactivated_at | timestamp with time zone | — | YES | — | NO | — | |

---

## Table: `v_percentage_checks` (View)

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| response_id | uuid | — | YES | — | NO | — | |
| check_name | character varying | — | YES | — | NO | — | |
| total_pct | numeric | — | YES | — | NO | — | |
| rule | text | — | YES | — | NO | — | |
| is_ok | boolean | — | YES | — | NO | — | |

---

## Table: `weights_measures_equipment`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('weights_measures_equipment_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| equipment_type | text | — | NO | — | NO | — | |
| quantity | integer | 32 | YES | — | NO | — | |
| capacity | text | — | YES | — | NO | — | |

---

## Table: `workforce_employment`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('workforce_employment_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| gender | character varying | 10 | NO | — | NO | — | |
| regular_count | integer | 32 | NO | 0 | NO | — | |
| contract_count | integer | 32 | NO | 0 | NO | — | |
| daily_wage_count | integer | 32 | NO | 0 | NO | — | |
| total_count | integer | 32 | YES | — | NO | — | Generated column |

---

## Table: `workforce_skills`

| Column | Type | Length | Nullable | Default | PK | FK | Notes |
|--------|------|--------|----------|---------|----|----|-------|
| id | bigint | 64 | NO | nextval('workforce_skills_id_seq'::regclass) | YES | — | Generated ID |
| response_id | uuid | — | NO | — | NO | → survey_responses.id (NO ACTION / CASCADE) | |
| gender | character varying | 10 | NO | — | NO | — | |
| skill_level_id | integer | 32 | NO | — | NO | → lookup_values.id (NO ACTION / NO ACTION) | |
| headcount | integer | 32 | NO | 0 | NO | — | |

---

## Relationship Summary

### Core Survey Flow
- **`survey_forms`** → `survey_sections` → `survey_questions` → `matrix_items`
- **`industrial_units`** → `survey_responses` → all response child tables
- **`users`** → `survey_responses` (surveyor_id, confirmed_by)

### Geography Hierarchy
- **`provinces`** → `divisions` → `districts` → `tehsils`
- **`industrial_units`** references all four levels

### PSIC Classification
- **`psic_divisions`** → `psic_groups` → `psic_classes`
- **`industrial_units`** references all three levels

### Lookup System
- **`lookup_types`** → `lookup_values`
- **`lookup_value_links`** (many-to-many within lookup_values)
- Used extensively as foreign keys throughout survey response tables

### Response Child Tables (all FK to `survey_responses`)
- `boilers_pressure_vessels`, `collaborations`, `critical_machines`, `energy_consumption`, `energy_generation`, `machinery_age_profile`, `major_inputs`, `products`, `response_choices`, `response_edit_log`, `response_matrix_answers`, `response_shares`, `solid_waste_streams`, `survey_attachments`, `weights_measures_equipment`, `workforce_employment`, `workforce_skills`
- Section-specific one-to-one tables: `sec_b_operations`, `sec_e_supply_chain`, `sec_f_market`, `sec_g_technology`, `sec_h_environment`, `sec_i_compliance`, `sec_j_strategy`, `sec_k_future`

### Junction Tables
- `collaboration_purposes` (collaborations ↔ lookup_values)
- `product_transformation_stages` (products ↔ lookup_values)
- `solid_waste_disposals` (solid_waste_streams ↔ lookup_values)
- `role_permissions` (roles ↔ permissions)
- `lookup_value_links` (lookup_values self-referential)

### Audit / System Tables
- `audit_log`, `backup_log`, `sync_log`, `response_edit_log`, `unit_approval_log`, `gis_quality_log`, `duplicate_flags`, `system_settings`

### Spatial Tables (PostGIS, SRID 4326)
- `provinces` (MULTIPOLYGON), `divisions` (MULTIPOLYGON), `districts` (MULTIPOLYGON), `tehsils` (MULTIPOLYGON)
- `industrial_clusters` (MULTIPOLYGON), `industrial_estates` (MULTIPOLYGON)
- `industrial_units` (POINT)