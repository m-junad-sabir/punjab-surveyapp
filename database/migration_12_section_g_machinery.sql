-- Workplan 2 Phase 7: Section G machinery, equipment and innovation.
-- Re-runnable. Existing machinery counts and equipment rows are not converted or removed.

BEGIN;

CREATE TABLE IF NOT EXISTS industry_machine_options (
  id serial PRIMARY KEY CHECK (id > 0),
  unit_type_id integer NOT NULL REFERENCES lookup_values(id),
  machine_name text NOT NULL,
  specification text NOT NULL,
  sort_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (unit_type_id, machine_name)
);

CREATE INDEX IF NOT EXISTS idx_industry_machine_options_lookup
  ON industry_machine_options (unit_type_id, sort_order);

CREATE TEMP TABLE phase7_machine_seed (
  unit_type_code text NOT NULL,
  machine_name text NOT NULL,
  specification text NOT NULL,
  sort_order smallint NOT NULL,
  PRIMARY KEY (unit_type_code, machine_name)
) ON COMMIT DROP;

INSERT INTO phase7_machine_seed (unit_type_code, machine_name, specification, sort_order) VALUES
  ('SUGAR_MILL', 'Cane Crushing Mill', U&'Mill: 500\201315,000 TCD', 1),
  ('SUGAR_MILL', 'Boiler', U&'Boiler: 20\2013150 TPH', 2),
  ('SUGAR_MILL', 'Steam Turbine', U&'Turbine: 1\201350 MW', 3),
  ('SUGAR_MILL', 'Centrifugal Machine', U&'Centrifugal: 500\20132,000 kg/batch', 4),
  ('TEXTILE', 'Carding Machine', U&'Carding: 50\2013150 kg/hr', 1),
  ('TEXTILE', 'Ring Spinning Machine', U&'Ring: 480\20131,824+ spindles', 2),
  ('TEXTILE', 'Weaving Loom', U&'Loom: 300\20131,000 RPM', 3),
  ('TEXTILE', 'Dyeing Machine', U&'Dyeing: 50\20131,500 kg/batch', 4),
  ('GARMENTS', 'Sewing Machine', U&'Sewing: 4,000\20136,000 stitches/min', 1),
  ('GARMENTS', 'Cutting Machine', U&'Cutting: 50\2013300 mm', 2),
  ('GARMENTS', 'Embroidery Machine', U&'Embroidery: 6\201330 heads', 3),
  ('GARMENTS', 'Pressing Machine', U&'Pressing: 10\201360 pcs/hr', 4),
  ('LEATHER', 'Fleshing Machine', U&'Fleshing: 1.5\20133 m width', 1),
  ('LEATHER', 'Splitting Machine', U&'Splitting: 0.5\20134 mm', 2),
  ('LEATHER', 'Shaving Machine', U&'Shaving: 0.3\20132.5 mm', 3),
  ('LEATHER', 'Tanning Drum', U&'Drum: 500\201310,000 kg/batch', 4),
  ('SHOES', 'Clicking Machine', U&'Clicking: 20\201350 ton', 1),
  ('SHOES', 'Skiving Machine', U&'Skiving: 0.5\20131.5 mm', 2),
  ('SHOES', 'Stitching Machine', U&'Stitching: 2,500\20135,000 RPM', 3),
  ('SHOES', 'Lasting Machine', U&'Lasting: 50\2013150 pairs/hr', 4),
  ('SHOES', 'Injection Moulding Machine', U&'Injection: 100\2013500 ton clamping', 5),
  ('RICE_MILL', 'Husker', U&'Capacity: 2\201310 TPH', 1),
  ('RICE_MILL', 'Rice Polisher', U&'Polisher: 600\20131,000 RPM', 2),
  ('RICE_MILL', 'Color Sorter', 'Color Sorter: CCD', 3),
  ('RICE_MILL', 'Rice Grader', U&'Grader: 3\20136 grades', 4),
  ('FLOUR_MILL', 'Roller Mill', U&'Roller: 2\201320 TPH', 1),
  ('FLOUR_MILL', 'Plansifter', U&'Plansifter: 4\20138 passages', 2),
  ('FLOUR_MILL', 'Purifier', U&'Purifier: 0.5\20135 TPH', 3),
  ('FLOUR_MILL', 'Packing Machine', U&'Packing: 10\201350 kg bags', 4),
  ('OIL_GHEE', 'Oil Expeller', U&'Expeller: 1\201320 TPD', 1),
  ('OIL_GHEE', 'Filter Press', U&'Filter: 20\201360 plates', 2),
  ('OIL_GHEE', 'Refining Unit', U&'Refining: 5\2013100 TPD', 3),
  ('OIL_GHEE', 'Filling Machine', U&'Filling: 20\2013100 bottles/min', 4),
  ('DAIRY', 'Milk Pasteurizer', U&'Pasteurizer: 1,000\201320,000 L/hr at 72\00B0C HTST', 1),
  ('DAIRY', 'Homogenizer', U&'Homogenizer: 150\2013250 bar', 2),
  ('DAIRY', 'Cream Separator', U&'Separator: 5,000\20138,000 RPM', 3),
  ('DAIRY', 'Milk Chiller', U&'Chiller: 2\20134\00B0C', 4),
  ('FOOD_PROCESSING', 'Processing Machine', U&'Processing: 100\20135,000 kg/hr', 1),
  ('FOOD_PROCESSING', 'Mixer', U&'Mixer: 50\20132,000 kg/batch', 2),
  ('FOOD_PROCESSING', 'Boiler', U&'Boiler: 1\201320 TPH', 3),
  ('FOOD_PROCESSING', 'Filling Machine', U&'Filling: 20\2013200 bottles/min', 4),
  ('FOOD_PROCESSING', 'Packaging Machine', U&'Packaging: 20\2013100 packs/min', 5),
  ('BEVERAGES', 'Water Treatment Plant', U&'Treatment: 1,000\201320,000 L/hr', 1),
  ('BEVERAGES', 'Bottle Blowing Machine', U&'Blow: 1,000\201320,000 bottles/hr', 2),
  ('BEVERAGES', 'Filling Machine', U&'Filling/Capping: 2,000\201340,000 bottles/hr', 3),
  ('BEVERAGES', 'Capping Machine', U&'Air: 20\201340 bar', 4),
  ('MINERAL_WATER', 'RO Plant', U&'RO: 1,000\201320,000 L/hr', 1),
  ('MINERAL_WATER', 'UV System', U&'UV: 30\201340 mJ/cm\00B2', 2),
  ('MINERAL_WATER', 'Filling Machine', U&'Filling: 2,000\201340,000 bottles/hr', 3),
  ('PHARMACEUTICAL', 'Tablet Press', U&'Tablet: 20,000\2013500,000 tablets/hr, 10\2013100 stations', 1),
  ('PHARMACEUTICAL', 'Capsule Filling Machine', U&'Capsule: 10,000\2013200,000 caps/hr', 2),
  ('PHARMACEUTICAL', 'Coating Machine', U&'Coating: 10\2013500 kg/batch', 3),
  ('PHARMACEUTICAL', 'Blister Packing Machine', U&'Blister: 20\2013100 packs/min', 4),
  ('CHEMICAL', 'Reactor', U&'Reactor: 100\201320,000 L', 1),
  ('CHEMICAL', 'Agitator', U&'Agitator: 50\2013500 RPM', 2),
  ('CHEMICAL', 'Heat Exchanger', U&'Heat Exchanger: 10\20131,000 m\00B2', 3),
  ('CHEMICAL', 'Distillation Column', U&'Column: 1\2013100 TPD', 4),
  ('FERTILIZER', 'Granulator', U&'Granulator: 5\2013100 TPH', 1),
  ('FERTILIZER', 'Reactor', U&'Reactor: 10\2013100 TPD', 2),
  ('FERTILIZER', 'Dryer', U&'Dryer: 5\201350 TPH', 3),
  ('FERTILIZER', 'Packing Machine', U&'Packing: 10\201330 bags/min, 25\201350 kg bags', 4),
  ('PAINT', 'High Speed Disperser', U&'Disperser: 100\20135,000 kg/batch', 1),
  ('PAINT', 'Ball Mill', U&'Ball Mill: 50\20131,000 kg/hr', 2),
  ('PAINT', 'Bead Mill', U&'Bead Mill: 100\20132,000 kg/hr', 3),
  ('PAINT', 'Filling Machine', U&'Filling: 10\201360 cans/min', 4),
  ('PLASTIC', 'Injection Moulding Machine', U&'Injection: 50\20131,500 ton clamping', 1),
  ('PLASTIC', 'Extruder', U&'Extruder: 20\2013500 kg/hr', 2),
  ('PLASTIC', 'Blow Moulding Machine', U&'Blow: 500\20135,000 bottles/hr', 3),
  ('PLASTIC', 'Crusher', U&'Crusher: 50\20131,000 kg/hr', 4),
  ('PVC', 'PVC Extruder', U&'Extruder: 50\2013500 kg/hr, 45\2013150 mm screw', 1),
  ('PVC', 'Vacuum Calibration Tank', U&'Vacuum Tank: 2\20138 m', 2),
  ('PVC', 'Haul-off Machine', U&'Haul-off: 1\201330 m/min', 3),
  ('PVC', 'Cutting Machine', U&'Cutter: 1\201330 cuts/min', 4),
  ('RUBBER', 'Rubber Mixing Mill', U&'Mixing Mill: 25\2013500 kg/batch', 1),
  ('RUBBER', 'Banbury Mixer', U&'Banbury: 25\2013500 kg/batch, 20\201360 RPM', 2),
  ('RUBBER', 'Vulcanizing Press', U&'Press: 50\2013500 ton, 150\2013200\00B0C', 3),
  ('TYRE', 'Tyre Building Machine', U&'Building: 10\2013100 tyres/hr', 1),
  ('TYRE', 'Vulcanizing Press', U&'Vulcanizing: 2\201320 tyres/batch, 150\2013180\00B0C, 15\201325 bar', 2),
  ('TYRE', 'Rubber Mixer', U&'Mixer: 100\2013500 kg/batch', 3),
  ('PAPER_MILL', 'Pulping Machine', U&'Pulping: 10\2013200 TPD', 1),
  ('PAPER_MILL', 'Paper Machine', U&'Paper Machine: 20\2013500 TPD, width 1\20138 m', 2),
  ('PAPER_MILL', 'Dryer', U&'Dryer: 80\2013130\00B0C', 3),
  ('PAPER_MILL', 'Cutter', U&'Cutter: 100\20131,000 sheets/min', 4),
  ('BOARD_CARDBOARD', 'Corrugator', U&'Corrugator: 50\2013300 m/min, width 1.2\20132.5 m', 1),
  ('BOARD_CARDBOARD', 'Laminator', U&'Laminator: 30\2013150 m/min', 2),
  ('BOARD_CARDBOARD', 'Die Cutting Machine', U&'Die Cutter: 2,000\201310,000 pcs/hr', 3),
  ('PRINTING', 'Offset Printing Machine', U&'Offset: 10,000\201318,000 sheets/hr, 4\20138 colors', 1),
  ('PRINTING', 'Digital Printing Machine', U&'Digital: 1,000\201310,000 sheets/hr', 2),
  ('PRINTING', 'Binding Machine', U&'Binding: 500\20133,000 books/hr', 3),
  ('PRINTING', 'Cutting Machine', U&'Cutting: 80\2013150 ton', 4),
  ('STEEL', 'Induction Furnace', U&'Furnace: 0.5\201320 ton/batch', 1),
  ('STEEL', 'Rolling Mill', U&'Rolling: 5\2013100 TPH', 2),
  ('STEEL', 'Reheating Furnace', U&'Reheating: 10\2013100 TPH, 1,000\20131,250\00B0C', 3),
  ('STEEL', 'Shearing Machine', U&'Shearing: 5\2013100 ton/hr', 4),
  ('FOUNDRY', 'Melting Furnace', U&'Melting: 0.5\201320 ton/batch', 1),
  ('FOUNDRY', 'Moulding Machine', U&'Moulding: 50\2013500 moulds/hr', 2),
  ('FOUNDRY', 'Sand Mixer', U&'Sand Mixer: 100\20132,000 kg/batch', 3),
  ('FOUNDRY', 'Shot Blasting Machine', U&'Shot Blast: 100\20132,000 kg/hr', 4),
  ('ENGINEERING', 'CNC Machine', U&'CNC: 2\201350 kW, 4,000\201312,000 RPM, 3\20135 axis', 1),
  ('ENGINEERING', 'Lathe Machine', U&'Lathe: 1\20133 m bed', 2),
  ('ENGINEERING', 'Milling Machine', U&'Milling: 3\201330 kW', 3),
  ('ENGINEERING', 'Grinding Machine', U&'Grinding Wheel: 300\2013600 mm', 4),
  ('AUTO_PARTS', 'CNC Turning', U&'CNC: 20\2013100 mm bar, 2,000\20136,000 RPM', 1),
  ('AUTO_PARTS', 'Press Machine', U&'Press: 50\20131,000 ton', 2),
  ('AUTO_PARTS', 'Heat Treatment Furnace', U&'Heat Treatment: 500\20135,000 kg/batch, 800\20131,100\00B0C', 3),
  ('AUTOMOBILE', 'Assembly Line', U&'Assembly: 10\2013200 vehicles/day', 1),
  ('AUTOMOBILE', 'Welding Machine', U&'Welding: 20\2013100 kVA', 2),
  ('AUTOMOBILE', 'Paint Booth', U&'Paint Booth: 10\2013100 vehicles/day', 3),
  ('ELECTRICAL_EQUIPMENT', 'Coil Winding Machine', U&'Winding: 500\20135,000 RPM, Wire: 0.1\20135 mm', 1),
  ('ELECTRICAL_EQUIPMENT', 'Transformer Testing Unit', U&'Testing: 1 kVA\2013100 MVA', 2),
  ('ELECTRICAL_EQUIPMENT', 'Press Machine', U&'Press: 20\2013500 ton', 3),
  ('CABLE_INDUSTRY', 'Wire Drawing Machine', U&'Wire: final dia 0.2\201310 mm, speed 5\201330 m/s', 1),
  ('CABLE_INDUSTRY', 'Extruder', U&'Extruder: 20\2013500 kg/hr', 2),
  ('CABLE_INDUSTRY', 'Stranding Machine', U&'Stranding: 100\20132,000 m/min, 7\201361 wires', 3),
  ('GLASS', 'Glass Melting Furnace', U&'Furnace: 20\2013500 TPD, 1,400\20131,600\00B0C', 1),
  ('GLASS', 'Forming Machine', U&'Forming: 500\201310,000 pcs/hr', 2),
  ('GLASS', 'Annealing Lehr', U&'Lehr: 20\2013100 m', 3),
  ('CERAMIC', 'Ball Mill', U&'Ball Mill: 500\201310,000 kg/batch', 1),
  ('CERAMIC', 'Spray Dryer', U&'Spray Dryer: 1\201320 TPH', 2),
  ('CERAMIC', 'Kiln', U&'Kiln: 5\2013100 ton/day, 1,000\20131,300\00B0C', 3),
  ('CERAMIC', 'Press Machine', U&'Press: 500\20135,000 ton', 4),
  ('CEMENT', 'Crusher', U&'Crusher: 50\2013500 TPH', 1),
  ('CEMENT', 'Raw Mill', U&'Raw Mill: 50\2013500 TPH', 2),
  ('CEMENT', 'Rotary Kiln', U&'Kiln: 1,000\201315,000 TPD, 1,400\20131,500\00B0C', 3),
  ('CEMENT', 'Cement Mill', U&'Cement Mill: 50\2013300 TPH', 4),
  ('BRICK', 'Brick Moulding Machine', U&'Moulding: 1,000\201310,000 bricks/hr', 1),
  ('BRICK', 'Extruder', U&'Extruder: 5\201330 ton/hr', 2),
  ('BRICK', 'Tunnel Kiln', U&'Kiln: 20,000\2013200,000 bricks/day, 900\20131,100\00B0C', 3),
  ('MARBLE_STONE', 'Gang Saw', U&'Gang Saw: 50\2013200 blades', 1),
  ('MARBLE_STONE', 'Block Cutter', U&'Block thickness: 1\20132 m, Cutter: 1\201310 m\00B2/hr', 2),
  ('MARBLE_STONE', 'Polishing Machine', U&'Polishing: 2\201320 heads', 3),
  ('FURNITURE', 'Panel Saw', U&'Panel Saw: 3,000\20136,000 RPM', 1),
  ('FURNITURE', 'Edge Bander', U&'Edge Bander: 10\201330 m/min', 2),
  ('FURNITURE', 'CNC Router', U&'CNC: 3\201312 kW, 18,000\201324,000 RPM', 3),
  ('FURNITURE', 'Sanding Machine', U&'Sanding: 5\201330 m/min', 4),
  ('WOOD', 'Band Saw', U&'Band Saw: 1\20133 m diameter', 1),
  ('WOOD', 'Planer', U&'Planer: 5\201330 m/min', 2),
  ('WOOD', 'Wood Chipper', U&'Chipper: 2\201320 TPH', 3),
  ('MATCH', 'Match Splint Machine', 'Splint Machine: high-speed wood splint production', 1),
  ('MATCH', 'Dipping Machine', U&'Dipping: 10,000\2013100,000 sticks/hr', 2),
  ('MATCH', 'Packing Machine', U&'Packing: 100\2013600 boxes/min', 3),
  ('SOAP', 'Soap Mixer', U&'Mixer: 100\20131,000 kg/batch', 1),
  ('SOAP', 'Plodder', U&'Plodder: 100\20132,000 kg/hr', 2),
  ('SOAP', 'Cutting Machine', U&'Cutter: 50\2013300 bars/min', 3),
  ('DETERGENT', 'Powder Mixer', U&'Mixer: 100\20132,000 kg/batch', 1),
  ('DETERGENT', 'Spray Dryer', U&'Spray Dryer: 1\201320 TPH', 2),
  ('DETERGENT', 'Packing Machine', U&'Packing: 20\2013100 packs/min', 3),
  ('ANIMAL_FEED', 'Hammer Mill', U&'Hammer Mill: 2\201320 TPH', 1),
  ('ANIMAL_FEED', 'Feed Mixer', U&'Mixer: 500\20133,000 kg/batch', 2),
  ('ANIMAL_FEED', 'Pellet Mill', U&'Pellet Mill: 2\201320+ TPH, Pellet size: 2\201312 mm', 3),
  ('ANIMAL_FEED', 'Cooler', U&'Cooler: 1\201320 TPH', 4),
  ('POULTRY_PROCESSING', 'Slaughtering Line', U&'Slaughtering: 2,000\201310,000 birds/hr', 1),
  ('POULTRY_PROCESSING', 'Scalding Machine', U&'Scalding: 50\201365\00B0C', 2),
  ('POULTRY_PROCESSING', 'Plucking Machine', U&'Plucking: 2,000\201310,000 birds/hr', 3),
  ('POULTRY_PROCESSING', 'Chilling System', U&'Chilling: 0\20134\00B0C', 4),
  ('MEAT_PROCESSING', 'Meat Grinder', U&'Grinder: 100\20132,000 kg/hr', 1),
  ('MEAT_PROCESSING', 'Bowl Cutter', U&'Bowl Cutter: 50\2013500 kg/batch, 1,500\20134,000 RPM', 2),
  ('MEAT_PROCESSING', 'Sausage Filler', U&'Filler: 100\20132,000 kg/hr', 3),
  ('MEAT_PROCESSING', 'Freezer', U&'Freezer: 1\201320 TPD', 4),
  ('COLD_STORAGE', 'Refrigeration Compressor', U&'Compressor: 10\2013500 HP, 10\2013500 TR', 1),
  ('COLD_STORAGE', 'Condenser', U&'Condenser: 10\2013500 TR', 2),
  ('COLD_STORAGE', 'Evaporator', U&'Evaporator: 10\2013500 TR', 3),
  ('FRUIT_PROCESSING', 'Fruit Washer', U&'Washer: 500\20135,000 kg/hr', 1),
  ('FRUIT_PROCESSING', 'Pulper', U&'Pulper: 500\20135,000 kg/hr', 2),
  ('FRUIT_PROCESSING', 'Juice Extractor', U&'Extractor: 500\20135,000 L/hr', 3),
  ('FRUIT_PROCESSING', 'Pasteurizer', U&'Pasteurizer: 500\201310,000 L/hr, 85\201395\00B0C', 4),
  ('VEGETABLE_PROCESSING', 'Washer', U&'Washer: 500\20135,000 kg/hr', 1),
  ('VEGETABLE_PROCESSING', 'Cutter', U&'Cutter: 200\20132,000 kg/hr', 2),
  ('VEGETABLE_PROCESSING', 'Blancher', U&'Blancher: 200\20132,000 kg/hr, 80\2013100\00B0C', 3),
  ('VEGETABLE_PROCESSING', 'Freezer', U&'Freezer: 1\201320 TPD, -18\00B0C', 4),
  ('BISCUIT_BAKERY', 'Dough Mixer', U&'Mixer: 50\2013500 kg/batch', 1),
  ('BISCUIT_BAKERY', 'Rotary Moulder', U&'Moulder: 100\20131,000 kg/hr', 2),
  ('BISCUIT_BAKERY', 'Baking Oven', U&'Oven: 100\20132,000 kg/hr, 180\2013250\00B0C', 3),
  ('BISCUIT_BAKERY', 'Packaging Machine', U&'Packaging: 20\2013100 packs/min', 4),
  ('CONFECTIONERY', 'Candy Cooker', U&'Candy Cooker: 100\20132,000 kg/hr, 110\2013160\00B0C', 1),
  ('CONFECTIONERY', 'Chocolate Tempering Machine', U&'Tempering: 50\20131,000 kg/hr, 28\201332\00B0C', 2),
  ('CONFECTIONERY', 'Depositor', U&'Depositor: 50\20131,000 kg/hr', 3),
  ('MINERAL_MINING', 'Excavator', U&'Excavator: 20\2013200 ton, Bucket: 0.5\201310 m\00B3', 1),
  ('MINERAL_MINING', 'Crusher', U&'Crusher: 20\2013500 TPH', 2),
  ('MINERAL_MINING', 'Screening Plant', U&'Screening: 20\2013500 TPH', 3),
  ('MINERAL_MINING', 'Conveyor', U&'Conveyor: 20\2013500 TPH', 4),
  ('COAL', 'Coal Crusher', U&'Crusher: 20\2013300 TPH', 1),
  ('COAL', 'Conveyor System', U&'Conveyor: 20\2013300 TPH', 2),
  ('COAL', 'Screening Machine', U&'Screening: 20\2013300 TPH, 2\20133 decks', 3),
  ('PLASTIC_RECYCLING', 'Plastic Crusher', U&'Crusher: 100\20131,000 kg/hr', 1),
  ('PLASTIC_RECYCLING', 'Washing Plant', U&'Washing: 0.5\20135 TPH', 2),
  ('PLASTIC_RECYCLING', 'Extruder', U&'Extruder: 100\20131,000 kg/hr', 3),
  ('BATTERY', 'Lead Oxide Mill', U&'Lead Oxide Mill: 100\20131,000 kg/hr', 1),
  ('BATTERY', 'Plate Making Machine', U&'Plate Making: 1,000\201320,000 plates/hr', 2),
  ('BATTERY', 'Battery Assembly Line', U&'Assembly: 500\201310,000 batteries/day', 3),
  ('SOLAR_PANEL', 'Cell Tabber/Stringer', U&'Tabber: 1,000\201310,000 cells/hr', 1),
  ('SOLAR_PANEL', 'Laminator', U&'Laminator: 10\2013100 panels/hr, 140\2013160\00B0C', 2),
  ('SOLAR_PANEL', 'EL Tester', U&'EL Tester: 10\2013100 panels/hr', 3),
  ('ELECTRONICS', 'PCB Assembly Machine', U&'PCB Assembly: 1,000\201320,000 pcs/hr', 1),
  ('ELECTRONICS', 'Pick & Place Machine', U&'Pick & Place: 10,000\2013100,000 components/hr', 2),
  ('ELECTRONICS', 'Reflow Oven', U&'Reflow: 3\201312 heating zones', 3),
  ('PACKAGING', 'Flexo Printing Machine', U&'Flexo: 50\2013300 m/min, 2\20138 colors', 1),
  ('PACKAGING', 'Bag Making Machine', U&'Bag Making: 50\2013200 bags/min', 2),
  ('PACKAGING', 'Lamination Machine', U&'Lamination: 50\2013200 m/min', 3),
  ('PAINT_CHEMICAL', 'Mixer', U&'Mixer: 100\20135,000 kg/batch', 1),
  ('PAINT_CHEMICAL', 'Bead Mill', U&'Bead Mill: 100\20132,000 kg/hr', 2),
  ('PAINT_CHEMICAL', 'Reactor', U&'Reactor: 100\201320,000 L/batch', 3),
  ('LPG_GAS', 'Filling Plant', U&'Filling: 100\20131,000 cylinders/hr', 1),
  ('LPG_GAS', 'Compressor', U&'Compressor: 5\2013100 HP', 2),
  ('LPG_GAS', 'Weighing System', U&'Weighing: 15\201350 kg range, \00B110\201350 g', 3),
  ('WATER_TREATMENT', 'RO Plant', U&'RO: 10\2013500 m\00B3/day, Feed pressure: 10\201320 bar', 1),
  ('WATER_TREATMENT', 'Filter Press', U&'Filter Press: 5\2013100 m\00B2', 2),
  ('WATER_TREATMENT', 'Dosing Pump', U&'Dosing Pump: 1\2013500 L/hr', 3),
  ('POWER_PLANT', 'Boiler', U&'Boiler: 20\2013500 TPH, 30\2013100 bar', 1),
  ('POWER_PLANT', 'Steam Turbine', U&'Steam Turbine: 10\2013500 MW', 2),
  ('POWER_PLANT', 'Gas Turbine', U&'Gas Turbine: 20\2013300 MW', 3),
  ('POWER_PLANT', 'Generator', U&'Generator: 10\2013500 MVA', 4),
  ('CONSTRUCTION_MATERIAL', 'Concrete Mixer', U&'Mixer: 0.5\20135 m\00B3/batch', 1),
  ('CONSTRUCTION_MATERIAL', 'Batching Plant', U&'Batching: 20\2013120 m\00B3/hr', 2),
  ('CONSTRUCTION_MATERIAL', 'Crusher', U&'Crusher: 50\2013500 TPH', 3),
  ('CONSTRUCTION_MATERIAL', 'Asphalt Plant', U&'Asphalt: 40\2013200 TPH', 4);

DO $$
DECLARE missing_codes text;
BEGIN
  SELECT string_agg(DISTINCT s.unit_type_code, ', ' ORDER BY s.unit_type_code)
    INTO missing_codes
    FROM phase7_machine_seed s
    LEFT JOIN lookup_types t ON t.code = 'UNIT_TYPE'
    LEFT JOIN lookup_values v ON v.type_id = t.id AND v.code = s.unit_type_code
   WHERE v.id IS NULL;
  IF missing_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Missing UNIT_TYPE codes: %. Apply migration 07 first.', missing_codes;
  END IF;
  IF EXISTS (SELECT 1 FROM industry_machine_options WHERE id <= 0) THEN
    RAISE EXCEPTION 'Machine option IDs must be positive; zero is reserved for Other.';
  END IF;
END $$;

INSERT INTO industry_machine_options (unit_type_id, machine_name, specification, sort_order)
SELECT v.id, s.machine_name, s.specification, s.sort_order
  FROM phase7_machine_seed s
  JOIN lookup_types t ON t.code = 'UNIT_TYPE'
  JOIN lookup_values v ON v.type_id = t.id AND v.code = s.unit_type_code
ON CONFLICT (unit_type_id, machine_name) DO UPDATE SET
  specification = EXCLUDED.specification,
  sort_order = EXCLUDED.sort_order;

INSERT INTO lookup_types (code, name) VALUES
  ('G_BOILER_TYPE', 'Boiler type'),
  ('G_VESSEL_CATEGORY', 'Pressure vessel category'),
  ('G_PRESSURE_UNIT', 'Working pressure unit'),
  ('G_HEATING_UNIT', 'Heating surface unit'),
  ('G_EQUIPMENT_TYPE', 'Weights and measures equipment type'),
  ('G_EQUIPMENT_UNIT', 'Weights and measures equipment unit')
ON CONFLICT (code) DO NOTHING;

CREATE TEMP TABLE phase7_lookup_seed (
  type_code text NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  requires_text boolean NOT NULL DEFAULT false,
  sort_order smallint NOT NULL,
  unit_group text,
  base_unit text,
  factor numeric,
  PRIMARY KEY (type_code, code)
) ON COMMIT DROP;

INSERT INTO phase7_lookup_seed
  (type_code, code, label, requires_text, sort_order, unit_group, base_unit, factor)
VALUES
  ('G_BOILER_TYPE', 'FIRE_TUBE', 'Fire-tube', false, 1, NULL, NULL, NULL),
  ('G_BOILER_TYPE', 'WATER_TUBE', 'Water-tube', false, 2, NULL, NULL, NULL),
  ('G_BOILER_TYPE', 'PACKAGED', 'Packaged', false, 3, NULL, NULL, NULL),
  ('G_BOILER_TYPE', 'WASTE_HEAT', 'Waste heat recovery', false, 4, NULL, NULL, NULL),
  ('G_BOILER_TYPE', 'THERMIC_FLUID', 'Thermic fluid heater', false, 5, NULL, NULL, NULL),
  ('G_BOILER_TYPE', 'STEAM_GENERATOR', 'Steam generator', false, 6, NULL, NULL, NULL),
  ('G_BOILER_TYPE', 'OTHER', 'Other (specify)', true, 7, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'A', 'A - Compressed air receivers', false, 1, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'B', 'B - Oxygen receiving tanks', false, 2, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'C', 'C - Deaerator', false, 3, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'D', 'D - Blow down tanks', false, 4, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'E', 'E - CO2 tanks', false, 5, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'F', 'F - Hydrogen storage tanks', false, 6, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'G', 'G - De-sulfurizing tanks', false, 7, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'H', 'H - Urea reactors', false, 8, NULL, NULL, NULL),
  ('G_VESSEL_CATEGORY', 'J', 'J - Any other (specify)', true, 9, NULL, NULL, NULL),
  ('G_PRESSURE_UNIT', 'PSI', 'psi', false, 1, NULL, 'bar', 0.0689476),
  ('G_PRESSURE_UNIT', 'MPA', 'MPa', false, 2, NULL, 'bar', 10),
  ('G_PRESSURE_UNIT', 'KGFCM2', 'kgf/cm2', false, 3, NULL, 'bar', 0.980665),
  ('G_PRESSURE_UNIT', 'BAR', 'bar', false, 4, NULL, 'bar', 1),
  ('G_PRESSURE_UNIT', 'KPA', 'kPa', false, 5, NULL, 'bar', 0.01),
  ('G_PRESSURE_UNIT', 'OTHER', 'Other (specify)', true, 6, NULL, NULL, NULL),
  ('G_HEATING_UNIT', 'CM2', 'cm2', false, 1, NULL, 'm2', 0.0001),
  ('G_HEATING_UNIT', 'M2', 'm2', false, 2, NULL, 'm2', 1),
  ('G_HEATING_UNIT', 'FT2', 'ft2', false, 3, NULL, 'm2', 0.09290304),
  ('G_HEATING_UNIT', 'OTHER', 'Other (specify)', true, 4, NULL, NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ01', 'Weigh bridge', false, 1, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ02', 'Crane scale', false, 2, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ03', 'Platform scale', false, 3, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ04', 'Electronic scale (bench or floor)', false, 4, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ05', 'Precision or analytical balance', false, 5, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ06', 'Automatic weighing or packing machine', false, 6, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ07', 'Beam scale', false, 7, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ08', 'Spring balance', false, 8, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ09', 'Counter scale', false, 9, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ10', 'Iron or steel test weights', false, 10, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ11', 'Brass test weights', false, 11, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ12', 'Milligram weight set', false, 12, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ13', 'Linear measure (tape, rod or rule)', false, 13, 'Length', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ14', 'Automatic length measuring machine', false, 14, 'Length', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ15', 'Liquid measure (can, jug or graduated measure)', false, 15, 'Volume', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ16', 'Liquid storage tank', false, 16, 'Volume', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ17', 'Tank lorry or bowser', false, 17, 'Volume', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ18', 'Flow meter, fuel pump or filler', false, 18, 'Volume', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ19', 'Automatic liquid filling machine', false, 19, 'Volume', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ20', 'LPG, CNG or LNG dispenser', false, 20, 'Mass', NULL, NULL),
  ('G_EQUIPMENT_TYPE', 'EQ21', 'Other (specify)', true, 21, 'Any', NULL, NULL),
  ('G_EQUIPMENT_UNIT', 'U01', 'mg', false, 1, 'Mass', 'kg', 0.000001),
  ('G_EQUIPMENT_UNIT', 'U02', 'g', false, 2, 'Mass', 'kg', 0.001),
  ('G_EQUIPMENT_UNIT', 'U03', 'kg', false, 3, 'Mass', 'kg', 1),
  ('G_EQUIPMENT_UNIT', 'U04', 'metric ton', false, 4, 'Mass', 'kg', 1000),
  ('G_EQUIPMENT_UNIT', 'U05', 'ml', false, 5, 'Volume', 'litre', 0.001),
  ('G_EQUIPMENT_UNIT', 'U06', 'litre', false, 6, 'Volume', 'litre', 1),
  ('G_EQUIPMENT_UNIT', 'U07', 'cubic metre', false, 7, 'Volume', 'litre', 1000),
  ('G_EQUIPMENT_UNIT', 'U08', 'mm', false, 8, 'Length', 'metre', 0.001),
  ('G_EQUIPMENT_UNIT', 'U09', 'cm', false, 9, 'Length', 'metre', 0.01),
  ('G_EQUIPMENT_UNIT', 'U10', 'metre', false, 10, 'Length', 'metre', 1),
  ('G_EQUIPMENT_UNIT', 'U11', 'Other (specify)', true, 11, 'Any', NULL, NULL);

INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
SELECT t.id, s.code, s.label, s.requires_text, s.sort_order, true
  FROM phase7_lookup_seed s JOIN lookup_types t ON t.code = s.type_code
ON CONFLICT (type_id, code) DO UPDATE SET
  label = EXCLUDED.label,
  requires_text = EXCLUDED.requires_text,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS section_g_unit_conversions (
  unit_id integer PRIMARY KEY REFERENCES lookup_values(id),
  base_unit text,
  factor_to_base numeric,
  CHECK ((base_unit IS NULL AND factor_to_base IS NULL) OR
         (base_unit IS NOT NULL AND factor_to_base > 0))
);

INSERT INTO section_g_unit_conversions (unit_id, base_unit, factor_to_base)
SELECT v.id, s.base_unit, s.factor
  FROM phase7_lookup_seed s
  JOIN lookup_types t ON t.code = s.type_code
  JOIN lookup_values v ON v.type_id = t.id AND v.code = s.code
 WHERE s.type_code IN ('G_PRESSURE_UNIT', 'G_HEATING_UNIT', 'G_EQUIPMENT_UNIT')
ON CONFLICT (unit_id) DO UPDATE SET
  base_unit = EXCLUDED.base_unit,
  factor_to_base = EXCLUDED.factor_to_base;

INSERT INTO lookup_value_links (parent_value_id, child_value_id)
SELECT equipment.id, unit.id
  FROM phase7_lookup_seed e
  JOIN phase7_lookup_seed u ON u.type_code = 'G_EQUIPMENT_UNIT'
    AND (e.unit_group = 'Any' OR u.unit_group = 'Any' OR e.unit_group = u.unit_group)
  JOIN lookup_types et ON et.code = e.type_code
  JOIN lookup_values equipment ON equipment.type_id = et.id AND equipment.code = e.code
  JOIN lookup_types ut ON ut.code = u.type_code
  JOIN lookup_values unit ON unit.type_id = ut.id AND unit.code = u.code
 WHERE e.type_code = 'G_EQUIPMENT_TYPE'
ON CONFLICT DO NOTHING;

ALTER TABLE critical_machines
  ADD COLUMN IF NOT EXISTS machine_option_id integer REFERENCES industry_machine_options(id);

ALTER TABLE machinery_age_profile
  ALTER COLUMN machine_count DROP NOT NULL,
  ALTER COLUMN machine_count DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS share_pct numeric(5,2);

ALTER TABLE boilers_pressure_vessels
  ADD COLUMN IF NOT EXISTS record_kind text,
  ADD COLUMN IF NOT EXISTS equipment_number text,
  ADD COLUMN IF NOT EXISTS type_id integer REFERENCES lookup_values(id),
  ADD COLUMN IF NOT EXISTS type_other_text text,
  ADD COLUMN IF NOT EXISTS working_pressure_raw numeric,
  ADD COLUMN IF NOT EXISTS pressure_unit_id integer REFERENCES lookup_values(id),
  ADD COLUMN IF NOT EXISTS pressure_unit_other_text text,
  ADD COLUMN IF NOT EXISTS capacity_litres numeric,
  ADD COLUMN IF NOT EXISTS heating_surface_raw numeric,
  ADD COLUMN IF NOT EXISTS heating_surface_unit_id integer REFERENCES lookup_values(id),
  ADD COLUMN IF NOT EXISTS heating_surface_unit_other_text text,
  ADD COLUMN IF NOT EXISTS working_pressure_bar numeric,
  ADD COLUMN IF NOT EXISTS pressure_conversion_factor numeric,
  ADD COLUMN IF NOT EXISTS heating_surface_m2 numeric,
  ADD COLUMN IF NOT EXISTS heating_conversion_factor numeric,
  ADD COLUMN IF NOT EXISTS conversion_requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_data jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_section_g_equipment_number_unique
  ON boilers_pressure_vessels (response_id, lower(equipment_number))
  WHERE equipment_number IS NOT NULL;

ALTER TABLE weights_measures_equipment
  ADD COLUMN IF NOT EXISTS equipment_type_id integer REFERENCES lookup_values(id),
  ADD COLUMN IF NOT EXISTS equipment_other_text text,
  ADD COLUMN IF NOT EXISTS capacity_value_raw numeric,
  ADD COLUMN IF NOT EXISTS capacity_unit_id integer REFERENCES lookup_values(id),
  ADD COLUMN IF NOT EXISTS capacity_unit_other_text text,
  ADD COLUMN IF NOT EXISTS capacity_value_converted numeric,
  ADD COLUMN IF NOT EXISTS capacity_unit_converted text,
  ADD COLUMN IF NOT EXISTS conversion_factor_used numeric,
  ADD COLUMN IF NOT EXISTS conversion_requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_data jsonb;

ALTER TABLE sec_g_technology
  ADD COLUMN IF NOT EXISTS has_innovation_plan boolean,
  ADD COLUMN IF NOT EXISTS machinery_age_legacy_counts jsonb;

DO $$
DECLARE age_type_id integer;
BEGIN
  SELECT id INTO age_type_id FROM lookup_types WHERE code = 'MACHINE_AGE';
  IF age_type_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM survey_questions WHERE question_code = 'G_MACHINERY_AGE'
  ) THEN
    RAISE EXCEPTION 'The machinery-age question or MACHINE_AGE lookup is missing.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM lookup_values WHERE type_id = age_type_id AND is_active) THEN
    RAISE EXCEPTION 'The MACHINE_AGE lookup has no active categories.';
  END IF;
  UPDATE survey_questions
     SET answer_type = 'SHARE_PERCENT', lookup_type_id = age_type_id,
         stored_in = 'machinery_age_profile'
   WHERE question_code = 'G_MACHINERY_AGE';

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'machinery_age_profile'::regclass
       AND conname = 'machinery_age_profile_share_pct_check'
  ) THEN
    ALTER TABLE machinery_age_profile
      ADD CONSTRAINT machinery_age_profile_share_pct_check
      CHECK (share_pct BETWEEN 0 AND 100) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'machinery_age_profile'::regclass
       AND conname = 'machinery_age_profile_count_or_share_check'
  ) THEN
    ALTER TABLE machinery_age_profile
      ADD CONSTRAINT machinery_age_profile_count_or_share_check
      CHECK ((machine_count IS NOT NULL) <> (share_pct IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'boilers_pressure_vessels'::regclass
       AND conname = 'section_g_vessel_entry_check'
  ) THEN
    ALTER TABLE boilers_pressure_vessels ADD CONSTRAINT section_g_vessel_entry_check CHECK (
      record_kind IS NULL OR (
        record_kind IN ('BOILER', 'VESSEL') AND
        equipment_number IS NOT NULL AND equipment_number ~ '^[A-Za-z0-9/-]+$' AND
        type_id IS NOT NULL AND working_pressure_raw IS NOT NULL AND working_pressure_raw > 0 AND
        trunc(working_pressure_raw, 3) = working_pressure_raw AND pressure_unit_id IS NOT NULL AND
        ((pressure_conversion_factor IS NULL AND working_pressure_bar IS NULL) OR
         (pressure_conversion_factor > 0 AND working_pressure_bar IS NOT NULL AND
          working_pressure_bar = working_pressure_raw * pressure_conversion_factor)) AND
        ((record_kind = 'VESSEL' AND capacity_litres IS NOT NULL AND capacity_litres > 0 AND
          trunc(capacity_litres, 3) = capacity_litres AND heating_surface_raw IS NULL AND
          heating_surface_unit_id IS NULL AND heating_conversion_factor IS NULL AND heating_surface_m2 IS NULL) OR
         (record_kind = 'BOILER' AND capacity_litres IS NULL AND heating_surface_raw IS NOT NULL AND
          heating_surface_raw > 0 AND trunc(heating_surface_raw, 3) = heating_surface_raw AND
          heating_surface_unit_id IS NOT NULL AND
          ((heating_conversion_factor IS NULL AND heating_surface_m2 IS NULL) OR
           (heating_conversion_factor > 0 AND heating_surface_m2 IS NOT NULL AND
            heating_surface_m2 = heating_surface_raw * heating_conversion_factor)))) AND
        conversion_requires_review =
          (pressure_conversion_factor IS NULL OR (record_kind = 'BOILER' AND heating_conversion_factor IS NULL))
      )
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'weights_measures_equipment'::regclass
       AND conname = 'section_g_weights_entry_check'
  ) THEN
    ALTER TABLE weights_measures_equipment ADD CONSTRAINT section_g_weights_entry_check CHECK (
      equipment_type_id IS NULL OR (
        quantity IS NOT NULL AND quantity >= 1 AND capacity_value_raw IS NOT NULL AND
        capacity_value_raw > 0 AND trunc(capacity_value_raw, 3) = capacity_value_raw AND
        capacity_unit_id IS NOT NULL AND
        ((conversion_factor_used IS NULL AND capacity_value_converted IS NULL AND
          capacity_unit_converted IS NULL AND conversion_requires_review) OR
         (conversion_factor_used > 0 AND capacity_unit_converted IS NOT NULL AND
          capacity_value_converted IS NOT NULL AND
          capacity_value_converted = capacity_value_raw * conversion_factor_used AND
          NOT conversion_requires_review))
      )
    ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM survey_questions q
    JOIN matrix_items mi ON mi.question_id = q.id
    WHERE q.question_code = 'G_INNOVATION'
  ) OR EXISTS (
    SELECT 1 FROM survey_questions q
    JOIN matrix_items mi ON mi.question_id = q.id
    WHERE q.question_code = 'G_INNOVATION'
      AND (mi.answer_type <> 'CHOICE' OR mi.scale_type_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Innovation must have choice matrix rows with configured scales.';
  END IF;
END $$;

INSERT INTO lookup_values (type_id, code, label, requires_text, sort_order, is_active)
SELECT DISTINCT mi.scale_type_id, 'NO_PLAN', 'No Plan', false, 999, true
  FROM matrix_items mi JOIN survey_questions q ON q.id = mi.question_id
 WHERE q.question_code = 'G_INNOVATION'
ON CONFLICT (type_id, code) DO UPDATE SET label = EXCLUDED.label, is_active = true;

INSERT INTO survey_questions
  (section_id, question_code, question_no, question_text, answer_type, lookup_type_id, is_required, stored_in)
SELECT section_id, 'G_INNOVATION_GATE', 'xv', 'Innovation and upgrading activities planned?',
       'YES_NO', NULL, true, 'sec_g_technology.has_innovation_plan'
  FROM survey_questions WHERE question_code = 'G_INNOVATION'
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
-- SELECT count(*) AS machines, count(DISTINCT unit_type_id) AS industries FROM industry_machine_options;
-- SELECT t.code, count(*) FROM lookup_values v JOIN lookup_types t ON t.id = v.type_id
--  WHERE t.code LIKE 'G\_%' ESCAPE '\' GROUP BY t.code ORDER BY t.code;
-- SELECT count(*) AS historical_count_rows FROM machinery_age_profile
--  WHERE machine_count IS NOT NULL AND share_pct IS NULL;
-- SELECT question_code, answer_type, lookup_type_id FROM survey_questions
--  WHERE question_code IN ('G_MACHINERY_AGE', 'G_INNOVATION', 'G_INNOVATION_GATE');
-- SELECT mi.item_code, v.code FROM matrix_items mi JOIN survey_questions q ON q.id = mi.question_id
--  LEFT JOIN lookup_values v ON v.type_id = mi.scale_type_id AND v.code = 'NO_PLAN' AND v.is_active
--  WHERE q.question_code = 'G_INNOVATION' ORDER BY mi.sort_order;
