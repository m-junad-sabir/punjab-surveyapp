BEGIN;

ALTER TABLE industrial_units
  ALTER COLUMN province_id DROP NOT NULL,
  ALTER COLUMN division_id DROP NOT NULL,
  ALTER COLUMN district_id DROP NOT NULL,
  ALTER COLUMN tehsil_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS province_name text,
  ADD COLUMN IF NOT EXISTS division_name text,
  ADD COLUMN IF NOT EXISTS district_name text,
  ADD COLUMN IF NOT EXISTS tehsil_name text,
  ADD COLUMN IF NOT EXISTS psic_division_text text,
  ADD COLUMN IF NOT EXISTS psic_group_text text,
  ADD COLUMN IF NOT EXISTS psic_class_text text,
  ADD COLUMN IF NOT EXISTS zone_type_other_text text,
  ADD COLUMN IF NOT EXISTS industrial_estate_text text,
  ADD COLUMN IF NOT EXISTS industrial_cluster_text text;

UPDATE industrial_units u
   SET province_name = COALESCE(
         NULLIF(u.province_name, ''),
         (SELECT p.name FROM provinces p WHERE p.id = u.province_id),
         'Not provided by the previous form version'),
       division_name = COALESCE(
         NULLIF(u.division_name, ''),
         (SELECT d.name FROM divisions d WHERE d.id = u.division_id),
         'Not provided by the previous form version'),
       district_name = COALESCE(
         NULLIF(u.district_name, ''),
         (SELECT d.name FROM districts d WHERE d.id = u.district_id),
         'Not provided by the previous form version'),
       tehsil_name = COALESCE(
         NULLIF(u.tehsil_name, ''),
         (SELECT t.name FROM tehsils t WHERE t.id = u.tehsil_id),
         'Not provided by the previous form version');

ALTER TABLE industrial_units
  ALTER COLUMN province_name SET NOT NULL,
  ALTER COLUMN division_name SET NOT NULL,
  ALTER COLUMN district_name SET NOT NULL,
  ALTER COLUMN tehsil_name SET NOT NULL;

ALTER TABLE unit_associated_establishments
  ADD COLUMN IF NOT EXISTS major_activity_text text;
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hs_code_text text;
ALTER TABLE major_inputs
  ADD COLUMN IF NOT EXISTS hs_code_text text;

UPDATE survey_forms
   SET is_active = false
 WHERE code = 'INDUSTRIAL_SURVEY';

UPDATE survey_forms
   SET version = 2, is_active = true
 WHERE id = (
   SELECT id FROM survey_forms
    WHERE code = 'INDUSTRIAL_SURVEY' AND version = 1
      AND NOT EXISTS (
        SELECT 1 FROM survey_forms newer
         WHERE newer.code = 'INDUSTRIAL_SURVEY' AND newer.version = 2
      )
 );

UPDATE survey_forms
   SET is_active = true
 WHERE code = 'INDUSTRIAL_SURVEY' AND version = 2;

INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order)
SELECT id, 'OTHER', 'Other (please specify)', true, 1
  FROM lookup_types
 WHERE code = 'ZONE_TYPE'
ON CONFLICT (type_id, code) DO UPDATE
  SET label = EXCLUDED.label, requires_text = EXCLUDED.requires_text;

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type, lookup_type_id, stored_in)
SELECT s.id, v.code, v.no, v.txt, v.answer_type, lt.id, v.stored_in
  FROM (VALUES
    ('A','A_ESTABLISHMENT_NAME','i','Name of establishment','TEXT',NULL,'industrial_units.name'),
    ('A','A_ESTABLISHMENT_YEAR','ii','Year of establishment','NUMBER',NULL,'industrial_units.establishment_year'),
    ('A','A_LOCATION_GPS','iii','Coordinates (capture from device)','TEXT',NULL,'industrial_units.location'),
    ('A','A_ADDRESS','iv','Address','TEXT',NULL,'industrial_units.address'),
    ('A','A_LOCATION','v','Location (province, division, district and tehsil)','REPEATING_GROUP',NULL,'industrial_units'),
    ('A','A_CONTACT','vi','Contact person, phone, email and website','REPEATING_GROUP',NULL,'industrial_units'),
    ('A','A_PSIC','vii','PSIC division, group and class','REPEATING_GROUP',NULL,'industrial_units'),
    ('A','A_ZONE_TYPE','viii','Zone type','SINGLE_CHOICE','ZONE_TYPE','industrial_units.zone_type_id'),
    ('A','A_OWNERSHIP','ix','Ownership of establishment','SINGLE_CHOICE','OWNERSHIP_TYPE','industrial_units.ownership_type_id'),
    ('A','A_LEGAL_STRUCTURE','x','Legal structure of ownership','SINGLE_CHOICE','LEGAL_STRUCTURE','industrial_units.legal_structure_id'),
    ('A','A_PARENT_COMPANY','xi','Parent company (Yes/No)','YES_NO',NULL,'industrial_units.has_parent_company'),
    ('A','A_PARENT_COMPANY_DETAILS','xi','Parent company details','REPEATING_GROUP',NULL,'unit_parent_companies'),
    ('A','A_ASSOCIATED_ESTABLISHMENTS','xii','Establishments of the parent company','REPEATING_GROUP',NULL,'unit_associated_establishments'),
    ('A','A_ESTABLISHMENT_AREA','xiii','Total establishment area','REPEATING_GROUP',NULL,'industrial_units'),
    ('B','B_OPERATION_MONTHS','i','Months of operation','MULTI_CHOICE',NULL,'sec_b_operations.operating_months'),
    ('B','B_OPERATION_STATUS','ii','Current operation status','SINGLE_CHOICE','OPERATION_STATUS','sec_b_operations.operation_status_id'),
    ('B','B_CLOSURE_REASON','ii','Reason for closure (if permanently closed)','TEXT',NULL,'sec_b_operations.closure_reason'),
    ('B','B_OPERATIONAL_HOURS','iii','Operational hours (daily, weekly and monthly)','REPEATING_GROUP',NULL,'sec_b_operations'),
    ('C','C_PRODUCTS','-','Main and secondary products and production details','REPEATING_GROUP',NULL,'products'),
    ('D','D_EMPLOYMENT','i','Employment details, last financial year','REPEATING_GROUP',NULL,'workforce_employment'),
    ('D','D_SKILLS','ii','Employment skill levels by gender','REPEATING_GROUP',NULL,'workforce_skills'),
    ('E','E_ACTIVE_SUPPLIERS','iii','Number of active suppliers','SINGLE_CHOICE','COUNT_BAND','sec_e_supply_chain.active_suppliers_id'),
    ('E','E_SUPPLIER_DEPENDENCY','iv','Supplier dependency','SINGLE_CHOICE','SUPPLIER_DEPENDENCY','sec_e_supply_chain.supplier_dependency_id'),
    ('E','E_PROCUREMENT_MODE','v','Mode of procurement','SINGLE_CHOICE','CONTRACT_MODE','sec_e_supply_chain.procurement_mode_id'),
    ('E','E_SUPPLY_DISRUPTION','vi','Supply disruption in the last 12 months (Yes/No)','YES_NO',NULL,'sec_e_supply_chain.had_supply_disruption'),
    ('E','E_ON_TIME_DELIVERY','vii','On-time delivery reliability','SINGLE_CHOICE','RELIABILITY_BAND','sec_e_supply_chain.ontime_delivery_id'),
    ('E','E_PRODUCT_ACCEPTANCE','viii','Product acceptance rate','SINGLE_CHOICE','ACCEPTANCE_BAND','sec_e_supply_chain.product_acceptance_id'),
    ('E','E_MAJOR_INPUTS','ix','Major raw materials and inputs','REPEATING_GROUP',NULL,'major_inputs'),
    ('F','F_GLOBAL_SUPPLY_CHAIN','iii','Part of global supply chain','SINGLE_CHOICE','GLOBAL_SUPPLY_CHAIN','sec_f_market.global_supply_chain_id'),
    ('F','F_ACTIVE_BUYERS','iv','Number of active buyers','SINGLE_CHOICE','COUNT_BAND','sec_f_market.active_buyers_id'),
    ('F','F_BUYER_AVAILABILITY','vi','Buyer availability','SINGLE_CHOICE','BUYER_DEPENDENCY','sec_f_market.buyer_availability_id'),
    ('F','F_SALES_MODE','vii','Mode of sale','SINGLE_CHOICE','CONTRACT_MODE','sec_f_market.sales_mode_id'),
    ('F','F_PAYMENT_TERMS','viii','Payment terms','SINGLE_CHOICE','PAYMENT_TERMS','sec_f_market.payment_terms_id'),
    ('F','F_DEMAND_GAP','ix','Demand gaps (Yes/No)','YES_NO',NULL,'sec_f_market.had_demand_gap'),
    ('F','F_SUBCONTRACT','x','Subcontract opportunities','SINGLE_CHOICE','SUBCONTRACT_TYPE','sec_f_market.subcontract_id'),
    ('G','G_PLANT_CAPACITY','ii','Plant processing capacity','TEXT',NULL,'sec_g_technology.plant_processing_capacity'),
    ('G','G_UTILIZATION_RATE','iii','Capacity utilization rate','SINGLE_CHOICE','UTILIZATION_BAND','sec_g_technology.utilization_rate_id'),
    ('G','G_INTEGRATION_LEVEL','vi','Level of integration between machines','SINGLE_CHOICE','INTEGRATION_LEVEL','sec_g_technology.integration_level_id'),
    ('G','G_MACHINE_SOURCE','vii','Source of machinery','SINGLE_CHOICE','LOCAL_IMPORTED','sec_g_technology.machine_source_id'),
    ('G','G_SPARE_PARTS_SOURCE','vii','Source of spare parts','SINGLE_CHOICE','LOCAL_IMPORTED','sec_g_technology.spare_parts_source_id'),
    ('G','G_CRITICAL_MACHINES','i','Critical machines, quantity and specification','REPEATING_GROUP',NULL,'critical_machines'),
    ('G','G_MACHINERY_AGE','viii','Machinery age profile','REPEATING_GROUP',NULL,'machinery_age_profile'),
    ('G','G_BREAKDOWN_FREQUENCY','ix','Frequency of machinery breakdown','SINGLE_CHOICE','BREAKDOWN_FREQUENCY','sec_g_technology.breakdown_frequency_id'),
    ('G','G_MAINTENANCE_APPROACH','x','Maintenance approach','SINGLE_CHOICE','MAINTENANCE_APPROACH','sec_g_technology.maintenance_approach_id'),
    ('G','G_BOILERS','xi','Boilers and pressure vessels','REPEATING_GROUP',NULL,'boilers_pressure_vessels'),
    ('G','G_WEIGHTS_MEASURES','xii','Weights and measures equipment','REPEATING_GROUP',NULL,'weights_measures_equipment'),
    ('G','G_PRODUCTION_PLANNING','xiii','Production planning system','SINGLE_CHOICE','PLANNING_SYSTEM','sec_g_technology.production_planning_id'),
    ('G','G_INVENTORY_SYSTEM','xiv','Inventory management system','SINGLE_CHOICE','INVENTORY_SYSTEM','sec_g_technology.inventory_system_id'),
    ('G','G_RND_EXPENDITURE','xvi','Research and development expenditure','SINGLE_CHOICE','RND_BAND','sec_g_technology.rnd_expenditure_id'),
    ('H','H_ENERGY_CONSUMPTION','i','Monthly energy consumption by source','REPEATING_GROUP',NULL,'energy_consumption'),
    ('H','H_ENERGY_GENERATION','ii','Power generation by source','REPEATING_GROUP',NULL,'energy_generation'),
    ('H','H_CAPTIVE_EXPORT_CAPACITY','ii','Captive generation and export capacity','REPEATING_GROUP',NULL,'sec_h_environment'),
    ('H','H_SOLID_WASTE','vii','Solid waste and by-products','REPEATING_GROUP',NULL,'solid_waste_streams'),
    ('I','I_SAFETY_TRAINING','iii','Workers with formal safety training','NUMBER',NULL,'sec_i_compliance.safety_trained_workers'),
    ('J','J_REINVESTMENT_LEVEL','iii','Reinvestment strategy','SINGLE_CHOICE','REINVESTMENT_BAND','sec_j_strategy.reinvestment_level_id'),
    ('J','J_REINVESTMENT_AREA','iv','Primary area of reinvestment','SINGLE_CHOICE','REINVESTMENT_AREA','sec_j_strategy.reinvestment_area_id'),
    ('J','J_UPSCALING_TIME','vi','Upscaling time','SINGLE_CHOICE','UPSCALING_TIME','sec_j_strategy.upscaling_time_id'),
    ('K','K_FUTURE_PLAN','i','Do they have a future plan? (Yes/No)','YES_NO',NULL,'sec_k_future.has_future_plan'),
    ('K','K_COLLABORATIONS','ii','Future opportunities: collaborator and purpose','REPEATING_GROUP',NULL,'collaborations'),
    ('K','K_MOST_CRITICAL_BARRIER','v','Single most critical barrier','TEXT',NULL,'sec_k_future.most_critical_barrier')
  ) v(section_code,code,no,txt,answer_type,lookup_code,stored_in)
  JOIN survey_forms f ON f.code = 'INDUSTRIAL_SURVEY' AND f.is_active
  JOIN survey_sections s ON s.form_id = f.id AND s.section_code = v.section_code
  LEFT JOIN lookup_types lt ON lt.code = v.lookup_code
ON CONFLICT (question_code) DO UPDATE
  SET section_id = EXCLUDED.section_id,
      question_no = EXCLUDED.question_no,
      question_text = EXCLUDED.question_text,
      answer_type = EXCLUDED.answer_type,
      lookup_type_id = EXCLUDED.lookup_type_id,
      stored_in = EXCLUDED.stored_in;

UPDATE survey_questions
   SET is_required = true
 WHERE question_code IN ('A_ESTABLISHMENT_NAME', 'A_LOCATION');

UPDATE lookup_values
   SET requires_text = false
 WHERE type_id = (SELECT id FROM lookup_types WHERE code = 'OPERATION_STATUS')
   AND code = 'PERM_CLOSED';

COMMIT;
