-- ============================================================================
-- CLEANUP SCRIPT: REMOVE REDUNDANT / OBSOLETE TABLES
-- Database: punjab_industrial_survey
-- Purpose: Prunes the database from 50 bloated tables down to the clean,
--          lean 9-section questionnaire schema + auth + geo references.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP OBSOLETE WBS LOGS, DASHBOARD & REPORTING TABLES
-- (These were premature WBS scaffolding tables not used by the surveyor app)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS backup_log CASCADE;
DROP TABLE IF EXISTS base_map_layers CASCADE;
DROP TABLE IF EXISTS dashboard_saved_filters CASCADE;
DROP TABLE IF EXISTS dashboard_kpi_definitions CASCADE;
DROP TABLE IF EXISTS gis_quality_log CASCADE;
DROP TABLE IF EXISTS unit_approval_log CASCADE;
DROP TABLE IF EXISTS response_edit_log CASCADE;
DROP TABLE IF EXISTS survey_attachments CASCADE;
DROP TABLE IF EXISTS industrial_clusters CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Drop obsolete materialized views if they exist
DROP MATERIALIZED VIEW IF EXISTS mv_units_by_sector CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_units_by_district CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_units_by_cluster CASCADE;

-- ----------------------------------------------------------------------------
-- 2. DROP OBSOLETE GENERIC EAV QUESTIONNAIRE ENGINE TABLES
-- (Superseded by dedicated typed tables: section_a_* through section_k_*)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS survey_answers CASCADE;
DROP TABLE IF EXISTS survey_question_logic CASCADE;
DROP TABLE IF EXISTS survey_questions CASCADE;
DROP TABLE IF EXISTS survey_sections CASCADE;
DROP TABLE IF EXISTS survey_forms CASCADE;
DROP TABLE IF EXISTS survey_responses CASCADE;

-- ----------------------------------------------------------------------------
-- 3. DROP DUPLICATE MASTER ENTITY
-- (industrial_units is a duplicate of survey_submissions)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS industrial_units CASCADE;

-- ----------------------------------------------------------------------------
-- 4. RECREATE duplicate_flags REFERENCING survey_submissions
-- (The old duplicate_flags referenced survey_responses and industrial_units)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS duplicate_flags CASCADE;

CREATE TABLE IF NOT EXISTS duplicate_flags (
    flag_id             BIGSERIAL PRIMARY KEY,
    survey_id           UUID NOT NULL REFERENCES survey_submissions(survey_id) ON DELETE CASCADE,
    matched_survey_id   UUID REFERENCES survey_submissions(survey_id) ON DELETE SET NULL,
    match_reason        TEXT,
    is_resolved         BOOLEAN DEFAULT FALSE,
    resolved_by         UUID REFERENCES users(user_id),
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
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

CREATE INDEX IF NOT EXISTS idx_duplicate_flags_survey ON duplicate_flags (survey_id);

COMMIT;

-- Verification: List remaining user tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
