BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lookup_types WHERE code = 'ZONE_TYPE') THEN
    RAISE EXCEPTION 'ZONE_TYPE lookup type is missing; run database/seed.sql first.';
  END IF;
END $$;

UPDATE lookup_values
   SET is_active = false
 WHERE type_id = (SELECT id FROM lookup_types WHERE code = 'ZONE_TYPE')
   AND code NOT IN (
     'INDUSTRIAL_AREA',
     'RESIDENTIAL_AREA',
     'COMMERCIAL_AREA',
     'RURAL_AGRICULTURAL',
     'SEZ_INDUSTRIAL_ESTATE',
     'OTHER'
   );

INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
SELECT t.id, v.code, v.label, v.requires_text, v.sort_order, true
  FROM lookup_types t
 CROSS JOIN (VALUES
   ('INDUSTRIAL_AREA', '1. Industrial Area', false, 1),
   ('RESIDENTIAL_AREA', '2. Residential Area', false, 2),
   ('COMMERCIAL_AREA', '3. Commercial Area', false, 3),
   ('RURAL_AGRICULTURAL', '4. Rural / Agricultural', false, 4),
   ('SEZ_INDUSTRIAL_ESTATE', '5. Special Economic Zone / Industrial Estate', false, 5),
   ('OTHER', '6. Other (specify)', true, 6)
 ) AS v(code, label, requires_text, sort_order)
 WHERE t.code = 'ZONE_TYPE'
ON CONFLICT (type_id, code) DO UPDATE
   SET label = EXCLUDED.label,
       requires_text = EXCLUDED.requires_text,
       sort_order = EXCLUDED.sort_order,
       is_active = true;

COMMIT;
