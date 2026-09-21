-- ============================================================================
-- CREATE DATABASE TABLES FOR PUNJAB INDUSTRIAL SURVEY
-- PostgreSQL 14+ / PostGIS 3+
-- Run after creating the database and enabling PostGIS.
-- Example:
--   createdb punjab_industrial_survey
--   psql -U postgres -d punjab_industrial_survey -f database/create_tables.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 1. AUTH & USER MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    role_id      INTEGER PRIMARY KEY,
    role_name    VARCHAR(50) UNIQUE NOT NULL,
    description  TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    permission_id     INTEGER PRIMARY KEY,
    permission_code   VARCHAR(100) UNIQUE NOT NULL,
    description       TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    user_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username         VARCHAR(60) UNIQUE NOT NULL,
    full_name        VARCHAR(150) NOT NULL,
    email            VARCHAR(150) UNIQUE,
    phone            VARCHAR(20),
    password_hash    TEXT NOT NULL,
    role_id          INTEGER NOT NULL REFERENCES roles(role_id),
    is_active        BOOLEAN DEFAULT TRUE,
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. ADMINISTRATIVE BOUNDARIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS provinces (
    province_id   INTEGER PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    code          VARCHAR(20) NOT NULL UNIQUE,
    geom          geometry(MultiPolygon, 4326),
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS divisions (
    division_id   INTEGER PRIMARY KEY,
    province_id   INTEGER NOT NULL REFERENCES provinces(province_id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    code          VARCHAR(20) NOT NULL UNIQUE,
    geom          geometry(MultiPolygon, 4326),
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS districts (
    district_id   INTEGER PRIMARY KEY,
    division_id   INTEGER NOT NULL REFERENCES divisions(division_id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    code          VARCHAR(20) NOT NULL UNIQUE,
    geom          geometry(MultiPolygon, 4326),
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tehsils (
    tehsil_id     INTEGER PRIMARY KEY,
    district_id   INTEGER NOT NULL REFERENCES districts(district_id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    code          VARCHAR(20) NOT NULL UNIQUE,
    urban_rural   VARCHAR(20),
    geom          geometry(MultiPolygon, 4326),
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sectors (
    sector_id          INTEGER PRIMARY KEY,
    parent_sector_id   INTEGER REFERENCES sectors(sector_id) ON DELETE SET NULL,
    name               VARCHAR(150) NOT NULL,
    code               VARCHAR(50) NOT NULL UNIQUE,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS industrial_estates (
    estate_id     INTEGER PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    estate_type   VARCHAR(60),
    district_id   INTEGER REFERENCES districts(district_id) ON DELETE SET NULL,
    geom          geometry(MultiPolygon, 4326),
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. SURVEY FORM & QUESTIONNAIRE DEFINITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS survey_forms (
    form_id       INTEGER PRIMARY KEY,
    title         VARCHAR(150) NOT NULL,
    version       VARCHAR(20) NOT NULL,
    description   TEXT,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_sections (
    section_id    INTEGER PRIMARY KEY,
    form_id       INTEGER NOT NULL REFERENCES survey_forms(form_id) ON DELETE CASCADE,
    title         VARCHAR(150) NOT NULL,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_questions (
    question_id       INTEGER PRIMARY KEY,
    section_id        INTEGER NOT NULL REFERENCES survey_sections(section_id) ON DELETE CASCADE,
    question_code     VARCHAR(30) NOT NULL,
    question_text     TEXT NOT NULL,
    question_type     VARCHAR(20) NOT NULL,
    is_mandatory      BOOLEAN DEFAULT FALSE,
    validation_rule   JSONB,
    options           JSONB,
    sort_order        INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_question_logic (
    logic_id               INTEGER PRIMARY KEY,
    question_id            INTEGER NOT NULL REFERENCES survey_questions(question_id) ON DELETE CASCADE,
    condition_question_id  INTEGER NOT NULL REFERENCES survey_questions(question_id) ON DELETE CASCADE,
    condition_operator     VARCHAR(10) NOT NULL,
    condition_value        TEXT NOT NULL,
    action                VARCHAR(15) NOT NULL,
    created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key      VARCHAR(100) PRIMARY KEY,
    setting_value    TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. UNIT / SURVEY RESPONSE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS industrial_units (
    unit_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_code           VARCHAR(30) UNIQUE NOT NULL,
    unit_name           VARCHAR(200) NOT NULL,
    sector_id           INTEGER,
    estate_id           INTEGER,
    cluster_id          INTEGER,
    province_id         INTEGER,
    division_id         INTEGER,
    district_id         INTEGER,
    tehsil_id           INTEGER,
    address             TEXT,
    contact_person      VARCHAR(150),
    contact_phone       VARCHAR(20),
    contact_email       VARCHAR(150),
    ownership_type      VARCHAR(30),
    employment_size     INTEGER,
    operational_status  VARCHAR(20) DEFAULT 'Unverified',
    geom                geometry(Point, 4326),
    gps_accuracy_m      NUMERIC(6,2),
    is_verified         BOOLEAN DEFAULT FALSE,
    verified_by         VARCHAR(150),
    verified_at         TIMESTAMPTZ,
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
    response_id         UUID PRIMARY KEY,
    form_id             INTEGER NOT NULL REFERENCES survey_forms(form_id),
    unit_id             UUID REFERENCES industrial_units(unit_id) ON DELETE SET NULL,
    surveyor_id         UUID NOT NULL,
    device_id           VARCHAR(100),
    gps_lat             NUMERIC(9,6),
    gps_lng             NUMERIC(9,6),
    gps_accuracy_m      NUMERIC(6,2),
    started_at          TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ,
    sync_status         VARCHAR(15) DEFAULT 'draft',
    is_offline_capture  BOOLEAN DEFAULT TRUE,
    completeness_score  NUMERIC(5,2),
    is_duplicate        BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_answers (
    answer_id        BIGSERIAL PRIMARY KEY,
    response_id      UUID NOT NULL REFERENCES survey_responses(response_id) ON DELETE CASCADE,
    question_id      INTEGER NOT NULL REFERENCES survey_questions(question_id),
    answer_value     JSONB,
    answered_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS duplicate_flags (
    flag_id          BIGSERIAL PRIMARY KEY,
    response_id      UUID NOT NULL REFERENCES survey_responses(response_id) ON DELETE CASCADE,
    matched_unit_id  UUID REFERENCES industrial_units(unit_id) ON DELETE SET NULL,
    match_reason     TEXT,
    is_resolved      BOOLEAN DEFAULT FALSE,
    resolved_by      UUID,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_log (
    sync_id           BIGSERIAL PRIMARY KEY,
    device_id         VARCHAR(100) NOT NULL,
    user_id           UUID NOT NULL REFERENCES users(user_id),
    sync_started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    sync_completed_at TIMESTAMPTZ,
    records_pushed    INTEGER NOT NULL DEFAULT 0,
    status            VARCHAR(20) NOT NULL DEFAULT 'partial'
);

-- ============================================================================
-- 5. SURVEY SUBMISSION MASTER
-- ============================================================================
CREATE TABLE IF NOT EXISTS survey_submissions (
    survey_id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_code                   VARCHAR(50) UNIQUE NOT NULL,
    survey_ref_no               VARCHAR(50),
    interview_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    enumerator_name             VARCHAR(150) NOT NULL,
    enumerator_signature        TEXT,
    coordinates_lat             NUMERIC(9,6) NOT NULL,
    coordinates_lng             NUMERIC(9,6) NOT NULL,
    gps_accuracy_m              NUMERIC(6,2),
    geom                        geometry(Point, 4326),
    photo_interview_session     TEXT,
    photo_entrance_signboard    TEXT,
    device_id                   VARCHAR(100),
    sync_status                 VARCHAR(20) DEFAULT 'draft' CHECK (sync_status IN ('draft','pending_sync','synced','rejected')),
    is_verified                 BOOLEAN DEFAULT FALSE,
    verified_by                 VARCHAR(100),
    verified_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_submissions_geom ON survey_submissions USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_sync ON survey_submissions (sync_status);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_unit_code ON survey_submissions (unit_code);

-- ============================================================================
-- 6. SECTION A: ESTABLISHMENT IDENTITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_a_establishment_identity (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    establishment_name          VARCHAR(255) NOT NULL,
    year_of_establishment       INTEGER,
    address                     TEXT NOT NULL,
    city                        VARCHAR(100) NOT NULL,
    tehsil                      VARCHAR(100) NOT NULL,
    district                    VARCHAR(100) NOT NULL,
    phone_cell                  VARCHAR(50),
    email                       VARCHAR(150),
    website                     VARCHAR(200),
    unit_type                   VARCHAR(150),
    psic_division               VARCHAR(50),
    psic_group                  VARCHAR(50),
    psic_class                  VARCHAR(50),
    area_zone_type              VARCHAR(60) CHECK (area_zone_type IN (
                                    'Industrial Area', 'Residential Area', 'Commercial Area', 
                                    'Rural / Agricultural', 'Special Economic Zone / Industrial Estate', 'Other'
                                )),
    area_zone_other_specify     TEXT,
    ownership_type              VARCHAR(50) CHECK (ownership_type IN (
                                    'State owned/Public Sector', 'Privately Owned', 
                                    'Foreign Controlled Enterprise', 'Other, if any'
                                )),
    legal_structure             VARCHAR(50) CHECK (legal_structure IN (
                                    'Sole Proprietorship', 'Partnership', 'Private Limited Company', 
                                    'Public Limited Company', 'Cooperative / Society', 
                                    'Limited Liability Company', 'Others'
                                )),
    legal_structure_other       TEXT,
    parent_company_name         VARCHAR(200),
    parent_company_address      TEXT,
    parent_company_phone        VARCHAR(50),
    parent_company_email        VARCHAR(150),
    total_establishment_area_sqm NUMERIC(14,2),
    total_capital_investment_pkr NUMERIC(16,2),
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_a_associated_establishments (
    associated_id               BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    name_of_establishment       VARCHAR(255) NOT NULL,
    address                     TEXT,
    major_manufacturing_activity TEXT,
    psic_code                   VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_sec_a_assoc_survey ON section_a_associated_establishments (survey_id);

-- ============================================================================
-- 7. SECTION B: OPERATIONAL DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_b_operational_details (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    operational_status          VARCHAR(50) NOT NULL CHECK (operational_status IN (
                                    'Fully Operational', 'Partially Operational', 'Seasonal', 
                                    'Temporarily Closed', 'Permanently Closed'
                                )),
    seasonal_period_specify     VARCHAR(150),
    reason_for_closure          TEXT,
    daily_operational_hours     VARCHAR(50) CHECK (daily_operational_hours IN (
                                    'Less than 8 hrs.', '8 hrs. (Single Shift)', 
                                    '16 hrs. (Double Shift)', '24 hrs. (Triple Shift)', 
                                    'Flexible / Variable'
                                )),
    working_days_per_week       NUMERIC(3,1),
    working_months_per_year     NUMERIC(3,1),
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. SECTION C: CORE & SECONDARY ACTIVITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_c_core_secondary_activities (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    has_secondary_products      BOOLEAN DEFAULT FALSE,
    summary_remarks             TEXT,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_c_products (
    product_id                  BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    product_category            VARCHAR(20) NOT NULL CHECK (product_category IN ('Main', 'Secondary')),
    sr_no                       INTEGER NOT NULL,
    product_name                VARCHAR(255) NOT NULL,
    daily_avg_output            NUMERIC(14,3),
    annual_total_production     NUMERIC(16,3),
    installed_capacity          NUMERIC(16,3),
    installed_capacity_period   VARCHAR(20) DEFAULT 'day' CHECK (installed_capacity_period IN ('day', 'month', 'year')),
    unit_of_measurement         VARCHAR(50) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sec_c_products_survey ON section_c_products (survey_id);

-- ============================================================================
-- 9. SECTION D: WORKFORCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_d_workforce (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    regular_male                INTEGER DEFAULT 0,
    regular_female              INTEGER DEFAULT 0,
    regular_total               INTEGER GENERATED ALWAYS AS (regular_male + regular_female) STORED,
    contract_male               INTEGER DEFAULT 0,
    contract_female             INTEGER DEFAULT 0,
    contract_total              INTEGER GENERATED ALWAYS AS (contract_male + contract_female) STORED,
    daily_wages_male            INTEGER DEFAULT 0,
    daily_wages_female          INTEGER DEFAULT 0,
    daily_wages_total           INTEGER GENERATED ALWAYS AS (daily_wages_male + daily_wages_female) STORED,
    grand_total_employment      INTEGER DEFAULT 0,
    is_seasonal_average         BOOLEAN DEFAULT FALSE,
    managers_male               INTEGER DEFAULT 0,
    managers_female             INTEGER DEFAULT 0,
    skilled_technical_male      INTEGER DEFAULT 0,
    skilled_technical_female    INTEGER DEFAULT 0,
    semi_skilled_male           INTEGER DEFAULT 0,
    semi_skilled_female         INTEGER DEFAULT 0,
    unskilled_male              INTEGER DEFAULT 0,
    unskilled_female            INTEGER DEFAULT 0,
    admin_supporting_male       INTEGER DEFAULT 0,
    admin_supporting_female     INTEGER DEFAULT 0,
    channel_universities        BOOLEAN DEFAULT FALSE,
    channel_tvet                BOOLEAN DEFAULT FALSE,
    channel_online_portals      BOOLEAN DEFAULT FALSE,
    channel_employee_referrals  BOOLEAN DEFAULT FALSE,
    channel_internal_upskilling BOOLEAN DEFAULT FALSE,
    channel_others_specify      TEXT,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 10. SECTION E: BACKWARD LINKAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_e_backward_linkages (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    source_primary_producers_pct    NUMERIC(5,2) DEFAULT 0,
    source_traders_brokers_pct      NUMERIC(5,2) DEFAULT 0,
    source_wholesalers_dealers_pct  NUMERIC(5,2) DEFAULT 0,
    source_importers_foreign_pct    NUMERIC(5,2) DEFAULT 0,
    source_own_production_pct       NUMERIC(5,2) DEFAULT 0,
    source_spot_market_pct          NUMERIC(5,2) DEFAULT 0,
    source_others_pct               NUMERIC(5,2) DEFAULT 0,
    source_others_specify           TEXT,
    loc_local_district_pct          NUMERIC(5,2) DEFAULT 0,
    loc_regional_province_pct       NUMERIC(5,2) DEFAULT 0,
    loc_national_pct                NUMERIC(5,2) DEFAULT 0,
    loc_imported_pct                NUMERIC(5,2) DEFAULT 0,
    active_suppliers_count          VARCHAR(30) CHECK (active_suppliers_count IN ('1–2', '3–5', '6–10', 'More than 10')),
    supplier_dependency             VARCHAR(30) CHECK (supplier_dependency IN (
                                        'Low — replaceable within 1 week', 
                                        'Moderate — replaceable in 1–4 weeks', 
                                        'High — replacement takes 1–6 months', 
                                        'Critical — sole source or locked in'
                                    )),
    mode_of_procurement             VARCHAR(50) CHECK (mode_of_procurement IN (
                                        'Long-term contract (1 year or more)', 
                                        'Short-term contract (less than 1 year)', 
                                        'Spot/market purchases', 
                                        'Combination of contract and spot'
                                    )),
    has_supply_disruption_12m       BOOLEAN DEFAULT FALSE,
    disruption_reasons              JSONB,
    delivery_reliability            VARCHAR(50) CHECK (delivery_reliability IN (
                                        'Above 90% (very reliable)', 
                                        '70–90% (mostly on time, occasional delays)', 
                                        '50–70% (frequent delays)', 
                                        'Below 50% (serious delivery problem)', 
                                        'Not formally tracked'
                                    )),
    product_acceptance_rate         VARCHAR(50) CHECK (product_acceptance_rate IN (
                                        'Above 90% (very low rejection rate)', 
                                        '70–90% (occasional quality issues)', 
                                        '50–70% (frequent rejections/reworks)', 
                                        'Below 50% (serious quality problem)', 
                                        'Not formally tracked'
                                    )),
    created_at                      TIMESTAMPTZ DEFAULT now(),
    updated_at                      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_e_raw_materials (
    raw_material_id             BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    input_name                  VARCHAR(255) NOT NULL,
    unit_of_measurement         VARCHAR(50) NOT NULL,
    transformation_stage        VARCHAR(10) CHECK (transformation_stage IN ('T1', 'T2', 'T3', 'T4', 'T5', 'T6')),
    share_in_cost_pct           NUMERIC(5,2),
    hs_code                     VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_sec_e_raw_materials_survey ON section_e_raw_materials (survey_id);

-- ============================================================================
-- 11. SECTION F: FORWARD LINKAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_f_forward_linkages (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    buyer_wholesalers_pct       NUMERIC(5,2) DEFAULT 0,
    buyer_retailers_pct         NUMERIC(5,2) DEFAULT 0,
    buyer_other_mfrs_pct        NUMERIC(5,2) DEFAULT 0,
    buyer_govt_public_pct       NUMERIC(5,2) DEFAULT 0,
    buyer_direct_consumers_pct  NUMERIC(5,2) DEFAULT 0,
    buyer_export_foreign_pct    NUMERIC(5,2) DEFAULT 0,
    buyer_others_pct            NUMERIC(5,2) DEFAULT 0,
    buyer_others_specify        TEXT,
    buyer_loc_local_pct         NUMERIC(5,2) DEFAULT 0,
    buyer_loc_regional_pct      NUMERIC(5,2) DEFAULT 0,
    buyer_loc_national_pct      NUMERIC(5,2) DEFAULT 0,
    buyer_loc_exported_pct      NUMERIC(5,2) DEFAULT 0,
    global_supply_chain_role    VARCHAR(60) CHECK (global_supply_chain_role IN (
                                    'Yes, as a direct exporter', 
                                    'Yes, as a supplier to an exporter', 
                                    'No, but planning to', 'No'
                                )),
    active_buyers_count         VARCHAR(30) CHECK (active_buyers_count IN ('1–2', '3–5', '6–10', 'More than 10')),
    demand_assessment_methods   JSONB,
    buyer_availability          VARCHAR(60) CHECK (buyer_availability IN (
                                    'Low — easily replaceable (under 2 weeks)', 
                                    'Moderate — replaceable with effort (2–8 weeks)', 
                                    'High — difficult to replace (2–6 months)', 
                                    'Critical — single buyer or contractually locked'
                                )),
    sale_contract_mode          VARCHAR(50) CHECK (sale_contract_mode IN (
                                    'Long-term contract (1 year or more)', 
                                    'Short-term contract (less than 1 year)', 
                                    'Spot/market purchases', 
                                    'Combination of contract and spot'
                                )),
    sale_payment_mode           VARCHAR(60),
    has_demand_disruption_12m   BOOLEAN DEFAULT FALSE,
    demand_disruption_reasons   JSONB,
    subcontract_arrangements    VARCHAR(80) CHECK (subcontract_arrangements IN (
                                    'Receives subcontracted work from larger firms', 
                                    'Subcontracts work out to smaller firms or home workers', 
                                    'Both — gives and receive subcontracted work', 
                                    'No subcontracting arrangements'
                                )),
    competitor_perception       JSONB,
    digital_presence            JSONB,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_f_product_sales (
    sale_product_id             BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    product_name                VARCHAR(255) NOT NULL,
    unit_of_measurement         VARCHAR(50) NOT NULL,
    form_at_transformation      VARCHAR(10) CHECK (form_at_transformation IN ('T2', 'T3', 'T4', 'T5', 'T6')),
    share_in_revenue_pct         NUMERIC(5,2),
    hs_code                     VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_sec_f_sales_survey ON section_f_product_sales (survey_id);

-- ============================================================================
-- 12. SECTION G: TECHNOLOGY AND PRODUCTION PROCESSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_g_technology_production (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    processing_capacity         TEXT,
    capacity_utilization_rate   VARCHAR(30) CHECK (capacity_utilization_rate IN ('40–59%', '60–74%', '75–84%', '85–95%', 'Above 95%')),
    underutilization_reasons    JSONB,
    underutilization_other      TEXT,
    auto_manual_pct             NUMERIC(5,2) DEFAULT 0,
    auto_mechanical_pct         NUMERIC(5,2) DEFAULT 0,
    auto_semi_automatic_pct     NUMERIC(5,2) DEFAULT 0,
    auto_cnc_pct                NUMERIC(5,2) DEFAULT 0,
    auto_fully_automated_pct    NUMERIC(5,2) DEFAULT 0,
    machine_integration_level   VARCHAR(50) CHECK (machine_integration_level IN (
                                    'No integration', 'Partial integration', 'Full integration'
                                )),
    primary_machinery_source    VARCHAR(20) CHECK (primary_machinery_source IN ('Local', 'Imported', 'Both')),
    spare_parts_source          VARCHAR(20) CHECK (spare_parts_source IN ('Local', 'Imported', 'Both')),
    machinery_age_under_5y_pct  NUMERIC(5,2) DEFAULT 0,
    machinery_age_5_10y_pct     NUMERIC(5,2) DEFAULT 0,
    machinery_age_11_20y_pct    NUMERIC(5,2) DEFAULT 0,
    machinery_age_over_20y_pct  NUMERIC(5,2) DEFAULT 0,
    breakdown_frequency         VARCHAR(50) CHECK (breakdown_frequency IN (
                                    'Almost never (less than once a year)', 
                                    'Rarely (a few times a year, 1 to 5 times)', 
                                    'Occasionally (once a month on average)', 
                                    'Frequently (multiple times per month)', 
                                    'Very frequently (weekly or more)'
                                )),
    maintenance_approach        VARCHAR(50) CHECK (maintenance_approach IN (
                                    'In-house maintenance team', 'External contractor', 
                                    'Combination', 'No formal maintenance system'
                                )),
    production_planning_system  VARCHAR(60),
    inventory_management        VARCHAR(60),
    innovation_activities       JSONB,
    rd_expenditure              VARCHAR(30) CHECK (rd_expenditure IN (
                                    'No R&D expenditure', 'Less than 1%', '1–3%', '3–5%', 'More than 5%'
                                )),
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_g_critical_machines (
    machine_id                  BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    machine_name                VARCHAR(255) NOT NULL,
    quantity                    INTEGER DEFAULT 1,
    salient_specification       TEXT
);
CREATE INDEX IF NOT EXISTS idx_sec_g_machines_survey ON section_g_critical_machines (survey_id);

CREATE TABLE IF NOT EXISTS section_g_boilers_pressure_vessels (
    boiler_id                   BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    boiler_type                 VARCHAR(150) NOT NULL,
    capacity_tph                NUMERIC(10,3),
    heating_surface             VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_sec_g_boilers_survey ON section_g_boilers_pressure_vessels (survey_id);

CREATE TABLE IF NOT EXISTS section_g_weights_measures (
    equipment_id                BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    equipment_type              VARCHAR(150) NOT NULL,
    quantity                    INTEGER DEFAULT 1,
    capacity                    VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_sec_g_weights_survey ON section_g_weights_measures (survey_id);

-- ============================================================================
-- 13. SECTION H: ENERGY AND WASTE MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_h_energy_waste (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    energy_consumption_data     JSONB,
    captive_capacity_kw         NUMERIC(12,2),
    export_capacity_kw          NUMERIC(12,2),
    power_sources_details       JSONB,
    air_pollutants_generated    JSONB,
    emission_control_measures   JSONB,
    water_sourcing              JSONB,
    wastewater_management       JSONB,
    solid_waste_management      JSONB,
    green_practices             JSONB,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 14. SECTION I: CERTIFICATIONS AND COMPLIANCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_i_certifications_compliances (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    fire_safety_noc             BOOLEAN DEFAULT FALSE,
    boiler_inspection_cert      BOOLEAN DEFAULT FALSE,
    environmental_noc_epa       BOOLEAN DEFAULT FALSE,
    iee_eia_approval            BOOLEAN DEFAULT FALSE,
    certifications_status       JSONB,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 15. SECTION J: STRATEGIC BUSINESS PLAN
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_j_strategic_business_plan (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    operational_planning        JSONB,
    advisory_support            JSONB,
    reinvestment_strategy       VARCHAR(30) CHECK (reinvestment_strategy IN (
                                    'None — profits fully withdrawn', 'Less than 25%', 
                                    '25–50%', '51–75%', 'More than 75%'
                                )),
    primary_reinvestment_areas  JSONB,
    upscaling_plans             JSONB,
    upscaling_timeframe         VARCHAR(30) CHECK (upscaling_timeframe IN (
                                    'Within 1 year', '1–2 years', '2–3 years', 'Beyond 3 years'
                                )),
    upscaling_readiness_ratings JSONB,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 16. SECTION K: FUTURE COLLABORATIONS & BARRIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_k_collaborations_barriers (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    future_collaborations       JSONB,
    government_support_required JSONB,
    barrier_ratings             JSONB,
    most_critical_barrier       TEXT,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 17. TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
    tables_to_update TEXT[] := ARRAY[
        'roles',
        'permissions',
        'role_permissions',
        'users',
        'provinces',
        'divisions',
        'districts',
        'tehsils',
        'sectors',
        'industrial_estates',
        'survey_forms',
        'survey_sections',
        'survey_questions',
        'survey_question_logic',
        'system_settings',
        'industrial_units',
        'survey_responses',
        'duplicate_flags',
        'survey_submissions',
        'section_a_establishment_identity',
        'section_a_associated_establishments',
        'section_b_operational_details',
        'section_c_core_secondary_activities',
        'section_c_products',
        'section_d_workforce',
        'section_e_backward_linkages',
        'section_e_raw_materials',
        'section_f_forward_linkages',
        'section_f_product_sales',
        'section_g_technology_production',
        'section_g_critical_machines',
        'section_g_boilers_pressure_vessels',
        'section_g_weights_measures',
        'section_h_energy_waste',
        'section_i_certifications_compliances',
        'section_j_strategic_business_plan',
        'section_k_collaborations_barriers'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_update LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = t
              AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON %I', t, t);
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_timestamp_column()',
                t,
                t
            );
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- END OF TABLE CREATION SCRIPT
-- ============================================================================
