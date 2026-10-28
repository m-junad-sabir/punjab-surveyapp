# Indexes & Composite Indexes

> Source: `Indexes & Composite Indexes (2).csv`
> Companion to: `Master_Inspection_Schema.md` and `Unique_Check_Constraints.md`
> Conventions:
> - `pkey` = primary-key backing index (UNIQUE btree).
> - `*_key` = UNIQUE constraint backing index.
> - `idx_*` = plain btree performance index.
> - `gix_*` = GiST spatial index (PostGIS geometry).
> - `gin` = GIN index (full-text or trigram).
> - Partial/expression indexes are called out explicitly.

## Index Legend

| Prefix | Access Method | Purpose |
|--------|---------------|---------|
| `*_pkey` | btree UNIQUE | Primary key |
| `*_key` | btree UNIQUE | UNIQUE constraint |
| `idx_*` | btree | Foreign-key / filter lookups |
| `gix_*` | gist | Spatial (geometry) queries |
| `*_search` | gin | Full-text search (`to_tsvector`) |
| `*_trgm` | gin | Trigram fuzzy match (`gin_trgm_ops`) |

---

## Special / Non-Btree Indexes (agent quick-reference)

| Table | Index | Type | Definition | Purpose |
|-------|-------|------|------------|---------|
| districts | gix_districts_geom | GiST | `(geom)` | Spatial queries |
| divisions | gix_divisions_geom | GiST | `(geom)` | Spatial queries |
| provinces | gix_provinces_geom | GiST | `(geom)` | Spatial queries |
| tehsils | gix_tehsils_geom | GiST | `(geom)` | Spatial queries |
| industrial_clusters | gix_industrial_clusters_geom | GiST | `(geom)` | Spatial queries |
| industrial_estates | gix_industrial_estates_geom | GiST | `(geom)` | Spatial queries |
| industrial_units | gix_industrial_units_location | GiST | `(location)` | Point/radius queries |
| industrial_units | idx_units_name_trgm | GIN | `(name gin_trgm_ops)` | Fuzzy unit-name search |
| hs_codes | idx_hs_codes_search | GIN | `to_tsvector('simple', description)` | Full-text HS description search |
| psic_classes | idx_psic_classes_search | GIN | `to_tsvector('simple', name)` | Full-text PSIC class search |
| user_admin_audit | idx_user_admin_audit_actor_created | btree | `(actor_id, created_at DESC)` | Recent actions by actor |
| user_admin_audit | idx_user_admin_audit_target_created | btree | `(target_id, created_at DESC)` | Recent actions on target |
| survey_photo_uploads | idx_survey_photo_uploads_owner_response | btree | `(uploaded_by, response_id)` | Owner + response lookups |

---

## Per-Table Index Inventory

### audit_log
- `audit_log_pkey` — UNIQUE btree (id)
- `idx_audit_log_changed_by` — btree (changed_by)

### backup_log
- `backup_log_pkey` — UNIQUE btree (id)

### base_map_layers
- `base_map_layers_pkey` — UNIQUE btree (id)

### boilers_pressure_vessels
- `boilers_pressure_vessels_pkey` — UNIQUE btree (id)
- `idx_boilers_pressure_vessels_response_id` — btree (response_id)

### collaboration_purposes
- `collaboration_purposes_pkey` — UNIQUE btree (collaboration_id, purpose_id) — composite PK
- `idx_collaboration_purposes_purpose_id` — btree (purpose_id)

### collaborations
- `collaborations_pkey` — UNIQUE btree (id)
- `collaborations_response_id_collaborator_type_id_key` — UNIQUE btree (response_id, collaborator_type_id) — composite
- `idx_collaborations_collaborator_type_id` — btree (collaborator_type_id)
- `idx_collaborations_response_id` — btree (response_id)

### critical_machines
- `critical_machines_pkey` — UNIQUE btree (id)
- `idx_critical_machines_response_id` — btree (response_id)

### dashboard_kpi_definitions
- `dashboard_kpi_definitions_code_key` — UNIQUE btree (code)
- `dashboard_kpi_definitions_pkey` — UNIQUE btree (id)

### dashboard_saved_filters
- `dashboard_saved_filters_pkey` — UNIQUE btree (id)
- `idx_dashboard_saved_filters_user_id` — btree (user_id)

### districts
- `districts_code_key` — UNIQUE btree (code)
- `districts_pkey` — UNIQUE btree (id)
- `gix_districts_geom` — GiST (geom)
- `idx_districts_division_id` — btree (division_id)

### divisions
- `divisions_code_key` — UNIQUE btree (code)
- `divisions_pkey` — UNIQUE btree (id)
- `gix_divisions_geom` — GiST (geom)
- `idx_divisions_province_id` — btree (province_id)

### duplicate_flags
- `duplicate_flags_pkey` — UNIQUE btree (id)
- `idx_duplicate_flags_matched_unit_id` — btree (matched_unit_id)
- `idx_duplicate_flags_resolved_by` — btree (resolved_by)
- `idx_duplicate_flags_unit_id` — btree (unit_id)

### energy_consumption
- `energy_consumption_pkey` — UNIQUE btree (id)
- `energy_consumption_response_id_energy_source_id_key` — UNIQUE btree (response_id, energy_source_id) — composite
- `idx_energy_consumption_energy_source_id` — btree (energy_source_id)
- `idx_energy_consumption_response_id` — btree (response_id)
- `idx_energy_consumption_unit_id` — btree (unit_id)

### energy_generation
- `energy_generation_pkey` — UNIQUE btree (id)
- `energy_generation_response_id_power_source_id_key` — UNIQUE btree (response_id, power_source_id) — composite
- `idx_energy_generation_power_source_id` — btree (power_source_id)
- `idx_energy_generation_response_id` — btree (response_id)

### gis_quality_log
- `gis_quality_log_pkey` — UNIQUE btree (id)
- `idx_gis_quality_log_unit_id` — btree (unit_id)

### hs_codes
- `hs_codes_code_key` — UNIQUE btree (code)
- `hs_codes_pkey` — UNIQUE btree (id)
- `idx_hs_codes_search` — GIN `to_tsvector('simple', description)`

### industrial_clusters
- `gix_industrial_clusters_geom` — GiST (geom)
- `idx_industrial_clusters_district_id` — btree (district_id)
- `industrial_clusters_pkey` — UNIQUE btree (id)

### industrial_estates
- `gix_industrial_estates_geom` — GiST (geom)
- `idx_industrial_estates_district_id` — btree (district_id)
- `industrial_estates_pkey` — UNIQUE btree (id)

### industrial_units
- `industrial_units_pkey` — UNIQUE btree (id)
- `industrial_units_unit_code_key` — UNIQUE btree (unit_code)
- `gix_industrial_units_location` — GiST (location)
- `idx_units_name_trgm` — GIN (name gin_trgm_ops) fuzzy search
- `idx_industrial_units_created_by` — btree (created_by)
- `idx_industrial_units_district_id` — btree (district_id)
- `idx_industrial_units_division_id` — btree (division_id)
- `idx_industrial_units_industrial_cluster_id` — btree (industrial_cluster_id)
- `idx_industrial_units_industrial_estate_id` — btree (industrial_estate_id)
- `idx_industrial_units_legal_structure_id` — btree (legal_structure_id)
- `idx_industrial_units_ownership_type_id` — btree (ownership_type_id)
- `idx_industrial_units_province_id` — btree (province_id)
- `idx_industrial_units_psic_class_id` — btree (psic_class_id)
- `idx_industrial_units_psic_division_id` — btree (psic_division_id)
- `idx_industrial_units_psic_group_id` — btree (psic_group_id)
- `idx_industrial_units_tehsil_id` — btree (tehsil_id)
- `idx_industrial_units_total_area_unit_id` — btree (total_area_unit_id)
- `idx_industrial_units_zone_type_id` — btree (zone_type_id)

### lookup_types
- `lookup_types_code_key` — UNIQUE btree (code)
- `lookup_types_pkey` — UNIQUE btree (id)

### lookup_value_links
- `idx_lookup_value_links_child_value_id` — btree (child_value_id)
- `lookup_value_links_pkey` — UNIQUE btree (parent_value_id, child_value_id) — composite PK

### lookup_values
- `idx_lookup_values_type_id` — btree (type_id)
- `lookup_values_pkey` — UNIQUE btree (id)
- `lookup_values_type_id_code_key` — UNIQUE btree (type_id, code) — composite

### machinery_age_profile
- `machinery_age_profile_pkey` — UNIQUE btree (id)
- `machinery_age_profile_response_id_age_bracket_id_key` — UNIQUE btree (response_id, age_bracket_id) — composite
- `idx_machinery_age_profile_age_bracket_id` — btree (age_bracket_id)
- `idx_machinery_age_profile_response_id` — btree (response_id)

### major_inputs
- `major_inputs_pkey` — UNIQUE btree (id)
- `idx_major_inputs_hs_code_id` — btree (hs_code_id)
- `idx_major_inputs_response_id` — btree (response_id)
- `idx_major_inputs_transformation_stage_id` — btree (transformation_stage_id)
- `idx_major_inputs_unit_id` — btree (unit_id)

### matrix_items
- `matrix_items_pkey` — UNIQUE btree (id)
- `matrix_items_question_id_item_code_key` — UNIQUE btree (question_id, item_code) — composite
- `idx_matrix_items_question_id` — btree (question_id)
- `idx_matrix_items_scale_type_id` — btree (scale_type_id)

### measurement_units
- `measurement_units_code_key` — UNIQUE btree (code)
- `measurement_units_pkey` — UNIQUE btree (id)

### permissions
- `permissions_code_key` — UNIQUE btree (code)
- `permissions_pkey` — UNIQUE btree (id)

### product_transformation_stages
- `product_transformation_stages_pkey` — UNIQUE btree (product_id, stage_id) — composite PK
- `idx_product_transformation_stages_stage_id` — btree (stage_id)

### products
- `products_pkey` — UNIQUE btree (id)
- `idx_products_annual_production_unit_id` — btree (annual_production_unit_id)
- `idx_products_daily_output_unit_id` — btree (daily_output_unit_id)
- `idx_products_hs_code_id` — btree (hs_code_id)
- `idx_products_response_id` — btree (response_id)
- `idx_products_unit_of_measurement_id` — btree (unit_of_measurement_id)

### provinces
- `gix_provinces_geom` — GiST (geom)
- `provinces_code_key` — UNIQUE btree (code)
- `provinces_pkey` — UNIQUE btree (id)

### psic_classes
- `psic_classes_code_key` — UNIQUE btree (code)
- `psic_classes_pkey` — UNIQUE btree (id)
- `idx_psic_classes_group_id` — btree (group_id)
- `idx_psic_classes_search` — GIN `to_tsvector('simple', name)`

### psic_divisions
- `psic_divisions_code_key` — UNIQUE btree (code)
- `psic_divisions_pkey` — UNIQUE btree (id)

### psic_groups
- `psic_groups_code_key` — UNIQUE btree (code)
- `psic_groups_pkey` — UNIQUE btree (id)
- `idx_psic_groups_division_id` — btree (division_id)

### response_choices
- `response_choices_pkey` — UNIQUE btree (id)
- `response_choices_response_id_question_id_option_id_key` — UNIQUE btree (response_id, question_id, option_id) — composite
- `idx_response_choices_option_id` — btree (option_id)
- `idx_response_choices_question_id` — btree (question_id)
- `idx_response_choices_response_id` — btree (response_id)

### response_edit_log
- `response_edit_log_pkey` — UNIQUE btree (id)
- `idx_response_edit_log_edited_by` — btree (edited_by)
- `idx_response_edit_log_response_id` — btree (response_id)

### response_matrix_answers
- `response_matrix_answers_pkey` — UNIQUE btree (id)
- `response_matrix_answers_response_id_item_id_key` — UNIQUE btree (response_id, item_id) — composite
- `idx_response_matrix_answers_choice_value_id` — btree (choice_value_id)
- `idx_response_matrix_answers_item_id` — btree (item_id)
- `idx_response_matrix_answers_response_id` — btree (response_id)

### response_shares
- `response_shares_pkey` — UNIQUE btree (id)
- `response_shares_response_id_question_id_option_id_key` — UNIQUE btree (response_id, question_id, option_id) — composite
- `idx_response_shares_option_id` — btree (option_id)
- `idx_response_shares_question_id` — btree (question_id)
- `idx_response_shares_response_id` — btree (response_id)

### role_permissions
- `role_permissions_pkey` — UNIQUE btree (role_id, permission_id) — composite PK
- `idx_role_permissions_permission_id` — btree (permission_id)

### roles
- `roles_code_key` — UNIQUE btree (code)
- `roles_pkey` — UNIQUE btree (id)

### sec_b_operations
- `sec_b_operations_pkey` — UNIQUE btree (response_id)
- `idx_sec_b_operations_daily_shift_id` — btree (daily_shift_id)
- `idx_sec_b_operations_operation_status_id` — btree (operation_status_id)

### sec_e_supply_chain
- `sec_e_supply_chain_pkey` — UNIQUE btree (response_id)
- `idx_sec_e_supply_chain_active_suppliers_id` — btree (active_suppliers_id)
- `idx_sec_e_supply_chain_ontime_delivery_id` — btree (ontime_delivery_id)
- `idx_sec_e_supply_chain_procurement_mode_id` — btree (procurement_mode_id)
- `idx_sec_e_supply_chain_product_acceptance_id` — btree (product_acceptance_id)
- `idx_sec_e_supply_chain_supplier_dependency_id` — btree (supplier_dependency_id)

### sec_f_market
- `sec_f_market_pkey` — UNIQUE btree (response_id)
- `idx_sec_f_market_active_buyers_id` — btree (active_buyers_id)
- `idx_sec_f_market_buyer_availability_id` — btree (buyer_availability_id)
- `idx_sec_f_market_global_supply_chain_id` — btree (global_supply_chain_id)
- `idx_sec_f_market_payment_terms_id` — btree (payment_terms_id)
- `idx_sec_f_market_sales_mode_id` — btree (sales_mode_id)
- `idx_sec_f_market_subcontract_id` — btree (subcontract_id)

### sec_g_technology
- `sec_g_technology_pkey` — UNIQUE btree (response_id)
- `idx_sec_g_technology_breakdown_frequency_id` — btree (breakdown_frequency_id)
- `idx_sec_g_technology_integration_level_id` — btree (integration_level_id)
- `idx_sec_g_technology_inventory_system_id` — btree (inventory_system_id)
- `idx_sec_g_technology_machine_source_id` — btree (machine_source_id)
- `idx_sec_g_technology_maintenance_approach_id` — btree (maintenance_approach_id)
- `idx_sec_g_technology_production_planning_id` — btree (production_planning_id)
- `idx_sec_g_technology_rnd_expenditure_id` — btree (rnd_expenditure_id)
- `idx_sec_g_technology_spare_parts_source_id` — btree (spare_parts_source_id)
- `idx_sec_g_technology_utilization_rate_id` — btree (utilization_rate_id)

### sec_h_environment
- `sec_h_environment_pkey` — UNIQUE btree (response_id)

### sec_i_compliance
- `sec_i_compliance_pkey` — UNIQUE btree (response_id)

### sec_j_strategy
- `sec_j_strategy_pkey` — UNIQUE btree (response_id)
- `idx_sec_j_strategy_reinvestment_area_id` — btree (reinvestment_area_id)
- `idx_sec_j_strategy_reinvestment_level_id` — btree (reinvestment_level_id)
- `idx_sec_j_strategy_upscaling_time_id` — btree (upscaling_time_id)

### sec_k_future
- `sec_k_future_pkey` — UNIQUE btree (response_id)

### solid_waste_disposals
- `solid_waste_disposals_pkey` — UNIQUE btree (stream_id, disposal_method_id) — composite PK
- `idx_solid_waste_disposals_disposal_method_id` — btree (disposal_method_id)

### solid_waste_streams
- `solid_waste_streams_pkey` — UNIQUE btree (id)
- `solid_waste_streams_response_id_waste_type_id_key` — UNIQUE btree (response_id, waste_type_id) — composite
- `idx_solid_waste_streams_response_id` — btree (response_id)
- `idx_solid_waste_streams_waste_type_id` — btree (waste_type_id)

### spatial_ref_sys
- `spatial_ref_sys_pkey` — UNIQUE btree (srid)

### survey_attachments
- `survey_attachments_pkey` — UNIQUE btree (id)
- `survey_attachments_response_photo_type_key` — UNIQUE btree (response_id, photo_type) — composite
- `idx_survey_attachments_response_id` — btree (response_id)

### survey_forms
- `survey_forms_pkey` — UNIQUE btree (id)
- `survey_forms_code_version_key` — UNIQUE btree (code, version) — composite

### survey_photo_uploads
- `survey_photo_uploads_pkey` — UNIQUE btree (photo_id)
- `survey_photo_uploads_response_id_photo_type_key` — UNIQUE btree (response_id, photo_type) — composite
- `idx_survey_photo_uploads_owner_response` — btree (uploaded_by, response_id) — composite

### survey_questions
- `survey_questions_pkey` — UNIQUE btree (id)
- `survey_questions_question_code_key` — UNIQUE btree (question_code)
- `idx_survey_questions_lookup_type_id` — btree (lookup_type_id)
- `idx_survey_questions_section_id` — btree (section_id)

### survey_responses
- `survey_responses_pkey` — UNIQUE btree (id)
- `idx_responses_status` — btree (status)
- `idx_responses_sync_status` — btree (sync_status)
- `idx_survey_responses_confirmed_by` — btree (confirmed_by)
- `idx_survey_responses_form_id` — btree (form_id)
- `idx_survey_responses_surveyor_id` — btree (surveyor_id)
- `idx_survey_responses_unit_id` — btree (unit_id)

### survey_sections
- `survey_sections_pkey` — UNIQUE btree (id)
- `survey_sections_form_id_section_code_key` — UNIQUE btree (form_id, section_code) — composite
- `idx_survey_sections_form_id` — btree (form_id)

### sync_log
- `sync_log_pkey` — UNIQUE btree (id)
- `idx_sync_log_surveyor_id` — btree (surveyor_id)

### system_settings
- `system_settings_pkey` — UNIQUE btree (key)
- `idx_system_settings_updated_by` — btree (updated_by)

### tehsils
- `tehsils_pkey` — UNIQUE btree (id)
- `tehsils_code_key` — UNIQUE btree (code)
- `tehsils_district_id_name_key` — UNIQUE btree (district_id, name) — composite
- `gix_tehsils_geom` — GiST (geom)
- `idx_tehsils_district_id` — btree (district_id)

### unit_approval_log
- `unit_approval_log_pkey` — UNIQUE btree (id)
- `idx_unit_approval_log_acted_by` — btree (acted_by)
- `idx_unit_approval_log_response_id` — btree (response_id)
- `idx_unit_approval_log_unit_id` — btree (unit_id)

### unit_associated_establishments
- `unit_associated_establishments_pkey` — UNIQUE btree (id)
- `idx_unit_associated_establishments_major_activity_psic_class_id` — btree (major_activity_psic_class_id)
- `idx_unit_associated_establishments_unit_id` — btree (unit_id)

### unit_parent_companies
- `unit_parent_companies_pkey` — UNIQUE btree (unit_id)

### unit_type_psic_classes
- `unit_type_psic_classes_pkey` — UNIQUE btree (unit_type_id, psic_class_id) — composite PK

### user_admin_audit
- `user_admin_audit_pkey` — UNIQUE btree (id)
- `idx_user_admin_audit_actor_created` — btree (actor_id, created_at DESC) — composite
- `idx_user_admin_audit_target_created` — btree (target_id, created_at DESC) — composite

### users
- `users_pkey` — UNIQUE btree (id)
- `users_email_key` — UNIQUE btree (email)
- `users_username_key` — UNIQUE btree (username)
- `idx_users_created_by` — btree (created_by)
- `idx_users_role_id` — btree (role_id)
- `idx_users_supervisor_id` — btree (supervisor_id)

### weights_measures_equipment
- `weights_measures_equipment_pkey` — UNIQUE btree (id)
- `idx_weights_measures_equipment_response_id` — btree (response_id)

### workforce_employment
- `workforce_employment_pkey` — UNIQUE btree (id)
- `workforce_employment_response_id_gender_key` — UNIQUE btree (response_id, gender) — composite
- `idx_workforce_employment_response_id` — btree (response_id)

### workforce_skills
- `workforce_skills_pkey` — UNIQUE btree (id)
- `workforce_skills_response_id_gender_skill_level_id_key` — UNIQUE btree (response_id, gender, skill_level_id) — composite
- `idx_workforce_skills_response_id` — btree (response_id)
- `idx_workforce_skills_skill_level_id` — btree (skill_level_id)

---

## Composite / Multi-Column Index Summary

| Table | Columns | Kind |
|-------|---------|------|
| collaboration_purposes | (collaboration_id, purpose_id) | PK |
| collaborations | (response_id, collaborator_type_id) | UNIQUE |
| energy_consumption | (response_id, energy_source_id) | UNIQUE |
| energy_generation | (response_id, power_source_id) | UNIQUE |
| lookup_value_links | (parent_value_id, child_value_id) | PK |
| lookup_values | (type_id, code) | UNIQUE |
| machinery_age_profile | (response_id, age_bracket_id) | UNIQUE |
| matrix_items | (question_id, item_code) | UNIQUE |
| product_transformation_stages | (product_id, stage_id) | PK |
| response_choices | (response_id, question_id, option_id) | UNIQUE |
| response_matrix_answers | (response_id, item_id) | UNIQUE |
| response_shares | (response_id, question_id, option_id) | UNIQUE |
| role_permissions | (role_id, permission_id) | PK |
| solid_waste_disposals | (stream_id, disposal_method_id) | PK |
| solid_waste_streams | (response_id, waste_type_id) | UNIQUE |
| survey_attachments | (response_id, photo_type) | UNIQUE |
| survey_forms | (code, version) | UNIQUE |
| survey_photo_uploads | (response_id, photo_type) | UNIQUE |
| survey_photo_uploads | (uploaded_by, response_id) | btree (non-unique) |
| survey_sections | (form_id, section_code) | UNIQUE |
| tehsils | (district_id, name) | UNIQUE |
| unit_type_psic_classes | (unit_type_id, psic_class_id) | PK |
| user_admin_audit | (actor_id, created_at DESC) | btree (non-unique) |
| user_admin_audit | (target_id, created_at DESC) | btree (non-unique) |
| workforce_employment | (response_id, gender) | UNIQUE |
| workforce_skills | (response_id, gender, skill_level_id) | UNIQUE |

---

## Foreign-Key Coverage Notes (agent quick-reference)

- Every FK column that appears in a `*_key` UNIQUE or `*_pkey` composite **leading position** is already indexed by that index.
- FKs indexed via dedicated `idx_*` indexes: `audit_log.changed_by`, `boilers_pressure_vessels.response_id`, `collaboration_purposes.purpose_id`, `collaborations.collaborator_type_id`, `collaborations.response_id`, `critical_machines.response_id`, `dashboard_saved_filters.user_id`, `districts.division_id`, `divisions.province_id`, `duplicate_flags.{unit_id,matched_unit_id,resolved_by}`, `energy_consumption.{energy_source_id,response_id,unit_id}`, `energy_generation.{power_source_id,response_id}`, `gis_quality_log.unit_id`, `industrial_clusters.district_id`, `industrial_estates.district_id`, `industrial_units.*` (all 16 FKs), `lookup_value_links.child_value_id`, `lookup_values.type_id`, `machinery_age_profile.{age_bracket_id,response_id}`, `major_inputs.{hs_code_id,response_id,transformation_stage_id,unit_id}`, `matrix_items.{question_id,scale_type_id}`, `product_transformation_stages.stage_id`, `products.{annual_production_unit_id,daily_output_unit_id,hs_code_id,response_id,unit_of_measurement_id}`, `psic_classes.group_id`, `psic_groups.division_id`, `response_choices.{option_id,question_id,response_id}`, `response_edit_log.{edited_by,response_id}`, `response_matrix_answers.{choice_value_id,item_id,response_id}`, `response_shares.{option_id,question_id,response_id}`, `role_permissions.permission_id`, `sec_b_operations.{daily_shift_id,operation_status_id}`, `sec_e_supply_chain.*` (5 FKs), `sec_f_market.*` (6 FKs), `sec_g_technology.*` (9 FKs), `sec_j_strategy.*` (3 FKs), `solid_waste_disposals.disposal_method_id`, `solid_waste_streams.{response_id,waste_type_id}`, `survey_attachments.response_id`, `survey_questions.{lookup_type_id,section_id}`, `survey_responses.{confirmed_by,form_id,surveyor_id,unit_id}`, `survey_sections.form_id`, `sync_log.surveyor_id`, `system_settings.updated_by`, `tehsils.district_id`, `unit_approval_log.{acted_by,response_id,unit_id}`, `unit_associated_establishments.{major_activity_psic_class_id,unit_id}`, `users.{created_by,role_id,supervisor_id}`, `weights_measures_equipment.response_id`, `workforce_employment.response_id`, `workforce_skills.{response_id,skill_level_id}`.