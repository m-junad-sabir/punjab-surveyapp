# Unique & Check Constraints

## Overview

This document lists all `UNIQUE` and `CHECK` constraints in the schema. `NOT NULL` constraints are also included (auto-generated names such as `2200_*_not_null`). Constraint names follow the pattern `<table>_<column>_<suffix>_key` for unique constraints and `<table>_<column>_check` for check constraints.

---

## Unique Constraints

| Table | Constraint Name | Columns |
|-------|-----------------|---------|
| `divisions` | `divisions_code_key` | code |
| `districts` | `districts_code_key` | code |
| `tehsils` | `tehsils_code_key` | code |
| `tehsils` | `tehsils_district_id_name_key` | district_id, name |
| `provinces` | `provinces_code_key` | code |
| `psic_classes` | `psic_classes_code_key` | code |
| `psic_divisions` | `psic_divisions_code_key` | code |
| `psic_groups` | `psic_groups_code_key` | code |
| `hs_codes` | `hs_codes_code_key` | code |
| `measurement_units` | `measurement_units_code_key` | code |
| `lookup_types` | `lookup_types_code_key` | code |
| `lookup_values` | `lookup_values_type_id_code_key` | type_id, code |
| `roles` | `roles_code_key` | code |
| `permissions` | `permissions_code_key` | code |
| `users` | `users_email_key` | email |
| `users` | `users_username_key` | username |
| `industrial_units` | `industrial_units_unit_code_key` | unit_code |
| `survey_forms` | `survey_forms_code_version_key` | code, version |
| `survey_questions` | `survey_questions_question_code_key` | question_code |
| `survey_sections` | `survey_sections_form_id_section_code_key` | form_id, section_code |
| `matrix_items` | `matrix_items_question_id_item_code_key` | question_id, item_code |
| `dashboard_kpi_definitions` | `dashboard_kpi_definitions_code_key` | code |
| `collaborations` | `collaborations_response_id_collaborator_type_id_key` | response_id, collaborator_type_id |
| `energy_consumption` | `energy_consumption_response_id_energy_source_id_key` | response_id, energy_source_id |
| `energy_generation` | `energy_generation_response_id_power_source_id_key` | response_id, power_source_id |
| `machinery_age_profile` | `machinery_age_profile_response_id_age_bracket_id_key` | response_id, age_bracket_id |
| `response_choices` | `response_choices_response_id_question_id_option_id_key` | response_id, question_id, option_id |
| `response_matrix_answers` | `response_matrix_answers_response_id_item_id_key` | response_id, item_id |
| `response_shares` | `response_shares_response_id_question_id_option_id_key` | response_id, question_id, option_id |
| `solid_waste_streams` | `solid_waste_streams_response_id_waste_type_id_key` | response_id, waste_type_id |
| `workforce_employment` | `workforce_employment_response_id_gender_key` | response_id, gender |
| `workforce_skills` | `workforce_skills_response_id_gender_skill_level_id_key` | response_id, gender, skill_level_id |

---

## Check Constraints (Domain / Value Constraints)

### Enumeration-Style Checks

| Table | Constraint Name | Check Clause |
|-------|-----------------|--------------|
| `spatial_ref_sys` | `spatial_ref_sys_srid_check` | `srid > 0 AND srid <= 998999` |
| `audit_log` | `audit_log_action_check` | `action IN ('INSERT','UPDATE','DELETE')` |
| `backup_log` | `backup_log_backup_type_check` | `backup_type IN ('FULL','INCREMENTAL')` |
| `backup_log` | `backup_log_status_check` | `status IN ('SUCCESS','FAILED')` |
| `base_map_layers` | `base_map_layers_layer_type_check` | `layer_type IN ('SATELLITE','STREET','LICENSED')` |
| `duplicate_flags` | `duplicate_flags_reason_check` | `reason IN ('NAME_SIMILARITY','GPS_PROXIMITY','BOTH')` |
| `duplicate_flags` | `duplicate_flags_resolution_check` | `resolution IN ('OPEN','CONFIRMED_DUPLICATE','NOT_DUPLICATE','MERGED')` |
| `gis_quality_log` | `gis_quality_log_result_check` | `result IN ('PASS','FAIL')` |
| `industrial_units` | `industrial_units_approval_status_check` | `approval_status IN ('PENDING','CONFIRMED','RETURNED','REJECTED')` |
| `matrix_items` | `matrix_items_answer_type_check` | `answer_type IN ('CHOICE','RATING_1_5')` |
| `measurement_units` | `measurement_units_unit_kind_check` | `unit_kind IN ('AREA','QUANTITY','ENERGY','POWER','OTHER')` |
| `products` | `products_installed_capacity_period_check` | `installed_capacity_period IN ('PER_DAY','PER_MONTH')` |
| `products` | `products_product_kind_check` | `product_kind IN ('MAIN','SECONDARY')` |
| `survey_questions` | `survey_questions_answer_type_check` | `answer_type IN ('TEXT','NUMBER','YES_NO','SINGLE_CHOICE','MULTI_CHOICE','SHARE_PERCENT','MATRIX','REPEATING_GROUP')` |
| `survey_responses` | `survey_responses_status_check` | `status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','RETURNED','REJECTED')` |
| `survey_responses` | `survey_responses_sync_status_check` | `sync_status IN ('PENDING','SYNCED','REJECTED','DUPLICATE')` |
| `unit_approval_log` | `unit_approval_log_action_check` | `action IN ('SUBMITTED','CONFIRMED','RETURNED','REJECTED')` |
| `workforce_employment` | `workforce_employment_gender_check` | `gender IN ('MALE','FEMALE')` |
| `workforce_skills` | `workforce_skills_gender_check` | `gender IN ('MALE','FEMALE')` |

### Range / Numeric Checks

| Table | Constraint Name | Check Clause |
|-------|-----------------|--------------|
| `critical_machines` | `critical_machines_quantity_check` | `quantity >= 0` |
| `energy_consumption` | `energy_consumption_share_pct_check` | `share_pct >= 0 AND share_pct <= 100` |
| `industrial_units` | `industrial_units_establishment_year_check` | `establishment_year >= 1800 AND establishment_year <= 2100` |
| `machinery_age_profile` | `machinery_age_profile_machine_count_check` | `machine_count >= 0` |
| `major_inputs` | `major_inputs_cost_share_pct_check` | `cost_share_pct >= 0 AND cost_share_pct <= 100` |
| `response_matrix_answers` | `response_matrix_answers_rating_check` | `rating >= 1 AND rating <= 5` |
| `products` | `products_revenue_share_pct_check` | `revenue_share_pct >= 0 AND revenue_share_pct <= 100` |
| `response_shares` | `response_shares_percent_value_check` | `percent_value >= 0 AND percent_value <= 100` |
| `sec_b_operations` | `sec_b_operations_working_days_per_week_check` | `working_days_per_week >= 1 AND working_days_per_week <= 7` |
| `sec_i_compliance` | `sec_i_compliance_safety_trained_workers_check` | `safety_trained_workers >= 0` |
| `weights_measures_equipment` | `weights_measures_equipment_quantity_check` | `quantity >= 0` |
| `workforce_employment` | `workforce_employment_contract_count_check` | `contract_count >= 0` |
| `workforce_employment` | `workforce_employment_daily_wage_count_check` | `daily_wage_count >= 0` |
| `workforce_employment` | `workforce_employment_regular_count_check` | `regular_count >= 0` |
| `workforce_skills` | `workforce_skills_headcount_check` | `headcount >= 0` |

### Cross-Column / Conditional Checks

| Table | Constraint Name | Check Clause |
|-------|-----------------|--------------|
| `products` | `products_check` | `product_kind = 'MAIN' OR (revenue_share_pct IS NULL AND hs_code_id IS NULL)` |
| `response_matrix_answers` | `response_matrix_answers_check` | `num_nonnulls(choice_value_id, rating) <= 1` |

---

## NOT NULL Constraints (Auto-generated)

These are system-generated check constraints enforcing `NOT NULL` on columns. They are listed per table with the columns that are `NOT NULL`.

| Table | NOT NULL Columns |
|-------|------------------|
| `spatial_ref_sys` | srid |
| `boilers_pressure_vessels` | id, response_id, vessel_type |
| `backup_log` | id, backup_type, started_at, status, verified |
| `base_map_layers` | id, name, layer_type, url_template, is_default, is_active |
| `collaborations` | id, response_id, collaborator_type_id |
| `dashboard_saved_filters` | id, user_id, name, filter_json, created_at |
| `dashboard_kpi_definitions` | id, code, name, sql_view_name, is_active |
| `audit_log` | id, table_name, action, changed_at |
| `critical_machines` | id, response_id, machine_name |
| `duplicate_flags` | id, unit_id, matched_unit_id, reason, resolution, created_at |
| `energy_consumption` | id, response_id, energy_source_id |
| `energy_generation` | id, response_id, power_source_id |
| `gis_quality_log` | id, unit_id, check_type, result, checked_at |
| `industrial_estates` | id, name |
| `lookup_value_links` | parent_value_id, child_value_id |
| `lookup_values` | id, type_id, code, label, requires_text, sort_order, is_active |
| `machinery_age_profile` | id, response_id, age_bracket_id, machine_count |
| `industrial_clusters` | id, name |
| `hs_codes` | id, code, description |
| `industrial_units` | id, name, approval_status, created_at, updated_at, province_name, division_name, district_name, tehsil_name |
| `lookup_types` | id, code, name |
| `major_inputs` | id, response_id, input_name |
| `psic_classes` | id, group_id, code, name |
| `measurement_units` | id, code, name, unit_kind |
| `matrix_items` | id, question_id, item_code, item_label, answer_type, allows_text, sort_order |
| `permissions` | id, code |
| `psic_divisions` | id, code, name |
| `products` | id, response_id, product_kind, product_name |
| `response_edit_log` | id, response_id, edited_by, table_name, edited_at |
| `response_choices` | id, response_id, question_id, option_id |
| `survey_questions` | id, section_id, question_code, question_text, answer_type, is_required |
| `sec_b_operations` | response_id |
| `sec_e_supply_chain` | response_id |
| `sec_i_compliance` | response_id |
| `sec_j_strategy` | response_id |
| `sec_k_future` | response_id |
| `solid_waste_disposals` | stream_id, disposal_method_id |
| `solid_waste_streams` | id, response_id, waste_type_id, is_generated |
| `survey_forms` | id, code, title, version, is_active, created_at |
| `role_permissions` | role_id, permission_id |
| `response_matrix_answers` | id, response_id, item_id |
| `survey_responses` | id, form_id, unit_id, surveyor_id, status, sync_status, started_at |
| `response_shares` | id, response_id, question_id, option_id, percent_value |
| `roles` | id, code, name |
| `sec_f_market` | response_id |
| `sec_g_technology` | response_id |
| `survey_attachments` | id, response_id, storage_path |
| `system_settings` | key, value, updated_at |
| `unit_approval_log` | id, unit_id, action, acted_by, acted_at |
| `survey_sections` | id, form_id, section_code, title, sort_order |
| `unit_associated_establishments` | id, unit_id, name |
| `unit_parent_companies` | unit_id, company_name |
| `weights_measures_equipment` | id, response_id, equipment_type |
| `tehsils` | id, district_id, code, name |
| `workforce_employment` | id, response_id, gender, regular_count, contract_count, daily_wage_count |
| `workforce_skills` | id, response_id, gender, skill_level_id, headcount |
| `sync_log` | id, surveyor_id, started_at |
| `users` | id, username, full_name, password_hash, role_id, is_active, created_at |
| `collaboration_purposes` | collaboration_id, purpose_id |
| `divisions` | id, province_id, code, name |
| `districts` | id, division_id, code, name |
| `provinces` | id, code, name |
| `psic_groups` | id, division_id, code, name |
| `product_transformation_stages` | product_id, stage_id |
| `sec_h_environment` | response_id |

---

## Summary of Constraint Types

| Type | Count | Notes |
|------|-------|-------|
| UNIQUE | 31 | Business keys and composite uniqueness |
| CHECK (enumeration) | 19 | Value must be in a fixed set |
| CHECK (range) | 15 | Numeric bounds |
| CHECK (cross-column) | 2 | Conditional/mutually-exclusive logic |
| NOT NULL | ~190 | Per-column, auto-named |

### Key Business Rules Encoded

1. **Survey status workflow**: `DRAFT` → `PENDING_CONFIRMATION` → `CONFIRMED` / `RETURNED` / `REJECTED`
2. **Sync lifecycle**: `PENDING` → `SYNCED` / `REJECTED` / `DUPLICATE`
3. **Unit approval**: `PENDING` → `CONFIRMED` / `RETURNED` / `REJECTED`
4. **Percentage fields** (`share_pct`, `cost_share_pct`, `revenue_share_pct`, `percent_value`) must be 0–100
5. **Rating** for matrix items must be 1–5
6. **Products**: only `MAIN` products may have `revenue_share_pct` and `hs_code_id`; `SECONDARY` products must have both `NULL`
7. **Matrix answers**: at most one of `choice_value_id` or `rating` may be set
8. **Gender** limited to `MALE`/`FEMALE` in workforce tables
9. **Establishment year** bounded 1800–2100
10. **Working days per week** bounded 1–7