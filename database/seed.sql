-- ============================================================================
-- SEED DATA FOR INDUSTRIAL SURVEY & CENTRAL DATABASE
-- ============================================================================

-- 1. SEED ROLES & PERMISSIONS
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'Surveyor', 'Field data collection surveyor'),
(2, 'Supervisor', 'Field supervisor with approval rights'),
(3, 'DB Admin', 'System and database administrator')
ON CONFLICT (role_id) DO NOTHING;

INSERT INTO permissions (permission_id, permission_code, description) VALUES
(1, 'UNIT_CREATE', 'Can create and submit new industrial unit records'),
(2, 'UNIT_APPROVE', 'Can approve, reject, or request revisions on unit records'),
(3, 'SURVEY_SUBMIT', 'Can fill and submit survey questionnaires'),
(4, 'USER_MANAGE', 'Can manage users and system access control')
ON CONFLICT (permission_id) DO NOTHING;

-- Map permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 1), -- Surveyor can create units
(1, 3), -- Surveyor can submit surveys
(2, 1), -- Supervisor can create units
(2, 2), -- Supervisor can approve/verify units
(2, 3), -- Supervisor can submit surveys
(3, 1), (3, 2), (3, 3), (3, 4) -- DB Admin has all permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. SEED USERS — updated credentials
-- admin       → admin123
-- surveyor    → surveyor123
-- supervisor  → supervisor123
INSERT INTO users (user_id, username, full_name, email, phone, password_hash, role_id, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'surveyor',   'Surveyor',             'surveyor@industries.punjab.gov.pk',   '03001234567', '$2b$10$cFxt257Td1g3EemBp4/nCO3K60Fw0BdPZjc0637w9fiJ2gENKtG72', 1, TRUE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'supervisor', 'Supervisor',           'supervisor@industries.punjab.gov.pk', '03007654321', '$2b$10$BU1Kiwk.veJNHr0x7ZqOMuSG77fUTA2akkrJWya0LhhvosgU/5sTW', 2, TRUE),

ON CONFLICT (user_id) DO UPDATE
  SET username      = EXCLUDED.username,
      full_name     = EXCLUDED.full_name,
      password_hash = EXCLUDED.password_hash,
      is_active     = EXCLUDED.is_active;

-- 3. ADMINISTRATIVE BOUNDARIES (Punjab, Lahore Division, Lahore District, Lahore City & Shalimar Tehsils)
INSERT INTO provinces (province_id, name, code, geom) VALUES
(1, 'Punjab', 'PB', ST_Multi(ST_GeomFromText('POLYGON((70 28, 75 28, 75 34, 70 34, 70 28))', 4326)))
ON CONFLICT (province_id) DO NOTHING;

INSERT INTO divisions (division_id, province_id, name, code, geom) VALUES
(1, 1, 'Lahore Division', 'LHR-DIV', ST_Multi(ST_GeomFromText('POLYGON((73.8 31.0, 74.8 31.0, 74.8 32.0, 73.8 32.0, 73.8 31.0))', 4326)))
ON CONFLICT (division_id) DO NOTHING;

INSERT INTO districts (district_id, division_id, name, code, geom) VALUES
(1, 1, 'Lahore District', 'LHR-DST', ST_Multi(ST_GeomFromText('POLYGON((74.1 31.2, 74.6 31.2, 74.6 31.7, 74.1 31.7, 74.1 31.2))', 4326)))
ON CONFLICT (district_id) DO NOTHING;

INSERT INTO tehsils (tehsil_id, district_id, name, code, urban_rural, geom) VALUES
(1, 1, 'Lahore City Tehsil', 'LHR-CTY', 'Urban', ST_Multi(ST_GeomFromText('POLYGON((74.1 31.2, 74.4 31.2, 74.4 31.5, 74.1 31.5, 74.1 31.2))', 4326))),
(2, 1, 'Shalimar Tehsil', 'LHR-SHL', 'Urban', ST_Multi(ST_GeomFromText('POLYGON((74.4 31.2, 74.6 31.2, 74.6 31.5, 74.4 31.5, 74.4 31.2))', 4326)))
ON CONFLICT (tehsil_id) DO NOTHING;

-- 4. INDUSTRIAL SECTORS
INSERT INTO sectors (sector_id, parent_sector_id, name, code) VALUES
(1, NULL, 'Textile and Apparel', 'TEX-00'),
(2, 1, 'Spinning and Weaving', 'TEX-01'),
(3, 1, 'Garments and Ready-made', 'TEX-02'),
(4, NULL, 'Leather and Footwear', 'LEA-00'),
(5, 4, 'Tanning and Processing', 'LEA-01'),
(6, NULL, 'Chemical and Allied', 'CHM-00'),
(7, 6, 'Pharmaceuticals', 'CHM-01')
ON CONFLICT (sector_id) DO NOTHING;

-- 5. INDUSTRIAL ESTATES
INSERT INTO industrial_estates (estate_id, name, estate_type, district_id, geom) VALUES
(1, 'Sundar Industrial Estate', 'Estate', 1, ST_Multi(ST_GeomFromText('POLYGON((74.15 31.25, 74.20 31.25, 74.20 31.30, 74.15 31.30, 74.15 31.25))', 4326)))
ON CONFLICT (estate_id) DO NOTHING;

-- 6. QUESTIONNAIRE DEFINITION
INSERT INTO survey_forms (form_id, title, version, description, is_active) VALUES
(1, 'Punjab Industrial Unit Survey 2026', '1.0', 'Comprehensive Census Questionnaire for Industrial Units in Punjab.', TRUE)
ON CONFLICT (form_id) DO NOTHING;

-- 7. SURVEY SECTIONS
INSERT INTO survey_sections (section_id, form_id, title, sort_order) VALUES
(1, 1, 'Basic Unit Information', 1),
(2, 1, 'Operational and Employment Details', 2)
ON CONFLICT (section_id) DO NOTHING;

-- 8. SURVEY QUESTIONS
INSERT INTO survey_questions (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order) VALUES
(1, 1, 'Q1.1', 'Industrial Unit Name', 'text', TRUE, NULL, NULL, 1),
(2, 1, 'Q1.2', 'Contact Person Name', 'text', FALSE, NULL, NULL, 2),
(3, 1, 'Q1.3', 'Ownership Type', 'select', TRUE, NULL, '["Private Limited", "Public Limited", "Sole Proprietorship", "Joint Venture"]'::jsonb, 3),
(4, 1, 'Q1.4', 'Industrial Sector', 'select', TRUE, NULL, '["Spinning and Weaving", "Garments and Ready-made", "Tanning and Processing", "Pharmaceuticals"]'::jsonb, 4),
(5, 2, 'Q2.1', 'Operational Status', 'select', TRUE, NULL, '["Active", "Closed", "Under Construction", "Unverified"]'::jsonb, 1),
(6, 2, 'Q2.2', 'Employment Size (Total Employees)', 'number', TRUE, '{"min": 1, "max": 50000}'::jsonb, NULL, 2),
(7, 2, 'Q2.3', 'Is this unit registered under the Factories Act 1934?', 'boolean', TRUE, NULL, NULL, 3),
(8, 2, 'Q2.4', 'Factories Act Registration Number', 'text', FALSE, '{"regex": "^[A-Z]{2}-\\d{5}$"}'::jsonb, NULL, 4), -- e.g. PK-12345
(9, 2, 'Q2.5', 'Upload Photo of the Unit Frontage', 'photo', FALSE, NULL, NULL, 5),
(10, 2, 'Q2.6', 'Geotag Point Location', 'gps', TRUE, NULL, NULL, 6)
ON CONFLICT (question_id) DO NOTHING;

-- 9. DYNAMIC / SKIP LOGIC
-- Question Q2.4 (Registration Number) is shown ONLY IF Q2.3 (Registered under Factories Act) is answered TRUE
INSERT INTO survey_question_logic (logic_id, question_id, condition_question_id, condition_operator, condition_value, action) VALUES
(1, 8, 7, '=', 'true', 'show')
ON CONFLICT (logic_id) DO NOTHING;

-- 10. SYSTEM SETTINGS
INSERT INTO system_settings (setting_key, setting_value) VALUES
('MIN_GPS_ACCURACY_M', '15.0'),
('DUPLICATE_CHECK_RADIUS_M', '50.0')
ON CONFLICT (setting_key) DO NOTHING;
