BEGIN;

INSERT INTO measurement_units (code, name, unit_kind) VALUES
  ('ACRE', 'Acre', 'AREA'),
  ('KG', 'Kilogram', 'QUANTITY'),
  ('L', 'Liter', 'QUANTITY'),
  ('TON', 'Ton', 'QUANTITY')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      unit_kind = EXCLUDED.unit_kind;

COMMIT;
