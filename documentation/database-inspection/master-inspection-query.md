# Master Inspection Database Schema

> Source: `Master Inspection Query New (2).csv`
> Format: one section per table; columns listed in ordinal order.
> Conventions: `PK` = primary key, `FK` = foreign key, `ID` = generated identity, `NN` = NOT NULL, `NULL` = nullable.
> This is a historical database snapshot. Workplan 2 migrations 08 and 09 add Section A fields, `response_interviewees`, and Section B working months. They have not been applied to a live database by this implementation; verify each environment separately.

## Table Index

| # | Table | Columns | Purpose (inferred) |
|---|-------|---------|--------------------|
| 1 | audit_log | 8 | Generic row-change audit trail |
| 2 | backup_log | 8 | Database backup tracking |
| 3 | base_map_layers | 7 | GIS basemap layer config |
| 4 | boilers_pressure_vessels | 5 | Survey: boilers/pressure vessels |
| 5 | collaboration_purposes | 2 | Junction: collaborations ↔ purposes |
| 6 | collaborations | 3 | Survey: collaborations |
| 7 | critical_machines | 5 | Survey: critical machinery |
| 8 | dashboard_kpi_definitions | 7 | Dashboard KPI registry |
| 9 | dashboard_saved_filters | 5 | User-saved dashboard filters |
| 10 | districts | 5 | Geography: districts |
| 11 | divisions | 5 | Geography: divisions |
| 12 | duplicate_flags | 11 | Unit deduplication flags |
| 13 | energy_consumption | 7 | Survey: energy consumption |
| 14 | energy_generation | 6 | Survey: energy generation |
| 15 | geography_columns | 7 | PostGIS system view |
| 16 | geometry_columns | 7 | PostGIS system view |
| 17 | gis_quality_log | 6 | GIS data quality checks |
| 18 | hs_codes | 3 | HS code lookup |
| 19 | industrial_clusters | 4 | GIS: industrial clusters |
| 20 | industrial_estates | 4 | GIS: industrial estates |
| 21 | industrial_units | 44 | Core unit registry |
| 22 | lookup_types | 4 | Lookup type catalog |
| 23 | lookup_value_links | 2 | Lookup parent/child links |
| 24 | lookup_values | 8 | Lookup value catalog |
| 25 | machinery_age_profile | 4 | Survey: machinery age brackets |
| 26 | major_inputs | 8 | Survey: major inputs |
| 27 | matrix_items | 9 | Survey matrix item definitions |
| 28 | measurement_units | 4 | Unit of measure catalog |
| 29 | permissions | 3 | Permission catalog |
| 30 | product_transformation_stages | 2 | Junction: products ↔ stages |
| 31 | products | 15 | Survey: products |
| 32 | provinces | 4 | Geography: provinces |
| 33 | psic_classes | 4 | PSIC classification: classes |
| 34 | psic_divisions | 3 | PSIC classification: divisions |
| 35 | psic_groups | 4 | PSIC classification: groups |
| 36 | response_choices | 5 | Survey: single/multi choice answers |
| 37 | response_edit_log | 9 | Survey response edit history |
| 38 | response_matrix_answers | 6 | Survey: matrix answers |
| 39 | response_shares | 6 | Survey: percentage share answers |
| 40 | role_permissions | 2 | Junction: roles ↔ permissions |
| 41 | roles | 4 | Role catalog |
| 42 | sec_b_operations | 9 | Survey section B: operations |
| 43 | sec_e_supply_chain | 7 | Survey section E: supply chain |
| 44 | sec_f_market | 8 | Survey section F: market |
| 45 | sec_g_technology | 11 | Survey section G: technology |
| 46 | sec_h_environment | 3 | Survey section H: environment |
| 47 | sec_i_compliance | 2 | Survey section I: compliance |
| 48 | sec_j_strategy | 5 | Survey section J: strategy |
| 49 | sec_k_future | 3 | Survey section K: future plans |
| 50 | solid_waste_disposals | 3 | Junction: waste streams ↔ disposal methods |
| 51 | solid_waste_streams | 4 | Survey: solid waste streams |
| 52 | spatial_ref_sys | 5 | PostGIS SRID catalog |
| 53 | survey_attachments | 16 | Survey file attachments |
| 54 | survey_forms | 6 | Survey form definitions |
| 55 | survey_photo_uploads | 13 | Survey photo uploads |
| 56 | survey_questions | 9 | Survey question definitions |
| 57 | survey_responses | 17 | Survey response headers |
| 58 | survey_sections | 5 | Survey section definitions |
| 59 | sync_log | 11 | Offline sync logs |
| 60 | system_settings | 5 | Key/value system settings |
| 61 | tehsils | 5 | Geography: tehsils |
| 62 | unit_approval_log | 7 | Unit approval workflow log |
| 63 | unit_associated_establishments | 6 | Associated establishments |
| 64 | unit_parent_companies | 6 | Parent company info |
| 65 | unit_type_psic_classes | 2 | Junction: unit types ↔ PSIC classes |
| 66 | user_admin_audit | 6 | User admin audit trail |
| 67 | users | 15 | User accounts |
| 68 | v_percentage_checks | 5 | View: percentage validation |
| 69 | weights_measures_equipment | 5 | Survey: weights & measures equipment |
| 70 | workforce_employment | 7 | Survey: employment counts |
| 71 | workforce_skills | 5 | Survey: workforce skills |

---

## 1. audit_log
Generic audit trail for row-level changes.

| # | Column | Type | Len | Null | Key | Default | Notes |
|---|--------|------|-----|------|-----|---------|-------|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('audit_log_id_seq') | |
| 2 | table_name | varchar | 60 | NN | | | |
| 3 | record_id | text | | NULL | | | |
| 4 | action | varchar | 10 | NN | | | |
| 5 | old_data | jsonb | | NULL | | | |
| 6 | new_data | jsonb | | NULL | | | |
| 7 | changed_by | uuid | | NULL | FK → users.id | | ON UPDATE/ DELETE: NO ACTION |
| 8 | changed_at | timestamptz | | NN | | now() | |

## 2. backup_log
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('backup_log_id_seq') |
| 2 | backup_type | varchar | 15 | NN | | |
| 3 | started_at | timestamptz | | NN | | |
| 4 | finished_at | timestamptz | | NULL | | |
| 5 | status | varchar | 10 | NN | | |
| 6 | size_mb | numeric | 12 | NULL | | |
| 7 | storage_location | text | | NULL | | |
| 8 | verified | boolean | | NN | | FALSE |

## 3. base_map_layers
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | integer | 32 | NN | PK, ID | nextval('base_map_layers_id_seq') |
| 2 | name | varchar | 80 | NN | | |
| 3 | layer_type | varchar | 15 | NN | | |
| 4 | url_template | text | | NN | | |
| 5 | attribution | text | | NULL | | |
| 6 | is_default | boolean | | NN | | FALSE |
| 7 | is_active | boolean | | NN | | TRUE |

## 4. boilers_pressure_vessels
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('boilers_pressure_vessels_id_seq') |
| 2 | response_id | uuid | | NN | FK → survey_responses.id (CASCADE) | |
| 3 | vessel_type | text | | NN | | |
| 4 | capacity_tph | numeric | 10 | NULL | | |
| 5 | heating_surface | text | | NULL | | |

## 5. collaboration_purposes
Composite PK junction table.

| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | collaboration_id | bigint | 64 | NN | PK | → collaborations.id (CASCADE) |
| 2 | purpose_id | integer | 32 | NN | PK | → lookup_values.id (NO ACTION) |

## 6. collaborations
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('collaborations_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | collaborator_type_id | integer | 32 | NN | | | → lookup_values.id (NO ACTION) |

## 7. critical_machines
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('critical_machines_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | machine_name | text | | NN | | | |
| 4 | quantity | integer | 32 | NULL | | | |
| 5 | specification | text | | NULL | | | |

## 8. dashboard_kpi_definitions
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | integer | 32 | NN | PK, ID | nextval('dashboard_kpi_definitions_id_seq') |
| 2 | code | varchar | 50 | NN | | |
| 3 | name | text | | NN | | |
| 4 | description | text | | NULL | | |
| 5 | sql_view_name | varchar | 80 | NN | | |
| 6 | unit_label | varchar | 30 | NULL | | |
| 7 | is_active | boolean | | NN | | TRUE |

## 9. dashboard_saved_filters
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('dashboard_saved_filters_id_seq') | |
| 2 | user_id | uuid | | NN | | | → users.id (CASCADE) |
| 3 | name | varchar | 100 | NN | | | |
| 4 | filter_json | jsonb | | NN | | | |
| 5 | created_at | timestamptz | | NN | | now() | |

## 10. districts
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('districts_id_seq') | |
| 2 | division_id | integer | 32 | NN | | | → divisions.id |
| 3 | code | varchar | 10 | NN | | | |
| 4 | name | varchar | 80 | NN | | | |
| 5 | geom | geometry(MULTIPOLYGON, 4326) | | NULL | | | |

## 11. divisions
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('divisions_id_seq') | |
| 2 | province_id | smallint | 16 | NN | | | → provinces.id |
| 3 | code | varchar | 10 | NN | | | |
| 4 | name | varchar | 80 | NN | | | |
| 5 | geom | geometry(MULTIPOLYGON, 4326) | | NULL | | | |

## 12. duplicate_flags
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('duplicate_flags_id_seq') | |
| 2 | unit_id | uuid | | NN | | | → industrial_units.id |
| 3 | matched_unit_id | uuid | | NN | | | → industrial_units.id |
| 4 | reason | varchar | 30 | NN | | | |
| 5 | name_similarity | numeric | 4 | NULL | | | |
| 6 | distance_m | numeric | 10 | NULL | | | |
| 7 | resolution | varchar | 25 | NN | | 'OPEN' | |
| 8 | resolved_by | uuid | | NULL | | | → users.id |
| 9 | resolved_at | timestamptz | | NULL | | | |
| 10 | created_at | timestamptz | | NN | | now() | |
| 11 | details | text | | NULL | | | |

## 13. energy_consumption
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | id | bigint | 64 | NN | PK, ID | |
| 2 | response_id | uuid | | NN | | → survey_responses.id (CASCADE) |
| 3 | energy_source_id | integer | 32 | NN | | → lookup_values.id |
| 4 | other_text | text | | NULL | | |
| 5 | quantity_per_month | numeric | 16 | NULL | | |
| 6 | unit_id | integer | 32 | NULL | | → measurement_units.id |
| 7 | share_pct | numeric | 5 | NULL | | |

## 14. energy_generation
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | id | bigint | 64 | NN | PK, ID | |
| 2 | response_id | uuid | | NN | | → survey_responses.id (CASCADE) |
| 3 | power_source_id | integer | 32 | NN | | → lookup_values.id |
| 4 | other_text | text | | NULL | | |
| 5 | capacity_kw | numeric | 12 | NULL | | |
| 6 | export_kw | numeric | 12 | NULL | | |

## 15. geography_columns
PostGIS system view.

| # | Column | Type | Null |
|---|--------|------|------|
| 1 | f_table_catalog | name | NULL |
| 2 | f_table_schema | name | NULL |
| 3 | f_table_name | name | NULL |
| 4 | f_geography_column | name | NULL |
| 5 | coord_dimension | integer | NULL |
| 6 | srid | integer | NULL |
| 7 | type | text | NULL |

## 16. geometry_columns
PostGIS system view.

| # | Column | Type | Len | Null |
|---|--------|------|-----|------|
| 1 | f_table_catalog | varchar | 256 | NULL |
| 2 | f_table_schema | name | | NULL |
| 3 | f_table_name | name | | NULL |
| 4 | f_geometry_column | name | | NULL |
| 5 | coord_dimension | integer | 32 | NULL |
| 6 | srid | integer | 32 | NULL |
| 7 | type | varchar | 30 | NULL |

## 17. gis_quality_log
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('gis_quality_log_id_seq') | |
| 2 | unit_id | uuid | | NN | | | → industrial_units.id |
| 3 | check_type | varchar | 40 | NN | | | |
| 4 | result | varchar | 10 | NN | | | |
| 5 | detail | text | | NULL | | | |
| 6 | checked_at | timestamptz | | NN | | now() | |

## 18. hs_codes
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | integer | 32 | NN | PK, ID | nextval('hs_codes_id_seq') |
| 2 | code | varchar | 12 | NN | | |
| 3 | description | text | | NN | | |

## 19. industrial_clusters
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('industrial_clusters_id_seq') | |
| 2 | name | text | | NN | | | |
| 3 | district_id | integer | 32 | NULL | | | → districts.id |
| 4 | geom | geometry(MULTIPOLYGON, 4326) | | NULL | | | |

## 20. industrial_estates
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('industrial_estates_id_seq') | |
| 2 | name | text | | NN | | | |
| 3 | district_id | integer | 32 | NULL | | | → districts.id |
| 4 | geom | geometry(MULTIPOLYGON, 4326) | | NULL | | | |

## 21. industrial_units
Core registry of industrial units.

| # | Column | Type | Len | Null | Key | Default | FK / Notes |
|---|--------|------|-----|------|-----|---------|------------|
| 1 | id | uuid | | NN | PK | gen_random_uuid() | not generated-id |
| 2 | unit_code | varchar | 30 | NULL | | | |
| 3 | name | text | | NN | | | |
| 4 | establishment_year | smallint | 16 | NULL | | | |
| 5 | location | geometry(POINT, 4326) | | NULL | | | |
| 6 | gps_accuracy_m | numeric | 8 | NULL | | | |
| 7 | address | text | | NULL | | | |
| 8 | province_id | smallint | 16 | NULL | | | → provinces.id |
| 9 | division_id | integer | 32 | NULL | | | → divisions.id |
| 10 | district_id | integer | 32 | NULL | | | → districts.id |
| 11 | tehsil_id | integer | 32 | NULL | | | → tehsils.id |
| 12 | contact_name | varchar | 120 | NULL | | | |
| 13 | contact_phone | varchar | 20 | NULL | | | |
| 14 | contact_email | varchar | 120 | NULL | | | |
| 15 | website | varchar | 200 | NULL | | | |
| 16 | psic_division_id | integer | 32 | NULL | | | → psic_divisions.id |
| 17 | psic_group_id | integer | 32 | NULL | | | → psic_groups.id |
| 18 | psic_class_id | integer | 32 | NULL | | | → psic_classes.id |
| 19 | zone_type_id | integer | 32 | NULL | | | → lookup_values.id |
| 20 | ownership_type_id | integer | 32 | NULL | | | → lookup_values.id |
| 21 | ownership_other_text | text | | NULL | | | |
| 22 | legal_structure_id | integer | 32 | NULL | | | → lookup_values.id |
| 23 | legal_structure_other_text | text | | NULL | | | |
| 24 | has_parent_company | boolean | | NULL | | | |
| 25 | total_area_value | numeric | 14 | NULL | | | |
| 26 | total_area_unit_id | integer | 32 | NULL | | | → measurement_units.id |
| 27 | industrial_estate_id | integer | 32 | NULL | | | → industrial_estates.id |
| 28 | industrial_cluster_id | integer | 32 | NULL | | | → industrial_clusters.id |
| 29 | approval_status | varchar | 20 | NN | | 'PENDING' | |
| 30 | created_by | uuid | | NULL | | | → users.id |
| 31 | created_at | timestamptz | | NN | | now() | |
| 32 | updated_at | timestamptz | | NN | | now() | |
| 33 | province_name | text | | NN | | | denormalized |
| 34 | division_name | text | | NN | | | denormalized |
| 35 | district_name | text | | NN | | | denormalized |
| 36 | tehsil_name | text | | NN | | | denormalized |
| 37 | psic_division_text | text | | NULL | | | |
| 38 | psic_group_text | text | | NULL | | | |
| 39 | psic_class_text | text | | NULL | | | |
| 40 | zone_type_other_text | text | | NULL | | | |
| 41 | industrial_estate_text | text | | NULL | | | |
| 42 | industrial_cluster_text | text | | NULL | | | |
| 43 | unit_type_id | integer | 32 | NULL | | | → lookup_values.id |
| 44 | unit_type_other_text | text | | NULL | | | |

## 22. lookup_types
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | integer | 32 | NN | PK, ID | nextval('lookup_types_id_seq') |
| 2 | code | varchar | 50 | NN | | |
| 3 | name | varchar | 100 | NN | | |
| 4 | description | text | | NULL | | |

## 23. lookup_value_links
Composite PK.

| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | parent_value_id | integer | 32 | NN | PK | → lookup_values.id (CASCADE) |
| 2 | child_value_id | integer | 32 | NN | PK | → lookup_values.id (CASCADE) |

## 24. lookup_values
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('lookup_values_id_seq') | |
| 2 | type_id | integer | 32 | NN | | | → lookup_types.id (CASCADE) |
| 3 | code | varchar | 60 | NN | | | |
| 4 | label | text | | NN | | | |
| 5 | requires_text | boolean | | NN | | FALSE | |
| 6 | numeric_value | numeric | 10 | NULL | | | |
| 7 | sort_order | smallint | 16 | NN | | 0 | |
| 8 | is_active | boolean | | NN | | TRUE | |

## 25. machinery_age_profile
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('machinery_age_profile_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | age_bracket_id | integer | 32 | NN | | | → lookup_values.id |
| 4 | machine_count | integer | 32 | NN | | 0 | |

## 26. major_inputs
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('major_inputs_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | input_name | text | | NN | | | |
| 4 | unit_id | integer | 32 | NULL | | | → measurement_units.id |
| 5 | cost_share_pct | numeric | 5 | NULL | | | |
| 6 | hs_code_id | integer | 32 | NULL | | | → hs_codes.id |
| 7 | transformation_stage_id | integer | 32 | NULL | | | → lookup_values.id |
| 8 | hs_code_text | text | | NULL | | | |

## 27. matrix_items
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('matrix_items_id_seq') | |
| 2 | question_id | integer | 32 | NN | | | → survey_questions.id (CASCADE) |
| 3 | group_label | varchar | 100 | NULL | | | |
| 4 | item_code | varchar | 60 | NN | | | |
| 5 | item_label | text | | NN | | | |
| 6 | answer_type | varchar | 15 | NN | | | |
| 7 | scale_type_id | integer | 32 | NULL | | | → lookup_types.id |
| 8 | allows_text | boolean | | NN | | FALSE | |
| 9 | sort_order | smallint | 16 | NN | | 0 | |

## 28. measurement_units
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | integer | 32 | NN | PK, ID | nextval('measurement_units_id_seq') |
| 2 | code | varchar | 20 | NN | | |
| 3 | name | varchar | 60 | NN | | |
| 4 | unit_kind | varchar | 20 | NN | | |

## 29. permissions
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | smallint | 16 | NN | PK, ID | nextval('permissions_id_seq') |
| 2 | code | varchar | 60 | NN | | |
| 3 | description | text | | NULL | | |

## 30. product_transformation_stages
Composite PK.

| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | product_id | bigint | 64 | NN | PK | → products.id (CASCADE) |
| 2 | stage_id | integer | 32 | NN | PK | → lookup_values.id |

## 31. products
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('products_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | product_kind | varchar | 10 | NN | | | |
| 4 | product_name | text | | NN | | | |
| 5 | daily_avg_output | numeric | 18 | NULL | | | |
| 6 | daily_output_unit_id | integer | 32 | NULL | | | → measurement_units.id |
| 7 | annual_production | numeric | 18 | NULL | | | |
| 8 | annual_production_unit_id | integer | 32 | NULL | | | → measurement_units.id |
| 9 | installed_capacity | numeric | 18 | NULL | | | |
| 10 | installed_capacity_period | varchar | 10 | NULL | | | |
| 11 | unit_of_measurement_id | integer | 32 | NULL | | | → measurement_units.id |
| 12 | revenue_share_pct | numeric | 5 | NULL | | | |
| 13 | hs_code_id | integer | 32 | NULL | | | → hs_codes.id |
| 14 | sort_order | smallint | 16 | NULL | | 0 | |
| 15 | hs_code_text | text | | NULL | | | |

## 32. provinces
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | smallint | 16 | NN | PK, ID | nextval('provinces_id_seq') |
| 2 | code | varchar | 10 | NN | | |
| 3 | name | varchar | 80 | NN | | |
| 4 | geom | geometry(MULTIPOLYGON, 4326) | | NULL | | |

## 33. psic_classes
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('psic_classes_id_seq') | |
| 2 | group_id | integer | 32 | NN | | | → psic_groups.id |
| 3 | code | varchar | 10 | NN | | | |
| 4 | name | text | | NN | | | |

## 34. psic_divisions
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | integer | 32 | NN | PK, ID | nextval('psic_divisions_id_seq') |
| 2 | code | varchar | 10 | NN | | |
| 3 | name | text | | NN | | |

## 35. psic_groups
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('psic_groups_id_seq') | |
| 2 | division_id | integer | 32 | NN | | | → psic_divisions.id |
| 3 | code | varchar | 10 | NN | | | |
| 4 | name | text | | NN | | | |

## 36. response_choices
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('response_choices_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | question_id | integer | 32 | NN | | | → survey_questions.id |
| 4 | option_id | integer | 32 | NN | | | → lookup_values.id |
| 5 | other_text | text | | NULL | | | |

## 37. response_edit_log
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('response_edit_log_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | edited_by | uuid | | NN | | | → users.id |
| 4 | table_name | varchar | 60 | NN | | | |
| 5 | record_id | text | | NULL | | | |
| 6 | field_name | varchar | 80 | NULL | | | |
| 7 | old_value | jsonb | | NULL | | | |
| 8 | new_value | jsonb | | NULL | | | |
| 9 | edited_at | timestamptz | | NN | | now() | |

## 38. response_matrix_answers
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('response_matrix_answers_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | item_id | integer | 32 | NN | | | → matrix_items.id |
| 4 | choice_value_id | integer | 32 | NULL | | | → lookup_values.id |
| 5 | rating | smallint | 16 | NULL | | | |
| 6 | other_text | text | | NULL | | | |

## 39. response_shares
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('response_shares_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | question_id | integer | 32 | NN | | | → survey_questions.id |
| 4 | option_id | integer | 32 | NN | | | → lookup_values.id |
| 5 | percent_value | numeric | 5 | NN | | | |
| 6 | other_text | text | | NULL | | | |

## 40. role_permissions
Composite PK.

| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | role_id | smallint | 16 | NN | PK | → roles.id (CASCADE) |
| 2 | permission_id | smallint | 16 | NN | PK | → permissions.id (CASCADE) |

## 41. roles
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | smallint | 16 | NN | PK, ID | nextval('roles_id_seq') |
| 2 | code | varchar | 30 | NN | | |
| 3 | name | varchar | 60 | NN | | |
| 4 | description | text | | NULL | | |

## 42. sec_b_operations
PK = response_id (1:1 with survey_responses).

The table below records the historical nine-column snapshot. Migration 09 adds a nullable `working_months_per_year` smallint with a 1–12 check; it does not change the existing generated hours columns.

| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | response_id | uuid | | NN | PK | | → survey_responses.id (CASCADE) |
| 2 | operating_months | ARRAY | | NULL | | | |
| 3 | operation_status_id | integer | 32 | NULL | | | → lookup_values.id |
| 4 | closure_reason | text | | NULL | | | |
| 5 | daily_shift_id | integer | 32 | NULL | | | → lookup_values.id |
| 6 | daily_hours | numeric | 4 | NULL | | | |
| 7 | working_days_per_week | smallint | 16 | NULL | | 6 | |
| 8 | weekly_hours | numeric | 5 | NULL | generated | | |
| 9 | monthly_hours | numeric | 6 | NULL | generated | | |

## 43. sec_e_supply_chain
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | response_id | uuid | | NN | PK | → survey_responses.id (CASCADE) |
| 2 | active_suppliers_id | integer | 32 | NULL | | → lookup_values.id |
| 3 | supplier_dependency_id | integer | 32 | NULL | | → lookup_values.id |
| 4 | procurement_mode_id | integer | 32 | NULL | | → lookup_values.id |
| 5 | had_supply_disruption | boolean | | NULL | | |
| 6 | ontime_delivery_id | integer | 32 | NULL | | → lookup_values.id |
| 7 | product_acceptance_id | integer | 32 | NULL | | → lookup_values.id |

## 44. sec_f_market
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | response_id | uuid | | NN | PK | → survey_responses.id (CASCADE) |
| 2 | global_supply_chain_id | integer | 32 | NULL | | → lookup_values.id |
| 3 | active_buyers_id | integer | 32 | NULL | | → lookup_values.id |
| 4 | buyer_availability_id | integer | 32 | NULL | | → lookup_values.id |
| 5 | sales_mode_id | integer | 32 | NULL | | → lookup_values.id |
| 6 | payment_terms_id | integer | 32 | NULL | | → lookup_values.id |
| 7 | had_demand_gap | boolean | | NULL | | |
| 8 | subcontract_id | integer | 32 | NULL | | → lookup_values.id |

## 45. sec_g_technology
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | response_id | uuid | | NN | PK | → survey_responses.id (CASCADE) |
| 2 | plant_processing_capacity | text | | NULL | | |
| 3 | utilization_rate_id | integer | 32 | NULL | | → lookup_values.id |
| 4 | integration_level_id | integer | 32 | NULL | | → lookup_values.id |
| 5 | machine_source_id | integer | 32 | NULL | | → lookup_values.id |
| 6 | spare_parts_source_id | integer | 32 | NULL | | → lookup_values.id |
| 7 | breakdown_frequency_id | integer | 32 | NULL | | → lookup_values.id |
| 8 | maintenance_approach_id | integer | 32 | NULL | | → lookup_values.id |
| 9 | production_planning_id | integer | 32 | NULL | | → lookup_values.id |
| 10 | inventory_system_id | integer | 32 | NULL | | → lookup_values.id |
| 11 | rnd_expenditure_id | integer | 32 | NULL | | → lookup_values.id |

## 46. sec_h_environment
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | response_id | uuid | | NN | PK | → survey_responses.id (CASCADE) |
| 2 | captive_capacity_kw | numeric | 12 | NULL | | |
| 3 | export_capacity_kw | numeric | 12 | NULL | | |

## 47. sec_i_compliance
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | response_id | uuid | | NN | PK | → survey_responses.id (CASCADE) |
| 2 | safety_trained_workers | integer | 32 | NULL | | |

## 48. sec_j_strategy
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | response_id | uuid | | NN | PK | → survey_responses.id (CASCADE) |
| 2 | reinvestment_level_id | integer | 32 | NULL | | → lookup_values.id |
| 3 | reinvestment_area_id | integer | 32 | NULL | | → lookup_values.id |
| 4 | reinvestment_area_other | text | | NULL | | |
| 5 | upscaling_time_id | integer | 32 | NULL | | → lookup_values.id |

## 49. sec_k_future
| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | response_id | uuid | | NN | PK | → survey_responses.id (CASCADE) |
| 2 | has_future_plan | boolean | | NULL | | |
| 3 | most_critical_barrier | text | | NULL | | |

## 50. solid_waste_disposals
Composite PK.

| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | stream_id | bigint | 64 | NN | PK | → solid_waste_streams.id (CASCADE) |
| 2 | disposal_method_id | integer | 32 | NN | PK | → lookup_values.id |
| 3 | other_text | text | | NULL | | |

## 51. solid_waste_streams
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('solid_waste_streams_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | waste_type_id | integer | 32 | NN | | | → lookup_values.id |
| 4 | is_generated | boolean | | NN | | FALSE | |

## 52. spatial_ref_sys
PostGIS SRID catalog.

| # | Column | Type | Len | Null | Key |
|---|--------|------|-----|------|-----|
| 1 | srid | integer | 32 | NN | PK |
| 2 | auth_name | varchar | 256 | NULL | |
| 3 | auth_srid | integer | 32 | NULL | |
| 4 | srtext | varchar | 2048 | NULL | |
| 5 | proj4text | varchar | 2048 | NULL | |

## 53. survey_attachments
| # | Column | Type | Len | Null | Key | Default | FK / Notes |
|---|--------|------|-----|------|-----|---------|------------|
| 1 | id | uuid | | NN | PK | gen_random_uuid() | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | section_code | char | 1 | NULL | | | |
| 4 | file_type | varchar | 20 | NULL | | | |
| 5 | file_name | text | | NULL | | | |
| 6 | storage_path | text | | NN | | | |
| 7 | captured_at | timestamptz | | NULL | | | |
| 8 | photo_type | varchar | 60 | NULL | | | |
| 9 | mime_type | varchar | 100 | NULL | | | |
| 10 | size_bytes | bigint | 64 | NULL | | | |
| 11 | sha256 | char | 64 | NULL | | | |
| 12 | latitude | numeric | 9 | NULL | | | |
| 13 | longitude | numeric | 9 | NULL | | | |
| 14 | accuracy_m | numeric | 8 | NULL | | | |
| 15 | uploaded_by | uuid | | NULL | | | → users.id |
| 16 | created_at | timestamptz | | NN | | now() | |

## 54. survey_forms
| # | Column | Type | Len | Null | Key | Default |
|---|--------|------|-----|------|-----|---------|
| 1 | id | integer | 32 | NN | PK, ID | nextval('survey_forms_id_seq') |
| 2 | code | varchar | 40 | NN | | |
| 3 | title | text | | NN | | |
| 4 | version | integer | 32 | NN | | 1 |
| 5 | is_active | boolean | | NN | | TRUE |
| 6 | created_at | timestamptz | | NN | | now() |

## 55. survey_photo_uploads
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | photo_id | uuid | | NN | PK | | |
| 2 | response_id | uuid | | NN | | | |
| 3 | uploaded_by | uuid | | NN | | | → users.id |
| 4 | photo_type | varchar | 60 | NN | | | |
| 5 | storage_key | text | | NN | | | |
| 6 | mime_type | varchar | 100 | NN | | | |
| 7 | size_bytes | bigint | 64 | NN | | | |
| 8 | sha256 | char | 64 | NN | | | |
| 9 | latitude | numeric | 9 | NN | | | |
| 10 | longitude | numeric | 9 | NN | | | |
| 11 | accuracy_m | numeric | 8 | NN | | | |
| 12 | captured_at | timestamptz | | NN | | | |
| 13 | created_at | timestamptz | | NN | | now() | |

## 56. survey_questions
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('survey_questions_id_seq') | |
| 2 | section_id | integer | 32 | NN | | | → survey_sections.id (CASCADE) |
| 3 | question_code | varchar | 60 | NN | | | |
| 4 | question_no | varchar | 10 | NULL | | | |
| 5 | question_text | text | | NN | | | |
| 6 | answer_type | varchar | 20 | NN | | | |
| 7 | lookup_type_id | integer | 32 | NULL | | | → lookup_types.id |
| 8 | is_required | boolean | | NN | | FALSE | |
| 9 | stored_in | varchar | 80 | NULL | | | |

## 57. survey_responses
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | uuid | | NN | PK | | |
| 2 | form_id | integer | 32 | NN | | | → survey_forms.id |
| 3 | unit_id | uuid | | NN | | | → industrial_units.id |
| 4 | surveyor_id | uuid | | NN | | | → users.id |
| 5 | device_id | varchar | 100 | NULL | | | |
| 6 | gps_lat | numeric | 9 | NULL | | | |
| 7 | gps_lng | numeric | 9 | NULL | | | |
| 8 | gps_accuracy_m | numeric | 8 | NULL | | | |
| 9 | status | varchar | 25 | NN | | 'DRAFT' | |
| 10 | sync_status | varchar | 20 | NN | | 'PENDING' | |
| 11 | started_at | timestamptz | | NN | | | |
| 12 | completed_at | timestamptz | | NULL | | | |
| 13 | submitted_at | timestamptz | | NULL | | | |
| 14 | confirmed_by | uuid | | NULL | | | → users.id |
| 15 | confirmed_at | timestamptz | | NULL | | | |
| 16 | synced_at | timestamptz | | NULL | | | |
| 17 | app_version | varchar | 20 | NULL | | | |

## 58. survey_sections
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('survey_sections_id_seq') | |
| 2 | form_id | integer | 32 | NN | | | → survey_forms.id (CASCADE) |
| 3 | section_code | char | 1 | NN | | | |
| 4 | title | text | | NN | | | |
| 5 | sort_order | smallint | 16 | NN | | 0 | |

## 59. sync_log
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('sync_log_id_seq') | |
| 2 | surveyor_id | uuid | | NN | | | → users.id |
| 3 | device_id | varchar | 100 | NULL | | | |
| 4 | started_at | timestamptz | | NN | | | |
| 5 | finished_at | timestamptz | | NULL | | | |
| 6 | records_sent | integer | 32 | NULL | | 0 | |
| 7 | records_synced | integer | 32 | NULL | | 0 | |
| 8 | records_rejected | integer | 32 | NULL | | 0 | |
| 9 | records_duplicate | integer | 32 | NULL | | 0 | |
| 10 | status | varchar | 20 | NULL | | | |
| 11 | error_message | text | | NULL | | | |

## 60. system_settings
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | key | varchar | 80 | NN | PK | | |
| 2 | value | jsonb | | NN | | | |
| 3 | description | text | | NULL | | | |
| 4 | updated_by | uuid | | NULL | | | → users.id |
| 5 | updated_at | timestamptz | | NN | | now() | |

## 61. tehsils
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | integer | 32 | NN | PK, ID | nextval('tehsils_id_seq') | |
| 2 | district_id | integer | 32 | NN | | | → districts.id |
| 3 | code | varchar | 10 | NN | | | |
| 4 | name | varchar | 80 | NN | | | |
| 5 | geom | geometry(MULTIPOLYGON, 4326) | | NULL | | | |

## 62. unit_approval_log
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('unit_approval_log_id_seq') | |
| 2 | unit_id | uuid | | NN | | | → industrial_units.id |
| 3 | response_id | uuid | | NULL | | | → survey_responses.id |
| 4 | action | varchar | 25 | NN | | | |
| 5 | acted_by | uuid | | NN | | | → users.id |
| 6 | remarks | text | | NULL | | | |
| 7 | acted_at | timestamptz | | NN | | now() | |

## 63. unit_associated_establishments
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('unit_associated_establishments_id_seq') | |
| 2 | unit_id | uuid | | NN | | | → industrial_units.id (CASCADE) |
| 3 | name | text | | NN | | | |
| 4 | address | text | | NULL | | | |
| 5 | major_activity_psic_class_id | integer | 32 | NULL | | | → psic_classes.id |
| 6 | major_activity_text | text | | NULL | | | |

## 64. unit_parent_companies
PK = unit_id (1:1).

| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | unit_id | uuid | | NN | PK | | → industrial_units.id (CASCADE) |
| 2 | company_name | text | | NN | | | |
| 3 | company_address | text | | NULL | | | |
| 4 | phone | varchar | 20 | NULL | | | |
| 5 | cell | varchar | 20 | NULL | | | |
| 6 | email | varchar | 120 | NULL | | | |

## 65. unit_type_psic_classes
Composite PK.

| # | Column | Type | Len | Null | Key | FK |
|---|--------|------|-----|------|-----|----|
| 1 | unit_type_id | integer | 32 | NN | PK | → lookup_values.id |
| 2 | psic_class_id | integer | 32 | NN | PK | → psic_classes.id |

## 66. user_admin_audit
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('user_admin_audit_id_seq') | |
| 2 | actor_id | uuid | | NN | | | → users.id |
| 3 | target_id | uuid | | NN | | | → users.id |
| 4 | action | varchar | 60 | NN | | | |
| 5 | changes | jsonb | | NULL | | | |
| 6 | created_at | timestamptz | | NN | | now() | |

## 67. users
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | uuid | | NN | PK | gen_random_uuid() | |
| 2 | username | varchar | 50 | NN | | | |
| 3 | full_name | varchar | 120 | NN | | | |
| 4 | designation | varchar | 80 | NULL | | | |
| 5 | email | varchar | 120 | NULL | | | |
| 6 | phone | varchar | 20 | NULL | | | |
| 7 | password_hash | text | | NN | | | |
| 8 | role_id | smallint | 16 | NN | | | → roles.id |
| 9 | supervisor_id | uuid | | NULL | | | → users.id |
| 10 | is_active | boolean | | NN | | TRUE | |
| 11 | created_by | uuid | | NULL | | | → users.id |
| 12 | created_at | timestamptz | | NN | | now() | |
| 13 | deactivated_at | timestamptz | | NULL | | | |
| 14 | token_version | integer | 32 | NN | | 0 | |
| 15 | must_change_password | boolean | | NN | | FALSE | |

## 68. v_percentage_checks
View — all columns nullable, no keys.

| # | Column | Type | Null |
|---|--------|------|------|
| 1 | response_id | uuid | NULL |
| 2 | check_name | varchar | NULL |
| 3 | total_pct | numeric | NULL |
| 4 | rule | text | NULL |
| 5 | is_ok | boolean | NULL |

## 69. weights_measures_equipment
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('weights_measures_equipment_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | equipment_type | text | | NN | | | |
| 4 | quantity | integer | 32 | NULL | | | |
| 5 | capacity | text | | NULL | | | |

## 70. workforce_employment
| # | Column | Type | Len | Null | Key | Default | FK / Notes |
|---|--------|------|-----|------|-----|---------|------------|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('workforce_employment_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | gender | varchar | 10 | NN | | | |
| 4 | regular_count | integer | 32 | NN | | 0 | |
| 5 | contract_count | integer | 32 | NN | | 0 | |
| 6 | daily_wage_count | integer | 32 | NN | | 0 | |
| 7 | total_count | integer | 32 | NULL | generated | | |

## 71. workforce_skills
| # | Column | Type | Len | Null | Key | Default | FK |
|---|--------|------|-----|------|-----|---------|----|
| 1 | id | bigint | 64 | NN | PK, ID | nextval('workforce_skills_id_seq') | |
| 2 | response_id | uuid | | NN | | | → survey_responses.id (CASCADE) |
| 3 | gender | varchar | 10 | NN | | | |
| 4 | skill_level_id | integer | 32 | NN | | | → lookup_values.id |
| 5 | headcount | integer | 32 | NN | | 0 | |

---

## Relationship Cheat-Sheet

- **Survey core:** `survey_responses` (id) ← `unit_id` → `industrial_units` (id); `surveyor_id`/`confirmed_by` → `users`.
- **Survey child tables** (all CASCADE on response_id): `boilers_pressure_vessels`, `collaborations`, `critical_machines`, `energy_consumption`, `energy_generation`, `machinery_age_profile`, `major_inputs`, `products`, `response_choices`, `response_matrix_answers`, `response_shares`, `solid_waste_streams`, `survey_attachments`, `weights_measures_equipment`, `workforce_employment`, `workforce_skills`, plus the one-to-one section tables `sec_b_operations`, `sec_e_supply_chain`, `sec_f_market`, `sec_g_technology`, `sec_h_environment`, `sec_i_compliance`, `sec_j_strategy`, `sec_k_future`.
- **Geography chain:** `provinces` → `divisions` → `districts` → `tehsils`; `industrial_units` references all four.
- **Classification chain:** `psic_divisions` → `psic_groups` → `psic_classes`; unit also links via `psic_*_id`.
- **Lookup system:** `lookup_types` → `lookup_values` (option codes); `lookup_value_links` is a self-join parent/child graph.
- **Auth:** `users` → `roles` → `role_permissions` → `permissions`.
- **Survey definition:** `survey_forms` → `survey_sections` → `survey_questions` → `matrix_items`.
- **Audit:** `audit_log`, `response_edit_log`, `user_admin_audit`, `unit_approval_log`, `sync_log`.