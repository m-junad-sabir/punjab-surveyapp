# Database Schema: Master Inspection System

> Schema exported from PostgreSQL (PostGIS-enabled). Contains survey, inspection, GIS, audit, and lookup tables for industrial unit inspections.
> Total tables: ~95. Source: `Master Inspection Query New (3).csv`

---

## Table of Contents

- [Core Identity & Auth](#core-identity--auth)
- [Geography & GIS](#geography--gis)
- [Industrial Units](#industrial-units)
- [Survey Forms & Questions](#survey-forms--questions)
- [Survey Responses & Sections](#survey-responses--sections)
- [Survey Detail Tables](#survey-detail-tables)
- [Products & Industry Options](#products--industry-options)
- [Lookups & Reference Data](#lookups--reference-data)
- [Classification (PSIC / HS)](#classification-psic--hs)
- [Audit, Logs & System](#audit-logs--system)
- [Views & PostGIS System Tables](#views--postgis-system-tables)

---

## Legend

- `PK` = primary key
- `FK → table.column` = foreign key
- `NN` = NOT NULL
- `?` = nullable
- `DEF` = default value
- `GEN` = generated/identity column
- `GEO:type:srid` = geometry column

---

## Core Identity & Auth

### `users`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | uuid | | NN | gen_random_uuid() | PK |
| username | varchar | 50 | NN | | |
| full_name | varchar | 120 | NN | | |
| designation | varchar | 80 | ? | | |
| email | varchar | 120 | ? | | |
| phone | varchar | 20 | ? | | |
| password_hash | text | | NN | | |
| role_id | smallint | 16 | NN | | FK → roles.id |
| supervisor_id | uuid | | ? | | FK → users.id |
| is_active | boolean | | NN | true | |
| created_by | uuid | | ? | | FK → users.id |
| created_at | timestamptz | | NN | now() | |
| deactivated_at | timestamptz | | ? | | |
| token_version | integer | 32 | NN | 0 | |
| must_change_password | boolean | | NN | false | |

### `roles`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | smallint | 16 | NN | nextval(roles_id_seq) | PK, GEN |
| code | varchar | 30 | NN | | |
| name | varchar | 60 | NN | | |
| description | text | | ? | | |

### `permissions`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | smallint | 16 | NN | nextval(permissions_id_seq) | PK, GEN |
| code | varchar | 60 | NN | | |
| description | text | | ? | | |

### `role_permissions`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| role_id | smallint | 16 | NN | | PK, FK → roles.id (CASCADE) |
| permission_id | smallint | 16 | NN | | PK, FK → permissions.id (CASCADE) |

### `user_admin_audit`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| actor_id | uuid | | NN | | FK → users.id |
| target_id | uuid | | NN | | FK → users.id |
| action | varchar | 60 | NN | | |
| changes | jsonb | | ? | | |
| created_at | timestamptz | | NN | now() | |

---

## Geography & GIS

### `provinces`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | smallint | 16 | NN | nextval(...) | PK, GEN |
| code | varchar | 10 | NN | | |
| name | varchar | 80 | NN | | |
| geom | geometry | | ? | | GEO:MULTIPOLYGON:4326 |

### `divisions`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| province_id | smallint | 16 | NN | | FK → provinces.id |
| code | varchar | 10 | NN | | |
| name | varchar | 80 | NN | | |
| geom | geometry | | ? | | GEO:MULTIPOLYGON:4326 |

### `districts`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| division_id | integer | 32 | NN | | FK → divisions.id |
| code | varchar | 10 | NN | | |
| name | varchar | 80 | NN | | |
| geom | geometry | | ? | | GEO:MULTIPOLYGON:4326 |

### `tehsils`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| district_id | integer | 32 | NN | | FK → districts.id |
| code | varchar | 10 | NN | | |
| name | varchar | 80 | NN | | |
| geom | geometry | | ? | | GEO:MULTIPOLYGON:4326 |

### `industrial_clusters`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| name | text | | NN | | |
| district_id | integer | 32 | ? | | FK → districts.id |
| geom | geometry | | ? | | GEO:MULTIPOLYGON:4326 |

### `industrial_estates`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| name | text | | NN | | |
| district_id | integer | 32 | ? | | FK → districts.id |
| geom | geometry | | ? | | GEO:MULTIPOLYGON:4326 |

---

## Industrial Units

### `industrial_units`
> Central entity. All survey responses and GIS quality logs reference this table.

| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | uuid | | NN | gen_random_uuid() | PK |
| unit_code | varchar | 30 | ? | | |
| name | text | | NN | | |
| establishment_year | smallint | 16 | ? | | |
| location | geometry | | ? | | GEO:POINT:4326 |
| gps_accuracy_m | numeric | 8 | ? | | |
| address | text | | ? | | |
| province_id | smallint | 16 | ? | | FK → provinces.id |
| division_id | integer | 32 | ? | | FK → divisions.id |
| district_id | integer | 32 | ? | | FK → districts.id |
| tehsil_id | integer | 32 | ? | | FK → tehsils.id |
| contact_name | varchar | 120 | ? | | |
| contact_phone | varchar | 20 | ? | | |
| contact_email | varchar | 120 | ? | | |
| website | varchar | 200 | ? | | |
| psic_division_id | integer | 32 | ? | | FK → psic_divisions.id |
| psic_group_id | integer | 32 | ? | | FK → psic_groups.id |
| psic_class_id | integer | 32 | ? | | FK → psic_classes.id |
| zone_type_id | integer | 32 | ? | | FK → lookup_values.id |
| ownership_type_id | integer | 32 | ? | | FK → lookup_values.id |
| ownership_other_text | text | | ? | | |
| legal_structure_id | integer | 32 | ? | | FK → lookup_values.id |
| legal_structure_other_text | text | | ? | | |
| has_parent_company | boolean | | ? | | |
| total_area_value | numeric | 14 | ? | | |
| total_area_unit_id | integer | 32 | ? | | FK → measurement_units.id |
| industrial_estate_id | integer | 32 | ? | | FK → industrial_estates.id |
| industrial_cluster_id | integer | 32 | ? | | FK → industrial_clusters.id |
| approval_status | varchar | 20 | NN | 'PENDING' | |
| created_by | uuid | | ? | | FK → users.id |
| created_at | timestamptz | | NN | now() | |
| updated_at | timestamptz | | NN | now() | |
| province_name | text | | NN | | |
| division_name | text | | NN | | |
| district_name | text | | NN | | |
| tehsil_name | text | | NN | | |
| psic_division_text | text | | ? | | |
| psic_group_text | text | | ? | | |
| psic_class_text | text | | ? | | |
| zone_type_other_text | text | | ? | | |
| industrial_estate_text | text | | ? | | |
| industrial_cluster_text | text | | ? | | |
| unit_type_id | integer | 32 | ? | | FK → lookup_values.id |
| unit_type_other_text | text | | ? | | |
| total_capital_investment | numeric | 18 | ? | | |
| capital_investment_unit_id | integer | 32 | ? | | FK → lookup_values.id |

### `unit_parent_companies`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| unit_id | uuid | | NN | | PK, FK → industrial_units.id (CASCADE) |
| company_name | text | | NN | | |
| company_address | text | | ? | | |
| phone | varchar | 20 | ? | | |
| cell | varchar | 20 | ? | | |
| email | varchar | 120 | ? | | |

### `unit_associated_establishments`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| unit_id | uuid | | NN | | FK → industrial_units.id (CASCADE) |
| name | text | | NN | | |
| address | text | | ? | | |
| major_activity_psic_class_id | integer | 32 | ? | | FK → psic_classes.id |
| major_activity_text | text | | ? | | |

### `unit_approval_log`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| unit_id | uuid | | NN | | FK → industrial_units.id |
| response_id | uuid | | ? | | FK → survey_responses.id |
| action | varchar | 25 | NN | | |
| acted_by | uuid | | NN | | FK → users.id |
| remarks | text | | ? | | |
| acted_at | timestamptz | | NN | now() | |

### `duplicate_flags`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| unit_id | uuid | | NN | | FK → industrial_units.id |
| matched_unit_id | uuid | | NN | | FK → industrial_units.id |
| reason | varchar | 30 | NN | | |
| name_similarity | numeric | 4 | ? | | |
| distance_m | numeric | 10 | ? | | |
| resolution | varchar | 25 | NN | 'OPEN' | |
| resolved_by | uuid | | ? | | FK → users.id |
| resolved_at | timestamptz | | ? | | |
| created_at | timestamptz | | NN | now() | |
| details | text | | ? | | |

### `gis_quality_log`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| unit_id | uuid | | NN | | FK → industrial_units.id |
| check_type | varchar | 40 | NN | | |
| result | varchar | 10 | NN | | |
| detail | text | | ? | | |
| checked_at | timestamptz | | NN | now() | |

---

## Survey Forms & Questions

### `survey_forms`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| code | varchar | 40 | NN | | |
| title | text | | NN | | |
| version | integer | 32 | NN | 1 | |
| is_active | boolean | | NN | true | |
| created_at | timestamptz | | NN | now() | |

### `survey_sections`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| form_id | integer | 32 | NN | | FK → survey_forms.id (CASCADE) |
| section_code | char | 1 | NN | | |
| title | text | | NN | | |
| sort_order | smallint | 16 | NN | 0 | |

### `survey_questions`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| section_id | integer | 32 | NN | | FK → survey_sections.id (CASCADE) |
| question_code | varchar | 60 | NN | | |
| question_no | varchar | 10 | ? | | |
| question_text | text | | NN | | |
| answer_type | varchar | 20 | NN | | |
| lookup_type_id | integer | 32 | ? | | FK → lookup_types.id |
| is_required | boolean | | NN | false | |
| stored_in | varchar | 80 | ? | | |

### `matrix_items`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| question_id | integer | 32 | NN | | FK → survey_questions.id (CASCADE) |
| group_label | varchar | 100 | ? | | |
| item_code | varchar | 60 | NN | | |
| item_label | text | | NN | | |
| answer_type | varchar | 15 | NN | | |
| scale_type_id | integer | 32 | ? | | FK → lookup_types.id |
| allows_text | boolean | | NN | false | |
| sort_order | smallint | 16 | NN | 0 | |

---

## Survey Responses & Sections

### `survey_responses`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | uuid | | NN | | PK |
| form_id | integer | 32 | NN | | FK → survey_forms.id |
| unit_id | uuid | | NN | | FK → industrial_units.id |
| surveyor_id | uuid | | NN | | FK → users.id |
| device_id | varchar | 100 | ? | | |
| gps_lat | numeric | 9 | ? | | |
| gps_lng | numeric | 9 | ? | | |
| gps_accuracy_m | numeric | 8 | ? | | |
| status | varchar | 25 | NN | 'DRAFT' | |
| sync_status | varchar | 20 | NN | 'PENDING' | |
| started_at | timestamptz | | NN | | |
| completed_at | timestamptz | | ? | | |
| submitted_at | timestamptz | | ? | | |
| confirmed_by | uuid | | ? | | FK → users.id |
| confirmed_at | timestamptz | | ? | | |
| synced_at | timestamptz | | ? | | |
| app_version | varchar | 20 | ? | | |

### `response_choices`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| response_id | uuid | | NN | | FK → survey_responses.id (CASCADE) |
| question_id | integer | 32 | NN | | FK → survey_questions.id |
| option_id | integer | 32 | NN | | FK → lookup_values.id |
| other_text | text | | ? | | |

### `response_matrix_answers`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| response_id | uuid | | NN | | FK → survey_responses.id (CASCADE) |
| item_id | integer | 32 | NN | | FK → matrix_items.id |
| choice_value_id | integer | 32 | ? | | FK → lookup_values.id |
| rating | smallint | 16 | ? | | |
| other_text | text | | ? | | |

### `response_shares`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| response_id | uuid | | NN | | FK → survey_responses.id (CASCADE) |
| question_id | integer | 32 | NN | | FK → survey_questions.id |
| option_id | integer | 32 | NN | | FK → lookup_values.id |
| percent_value | numeric | 5 | NN | | |
| other_text | text | | ? | | |

### `response_interviewees`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| response_id | uuid | | NN | | FK → survey_responses.id (CASCADE) |
| name | text | | NN | | |
| designation | text | | NN | | |
| contact_number | varchar | 11 | NN | | |

### `response_edit_log`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| response_id | uuid | | NN | | FK → survey_responses.id (CASCADE) |
| edited_by | uuid | | NN | | FK → users.id |
| table_name | varchar | 60 | NN | | |
| record_id | text | | ? | | |
| field_name | varchar | 80 | ? | | |
| old_value | jsonb | | ? | | |
| new_value | jsonb | | ? | | |
| edited_at | timestamptz | | NN | now() | |

### `survey_attachments`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | uuid | | NN | gen_random_uuid() | PK |
| response_id | uuid | | NN | | FK → survey_responses.id (CASCADE) |
| section_code | char | 1 | ? | | |
| file_type | varchar | 20 | ? | | |
| file_name | text | | ? | | |
| storage_path | text | | NN | | |
| captured_at | timestamptz | | ? | | |
| photo_type | varchar | 60 | ? | | |
| mime_type | varchar | 100 | ? | | |
| size_bytes | bigint | 64 | ? | | |
| sha256 | char | 64 | ? | | |
| latitude | numeric | 9 | ? | | |
| longitude | numeric | 9 | ? | | |
| accuracy_m | numeric | 8 | ? | | |
| uploaded_by | uuid | | ? | | FK → users.id |
| created_at | timestamptz | | NN | now() | |

### `survey_photo_uploads`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| photo_id | uuid | | NN | | PK |
| response_id | uuid | | NN | | |
| uploaded_by | uuid | | NN | | FK → users.id |
| photo_type | varchar | 60 | NN | | |
| storage_key | text | | NN | | |
| mime_type | varchar | 100 | NN | | |
| size_bytes | bigint | 64 | NN | | |
| sha256 | char | 64 | NN | | |
| latitude | numeric | 9 | NN | | |
| longitude | numeric | 9 | NN | | |
| accuracy_m | numeric | 8 | NN | | |
| captured_at | timestamptz | | NN | | |
| created_at | timestamptz | | NN | now() | |

---

## Survey Detail Tables

> All detail tables below share `response_id uuid NN FK → survey_responses.id ON DELETE CASCADE` unless noted.

### Section B — `sec_b_operations`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| operating_months | ARRAY | | ? | | |
| operation_status_id | integer | 32 | ? | | FK → lookup_values.id |
| closure_reason | text | | ? | | |
| daily_shift_id | integer | 32 | ? | | FK → lookup_values.id |
| daily_hours | numeric | 4 | ? | | |
| working_days_per_week | smallint | 16 | ? | 6 | |
| weekly_hours | numeric | 5 | ? | | GEN |
| monthly_hours | numeric | 6 | ? | | GEN |
| working_months_per_year | smallint | 16 | ? | | |

### Section E — `sec_e_supply_chain`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| active_suppliers_id | integer | 32 | ? | | FK → lookup_values.id |
| supplier_dependency_id | integer | 32 | ? | | FK → lookup_values.id |
| procurement_mode_id | integer | 32 | ? | | FK → lookup_values.id |
| had_supply_disruption | boolean | | ? | | |
| ontime_delivery_id | integer | 32 | ? | | FK → lookup_values.id |
| product_acceptance_id | integer | 32 | ? | | FK → lookup_values.id |

### Section F — `sec_f_market`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| global_supply_chain_id | integer | 32 | ? | | FK → lookup_values.id |
| active_buyers_id | integer | 32 | ? | | FK → lookup_values.id |
| buyer_availability_id | integer | 32 | ? | | FK → lookup_values.id |
| sales_mode_id | integer | 32 | ? | | FK → lookup_values.id |
| payment_terms_id | integer | 32 | ? | | FK → lookup_values.id |
| had_demand_gap | boolean | | ? | | |
| subcontract_id | integer | 32 | ? | | FK → lookup_values.id |

### Section G — `sec_g_technology`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| plant_processing_capacity | text | | ? | | |
| utilization_rate_id | integer | 32 | ? | | FK → lookup_values.id |
| integration_level_id | integer | 32 | ? | | FK → lookup_values.id |
| machine_source_id | integer | 32 | ? | | FK → lookup_values.id |
| spare_parts_source_id | integer | 32 | ? | | FK → lookup_values.id |
| breakdown_frequency_id | integer | 32 | ? | | FK → lookup_values.id |
| maintenance_approach_id | integer | 32 | ? | | FK → lookup_values.id |
| production_planning_id | integer | 32 | ? | | FK → lookup_values.id |
| inventory_system_id | integer | 32 | ? | | FK → lookup_values.id |
| rnd_expenditure_id | integer | 32 | ? | | FK → lookup_values.id |
| has_innovation_plan | boolean | | ? | | |
| machinery_age_legacy_counts | jsonb | | ? | | |

### Section H — `sec_h_environment`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| captive_capacity_kw | numeric | 12 | ? | | |
| export_capacity_kw | numeric | 12 | ? | | |
| has_water_waste_management | boolean | | ? | | |
| has_solid_waste_generation | boolean | | ? | | |
| has_green_practices | boolean | | ? | | |

### Section I — `sec_i_compliance`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| safety_trained_workers | integer | 32 | ? | | |
| has_factory_compliance | boolean | | ? | | |
| has_certifications | boolean | | ? | | |

### Section J — `sec_j_strategy`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| reinvestment_level_id | integer | 32 | ? | | FK → lookup_values.id |
| reinvestment_area_id | integer | 32 | ? | | FK → lookup_values.id |
| reinvestment_area_other | text | | ? | | |
| upscaling_time_id | integer | 32 | ? | | FK → lookup_values.id |
| has_strategic_business_plan | boolean | | ? | | |
| has_operational_planning | boolean | | ? | | |

### Section K — `sec_k_future`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| response_id | uuid | | NN | | PK, FK → survey_responses.id (CASCADE) |
| has_future_plan | boolean | | ? | | |
| most_critical_barrier | text | | ? | | |
| has_barriers | boolean | | ? | | |

### Other response-linked tables
- `boilers_pressure_vessels` — boiler/pressure vessel records (FKs: response_id, type_id, pressure_unit_id, heating_surface_unit_id → lookup_values)
- `critical_machines` — FK machine_option_id → industry_machine_options.id
- `energy_consumption` — FK energy_source_id → lookup_values, unit_id → measurement_units
- `energy_generation` — FK power_source_id → lookup_values
- `machinery_age_profile` — FK age_bracket_id → lookup_values
- `major_inputs` — FK unit_id → measurement_units, hs_code_id → hs_codes, transformation_stage_id → lookup_values
- `products` — FK daily_output_unit_id / annual_production_unit_id / unit_of_measurement_id → measurement_units, hs_code_id → hs_codes
- `solid_waste_streams` — FK waste_type_id → lookup_values; child `solid_waste_disposals`
- `weights_measures_equipment` — FKs equipment_type_id / capacity_unit_id → lookup_values
- `workforce_employment` — gender-based counts (regular, contract, daily_wage, total GEN)
- `workforce_skills` — FK skill_level_id → lookup_values
- `collaborations` + `collaboration_purposes` (junction)
- `response_choices`, `response_matrix_answers`, `response_shares`, `response_interviewees`

---

## Products & Industry Options

### `products`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| response_id | uuid | | NN | | FK → survey_responses.id (CASCADE) |
| product_kind | varchar | 10 | NN | | |
| product_name | text | | NN | | |
| daily_avg_output | numeric | 18 | ? | | |
| daily_output_unit_id | integer | 32 | ? | | FK → measurement_units.id |
| annual_production | numeric | 18 | ? | | |
| annual_production_unit_id | integer | 32 | ? | | FK → measurement_units.id |
| installed_capacity | numeric | 18 | ? | | |
| installed_capacity_period | varchar | 10 | ? | | |
| unit_of_measurement_id | integer | 32 | ? | | FK → measurement_units.id |
| revenue_share_pct | numeric | 5 | ? | | |
| hs_code_id | integer | 32 | ? | | FK → hs_codes.id |
| sort_order | smallint | 16 | ? | 0 | |
| hs_code_text | text | | ? | | |

### `product_transformation_stages`
> Junction. Note: source CSV shows duplicate/ambiguous `product_id` FK rows (to `products.id` and `products.product_kind`) — likely a view or denormalized export. Canonical link is to `products.id`.

| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| product_id | bigint | 64 | NN | | PK, FK → products.id (CASCADE) |
| stage_id | integer | 32 | NN | | PK, FK → lookup_values.id |
| main_product_kind | varchar | 10 | NN | 'MAIN' | |

### `industry_machine_options`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| unit_type_id | integer | 32 | NN | | FK → lookup_values.id |
| machine_name | text | | NN | | |
| specification | text | | NN | | |
| sort_order | smallint | 16 | NN | | |
| is_active | boolean | | NN | true | |

### `industry_product_options`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| unit_type_id | integer | 32 | NN | | FK → lookup_values.id |
| product_kind | varchar | 10 | NN | | |
| product_name | text | | NN | | |
| sort_order | smallint | 16 | NN | | |
| is_active | boolean | | NN | true | |

### `unit_type_psic_classes`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| unit_type_id | integer | 32 | NN | | PK, FK → lookup_values.id |
| psic_class_id | integer | 32 | NN | | PK, FK → psic_classes.id |

---

## Lookups & Reference Data

### `lookup_types`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| code | varchar | 50 | NN | | |
| name | varchar | 100 | NN | | |
| description | text | | ? | | |

### `lookup_values`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| type_id | integer | 32 | NN | | FK → lookup_types.id (CASCADE) |
| code | varchar | 60 | NN | | |
| label | text | | NN | | |
| requires_text | boolean | | NN | false | |
| numeric_value | numeric | 10 | ? | | |
| sort_order | smallint | 16 | NN | 0 | |
| is_active | boolean | | NN | true | |

### `lookup_value_links`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| parent_value_id | integer | 32 | NN | | PK, FK → lookup_values.id (CASCADE) |
| child_value_id | integer | 32 | NN | | PK, FK → lookup_values.id (CASCADE) |

### `measurement_units`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| code | varchar | 20 | NN | | |
| name | varchar | 60 | NN | | |
| unit_kind | varchar | 20 | NN | | |

### `product_measurement_units`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| unit_id | integer | 32 | NN | | PK, FK → measurement_units.id |
| display_label | text | | NN | | |
| sort_order | smallint | 16 | NN | | |
| is_active | boolean | | NN | true | |
| product_only | boolean | | NN | false | |

### `energy_source_units`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| energy_source_id | integer | 32 | NN | | PK, FK → lookup_values.id |
| unit_id | integer | 32 | NN | | PK, FK → measurement_units.id |

### `section_g_unit_conversions`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| unit_id | integer | 32 | NN | | PK, FK → lookup_values.id |
| base_unit | text | | ? | | |
| factor_to_base | numeric | | ? | | |

### `hs_codes`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| code | varchar | 12 | NN | | |
| description | text | | NN | | |

---

## Classification (PSIC / HS)

### `psic_divisions`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| code | varchar | 10 | NN | | |
| name | text | | NN | | |

### `psic_groups`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| division_id | integer | 32 | NN | | FK → psic_divisions.id |
| code | varchar | 10 | NN | | |
| name | text | | NN | | |

### `psic_classes`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| group_id | integer | 32 | NN | | FK → psic_groups.id |
| code | varchar | 10 | NN | | |
| name | text | | NN | | |

---

## Audit, Logs & System

### `audit_log`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| table_name | varchar | 60 | NN | | |
| record_id | text | | ? | | |
| action | varchar | 10 | NN | | |
| old_data | jsonb | | ? | | |
| new_data | jsonb | | ? | | |
| changed_by | uuid | | ? | | FK → users.id |
| changed_at | timestamptz | | NN | now() | |

### `backup_log`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| backup_type | varchar | 15 | NN | | |
| started_at | timestamptz | | NN | | |
| finished_at | timestamptz | | ? | | |
| status | varchar | 10 | NN | | |
| size_mb | numeric | 12 | ? | | |
| storage_location | text | | ? | | |
| verified | boolean | | NN | false | |

### `sync_log`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| surveyor_id | uuid | | NN | | FK → users.id |
| device_id | varchar | 100 | ? | | |
| started_at | timestamptz | | NN | | |
| finished_at | timestamptz | | ? | | |
| records_sent | integer | 32 | ? | 0 | |
| records_synced | integer | 32 | ? | 0 | |
| records_rejected | integer | 32 | ? | 0 | |
| records_duplicate | integer | 32 | ? | 0 | |
| status | varchar | 20 | ? | | |
| error_message | text | | ? | | |

### `system_settings`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| key | varchar | 80 | NN | | PK |
| value | jsonb | | NN | | |
| description | text | | ? | | |
| updated_by | uuid | | ? | | FK → users.id |
| updated_at | timestamptz | | NN | now() | |

### `dashboard_kpi_definitions`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| code | varchar | 50 | NN | | |
| name | text | | NN | | |
| description | text | | ? | | |
| sql_view_name | varchar | 80 | NN | | |
| unit_label | varchar | 30 | ? | | |
| is_active | boolean | | NN | true | |

### `dashboard_saved_filters`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | bigint | 64 | NN | nextval(...) | PK, GEN |
| user_id | uuid | | NN | | FK → users.id (CASCADE) |
| name | varchar | 100 | NN | | |
| filter_json | jsonb | | NN | | |
| created_at | timestamptz | | NN | now() | |

### `base_map_layers`
| Column | Type | Len | Null | Default | Key |
|---|---|---|---|---|---|
| id | integer | 32 | NN | nextval(...) | PK, GEN |
| name | varchar | 80 | NN | | |
| layer_type | varchar | 15 | NN | | |
| url_template | text | | NN | | |
| attribution | text | | ? | | |
| is_default | boolean | | NN | false | |
| is_active | boolean | | NN | true | |

---

## Views & PostGIS System Tables

- `v_percentage_checks` — view exposing response percentage validation results
  - `response_id uuid`, `check_name varchar`, `total_pct numeric`, `rule text`, `is_ok boolean`
- `geography_columns`, `geometry_columns` — PostGIS system views
- `spatial_ref_sys` — PostGIS SRID reference table

---

## Key Relationships (Quick Reference)
industrial_units
├── survey_responses (unit_id)
│ └── ~30 detail tables (response_id ON DELETE CASCADE)
├── unit_parent_companies (unit_id CASCADE)
├── unit_associated_establishments (unit_id CASCADE)
├── unit_approval_log (unit_id)
├── duplicate_flags (unit_id, matched_unit_id)
├── gis_quality_log (unit_id)

provinces → divisions → districts → tehsils (hierarchy)
districts → industrial_estates / industrial_clusters
psic_divisions → psic_groups → psic_classes

lookup_types → lookup_values ← (referenced by ~40 FKs)
users ← (surveyor_id, created_by, confirmed_by, uploaded_by, acted_by, changed_by, ...)
roles ↔ permissions (role_permissions)


---

## Notes for AI Agents

1. **Geometry columns** use SRID 4326 (WGS84). Point = industrial unit location; MultiPolygon = administrative boundaries.
2. **Generated columns**: `sec_b_operations.weekly_hours`, `monthly_hours`, `workforce_employment.total_count` — do not insert.
3. **Soft-cascades**: detail tables use `ON DELETE CASCADE` from `survey_responses`; most FK lookups use `NO ACTION`.
4. **Enums stored as varchar** (e.g., `approval_status`, `status`, `sync_status`, `action`, `resolution`).
5. **Duplicate rows in source CSV** for `product_transformation_stages.product_id` / `main_product_kind` reflect denormalized foreign keys; treat `products.id` as canonical.
6. **Text mirror columns** exist on `industrial_units` (e.g., `province_name`, `psic_class_text`) — denormalized for reporting, not FKs.