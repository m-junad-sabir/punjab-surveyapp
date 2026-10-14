"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SURVEY_REFERENCES = exports.QUESTION_INPUTS = void 0;
const field = (key, label, type, source, required = false) => ({ key, label, type, ...source, ...(required ? { required } : {}) });
exports.QUESTION_INPUTS = {
    A_ESTABLISHMENT_NAME: { fields: [field('name', 'Name of establishment', 'TEXT', undefined, true)] },
    A_ESTABLISHMENT_YEAR: { fields: [field('establishment_year', 'Year of establishment', 'NUMBER')] },
    A_LOCATION_GPS: { fields: [field('location', 'Coordinates (capture from device)', 'GPS')] },
    A_ADDRESS: { fields: [field('address', 'Address', 'TEXT')] },
    A_LOCATION: {
        fields: [
            field('province_name', 'Province (enter name)', 'TEXT', undefined, true),
            field('division_name', 'Division (enter name)', 'TEXT', undefined, true),
            field('district_name', 'District (enter name)', 'TEXT', undefined, true),
            field('tehsil_name', 'Tehsil (enter name)', 'TEXT', undefined, true),
        ],
    },
    A_CONTACT: {
        fields: [
            field('contact_name', 'Contact person', 'TEXT'),
            field('contact_phone', 'Phone', 'TEXT'),
            field('contact_email', 'Email', 'TEXT'),
            field('website', 'Website', 'TEXT'),
        ],
    },
    A_PSIC: {
        fields: [
            field('psic_division_text', 'PSIC division (code or name)', 'TEXT'),
            field('psic_group_text', 'PSIC group (code or name)', 'TEXT'),
            field('psic_class_text', 'PSIC class (code or name)', 'TEXT'),
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
            field('phone', 'Phone', 'TEXT'),
            field('cell', 'Cell', 'TEXT'),
            field('email', 'Email', 'TEXT'),
        ],
    },
    A_ASSOCIATED_ESTABLISHMENTS: {
        repeatable: true,
        fields: [
            field('name', 'Establishment name', 'TEXT', undefined, true),
            field('address', 'Address', 'TEXT'),
            field('major_activity_text', 'Major activity (PSIC class code or name)', 'TEXT'),
        ],
    },
    A_ESTABLISHMENT_AREA: {
        fields: [
            field('total_area_value', 'Total establishment area', 'NUMBER'),
            field('total_area_unit_id', 'Area unit', 'SINGLE_CHOICE', { reference: 'measurement_units' }),
            field('industrial_estate_text', 'Industrial estate (enter name)', 'TEXT'),
            field('industrial_cluster_text', 'Industrial cluster (enter name)', 'TEXT'),
        ],
    },
    B_OPERATION_MONTHS: { fields: [field('operating_months', 'Months of operation', 'MONTHS')] },
    B_CLOSURE_REASON: { fields: [field('closure_reason', 'Reason for closure', 'TEXT')] },
    B_OPERATIONAL_HOURS: {
        fields: [
            field('daily_shift_id', 'Daily operating hours / shift', 'SINGLE_CHOICE', { lookup_type: 'DAILY_HOURS' }),
            field('daily_hours', 'Daily hours', 'NUMBER'),
            field('working_days_per_week', 'Working days per week', 'NUMBER'),
        ],
    },
    C_PRODUCTS: {
        repeatable: true,
        fields: [
            field('product_kind', 'Product kind', 'SINGLE_CHOICE', { reference: 'product_kinds' }, true),
            field('product_name', 'Product name', 'TEXT', undefined, true),
            field('daily_avg_output', 'Daily average output', 'NUMBER'),
            field('daily_output_unit_id', 'Daily output unit', 'SINGLE_CHOICE', { reference: 'measurement_units' }),
            field('annual_production', 'Annual total production', 'NUMBER'),
            field('annual_production_unit_id', 'Annual production unit', 'SINGLE_CHOICE', { reference: 'measurement_units' }),
            field('installed_capacity', 'Installed capacity', 'NUMBER'),
            field('installed_capacity_period', 'Installed capacity period', 'SINGLE_CHOICE', { reference: 'capacity_periods' }),
            field('unit_of_measurement_id', 'Capacity unit of measurement', 'SINGLE_CHOICE', { reference: 'measurement_units' }),
            field('transformation_stage_ids', 'Transformation stage on arrival', 'MULTI_CHOICE', { lookup_type: 'TRANSFORMATION_STAGE' }),
            field('revenue_share_pct', 'Share in total revenue (%)', 'NUMBER'),
            field('hs_code_text', 'HS code (enter code)', 'TEXT'),
        ],
    },
    D_EMPLOYMENT: {
        repeatable: true,
        fields: [
            field('gender', 'Gender', 'SINGLE_CHOICE', { reference: 'genders' }, true),
            field('regular_count', 'Regular employees', 'NUMBER'),
            field('contract_count', 'Contract employees', 'NUMBER'),
            field('daily_wage_count', 'Daily-wage employees', 'NUMBER'),
        ],
    },
    D_SKILLS: {
        repeatable: true,
        fields: [
            field('gender', 'Gender', 'SINGLE_CHOICE', { reference: 'genders' }, true),
            field('skill_level_id', 'Skill level', 'SINGLE_CHOICE', { lookup_type: 'SKILL_LEVEL' }, true),
            field('headcount', 'Headcount', 'NUMBER'),
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
            field('unit_id', 'Unit', 'SINGLE_CHOICE', { reference: 'measurement_units' }),
            field('cost_share_pct', 'Share of input costs (%)', 'NUMBER'),
            field('hs_code_text', 'HS code (enter code)', 'TEXT'),
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
            field('machine_name', 'Machine name', 'TEXT', undefined, true),
            field('quantity', 'Quantity', 'NUMBER'),
            field('specification', 'Specification', 'TEXT'),
        ],
    },
    G_MACHINERY_AGE: {
        repeatable: true,
        fields: [
            field('age_bracket_id', 'Machinery age bracket', 'SINGLE_CHOICE', { lookup_type: 'MACHINE_AGE' }, true),
            field('machine_count', 'Number of machines', 'NUMBER'),
        ],
    },
    G_BREAKDOWN_FREQUENCY: { fields: [field('breakdown_frequency_id', 'Machinery breakdown frequency', 'SINGLE_CHOICE', { lookup_type: 'BREAKDOWN_FREQUENCY' })] },
    G_MAINTENANCE_APPROACH: { fields: [field('maintenance_approach_id', 'Maintenance approach', 'SINGLE_CHOICE', { lookup_type: 'MAINTENANCE_APPROACH' })] },
    G_BOILERS: {
        repeatable: true,
        fields: [
            field('vessel_type', 'Boiler / pressure vessel type', 'TEXT', undefined, true),
            field('capacity_tph', 'Capacity (tonnes per hour)', 'NUMBER'),
            field('heating_surface', 'Heating surface', 'TEXT'),
        ],
    },
    G_WEIGHTS_MEASURES: {
        repeatable: true,
        fields: [
            field('equipment_type', 'Equipment type', 'TEXT', undefined, true),
            field('quantity', 'Quantity', 'NUMBER'),
            field('capacity', 'Capacity', 'TEXT'),
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
exports.SURVEY_REFERENCES = {
    measurement_units: `SELECT id, code, name AS label FROM measurement_units ORDER BY name`,
    product_kinds: `SELECT 1 AS id, 'MAIN' AS code, 'Main product' AS label, false AS requires_text UNION ALL SELECT 2, 'SECONDARY', 'Secondary product', false`,
    capacity_periods: `SELECT 1 AS id, 'PER_DAY' AS code, 'Per day' AS label, false AS requires_text UNION ALL SELECT 2, 'PER_MONTH', 'Per month', false`,
    genders: `SELECT 1 AS id, 'MALE' AS code, 'Male' AS label, false AS requires_text UNION ALL SELECT 2, 'FEMALE', 'Female', false`,
};
//# sourceMappingURL=survey-questionnaire.js.map