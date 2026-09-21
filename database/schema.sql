-- ============================================================================
-- GOVERNMENT OF THE PUNJAB - DIRECTORATE GENERAL OF INDUSTRIES
-- MAPPING OF MANUFACTURING UNITS IN PUNJAB
-- CENTRALIZED INDUSTRIAL SURVEY DATABASE SCHEMA (Based on Questionnaire 1.docx)
-- 
-- PostgreSQL 14+ / PostGIS 3+
-- Implements Master Survey Header + 9 Core Section Tables (A to I) + J & K
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 0. SURVEY SUBMISSION MASTER (Header & Enumeration Details)
-- ============================================================================
CREATE TABLE IF NOT EXISTS survey_submissions (
    survey_id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_code                   VARCHAR(50) UNIQUE NOT NULL,      -- Unique Unit ID (with sector & district identifier)
    survey_ref_no               VARCHAR(50),                      -- Survey Reference No.
    interview_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    enumerator_name             VARCHAR(150) NOT NULL,
    enumerator_signature        TEXT,                             -- Digital signature or URI
    coordinates_lat             NUMERIC(9,6) NOT NULL,            -- GPS Latitude
    coordinates_lng             NUMERIC(9,6) NOT NULL,            -- GPS Longitude
    gps_accuracy_m              NUMERIC(6,2),                     -- Horizontal accuracy in meters
    geom                        geometry(Point, 4326),            -- PostGIS Point feature (G9/G11)
    photo_interview_session     TEXT,                             -- Standardized timestamped geotagged photo: 1) Interview session
    photo_entrance_signboard    TEXT,                             -- 2) Enumerator at entrance with sign board
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
-- 1. SECTION A: ESTABLISHMENT IDENTITY (Table 1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_a_establishment_identity (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    establishment_name          VARCHAR(255) NOT NULL,            -- A.1 Name of Establishment
    year_of_establishment       INTEGER,                          -- A.2 Year of Establishment
    address                     TEXT NOT NULL,                    -- A.3 Address of Establishment
    city                        VARCHAR(100) NOT NULL,            -- A.4 City
    tehsil                      VARCHAR(100) NOT NULL,            -- A.4 Tehsil
    district                    VARCHAR(100) NOT NULL,            -- A.4 District
    phone_cell                  VARCHAR(50),                      -- A.5 Ph/Cell Number
    email                       VARCHAR(150),                     -- A.5 Email
    website                     VARCHAR(200),                     -- A.5 Website
    unit_type                   VARCHAR(150),                     -- A.6 Type of Unit (List L-1)
    psic_division               VARCHAR(50),                      -- A.7 PSIC Division
    psic_group                  VARCHAR(50),                      -- A.7 PSIC Group
    psic_class                  VARCHAR(50),                      -- A.7 PSIC Class
    area_zone_type              VARCHAR(60) CHECK (area_zone_type IN (
                                    'Industrial Area', 'Residential Area', 'Commercial Area', 
                                    'Rural / Agricultural', 'Special Economic Zone / Industrial Estate', 'Other'
                                )),                               -- A.8 Area/Zone Type
    area_zone_other_specify     TEXT,                             -- A.8 If Other, specify
    ownership_type              VARCHAR(50) CHECK (ownership_type IN (
                                    'State owned/Public Sector', 'Privately Owned', 
                                    'Foreign Controlled Enterprise', 'Other, if any'
                                )),                               -- A.9 Ownership
    legal_structure             VARCHAR(50) CHECK (legal_structure IN (
                                    'Sole Proprietorship', 'Partnership', 'Private Limited Company', 
                                    'Public Limited Company', 'Cooperative / Society', 
                                    'Limited Liability Company', 'Others'
                                )),                               -- A.10 Legal Structure
    legal_structure_other       TEXT,                             -- A.10 If Others, specify
    parent_company_name         VARCHAR(200),                     -- A.11 Parent Company Name
    parent_company_address      TEXT,                             -- A.11 Parent Company Address
    parent_company_phone        VARCHAR(50),                      -- A.11 Parent Phone/Cell
    parent_company_email        VARCHAR(150),                     -- A.11 Parent Email
    total_establishment_area_sqm NUMERIC(14,2),                   -- A.13 Total Area (Sq. Meters)
    total_capital_investment_pkr NUMERIC(16,2),                   -- A.14 Total Capital Investment (PKR)
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- Child table for A.12 Associated Establishments (1-to-Many)
CREATE TABLE IF NOT EXISTS section_a_associated_establishments (
    associated_id               BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,                 -- 1, 2, 3...
    name_of_establishment       VARCHAR(255) NOT NULL,
    address                     TEXT,
    major_manufacturing_activity TEXT,
    psic_code                   VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_sec_a_assoc_survey ON section_a_associated_establishments (survey_id);

-- ============================================================================
-- 2. SECTION B: OPERATIONAL DETAILS (Table 2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_b_operational_details (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    operational_status          VARCHAR(50) NOT NULL CHECK (operational_status IN (
                                    'Fully Operational', 'Partially Operational', 'Seasonal', 
                                    'Temporarily Closed', 'Permanently Closed'
                                )),                               -- B.1 Current Status
    seasonal_period_specify     VARCHAR(150),                     -- B.1 If seasonal, period
    reason_for_closure          TEXT,                             -- B.2 Reason for closure if any
    daily_operational_hours     VARCHAR(50) CHECK (daily_operational_hours IN (
                                    'Less than 8 hrs.', '8 hrs. (Single Shift)', 
                                    '16 hrs. (Double Shift)', '24 hrs. (Triple Shift)', 
                                    'Flexible / Variable'
                                )),                               -- B.3 Daily Operational Hours
    working_days_per_week       NUMERIC(3,1),                     -- B.3 Working days/week
    working_months_per_year     NUMERIC(3,1),                     -- B.3 Working months/year
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. SECTION C: CORE & SECONDARY ACTIVITIES (Table 3 & Products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_c_core_secondary_activities (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    has_secondary_products      BOOLEAN DEFAULT FALSE,
    summary_remarks             TEXT,
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- Repeating Products Table for C.1 Main Products & C.2 Secondary Products
CREATE TABLE IF NOT EXISTS section_c_products (
    product_id                  BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    product_category            VARCHAR(20) NOT NULL CHECK (product_category IN ('Main', 'Secondary')), -- C.1 vs C.2
    sr_no                       INTEGER NOT NULL,
    product_name                VARCHAR(255) NOT NULL,
    daily_avg_output            NUMERIC(14,3),
    annual_total_production     NUMERIC(16,3),
    installed_capacity          NUMERIC(16,3),                    -- installed capacity
    installed_capacity_period   VARCHAR(20) DEFAULT 'day' CHECK (installed_capacity_period IN ('day', 'month', 'year')),
    unit_of_measurement         VARCHAR(50) NOT NULL              -- kg, tons, meters, units, etc.
);
CREATE INDEX IF NOT EXISTS idx_sec_c_products_survey ON section_c_products (survey_id);

-- ============================================================================
-- 4. SECTION D: WORKFORCE (Table 4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_d_workforce (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    -- D.1 Employment Details by Contract Type (Male, Female, Total)
    regular_male                INTEGER DEFAULT 0,
    regular_female              INTEGER DEFAULT 0,
    regular_total               INTEGER GENERATED ALWAYS AS (regular_male + regular_female) STORED,
    contract_male               INTEGER DEFAULT 0,
    contract_female             INTEGER DEFAULT 0,
    contract_total              INTEGER GENERATED ALWAYS AS (contract_male + contract_female) STORED,
    daily_wages_male            INTEGER DEFAULT 0,
    daily_wages_female          INTEGER DEFAULT 0,
    daily_wages_total           INTEGER GENERATED ALWAYS AS (daily_wages_male + daily_wages_female) STORED,
    grand_total_employment      INTEGER DEFAULT 0,                -- Sum of all workers
    is_seasonal_average         BOOLEAN DEFAULT FALSE,            -- Seasonal average indicator
    -- D.2 Employment by Skill Level (Male, Female, Total)
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
    -- D.3 Hiring Channels (Checkboxes)
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
-- 5. SECTION E: BACKWARD LINKAGES (RAW MATERIALS & SOURCING) (Table 5)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_e_backward_linkages (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    -- E.1 Raw Material Sourcing Type (%)
    source_primary_producers_pct    NUMERIC(5,2) DEFAULT 0,
    source_traders_brokers_pct      NUMERIC(5,2) DEFAULT 0,
    source_wholesalers_dealers_pct  NUMERIC(5,2) DEFAULT 0,
    source_importers_foreign_pct    NUMERIC(5,2) DEFAULT 0,
    source_own_production_pct       NUMERIC(5,2) DEFAULT 0,
    source_spot_market_pct          NUMERIC(5,2) DEFAULT 0,
    source_others_pct               NUMERIC(5,2) DEFAULT 0,
    source_others_specify           TEXT,
    -- E.2 Source Location (%)
    loc_local_district_pct          NUMERIC(5,2) DEFAULT 0,
    loc_regional_province_pct       NUMERIC(5,2) DEFAULT 0,
    loc_national_pct                NUMERIC(5,2) DEFAULT 0,
    loc_imported_pct                NUMERIC(5,2) DEFAULT 0,
    -- E.3 to E.8 Supplier Indicators
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
    disruption_reasons              JSONB,                            -- ['Supplier failure', 'Price spike', 'Import restriction', etc.]
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

-- Child Table for E.9 Raw Material Details (Repeating Inputs)
CREATE TABLE IF NOT EXISTS section_e_raw_materials (
    raw_material_id             BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    input_name                  VARCHAR(255) NOT NULL,
    unit_of_measurement         VARCHAR(50) NOT NULL,
    transformation_stage        VARCHAR(10) CHECK (transformation_stage IN ('T1', 'T2', 'T3', 'T4', 'T5', 'T6')), -- UN BEC Rev 5
    share_in_cost_pct           NUMERIC(5,2),
    hs_code                     VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_sec_e_raw_materials_survey ON section_e_raw_materials (survey_id);

-- ============================================================================
-- 6. SECTION F: FORWARD LINKAGES (BUYERS & MARKETS) (Table 6)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_f_forward_linkages (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    -- F.1 Buyer Type (%)
    buyer_wholesalers_pct       NUMERIC(5,2) DEFAULT 0,
    buyer_retailers_pct         NUMERIC(5,2) DEFAULT 0,
    buyer_other_mfrs_pct        NUMERIC(5,2) DEFAULT 0,
    buyer_govt_public_pct       NUMERIC(5,2) DEFAULT 0,
    buyer_direct_consumers_pct  NUMERIC(5,2) DEFAULT 0,
    buyer_export_foreign_pct    NUMERIC(5,2) DEFAULT 0,
    buyer_others_pct            NUMERIC(5,2) DEFAULT 0,
    buyer_others_specify        TEXT,
    -- F.2 Location of Buyers (%)
    buyer_loc_local_pct         NUMERIC(5,2) DEFAULT 0,
    buyer_loc_regional_pct      NUMERIC(5,2) DEFAULT 0,
    buyer_loc_national_pct      NUMERIC(5,2) DEFAULT 0,
    buyer_loc_exported_pct      NUMERIC(5,2) DEFAULT 0,
    -- F.3 - F.9 Buyer Indicators
    global_supply_chain_role    VARCHAR(60) CHECK (global_supply_chain_role IN (
                                    'Yes, as a direct exporter', 
                                    'Yes, as a supplier to an exporter', 
                                    'No, but planning to', 'No'
                                )),
    active_buyers_count         VARCHAR(30) CHECK (active_buyers_count IN ('1–2', '3–5', '6–10', 'More than 10')),
    demand_assessment_methods   JSONB,                            -- ['Direct buyer feedback', 'Trade fairs', etc.]
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
    sale_payment_mode           VARCHAR(60),                      -- Cash, Credit short, Credit med, LC, Consignment, Mixed
    has_demand_disruption_12m   BOOLEAN DEFAULT FALSE,
    demand_disruption_reasons   JSONB,                            -- ['Buyer insolvency', 'Price collapse', etc.]
    subcontract_arrangements    VARCHAR(80) CHECK (subcontract_arrangements IN (
                                    'Receives subcontracted work from larger firms', 
                                    'Subcontracts work out to smaller firms or home workers', 
                                    'Both — gives and receive subcontracted work', 
                                    'No subcontracting arrangements'
                                )),                               -- F.11
    competitor_perception       JSONB,                            -- F.12 Matrix: quality, price, delivery, variety, service, technology
    digital_presence            JSONB,                            -- F.13 Matrix: website, social media, B2B, e-commerce, ads
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- Child Table for F.10 Product Details (Sales & Revenue Shares)
CREATE TABLE IF NOT EXISTS section_f_product_sales (
    sale_product_id             BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    product_name                VARCHAR(255) NOT NULL,
    unit_of_measurement         VARCHAR(50) NOT NULL,
    form_at_transformation      VARCHAR(10) CHECK (form_at_transformation IN ('T2', 'T3', 'T4', 'T5', 'T6')),
    share_in_revenue_pct        NUMERIC(5,2),
    hs_code                     VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_sec_f_sales_survey ON section_f_product_sales (survey_id);

-- ============================================================================
-- 7. SECTION G: TECHNOLOGY AND PRODUCTION PROCESSES (Table 7)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_g_technology_production (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    processing_capacity         TEXT,                             -- G.2 Processing Capacity
    capacity_utilization_rate   VARCHAR(30) CHECK (capacity_utilization_rate IN ('40–59%', '60–74%', '75–84%', '85–95%', 'Above 95%')), -- G.3
    underutilization_reasons    JSONB,                            -- G.4 Reasons if < 75%
    underutilization_other      TEXT,
    -- G.5 Automation Level (% of total machinery)
    auto_manual_pct             NUMERIC(5,2) DEFAULT 0,
    auto_mechanical_pct         NUMERIC(5,2) DEFAULT 0,
    auto_semi_automatic_pct     NUMERIC(5,2) DEFAULT 0,
    auto_cnc_pct                NUMERIC(5,2) DEFAULT 0,
    auto_fully_automated_pct    NUMERIC(5,2) DEFAULT 0,
    -- G.6 Integration & Sourcing
    machine_integration_level   VARCHAR(50) CHECK (machine_integration_level IN (
                                    'No integration', 'Partial integration', 'Full integration'
                                )),
    primary_machinery_source    VARCHAR(20) CHECK (primary_machinery_source IN ('Local', 'Imported', 'Both')),
    spare_parts_source          VARCHAR(20) CHECK (spare_parts_source IN ('Local', 'Imported', 'Both')),
    -- G.8 Machinery Age Profile (%)
    machinery_age_under_5y_pct  NUMERIC(5,2) DEFAULT 0,
    machinery_age_5_10y_pct     NUMERIC(5,2) DEFAULT 0,
    machinery_age_11_20y_pct    NUMERIC(5,2) DEFAULT 0,
    machinery_age_over_20y_pct  NUMERIC(5,2) DEFAULT 0,
    -- G.9 - G.16 Systems & Innovation
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
    production_planning_system  VARCHAR(60),                      -- G.13 Manual, Excel, Software, ERP, Custom
    inventory_management        VARCHAR(60),                      -- G.14 No formal, registers, spreadsheet, ERP, software
    innovation_activities       JSONB,                            -- G.15 Matrix of 15 upgrade activities (Completed/Ongoing/Planned)
    rd_expenditure              VARCHAR(30) CHECK (rd_expenditure IN (
                                    'No R&D expenditure', 'Less than 1%', '1–3%', '3–5%', 'More than 5%'
                                )),
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- Child Table for G.1 Critical Machinery
CREATE TABLE IF NOT EXISTS section_g_critical_machines (
    machine_id                  BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    machine_name                VARCHAR(255) NOT NULL,
    quantity                    INTEGER DEFAULT 1,
    salient_specification       TEXT
);
CREATE INDEX IF NOT EXISTS idx_sec_g_machines_survey ON section_g_critical_machines (survey_id);

-- Child Table for G.11 Boilers & Pressure Vessels
CREATE TABLE IF NOT EXISTS section_g_boilers_pressure_vessels (
    boiler_id                   BIGSERIAL PRIMARY KEY,
    survey_id                   UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    sr_no                       INTEGER NOT NULL,
    boiler_type                 VARCHAR(150) NOT NULL,
    capacity_tph                NUMERIC(10,3),                    -- Steam production per hour (TPH)
    heating_surface             VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_sec_g_boilers_survey ON section_g_boilers_pressure_vessels (survey_id);

-- Child Table for G.12 Weights and Measures Equipment
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
-- 8. SECTION H: ENERGY AND WASTE MANAGEMENT (Table 8)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_h_energy_waste (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    -- H.1 Energy Consumption (Monthly quantity & % share)
    energy_consumption_data     JSONB,                            -- { grid_electricity: { qty, pct }, diesel: { qty, pct }, gas: { qty, pct }, coal: { qty, pct }, etc. }
    -- H.2 Energy Generation (Captive Power)
    captive_capacity_kw         NUMERIC(12,2),
    export_capacity_kw          NUMERIC(12,2),
    power_sources_details       JSONB,                            -- Gensets, Solar, Powerhouse, Other
    -- H.3 Air Pollutants Generated (Multi-select)
    air_pollutants_generated    JSONB,                            -- PM10/PM2.5, SO2, NOx, CO, CO2, CH4, VOCs, etc.
    -- H.4 Emission Control Measures (Multi-select)
    emission_control_measures   JSONB,                            -- Chimney compliance, Bag filter, Wet scrubber, ESP, Cyclone, etc.
    -- H.5 Water Sourcing (Multi-select)
    water_sourcing              JSONB,                            -- Municipal, Own tube well, Canal, Tanker, Recycled, Other
    -- H.6 Wastewater Management (Yes/No flags)
    wastewater_management       JSONB,                            -- Treated on-site, municipal drain, open land, CETP, recycled, contractor
    -- H.7 Solid Waste and By-product Management
    solid_waste_management      JSONB,                            -- Production scrap, packaging, hazardous, e-waste, organic, sludge + disposal methods
    -- H.8 Green Practices and Circular Economy
    green_practices             JSONB,                            -- 10 practices (Yes / No / Planned)
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 9. SECTION I: CERTIFICATIONS AND COMPLIANCES (Table 9)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_i_certifications_compliances (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    -- I.1 Factory Safety & Environmental Compliances (Held Yes/No)
    fire_safety_noc             BOOLEAN DEFAULT FALSE,            -- Punjab Emergency Service (Rescue 1122)
    boiler_inspection_cert      BOOLEAN DEFAULT FALSE,            -- Punjab Boiler Inspectorate
    environmental_noc_epa       BOOLEAN DEFAULT FALSE,            -- Punjab EPA Permit
    iee_eia_approval            BOOLEAN DEFAULT FALSE,            -- Initial Environmental Examination / EIA Approval
    -- I.2 Quality, Safety, Export & Green Certifications (Held / In Progress / N/A)
    certifications_status       JSONB,                            -- ISO 9001, 14001, 45001, OSHA, 50001, SA8000, PSQCA, GSP+, CE, BSCI/SMETA/SEDEX, Other
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 10. SECTION J: STRATEGIC BUSINESS PLAN (Table 10)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_j_strategic_business_plan (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    operational_planning        JSONB,                            -- J.1 Formal / Informal / No Plan across 6 areas
    advisory_support            JSONB,                            -- J.2 Business consultant, trade assoc, govt, etc.
    reinvestment_strategy       VARCHAR(30) CHECK (reinvestment_strategy IN (
                                    'None — profits fully withdrawn', 'Less than 25%', 
                                    '25–50%', '51–75%', 'More than 75%'
                                )),                               -- J.3
    primary_reinvestment_areas  JSONB,                            -- J.4 Machinery, capacity, working capital, R&D, etc.
    upscaling_plans             JSONB,                            -- J.5 Volume, new lines, domestic, export, technology, etc.
    upscaling_timeframe         VARCHAR(30) CHECK (upscaling_timeframe IN (
                                    'Within 1 year', '1–2 years', '2–3 years', 'Beyond 3 years'
                                )),                               -- J.6
    upscaling_readiness_ratings JSONB,                            -- J.7 Scale 1 to 5 across 8 readiness dimensions
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 11. SECTION K: FUTURE COLLABORATIONS & BARRIERS (Table 11)
-- ============================================================================
CREATE TABLE IF NOT EXISTS section_k_collaborations_barriers (
    survey_id                   UUID PRIMARY KEY REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    future_collaborations       JSONB,                            -- K.1 Collaborators & Purposes
    government_support_required JSONB,                            -- K.2 Subsidies, loans, tax rebate, technical assist, etc.
    barrier_ratings             JSONB,                            -- K.3 Scale 1 to 5 across Production, Market, Finance, Regulatory
    most_critical_barrier       TEXT,                             -- K.4 Single most critical barrier
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- DATABASE TRIGGERS (Auto updated_at maintenance)
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
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public' 
          AND table_name LIKE 'section_%' OR table_name = 'survey_submissions'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON %I', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_timestamp_column()', t, t);
    END LOOP;
END;
$$;
