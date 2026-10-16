BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lookup_types WHERE code = 'OWNERSHIP_TYPE') THEN
    RAISE EXCEPTION 'OWNERSHIP_TYPE lookup type is missing; run database/seed.sql first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM lookup_types WHERE code = 'LEGAL_STRUCTURE') THEN
    RAISE EXCEPTION 'LEGAL_STRUCTURE lookup type is missing; run database/seed.sql first.';
  END IF;
END $$;

UPDATE lookup_values lv
   SET is_active = false
  FROM lookup_types lt
 WHERE lt.id = lv.type_id
   AND (
     (lt.code = 'OWNERSHIP_TYPE' AND lv.code NOT IN (
       'STATE_PUBLIC',
       'PRIVATELY_OWNED',
       'FOREIGN_CONTROLLED',
       'OTHER'
     ))
     OR
     (lt.code = 'LEGAL_STRUCTURE' AND lv.code NOT IN (
       'SOLE_PROPRIETORSHIP',
       'PARTNERSHIP',
       'PRIVATE_LIMITED_COMPANY',
       'PUBLIC_LIMITED_COMPANY',
       'COOPERATIVE_SOCIETY',
       'LIMITED_LIABILITY_COMPANY',
       'OTHER'
     ))
   );

INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
SELECT t.id, v.code, v.label, v.requires_text, v.sort_order, true
  FROM lookup_types t
 CROSS JOIN (VALUES
   ('OWNERSHIP_TYPE', 'STATE_PUBLIC', '1. State owned/Public Sector', false, 1),
   ('OWNERSHIP_TYPE', 'PRIVATELY_OWNED', '2. Privately Owned', false, 2),
   ('OWNERSHIP_TYPE', 'FOREIGN_CONTROLLED', '3. Foreign Controlled Enterprise', false, 3),
   ('OWNERSHIP_TYPE', 'OTHER', '4. Other, if any', true, 4),
   ('LEGAL_STRUCTURE', 'SOLE_PROPRIETORSHIP', '1. Sole Proprietorship', false, 1),
   ('LEGAL_STRUCTURE', 'PARTNERSHIP', '2. Partnership', false, 2),
   ('LEGAL_STRUCTURE', 'PRIVATE_LIMITED_COMPANY', '3. Private Limited Company', false, 3),
   ('LEGAL_STRUCTURE', 'PUBLIC_LIMITED_COMPANY', '4. Public Limited Company', false, 4),
   ('LEGAL_STRUCTURE', 'COOPERATIVE_SOCIETY', '5. Cooperative / Society', false, 5),
   ('LEGAL_STRUCTURE', 'LIMITED_LIABILITY_COMPANY', '6. Limited Liability Company', false, 6),
   ('LEGAL_STRUCTURE', 'OTHER', '7. Others specify', true, 7)
 ) AS v(type_code, code, label, requires_text, sort_order)
 WHERE t.code = v.type_code
ON CONFLICT (type_id, code) DO UPDATE
   SET label = EXCLUDED.label,
       requires_text = EXCLUDED.requires_text,
       sort_order = EXCLUDED.sort_order,
       is_active = true;

COMMIT;
