-- ============================================================================
--  MOBILE SURVEY APPLICATION & CENTRALIZED INDUSTRIAL DATABASE
--  PostgreSQL 14+ / PostGIS 3+ Schema
--  Modules map directly to the project WBS (E: Survey App, F: Central DB,
--  G: GIS Framework, H: IT Architecture/Security, I: Dashboard)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- MODULE 1 — IDENTITY, ROLES & ACCESS CONTROL   (covers E4, E5, F19, H6, H7)
-- ============================================================================

CREATE TABLE roles (
    role_id         SERIAL PRIMARY KEY,
    role_name       VARCHAR(50) UNIQUE NOT NULL,       -- e.g. Surveyor, Supervisor, DB Admin, GIS Analyst, DGI/IPAC Viewer
    description     TEXT
);

CREATE TABLE permissions (
    permission_id   SERIAL PRIMARY KEY,
    permission_code VARCHAR(60) UNIQUE NOT NULL,        -- e.g. UNIT_CREATE, UNIT_APPROVE, SURVEY_SUBMIT
    description     TEXT
);

CREATE TABLE role_permissions (
    role_id         INT REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id   INT REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(60) UNIQUE NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE,
    phone           VARCHAR(20),
    password_hash   TEXT NOT NULL,
    role_id         INT NOT NULL REFERENCES roles(role_id),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MODULE 2 — ADMINISTRATIVE / GEOGRAPHICAL REFERENCE   (covers F6, G4, G5)
-- ============================================================================

CREATE TABLE provinces (
    province_id     SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(10) UNIQUE NOT NULL,
    geom            geometry(MultiPolygon, 4326)         -- boundary layer (G4)
);

CREATE TABLE divisions (
    division_id     SERIAL PRIMARY KEY,
    province_id     INT NOT NULL REFERENCES provinces(province_id),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(10) UNIQUE NOT NULL,
    geom            geometry(MultiPolygon, 4326)
);

CREATE TABLE districts (
    district_id     SERIAL PRIMARY KEY,
    division_id     INT NOT NULL REFERENCES divisions(division_id),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(10) UNIQUE NOT NULL,
    geom            geometry(MultiPolygon, 4326)
);

CREATE TABLE tehsils (
    tehsil_id       SERIAL PRIMARY KEY,
    district_id     INT NOT NULL REFERENCES districts(district_id),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(10) UNIQUE NOT NULL,
    urban_rural     VARCHAR(10) CHECK (urban_rural IN ('Urban','Rural')),
    geom            geometry(MultiPolygon, 4326)
);

-- ============================================================================
-- MODULE 3 — SECTOR / ESTATE / CLUSTER REFERENCE   (covers F5, F7, G6, G7)
-- ============================================================================

CREATE TABLE sectors (
    sector_id        SERIAL PRIMARY KEY,
    parent_sector_id INT REFERENCES sectors(sector_id),  -- self-join for sub-sector hierarchy
    name             VARCHAR(150) NOT NULL,
    code             VARCHAR(20) UNIQUE NOT NULL          -- e.g. NIC/ISIC-style code
);

CREATE TABLE industrial_estates (
    estate_id        SERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    estate_type      VARCHAR(20) CHECK (estate_type IN ('Estate','SEZ','Zone')),
    district_id      INT REFERENCES districts(district_id),
    geom             geometry(MultiPolygon, 4326)         -- estate/SEZ boundary layer (G6)
);

CREATE TABLE industrial_clusters (
    cluster_id       SERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    sector_id        INT REFERENCES sectors(sector_id),
    district_id      INT REFERENCES districts(district_id),
    description      TEXT,
    geom             geometry(MultiPolygon, 4326)         -- optional cluster boundary (G7)
);

-- ============================================================================
-- MODULE 4 — INDUSTRIAL UNIT MASTER TABLE   (covers F3, F4, F9, F10, G9, G10)
-- ============================================================================

CREATE TABLE industrial_units (
    unit_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_code        VARCHAR(30) UNIQUE NOT NULL,         -- F9: unique ID, e.g. PK-PB-LHR-00001
    unit_name        VARCHAR(200) NOT NULL,
    sector_id        INT REFERENCES sectors(sector_id),
    estate_id        INT REFERENCES industrial_estates(estate_id),
    cluster_id       INT REFERENCES industrial_clusters(cluster_id),
    province_id      INT REFERENCES provinces(province_id),
    division_id      INT REFERENCES divisions(division_id),
    district_id      INT REFERENCES districts(district_id),
    tehsil_id        INT REFERENCES tehsils(tehsil_id),
    address           TEXT,
    contact_person    VARCHAR(150),
    contact_phone     VARCHAR(20),
    contact_email     VARCHAR(150),
    ownership_type    VARCHAR(30),                        -- Private/Public/JV
    employment_size   INT,
    operational_status VARCHAR(20) DEFAULT 'Unverified'
                        CHECK (operational_status IN ('Active','Closed','Under Construction','Unverified')),
    geom              geometry(Point, 4326),               -- G9/G11: point feature + geotag
    gps_accuracy_m    NUMERIC(6,2),
    is_verified       BOOLEAN DEFAULT FALSE,
    verified_by       UUID REFERENCES users(user_id),
    verified_at       TIMESTAMPTZ,
    created_by        UUID REFERENCES users(user_id),
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_units_geom ON industrial_units USING GIST (geom);
CREATE INDEX idx_units_district ON industrial_units (district_id);
CREATE INDEX idx_units_sector ON industrial_units (sector_id);

-- ============================================================================
-- MODULE 5 — QUESTIONNAIRE / SURVEY FORM DEFINITION   (covers E6, E7, E8)
-- ============================================================================

CREATE TABLE survey_forms (
    form_id           SERIAL PRIMARY KEY,
    title             VARCHAR(150) NOT NULL,
    version           VARCHAR(20) NOT NULL,
    description       TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE survey_sections (
    section_id        SERIAL PRIMARY KEY,
    form_id           INT NOT NULL REFERENCES survey_forms(form_id) ON DELETE CASCADE,
    title             VARCHAR(150) NOT NULL,
    sort_order        INT DEFAULT 0
);

CREATE TABLE survey_questions (
    question_id       SERIAL PRIMARY KEY,
    section_id        INT NOT NULL REFERENCES survey_sections(section_id) ON DELETE CASCADE,
    question_code     VARCHAR(30) NOT NULL,               -- e.g. Q1.1
    question_text     TEXT NOT NULL,
    question_type     VARCHAR(20) NOT NULL
                        CHECK (question_type IN ('text','number','date','select','multiselect','boolean','gps','photo')),
    is_mandatory      BOOLEAN DEFAULT FALSE,               -- E7: mandatory fields
    validation_rule   JSONB,                               -- E7: e.g. {"min":0,"max":9999,"regex":"..."}
    options           JSONB,                               -- for select/multiselect
    sort_order        INT DEFAULT 0
);

CREATE TABLE survey_question_logic (
    logic_id            SERIAL PRIMARY KEY,
    question_id         INT NOT NULL REFERENCES survey_questions(question_id) ON DELETE CASCADE,
    condition_question_id INT NOT NULL REFERENCES survey_questions(question_id),
    condition_operator  VARCHAR(10) CHECK (condition_operator IN ('=','!=','>','<','>=','<=','in')),
    condition_value     TEXT NOT NULL,
    action              VARCHAR(15) CHECK (action IN ('show','hide','skip_to')) -- E8: conditional/skip logic
);

-- ============================================================================
-- MODULE 6 — SURVEY RESPONSES / DATA CAPTURE   (covers E9-E19, F11)
-- ============================================================================

CREATE TABLE survey_responses (
    response_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- client-generated UUID enables offline dedupe
    form_id            INT NOT NULL REFERENCES survey_forms(form_id),
    unit_id            UUID REFERENCES industrial_units(unit_id),    -- linked once matched/created
    surveyor_id        UUID NOT NULL REFERENCES users(user_id),
    device_id          VARCHAR(100),                                  -- E17: surveyor/device info
    gps_lat            NUMERIC(9,6),                                  -- E9: GPS capture
    gps_lng            NUMERIC(9,6),
    gps_accuracy_m     NUMERIC(6,2),
    started_at         TIMESTAMPTZ,
    submitted_at       TIMESTAMPTZ,                                   -- E17: timestamp
    sync_status        VARCHAR(15) DEFAULT 'draft'
                         CHECK (sync_status IN ('draft','pending_sync','synced','rejected')), -- E19
    is_offline_capture BOOLEAN DEFAULT TRUE,                          -- E11
    completeness_score NUMERIC(5,2),                                  -- F15/E15: completeness check
    is_duplicate       BOOLEAN DEFAULT FALSE,                         -- E14: duplicate-record check
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_responses_unit ON survey_responses (unit_id);
CREATE INDEX idx_responses_sync ON survey_responses (sync_status);

CREATE TABLE survey_answers (
    answer_id          BIGSERIAL PRIMARY KEY,
    response_id        UUID NOT NULL REFERENCES survey_responses(response_id) ON DELETE CASCADE,
    question_id        INT NOT NULL REFERENCES survey_questions(question_id),
    answer_value        JSONB,                                        -- flexible: text/number/array/bool
    answered_at         TIMESTAMPTZ DEFAULT now(),
    UNIQUE (response_id, question_id)
);

CREATE TABLE survey_attachments (
    attachment_id       BIGSERIAL PRIMARY KEY,
    response_id         UUID NOT NULL REFERENCES survey_responses(response_id) ON DELETE CASCADE,
    question_id         INT REFERENCES survey_questions(question_id),
    file_path           TEXT NOT NULL,
    file_type           VARCHAR(20),
    uploaded_at          TIMESTAMPTZ DEFAULT now()
);

-- E18: editing/correction mechanism with full history
CREATE TABLE response_edit_log (
    edit_id             BIGSERIAL PRIMARY KEY,
    response_id         UUID NOT NULL REFERENCES survey_responses(response_id) ON DELETE CASCADE,
    question_id         INT REFERENCES survey_questions(question_id),
    edited_by           UUID REFERENCES users(user_id),
    old_value            JSONB,
    new_value            JSONB,
    edited_at            TIMESTAMPTZ DEFAULT now()
);

-- F16: data editing/approval workflow at the unit level
CREATE TABLE unit_approval_log (
    approval_id          BIGSERIAL PRIMARY KEY,
    unit_id              UUID NOT NULL REFERENCES industrial_units(unit_id),
    response_id          UUID REFERENCES survey_responses(response_id),
    action                VARCHAR(15) CHECK (action IN ('submitted','approved','rejected','revised')),
    actioned_by           UUID REFERENCES users(user_id),
    remarks               TEXT,
    actioned_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MODULE 7 — OFFLINE SYNC & DATA QUALITY   (covers E11-E14, F14, F15, G12)
-- ============================================================================

CREATE TABLE sync_log (
    sync_id              BIGSERIAL PRIMARY KEY,
    device_id             VARCHAR(100) NOT NULL,
    user_id                UUID REFERENCES users(user_id),
    sync_started_at        TIMESTAMPTZ DEFAULT now(),
    sync_completed_at      TIMESTAMPTZ,
    records_pushed          INT DEFAULT 0,
    records_pulled          INT DEFAULT 0,
    status                  VARCHAR(15) CHECK (status IN ('success','partial','failed')),
    error_message            TEXT
);

CREATE TABLE duplicate_flags (
    flag_id                  BIGSERIAL PRIMARY KEY,
    response_id               UUID NOT NULL REFERENCES survey_responses(response_id),
    matched_unit_id            UUID REFERENCES industrial_units(unit_id),
    match_reason                TEXT,                      -- e.g. "name+geo proximity < 50m"
    is_resolved                  BOOLEAN DEFAULT FALSE,
    resolved_by                   UUID REFERENCES users(user_id),
    resolved_at                    TIMESTAMPTZ
);

CREATE TABLE gis_quality_log (
    check_id                       BIGSERIAL PRIMARY KEY,
    unit_id                          UUID REFERENCES industrial_units(unit_id),
    check_type                       VARCHAR(50),           -- e.g. "outside_admin_boundary","low_accuracy"
    result                             VARCHAR(15) CHECK (result IN ('pass','fail','warning')),
    checked_by                          UUID REFERENCES users(user_id),
    checked_at                            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MODULE 8 — GIS BASE LAYERS   (covers G8, G16)
-- ============================================================================

CREATE TABLE base_map_layers (
    layer_id      SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    source_type   VARCHAR(20) CHECK (source_type IN ('WMS','WMTS','Raster','VectorTile')),
    url           TEXT NOT NULL,
    attribution   VARCHAR(200),
    is_default    BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- MODULE 9 — SECURITY, AUDIT & BACKUP   (covers H8-H12, F17-F19)
-- ============================================================================

CREATE TABLE audit_log (
    audit_id        BIGSERIAL PRIMARY KEY,
    table_name       VARCHAR(60) NOT NULL,
    record_id         TEXT NOT NULL,
    action              VARCHAR(10) CHECK (action IN ('INSERT','UPDATE','DELETE')),
    changed_by           UUID REFERENCES users(user_id),
    changed_at             TIMESTAMPTZ DEFAULT now(),
    old_data                 JSONB,
    new_data                 JSONB
);

CREATE TABLE backup_log (
    backup_id         BIGSERIAL PRIMARY KEY,
    backup_type        VARCHAR(15) CHECK (backup_type IN ('full','incremental')),
    file_path            TEXT,
    started_at             TIMESTAMPTZ,
    completed_at             TIMESTAMPTZ,
    status                     VARCHAR(15) CHECK (status IN ('success','failed'))
);

CREATE TABLE system_settings (
    setting_key    VARCHAR(80) PRIMARY KEY,
    setting_value  TEXT,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MODULE 10 — DASHBOARD & VISUALIZATION   (covers I2, I3, I9, I10)
-- ============================================================================

CREATE TABLE dashboard_kpi_definitions (
    kpi_id             SERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    description           TEXT,
    category               VARCHAR(50),                    -- e.g. "Sector","Geographic","Cluster"
    calculation_sql          TEXT NOT NULL                  -- SQL fragment or view name backing the KPI
);

CREATE TABLE dashboard_saved_filters (
    filter_id         BIGSERIAL PRIMARY KEY,
    user_id             UUID REFERENCES users(user_id),
    name                  VARCHAR(100),
    filter_json             JSONB,
    created_at                TIMESTAMPTZ DEFAULT now()
);

-- Example materialized views feeding the dashboard (I4-I8) — refresh on a schedule
CREATE MATERIALIZED VIEW mv_units_by_sector AS
SELECT s.sector_id, s.name AS sector_name, COUNT(u.unit_id) AS unit_count
FROM sectors s
LEFT JOIN industrial_units u ON u.sector_id = s.sector_id AND u.operational_status = 'Active'
GROUP BY s.sector_id, s.name;

CREATE MATERIALIZED VIEW mv_units_by_district AS
SELECT d.district_id, d.name AS district_name, COUNT(u.unit_id) AS unit_count
FROM districts d
LEFT JOIN industrial_units u ON u.district_id = d.district_id AND u.operational_status = 'Active'
GROUP BY d.district_id, d.name;

CREATE MATERIALIZED VIEW mv_units_by_cluster AS
SELECT c.cluster_id, c.name AS cluster_name, COUNT(u.unit_id) AS unit_count
FROM industrial_clusters c
LEFT JOIN industrial_units u ON u.cluster_id = c.cluster_id AND u.operational_status = 'Active'
GROUP BY c.cluster_id, c.name;

-- ============================================================================
-- TRIGGERS — updated_at maintenance (applies to core mutable tables)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_units_updated_at BEFORE UPDATE ON industrial_units
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_responses_updated_at BEFORE UPDATE ON survey_responses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
