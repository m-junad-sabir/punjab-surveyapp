export type SurveyInputType =
  | 'TEXT'
  | 'PHONE'
  | 'EMAIL'
  | 'NUMBER'
  | 'YES_NO'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'SHARE_PERCENT'
  | 'GPS'
  | 'MONTHS';

export interface SurveyInputField {
  key: string;
  label: string;
  type: SurveyInputType;
  lookup_type?: string;
  reference?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  default_value?: number;
  options?: Array<{
    id: number;
    code: string;
    label: string;
    requires_text: boolean;
    parent_id?: number | null;
    product_kind?: 'MAIN' | 'SECONDARY' | null;
    is_selectable?: boolean;
  }>;
}

export interface SurveyQuestionInput {
  fields: SurveyInputField[];
  repeatable?: boolean;
}

export const SECTION_B_WORKING_RANGES = {
  working_days_per_week: { min: 1, max: 7, step: 1 },
  working_months_per_year: { min: 1, max: 12, step: 1 },
} as const;
export const SECTION_B_DEFAULT_WORKING_DAYS = 6;
export const SECTION_D_MAX_COUNT = 2_147_483_647;

const workforceCount = { min: 0, max: SECTION_D_MAX_COUNT, step: 1, default_value: 0 };

const field = (
  key: string,
  label: string,
  type: SurveyInputType,
  source?: Pick<SurveyInputField, 'lookup_type' | 'reference' | 'min' | 'max' | 'step' | 'default_value'>,
  required = false,
): SurveyInputField => ({ key, label, type, ...source, ...(required ? { required } : {}) });

export const QUESTION_INPUTS: Record<string, SurveyQuestionInput> = {
  A_ESTABLISHMENT_NAME: { fields: [field('name', 'Name of establishment', 'TEXT', undefined, true)] },
  A_INTERVIEWEES: {
    repeatable: true,
    fields: [
      field('name', 'Interviewee name', 'TEXT', undefined, true),
      field('designation', 'Designation', 'TEXT', undefined, true),
      field('contact_number', 'Contact number', 'PHONE', undefined, true),
    ],
  },
  A_ESTABLISHMENT_YEAR: { fields: [field('establishment_year', 'Year of establishment', 'NUMBER')] },
  A_LOCATION_GPS: { fields: [field('location', 'Coordinates (capture from device)', 'GPS')] },
  A_ADDRESS: { fields: [field('address', 'Address', 'TEXT')] },
  A_LOCATION: {
    fields: [
      field('district_id', 'District', 'SINGLE_CHOICE', { reference: 'districts' }, true),
      field('tehsil_id', 'Tehsil', 'SINGLE_CHOICE', { reference: 'tehsils' }, true),
    ],
  },
  A_CONTACT: {
    fields: [
      field('contact_name', 'Contact person', 'TEXT'),
      field('contact_phone', 'Mobile number', 'PHONE'),
      field('contact_email', 'Email', 'EMAIL'),
      field('website', 'Website', 'TEXT'),
    ],
  },
  A_PSIC: {
    fields: [
      field('psic_class_id', 'PSIC class', 'SINGLE_CHOICE', { reference: 'unit_type_psic_classes' }, true),
    ],
  },
  A_ZONE_TYPE: { fields: [field('zone_type_id', 'Zone type', 'SINGLE_CHOICE', { lookup_type: 'ZONE_TYPE' })] },
  A_OWNERSHIP: { fields: [field('ownership_type_id', 'Ownership of establishment', 'SINGLE_CHOICE', { lookup_type: 'OWNERSHIP_TYPE' })] },
  A_LEGAL_STRUCTURE: { fields: [field('legal_structure_id', 'Legal structure of ownership', 'SINGLE_CHOICE', { lookup_type: 'LEGAL_STRUCTURE' })] },
  A_PARENT_COMPANY: { fields: [field('has_parent_company', 'Does this establishment have a parent company?', 'YES_NO')] },
  A_PARENT_COMPANY_DETAILS: {
    fields: [
      field('company_name', 'Parent company name', 'TEXT', undefined, true),
      field('company_address', 'Parent company address', 'TEXT'),
      field('phone', 'Phone', 'PHONE'),
      field('cell', 'Cell', 'PHONE'),
      field('email', 'Email', 'EMAIL'),
    ],
  },
  A_ASSOCIATED_ESTABLISHMENTS: {
    repeatable: true,
    fields: [
      field('name', 'Establishment name', 'TEXT', undefined, true),
      field('address', 'Address', 'TEXT'),
      field('major_activity_psic_class_id', 'Major activity (PSIC class)', 'SINGLE_CHOICE', { reference: 'associated_psic_classes' }),
    ],
  },
  A_ESTABLISHMENT_AREA: {
    fields: [
      field('total_area_value', 'Total establishment area', 'NUMBER'),
      field('total_area_unit_id', 'Area unit', 'SINGLE_CHOICE', { reference: 'area_units' })
      // field('industrial_estate_text', 'Industrial estate (enter name)', 'TEXT'),
      // field('industrial_cluster_text', 'Industrial cluster (enter name)', 'TEXT'),
    ],
  },
  A_TOTAL_CAPITAL_INVESTMENT: {
    fields: [
      field('total_capital_investment', 'Total capital investment', 'NUMBER'),
      field('capital_investment_unit_id', 'Currency unit', 'SINGLE_CHOICE', { lookup_type: 'CAPITAL_INVESTMENT_UNIT' }),
    ],
  },
  B_OPERATION_MONTHS: { fields: [field('operating_months', 'Months of operation', 'MONTHS')] },
  B_CLOSURE_REASON: { fields: [field('closure_reason', 'Reason for closure', 'TEXT')] },
  B_OPERATIONAL_HOURS: {
    fields: [
      field('daily_shift_id', 'Daily operating hours / shift', 'SINGLE_CHOICE', { lookup_type: 'DAILY_HOURS' }),
      field('working_days_per_week', 'Total working days per week', 'NUMBER', {
        ...SECTION_B_WORKING_RANGES.working_days_per_week,
        default_value: SECTION_B_DEFAULT_WORKING_DAYS,
      }),
      field('working_months_per_year', 'Total working months per year', 'NUMBER', SECTION_B_WORKING_RANGES.working_months_per_year),
      field('daily_hours', 'Daily hours (optional)', 'NUMBER'),
    ],
  },
  C_PRODUCTS: {
    repeatable: true,
    fields: [
      field('product_kind', 'Product kind', 'SINGLE_CHOICE', { reference: 'product_kinds' }, true),
      field('product_name', 'Product name', 'SINGLE_CHOICE', { reference: 'industry_products' }, true),
      field('daily_avg_output', 'Daily average output', 'NUMBER'),
      field('daily_output_unit_id', 'Daily output unit', 'SINGLE_CHOICE', { reference: 'product_units' }),
      field('annual_production', 'Annual total production', 'NUMBER'),
      field('annual_production_unit_id', 'Annual production unit', 'SINGLE_CHOICE', { reference: 'product_units' }),
      field('installed_capacity', 'Installed capacity', 'NUMBER'),
      field('installed_capacity_period', 'Installed capacity period', 'SINGLE_CHOICE', { reference: 'capacity_periods' }),
      field('unit_of_measurement_id', 'Capacity unit of measurement', 'SINGLE_CHOICE', { reference: 'product_units' }),
      field('transformation_stage_ids', 'Transformation stage on arrival', 'MULTI_CHOICE', { lookup_type: 'TRANSFORMATION_STAGE' }),
      field('revenue_share_pct', 'Share in total revenue (%)', 'NUMBER'),
      field('hs_code_id', 'HS code (code or description)', 'SINGLE_CHOICE', { reference: 'hs_codes' }),
    ],
  },
  D_EMPLOYMENT: {
    repeatable: true,
    fields: [
      field('gender', 'Gender', 'SINGLE_CHOICE', { reference: 'genders' }, true),
      field('regular_count', 'Regular employees', 'NUMBER', workforceCount),
      field('contract_count', 'Contract employees', 'NUMBER', workforceCount),
      field('daily_wage_count', 'Daily-wage employees', 'NUMBER', workforceCount),
    ],
  },
  D_SKILLS: {
    repeatable: true,
    fields: [
      field('gender', 'Gender', 'SINGLE_CHOICE', { reference: 'genders' }, true),
      field('skill_level_id', 'Skill level', 'SINGLE_CHOICE', { lookup_type: 'SKILL_LEVEL' }, true),
      field('headcount', 'Headcount', 'NUMBER', workforceCount),
    ],
  },
  E_ACTIVE_SUPPLIERS: { fields: [field('active_suppliers_id', 'Number of active suppliers', 'SINGLE_CHOICE', { lookup_type: 'COUNT_BAND' })] },
  E_SUPPLIER_DEPENDENCY: { fields: [field('supplier_dependency_id', 'Supplier dependency', 'SINGLE_CHOICE', { lookup_type: 'SUPPLIER_DEPENDENCY' })] },
  E_PROCUREMENT_MODE: { fields: [field('procurement_mode_id', 'Mode of procurement', 'SINGLE_CHOICE', { lookup_type: 'CONTRACT_MODE' })] },
  E_SUPPLY_DISRUPTION: { fields: [field('had_supply_disruption', 'Was there a supply disruption in the last 12 months?', 'YES_NO')] },
  E_ON_TIME_DELIVERY: { fields: [field('ontime_delivery_id', 'On-time delivery reliability', 'SINGLE_CHOICE', { lookup_type: 'RELIABILITY_BAND' })] },
  E_PRODUCT_ACCEPTANCE: { fields: [field('product_acceptance_id', 'Product acceptance rate', 'SINGLE_CHOICE', { lookup_type: 'ACCEPTANCE_BAND' })] },
  E_MAJOR_INPUTS: {
    repeatable: true,
    fields: [
      field('input_name', 'Major raw material / input', 'TEXT', undefined, true),
      field('unit_id', 'Unit', 'SINGLE_CHOICE', { reference: 'product_units' }),
      field('cost_share_pct', 'Share of input costs (%)', 'NUMBER'),
      field('hs_code_id', 'HS code (code or description)', 'SINGLE_CHOICE', { reference: 'hs_codes' }),
      field('transformation_stage_id', 'Transformation stage', 'SINGLE_CHOICE', { lookup_type: 'TRANSFORMATION_STAGE' }),
    ],
  },
  F_GLOBAL_SUPPLY_CHAIN: { fields: [field('global_supply_chain_id', 'Part of global supply chain', 'SINGLE_CHOICE', { lookup_type: 'GLOBAL_SUPPLY_CHAIN' })] },
  F_ACTIVE_BUYERS: { fields: [field('active_buyers_id', 'Number of active buyers', 'SINGLE_CHOICE', { lookup_type: 'COUNT_BAND' })] },
  F_BUYER_AVAILABILITY: { fields: [field('buyer_availability_id', 'Buyer availability', 'SINGLE_CHOICE', { lookup_type: 'BUYER_DEPENDENCY' })] },
  F_SALES_MODE: { fields: [field('sales_mode_id', 'Mode of sale', 'SINGLE_CHOICE', { lookup_type: 'CONTRACT_MODE' })] },
  F_PAYMENT_TERMS: { fields: [field('payment_terms_id', 'Payment terms', 'SINGLE_CHOICE', { lookup_type: 'PAYMENT_TERMS' })] },
  F_DEMAND_GAP: { fields: [field('had_demand_gap', 'Were there demand gaps?', 'YES_NO')] },
  F_SUBCONTRACT: { fields: [field('subcontract_id', 'Subcontract opportunities', 'SINGLE_CHOICE', { lookup_type: 'SUBCONTRACT_TYPE' })] },
  G_PLANT_CAPACITY: { fields: [field('plant_processing_capacity', 'Plant processing capacity', 'TEXT')] },
  G_UTILIZATION_RATE: { fields: [field('utilization_rate_id', 'Capacity utilization rate', 'SINGLE_CHOICE', { lookup_type: 'UTILIZATION_BAND' })] },
  G_INTEGRATION_LEVEL: { fields: [field('integration_level_id', 'Integration between machines', 'SINGLE_CHOICE', { lookup_type: 'INTEGRATION_LEVEL' })] },
  G_MACHINE_SOURCE: { fields: [field('machine_source_id', 'Machine source', 'SINGLE_CHOICE', { lookup_type: 'LOCAL_IMPORTED' })] },
  G_SPARE_PARTS_SOURCE: { fields: [field('spare_parts_source_id', 'Spare-parts source', 'SINGLE_CHOICE', { lookup_type: 'LOCAL_IMPORTED' })] },
  G_CRITICAL_MACHINES: {
    repeatable: true,
    fields: [
      field('machine_name', 'Machine name', 'SINGLE_CHOICE', { reference: 'industry_machines' }, true),
      field('quantity', 'Quantity', 'NUMBER', { min: 0, max: SECTION_D_MAX_COUNT, step: 1 }),
      field('specification', 'Specification', 'SINGLE_CHOICE', { reference: 'machine_specifications' }),
    ],
  },
  G_BREAKDOWN_FREQUENCY: { fields: [field('breakdown_frequency_id', 'Machinery breakdown frequency', 'SINGLE_CHOICE', { lookup_type: 'BREAKDOWN_FREQUENCY' })] },
  G_MAINTENANCE_APPROACH: { fields: [field('maintenance_approach_id', 'Maintenance approach', 'SINGLE_CHOICE', { lookup_type: 'MAINTENANCE_APPROACH' })] },
  G_BOILERS: {
    repeatable: true,
    fields: [
      field('record_kind', 'Boiler or pressure vessel', 'SINGLE_CHOICE', { reference: 'g_vessel_kinds' }, true),
      field('equipment_number', 'Boiler / vessel number', 'TEXT', undefined, true),
      field('boiler_type_id', 'Type of boiler', 'SINGLE_CHOICE', { lookup_type: 'G_BOILER_TYPE' }, true),
      field('vessel_category_id', 'Vessel category', 'SINGLE_CHOICE', { lookup_type: 'G_VESSEL_CATEGORY' }, true),
      field('working_pressure_raw', 'Working pressure', 'NUMBER', { min: 0.001, step: 0.001 }, true),
      field('pressure_unit_id', 'Working pressure unit', 'SINGLE_CHOICE', { lookup_type: 'G_PRESSURE_UNIT' }, true),
      field('capacity_litres', 'Capacity (litres)', 'NUMBER', { min: 0.001, step: 0.001 }, true),
      field('heating_surface_raw', 'Heating surface', 'NUMBER', { min: 0.001, step: 0.001 }, true),
      field('heating_surface_unit_id', 'Heating surface unit', 'SINGLE_CHOICE', { lookup_type: 'G_HEATING_UNIT' }, true),
    ],
  },
  G_WEIGHTS_MEASURES: {
    repeatable: true,
    fields: [
      field('equipment_type_id', 'Equipment type', 'SINGLE_CHOICE', { lookup_type: 'G_EQUIPMENT_TYPE' }, true),
      field('equipment_unit_id', 'Unit', 'SINGLE_CHOICE', { lookup_type: 'G_EQUIPMENT_UNIT' }, true),
      field('capacity_value_raw', 'Capacity / denomination', 'NUMBER', { min: 0.001, step: 0.001 }, true),
      field('number_of_instruments', 'Number of instruments', 'NUMBER', { min: 1, max: SECTION_D_MAX_COUNT, step: 1 }, true),
    ],
  },
  G_PRODUCTION_PLANNING: { fields: [field('production_planning_id', 'Production planning system', 'SINGLE_CHOICE', { lookup_type: 'PLANNING_SYSTEM' })] },
  G_INVENTORY_SYSTEM: { fields: [field('inventory_system_id', 'Inventory management', 'SINGLE_CHOICE', { lookup_type: 'INVENTORY_SYSTEM' })] },
  G_RND_EXPENDITURE: { fields: [field('rnd_expenditure_id', 'R&D expenditure', 'SINGLE_CHOICE', { lookup_type: 'RND_BAND' })] },
  H_ENERGY_CONSUMPTION: {
    repeatable: true,
    fields: [
      field('energy_source_id', 'Fuel / energy source', 'SINGLE_CHOICE', { lookup_type: 'ENERGY_SOURCE' }, true),
      field('other_text', 'Other source', 'TEXT'),
      field('quantity_per_month', 'Quantity per month', 'NUMBER'),
      field('unit_id', 'Unit', 'SINGLE_CHOICE', { reference: 'measurement_units' }),
      field('share_pct', 'Share of energy use (%)', 'NUMBER'),
    ],
  },
  H_ENERGY_GENERATION: {
    repeatable: true,
    fields: [
      field('power_source_id', 'Power source', 'SINGLE_CHOICE', { lookup_type: 'POWER_SOURCE' }, true),
      field('other_text', 'Other source', 'TEXT'),
      field('capacity_kw', 'Capacity (kW)', 'NUMBER'),
      field('export_kw', 'Exported power (kW)', 'NUMBER'),
    ],
  },
  H_CAPTIVE_EXPORT_CAPACITY: {
    fields: [
      field('captive_capacity_kw', 'Captive generation capacity (kW)', 'NUMBER'),
      field('export_capacity_kw', 'Export capacity (kW)', 'NUMBER'),
    ],
  },
  H_SOLID_WASTE: {
    repeatable: true,
    fields: [
      field('waste_type_id', 'Solid waste / by-product type', 'SINGLE_CHOICE', { lookup_type: 'WASTE_TYPE' }, true),
      field('is_generated', 'Is this waste generated?', 'YES_NO'),
      field('disposal_method_ids', 'Disposal methods', 'MULTI_CHOICE', { lookup_type: 'WASTE_DISPOSAL' }),
      field('other_text', 'Other disposal method', 'TEXT'),
    ],
  },
  I_SAFETY_TRAINING: { fields: [field('safety_trained_workers', 'Workers with formal safety training', 'NUMBER')] },
  J_REINVESTMENT_LEVEL: { fields: [field('reinvestment_level_id', 'Reinvestment strategy', 'SINGLE_CHOICE', { lookup_type: 'REINVESTMENT_BAND' })] },
  J_REINVESTMENT_AREA: {
    fields: [
      field('reinvestment_area_id', 'Primary area of reinvestment', 'SINGLE_CHOICE', { lookup_type: 'REINVESTMENT_AREA' }),
      field('reinvestment_area_other', 'Other reinvestment area', 'TEXT'),
    ],
  },
  J_UPSCALING_TIME: { fields: [field('upscaling_time_id', 'Upscaling time', 'SINGLE_CHOICE', { lookup_type: 'UPSCALING_TIME' })] },
  K_FUTURE_PLAN: { fields: [field('has_future_plan', 'Does the establishment have a future plan?', 'YES_NO')] },
  K_COLLABORATIONS: {
    repeatable: true,
    fields: [
      field('collaborator_type_id', 'Potential collaborator', 'SINGLE_CHOICE', { lookup_type: 'COLLABORATOR_TYPE' }, true),
      field('purpose_ids', 'Purpose of collaboration', 'MULTI_CHOICE', { lookup_type: 'COLLABORATION_PURPOSE' }),
    ],
  },
  K_MOST_CRITICAL_BARRIER: { fields: [field('most_critical_barrier', 'Most critical barrier', 'TEXT')] },
};

export const SURVEY_REFERENCES = {
  districts: `SELECT d.id, d.code, d.name AS label, false AS requires_text
                FROM districts d
                JOIN divisions dv ON dv.id = d.division_id
                JOIN provinces p ON p.id = dv.province_id
               WHERE lower(p.name) = 'punjab'
               ORDER BY d.name`,
  tehsils: `SELECT t.id, t.code, t.name AS label, false AS requires_text,
                   t.district_id AS parent_id
              FROM tehsils t
              JOIN districts d ON d.id = t.district_id
              JOIN divisions dv ON dv.id = d.division_id
              JOIN provinces p ON p.id = dv.province_id
             WHERE lower(p.name) = 'punjab'
             ORDER BY t.name`,
  measurement_units: `SELECT m.id, m.code, m.name AS label
                         FROM measurement_units m
                        WHERE (m.unit_kind <> 'AREA'
                           OR m.code IN ('SQM', 'SQFT', 'SQYD', 'HECTARE', 'ACRE'))
                          AND NOT EXISTS (
                            SELECT 1 FROM product_measurement_units p
                             WHERE p.unit_id = m.id AND p.product_only
                          )
                        ORDER BY m.name`,
  product_units: `SELECT m.id, m.code, COALESCE(p.display_label, m.name) AS label,
                         false AS requires_text, COALESCE(p.is_active, false) AS is_selectable
                    FROM measurement_units m
                    LEFT JOIN product_measurement_units p ON p.unit_id = m.id
                   ORDER BY p.sort_order NULLS LAST, m.name, m.id`,
  industry_products: `SELECT id, code, label, requires_text, parent_id, product_kind, is_selectable
                        FROM (
                          SELECT p.id, p.id::text AS code, p.product_name AS label,
                                 false AS requires_text, p.unit_type_id AS parent_id,
                                 p.product_kind, p.is_active AS is_selectable, p.sort_order
                            FROM industry_product_options p
                          UNION ALL
                          SELECT 0, 'OTHER', 'Other (specify)', true, NULL::integer,
                                 NULL::varchar, true, 0::smallint
                        ) options
                       ORDER BY parent_id NULLS FIRST, product_kind, sort_order, id`,
  industry_machines: `SELECT id, code, label, requires_text, parent_id, is_selectable
                        FROM (
                          SELECT id, id::text AS code, machine_name AS label,
                                 false AS requires_text, unit_type_id AS parent_id,
                                 is_active AS is_selectable, sort_order
                            FROM industry_machine_options
                          UNION ALL
                          SELECT 0, 'OTHER', 'Other (specify)', true, NULL::integer, true, 0::smallint
                        ) options
                       ORDER BY parent_id NULLS FIRST, sort_order, id`,
  machine_specifications: `SELECT id, code, label, requires_text, parent_id, is_selectable
                             FROM (
                               SELECT id, id::text AS code, specification AS label,
                                      false AS requires_text, id AS parent_id,
                                      is_active AS is_selectable, sort_order
                                 FROM industry_machine_options
                               UNION ALL
                               SELECT 0, 'OTHER', 'Other (specify)', true, NULL::integer, true, 0::smallint
                             ) options
                            ORDER BY parent_id NULLS FIRST, sort_order, id`,
  g_vessel_kinds: `SELECT 1 AS id, 'BOILER' AS code, 'Boiler' AS label, false AS requires_text
                   UNION ALL
                   SELECT 2, 'VESSEL', 'Pressure vessel', false`,
  area_units: `SELECT m.id, m.code, m.name AS label, false AS requires_text
                 FROM measurement_units m
                WHERE m.unit_kind = 'AREA'
                  AND NOT EXISTS (
                    SELECT 1 FROM product_measurement_units p
                     WHERE p.unit_id = m.id AND p.product_only
                  )
                ORDER BY m.name`,
  product_kinds: `SELECT 1 AS id, 'MAIN' AS code, 'Main product' AS label, false AS requires_text UNION ALL SELECT 2, 'SECONDARY', 'Secondary product', false`,
  capacity_periods: `SELECT 1 AS id, 'PER_DAY' AS code, 'Per day' AS label, false AS requires_text UNION ALL SELECT 2, 'PER_MONTH', 'Per month', false`,
  genders: `SELECT 1 AS id, 'MALE' AS code, 'Male' AS label, false AS requires_text UNION ALL SELECT 2, 'FEMALE', 'Female', false UNION ALL SELECT 3, 'Other', 'Other', false`,
  psic_divisions: `SELECT id, code, name AS label, false AS requires_text
                     FROM psic_divisions
                    ORDER BY code`,
  psic_groups: `SELECT id, code, name AS label, false AS requires_text,
                       division_id AS parent_id
                  FROM psic_groups
                 ORDER BY code`,
  psic_classes: `SELECT id, code, name AS label, false AS requires_text,
                        group_id AS parent_id
                   FROM psic_classes
                  ORDER BY code`,
  associated_psic_classes: `SELECT id, code, name AS label, false AS requires_text
                             FROM psic_classes
                            ORDER BY code`,
  hs_codes: `SELECT id, code, description AS label, false AS requires_text
               FROM hs_codes
              ORDER BY code`,
} as const;
