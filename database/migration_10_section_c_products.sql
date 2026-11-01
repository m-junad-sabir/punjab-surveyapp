-- Workplan 2 Phase 4: approved product units and industry-specific product lists.
-- Re-runnable; historical products and transformation stages are not removed.

BEGIN;

CREATE TABLE IF NOT EXISTS product_measurement_units (
  unit_id integer PRIMARY KEY REFERENCES measurement_units(id),
  display_label text NOT NULL,
  sort_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  product_only boolean NOT NULL DEFAULT false
);

CREATE TEMP TABLE phase4_product_unit_seed (
  code varchar(20) PRIMARY KEY,
  name varchar(60) NOT NULL,
  unit_kind varchar(20) NOT NULL,
  display_label text NOT NULL,
  sort_order smallint NOT NULL
) ON COMMIT DROP;

INSERT INTO phase4_product_unit_seed VALUES
  ('PC', 'Piece', 'QUANTITY', 'Piece (pc)', 1),
  ('UNIT', 'Unit', 'QUANTITY', 'Unit', 2),
  ('KG', 'Kilogram', 'QUANTITY', 'Kilogram (kg)', 3),
  ('TONNE', 'Metric tonne', 'QUANTITY', 'Metric tonne (t)', 4),
  ('G', 'Gram', 'QUANTITY', 'Gram (g)', 5),
  ('L', 'Litre', 'QUANTITY', 'Litre (L)', 6),
  ('ML', 'Millilitre', 'QUANTITY', 'Millilitre (mL)', 7),
  ('M3', 'Cubic metre', 'QUANTITY', U&'Cubic metre (m\00B3)', 8),
  ('M', 'Metre', 'QUANTITY', 'Metre (m)', 9),
  ('SQM', 'Square metre', 'AREA', U&'Square metre (m\00B2)', 10),
  ('SQFT', 'Square foot', 'AREA', U&'Square foot (ft\00B2)', 11),
  ('ROLL', 'Roll', 'QUANTITY', 'Roll', 12),
  ('SHEET', 'Sheet', 'QUANTITY', 'Sheet', 13),
  ('SET', 'Set', 'QUANTITY', 'Set', 14),
  ('PACK', 'Pack / Packet', 'QUANTITY', 'Pack / Packet', 15);

DO $$
DECLARE incompatible_codes text;
BEGIN
  SELECT string_agg(s.code, ', ' ORDER BY s.code) INTO incompatible_codes
    FROM phase4_product_unit_seed s
    JOIN measurement_units m ON m.code = s.code
   WHERE m.unit_kind <> s.unit_kind;
  IF incompatible_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Existing product unit codes have incompatible kinds: %', incompatible_codes;
  END IF;
END $$;

CREATE TEMP TABLE phase4_new_product_units (code varchar(20) PRIMARY KEY) ON COMMIT DROP;
INSERT INTO phase4_new_product_units (code)
SELECT s.code FROM phase4_product_unit_seed s
 WHERE NOT EXISTS (SELECT 1 FROM measurement_units m WHERE m.code = s.code);

INSERT INTO measurement_units (code, name, unit_kind)
SELECT code, name, unit_kind FROM phase4_product_unit_seed ORDER BY sort_order
ON CONFLICT (code) DO NOTHING;

INSERT INTO product_measurement_units (unit_id, display_label, sort_order, is_active, product_only)
SELECT m.id, s.display_label, s.sort_order, true, n.code IS NOT NULL
  FROM phase4_product_unit_seed s
  JOIN measurement_units m ON m.code = s.code
  LEFT JOIN phase4_new_product_units n ON n.code = s.code
ON CONFLICT (unit_id) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS industry_product_options (
  id serial PRIMARY KEY CHECK (id > 0),
  unit_type_id integer NOT NULL REFERENCES lookup_values(id),
  product_kind varchar(10) NOT NULL CHECK (product_kind IN ('MAIN','SECONDARY')),
  product_name text NOT NULL,
  sort_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (unit_type_id, product_kind, product_name)
);

CREATE INDEX IF NOT EXISTS idx_industry_product_options_lookup
  ON industry_product_options (unit_type_id, product_kind, sort_order);

CREATE TEMP TABLE phase4_product_seed (
  unit_type_code text NOT NULL,
  product_kind varchar(10) NOT NULL,
  product_name text NOT NULL,
  sort_order smallint NOT NULL,
  PRIMARY KEY (unit_type_code, product_kind, product_name)
) ON COMMIT DROP;

INSERT INTO phase4_product_seed (unit_type_code, product_kind, product_name, sort_order) VALUES
  ('SUGAR_MILL', 'MAIN', 'Sugar', 1),
  ('TEXTILE', 'MAIN', 'Yarn', 1),
  ('TEXTILE', 'MAIN', 'Fabric', 2),
  ('GARMENTS', 'MAIN', 'Garments', 1),
  ('LEATHER', 'MAIN', 'Finished Leather', 1),
  ('SHOES', 'MAIN', 'Footwear', 1),
  ('RICE_MILL', 'MAIN', 'Rice', 1),
  ('FLOUR_MILL', 'MAIN', 'Flour', 1),
  ('OIL_GHEE', 'MAIN', 'Edible Oil/Ghee', 1),
  ('DAIRY', 'MAIN', 'Milk', 1),
  ('DAIRY', 'MAIN', 'Yogurt', 2),
  ('DAIRY', 'MAIN', 'Cream', 3),
  ('DAIRY', 'MAIN', 'Butter', 4),
  ('FOOD_PROCESSING', 'MAIN', 'Processed Food', 1),
  ('BEVERAGES', 'MAIN', 'Soft Drinks/Juice', 1),
  ('MINERAL_WATER', 'MAIN', 'Bottled Water', 1),
  ('PHARMACEUTICAL', 'MAIN', 'Tablets', 1),
  ('PHARMACEUTICAL', 'MAIN', 'Capsules', 2),
  ('PHARMACEUTICAL', 'MAIN', 'Syrups', 3),
  ('CHEMICAL', 'MAIN', 'Chemical Products', 1),
  ('FERTILIZER', 'MAIN', 'Urea', 1),
  ('FERTILIZER', 'MAIN', 'DAP', 2),
  ('FERTILIZER', 'MAIN', 'NPK', 3),
  ('PAINT', 'MAIN', 'Paints/Coatings', 1),
  ('PLASTIC', 'MAIN', 'Plastic Products', 1),
  ('PVC', 'MAIN', 'PVC Pipes', 1),
  ('PVC', 'MAIN', 'PVC Profiles', 2),
  ('RUBBER', 'MAIN', 'Rubber Products', 1),
  ('TYRE', 'MAIN', 'Tyres', 1),
  ('PAPER_MILL', 'MAIN', 'Paper', 1),
  ('BOARD_CARDBOARD', 'MAIN', 'Corrugated Board', 1),
  ('BOARD_CARDBOARD', 'MAIN', 'Boxes', 2),
  ('PRINTING', 'MAIN', 'Printed Material', 1),
  ('PRINTING', 'MAIN', 'Books', 2),
  ('STEEL', 'MAIN', 'Billets', 1),
  ('STEEL', 'MAIN', 'Bars', 2),
  ('STEEL', 'MAIN', 'Sections', 3),
  ('FOUNDRY', 'MAIN', 'Castings', 1),
  ('ENGINEERING', 'MAIN', 'Machined Parts', 1),
  ('AUTO_PARTS', 'MAIN', 'Auto Components', 1),
  ('AUTOMOBILE', 'MAIN', 'Vehicles', 1),
  ('ELECTRICAL_EQUIPMENT', 'MAIN', 'Transformers', 1),
  ('ELECTRICAL_EQUIPMENT', 'MAIN', 'Motors', 2),
  ('ELECTRICAL_EQUIPMENT', 'MAIN', 'Switchgear', 3),
  ('CABLE_INDUSTRY', 'MAIN', 'Electrical Cables', 1),
  ('CABLE_INDUSTRY', 'MAIN', 'Wires', 2),
  ('GLASS', 'MAIN', 'Glass Bottles', 1),
  ('GLASS', 'MAIN', 'Glass Sheets', 2),
  ('CERAMIC', 'MAIN', 'Tiles', 1),
  ('CERAMIC', 'MAIN', 'Sanitaryware', 2),
  ('CEMENT', 'MAIN', 'Cement', 1),
  ('BRICK', 'MAIN', 'Bricks', 1),
  ('MARBLE_STONE', 'MAIN', 'Marble Slabs', 1),
  ('MARBLE_STONE', 'MAIN', 'Granite Slabs', 2),
  ('FURNITURE', 'MAIN', 'Furniture', 1),
  ('WOOD', 'MAIN', 'Timber', 1),
  ('WOOD', 'MAIN', 'Sawn Wood', 2),
  ('MATCH', 'MAIN', 'Matches', 1),
  ('SOAP', 'MAIN', 'Soap Bars', 1),
  ('SOAP', 'MAIN', 'Liquid Soap', 2),
  ('DETERGENT', 'MAIN', 'Detergent Powder', 1),
  ('DETERGENT', 'MAIN', 'Liquid Detergent', 2),
  ('ANIMAL_FEED', 'MAIN', 'Animal Feed', 1),
  ('ANIMAL_FEED', 'MAIN', 'Pellets', 2),
  ('POULTRY_PROCESSING', 'MAIN', 'Dressed Chicken', 1),
  ('MEAT_PROCESSING', 'MAIN', 'Processed Meat', 1),
  ('COLD_STORAGE', 'MAIN', 'Stored Products', 1),
  ('COLD_STORAGE', 'MAIN', 'Storage Service', 2),
  ('FRUIT_PROCESSING', 'MAIN', 'Juice', 1),
  ('FRUIT_PROCESSING', 'MAIN', 'Pulp', 2),
  ('FRUIT_PROCESSING', 'MAIN', 'Puree', 3),
  ('FRUIT_PROCESSING', 'MAIN', 'Jam', 4),
  ('VEGETABLE_PROCESSING', 'MAIN', 'Frozen Vegetables', 1),
  ('VEGETABLE_PROCESSING', 'MAIN', 'Canned Vegetables', 2),
  ('BISCUIT_BAKERY', 'MAIN', 'Biscuits', 1),
  ('BISCUIT_BAKERY', 'MAIN', 'Bread', 2),
  ('BISCUIT_BAKERY', 'MAIN', 'Cakes', 3),
  ('CONFECTIONERY', 'MAIN', 'Candy', 1),
  ('CONFECTIONERY', 'MAIN', 'Chocolate', 2),
  ('CONFECTIONERY', 'MAIN', 'Toffee', 3),
  ('MINERAL_MINING', 'MAIN', 'Minerals', 1),
  ('MINERAL_MINING', 'MAIN', 'Ore', 2),
  ('MINERAL_MINING', 'MAIN', 'Aggregates', 3),
  ('COAL', 'MAIN', 'Sized Coal', 1),
  ('PLASTIC_RECYCLING', 'MAIN', 'Recycled Plastic Pellets', 1),
  ('PLASTIC_RECYCLING', 'MAIN', 'Recycled Plastic Flakes', 2),
  ('BATTERY', 'MAIN', 'Lead-Acid Batteries', 1),
  ('SOLAR_PANEL', 'MAIN', 'Solar PV Modules', 1),
  ('ELECTRONICS', 'MAIN', 'PCB', 1),
  ('ELECTRONICS', 'MAIN', 'Electronic Assemblies', 2),
  ('PACKAGING', 'MAIN', 'Bags', 1),
  ('PACKAGING', 'MAIN', 'Pouches', 2),
  ('PACKAGING', 'MAIN', 'Packaging Material', 3),
  ('PAINT_CHEMICAL', 'MAIN', 'Paint', 1),
  ('PAINT_CHEMICAL', 'MAIN', 'Chemical Products', 2),
  ('LPG_GAS', 'MAIN', 'Filled LPG Cylinders', 1),
  ('WATER_TREATMENT', 'MAIN', 'Treated Water', 1),
  ('POWER_PLANT', 'MAIN', 'Electricity', 1),
  ('CONSTRUCTION_MATERIAL', 'MAIN', 'Concrete', 1),
  ('CONSTRUCTION_MATERIAL', 'MAIN', 'Asphalt', 2),
  ('CONSTRUCTION_MATERIAL', 'MAIN', 'Aggregates', 3),
  ('SUGAR_MILL', 'SECONDARY', 'Molasses', 1),
  ('SUGAR_MILL', 'SECONDARY', 'Bagasse', 2),
  ('SUGAR_MILL', 'SECONDARY', 'Press Mud', 3),
  ('TEXTILE', 'SECONDARY', 'Yarn Waste', 1),
  ('TEXTILE', 'SECONDARY', 'Fabric Scraps', 2),
  ('TEXTILE', 'SECONDARY', 'Cotton Waste', 3),
  ('GARMENTS', 'SECONDARY', 'Fabric Scraps', 1),
  ('GARMENTS', 'SECONDARY', 'Cutting Waste', 2),
  ('GARMENTS', 'SECONDARY', 'Thread Waste', 3),
  ('LEATHER', 'SECONDARY', 'Leather Scrap', 1),
  ('LEATHER', 'SECONDARY', 'Leather Trimmings', 2),
  ('LEATHER', 'SECONDARY', 'Leather Dust', 3),
  ('SHOES', 'SECONDARY', 'Leather Scrap', 1),
  ('SHOES', 'SECONDARY', 'EVA Scrap', 2),
  ('SHOES', 'SECONDARY', 'PU Scrap', 3),
  ('SHOES', 'SECONDARY', 'Rubber Scrap', 4),
  ('RICE_MILL', 'SECONDARY', 'Rice Bran', 1),
  ('RICE_MILL', 'SECONDARY', 'Rice Husk', 2),
  ('RICE_MILL', 'SECONDARY', 'Broken Rice', 3),
  ('FLOUR_MILL', 'SECONDARY', 'Bran/Chokar', 1),
  ('FLOUR_MILL', 'SECONDARY', 'Wheat Germ', 2),
  ('FLOUR_MILL', 'SECONDARY', 'Screening Waste', 3),
  ('OIL_GHEE', 'SECONDARY', 'Oil Cake/Meal', 1),
  ('OIL_GHEE', 'SECONDARY', 'Soap Stock', 2),
  ('OIL_GHEE', 'SECONDARY', 'Fatty Acid', 3),
  ('OIL_GHEE', 'SECONDARY', 'Acid Oil', 4),
  ('DAIRY', 'SECONDARY', 'Whey', 1),
  ('DAIRY', 'SECONDARY', 'Cream', 2),
  ('DAIRY', 'SECONDARY', 'Butter', 3),
  ('DAIRY', 'SECONDARY', 'Skim Milk', 4),
  ('FOOD_PROCESSING', 'SECONDARY', 'Peels', 1),
  ('FOOD_PROCESSING', 'SECONDARY', 'Seeds', 2),
  ('FOOD_PROCESSING', 'SECONDARY', 'Pulp', 3),
  ('FOOD_PROCESSING', 'SECONDARY', 'Animal Feed Material', 4),
  ('BEVERAGES', 'SECONDARY', 'Fruit Pulp', 1),
  ('BEVERAGES', 'SECONDARY', 'Spent Ingredients', 2),
  ('BEVERAGES', 'SECONDARY', 'Bottles/Packaging Scrap', 3),
  ('MINERAL_WATER', 'SECONDARY', 'Rejected Bottles', 1),
  ('MINERAL_WATER', 'SECONDARY', 'PET Scrap', 2),
  ('MINERAL_WATER', 'SECONDARY', 'Plastic Caps', 3),
  ('MINERAL_WATER', 'SECONDARY', 'Packaging Waste', 4),
  ('PHARMACEUTICAL', 'SECONDARY', 'Rejected Products', 1),
  ('PHARMACEUTICAL', 'SECONDARY', 'Tablet/Capsule Waste', 2),
  ('PHARMACEUTICAL', 'SECONDARY', 'Solvent Recovery', 3),
  ('PHARMACEUTICAL', 'SECONDARY', 'Packaging Scrap', 4),
  ('CHEMICAL', 'SECONDARY', 'Chemical Residues', 1),
  ('CHEMICAL', 'SECONDARY', 'Recovered Solvents', 2),
  ('CHEMICAL', 'SECONDARY', 'Chemical By-products', 3),
  ('CHEMICAL', 'SECONDARY', 'Sludge', 4),
  ('FERTILIZER', 'SECONDARY', 'Ammonium Sulphate', 1),
  ('FERTILIZER', 'SECONDARY', 'Gypsum', 2),
  ('FERTILIZER', 'SECONDARY', 'Process Dust', 3),
  ('FERTILIZER', 'SECONDARY', 'Recovered Chemicals', 4),
  ('PAINT', 'SECONDARY', 'Paint Sludge', 1),
  ('PAINT', 'SECONDARY', 'Solvent Residue', 2),
  ('PAINT', 'SECONDARY', 'Off-spec Paint', 3),
  ('PAINT', 'SECONDARY', 'Container Scrap', 4),
  ('PLASTIC', 'SECONDARY', 'Plastic Scrap', 1),
  ('PLASTIC', 'SECONDARY', 'Rejected Products', 2),
  ('PLASTIC', 'SECONDARY', 'Runner/Sprue', 3),
  ('PLASTIC', 'SECONDARY', 'Regrind Material', 4),
  ('PVC', 'SECONDARY', 'PVC Scrap', 1),
  ('PVC', 'SECONDARY', 'Cutting Waste', 2),
  ('PVC', 'SECONDARY', 'Rejected Pipes', 3),
  ('PVC', 'SECONDARY', 'Regrind', 4),
  ('RUBBER', 'SECONDARY', 'Rubber Scrap', 1),
  ('RUBBER', 'SECONDARY', 'Rubber Crumbs', 2),
  ('RUBBER', 'SECONDARY', 'Rejected Products', 3),
  ('TYRE', 'SECONDARY', 'Rubber Scrap', 1),
  ('TYRE', 'SECONDARY', 'Tyre Buffing Dust', 2),
  ('TYRE', 'SECONDARY', 'Steel Wire Scrap', 3),
  ('TYRE', 'SECONDARY', 'Textile Scrap', 4),
  ('PAPER_MILL', 'SECONDARY', 'Paper Sludge', 1),
  ('PAPER_MILL', 'SECONDARY', 'Waste Paper', 2),
  ('PAPER_MILL', 'SECONDARY', 'Reject Pulp', 3),
  ('PAPER_MILL', 'SECONDARY', 'Wood Waste', 4),
  ('BOARD_CARDBOARD', 'SECONDARY', 'Paper Scrap', 1),
  ('BOARD_CARDBOARD', 'SECONDARY', 'Edge Trimmings', 2),
  ('BOARD_CARDBOARD', 'SECONDARY', 'Reject Board', 3),
  ('BOARD_CARDBOARD', 'SECONDARY', 'Waste Pulp', 4),
  ('PRINTING', 'SECONDARY', 'Paper Off-cuts', 1),
  ('PRINTING', 'SECONDARY', 'Printing Rejects', 2),
  ('PRINTING', 'SECONDARY', 'Used Plates', 3),
  ('PRINTING', 'SECONDARY', 'Ink Residue', 4),
  ('STEEL', 'SECONDARY', 'Steel Scrap', 1),
  ('STEEL', 'SECONDARY', 'Mill Scale', 2),
  ('STEEL', 'SECONDARY', 'Slag', 3),
  ('STEEL', 'SECONDARY', 'Cutting Scrap', 4),
  ('FOUNDRY', 'SECONDARY', 'Metal Scrap', 1),
  ('FOUNDRY', 'SECONDARY', 'Foundry Sand', 2),
  ('FOUNDRY', 'SECONDARY', 'Slag', 3),
  ('FOUNDRY', 'SECONDARY', 'Casting Runners/Risers', 4),
  ('ENGINEERING', 'SECONDARY', 'Metal Scrap', 1),
  ('ENGINEERING', 'SECONDARY', 'Machining Chips', 2),
  ('ENGINEERING', 'SECONDARY', 'Cutting Waste', 3),
  ('ENGINEERING', 'SECONDARY', 'Rejected Components', 4),
  ('AUTO_PARTS', 'SECONDARY', 'Metal Scrap', 1),
  ('AUTO_PARTS', 'SECONDARY', 'Machining Chips', 2),
  ('AUTO_PARTS', 'SECONDARY', 'Rejected Parts', 3),
  ('AUTO_PARTS', 'SECONDARY', 'Casting Scrap', 4),
  ('AUTOMOBILE', 'SECONDARY', 'Metal Scrap', 1),
  ('AUTOMOBILE', 'SECONDARY', 'Plastic Scrap', 2),
  ('AUTOMOBILE', 'SECONDARY', 'Paint Waste', 3),
  ('AUTOMOBILE', 'SECONDARY', 'Rejected Components', 4),
  ('ELECTRICAL_EQUIPMENT', 'SECONDARY', 'Copper Scrap', 1),
  ('ELECTRICAL_EQUIPMENT', 'SECONDARY', 'Aluminium Scrap', 2),
  ('ELECTRICAL_EQUIPMENT', 'SECONDARY', 'Steel Scrap', 3),
  ('ELECTRICAL_EQUIPMENT', 'SECONDARY', 'Plastic Scrap', 4),
  ('CABLE_INDUSTRY', 'SECONDARY', 'Copper Scrap', 1),
  ('CABLE_INDUSTRY', 'SECONDARY', 'Aluminium Scrap', 2),
  ('CABLE_INDUSTRY', 'SECONDARY', 'PVC Scrap', 3),
  ('CABLE_INDUSTRY', 'SECONDARY', 'Cable Off-cuts', 4),
  ('GLASS', 'SECONDARY', 'Glass Cullet', 1),
  ('GLASS', 'SECONDARY', 'Broken Glass', 2),
  ('GLASS', 'SECONDARY', 'Cutting Scrap', 3),
  ('GLASS', 'SECONDARY', 'Glass Powder', 4),
  ('CERAMIC', 'SECONDARY', 'Ceramic Scrap', 1),
  ('CERAMIC', 'SECONDARY', 'Broken Tiles', 2),
  ('CERAMIC', 'SECONDARY', 'Glaze Waste', 3),
  ('CERAMIC', 'SECONDARY', 'Ceramic Dust', 4),
  ('CEMENT', 'SECONDARY', 'Cement Dust', 1),
  ('CEMENT', 'SECONDARY', 'Kiln Dust', 2),
  ('CEMENT', 'SECONDARY', 'Clinker Rejects', 3),
  ('CEMENT', 'SECONDARY', 'Slag', 4),
  ('BRICK', 'SECONDARY', 'Broken Bricks', 1),
  ('BRICK', 'SECONDARY', 'Brick Chips', 2),
  ('BRICK', 'SECONDARY', 'Kiln Ash', 3),
  ('BRICK', 'SECONDARY', 'Brick Dust', 4),
  ('MARBLE_STONE', 'SECONDARY', 'Stone Chips', 1),
  ('MARBLE_STONE', 'SECONDARY', 'Marble Slabs', 2),
  ('MARBLE_STONE', 'SECONDARY', 'Cutting Waste', 3),
  ('MARBLE_STONE', 'SECONDARY', 'Stone Powder', 4),
  ('FURNITURE', 'SECONDARY', 'Wood Off-cuts', 1),
  ('FURNITURE', 'SECONDARY', 'Sawdust', 2),
  ('FURNITURE', 'SECONDARY', 'Wood Chips', 3),
  ('FURNITURE', 'SECONDARY', 'MDF Scrap', 4),
  ('WOOD', 'SECONDARY', 'Sawdust', 1),
  ('WOOD', 'SECONDARY', 'Wood Chips', 2),
  ('WOOD', 'SECONDARY', 'Bark', 3),
  ('WOOD', 'SECONDARY', 'Wood Off-cuts', 4),
  ('MATCH', 'SECONDARY', 'Wood Waste', 1),
  ('MATCH', 'SECONDARY', 'Matchstick Rejects', 2),
  ('MATCH', 'SECONDARY', 'Sawdust', 3),
  ('MATCH', 'SECONDARY', 'Chemical Residues', 4),
  ('SOAP', 'SECONDARY', 'Soap Scraps', 1),
  ('SOAP', 'SECONDARY', 'Glycerin', 2),
  ('SOAP', 'SECONDARY', 'Fatty Acid', 3),
  ('SOAP', 'SECONDARY', 'Soap Sludge', 4),
  ('DETERGENT', 'SECONDARY', 'Off-spec Detergent', 1),
  ('DETERGENT', 'SECONDARY', 'Powder Recovery', 2),
  ('DETERGENT', 'SECONDARY', 'Packaging Scrap', 3),
  ('DETERGENT', 'SECONDARY', 'Chemical Residue', 4),
  ('ANIMAL_FEED', 'SECONDARY', 'Feed Dust', 1),
  ('ANIMAL_FEED', 'SECONDARY', 'Screenings', 2),
  ('ANIMAL_FEED', 'SECONDARY', 'Bran', 3),
  ('ANIMAL_FEED', 'SECONDARY', 'Rejected Feed', 4),
  ('POULTRY_PROCESSING', 'SECONDARY', 'Feathers', 1),
  ('POULTRY_PROCESSING', 'SECONDARY', 'Blood', 2),
  ('POULTRY_PROCESSING', 'SECONDARY', 'Offal', 3),
  ('POULTRY_PROCESSING', 'SECONDARY', 'Poultry Fat', 4),
  ('POULTRY_PROCESSING', 'SECONDARY', 'Bones', 5),
  ('MEAT_PROCESSING', 'SECONDARY', 'Bones', 1),
  ('MEAT_PROCESSING', 'SECONDARY', 'Fat', 2),
  ('MEAT_PROCESSING', 'SECONDARY', 'Blood', 3),
  ('MEAT_PROCESSING', 'SECONDARY', 'Offal', 4),
  ('MEAT_PROCESSING', 'SECONDARY', 'Hides/Skin', 5),
  ('COLD_STORAGE', 'SECONDARY', 'Spoiled Produce', 1),
  ('COLD_STORAGE', 'SECONDARY', 'Rejected Produce', 2),
  ('COLD_STORAGE', 'SECONDARY', 'Damaged Packaging', 3),
  ('COLD_STORAGE', 'SECONDARY', 'Organic Waste', 4),
  ('FRUIT_PROCESSING', 'SECONDARY', 'Fruit Pulp', 1),
  ('FRUIT_PROCESSING', 'SECONDARY', 'Peels', 2),
  ('FRUIT_PROCESSING', 'SECONDARY', 'Seeds', 3),
  ('FRUIT_PROCESSING', 'SECONDARY', 'Kernels', 4),
  ('FRUIT_PROCESSING', 'SECONDARY', 'Juice Residue', 5),
  ('VEGETABLE_PROCESSING', 'SECONDARY', 'Peels', 1),
  ('VEGETABLE_PROCESSING', 'SECONDARY', 'Trimmings', 2),
  ('VEGETABLE_PROCESSING', 'SECONDARY', 'Seeds', 3),
  ('VEGETABLE_PROCESSING', 'SECONDARY', 'Vegetable Pulp', 4),
  ('VEGETABLE_PROCESSING', 'SECONDARY', 'Organic Waste', 5),
  ('BISCUIT_BAKERY', 'SECONDARY', 'Biscuit Rejects', 1),
  ('BISCUIT_BAKERY', 'SECONDARY', 'Bakery Waste', 2),
  ('BISCUIT_BAKERY', 'SECONDARY', 'Crumbs', 3),
  ('BISCUIT_BAKERY', 'SECONDARY', 'Flour Residue', 4),
  ('CONFECTIONERY', 'SECONDARY', 'Candy/Chocolate Rejects', 1),
  ('CONFECTIONERY', 'SECONDARY', 'Sugar Residue', 2),
  ('CONFECTIONERY', 'SECONDARY', 'Product Scrap', 3),
  ('CONFECTIONERY', 'SECONDARY', 'Packaging Waste', 4),
  ('MINERAL_MINING', 'SECONDARY', 'Mineral Rejects', 1),
  ('MINERAL_MINING', 'SECONDARY', 'Stone Chips', 2),
  ('MINERAL_MINING', 'SECONDARY', 'Tailings', 3),
  ('MINERAL_MINING', 'SECONDARY', 'Fine Material', 4),
  ('COAL', 'SECONDARY', 'Coal Fines', 1),
  ('COAL', 'SECONDARY', 'Coal Dust', 2),
  ('COAL', 'SECONDARY', 'Reject Coal', 3),
  ('COAL', 'SECONDARY', 'Ash', 4),
  ('PLASTIC_RECYCLING', 'SECONDARY', 'Recycled Plastic Granules', 1),
  ('PLASTIC_RECYCLING', 'SECONDARY', 'Flakes', 2),
  ('PLASTIC_RECYCLING', 'SECONDARY', 'Powder', 3),
  ('PLASTIC_RECYCLING', 'SECONDARY', 'Plastic Rejects', 4),
  ('BATTERY', 'SECONDARY', 'Lead Scrap', 1),
  ('BATTERY', 'SECONDARY', 'Lead Oxide Residue', 2),
  ('BATTERY', 'SECONDARY', 'Plastic Scrap', 3),
  ('BATTERY', 'SECONDARY', 'Battery Components', 4),
  ('SOLAR_PANEL', 'SECONDARY', 'Glass Scrap', 1),
  ('SOLAR_PANEL', 'SECONDARY', 'Silicon/Cell Scrap', 2),
  ('SOLAR_PANEL', 'SECONDARY', 'Aluminium Frame Scrap', 3),
  ('SOLAR_PANEL', 'SECONDARY', 'Cable Scrap', 4),
  ('ELECTRONICS', 'SECONDARY', 'Electronic Scrap/E-waste', 1),
  ('ELECTRONICS', 'SECONDARY', 'Copper Scrap', 2),
  ('ELECTRONICS', 'SECONDARY', 'PCB Scrap', 3),
  ('ELECTRONICS', 'SECONDARY', 'Plastic Scrap', 4),
  ('PACKAGING', 'SECONDARY', 'Paper/Cardboard Scrap', 1),
  ('PACKAGING', 'SECONDARY', 'Plastic Scrap', 2),
  ('PACKAGING', 'SECONDARY', 'Cutting Waste', 3),
  ('PACKAGING', 'SECONDARY', 'Printing Waste', 4),
  ('PAINT_CHEMICAL', 'SECONDARY', 'Paint Sludge', 1),
  ('PAINT_CHEMICAL', 'SECONDARY', 'Solvent Residue', 2),
  ('PAINT_CHEMICAL', 'SECONDARY', 'Chemical By-products', 3),
  ('PAINT_CHEMICAL', 'SECONDARY', 'Recovered Solvent', 4),
  ('LPG_GAS', 'SECONDARY', 'Gas Condensate', 1),
  ('LPG_GAS', 'SECONDARY', 'Hydrocarbon Residues', 2),
  ('LPG_GAS', 'SECONDARY', 'Cylinder Scrap', 3),
  ('WATER_TREATMENT', 'SECONDARY', 'Treatment Sludge', 1),
  ('WATER_TREATMENT', 'SECONDARY', 'Recovered Water', 2),
  ('WATER_TREATMENT', 'SECONDARY', 'Used Filter Media', 3),
  ('WATER_TREATMENT', 'SECONDARY', 'Reject/Brine', 4),
  ('POWER_PLANT', 'SECONDARY', 'Fly Ash', 1),
  ('POWER_PLANT', 'SECONDARY', 'Bottom Ash', 2),
  ('POWER_PLANT', 'SECONDARY', 'Gypsum', 3),
  ('POWER_PLANT', 'SECONDARY', 'Scrap Material', 4),
  ('CONSTRUCTION_MATERIAL', 'SECONDARY', 'Concrete Waste', 1),
  ('CONSTRUCTION_MATERIAL', 'SECONDARY', 'Concrete Blocks', 2),
  ('CONSTRUCTION_MATERIAL', 'SECONDARY', 'Stone Chips', 3),
  ('CONSTRUCTION_MATERIAL', 'SECONDARY', 'Brick Chips', 4),
  ('CONSTRUCTION_MATERIAL', 'SECONDARY', 'Sand/Screening Waste', 5);

DO $$
DECLARE missing_codes text;
BEGIN
  SELECT string_agg(DISTINCT s.unit_type_code, ', ' ORDER BY s.unit_type_code)
    INTO missing_codes
    FROM phase4_product_seed s
    LEFT JOIN lookup_types t ON t.code = 'UNIT_TYPE'
    LEFT JOIN lookup_values v ON v.type_id = t.id AND v.code = s.unit_type_code
   WHERE v.id IS NULL;
  IF missing_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Missing UNIT_TYPE codes: %. Apply migration 07 first.', missing_codes;
  END IF;

  IF EXISTS (SELECT 1 FROM industry_product_options WHERE id <= 0) THEN
    RAISE EXCEPTION 'Product option IDs must be positive; zero is reserved for Other.';
  END IF;
END $$;

INSERT INTO industry_product_options (unit_type_id, product_kind, product_name, sort_order)
SELECT v.id, s.product_kind, s.product_name, s.sort_order
  FROM phase4_product_seed s
  JOIN lookup_types t ON t.code = 'UNIT_TYPE'
  JOIN lookup_values v ON v.type_id = t.id AND v.code = s.unit_type_code
ON CONFLICT (unit_type_id, product_kind, product_name) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;

ALTER TABLE product_transformation_stages
  ADD COLUMN IF NOT EXISTS main_product_kind varchar(10) NOT NULL DEFAULT 'MAIN';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
     WHERE attrelid = 'product_transformation_stages'::regclass
       AND attname = 'main_product_kind' AND NOT attisdropped
       AND atttypid = 'varchar'::regtype AND atttypmod = 14 AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Existing main_product_kind column has an incompatible type or nullability.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'products'::regclass AND conname = 'products_id_kind_unique'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_id_kind_unique UNIQUE (id, product_kind);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'products'::regclass AND conname = 'products_secondary_main_fields_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_secondary_main_fields_check
      CHECK (product_kind = 'MAIN' OR
        (revenue_share_pct IS NULL AND hs_code_id IS NULL AND hs_code_text IS NULL)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'product_transformation_stages'::regclass
       AND conname = 'product_stages_main_kind_check'
  ) THEN
    ALTER TABLE product_transformation_stages ADD CONSTRAINT product_stages_main_kind_check
      CHECK (main_product_kind = 'MAIN') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'product_transformation_stages'::regclass
       AND conname = 'product_stages_main_product_fk'
  ) THEN
    ALTER TABLE product_transformation_stages ADD CONSTRAINT product_stages_main_product_fk
      FOREIGN KEY (product_id, main_product_kind) REFERENCES products(id, product_kind)
      ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

ALTER TABLE product_transformation_stages
  ALTER COLUMN main_product_kind SET DEFAULT 'MAIN';

COMMIT;

-- Verification (run separately after applying):
-- SELECT count(*) AS total_product_units, count(*) FILTER (WHERE is_active) AS active_product_units
--   FROM product_measurement_units;
-- SELECT m.code, p.display_label, p.is_active, p.product_only
--   FROM product_measurement_units p JOIN measurement_units m ON m.id = p.unit_id
--  ORDER BY p.sort_order, m.id;
-- SELECT product_kind, count(*) AS total_options, count(*) FILTER (WHERE is_active) AS active_options
--   FROM industry_product_options GROUP BY product_kind ORDER BY product_kind;
-- SELECT v.code, p.product_kind, count(*) AS total_options,
--        count(*) FILTER (WHERE p.is_active) AS active_options FROM industry_product_options p
--   JOIN lookup_values v ON v.id = p.unit_type_id
--  GROUP BY v.code, p.product_kind ORDER BY v.code, p.product_kind;
-- SELECT conname, convalidated, pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid IN ('products'::regclass, 'product_transformation_stages'::regclass)
--    AND conname IN ('products_secondary_main_fields_check',
--                    'product_stages_main_kind_check', 'product_stages_main_product_fk');
-- SELECT id, response_id, revenue_share_pct, hs_code_id, hs_code_text FROM products
--  WHERE product_kind = 'SECONDARY'
--    AND (revenue_share_pct IS NOT NULL OR hs_code_id IS NOT NULL OR hs_code_text IS NOT NULL);
-- SELECT p.id, p.response_id, p.product_kind, s.stage_id
--   FROM products p JOIN product_transformation_stages s ON s.product_id = p.id
--  WHERE p.product_kind <> 'MAIN' OR s.main_product_kind <> 'MAIN';
-- Review any historical violations before validating NOT VALID constraints.
