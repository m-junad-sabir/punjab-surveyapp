-- ============================================================================
-- SEED DATA -- PUNJAB INDUSTRIAL SURVEY
-- Full Questionnaire: Sections A through K (Questionnaire 1.docx)
-- ============================================================================

-- -------------------------------------------------------------------------
-- STEP 0: Clear dependent data so DELETEs below do not hit FK violations
-- -------------------------------------------------------------------------
TRUNCATE survey_answers,
         survey_responses,
         duplicate_flags,
         industrial_units
RESTART IDENTITY CASCADE;

-- -------------------------------------------------------------------------
-- 1. ROLES & PERMISSIONS
-- -------------------------------------------------------------------------
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'Surveyor',  'Field data collection surveyor'),
(2, 'Supervisor','Field supervisor with approval rights'),
(3, 'DB Admin',  'System and database administrator')
ON CONFLICT (role_id) DO NOTHING;

INSERT INTO permissions (permission_id, permission_code, description) VALUES
(1, 'UNIT_CREATE',   'Can create and submit new industrial unit records'),
(2, 'UNIT_APPROVE',  'Can approve, reject, or request revisions on unit records'),
(3, 'SURVEY_SUBMIT', 'Can fill and submit survey questionnaires'),
(4, 'USER_MANAGE',   'Can manage users and system access control')
ON CONFLICT (permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
(1, 1),(1, 3),
(2, 1),(2, 2),(2, 3),
(3, 1),(3, 2),(3, 3),(3, 4)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 2. USERS  (passwords: surveyor123 / supervisor123 / admin123)
-- -------------------------------------------------------------------------
INSERT INTO users (user_id, username, full_name, email, phone, password_hash, role_id, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','surveyor1',  'Surveyor One',        'surveyor1@industries.punjab.gov.pk',  '03001234567','$2b$10$wO082n04KjGv3oZ5QyM2gO9E11tqLSwf0qFqHhQ7K.Z8wEa94gS1e',1,TRUE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22','supervisor1','Supervisor One',       'supervisor1@industries.punjab.gov.pk','03007654321','$2b$10$wO082n04KjGv3oZ5QyM2gO9E11tqLSwf0qFqHhQ7K.Z8wEa94gS1e',2,TRUE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33','admin',      'System Administrator','admin@industries.punjab.gov.pk',      '03009999999','$2b$10$wO082n04KjGv3oZ5QyM2gO9E11tqLSwf0qFqHhQ7K.Z8wEa94gS1e',3,TRUE)
ON CONFLICT (user_id) DO UPDATE
  SET username=EXCLUDED.username, full_name=EXCLUDED.full_name,
      password_hash=EXCLUDED.password_hash, is_active=EXCLUDED.is_active;

-- -------------------------------------------------------------------------
-- 3. ADMINISTRATIVE BOUNDARIES
-- -------------------------------------------------------------------------
INSERT INTO provinces (province_id, name, code, geom) VALUES
(1,'Punjab','PB',ST_Multi(ST_GeomFromText('POLYGON((70 28,75 28,75 34,70 34,70 28))',4326)))
ON CONFLICT (province_id) DO NOTHING;

INSERT INTO divisions (division_id, province_id, name, code, geom) VALUES
(1,1,'Lahore Division','LHR-DIV',ST_Multi(ST_GeomFromText('POLYGON((73.8 31.0,74.8 31.0,74.8 32.0,73.8 32.0,73.8 31.0))',4326)))
ON CONFLICT (division_id) DO NOTHING;

INSERT INTO districts (district_id, division_id, name, code, geom) VALUES
(1,1,'Lahore District','LHR-DST',ST_Multi(ST_GeomFromText('POLYGON((74.1 31.2,74.6 31.2,74.6 31.7,74.1 31.7,74.1 31.2))',4326)))
ON CONFLICT (district_id) DO NOTHING;

INSERT INTO tehsils (tehsil_id, district_id, name, code, urban_rural, geom) VALUES
(1,1,'Lahore City Tehsil','LHR-CTY','Urban',ST_Multi(ST_GeomFromText('POLYGON((74.1 31.2,74.4 31.2,74.4 31.5,74.1 31.5,74.1 31.2))',4326))),
(2,1,'Shalimar Tehsil',   'LHR-SHL','Urban',ST_Multi(ST_GeomFromText('POLYGON((74.4 31.2,74.6 31.2,74.6 31.5,74.4 31.5,74.4 31.2))',4326)))
ON CONFLICT (tehsil_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 4. SECTORS
-- -------------------------------------------------------------------------
INSERT INTO sectors (sector_id, parent_sector_id, name, code) VALUES
(1, NULL,'Textile and Apparel',        'TEX-00'),
(2,    1,'Spinning and Weaving',        'TEX-01'),
(3,    1,'Garments and Ready-made',     'TEX-02'),
(4, NULL,'Leather and Footwear',        'LEA-00'),
(5,    4,'Tanning and Processing',      'LEA-01'),
(6, NULL,'Chemical and Allied',         'CHM-00'),
(7,    6,'Pharmaceuticals',             'CHM-01'),
(8, NULL,'Food and Beverages',          'FOD-00'),
(9, NULL,'Engineering and Metals',      'ENG-00'),
(10,NULL,'Printing and Packaging',      'PRT-00'),
(11,NULL,'Wood and Furniture',          'WOD-00'),
(12,NULL,'Plastics and Rubber',         'PLR-00'),
(13,NULL,'Construction Materials',      'CON-00'),
(14,NULL,'Electronics and Electrical',  'ELE-00'),
(15,NULL,'Other Manufacturing',         'OTH-00')
ON CONFLICT (sector_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 5. INDUSTRIAL ESTATES
-- -------------------------------------------------------------------------
INSERT INTO industrial_estates (estate_id, name, estate_type, district_id, geom) VALUES
(1,'Sundar Industrial Estate','Estate',1,ST_Multi(ST_GeomFromText('POLYGON((74.15 31.25,74.20 31.25,74.20 31.30,74.15 31.30,74.15 31.25))',4326)))
ON CONFLICT (estate_id) DO NOTHING;

-- -------------------------------------------------------------------------
-- 6. SURVEY FORM
-- -------------------------------------------------------------------------
INSERT INTO survey_forms (form_id, title, version, description, is_active) VALUES
(1,'Punjab Industrial Unit Survey 2026','2.0',
 'Government of the Punjab - Directorate General of Industries. Mapping of Manufacturing Units in Punjab. Full Census Questionnaire (Sections A-K).',
 TRUE)
ON CONFLICT (form_id) DO UPDATE
  SET title=EXCLUDED.title, version=EXCLUDED.version,
      description=EXCLUDED.description, is_active=EXCLUDED.is_active;

-- -------------------------------------------------------------------------
-- 7. SURVEY SECTIONS  (11 sections: A through K)
-- -------------------------------------------------------------------------
DELETE FROM survey_sections WHERE form_id = 1;

INSERT INTO survey_sections (section_id, form_id, title, sort_order) VALUES
( 1, 1, 'Section A: Establishment Identity',            1),
( 2, 1, 'Section B: Operational Details',               2),
( 3, 1, 'Section C: Core and Secondary Activities',     3),
( 4, 1, 'Section D: Workforce',                         4),
( 5, 1, 'Section E: Backward Linkages',                 5),
( 6, 1, 'Section F: Forward Linkages',                  6),
( 7, 1, 'Section G: Technology and Production',         7),
( 8, 1, 'Section H: Energy and Waste Management',       8),
( 9, 1, 'Section I: Certifications and Compliances',    9),
(10, 1, 'Section J: Strategic Business Plan',          10),
(11, 1, 'Section K: Future Collaborations and Barriers',11)
ON CONFLICT (section_id) DO UPDATE
  SET title=EXCLUDED.title, sort_order=EXCLUDED.sort_order;

-- -------------------------------------------------------------------------
-- 8. SURVEY QUESTIONS
-- -------------------------------------------------------------------------
DELETE FROM survey_question_logic;
DELETE FROM survey_questions;

-- ==========================================================================
-- SECTION A: Establishment Identity  (section_id = 1)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(1,  1,'HDR.GPS','Geotag Location (GPS Coordinates)',               'gps',   TRUE,  NULL, NULL, 1),
(2,  1,'HDR.P1', 'Photo: Interview Session (timestamped)',          'photo', TRUE,  NULL, NULL, 2),
(3,  1,'HDR.P2', 'Photo: Enumerator at Unit Entrance with Sign Board','photo',TRUE, NULL, NULL, 3),
(4,  1,'A.1',  'Name of Establishment',                            'text',   TRUE,  NULL, NULL, 4),
(5,  1,'A.2',  'Year of Establishment',                            'number', FALSE, '{"min":1800,"max":2026}'::jsonb, NULL, 5),
(6,  1,'A.3',  'Address of Establishment',                         'text',   TRUE,  NULL, NULL, 6),
(7,  1,'A.4a', 'City',                                             'text',   TRUE,  NULL, NULL, 7),
(8,  1,'A.4b', 'Tehsil',                                           'text',   TRUE,  NULL, NULL, 8),
(9,  1,'A.4c', 'District',                                         'text',   TRUE,  NULL, NULL, 9),
(10, 1,'A.5a', 'Contact Phone / Cell Number',                      'text',   FALSE, NULL, NULL, 10),
(11, 1,'A.5b', 'Contact Email',                                    'text',   FALSE, NULL, NULL, 11),
(12, 1,'A.5c', 'Website',                                          'text',   FALSE, NULL, NULL, 12),
(13, 1,'A.6',  'Type of Unit',                                     'select', TRUE,  NULL,
     '["Spinning Mill","Weaving Unit","Garment / Stitching Unit","Dyeing and Finishing","Knitwear Unit","Hosiery Unit","Tannery","Footwear Unit","Pharmaceutical Plant","Chemical Plant","Paint / Varnish","Fertilizer Plant","Flour Mill","Rice Mill","Sugar Mill","Beverages / Soft Drinks","Dairy / Food Processing","Engineering Workshop","Steel Re-rolling Mill","Foundry / Casting","Auto Parts / Engineering","Printing Press","Packaging Unit","Furniture / Wood Work","Plastic Products","Rubber Products","Brick / Tile Kiln","Cement / Concrete Products","Electronics / Electrical Goods","Other Manufacturing"]'::jsonb, 13),
(14, 1,'A.7a', 'PSIC Classification - Division',                   'text',   FALSE, NULL, NULL, 14),
(15, 1,'A.7b', 'PSIC Classification - Group',                      'text',   FALSE, NULL, NULL, 15),
(16, 1,'A.7c', 'PSIC Classification - Class',                      'text',   FALSE, NULL, NULL, 16),
(17, 1,'A.8',  'Area / Zone Type',                                 'select', TRUE,  NULL,
     '["Industrial Area","Residential Area","Commercial Area","Rural / Agricultural","Special Economic Zone / Industrial Estate","Other"]'::jsonb, 17),
(18, 1,'A.8x', 'Area / Zone Type - If Other, specify',             'text',   FALSE, NULL, NULL, 18),
(19, 1,'A.9',  'Ownership of Establishment',                       'select', TRUE,  NULL,
     '["State owned/Public Sector","Privately Owned","Foreign Controlled Enterprise","Other"]'::jsonb, 19),
(20, 1,'A.10', 'Legal Structure of Ownership',                     'select', TRUE,  NULL,
     '["Sole Proprietorship","Partnership","Private Limited Company","Public Limited Company","Cooperative / Society","Limited Liability Company","Others"]'::jsonb, 20),
(21, 1,'A.10x','Legal Structure - If Others, specify',             'text',   FALSE, NULL, NULL, 21),
(22, 1,'A.11a','Parent Company Name (if any)',                     'text',   FALSE, NULL, NULL, 22),
(23, 1,'A.11b','Parent Company Address',                           'text',   FALSE, NULL, NULL, 23),
(24, 1,'A.11c','Parent Company Phone / Cell',                      'text',   FALSE, NULL, NULL, 24),
(25, 1,'A.11d','Parent Company Email',                             'text',   FALSE, NULL, NULL, 25),
(26, 1,'A.13', 'Total Establishment Area (Square Meters)',         'number', FALSE, '{"min":1}'::jsonb, NULL, 26),
(27, 1,'A.14', 'Total Capital Investment (PKR)',                   'number', FALSE, '{"min":0}'::jsonb, NULL, 27);

-- ==========================================================================
-- SECTION B: Operational Details  (section_id = 2)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(28, 2,'B.1',  'Current Operational Status',           'select', TRUE,  NULL,
     '["Fully Operational","Partially Operational","Seasonal","Temporarily Closed","Permanently Closed"]'::jsonb, 1),
(29, 2,'B.1s', 'If Seasonal - specify the period',     'text',   FALSE, NULL, NULL, 2),
(30, 2,'B.2',  'Reason for Closure (if any)',          'text',   FALSE, NULL, NULL, 3),
(31, 2,'B.3',  'Daily Operational Hours',              'select', TRUE,  NULL,
     '["Less than 8 hrs.","8 hrs. (Single Shift)","16 hrs. (Double Shift)","24 hrs. (Triple Shift)","Flexible / Variable"]'::jsonb, 4),
(32, 2,'B.3a', 'Total Working Days per Week',          'number', FALSE, '{"min":1,"max":7}'::jsonb,  NULL, 5),
(33, 2,'B.3b', 'Total Working Months per Year',        'number', FALSE, '{"min":1,"max":12}'::jsonb, NULL, 6);

-- ==========================================================================
-- SECTION C: Core and Secondary Activities  (section_id = 3)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(34, 3,'C.1.1', 'Main Product 1 - Name',                            'text',   TRUE,  NULL, NULL, 1),
(35, 3,'C.1.1u','Main Product 1 - Unit of Measurement',             'text',   TRUE,  NULL, NULL, 2),
(36, 3,'C.1.1d','Main Product 1 - Daily Average Output',            'number', FALSE, '{"min":0}'::jsonb, NULL, 3),
(37, 3,'C.1.1a','Main Product 1 - Annual Total Production',         'number', FALSE, '{"min":0}'::jsonb, NULL, 4),
(38, 3,'C.1.1c','Main Product 1 - Installed Capacity (units/day)',  'number', FALSE, '{"min":0}'::jsonb, NULL, 5),
(39, 3,'C.1.2', 'Main Product 2 - Name (if any)',                   'text',   FALSE, NULL, NULL, 6),
(40, 3,'C.1.2u','Main Product 2 - Unit of Measurement',             'text',   FALSE, NULL, NULL, 7),
(41, 3,'C.1.2d','Main Product 2 - Daily Average Output',            'number', FALSE, '{"min":0}'::jsonb, NULL, 8),
(42, 3,'C.1.2a','Main Product 2 - Annual Total Production',         'number', FALSE, '{"min":0}'::jsonb, NULL, 9),
(43, 3,'C.1.2c','Main Product 2 - Installed Capacity (units/day)',  'number', FALSE, '{"min":0}'::jsonb, NULL, 10),
(44, 3,'C.1.3', 'Main Product 3 - Name (if any)',                   'text',   FALSE, NULL, NULL, 11),
(45, 3,'C.1.3u','Main Product 3 - Unit of Measurement',             'text',   FALSE, NULL, NULL, 12),
(46, 3,'C.1.3d','Main Product 3 - Daily Average Output',            'number', FALSE, '{"min":0}'::jsonb, NULL, 13),
(47, 3,'C.1.3a','Main Product 3 - Annual Total Production',         'number', FALSE, '{"min":0}'::jsonb, NULL, 14),
(48, 3,'C.1.3c','Main Product 3 - Installed Capacity (units/day)',  'number', FALSE, '{"min":0}'::jsonb, NULL, 15),
(49, 3,'C.2.1', 'Secondary / By-product 1 - Name (if any)',         'text',   FALSE, NULL, NULL, 16),
(50, 3,'C.2.1u','Secondary / By-product 1 - Unit of Measurement',   'text',   FALSE, NULL, NULL, 17),
(51, 3,'C.2.1d','Secondary / By-product 1 - Daily Average Output',  'number', FALSE, '{"min":0}'::jsonb, NULL, 18),
(52, 3,'C.2.1a','Secondary / By-product 1 - Annual Total Production','number',FALSE, '{"min":0}'::jsonb, NULL, 19),
(53, 3,'C.2.1c','Secondary / By-product 1 - Installed Capacity',    'number', FALSE, '{"min":0}'::jsonb, NULL, 20),
(54, 3,'C.2.2', 'Secondary / By-product 2 - Name (if any)',         'text',   FALSE, NULL, NULL, 21),
(55, 3,'C.2.2u','Secondary / By-product 2 - Unit of Measurement',   'text',   FALSE, NULL, NULL, 22),
(56, 3,'C.2.2d','Secondary / By-product 2 - Daily Average Output',  'number', FALSE, '{"min":0}'::jsonb, NULL, 23),
(57, 3,'C.2.2a','Secondary / By-product 2 - Annual Total Production','number',FALSE, '{"min":0}'::jsonb, NULL, 24),
(58, 3,'C.2.2c','Secondary / By-product 2 - Installed Capacity',    'number', FALSE, '{"min":0}'::jsonb, NULL, 25);

-- ==========================================================================
-- SECTION D: Workforce  (section_id = 4)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(59, 4,'D.1.rm','Regular Employees - Male',                        'number', TRUE,  '{"min":0}'::jsonb, NULL, 1),
(60, 4,'D.1.rf','Regular Employees - Female',                      'number', TRUE,  '{"min":0}'::jsonb, NULL, 2),
(61, 4,'D.1.cm','Contract Employees - Male',                       'number', FALSE, '{"min":0}'::jsonb, NULL, 3),
(62, 4,'D.1.cf','Contract Employees - Female',                     'number', FALSE, '{"min":0}'::jsonb, NULL, 4),
(63, 4,'D.1.dm','Daily Wages Employees - Male',                    'number', FALSE, '{"min":0}'::jsonb, NULL, 5),
(64, 4,'D.1.df','Daily Wages Employees - Female',                  'number', FALSE, '{"min":0}'::jsonb, NULL, 6),
(65, 4,'D.1.si','Are employment figures a seasonal average?',      'boolean',FALSE, NULL, NULL, 7),
(66, 4,'D.2.mm','Managers - Male',                                 'number', FALSE, '{"min":0}'::jsonb, NULL, 8),
(67, 4,'D.2.mf','Managers - Female',                               'number', FALSE, '{"min":0}'::jsonb, NULL, 9),
(68, 4,'D.2.sm','Skilled / Technical Workers - Male',              'number', FALSE, '{"min":0}'::jsonb, NULL, 10),
(69, 4,'D.2.sf','Skilled / Technical Workers - Female',            'number', FALSE, '{"min":0}'::jsonb, NULL, 11),
(70, 4,'D.2.em','Semi-skilled Workers - Male',                     'number', FALSE, '{"min":0}'::jsonb, NULL, 12),
(71, 4,'D.2.ef','Semi-skilled Workers - Female',                   'number', FALSE, '{"min":0}'::jsonb, NULL, 13),
(72, 4,'D.2.um','Unskilled Workers - Male',                        'number', FALSE, '{"min":0}'::jsonb, NULL, 14),
(73, 4,'D.2.uf','Unskilled Workers - Female',                      'number', FALSE, '{"min":0}'::jsonb, NULL, 15),
(74, 4,'D.2.am','Administrative / Supporting Staff - Male',        'number', FALSE, '{"min":0}'::jsonb, NULL, 16),
(75, 4,'D.2.af','Administrative / Supporting Staff - Female',      'number', FALSE, '{"min":0}'::jsonb, NULL, 17),
(76, 4,'D.3',  'Hiring Channels (select all that apply)',          'multiselect', FALSE, NULL,
     '["Universities and degree colleges","Technical and vocational training centers (TVETs)","Online job portals and recruitment agencies","Employee referrals","Internal upskilling of existing staff","Others"]'::jsonb, 18),
(77, 4,'D.3x', 'Hiring Channels - If Others, specify',            'text',   FALSE, NULL, NULL, 19);

-- ==========================================================================
-- SECTION E: Backward Linkages  (section_id = 5)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(78,  5,'E.1a','Raw Material Sourcing - Direct from Primary Producers (%)',  'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 1),
(79,  5,'E.1b','Raw Material Sourcing - Traders / Brokers (%)',              'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 2),
(80,  5,'E.1c','Raw Material Sourcing - Wholesalers / Local Dealers (%)',    'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 3),
(81,  5,'E.1d','Raw Material Sourcing - Importers / Foreign Suppliers (%)',  'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 4),
(82,  5,'E.1e','Raw Material Sourcing - Own Production / In-house (%)',      'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 5),
(83,  5,'E.1f','Raw Material Sourcing - Spot / Open Market Purchases (%)',   'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 6),
(84,  5,'E.1g','Raw Material Sourcing - Others (%)',                         'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 7),
(85,  5,'E.1gx','Raw Material Sourcing - Others, specify',                   'text',  FALSE,NULL,NULL, 8),
(86,  5,'E.2a','Source Location - Local (same district) (%)',                'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 9),
(87,  5,'E.2b','Source Location - Regional (same province) (%)',             'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,10),
(88,  5,'E.2c','Source Location - National (other provinces) (%)',           'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,11),
(89,  5,'E.2d','Source Location - Imported (%)',                             'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,12),
(90,  5,'E.3', 'Number of Active Suppliers',                                 'select',FALSE,NULL,
     '["1-2","3-5","6-10","More than 10"]'::jsonb, 13),
(91,  5,'E.4', 'Supplier Dependency',                                        'select',FALSE,NULL,
     '["Low - replaceable within 1 week","Moderate - replaceable in 1-4 weeks","High - replacement takes 1-6 months","Critical - sole source or locked in"]'::jsonb, 14),
(92,  5,'E.5', 'Mode of Procurement',                                        'select',FALSE,NULL,
     '["Long-term contract (1 year or more)","Short-term contract (less than 1 year)","Spot/market purchases","Combination of contract and spot"]'::jsonb, 15),
(93,  5,'E.6', 'Faced Supply Disruption in Last 12 Months?',                'boolean',FALSE,NULL,NULL, 16),
(94,  5,'E.6r','Supply Disruption Reasons (select all that apply)',          'multiselect',FALSE,NULL,
     '["Supplier failure","Price spike","Import restriction","Transport breakdown","Other"]'::jsonb, 17),
(95,  5,'E.7', 'On-Time Delivery Reliability',                               'select',FALSE,NULL,
     '["Above 90% (very reliable)","70-90% (mostly on time, occasional delays)","50-70% (frequent delays)","Below 50% (serious delivery problem)","Not formally tracked"]'::jsonb, 18),
(96,  5,'E.8', 'Product Acceptance Rate (from suppliers)',                   'select',FALSE,NULL,
     '["Above 90% (very low rejection rate)","70-90% (occasional quality issues)","50-70% (frequent rejections/reworks)","Below 50% (serious quality problem)","Not formally tracked"]'::jsonb, 19),
(97,  5,'E.9.1n','Raw Material 1 - Input Name',                             'text',  FALSE,NULL,NULL,20),
(98,  5,'E.9.1u','Raw Material 1 - Unit of Measurement',                    'text',  FALSE,NULL,NULL,21),
(99,  5,'E.9.1t','Raw Material 1 - Transformation Stage',                   'select',FALSE,NULL,
     '["T1 - Natural/Unprocessed","T2 - Primary processed","T3 - Generic intermediate","T4 - Specified intermediate","T5 - Fabricated component","T6 - Consumable/packaging"]'::jsonb,22),
(100, 5,'E.9.1p','Raw Material 1 - % Share in Production Cost',             'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,23),
(101, 5,'E.9.1h','Raw Material 1 - HS Code',                                'text',  FALSE,NULL,NULL,24),
(102, 5,'E.9.2n','Raw Material 2 - Input Name',                             'text',  FALSE,NULL,NULL,25),
(103, 5,'E.9.2u','Raw Material 2 - Unit of Measurement',                    'text',  FALSE,NULL,NULL,26),
(104, 5,'E.9.2t','Raw Material 2 - Transformation Stage',                   'select',FALSE,NULL,
     '["T1 - Natural/Unprocessed","T2 - Primary processed","T3 - Generic intermediate","T4 - Specified intermediate","T5 - Fabricated component","T6 - Consumable/packaging"]'::jsonb,27),
(105, 5,'E.9.2p','Raw Material 2 - % Share in Production Cost',             'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,28),
(106, 5,'E.9.2h','Raw Material 2 - HS Code',                                'text',  FALSE,NULL,NULL,29),
(107, 5,'E.9.3n','Raw Material 3 - Input Name',                             'text',  FALSE,NULL,NULL,30),
(108, 5,'E.9.3u','Raw Material 3 - Unit of Measurement',                    'text',  FALSE,NULL,NULL,31),
(109, 5,'E.9.3t','Raw Material 3 - Transformation Stage',                   'select',FALSE,NULL,
     '["T1 - Natural/Unprocessed","T2 - Primary processed","T3 - Generic intermediate","T4 - Specified intermediate","T5 - Fabricated component","T6 - Consumable/packaging"]'::jsonb,32),
(110, 5,'E.9.3p','Raw Material 3 - % Share in Production Cost',             'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,33),
(111, 5,'E.9.3h','Raw Material 3 - HS Code',                                'text',  FALSE,NULL,NULL,34);

-- ==========================================================================
-- SECTION F: Forward Linkages  (section_id = 6)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(112, 6,'F.1a','Buyers - Wholesalers / Traders (%)',               'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 1),
(113, 6,'F.1b','Buyers - Retailers (%)',                           'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 2),
(114, 6,'F.1c','Buyers - Other Manufacturers (%)',                 'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 3),
(115, 6,'F.1d','Buyers - Government / Public Sector (%)',          'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 4),
(116, 6,'F.1e','Buyers - Direct Consumers (%)',                    'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 5),
(117, 6,'F.1f','Buyers - Export / Foreign Buyers (%)',             'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 6),
(118, 6,'F.1g','Buyers - Others (%)',                              'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 7),
(119, 6,'F.1gx','Buyers - Others, specify',                        'text',  FALSE,NULL,NULL, 8),
(120, 6,'F.2a','Buyer Location - Local (same district) (%)',       'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 9),
(121, 6,'F.2b','Buyer Location - Regional (same province) (%)',    'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,10),
(122, 6,'F.2c','Buyer Location - National (other provinces) (%)',  'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,11),
(123, 6,'F.2d','Buyer Location - Exported (%)',                    'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,12),
(124, 6,'F.3', 'Part of Global Supply Chain',                     'select',FALSE,NULL,
     '["Yes, as a direct exporter","Yes, as a supplier to an exporter","No, but planning to","No"]'::jsonb, 13),
(125, 6,'F.4', 'Number of Active Buyers',                         'select',FALSE,NULL,
     '["1-2","3-5","6-10","More than 10"]'::jsonb, 14),
(126, 6,'F.5', 'Demand Assessment Methods (select all that apply)','multiselect',FALSE,NULL,
     '["Direct buyer feedback","Industry association","Trade fairs and exhibitions","Online research","Informal networks","Hired market research firm","No formal market research"]'::jsonb, 15),
(127, 6,'F.6', 'Buyer Availability / Replaceability',             'select',FALSE,NULL,
     '["Low - easily replaceable (under 2 weeks)","Moderate - replaceable with effort (2-8 weeks)","High - difficult to replace (2-6 months)","Critical - single buyer or contractually locked"]'::jsonb, 16),
(128, 6,'F.7', 'Mode of Sale - by Contract',                      'select',FALSE,NULL,
     '["Long-term contract (1 year or more)","Short-term contract (less than 1 year)","Spot/market purchases","Combination of contract and spot"]'::jsonb, 17),
(129, 6,'F.8', 'Mode of Sale - by Payment',                       'select',FALSE,NULL,
     '["Cash / advance payment (before or on delivery)","Credit sales - short term (up to 30 days)","Credit sales - medium term (31-90 days)","Credit sales - long term (90+ days)","Letter of Credit / LC (primarily for export)","Consignment basis (payment after buyer sells)","Mixed - varies by buyer"]'::jsonb, 18),
(130, 6,'F.9', 'Faced Demand / Market Disruption in Last 12 Months?','boolean',FALSE,NULL,NULL, 19),
(131, 6,'F.9r','Demand Disruption Reasons (select all that apply)','multiselect',FALSE,NULL,
     '["Buyer insolvency/exit","Price collapse","Export restriction","Demand contraction","Other"]'::jsonb, 20),
(132, 6,'F.10.1n','Product 1 - Name',                             'text',  FALSE,NULL,NULL,21),
(133, 6,'F.10.1u','Product 1 - Unit of Measurement',              'text',  FALSE,NULL,NULL,22),
(134, 6,'F.10.1t','Product 1 - Form at Transformation',           'select',FALSE,NULL,
     '["T2 - Primary processed","T3 - Generic intermediate","T4 - Specified intermediate","T5 - Fabricated component","T6 - Consumable/packaging"]'::jsonb,23),
(135, 6,'F.10.1p','Product 1 - % Share in Total Revenue',         'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,24),
(136, 6,'F.10.1h','Product 1 - HS Code',                          'text',  FALSE,NULL,NULL,25),
(137, 6,'F.10.2n','Product 2 - Name',                             'text',  FALSE,NULL,NULL,26),
(138, 6,'F.10.2u','Product 2 - Unit of Measurement',              'text',  FALSE,NULL,NULL,27),
(139, 6,'F.10.2t','Product 2 - Form at Transformation',           'select',FALSE,NULL,
     '["T2 - Primary processed","T3 - Generic intermediate","T4 - Specified intermediate","T5 - Fabricated component","T6 - Consumable/packaging"]'::jsonb,28),
(140, 6,'F.10.2p','Product 2 - % Share in Total Revenue',         'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,29),
(141, 6,'F.10.2h','Product 2 - HS Code',                          'text',  FALSE,NULL,NULL,30),
(142, 6,'F.10.3n','Product 3 - Name',                             'text',  FALSE,NULL,NULL,31),
(143, 6,'F.10.3u','Product 3 - Unit of Measurement',              'text',  FALSE,NULL,NULL,32),
(144, 6,'F.10.3t','Product 3 - Form at Transformation',           'select',FALSE,NULL,
     '["T2 - Primary processed","T3 - Generic intermediate","T4 - Specified intermediate","T5 - Fabricated component","T6 - Consumable/packaging"]'::jsonb,33),
(145, 6,'F.10.3p','Product 3 - % Share in Total Revenue',         'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,34),
(146, 6,'F.10.3h','Product 3 - HS Code',                          'text',  FALSE,NULL,NULL,35),
(147, 6,'F.11','Subcontracting Arrangements',                      'select',FALSE,NULL,
     '["Receives subcontracted work from larger firms","Subcontracts work out to smaller firms or home workers","Both - gives and receive subcontracted work","No subcontracting arrangements"]'::jsonb, 36),
(148, 6,'F.12a','Competitive Strength - Product Quality vs Competitors',   'select',FALSE,NULL,'["Stronger","Same","Weaker","Don''t Know / NA"]'::jsonb, 37),
(149, 6,'F.12b','Competitive Strength - Price Competitiveness',            'select',FALSE,NULL,'["Stronger","Same","Weaker","Don''t Know / NA"]'::jsonb, 38),
(150, 6,'F.12c','Competitive Strength - Delivery Reliability',             'select',FALSE,NULL,'["Stronger","Same","Weaker","Don''t Know / NA"]'::jsonb, 39),
(151, 6,'F.12d','Competitive Strength - Product Variety / Range',          'select',FALSE,NULL,'["Stronger","Same","Weaker","Don''t Know / NA"]'::jsonb, 40),
(152, 6,'F.12e','Competitive Strength - After-sales Service',              'select',FALSE,NULL,'["Stronger","Same","Weaker","Don''t Know / NA"]'::jsonb, 41),
(153, 6,'F.12f','Competitive Strength - Technological Capability',         'select',FALSE,NULL,'["Stronger","Same","Weaker","Don''t Know / NA"]'::jsonb, 42),
(154, 6,'F.13a','Digital Presence - Company Website',                      'select',FALSE,NULL,'["Active","Inactive","NA"]'::jsonb, 43),
(155, 6,'F.13b','Digital Presence - Social Media (Facebook/Instagram/LinkedIn)','select',FALSE,NULL,'["Active","Inactive","NA"]'::jsonb, 44),
(156, 6,'F.13c','Digital Presence - B2B Platform (Alibaba etc.)',          'select',FALSE,NULL,'["Active","Inactive","NA"]'::jsonb, 45),
(157, 6,'F.13d','Digital Presence - Own E-commerce / Online Store',        'select',FALSE,NULL,'["Active","Inactive","NA"]'::jsonb, 46),
(158, 6,'F.13e','Digital Presence - Digital Marketing / Paid Advertising', 'select',FALSE,NULL,'["Active","Inactive","NA"]'::jsonb, 47);

-- ==========================================================================
-- SECTION G: Technology and Production  (section_id = 7)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(159, 7,'G.1.1n','Critical Machine 1 - Name',                      'text',  FALSE,NULL,NULL, 1),
(160, 7,'G.1.1q','Critical Machine 1 - Quantity',                  'number',FALSE,'{"min":1}'::jsonb,NULL, 2),
(161, 7,'G.1.1s','Critical Machine 1 - Salient Specification',     'text',  FALSE,NULL,NULL, 3),
(162, 7,'G.1.2n','Critical Machine 2 - Name',                      'text',  FALSE,NULL,NULL, 4),
(163, 7,'G.1.2q','Critical Machine 2 - Quantity',                  'number',FALSE,'{"min":1}'::jsonb,NULL, 5),
(164, 7,'G.1.2s','Critical Machine 2 - Salient Specification',     'text',  FALSE,NULL,NULL, 6),
(165, 7,'G.1.3n','Critical Machine 3 - Name',                      'text',  FALSE,NULL,NULL, 7),
(166, 7,'G.1.3q','Critical Machine 3 - Quantity',                  'number',FALSE,'{"min":1}'::jsonb,NULL, 8),
(167, 7,'G.1.3s','Critical Machine 3 - Salient Specification',     'text',  FALSE,NULL,NULL, 9),
(168, 7,'G.2',  'Processing Capacity (describe)',                   'text',  FALSE,NULL,NULL,10),
(169, 7,'G.3',  'Capacity Utilization Rate',                        'select',FALSE,NULL,
     '["40-59%","60-74%","75-84%","85-95%","Above 95%"]'::jsonb, 11),
(170, 7,'G.4',  'Reasons for Underutilization (select all that apply)','multiselect',FALSE,NULL,
     '["Energy shortage / load shedding","Raw material unavailability","Insufficient market demand / orders","Machinery breakdown","Labor shortage","Financing constraints","Seasonal nature of production","Other"]'::jsonb, 12),
(171, 7,'G.4x', 'Underutilization - Other, specify',               'text',  FALSE,NULL,NULL,13),
(172, 7,'G.5a','Automation - Fully Manual / Hand-operated (%)',     'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,14),
(173, 7,'G.5b','Automation - Mechanical / Power-driven (%)',        'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,15),
(174, 7,'G.5c','Automation - Semi-automatic (%)',                   'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,16),
(175, 7,'G.5d','Automation - CNC / Computer-controlled (%)',        'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,17),
(176, 7,'G.5e','Automation - Fully Automated / Robotic (%)',        'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,18),
(177, 7,'G.6', 'Level of Integration Between Machines',             'select',FALSE,NULL,
     '["No integration - each machine works alone","Partial integration - some machines or processes are linked","Full integration - all machines digitally connected"]'::jsonb, 19),
(178, 7,'G.7a','Primary Machinery Source',                          'select',FALSE,NULL,'["Local","Imported","Both"]'::jsonb, 20),
(179, 7,'G.7b','Spare Parts Source',                                'select',FALSE,NULL,'["Local","Imported","Both"]'::jsonb, 21),
(180, 7,'G.8a','Machinery Age - Less than 5 years (%)',             'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,22),
(181, 7,'G.8b','Machinery Age - 5 to 10 years (%)',                'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,23),
(182, 7,'G.8c','Machinery Age - 11 to 20 years (%)',               'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,24),
(183, 7,'G.8d','Machinery Age - More than 20 years (%)',            'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,25),
(184, 7,'G.9', 'Frequency of Machinery Breakdown',                  'select',FALSE,NULL,
     '["Almost never (less than once a year)","Rarely (a few times a year, 1 to 5 times)","Occasionally (once a month on average)","Frequently (multiple times per month)","Very frequently (weekly or more)"]'::jsonb, 26),
(185, 7,'G.10','Maintenance Approach',                              'select',FALSE,NULL,
     '["In-house maintenance team","External contractor","Combination","No formal maintenance system"]'::jsonb, 27),
(186, 7,'G.11.1t','Boiler 1 - Type',                               'text',  FALSE,NULL,NULL,28),
(187, 7,'G.11.1c','Boiler 1 - Capacity (Steam Production TPH)',     'number',FALSE,'{"min":0}'::jsonb,NULL,29),
(188, 7,'G.11.1h','Boiler 1 - Heating Surface',                    'text',  FALSE,NULL,NULL,30),
(189, 7,'G.11.2t','Boiler 2 - Type',                               'text',  FALSE,NULL,NULL,31),
(190, 7,'G.11.2c','Boiler 2 - Capacity (Steam Production TPH)',     'number',FALSE,'{"min":0}'::jsonb,NULL,32),
(191, 7,'G.11.2h','Boiler 2 - Heating Surface',                    'text',  FALSE,NULL,NULL,33),
(192, 7,'G.12.1t','Weights and Measures Equipment 1 - Type',        'text',  FALSE,NULL,NULL,34),
(193, 7,'G.12.1q','Weights and Measures Equipment 1 - Quantity',    'number',FALSE,'{"min":1}'::jsonb,NULL,35),
(194, 7,'G.12.1c','Weights and Measures Equipment 1 - Capacity',    'text',  FALSE,NULL,NULL,36),
(195, 7,'G.12.2t','Weights and Measures Equipment 2 - Type',        'text',  FALSE,NULL,NULL,37),
(196, 7,'G.12.2q','Weights and Measures Equipment 2 - Quantity',    'number',FALSE,'{"min":1}'::jsonb,NULL,38),
(197, 7,'G.12.2c','Weights and Measures Equipment 2 - Capacity',    'text',  FALSE,NULL,NULL,39),
(198, 7,'G.13','Production Planning System',                        'select',FALSE,NULL,
     '["Manual / paper-based","Spreadsheet (Excel)","Standalone scheduling software","ERP system (SAP, Oracle, Odoo etc.)","Custom-developed system"]'::jsonb, 40),
(199, 7,'G.14','Inventory Management System',                       'select',FALSE,NULL,
     '["No formal system","Manual registers","Spreadsheet-based","Dedicated inventory software","Integrated with ERP"]'::jsonb, 41),
(200, 7,'G.15.prod','Innovation - Product Upgrades (completed/ongoing/planned)','multiselect',FALSE,NULL,
     '["Introducing a new product or significantly improved an existing one","Upgraded to higher quality / more complex / value-added products","Achieved a new quality certification (ISO, halal, organic)","Started supplying to more demanding or higher-tier buyers"]'::jsonb, 42),
(201, 7,'G.15.proc','Innovation - Production Process Improvements',  'multiselect',FALSE,NULL,
     '["Invested in new machinery or equipment","Improved production methods or overall process efficiency","Reduced waste, rejection rate or material losses","Increased output volume without proportionally adding workers"]'::jsonb, 43),
(202, 7,'G.15.qual','Innovation - Quality and Testing',              'multiselect',FALSE,NULL,
     '["Introducing new quality control or testing methods","Brought quality testing in-house (previously outsourced or absent)"]'::jsonb, 44),
(203, 7,'G.15.tech','Innovation - Technology and R&D',               'multiselect',FALSE,NULL,
     '["Conducted formal R&D (in-house or with external partner)","Licensed or acquired new technology from domestic or foreign firm"]'::jsonb, 45),
(204, 7,'G.15.biz', 'Innovation - Business Functions and Value Chain','multiselect',FALSE,NULL,
     '["Started own packaging, labelling or branding","Took on product design or development function","Added own logistics, warehousing or delivery capability","Started exporting directly (previously sold through intermediary)"]'::jsonb, 46),
(205, 7,'G.15.mkt', 'Innovation - Market and Sales',                 'multiselect',FALSE,NULL,
     '["Adopted new sales channels (online, modern retail, export markets)","Revised pricing strategy or introduced new product sizes and formats"]'::jsonb, 47),
(206, 7,'G.15.org', 'Innovation - Organisational',                   'multiselect',FALSE,NULL,
     '["Restructured workflows, management practices or supply chain operations"]'::jsonb, 48),
(207, 7,'G.15.div', 'Innovation - Diversification: added product line in new sector (specify)', 'text',FALSE,NULL,NULL, 49),
(208, 7,'G.16','R&D Expenditure (% of revenue)',                     'select',FALSE,NULL,
     '["No R&D expenditure","Less than 1%","1-3%","3-5%","More than 5%"]'::jsonb, 50);

-- ==========================================================================
-- SECTION H: Energy and Waste Management  (section_id = 8)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(209, 8,'H.1a','Energy - Grid Electricity (WAPDA/DISCO) - Monthly Qty (kWh)',  'number',FALSE,'{"min":0}'::jsonb,NULL, 1),
(210, 8,'H.1b','Energy - Grid Electricity - % of Total Energy',                'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 2),
(211, 8,'H.1c','Energy - Diesel - Monthly Qty (Litres)',                       'number',FALSE,'{"min":0}'::jsonb,NULL, 3),
(212, 8,'H.1d','Energy - Diesel - % of Total Energy',                         'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 4),
(213, 8,'H.1e','Energy - Natural Gas (process) - Monthly Qty (MMBTU)',        'number',FALSE,'{"min":0}'::jsonb,NULL, 5),
(214, 8,'H.1f','Energy - Natural Gas - % of Total Energy',                    'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 6),
(215, 8,'H.1g','Energy - Coal - Monthly Qty (Tons)',                          'number',FALSE,'{"min":0}'::jsonb,NULL, 7),
(216, 8,'H.1h','Energy - Coal - % of Total Energy',                          'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL, 8),
(217, 8,'H.1i','Energy - Solar - Monthly Qty (kWh)',                          'number',FALSE,'{"min":0}'::jsonb,NULL, 9),
(218, 8,'H.1j','Energy - Solar - % of Total Energy',                         'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,10),
(219, 8,'H.1k','Energy - Other Source - Name',                                'text',  FALSE,NULL,NULL,11),
(220, 8,'H.1l','Energy - Other Source - % of Total Energy',                  'number',FALSE,'{"min":0,"max":100}'::jsonb,NULL,12),
(221, 8,'H.2a','Captive Power Capacity (kW)',                                 'number',FALSE,'{"min":0}'::jsonb,NULL,13),
(222, 8,'H.2b','Export Capacity (kW)',                                        'number',FALSE,'{"min":0}'::jsonb,NULL,14),
(223, 8,'H.2c','Power Generation Sources (select all that apply)',            'multiselect',FALSE,NULL,
     '["Gensets","Solar","Powerhouse","Other"]'::jsonb,15),
(224, 8,'H.3', 'Air Pollutants Generated (select all that apply)',            'multiselect',FALSE,NULL,
     '["Particulate Matter (PM10/PM2.5/Black carbon)","Sulfur Dioxide (SO2)","Nitrogen Oxides (NOx)","Carbon Monoxide (CO)","Carbon Dioxide (CO2)","Methane (CH4)","Ammonia (NH3)","Volatile Organic Compounds (VOCs)","Hydrogen Sulfide (H2S)","Chlorine / HCl","Heavy Metals (Lead, Mercury, Cadmium)","Dye/color-bearing fumes","Other"]'::jsonb,16),
(225, 8,'H.4', 'Emission Control Measures in Place (select all that apply)',  'multiselect',FALSE,NULL,
     '["Chimney / stack with minimum height compliance","Bag filter / fabric filter installed","Wet scrubber installed","Electrostatic precipitator (ESP)","Cyclone separator","Ventilation and extraction system indoors","No control measures in place","Not applicable - no significant air emissions"]'::jsonb,17),
(226, 8,'H.5', 'Water Sourcing (select all that apply)',                      'multiselect',FALSE,NULL,
     '["Municipal supply","Own borehole/tube well","Canal/surface water","Purchased tanker","Recycled/treated water","Other"]'::jsonb,18),
(227, 8,'H.6a','Wastewater - Treated on-site before discharge',              'boolean',FALSE,NULL,NULL,19),
(228, 8,'H.6b','Wastewater - Discharged to municipal drain untreated',       'boolean',FALSE,NULL,NULL,20),
(229, 8,'H.6c','Wastewater - Discharged to open lands untreated',            'boolean',FALSE,NULL,NULL,21),
(230, 8,'H.6d','Wastewater - Discharged to Common Effluent Treatment Plant', 'boolean',FALSE,NULL,NULL,22),
(231, 8,'H.6e','Wastewater - Recycled within the production process',        'boolean',FALSE,NULL,NULL,23),
(232, 8,'H.6f','Wastewater - Disposed via licensed contractor',              'boolean',FALSE,NULL,NULL,24),
(233, 8,'H.7a','Solid Waste - Production Scrap / Off-cuts (generated?)',     'boolean',FALSE,NULL,NULL,25),
(234, 8,'H.7ad','Solid Waste - Production Scrap - Disposal Methods',         'multiselect',FALSE,NULL,
     '["Sold to another industry","Recycled on-site","Waste-to-energy","Co-processing (cement/brick kiln)","Incineration","Open burning","Licensed contractor","Engineered landfill","Open dumping","Other"]'::jsonb,26),
(235, 8,'H.7b','Solid Waste - Packaging Waste (generated?)',                 'boolean',FALSE,NULL,NULL,27),
(236, 8,'H.7bd','Solid Waste - Packaging Waste - Disposal Methods',          'multiselect',FALSE,NULL,
     '["Sold to another industry","Recycled on-site","Waste-to-energy","Co-processing (cement/brick kiln)","Incineration","Open burning","Licensed contractor","Engineered landfill","Open dumping","Other"]'::jsonb,28),
(237, 8,'H.7c','Solid Waste - Hazardous / Chemical Waste (generated?)',      'boolean',FALSE,NULL,NULL,29),
(238, 8,'H.7cd','Solid Waste - Hazardous Waste - Disposal Methods',          'multiselect',FALSE,NULL,
     '["Sold to another industry","Recycled on-site","Incineration","Licensed contractor","On-site secure storage","Open burning","Open dumping","Other"]'::jsonb,30),
(239, 8,'H.7e','Solid Waste - Organic / Biodegradable Waste (generated?)',   'boolean',FALSE,NULL,NULL,31),
(240, 8,'H.7ed','Solid Waste - Organic Waste - Disposal Methods',            'multiselect',FALSE,NULL,
     '["Sold to another industry","Composted on-site","Biogas generation","Waste-to-energy","Licensed contractor","Open dumping","Other"]'::jsonb,32),
(241, 8,'H.8', 'Green Practices and Circular Economy (select all that apply)','multiselect',FALSE,NULL,
     '["Eliminated use of hazardous/non-essential materials in production","Redesigned product/process to use fewer or more sustainable materials","Reduced material, water, or energy consumption per unit of output","Reused materials, components, or packaging within production","Repaired machinery/equipment rather than replacing it to extend life","Refurbished old equipment or products to bring back to working standard","Used parts from discarded products to manufacture new ones","Used waste or by-products for a different function within or outside the unit","Used recycled raw material as production input","Converted waste into energy (biogas, RDF, co-processing in kiln etc.)"]'::jsonb,33);

-- ==========================================================================
-- SECTION I: Certifications and Compliances  (section_id = 9)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(242, 9,'I.1a','Fire Safety NOC - held?',                         'boolean',FALSE,NULL,NULL, 1),
(243, 9,'I.1b','Boiler Inspection Certificate - held?',           'boolean',FALSE,NULL,NULL, 2),
(244, 9,'I.1c','Environmental NOC / Punjab EPA Permit - held?',   'boolean',FALSE,NULL,NULL, 3),
(245, 9,'I.1d','IEE / EIA Approval - held?',                     'boolean',FALSE,NULL,NULL, 4),
(246, 9,'I.2.iso9001', 'ISO 9001 - Quality Management System',               'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb, 5),
(247, 9,'I.2.iso14001','ISO 14001 - Environmental Management System',         'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb, 6),
(248, 9,'I.2.iso45001','ISO 45001 / OHSAS 18001 - Occupational Health and Safety','select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb, 7),
(249, 9,'I.2.osha',    'OSHA 10/30 - Worker and Supervisor Safety Training', 'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb, 8),
(250, 9,'I.2.iso50001','ISO 50001 - Energy Management System',                'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb, 9),
(251, 9,'I.2.sa8000',  'SA8000 - Social Accountability / Labour Standards',  'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb,10),
(252, 9,'I.2.psqca',   'PSQCA Certification Mark',                           'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb,11),
(253, 9,'I.2.gsp',     'GSP+ / REX Registration - EU Preferential Tariff',  'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb,12),
(254, 9,'I.2.ce',      'CE Marking - EU Product Conformity',                 'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb,13),
(255, 9,'I.2.bsci',    'BSCI / SMETA / SEDEX - Social Compliance Audit',    'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb,14),
(256, 9,'I.2.other',   'Other Certification - Name',                         'text',  FALSE,NULL,NULL,15),
(257, 9,'I.2.others',  'Other Certification - Status',                       'select',FALSE,NULL,'["Held","In Progress","N/A"]'::jsonb,16);

-- ==========================================================================
-- SECTION J: Strategic Business Plan  (section_id = 10)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(258,10,'J.1.prod','Operational Planning - Production Planning and Scheduling','select',FALSE,NULL,'["Formal Written Plan","Informal / Ad hoc","No Plan"]'::jsonb, 1),
(259,10,'J.1.hr',  'Operational Planning - Human Resource Planning',          'select',FALSE,NULL,'["Formal Written Plan","Informal / Ad hoc","No Plan"]'::jsonb, 2),
(260,10,'J.1.fin', 'Operational Planning - Financial / Budgetary Planning',   'select',FALSE,NULL,'["Formal Written Plan","Informal / Ad hoc","No Plan"]'::jsonb, 3),
(261,10,'J.1.mkt', 'Operational Planning - Sales and Marketing Plan',         'select',FALSE,NULL,'["Formal Written Plan","Informal / Ad hoc","No Plan"]'::jsonb, 4),
(262,10,'J.1.env', 'Operational Planning - Environmental / Sustainability Plan','select',FALSE,NULL,'["Formal Written Plan","Informal / Ad hoc","No Plan"]'::jsonb, 5),
(263,10,'J.1.exp', 'Operational Planning - Export Strategy',                  'select',FALSE,NULL,'["Formal Written Plan","Informal / Ad hoc","No Plan"]'::jsonb, 6),
(264,10,'J.2', 'Advisory Support (select all that apply)',                    'multiselect',FALSE,NULL,
     '["Business consultant","Industry or trade association","Government advisory body","Academic/research institution","No external advisory support","Other"]'::jsonb, 7),
(265,10,'J.3', 'Profit Reinvestment Strategy',                                'select',FALSE,NULL,
     '["None - profits fully withdrawn","Less than 25%","25-50%","51-75%","More than 75%"]'::jsonb, 8),
(266,10,'J.4', 'Primary Area of Reinvestment (select all that apply)',        'multiselect',FALSE,NULL,
     '["Machinery upgrade","Capacity expansion","Working capital","Debt repayment","R&D / new product development","Workforce training","Environmental compliance","Other"]'::jsonb, 9),
(267,10,'J.5', 'Upscaling Plans (select all that apply)',                     'multiselect',FALSE,NULL,
     '["Increase production volume","Improved/new product lines","Enter new domestic markets","Enter export markets for the first time","Expand into export markets","Invest in new technology","Expand physical facility","New production unit","No expansion plans currently","Other"]'::jsonb,10),
(268,10,'J.6', 'Upscaling Time Frame',                                        'select',FALSE,NULL,
     '["Within 1 year","1-2 years","2-3 years","Beyond 3 years"]'::jsonb,11),
(269,10,'J.7.fin', 'Upscaling Readiness - Funds / Capital Available (1=Not ready, 5=Fully ready)','select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,12),
(270,10,'J.7.spc', 'Upscaling Readiness - Physical Space to Accommodate Expansion',               'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,13),
(271,10,'J.7.mach','Upscaling Readiness - Machinery Capacity to Increase Output',                 'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,14),
(272,10,'J.7.lab', 'Upscaling Readiness - Skilled Workers Available or Trainable',                'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,15),
(273,10,'J.7.dem', 'Upscaling Readiness - Buyers / Demand Exists for Expanded Output',            'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,16),
(274,10,'J.7.ene', 'Upscaling Readiness - Reliable Energy to Support Higher Production',          'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,17),
(275,10,'J.7.raw', 'Upscaling Readiness - Raw Material Supplies Sufficient for Scale-up',         'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,18),
(276,10,'J.7.lic', 'Upscaling Readiness - Licenses / Approvals in Place or Obtainable',          'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,19);

-- ==========================================================================
-- SECTION K: Future Collaborations and Barriers  (section_id = 11)
-- ==========================================================================
INSERT INTO survey_questions
  (question_id, section_id, question_code, question_text, question_type, is_mandatory, validation_rule, options, sort_order)
VALUES
(277,11,'K.1', 'Future Collaboration Interests (select all that apply)',      'multiselect',FALSE,NULL,
     '["Manufacturers in same sector - Bulk procurement","Manufacturers in same sector - Shared production","Manufacturers in same sector - Technology sharing","Manufacturers in different sector - By-product/waste utilization","Manufacturers in different sector - New product development","Foreign manufacturer / firm - Technology transfer","Foreign manufacturer / firm - Joint venture","Foreign manufacturer / firm - Export partnership","Supplier / raw material producer - Long-term supply agreement","Supplier / raw material producer - Quality improvement","Buyer / distributor - Long-term offtake agreement","Buyer / distributor - Product co-development","University / R&D institution - Product development","University / R&D institution - Process improvement","Industry association / cluster - Collective bargaining","Industry association / cluster - Shared services","Not interested in any collaboration"]'::jsonb, 1),
(278,11,'K.2', 'Government Support Required (select all that apply)',         'multiselect',FALSE,NULL,
     '["Direct financial subsidy","Subsidized loan through bank","Tax exemption or rebate","Technical assistance / advisory","Infrastructure provision","Regulatory reform","Training programs","Market linkage facilitation"]'::jsonb, 2),
(279,11,'K.3.p1','Barrier - Electricity shortage / load shedding (1=Low, 5=Critical)', 'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb, 3),
(280,11,'K.3.p2','Barrier - Gas supply interruption',                         'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb, 4),
(281,11,'K.3.p3','Barrier - Raw material unavailability or price volatility', 'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb, 5),
(282,11,'K.3.p4','Barrier - Machinery breakdown / obsolete equipment',        'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb, 6),
(283,11,'K.3.p5','Barrier - Skilled labor shortage',                          'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb, 7),
(284,11,'K.3.m1','Barrier - Weak domestic demand',                            'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb, 8),
(285,11,'K.3.m2','Barrier - Competition from cheaper imports',                'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb, 9),
(286,11,'K.3.m3','Barrier - Competition from informal / unregistered producers','select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,10),
(287,11,'K.3.m4','Barrier - Inability to meet buyer quality standards',       'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,11),
(288,11,'K.3.m5','Barrier - Lack of access to export markets',                'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,12),
(289,11,'K.3.f1','Barrier - Access to credit / finance',                      'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,13),
(290,11,'K.3.f2','Barrier - High cost of machinery / technology',             'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,14),
(291,11,'K.3.f3','Barrier - High taxation or tax compliance burden',          'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,15),
(292,11,'K.3.r1','Barrier - Regulatory complexity / licensing delays',        'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,16),
(293,11,'K.3.r2','Barrier - Inadequate road / transport infrastructure',      'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,17),
(294,11,'K.3.r3','Barrier - Unavailability of industrial land / space',       'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,18),
(295,11,'K.3.r4','Barrier - Law and order / security concerns',               'select',FALSE,NULL,'["1","2","3","4","5"]'::jsonb,19),
(296,11,'K.4',  'Single Most Critical Barrier (describe in your own words)',  'text',  FALSE,NULL,NULL,20);

-- -------------------------------------------------------------------------
-- 9. SKIP / CONDITIONAL LOGIC
-- -------------------------------------------------------------------------
INSERT INTO survey_question_logic
  (logic_id, question_id, condition_question_id, condition_operator, condition_value, action)
VALUES
(1,  18,  17, '=', 'Other',               'show'),
(2,  21,  20, '=', 'Others',              'show'),
(3,  23,  22, '!=','',                    'show'),
(4,  24,  22, '!=','',                    'show'),
(5,  25,  22, '!=','',                    'show'),
(6,  29,  28, '=', 'Seasonal',            'show'),
(7,  30,  28, '=', 'Temporarily Closed',  'show'),
(8,  30,  28, '=', 'Permanently Closed',  'show'),
(9,  170, 169,'=', '40-59%',              'show'),
(10, 170, 169,'=', '60-74%',              'show'),
(11, 171, 169,'=', '40-59%',              'show'),
(12, 171, 169,'=', '60-74%',              'show'),
(13, 234, 233,'=', 'true',                'show'),
(14, 236, 235,'=', 'true',                'show'),
(15, 238, 237,'=', 'true',                'show'),
(16, 240, 239,'=', 'true',                'show'),
(17, 94,   93,'=', 'true',                'show'),
(18, 131, 130,'=', 'true',                'show'),
(19, 77,   76,'in','Others',              'show'),
(20, 257, 256,'!=','',                    'show'),
(21, 268, 267,'!=','No expansion plans currently','show'),
(22, 269, 267,'!=','No expansion plans currently','show'),
(23, 270, 267,'!=','No expansion plans currently','show'),
(24, 271, 267,'!=','No expansion plans currently','show'),
(25, 272, 267,'!=','No expansion plans currently','show'),
(26, 273, 267,'!=','No expansion plans currently','show'),
(27, 274, 267,'!=','No expansion plans currently','show'),
(28, 275, 267,'!=','No expansion plans currently','show'),
(29, 276, 267,'!=','No expansion plans currently','show')
ON CONFLICT (logic_id) DO UPDATE
  SET question_id=EXCLUDED.question_id,
      condition_question_id=EXCLUDED.condition_question_id,
      condition_operator=EXCLUDED.condition_operator,
      condition_value=EXCLUDED.condition_value,
      action=EXCLUDED.action;

-- -------------------------------------------------------------------------
-- 10. SYSTEM SETTINGS
-- -------------------------------------------------------------------------
INSERT INTO system_settings (setting_key, setting_value) VALUES
('MIN_GPS_ACCURACY_M',      '15.0'),
('DUPLICATE_CHECK_RADIUS_M','50.0')
ON CONFLICT (setting_key) DO NOTHING;
