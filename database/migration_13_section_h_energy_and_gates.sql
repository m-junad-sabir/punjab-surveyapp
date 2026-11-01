-- Workplan 2 Phase 8: Section H energy-source units and applicability gates.
-- Existing response rows and matrix answers are retained; legacy gate values remain NULL.

BEGIN;

ALTER TABLE sec_h_environment
  ADD COLUMN IF NOT EXISTS has_water_waste_management boolean,
  ADD COLUMN IF NOT EXISTS has_solid_waste_generation boolean,
  ADD COLUMN IF NOT EXISTS has_green_practices boolean;

CREATE TABLE IF NOT EXISTS energy_source_units (
  energy_source_id integer NOT NULL REFERENCES lookup_values(id),
  unit_id integer NOT NULL REFERENCES measurement_units(id),
  PRIMARY KEY (energy_source_id, unit_id)
);

INSERT INTO measurement_units (code, name, unit_kind) VALUES
  ('KG', 'Kilogram', 'QUANTITY'),
  ('L', 'Liter', 'QUANTITY'),
  ('TON', 'Ton', 'QUANTITY'),
  ('KWH', 'Kilowatt-hour', 'ENERGY')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      unit_kind = EXCLUDED.unit_kind;

INSERT INTO energy_source_units (energy_source_id, unit_id)
SELECT source.id, unit.id
  FROM (VALUES
    ('GRID', 'KWH'),
    ('DIESEL', 'L'),
    ('GAS', 'KG'),
    ('NATURAL_GAS_PROCESS', 'KG'),
    ('COAL', 'TON'),
    ('FURNACE_OIL', 'L'),
    ('SOLAR', 'KWH'),
    ('BIOMASS', 'TON'),
    ('OTHER', 'KWH'),
    ('OTHER', 'L'),
    ('OTHER', 'KG'),
    ('OTHER', 'TON')
  ) mapping(source_code, unit_code)
  JOIN lookup_values source
    ON source.code = mapping.source_code
   AND source.type_id = (SELECT id FROM lookup_types WHERE code = 'ENERGY_SOURCE')
  JOIN measurement_units unit ON unit.code = mapping.unit_code
ON CONFLICT (energy_source_id, unit_id) DO NOTHING;

UPDATE survey_questions
   SET question_no = CASE question_code
       WHEN 'H_WATER_WASTE_DISPOSAL' THEN 'vi(a)'
       WHEN 'H_SOLID_WASTE' THEN 'vii(a)'
       WHEN 'H_GREEN_PRACTICES' THEN 'viii(a)'
       ELSE question_no
     END,
       question_text = CASE question_code
       WHEN 'H_WATER_WASTE_DISPOSAL' THEN 'Water waste management details'
       ELSE question_text
     END
 WHERE question_code IN ('H_WATER_WASTE_DISPOSAL', 'H_SOLID_WASTE', 'H_GREEN_PRACTICES');

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type,
   lookup_type_id, is_required, stored_in)
SELECT section_id, 'H_WATER_WASTE_GATE', 'vi',
       'Does the establishment manage wastewater?', 'YES_NO', NULL, true,
       'sec_h_environment.has_water_waste_management'
  FROM survey_questions
 WHERE question_code = 'H_WATER_WASTE_DISPOSAL'
ON CONFLICT (question_code) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_no = EXCLUDED.question_no,
  question_text = EXCLUDED.question_text,
  answer_type = EXCLUDED.answer_type,
  lookup_type_id = NULL,
  is_required = true,
  stored_in = EXCLUDED.stored_in;

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type,
   lookup_type_id, is_required, stored_in)
SELECT section_id, 'H_SOLID_WASTE_GATE', 'vii',
       'Does the establishment generate solid waste or by-products?', 'YES_NO', NULL, true,
       'sec_h_environment.has_solid_waste_generation'
  FROM survey_questions
 WHERE question_code = 'H_SOLID_WASTE'
ON CONFLICT (question_code) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_no = EXCLUDED.question_no,
  question_text = EXCLUDED.question_text,
  answer_type = EXCLUDED.answer_type,
  lookup_type_id = NULL,
  is_required = true,
  stored_in = EXCLUDED.stored_in;

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type,
   lookup_type_id, is_required, stored_in)
SELECT section_id, 'H_GREEN_PRACTICES_GATE', 'viii',
       'Does the establishment have green practices or circular-economy activities?',
       'YES_NO', NULL, true, 'sec_h_environment.has_green_practices'
  FROM survey_questions
 WHERE question_code = 'H_GREEN_PRACTICES'
ON CONFLICT (question_code) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_no = EXCLUDED.question_no,
  question_text = EXCLUDED.question_text,
  answer_type = EXCLUDED.answer_type,
  lookup_type_id = NULL,
  is_required = true,
  stored_in = EXCLUDED.stored_in;

COMMIT;

-- Owner verification (run separately after backup and review):
-- SELECT source.code, unit.code
--   FROM energy_source_units mapping
--   JOIN lookup_values source ON source.id = mapping.energy_source_id
--   JOIN lookup_types source_type ON source_type.id = source.type_id
--   JOIN measurement_units unit ON unit.id = mapping.unit_id
--  WHERE source_type.code = 'ENERGY_SOURCE'
--  ORDER BY source.sort_order, unit.name;
-- SELECT question_code, question_no, answer_type, stored_in
--   FROM survey_questions
--  WHERE question_code LIKE 'H\_%' ESCAPE '\'
--  ORDER BY question_no;
