BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lookup_types WHERE code = 'SKILL_LEVEL') THEN
    RAISE EXCEPTION 'SKILL_LEVEL lookup type is missing; run database/seed.sql first.';
  END IF;
END $$;

UPDATE lookup_values lv
   SET label = v.label,
       sort_order = v.sort_order,
       is_active = true
  FROM lookup_types lt,
       (VALUES
         ('MANAGER', 'Managers (Important decision makers)', 1),
         ('SKILLED', 'Skilled/Technical workers (in production, accounts)', 2),
         ('SEMI_SKILLED', 'Semi-skilled workers', 3),
         ('UNSKILLED', 'Unskilled Workers (low level staff)', 4),
         ('ADMIN_SUPPORT', 'Administrative/Supporting Staff', 5)
       ) AS v(code, label, sort_order)
 WHERE lt.id = lv.type_id
   AND lt.code = 'SKILL_LEVEL'
   AND lv.code = v.code;

DO $$
BEGIN
  IF (SELECT count(*) FROM lookup_values lv
       JOIN lookup_types lt ON lt.id = lv.type_id
      WHERE lt.code = 'SKILL_LEVEL'
        AND lv.is_active) <> 5 THEN
    RAISE EXCEPTION 'Expected exactly five active SKILL_LEVEL options after updating the labels.';
  END IF;
END $$;

COMMIT;
