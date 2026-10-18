# Indexes & Composite Indexes

## Overview

This document catalogs all indexes in the schema, grouped by type and table. Index naming conventions:

- `*_pkey` — Primary key (unique btree)
- `*_key` — Unique business-key constraint
- `idx_*` — Secondary btree index on foreign keys / filter columns
- `gix_*` — GiST spatial index (PostGIS geometry)
- `*_trgm` / `*_search` — GIN indexes for full-text / trigram search

---

## Index Types Summary

| Type | Access Method | Purpose | Count |
|------|---------------|---------|-------|
| Primary Key | btree (unique) | Row identity | ~45 |
| Unique Business Key | btree (unique) | Uniqueness constraints | ~31 |
| Foreign Key / Filter | btree | Join & filter performance | ~90 |
| Spatial | gist | Geometry bounding-box queries | 8 |
| Full-Text Search | gin (`to_tsvector`) | Text search on descriptions/names | 2 |
| Trigram | gin (`gin_trgm_ops`) | Fuzzy name matching | 1 |

---

## Spatial Indexes (GiST)

| Table | Index Name | Column | Notes |
|-------|-----------|--------|-------|
| `districts` | `gix_districts_geom` | geom | MULTIPOLYGON, SRID 4326 |
| `divisions` | `gix_divisions_geom` | geom | MULTIPOLYGON, SRID 4326 |
| `provinces` | `gix_provinces_geom` | geom | MULTIPOLYGON, SRID 4326 |
| `tehsils` | `gix_tehsils_geom` | geom | MULTIPOLYGON, SRID 4326 |
| `industrial_clusters` | `gix_industrial_clusters_geom` | geom | MULTIPOLYGON, SRID 4326 |
| `industrial_estates` | `gix_industrial_estates_geom` | geom | MULTIPOLYGON, SRID 4326 |
| `industrial_units` | `gix_industrial_units_location` | location | POINT, SRID 4326 |

> Use `ST_Contains`, `ST_Intersects`, `ST_DWithin` on these columns for spatial queries.

---

## Full-Text & Trigram Search Indexes (GIN)

| Table | Index Name | Definition | Purpose |
|-------|-----------|------------|---------|
| `hs_codes` | `idx_hs_codes_search` | `gin (to_tsvector('simple', description))` | Full-text search on HS code descriptions |
| `psic_classes` | `idx_psic_classes_search` | `gin (to_tsvector('simple', name))` | Full-text search on PSIC class names |
| `industrial_units` | `idx_units_name_trgm` | `gin (name gin_trgm_ops)` | Fuzzy/trigram similarity search on unit names (duplicate detection) |

---

## Primary Key Indexes

Every table has a `*_pkey` unique btree index on its primary key column(s):

| Table | PK Index | Columns |
|-------|----------|---------|
| `audit_log` | `audit_log_pkey` | id |
| `backup_log` | `backup_log_pkey` | id |
| `base_map_layers` | `base_map_layers_pkey` | id |
| `boilers_pressure_vessels` | `boilers_pressure_vessels_pkey` | id |
| `collaboration_purposes` | `collaboration_purposes_pkey` | (collaboration_id, purpose_id) |
| `collaborations` | `collaborations_pkey` | id |
| `critical_machines` | `critical_machines_pkey` | id |
| `dashboard_kpi_definitions` | `dashboard_kpi_definitions_pkey` | id |
| `dashboard_saved_filters` | `dashboard_saved_filters_pkey` | id |
| `districts` | `districts_pkey` | id |
| `divisions` | `divisions_pkey` | id |
| `duplicate_flags` | `duplicate_flags_pkey` | id |
| `energy_consumption` | `energy_consumption_pkey` | id |
| `energy_generation` | `energy_generation_pkey` | id |
| `gis_quality_log` | `gis_quality_log_pkey` | id |
| `hs_codes` | `hs_codes_pkey` | id |
| `industrial_clusters` | `industrial_clusters_pkey` | id |
| `industrial_estates` | `industrial_estates_pkey` | id |
| `industrial_units` | `industrial_units_pkey` | id |
| `lookup_types` | `lookup_types_pkey` | id |
| `lookup_value_links` | `lookup_value_links_pkey` | (parent_value_id, child_value_id) |
| `lookup_values` | `lookup_values_pkey` | id |
| `machinery_age_profile` | `machinery_age_profile_pkey` | id |
| `major_inputs` | `major_inputs_pkey` | id |
| `matrix_items` | `matrix_items_pkey` | id |
| `measurement_units` | `measurement_units_pkey` | id |
| `permissions` | `permissions_pkey` | id |
| `product_transformation_stages` | `product_transformation_stages_pkey` | (product_id, stage_id) |
| `products` | `products_pkey` | id |
| `provinces` | `provinces_pkey` | id |
| `psic_classes` | `psic_classes_pkey` | id |
| `psic_divisions` | `psic_divisions_pkey` | id |
| `psic_groups` | `psic_groups_pkey` | id |
| `response_choices` | `response_choices_pkey` | id |
| `response_edit_log` | `response_edit_log_pkey` | id |
| `response_matrix_answers` | `response_matrix_answers_pkey` | id |
| `response_shares` | `response_shares_pkey` | id |
| `role_permissions` | `role_permissions_pkey` | (role_id, permission_id) |
| `roles` | `roles_pkey` | id |
| `sec_b_operations` | `sec_b_operations_pkey` | response_id |
| `sec_e_supply_chain` | `sec_e_supply_chain_pkey` | response_id |
| `sec_f_market` | `sec_f_market_pkey` | response_id |
| `sec_g_technology` | `sec_g_technology_pkey` | response_id |
| `sec_h_environment` | `sec_h_environment_pkey` | response_id |
| `sec_i_compliance` | `sec_i_compliance_pkey` | response_id |
| `sec_j_strategy` | `sec_j_strategy_pkey` | response_id |
| `sec_k_future` | `sec_k_future_pkey` | response_id |
| `solid_waste_disposals` | `solid_waste_disposals_pkey` | (stream_id, disposal_method_id) |
| `solid_waste_streams` | `solid_waste_streams_pkey` | id |
| `spatial_ref_sys` | `spatial_ref_sys_pkey` | srid |
| `survey_attachments` | `survey_attachments_pkey` | id |
| `survey_forms` | `survey_forms_pkey` | id |
| `survey_questions` | `survey_questions_pkey` | id |
| `survey_responses` | `survey_responses_pkey` | id |
| `survey_sections` | `survey_sections_pkey` | id |
| `sync_log` | `sync_log_pkey` | id |
| `system_settings` | `system_settings_pkey` | key |
| `tehsils` | `tehsils_pkey` | id |
| `unit_approval_log` | `unit_approval_log_pkey` | id |
| `unit_associated_establishments` | `unit_associated_establishments_pkey` | id |
| `unit_parent_companies` | `unit_parent_companies_pkey` | unit_id |
| `users` | `users_pkey` | id |
| `weights_measures_equipment` | `weights_measures_equipment_pkey` | id |
| `workforce_employment` | `workforce_employment_pkey` | id |
| `workforce_skills` | `workforce_skills_pkey` | id |

> Note: Several tables use natural/composite primary keys instead of a surrogate `id` (e.g., `collaboration_purposes`, `lookup_value_links`, `product_transformation_stages`, `role_permissions`, `solid_waste_disposals`, and the one-to-one `sec_*` tables keyed on `response_id`).

---

## Unique Business-Key Indexes

| Table | Index Name | Columns |
|-------|-----------|---------|
| `collaborations` | `collaborations_response_id_collaborator_type_id_key` | (response_id, collaborator_type_id) |
| `dashboard_kpi_definitions` | `dashboard_kpi_definitions_code_key` | (code) |
| `districts` | `districts_code_key` | (code) |
| `divisions` | `divisions_code_key` | (code) |
| `energy_consumption` | `energy_consumption_response_id_energy_source_id_key` | (response_id, energy_source_id) |
| `energy_generation` | `energy_generation_response_id_power_source_id_key` | (response_id, power_source_id) |
| `hs_codes` | `hs_codes_code_key` | (code) |
| `industrial_units` | `industrial_units_unit_code_key` | (unit_code) |
| `lookup_types` | `lookup_types_code_key` | (code) |
| `lookup_values` | `lookup_values_type_id_code_key` | (type_id, code) |
| `machinery_age_profile` | `machinery_age_profile_response_id_age_bracket_id_key` | (response_id, age_bracket_id) |
| `matrix_items` | `matrix_items_question_id_item_code_key` | (question_id, item_code) |
| `measurement_units` | `measurement_units_code_key` | (code) |
| `permissions` | `permissions_code_key` | (code) |
| `provinces` | `provinces_code_key` | (code) |
| `psic_classes` | `psic_classes_code_key` | (code) |
| `psic_divisions` | `psic_divisions_code_key` | (code) |
| `psic_groups` | `psic_groups_code_key` | (code) |
| `response_choices` | `response_choices_response_id_question_id_option_id_key` | (response_id, question_id, option_id) |
| `response_matrix_answers` | `response_matrix_answers_response_id_item_id_key` | (response_id, item_id) |
| `response_shares` | `response_shares_response_id_question_id_option_id_key` | (response_id, question_id, option_id) |
| `roles` | `roles_code_key` | (code) |
| `solid_waste_streams` | `solid_waste_streams_response_id_waste_type_id_key` | (response_id, waste_type_id) |
| `survey_forms` | `survey_forms_code_version_key` | (code, version) |
| `survey_questions` | `survey_questions_question_code_key` | (question_code) |
| `survey_sections` | `survey_sections_form_id_section_code_key` | (form_id, section_code) |
| `tehsils` | `tehsils_code_key` | (code) |
| `tehsils` | `tehsils_district_id_name_key` | (district_id, name) |
| `users` | `users_email_key` | (email) |
| `users` | `users_username_key` | (username) |
| `workforce_employment` | `workforce_employment_response_id_gender_key` | (response_id, gender) |
| `workforce_skills` | `workforce_skills_response_id_gender_skill_level_id_key` | (response_id, gender, skill_level_id) |

---

## Foreign-Key / Filter Indexes (btree)

### `audit_log`
- `idx_audit_log_changed_by` — (changed_by)

### `boilers_pressure_vessels`
- `idx_boilers_pressure_vessels_response_id` — (response_id)

### `collaboration_purposes`
- `idx_collaboration_purposes_purpose_id` — (purpose_id)

### `collaborations`
- `idx_collaborations_collaborator_type_id` — (collaborator_type_id)
- `idx_collaborations_response_id` — (response_id)

### `critical_machines`
- `idx_critical_machines_response_id` — (response_id)

### `dashboard_saved_filters`
- `idx_dashboard_saved_filters_user_id` — (user_id)

### `districts`
- `idx_districts_division_id` — (division_id)

### `divisions`
- `idx_divisions_province_id` — (province_id)

### `duplicate_flags`
- `idx_duplicate_flags_matched_unit_id` — (matched_unit_id)
- `idx_duplicate_flags_resolved_by` — (resolved_by)
- `idx_duplicate_flags_unit_id` — (unit_id)

### `energy_consumption`
- `idx_energy_consumption_energy_source_id` — (energy_source_id)
- `idx_energy_consumption_response_id` — (response_id)
- `idx_energy_consumption_unit_id` — (unit_id)

### `energy_generation`
- `idx_energy_generation_power_source_id` — (power_source_id)
- `idx_energy_generation_response_id` — (response_id)

### `gis_quality_log`
- `idx_gis_quality_log_unit_id` — (unit_id)

### `industrial_clusters`
- `idx_industrial_clusters_district_id` — (district_id)

### `industrial_estates`
- `idx_industrial_estates_district_id` — (district_id)

### `industrial_units`
- `idx_industrial_units_created_by` — (created_by)
- `idx_industrial_units_district_id` — (district_id)
- `idx_industrial_units_division_id` — (division_id)
- `idx_industrial_units_industrial_cluster_id` — (industrial_cluster_id)
- `idx_industrial_units_industrial_estate_id` — (industrial_estate_id)
- `idx_industrial_units_legal_structure_id` — (legal_structure_id)
- `idx_industrial_units_ownership_type_id` — (ownership_type_id)
- `idx_industrial_units_province_id` — (province_id)
- `idx_industrial_units_psic_class_id` — (psic_class_id)
- `idx_industrial_units_psic_division_id` — (psic_division_id)
- `idx_industrial_units_psic_group_id` — (psic_group_id)
- `idx_industrial_units_tehsil_id` — (tehsil_id)
- `idx_industrial_units_total_area_unit_id` — (total_area_unit_id)
- `idx_industrial_units_zone_type_id` — (zone_type_id)

### `lookup_value_links`
- `idx_lookup_value_links_child_value_id` — (child_value_id)

### `lookup_values`
- `idx_lookup_values_type_id` — (type_id)

### `machinery_age_profile`
- `idx_machinery_age_profile_age_bracket_id` — (age_bracket_id)
- `idx_machinery_age_profile_response_id` — (response_id)

### `major_inputs`
- `idx_major_inputs_hs_code_id` — (hs_code_id)
- `idx_major_inputs_response_id` — (response_id)
- `idx_major_inputs_transformation_stage_id` — (transformation_stage_id)
- `idx_major_inputs_unit_id` — (unit_id)

### `matrix_items`
- `idx_matrix_items_question_id` — (question_id)
- `idx_matrix_items_scale_type_id` — (scale_type_id)

### `product_transformation_stages`
- `idx_product_transformation_stages_stage_id` — (stage_id)

### `products`
- `idx_products_annual_production_unit_id` — (annual_production_unit_id)
- `idx_products_daily_output_unit_id` — (daily_output_unit_id)
- `idx_products_hs_code_id` — (hs_code_id)
- `idx_products_response_id` — (response_id)
- `idx_products_unit_of_measurement_id` — (unit_of_measurement_id)

### `psic_classes`
- `idx_psic_classes_group_id` — (group_id)

### `psic_groups`
- `idx_psic_groups_division_id` — (division_id)

### `response_choices`
- `idx_response_choices_option_id` — (option_id)
- `idx_response_choices_question_id` — (question_id)
- `idx_response_choices_response_id` — (response_id)

### `response_edit_log`
- `idx_response_edit_log_edited_by` — (edited_by)
- `idx_response_edit_log_response_id` — (response_id)

### `response_matrix_answers`
- `idx_response_matrix_answers_choice_value_id` — (choice_value_id)
- `idx_response_matrix_answers_item_id` — (item_id)
- `idx_response_matrix_answers_response_id` — (response_id)

### `response_shares`
- `idx_response_shares_option_id` — (option_id)
- `idx_response_shares_question_id` — (question_id)
- `idx_response_shares_response_id` — (response_id)

### `role_permissions`
- `idx_role_permissions_permission_id` — (permission_id)

### `sec_b_operations`
- `idx_sec_b_operations_daily_shift_id` — (daily_shift_id)
- `idx_sec_b_operations_operation_status_id` — (operation_status_id)

### `sec_e_supply_chain`
- `idx_sec_e_supply_chain_active_suppliers_id` — (active_suppliers_id)
- `idx_sec_e_supply_chain_ontime_delivery_id` — (ontime_delivery_id)
- `idx_sec_e_supply_chain_procurement_mode_id` — (procurement_mode_id)
- `idx_sec_e_supply_chain_product_acceptance_id` — (product_acceptance_id)
- `idx_sec_e_supply_chain_supplier_dependency_id` — (supplier_dependency_id)

### `sec_f_market`
- `idx_sec_f_market_active_buyers_id` — (active_buyers_id)
- `idx_sec_f_market_buyer_availability_id` — (buyer_availability_id)
- `idx_sec_f_market_global_supply_chain_id` — (global_supply_chain_id)
- `idx_sec_f_market_payment_terms_id` — (payment_terms_id)
- `idx_sec_f_market_sales_mode_id` — (sales_mode_id)
- `idx_sec_f_market_subcontract_id` — (subcontract_id)

### `sec_g_technology`
- `idx_sec_g_technology_breakdown_frequency_id` — (breakdown_frequency_id)
- `idx_sec_g_technology_integration_level_id` — (integration_level_id)
- `idx_sec_g_technology_inventory_system_id` — (inventory_system_id)
- `idx_sec_g_technology_machine_source_id` — (machine_source_id)
- `idx_sec_g_technology_maintenance_approach_id` — (maintenance_approach_id)
- `idx_sec_g_technology_production_planning_id` — (production_planning_id)
- `idx_sec_g_technology_rnd_expenditure_id` — (rnd_expenditure_id)
- `idx_sec_g_technology_spare_parts_source_id` — (spare_parts_source_id)
- `idx_sec_g_technology_utilization_rate_id` — (utilization_rate_id)

### `sec_j_strategy`
- `idx_sec_j_strategy_reinvestment_area_id` — (reinvestment_area_id)
- `idx_sec_j_strategy_reinvestment_level_id` — (reinvestment_level_id)
- `idx_sec_j_strategy_upscaling_time_id` — (upscaling_time_id)

### `solid_waste_disposals`
- `idx_solid_waste_disposals_disposal_method_id` — (disposal_method_id)

### `solid_waste_streams`
- `idx_solid_waste_streams_response_id` — (response_id)
- `idx_solid_waste_streams_waste_type_id` — (waste_type_id)

### `survey_attachments`
- `idx_survey_attachments_response_id` — (response_id)

### `survey_questions`
- `idx_survey_questions_lookup_type_id` — (lookup_type_id)
- `idx_survey_questions_section_id` — (section_id)

### `survey_responses`
- `idx_responses_status` — (status)
- `idx_responses_sync_status` — (sync_status)
- `idx_survey_responses_confirmed_by` — (confirmed_by)
- `idx_survey_responses_form_id` — (form_id)
- `idx_survey_responses_surveyor_id` — (surveyor_id)
- `idx_survey_responses_unit_id` — (unit_id)

### `survey_sections`
- `idx_survey_sections_form_id` — (form_id)

### `sync_log`
- `idx_sync_log_surveyor_id` — (surveyor_id)

### `system_settings`
- `idx_system_settings_updated_by` — (updated_by)

### `tehsils`
- `idx_tehsils_district_id` — (district_id)

### `unit_approval_log`
- `idx_unit_approval_log_acted_by` — (acted_by)
- `idx_unit_approval_log_response_id` — (response_id)
- `idx_unit_approval_log_unit_id` — (unit_id)

### `unit_associated_establishments`
- `idx_unit_associated_establishments_major_activity_psic_class_id` — (major_activity_psic_class_id)
- `idx_unit_associated_establishments_unit_id` — (unit_id)

### `users`
- `idx_users_created_by` — (created_by)
- `idx_users_role_id` — (role_id)
- `idx_users_supervisor_id` — (supervisor_id)

### `weights_measures_equipment`
- `idx_weights_measures_equipment_response_id` — (response_id)

### `workforce_employment`
- `idx_workforce_employment_response_id` — (response_id)

### `workforce_skills`
- `idx_workforce_skills_response_id` — (response_id)
- `idx_workforce_skills_skill_level_id` — (skill_level_id)

---

## Composite Index Notes

Composite **unique** indexes (multi-column) that support common query patterns:

| Table | Composite Key | Typical Query |
|-------|--------------|---------------|
| `collaborations` | (response_id, collaborator_type_id) | Fetch collaborations by response + type |
| `energy_consumption` | (response_id, energy_source_id) | One row per source per response |
| `energy_generation` | (response_id, power_source_id) | One row per source per response |
| `machinery_age_profile` | (response_id, age_bracket_id) | One row per bracket per response |
| `matrix_items` | (question_id, item_code) | Items scoped to a question |
| `response_choices` | (response_id, question_id, option_id) | Dedupe selected options |
| `response_matrix_answers` | (response_id, item_id) | One answer per matrix item |
| `response_shares` | (response_id, question_id, option_id) | One share per option |
| `solid_waste_streams` | (response_id, waste_type_id) | One stream per waste type |
| `survey_forms` | (code, version) | Form versioning |
| `survey_sections` | (form_id, section_code) | Sections per form |
| `tehsils` | (district_id, name) | Name unique within district |
| `workforce_employment` | (response_id, gender) | One row per gender |
| `workforce_skills` | (response_id, gender, skill_level_id) | One row per gender+skill |

---

## Performance Recommendations

1. **Spatial queries**: Use the `gix_*` GiST indexes with `ST_Intersects`, `ST_Contains`, `ST_DWithin`. Always filter with a bounding box (`&&`) before expensive operations.
2. **Fuzzy unit-name search**: Use `idx_units_name_trgm` with the `%` operator or `similarity()` for duplicate detection.
3. **Full-text search**: Use `idx_hs_codes_search` and `idx_psic_classes_search` with `to_tsvector('simple', ...) @@ to_tsquery(...)`.
4. **Response aggregation**: The `idx_survey_responses_unit_id`, `idx_responses_status`, and `idx_responses_sync_status` indexes support dashboard KPI queries filtering by unit, status, or sync state.
5. **Survey child tables**: Every `response_id` FK is indexed, so joining a response to all its child records is efficient.
6. **Lookup resolution**: `idx_lookup_values_type_id` supports loading all values of a lookup type (e.g., all `ownership_type` options).