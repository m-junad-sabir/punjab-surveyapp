-- Punjab Industries Survey App - PostgreSQL 16 / PostGIS schema
-- Generated from the schema definition. Run first, then 02_seed_reference_data.sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ===== M1: People & Access =====
-- The three app roles: ADMIN, SUPERVISOR, SURVEYOR.
CREATE TABLE roles (
  id smallserial NOT NULL PRIMARY KEY,
  code varchar(30) NOT NULL UNIQUE,
  name varchar(60) NOT NULL,
  description text
);

-- Small, separate rights (e.g. USER_CREATE, SURVEY_APPROVE).
CREATE TABLE permissions (
  id smallserial NOT NULL PRIMARY KEY,
  code varchar(60) NOT NULL UNIQUE,
  description text
);

-- Which role holds which right (many-to-many link).
CREATE TABLE role_permissions (
  role_id smallint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id smallint NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Every person who can log in: admins, supervisors and surveyors.
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  username varchar(50) NOT NULL UNIQUE,
  full_name varchar(120) NOT NULL,
  designation varchar(80),
  email varchar(120) UNIQUE,
  phone varchar(20),
  password_hash text NOT NULL,
  role_id smallint NOT NULL REFERENCES roles(id),
  supervisor_id uuid REFERENCES users(id),
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  deactivated_at timestamptz
);


-- ===== M2: Geography =====
-- Top level of the area hierarchy.
CREATE TABLE provinces (
  id smallserial NOT NULL PRIMARY KEY,
  code varchar(10) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  geom geometry(MultiPolygon,4326)
);

-- Second level (e.g. Lahore Division).
CREATE TABLE divisions (
  id serial NOT NULL PRIMARY KEY,
  province_id smallint NOT NULL REFERENCES provinces(id),
  code varchar(10) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  geom geometry(MultiPolygon,4326)
);

-- Third level. Drop-down in Section A-v.
CREATE TABLE districts (
  id serial NOT NULL PRIMARY KEY,
  division_id integer NOT NULL REFERENCES divisions(id),
  code varchar(10) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  geom geometry(MultiPolygon,4326)
);

-- Fourth level. Filtered by the chosen district.
CREATE TABLE tehsils (
  id serial NOT NULL PRIMARY KEY,
  district_id integer NOT NULL REFERENCES districts(id),
  code varchar(10) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  geom geometry(MultiPolygon,4326),
  UNIQUE (district_id, name)
);


-- ===== M3: Classification & Units =====
-- PSIC level 1: Division (Section A-vii).
CREATE TABLE psic_divisions (
  id serial NOT NULL PRIMARY KEY,
  code varchar(10) NOT NULL UNIQUE,
  name text NOT NULL
);

-- PSIC level 2: Group. Filtered by division.
CREATE TABLE psic_groups (
  id serial NOT NULL PRIMARY KEY,
  division_id integer NOT NULL REFERENCES psic_divisions(id),
  code varchar(10) NOT NULL UNIQUE,
  name text NOT NULL
);

-- PSIC level 3: Class. Filtered by group. Also searched by word in A-xii.
CREATE TABLE psic_classes (
  id serial NOT NULL PRIMARY KEY,
  group_id integer NOT NULL REFERENCES psic_groups(id),
  code varchar(10) NOT NULL UNIQUE,
  name text NOT NULL
);

-- Harmonized System product codes (Sections C-vii and E-ix).
CREATE TABLE hs_codes (
  id serial NOT NULL PRIMARY KEY,
  code varchar(12) NOT NULL UNIQUE,
  description text NOT NULL
);

-- All units used in the survey (area, quantity, energy, power).
CREATE TABLE measurement_units (
  id serial NOT NULL PRIMARY KEY,
  code varchar(20) NOT NULL UNIQUE,
  name varchar(60) NOT NULL,
  unit_kind varchar(20) NOT NULL CHECK (unit_kind IN ('AREA','QUANTITY','ENERGY','POWER','OTHER'))
);

CREATE TABLE product_measurement_units (
  unit_id integer PRIMARY KEY REFERENCES measurement_units(id),
  display_label text NOT NULL,
  sort_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  product_only boolean NOT NULL DEFAULT false
);


-- ===== M4: Questionnaire & Dropdown Lists =====
-- One row per drop-down list (e.g. OWNERSHIP_TYPE).
CREATE TABLE lookup_types (
  id serial NOT NULL PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  description text
);

-- The choices inside each drop-down list.
CREATE TABLE lookup_values (
  id serial NOT NULL PRIMARY KEY,
  type_id integer NOT NULL REFERENCES lookup_types(id) ON DELETE CASCADE,
  code varchar(60) NOT NULL,
  label text NOT NULL,
  requires_text boolean DEFAULT false NOT NULL,
  numeric_value numeric(10,2),
  sort_order smallint DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  UNIQUE (type_id, code)
);

CREATE TABLE industry_product_options (
  id serial PRIMARY KEY CHECK (id > 0),
  unit_type_id integer NOT NULL REFERENCES lookup_values(id),
  product_kind varchar(10) NOT NULL CHECK (product_kind IN ('MAIN','SECONDARY')),
  product_name text NOT NULL,
  sort_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (unit_type_id, product_kind, product_name)
);

-- Allowed-choice filters: which child choices appear after a parent choice (waste type -> disposal methods, collaborator -> purposes).
CREATE TABLE lookup_value_links (
  parent_value_id integer NOT NULL REFERENCES lookup_values(id) ON DELETE CASCADE,
  child_value_id integer NOT NULL REFERENCES lookup_values(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_value_id, child_value_id)
);

-- A versioned survey form. A new round = new row, no app redeploy.
CREATE TABLE survey_forms (
  id serial NOT NULL PRIMARY KEY,
  code varchar(40) NOT NULL,
  title text NOT NULL,
  version int DEFAULT 1 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (code, version)
);

-- Sections A to K of a form.
CREATE TABLE survey_sections (
  id serial NOT NULL PRIMARY KEY,
  form_id integer NOT NULL REFERENCES survey_forms(id) ON DELETE CASCADE,
  section_code char(1) NOT NULL,
  title text NOT NULL,
  sort_order smallint DEFAULT 0 NOT NULL,
  UNIQUE (form_id, section_code)
);

-- Question register. Every question stored in a generic table (choices, shares, matrix) must be listed here.
CREATE TABLE survey_questions (
  id serial NOT NULL PRIMARY KEY,
  section_id integer NOT NULL REFERENCES survey_sections(id) ON DELETE CASCADE,
  question_code varchar(60) NOT NULL UNIQUE,
  question_no varchar(10),
  question_text text NOT NULL,
  answer_type varchar(20) NOT NULL CHECK (answer_type IN ('TEXT','NUMBER','YES_NO','SINGLE_CHOICE','MULTI_CHOICE','SHARE_PERCENT','MATRIX','REPEATING_GROUP')),
  lookup_type_id integer REFERENCES lookup_types(id),
  is_required boolean DEFAULT false NOT NULL,
  stored_in varchar(80)
);

-- Rows of tick-box tables (e.g. each innovation activity, each barrier).
CREATE TABLE matrix_items (
  id serial NOT NULL PRIMARY KEY,
  question_id integer NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  group_label varchar(100),
  item_code varchar(60) NOT NULL,
  item_label text NOT NULL,
  answer_type varchar(15) NOT NULL CHECK (answer_type IN ('CHOICE','RATING_1_5')),
  scale_type_id integer REFERENCES lookup_types(id),
  allows_text boolean DEFAULT false NOT NULL,
  sort_order smallint DEFAULT 0 NOT NULL,
  UNIQUE (question_id, item_code)
);


-- ===== M5: Establishment Master (Section A) =====
-- Industrial estates / special zones (optional link from a unit).
CREATE TABLE industrial_estates (
  id serial NOT NULL PRIMARY KEY,
  name text NOT NULL,
  district_id integer REFERENCES districts(id),
  geom geometry(MultiPolygon,4326)
);

-- Clusters of similar factories (used for cluster-wise dashboard).
CREATE TABLE industrial_clusters (
  id serial NOT NULL PRIMARY KEY,
  name text NOT NULL,
  district_id integer REFERENCES districts(id),
  geom geometry(MultiPolygon,4326)
);

-- Master list of establishments. All of Section A lives here.
CREATE TABLE industrial_units (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  unit_code varchar(30) UNIQUE,
  name text NOT NULL,
  establishment_year smallint CHECK (establishment_year BETWEEN 1800 AND 2100),
  location geometry(Point,4326),
  gps_accuracy_m numeric(8,2),
  address text,
  province_id smallint REFERENCES provinces(id),
  province_name text NOT NULL,
  division_id integer REFERENCES divisions(id),
  division_name text NOT NULL,
  district_id integer REFERENCES districts(id),
  district_name text NOT NULL,
  tehsil_id integer REFERENCES tehsils(id),
  tehsil_name text NOT NULL,
  contact_name varchar(120),
  contact_phone varchar(20),
  contact_email varchar(120),
  website varchar(200),
  psic_division_id integer REFERENCES psic_divisions(id),
  psic_division_text text,
  psic_group_id integer REFERENCES psic_groups(id),
  psic_group_text text,
  psic_class_id integer REFERENCES psic_classes(id),
  psic_class_text text,
  zone_type_id integer REFERENCES lookup_values(id),
  zone_type_other_text text,
  ownership_type_id integer REFERENCES lookup_values(id),
  ownership_other_text text,
  legal_structure_id integer REFERENCES lookup_values(id),
  legal_structure_other_text text,
  has_parent_company boolean,
  total_area_value numeric(14,2),
  total_area_unit_id integer REFERENCES measurement_units(id),
  total_capital_investment numeric(18,2)
    CONSTRAINT industrial_units_capital_investment_nonnegative_check
    CHECK (total_capital_investment IS NULL OR total_capital_investment >= 0),
  capital_investment_unit_id integer REFERENCES lookup_values(id),
  industrial_estate_id integer REFERENCES industrial_estates(id),
  industrial_estate_text text,
  industrial_cluster_id integer REFERENCES industrial_clusters(id),
  industrial_cluster_text text,
  approval_status varchar(20) DEFAULT 'PENDING' NOT NULL CHECK (approval_status IN ('PENDING','CONFIRMED','RETURNED','REJECTED')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Parent company details (A-xi) - only when has_parent_company = Yes.
CREATE TABLE unit_parent_companies (
  unit_id uuid NOT NULL PRIMARY KEY REFERENCES industrial_units(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_address text,
  phone varchar(20),
  cell varchar(20),
  email varchar(120)
);

-- Other establishments of the same parent company (A-xii). Repeating rows.
CREATE TABLE unit_associated_establishments (
  id bigserial NOT NULL PRIMARY KEY,
  unit_id uuid NOT NULL REFERENCES industrial_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  major_activity_psic_class_id integer REFERENCES psic_classes(id),
  major_activity_text text
);


-- ===== M6: Survey Capture & Approval =====
-- One survey visit to one establishment. Hub table: every section hangs off this.
CREATE TABLE survey_responses (
  id uuid NOT NULL PRIMARY KEY,
  form_id integer NOT NULL REFERENCES survey_forms(id),
  unit_id uuid NOT NULL REFERENCES industrial_units(id),
  surveyor_id uuid NOT NULL REFERENCES users(id),
  device_id varchar(100),
  gps_lat numeric(9,6),
  gps_lng numeric(9,6),
  gps_accuracy_m numeric(8,2),
  status varchar(25) DEFAULT 'DRAFT' NOT NULL CHECK (status IN ('DRAFT','PENDING_CONFIRMATION','CONFIRMED','RETURNED','REJECTED')),
  sync_status varchar(20) DEFAULT 'PENDING' NOT NULL CHECK (sync_status IN ('PENDING','SYNCED','REJECTED','DUPLICATE')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  submitted_at timestamptz,
  confirmed_by uuid REFERENCES users(id),
  confirmed_at timestamptz,
  synced_at timestamptz,
  app_version varchar(20)
);

-- A-i(a): people interviewed during this survey visit.
CREATE TABLE response_interviewees (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation text NOT NULL,
  contact_number varchar(11) NOT NULL CHECK (contact_number ~ '^[0-9]{11}$')
);

-- Photos or files taken during a survey.
CREATE TABLE survey_attachments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  section_code char(1),
  file_type varchar(20),
  file_name text,
  storage_path text NOT NULL,
  captured_at timestamptz
);

-- Before/after record of every correction to a survey.
CREATE TABLE response_edit_log (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL REFERENCES users(id),
  table_name varchar(60) NOT NULL,
  record_id text,
  field_name varchar(80),
  old_value jsonb,
  new_value jsonb,
  edited_at timestamptz DEFAULT now() NOT NULL
);

-- Submit / confirm / return / reject history (supervisor workflow).
CREATE TABLE unit_approval_log (
  id bigserial NOT NULL PRIMARY KEY,
  unit_id uuid NOT NULL REFERENCES industrial_units(id),
  response_id uuid REFERENCES survey_responses(id),
  action varchar(25) NOT NULL CHECK (action IN ('SUBMITTED','CONFIRMED','RETURNED','REJECTED')),
  acted_by uuid NOT NULL REFERENCES users(id),
  remarks text,
  acted_at timestamptz DEFAULT now() NOT NULL
);


-- ===== M7: Sections B-D: Operations, Products, Workforce =====
-- Section B: operating months, status and working hours. One row per survey.
CREATE TABLE sec_b_operations (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  operating_months smallint[],
  operation_status_id integer REFERENCES lookup_values(id),
  closure_reason text,
  daily_shift_id integer REFERENCES lookup_values(id),
  daily_hours numeric(4,1),
  working_days_per_week smallint DEFAULT 6 CHECK (working_days_per_week BETWEEN 1 AND 7),
  working_months_per_year smallint
    CONSTRAINT sec_b_operations_working_months_per_year_check
    CHECK (working_months_per_year BETWEEN 1 AND 12),
  weekly_hours numeric(5,1) GENERATED ALWAYS AS (daily_hours * working_days_per_week) STORED,
  monthly_hours numeric(6,1) GENERATED ALWAYS AS (ROUND(daily_hours * working_days_per_week * 52 / 12, 1)) STORED
);

-- Section C: main and secondary products (repeating rows).
CREATE TABLE products (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  product_kind varchar(10) NOT NULL CHECK (product_kind IN ('MAIN','SECONDARY')),
  product_name text NOT NULL,
  daily_avg_output numeric(18,2),
  daily_output_unit_id integer REFERENCES measurement_units(id),
  annual_production numeric(18,2),
  annual_production_unit_id integer REFERENCES measurement_units(id),
  installed_capacity numeric(18,2),
  installed_capacity_period varchar(10) CHECK (installed_capacity_period IN ('PER_DAY','PER_MONTH')),
  unit_of_measurement_id integer REFERENCES measurement_units(id),
  revenue_share_pct numeric(5,2) CHECK (revenue_share_pct BETWEEN 0 AND 100),
  hs_code_id integer REFERENCES hs_codes(id),
  hs_code_text text,
  sort_order smallint DEFAULT 0,
  CONSTRAINT products_id_kind_unique UNIQUE (id, product_kind),
  CONSTRAINT products_secondary_main_fields_check
    CHECK (product_kind = 'MAIN' OR (revenue_share_pct IS NULL AND hs_code_id IS NULL AND hs_code_text IS NULL))
);

-- C-v: one or more stages (T1-T6) per main product.
CREATE TABLE product_transformation_stages (
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stage_id integer NOT NULL REFERENCES lookup_values(id),
  main_product_kind varchar(10) NOT NULL DEFAULT 'MAIN',
  PRIMARY KEY (product_id, stage_id),
  CONSTRAINT product_stages_main_kind_check CHECK (main_product_kind = 'MAIN'),
  CONSTRAINT product_stages_main_product_fk FOREIGN KEY (product_id, main_product_kind)
    REFERENCES products(id, product_kind) ON DELETE CASCADE
);

-- D-i: employees by type and gender.
CREATE TABLE workforce_employment (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  gender varchar(10) NOT NULL CHECK (gender IN ('MALE','FEMALE','Other')),
  regular_count int DEFAULT 0 NOT NULL CHECK (regular_count >= 0),
  contract_count int DEFAULT 0 NOT NULL CHECK (contract_count >= 0),
  daily_wage_count int DEFAULT 0 NOT NULL CHECK (daily_wage_count >= 0),
  total_count int GENERATED ALWAYS AS (regular_count + contract_count + daily_wage_count) STORED,
  UNIQUE (response_id, gender)
);

-- D-ii: employees by skill level and gender.
CREATE TABLE workforce_skills (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  gender varchar(10) NOT NULL CHECK (gender IN ('MALE','FEMALE','Other')),
  skill_level_id integer NOT NULL REFERENCES lookup_values(id),
  headcount int DEFAULT 0 NOT NULL CHECK (headcount >= 0),
  UNIQUE (response_id, gender, skill_level_id)
);


-- ===== M8: Sections E-F: Supply Chain & Market =====
-- Section E single-answer questions (backward linkages).
CREATE TABLE sec_e_supply_chain (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  active_suppliers_id integer REFERENCES lookup_values(id),
  supplier_dependency_id integer REFERENCES lookup_values(id),
  procurement_mode_id integer REFERENCES lookup_values(id),
  had_supply_disruption boolean,
  ontime_delivery_id integer REFERENCES lookup_values(id),
  product_acceptance_id integer REFERENCES lookup_values(id)
);

-- E-ix: major raw materials / inputs (repeating rows).
CREATE TABLE major_inputs (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  input_name text NOT NULL,
  unit_id integer REFERENCES measurement_units(id),
  cost_share_pct numeric(5,2) CHECK (cost_share_pct BETWEEN 0 AND 100),
  hs_code_id integer REFERENCES hs_codes(id),
  hs_code_text text,
  transformation_stage_id integer REFERENCES lookup_values(id)
);

-- Section F single-answer questions (forward linkages).
CREATE TABLE sec_f_market (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  global_supply_chain_id integer REFERENCES lookup_values(id),
  active_buyers_id integer REFERENCES lookup_values(id),
  buyer_availability_id integer REFERENCES lookup_values(id),
  sales_mode_id integer REFERENCES lookup_values(id),
  payment_terms_id integer REFERENCES lookup_values(id),
  had_demand_gap boolean,
  subcontract_id integer REFERENCES lookup_values(id)
);


-- ===== M9: Sections G-H: Technology & Environment =====
-- Section G single-answer questions (technology and production).
CREATE TABLE sec_g_technology (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  plant_processing_capacity text,
  utilization_rate_id integer REFERENCES lookup_values(id),
  integration_level_id integer REFERENCES lookup_values(id),
  machine_source_id integer REFERENCES lookup_values(id),
  spare_parts_source_id integer REFERENCES lookup_values(id),
  breakdown_frequency_id integer REFERENCES lookup_values(id),
  maintenance_approach_id integer REFERENCES lookup_values(id),
  production_planning_id integer REFERENCES lookup_values(id),
  inventory_system_id integer REFERENCES lookup_values(id),
  rnd_expenditure_id integer REFERENCES lookup_values(id)
);

-- G-i: critical machines (repeating rows).
CREATE TABLE critical_machines (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  machine_name text NOT NULL,
  quantity int CHECK (quantity >= 0),
  specification text
);

-- G-viii: number of machines in each age bracket.
CREATE TABLE machinery_age_profile (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  age_bracket_id integer NOT NULL REFERENCES lookup_values(id),
  machine_count int DEFAULT 0 NOT NULL CHECK (machine_count >= 0),
  UNIQUE (response_id, age_bracket_id)
);

-- G-xi: boilers and pressure vessels (repeating rows).
CREATE TABLE boilers_pressure_vessels (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  vessel_type text NOT NULL,
  capacity_tph numeric(10,2),
  heating_surface text
);

-- G-xii: weights and measures equipment (repeating rows).
CREATE TABLE weights_measures_equipment (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  equipment_type text NOT NULL,
  quantity int CHECK (quantity >= 0),
  capacity text
);

-- Section H totals for energy generation.
CREATE TABLE sec_h_environment (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  captive_capacity_kw numeric(12,2),
  export_capacity_kw numeric(12,2),
  has_water_waste_management boolean,
  has_solid_waste_generation boolean,
  has_green_practices boolean
);

-- H-i: monthly use and share of each fuel/energy source.
CREATE TABLE energy_consumption (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  energy_source_id integer NOT NULL REFERENCES lookup_values(id),
  other_text text,
  quantity_per_month numeric(16,2),
  unit_id integer REFERENCES measurement_units(id),
  share_pct numeric(5,2) CHECK (share_pct BETWEEN 0 AND 100),
  UNIQUE (response_id, energy_source_id)
);

-- Unit choices are constrained by the selected monthly energy source.
CREATE TABLE energy_source_units (
  energy_source_id integer NOT NULL REFERENCES lookup_values(id),
  unit_id integer NOT NULL REFERENCES measurement_units(id),
  PRIMARY KEY (energy_source_id, unit_id)
);

-- H-ii: own power generation by source.
CREATE TABLE energy_generation (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  power_source_id integer NOT NULL REFERENCES lookup_values(id),
  other_text text,
  capacity_kw numeric(12,2),
  export_kw numeric(12,2),
  UNIQUE (response_id, power_source_id)
);

-- H-vii: each waste type and whether it is generated.
CREATE TABLE solid_waste_streams (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  waste_type_id integer NOT NULL REFERENCES lookup_values(id),
  is_generated boolean DEFAULT false NOT NULL,
  UNIQUE (response_id, waste_type_id)
);

-- Disposal methods ticked for a waste type (tick all that apply).
CREATE TABLE solid_waste_disposals (
  stream_id bigint NOT NULL REFERENCES solid_waste_streams(id) ON DELETE CASCADE,
  disposal_method_id integer NOT NULL REFERENCES lookup_values(id),
  other_text text,
  PRIMARY KEY (stream_id, disposal_method_id)
);


-- ===== M10: Sections I-K: Compliance, Strategy, Future =====
-- Section I single answer: safety training.
CREATE TABLE sec_i_compliance (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  safety_trained_workers int CHECK (safety_trained_workers >= 0)
);

-- Section J single-answer questions.
CREATE TABLE sec_j_strategy (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  reinvestment_level_id integer REFERENCES lookup_values(id),
  reinvestment_area_id integer REFERENCES lookup_values(id),
  reinvestment_area_other text,
  upscaling_time_id integer REFERENCES lookup_values(id)
);

-- Section K single-answer questions.
CREATE TABLE sec_k_future (
  response_id uuid NOT NULL PRIMARY KEY REFERENCES survey_responses(id) ON DELETE CASCADE,
  has_future_plan boolean,
  most_critical_barrier text
);

-- K-ii: each potential collaborator type (repeating rows).
CREATE TABLE collaborations (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  collaborator_type_id integer NOT NULL REFERENCES lookup_values(id),
  UNIQUE (response_id, collaborator_type_id)
);

-- Purposes chosen for each collaborator.
CREATE TABLE collaboration_purposes (
  collaboration_id bigint NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
  purpose_id integer NOT NULL REFERENCES lookup_values(id),
  PRIMARY KEY (collaboration_id, purpose_id)
);


-- ===== M11: Generic Answer Tables =====
-- Multi-select drop-downs: one row per ticked choice.
CREATE TABLE response_choices (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id integer NOT NULL REFERENCES survey_questions(id),
  option_id integer NOT NULL REFERENCES lookup_values(id),
  other_text text,
  UNIQUE (response_id, question_id, option_id)
);

-- 'Share of total' answers that should add up to 100%.
CREATE TABLE response_shares (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id integer NOT NULL REFERENCES survey_questions(id),
  option_id integer NOT NULL REFERENCES lookup_values(id),
  percent_value numeric(5,2) NOT NULL CHECK (percent_value BETWEEN 0 AND 100),
  other_text text,
  UNIQUE (response_id, question_id, option_id)
);

-- Tick-box tables: one row per row of the table.
CREATE TABLE response_matrix_answers (
  id bigserial NOT NULL PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  item_id integer NOT NULL REFERENCES matrix_items(id),
  choice_value_id integer REFERENCES lookup_values(id),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  other_text text,
  UNIQUE (response_id, item_id),
  CHECK (num_nonnulls(choice_value_id, rating) <= 1)
);


-- ===== M12: Sync, Data Quality & GIS =====
-- One row per sync session of a device.
CREATE TABLE sync_log (
  id bigserial NOT NULL PRIMARY KEY,
  surveyor_id uuid NOT NULL REFERENCES users(id),
  device_id varchar(100),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  records_sent int DEFAULT 0,
  records_synced int DEFAULT 0,
  records_rejected int DEFAULT 0,
  records_duplicate int DEFAULT 0,
  status varchar(20),
  error_message text
);

-- Suspected duplicate establishments waiting for a supervisor decision.
CREATE TABLE duplicate_flags (
  id bigserial NOT NULL PRIMARY KEY,
  unit_id uuid NOT NULL REFERENCES industrial_units(id),
  matched_unit_id uuid NOT NULL REFERENCES industrial_units(id),
  reason varchar(30) NOT NULL CHECK (reason IN ('NAME_SIMILARITY','GPS_PROXIMITY','BOTH')),
  name_similarity numeric(4,3),
  distance_m numeric(10,2),
  resolution varchar(25) DEFAULT 'OPEN' NOT NULL CHECK (resolution IN ('OPEN','CONFIRMED_DUPLICATE','NOT_DUPLICATE','MERGED')),
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Map quality checks (e.g. point outside its district).
CREATE TABLE gis_quality_log (
  id bigserial NOT NULL PRIMARY KEY,
  unit_id uuid NOT NULL REFERENCES industrial_units(id),
  check_type varchar(40) NOT NULL,
  result varchar(10) NOT NULL CHECK (result IN ('PASS','FAIL')),
  detail text,
  checked_at timestamptz DEFAULT now() NOT NULL
);

-- Background maps (satellite, street, licensed) used by app and dashboard.
CREATE TABLE base_map_layers (
  id serial NOT NULL PRIMARY KEY,
  name varchar(80) NOT NULL,
  layer_type varchar(15) NOT NULL CHECK (layer_type IN ('SATELLITE','STREET','LICENSED')),
  url_template text NOT NULL,
  attribution text,
  is_default boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL
);


-- ===== M13: Security, Audit & Dashboard =====
-- Generic before/after change log for sensitive tables.
CREATE TABLE audit_log (
  id bigserial NOT NULL PRIMARY KEY,
  table_name varchar(60) NOT NULL,
  record_id text,
  action varchar(10) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz DEFAULT now() NOT NULL
);

-- Proof that each backup job really ran.
CREATE TABLE backup_log (
  id bigserial NOT NULL PRIMARY KEY,
  backup_type varchar(15) NOT NULL CHECK (backup_type IN ('FULL','INCREMENTAL')),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status varchar(10) NOT NULL CHECK (status IN ('SUCCESS','FAILED')),
  size_mb numeric(12,2),
  storage_location text,
  verified boolean DEFAULT false NOT NULL
);

-- App-wide settings.
CREATE TABLE system_settings (
  key varchar(80) NOT NULL PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- KPIs stored as data: name + the view that calculates it.
CREATE TABLE dashboard_kpi_definitions (
  id serial NOT NULL PRIMARY KEY,
  code varchar(50) NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sql_view_name varchar(80) NOT NULL,
  unit_label varchar(30),
  is_active boolean DEFAULT true NOT NULL
);

-- Filters a user saved on the dashboard.
CREATE TABLE dashboard_saved_filters (
  id bigserial NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  filter_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);


-- ===== Indexes =====
CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX idx_users_role_id ON users (role_id);
CREATE INDEX idx_users_supervisor_id ON users (supervisor_id);
CREATE INDEX idx_users_created_by ON users (created_by);
CREATE INDEX gix_provinces_geom ON provinces USING GIST (geom);
CREATE INDEX idx_divisions_province_id ON divisions (province_id);
CREATE INDEX gix_divisions_geom ON divisions USING GIST (geom);
CREATE INDEX idx_districts_division_id ON districts (division_id);
CREATE INDEX gix_districts_geom ON districts USING GIST (geom);
CREATE INDEX idx_tehsils_district_id ON tehsils (district_id);
CREATE INDEX gix_tehsils_geom ON tehsils USING GIST (geom);
CREATE INDEX idx_psic_groups_division_id ON psic_groups (division_id);
CREATE INDEX idx_psic_classes_group_id ON psic_classes (group_id);
CREATE INDEX idx_lookup_values_type_id ON lookup_values (type_id);
CREATE INDEX idx_lookup_value_links_child_value_id ON lookup_value_links (child_value_id);
CREATE INDEX idx_survey_sections_form_id ON survey_sections (form_id);
CREATE INDEX idx_survey_questions_section_id ON survey_questions (section_id);
CREATE INDEX idx_survey_questions_lookup_type_id ON survey_questions (lookup_type_id);
CREATE INDEX idx_matrix_items_question_id ON matrix_items (question_id);
CREATE INDEX idx_matrix_items_scale_type_id ON matrix_items (scale_type_id);
CREATE INDEX idx_industrial_estates_district_id ON industrial_estates (district_id);
CREATE INDEX gix_industrial_estates_geom ON industrial_estates USING GIST (geom);
CREATE INDEX idx_industrial_clusters_district_id ON industrial_clusters (district_id);
CREATE INDEX gix_industrial_clusters_geom ON industrial_clusters USING GIST (geom);
CREATE INDEX gix_industrial_units_location ON industrial_units USING GIST (location);
CREATE INDEX idx_industrial_units_province_id ON industrial_units (province_id);
CREATE INDEX idx_industrial_units_division_id ON industrial_units (division_id);
CREATE INDEX idx_industrial_units_district_id ON industrial_units (district_id);
CREATE INDEX idx_industrial_units_tehsil_id ON industrial_units (tehsil_id);
CREATE INDEX idx_industrial_units_psic_division_id ON industrial_units (psic_division_id);
CREATE INDEX idx_industrial_units_psic_group_id ON industrial_units (psic_group_id);
CREATE INDEX idx_industrial_units_psic_class_id ON industrial_units (psic_class_id);
CREATE INDEX idx_industrial_units_zone_type_id ON industrial_units (zone_type_id);
CREATE INDEX idx_industrial_units_ownership_type_id ON industrial_units (ownership_type_id);
CREATE INDEX idx_industrial_units_legal_structure_id ON industrial_units (legal_structure_id);
CREATE INDEX idx_industrial_units_total_area_unit_id ON industrial_units (total_area_unit_id);
CREATE INDEX idx_industrial_units_capital_investment_unit_id ON industrial_units (capital_investment_unit_id);
CREATE INDEX idx_industrial_units_industrial_estate_id ON industrial_units (industrial_estate_id);
CREATE INDEX idx_industrial_units_industrial_cluster_id ON industrial_units (industrial_cluster_id);
CREATE INDEX idx_industrial_units_created_by ON industrial_units (created_by);
CREATE INDEX idx_unit_associated_establishments_unit_id ON unit_associated_establishments (unit_id);
CREATE INDEX idx_unit_associated_establishments_major_activity_psic_class_id ON unit_associated_establishments (major_activity_psic_class_id);
CREATE INDEX idx_survey_responses_form_id ON survey_responses (form_id);
CREATE INDEX idx_survey_responses_unit_id ON survey_responses (unit_id);
CREATE INDEX idx_response_interviewees_response_id ON response_interviewees (response_id);
CREATE INDEX idx_survey_responses_surveyor_id ON survey_responses (surveyor_id);
CREATE INDEX idx_survey_responses_confirmed_by ON survey_responses (confirmed_by);
CREATE INDEX idx_survey_attachments_response_id ON survey_attachments (response_id);
CREATE INDEX idx_response_edit_log_response_id ON response_edit_log (response_id);
CREATE INDEX idx_response_edit_log_edited_by ON response_edit_log (edited_by);
CREATE INDEX idx_unit_approval_log_unit_id ON unit_approval_log (unit_id);
CREATE INDEX idx_unit_approval_log_response_id ON unit_approval_log (response_id);
CREATE INDEX idx_unit_approval_log_acted_by ON unit_approval_log (acted_by);
CREATE INDEX idx_sec_b_operations_operation_status_id ON sec_b_operations (operation_status_id);
CREATE INDEX idx_sec_b_operations_daily_shift_id ON sec_b_operations (daily_shift_id);
CREATE INDEX idx_products_response_id ON products (response_id);
CREATE INDEX idx_products_daily_output_unit_id ON products (daily_output_unit_id);
CREATE INDEX idx_products_annual_production_unit_id ON products (annual_production_unit_id);
CREATE INDEX idx_products_unit_of_measurement_id ON products (unit_of_measurement_id);
CREATE INDEX idx_products_hs_code_id ON products (hs_code_id);
CREATE INDEX idx_product_transformation_stages_stage_id ON product_transformation_stages (stage_id);
CREATE INDEX idx_industry_product_options_lookup ON industry_product_options (unit_type_id, product_kind, sort_order);
CREATE INDEX idx_workforce_employment_response_id ON workforce_employment (response_id);
CREATE INDEX idx_workforce_skills_response_id ON workforce_skills (response_id);
CREATE INDEX idx_workforce_skills_skill_level_id ON workforce_skills (skill_level_id);
CREATE INDEX idx_sec_e_supply_chain_active_suppliers_id ON sec_e_supply_chain (active_suppliers_id);
CREATE INDEX idx_sec_e_supply_chain_supplier_dependency_id ON sec_e_supply_chain (supplier_dependency_id);
CREATE INDEX idx_sec_e_supply_chain_procurement_mode_id ON sec_e_supply_chain (procurement_mode_id);
CREATE INDEX idx_sec_e_supply_chain_ontime_delivery_id ON sec_e_supply_chain (ontime_delivery_id);
CREATE INDEX idx_sec_e_supply_chain_product_acceptance_id ON sec_e_supply_chain (product_acceptance_id);
CREATE INDEX idx_major_inputs_response_id ON major_inputs (response_id);
CREATE INDEX idx_major_inputs_unit_id ON major_inputs (unit_id);
CREATE INDEX idx_major_inputs_hs_code_id ON major_inputs (hs_code_id);
CREATE INDEX idx_major_inputs_transformation_stage_id ON major_inputs (transformation_stage_id);
CREATE INDEX idx_sec_f_market_global_supply_chain_id ON sec_f_market (global_supply_chain_id);
CREATE INDEX idx_sec_f_market_active_buyers_id ON sec_f_market (active_buyers_id);
CREATE INDEX idx_sec_f_market_buyer_availability_id ON sec_f_market (buyer_availability_id);
CREATE INDEX idx_sec_f_market_sales_mode_id ON sec_f_market (sales_mode_id);
CREATE INDEX idx_sec_f_market_payment_terms_id ON sec_f_market (payment_terms_id);
CREATE INDEX idx_sec_f_market_subcontract_id ON sec_f_market (subcontract_id);
CREATE INDEX idx_sec_g_technology_utilization_rate_id ON sec_g_technology (utilization_rate_id);
CREATE INDEX idx_sec_g_technology_integration_level_id ON sec_g_technology (integration_level_id);
CREATE INDEX idx_sec_g_technology_machine_source_id ON sec_g_technology (machine_source_id);
CREATE INDEX idx_sec_g_technology_spare_parts_source_id ON sec_g_technology (spare_parts_source_id);
CREATE INDEX idx_sec_g_technology_breakdown_frequency_id ON sec_g_technology (breakdown_frequency_id);
CREATE INDEX idx_sec_g_technology_maintenance_approach_id ON sec_g_technology (maintenance_approach_id);
CREATE INDEX idx_sec_g_technology_production_planning_id ON sec_g_technology (production_planning_id);
CREATE INDEX idx_sec_g_technology_inventory_system_id ON sec_g_technology (inventory_system_id);
CREATE INDEX idx_sec_g_technology_rnd_expenditure_id ON sec_g_technology (rnd_expenditure_id);
CREATE INDEX idx_critical_machines_response_id ON critical_machines (response_id);
CREATE INDEX idx_machinery_age_profile_response_id ON machinery_age_profile (response_id);
CREATE INDEX idx_machinery_age_profile_age_bracket_id ON machinery_age_profile (age_bracket_id);
CREATE INDEX idx_boilers_pressure_vessels_response_id ON boilers_pressure_vessels (response_id);
CREATE INDEX idx_weights_measures_equipment_response_id ON weights_measures_equipment (response_id);
CREATE INDEX idx_energy_consumption_response_id ON energy_consumption (response_id);
CREATE INDEX idx_energy_consumption_energy_source_id ON energy_consumption (energy_source_id);
CREATE INDEX idx_energy_consumption_unit_id ON energy_consumption (unit_id);
CREATE INDEX idx_energy_generation_response_id ON energy_generation (response_id);
CREATE INDEX idx_energy_generation_power_source_id ON energy_generation (power_source_id);
CREATE INDEX idx_solid_waste_streams_response_id ON solid_waste_streams (response_id);
CREATE INDEX idx_solid_waste_streams_waste_type_id ON solid_waste_streams (waste_type_id);
CREATE INDEX idx_solid_waste_disposals_disposal_method_id ON solid_waste_disposals (disposal_method_id);
CREATE INDEX idx_sec_j_strategy_reinvestment_level_id ON sec_j_strategy (reinvestment_level_id);
CREATE INDEX idx_sec_j_strategy_reinvestment_area_id ON sec_j_strategy (reinvestment_area_id);
CREATE INDEX idx_sec_j_strategy_upscaling_time_id ON sec_j_strategy (upscaling_time_id);
CREATE INDEX idx_collaborations_response_id ON collaborations (response_id);
CREATE INDEX idx_collaborations_collaborator_type_id ON collaborations (collaborator_type_id);
CREATE INDEX idx_collaboration_purposes_purpose_id ON collaboration_purposes (purpose_id);
CREATE INDEX idx_response_choices_response_id ON response_choices (response_id);
CREATE INDEX idx_response_choices_question_id ON response_choices (question_id);
CREATE INDEX idx_response_choices_option_id ON response_choices (option_id);
CREATE INDEX idx_response_shares_response_id ON response_shares (response_id);
CREATE INDEX idx_response_shares_question_id ON response_shares (question_id);
CREATE INDEX idx_response_shares_option_id ON response_shares (option_id);
CREATE INDEX idx_response_matrix_answers_response_id ON response_matrix_answers (response_id);
CREATE INDEX idx_response_matrix_answers_item_id ON response_matrix_answers (item_id);
CREATE INDEX idx_response_matrix_answers_choice_value_id ON response_matrix_answers (choice_value_id);
CREATE INDEX idx_sync_log_surveyor_id ON sync_log (surveyor_id);
CREATE INDEX idx_duplicate_flags_unit_id ON duplicate_flags (unit_id);
CREATE INDEX idx_duplicate_flags_matched_unit_id ON duplicate_flags (matched_unit_id);
CREATE INDEX idx_duplicate_flags_resolved_by ON duplicate_flags (resolved_by);
CREATE INDEX idx_gis_quality_log_unit_id ON gis_quality_log (unit_id);
CREATE INDEX idx_audit_log_changed_by ON audit_log (changed_by);
CREATE INDEX idx_system_settings_updated_by ON system_settings (updated_by);
CREATE INDEX idx_dashboard_saved_filters_user_id ON dashboard_saved_filters (user_id);
CREATE INDEX idx_psic_classes_search ON psic_classes USING GIN (to_tsvector('simple', name));
CREATE INDEX idx_hs_codes_search ON hs_codes USING GIN (to_tsvector('simple', description));
CREATE INDEX idx_units_name_trgm ON industrial_units USING GIN (name gin_trgm_ops);
CREATE INDEX idx_responses_status ON survey_responses (status);
CREATE INDEX idx_responses_sync_status ON survey_responses (sync_status);

-- ===== Data-quality triggers =====

-- Keep updated_at fresh on establishments
CREATE FUNCTION fn_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_units_touch BEFORE UPDATE ON industrial_units
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- A chosen option must belong to the drop-down list of its question
CREATE FUNCTION fn_check_option_list() RETURNS trigger AS $$
DECLARE expected int; actual int;
BEGIN
  SELECT lookup_type_id INTO expected FROM survey_questions WHERE id = NEW.question_id;
  SELECT type_id INTO actual FROM lookup_values WHERE id = NEW.option_id;
  IF expected IS NULL OR actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'Option % does not belong to the drop-down list of question %', NEW.option_id, NEW.question_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_choices_list BEFORE INSERT OR UPDATE ON response_choices
  FOR EACH ROW EXECUTE FUNCTION fn_check_option_list();
CREATE TRIGGER trg_shares_list BEFORE INSERT OR UPDATE ON response_shares
  FOR EACH ROW EXECUTE FUNCTION fn_check_option_list();

-- Confirmation rule: a surveyor's form is CONFIRMED only by the assigned supervisor (or an Admin).
CREATE FUNCTION fn_check_confirmation() RETURNS trigger AS $$
DECLARE filler_role text; filler_sup uuid; conf_role text;
BEGIN
  IF NEW.status = 'CONFIRMED' THEN
    IF NEW.confirmed_by IS NULL THEN
      RAISE EXCEPTION 'A confirmed survey needs confirmed_by';
    END IF;
    SELECT r.code, u.supervisor_id INTO filler_role, filler_sup
      FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = NEW.surveyor_id;
    SELECT r.code INTO conf_role
      FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = NEW.confirmed_by;
    IF conf_role IS NULL OR conf_role NOT IN ('SUPERVISOR','ADMIN') THEN
      RAISE EXCEPTION 'Only a Supervisor or Admin can confirm a survey';
    END IF;
    IF filler_role = 'SURVEYOR' AND conf_role = 'SUPERVISOR' AND filler_sup IS DISTINCT FROM NEW.confirmed_by THEN
      RAISE EXCEPTION 'Only the surveyor''s assigned supervisor or an Admin can confirm this survey';
    END IF;
    IF NEW.confirmed_at IS NULL THEN NEW.confirmed_at := now(); END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_confirm_check BEFORE INSERT OR UPDATE OF status, confirmed_by ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION fn_check_confirmation();

-- A tick-box answer must match the kind of row it answers (choice list or 1-5 rating)
CREATE FUNCTION fn_check_matrix_answer() RETURNS trigger AS $$
DECLARE m matrix_items%ROWTYPE; actual int;
BEGIN
  SELECT * INTO m FROM matrix_items WHERE id = NEW.item_id;
  IF NEW.choice_value_id IS NOT NULL THEN
    SELECT type_id INTO actual FROM lookup_values WHERE id = NEW.choice_value_id;
    IF m.answer_type <> 'CHOICE' OR actual IS DISTINCT FROM m.scale_type_id THEN
      RAISE EXCEPTION 'Choice % is not valid for matrix row %', NEW.choice_value_id, NEW.item_id;
    END IF;
  END IF;
  IF NEW.rating IS NOT NULL AND m.answer_type <> 'RATING_1_5' THEN
    RAISE EXCEPTION 'Matrix row % does not take a 1-5 rating', NEW.item_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_matrix_check BEFORE INSERT OR UPDATE ON response_matrix_answers
  FOR EACH ROW EXECUTE FUNCTION fn_check_matrix_answer();


-- ===== Views for the dashboard and data checks =====
-- Confirmed establishments per district, plus pending count (dashboard).
CREATE MATERIALIZED VIEW mv_units_by_district AS
SELECT d.id AS district_id, d.name AS district, COUNT(u.id) FILTER (WHERE u.approval_status='CONFIRMED') AS unit_count, COUNT(u.id) FILTER (WHERE u.approval_status='PENDING') AS pending_count FROM districts d LEFT JOIN industrial_units u ON u.district_id = d.id GROUP BY d.id, d.name;
-- Confirmed establishments per PSIC division / sector (dashboard).
CREATE MATERIALIZED VIEW mv_units_by_psic_division AS
SELECT p.id AS psic_division_id, p.code, p.name AS psic_division, COUNT(u.id) FILTER (WHERE u.approval_status='CONFIRMED') AS unit_count FROM psic_divisions p LEFT JOIN industrial_units u ON u.psic_division_id = p.id AND u.approval_status='CONFIRMED' GROUP BY p.id, p.code, p.name;
-- Confirmed establishments per cluster (dashboard).
CREATE MATERIALIZED VIEW mv_units_by_cluster AS
SELECT c.id AS cluster_id, c.name AS cluster, COUNT(u.id) FILTER (WHERE u.approval_status='CONFIRMED') AS unit_count FROM industrial_clusters c LEFT JOIN industrial_units u ON u.industrial_cluster_id = c.id GROUP BY c.id, c.name;
-- Refresh on a schedule, e.g. every 15 minutes:  REFRESH MATERIALIZED VIEW mv_units_by_district;

-- Flags answers whose percentages do not add up as expected.
CREATE VIEW v_percentage_checks AS
SELECT s.response_id, q.question_code AS check_name, SUM(s.percent_value) AS total_pct, '=100'::text AS rule, (SUM(s.percent_value) = 100) AS is_ok
FROM response_shares s JOIN survey_questions q ON q.id = s.question_id GROUP BY s.response_id, q.question_code
UNION ALL
SELECT response_id, 'H_ENERGY_CONSUMPTION', SUM(share_pct), '=100', (SUM(share_pct) = 100) FROM energy_consumption GROUP BY response_id
UNION ALL
SELECT response_id, 'C_MAIN_PRODUCT_REVENUE', SUM(revenue_share_pct), '<=100', (SUM(revenue_share_pct) <= 100) FROM products WHERE product_kind='MAIN' GROUP BY response_id;
