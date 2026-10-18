BEGIN;

ALTER TABLE industrial_units
  ADD COLUMN IF NOT EXISTS unit_type_id integer REFERENCES lookup_values(id),
  ADD COLUMN IF NOT EXISTS unit_type_other_text text;

INSERT INTO lookup_types (code, name)
VALUES ('UNIT_TYPE', 'Type of Unit')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS unit_type_psic_classes (
  unit_type_id integer NOT NULL REFERENCES lookup_values(id),
  psic_class_id integer NOT NULL REFERENCES psic_classes(id),
  PRIMARY KEY (unit_type_id, psic_class_id)
);

CREATE TEMP TABLE phase7_industries (
  sort_order smallint PRIMARY KEY,
  code text NOT NULL,
  label text NOT NULL,
  class_codes text[] NOT NULL
) ON COMMIT DROP;

INSERT INTO phase7_industries VALUES
  (1,'SUGAR_MILL','Sugar Mill',ARRAY['1072']),
  (2,'TEXTILE','Textile',ARRAY['1311','1312','1313']),
  (3,'GARMENTS','Garments',ARRAY['1410','1430']),
  (4,'LEATHER','Leather',ARRAY['1511']),
  (5,'SHOES','Shoes',ARRAY['1520']),
  (6,'RICE_MILL','Rice Mill',ARRAY['0112','1061']),
  (7,'FLOUR_MILL','Flour Mill',ARRAY['1061']),
  (8,'OIL_GHEE','Oil/Ghee',ARRAY['1040']),
  (9,'DAIRY','Dairy',ARRAY['1050']),
  (10,'FOOD_PROCESSING','Food Processing',ARRAY['1030','1075','1079']),
  (11,'BEVERAGES','Beverages',ARRAY['1101','1102','1103','1104']),
  (12,'MINERAL_WATER','Mineral Water',ARRAY['1104']),
  (13,'PHARMACEUTICAL','Pharmaceutical',ARRAY['2100']),
  (14,'CHEMICAL','Chemical',ARRAY['2011','2029']),
  (15,'FERTILIZER','Fertilizer',ARRAY['2012']),
  (16,'PAINT','Paint',ARRAY['2022']),
  (17,'PLASTIC','Plastic',ARRAY['2220']),
  (18,'PVC','PVC',ARRAY['2013','2220']),
  (19,'RUBBER','Rubber',ARRAY['2219']),
  (20,'TYRE','Tyre',ARRAY['2211']),
  (21,'PAPER_MILL','Paper Mill',ARRAY['1701']),
  (22,'BOARD_CARDBOARD','Board/Cardboard',ARRAY['1702']),
  (23,'PRINTING','Printing',ARRAY['1811','1812']),
  (24,'STEEL','Steel',ARRAY['2410']),
  (25,'FOUNDRY','Foundry',ARRAY['2431','2432']),
  (26,'ENGINEERING','Engineering',ARRAY['2511','2819','2829']),
  (27,'AUTO_PARTS','Auto Parts',ARRAY['2930']),
  (28,'AUTOMOBILE','Automobile',ARRAY['2910']),
  (29,'ELECTRICAL_EQUIPMENT','Electrical Equipment',ARRAY['2710','2790']),
  (30,'CABLE_INDUSTRY','Cable Industry',ARRAY['2731','2732','2733']),
  (31,'GLASS','Glass',ARRAY['2310']),
  (32,'CERAMIC','Ceramic',ARRAY['2391','2392','2393']),
  (33,'CEMENT','Cement',ARRAY['2394']),
  (34,'BRICK','Brick',ARRAY['2392']),
  (35,'MARBLE_STONE','Marble/Stone',ARRAY['2396']),
  (36,'FURNITURE','Furniture',ARRAY['3100']),
  (37,'WOOD','Wood',ARRAY['1610','1629']),
  (38,'MATCH','Match',ARRAY['1629']),
  (39,'SOAP','Soap',ARRAY['2023']),
  (40,'DETERGENT','Detergent',ARRAY['2023']),
  (41,'ANIMAL_FEED','Animal Feed',ARRAY['1080']),
  (42,'POULTRY_PROCESSING','Poultry Processing',ARRAY['1010']),
  (43,'MEAT_PROCESSING','Meat Processing',ARRAY['1010']),
  (44,'COLD_STORAGE','Cold Storage',ARRAY['5210']),
  (45,'FRUIT_PROCESSING','Fruit Processing',ARRAY['1030']),
  (46,'VEGETABLE_PROCESSING','Vegetable Processing',ARRAY['1030']),
  (47,'BISCUIT_BAKERY','Biscuit/Bakery',ARRAY['1071']),
  (48,'CONFECTIONERY','Confectionery',ARRAY['1073']),
  (49,'MINERAL_MINING','Mineral/Mining',ARRAY['0729','0810','0899']),
  (50,'COAL','Coal',ARRAY['0510','0520']),
  (51,'PLASTIC_RECYCLING','Plastic Recycling',ARRAY['3830']),
  (52,'BATTERY','Battery',ARRAY['2720']),
  (53,'SOLAR_PANEL','Solar Panel',ARRAY['2610','2790']),
  (54,'ELECTRONICS','Electronics',ARRAY['2610','2640']),
  (55,'PACKAGING','Packaging',ARRAY['1702','2220','2599']),
  (56,'PAINT_CHEMICAL','Paint & Chemical',ARRAY['2011','2022']),
  (57,'LPG_GAS','LPG/Gas',ARRAY['0620','3520']),
  (58,'WATER_TREATMENT','Water Treatment',ARRAY['3600']),
  (59,'POWER_PLANT','Power Plant',ARRAY['3510']),
  (60,'CONSTRUCTION_MATERIAL','Construction Material',ARRAY['2310','2392','2395','2399']),
  (61,'OTHER','Other (specify)',ARRAY['9609']);

DO $$
DECLARE missing_codes text;
BEGIN
  SELECT string_agg(expected.code, ', ' ORDER BY expected.code) INTO missing_codes
    FROM (SELECT DISTINCT unnest(class_codes) AS code FROM phase7_industries) expected
    LEFT JOIN psic_classes c ON c.code = expected.code
   WHERE c.id IS NULL;
  IF missing_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Missing PSIC reference classes: %. Load the PSIC reference data first.', missing_codes;
  END IF;
END $$;

INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
SELECT t.id, i.code, i.label, i.code = 'OTHER', i.sort_order, true
  FROM phase7_industries i CROSS JOIN lookup_types t
 WHERE t.code = 'UNIT_TYPE'
ON CONFLICT (type_id, code) DO UPDATE
  SET label = EXCLUDED.label, requires_text = EXCLUDED.requires_text,
      sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO unit_type_psic_classes (unit_type_id, psic_class_id)
SELECT v.id, c.id
  FROM phase7_industries i
  JOIN lookup_types t ON t.code = 'UNIT_TYPE'
  JOIN lookup_values v ON v.type_id = t.id AND v.code = i.code
  JOIN psic_classes c ON c.code = ANY(i.class_codes)
ON CONFLICT DO NOTHING;

DO $$
DECLARE section_id_value integer;
BEGIN
  SELECT s.id INTO section_id_value
    FROM survey_sections s JOIN survey_forms f ON f.id = s.form_id
   WHERE f.is_active = true AND s.section_code = 'A'
   ORDER BY f.version DESC, f.id DESC LIMIT 1;
  IF section_id_value IS NULL THEN
    RAISE EXCEPTION 'No active form with Section A exists.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM survey_questions WHERE question_code = 'A_UNIT_TYPE') THEN
    UPDATE survey_questions
       SET question_no = CASE lower(question_no)
         WHEN 'vii' THEN 'viii' WHEN 'viii' THEN 'ix' WHEN 'ix' THEN 'x'
         WHEN 'x' THEN 'xi' WHEN 'xi' THEN 'xii' WHEN 'xii' THEN 'xiii'
         WHEN 'xiii' THEN 'xiv' WHEN 'xiv' THEN 'xv' ELSE question_no END
     WHERE section_id = section_id_value;
  END IF;
  INSERT INTO survey_questions
    (section_id, question_code, question_no, question_text, answer_type, lookup_type_id, is_required, stored_in)
  SELECT section_id_value, 'A_UNIT_TYPE', 'vii', 'Type of Unit', 'SINGLE_CHOICE', id, true, 'industrial_units.unit_type_id'
    FROM lookup_types WHERE code = 'UNIT_TYPE'
  ON CONFLICT (question_code) DO UPDATE
    SET section_id = EXCLUDED.section_id, question_no = 'vii', lookup_type_id = EXCLUDED.lookup_type_id,
        answer_type = 'SINGLE_CHOICE', is_required = true, stored_in = EXCLUDED.stored_in;
  UPDATE survey_questions SET question_text = 'PSIC class', is_required = true
   WHERE section_id = section_id_value AND question_code = 'A_PSIC';
END $$;

COMMIT;

SELECT v.label, c.code AS psic_code, c.name AS psic_class
  FROM unit_type_psic_classes m
  JOIN lookup_values v ON v.id = m.unit_type_id
  JOIN psic_classes c ON c.id = m.psic_class_id
 ORDER BY v.sort_order, c.code;