-- Workplan 2 Phase 6: Section E choices and Section F matrix defaults.
-- Re-runnable; existing lookup IDs and historical response rows are retained.

BEGIN;

DO $$
DECLARE missing_types text;
BEGIN
  SELECT string_agg(required.code, ', ' ORDER BY required.code)
    INTO missing_types
    FROM (VALUES
      ('RELIABILITY_BAND'), ('ACCEPTANCE_BAND'), ('STRENGTH_SCALE'), ('ACTIVITY_STATUS')
    ) AS required(code)
   WHERE NOT EXISTS (SELECT 1 FROM lookup_types lt WHERE lt.code = required.code);

  IF missing_types IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required Section E/F lookup types: %', missing_types;
  END IF;
END $$;

WITH required(type_code, value_code, label, preferred_order) AS (
  VALUES
    ('RELIABILITY_BAND', 'NOT_FORMALLY_TRACKED', 'Not Formally Tracked', 5),
    ('ACCEPTANCE_BAND', 'NOT_FORMALLY_TRACKED', 'Not Formally Tracked', 5),
    ('STRENGTH_SCALE', 'DK_NA', 'Don''t Know / NA', 4),
    ('ACTIVITY_STATUS', 'NA', 'NA', 3)
)
INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
SELECT lt.id, required.value_code, required.label, false,
       GREATEST(
         required.preferred_order,
         COALESCE((SELECT MAX(existing.sort_order) FROM lookup_values existing WHERE existing.type_id = lt.id), 0) + 1
       )::smallint,
       true
  FROM required
  JOIN lookup_types lt ON lt.code = required.type_code
ON CONFLICT (type_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  requires_text = false,
  is_active = true;

COMMIT;

-- Owner verification: all four rows should exist and be active.
SELECT lt.code AS lookup_type, lv.id, lv.code, lv.label, lv.is_active
  FROM lookup_types lt
  LEFT JOIN lookup_values lv ON lv.type_id = lt.id AND (
       (lt.code IN ('RELIABILITY_BAND', 'ACCEPTANCE_BAND') AND lv.code = 'NOT_FORMALLY_TRACKED')
    OR (lt.code = 'STRENGTH_SCALE' AND lv.code = 'DK_NA')
    OR (lt.code = 'ACTIVITY_STATUS' AND lv.code = 'NA')
  )
 WHERE lt.code IN ('RELIABILITY_BAND', 'ACCEPTANCE_BAND', 'STRENGTH_SCALE', 'ACTIVITY_STATUS')
 ORDER BY lt.code;

-- Owner verification: every configured F matrix row must have its active default.
SELECT q.question_code, COUNT(mi.id) AS matrix_rows,
       COUNT(lv.id) FILTER (WHERE lv.is_active) AS rows_with_active_default
  FROM survey_questions q
  LEFT JOIN matrix_items mi ON mi.question_id = q.id
  LEFT JOIN lookup_values lv ON lv.type_id = mi.scale_type_id
   AND lv.code = CASE q.question_code
     WHEN 'F_STRENGTH_VS_COMPETITORS' THEN 'DK_NA'
     WHEN 'F_DIGITAL_PRESENCE' THEN 'NA'
   END
 WHERE q.question_code IN ('F_STRENGTH_VS_COMPETITORS', 'F_DIGITAL_PRESENCE')
 GROUP BY q.question_code
 ORDER BY q.question_code;
