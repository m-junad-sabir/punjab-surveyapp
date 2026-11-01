# Product Measurement Units for Manufacturing Industries in Pakistan

## Purpose

This is a compact, general-purpose list of units for recording manufactured product quantities in an industrial survey. It covers common manufacturing sectors in Pakistan without requiring a separate unit for every product type.

## Recommended unit list

| Unit name | Symbol / abbreviation | Best suited for | Example products |
|---|---|---|---|
| Piece | pc | Discrete items | Machinery parts, garments, furniture, tools |
| Unit | unit | One complete item where “piece” is not suitable | Appliances, equipment, assembled products |
| Kilogram | kg | Products measured by mass | Food products, chemicals, plastic granules, textiles |
| Metric tonne | t | Bulk/heavy production | Cement, steel, flour, grains, chemicals |
| Gram | g | Small-mass products | Packaged food, pharmaceuticals, small components |
| Litre | L | Liquids | Beverages, paints, oils, detergents, chemicals |
| Millilitre | mL | Small liquid quantities | Cosmetics, medicines, small bottles |
| Cubic metre | m³ | Bulk materials measured by volume | Concrete, gas, timber, bulk materials |
| Metre | m | Continuous or linear products | Wire, cable, pipe, fabric, profiles |
| Square metre | m² | Products sold by surface area | Glass, sheet metal, tiles, boards, fabric |
| Square foot | ft² | Products commonly traded in square feet | Plywood, glass, carpets, panels |
| Roll | roll | Rolled or wound products | Fabric, paper, film, wire, foil |
| Sheet | sheet | Flat products counted individually | Metal sheets, paperboard, plywood, glass |
| Pair | pair | Products supplied as two matching items | Shoes, gloves, certain fittings |
| Set | set | Products supplied as a group | Tool sets, furniture sets, equipment kits |
| Pack / Packet | pack | Consumer or industrial packaged goods | Snacks, seeds, fasteners, small components |
| Box / Carton | box / carton | Boxed or carton-packed products | Packaged goods, electronics, medicines |
| Bottle | bottle | Bottled products | Drinks, oils, cleaning products |
| Bag / Sack | bag / sack | Bagged bulk products | Cement, flour, fertilizer, animal feed |
| Dozen | doz | Products counted in groups of twelve | Small household goods, garments, accessories |
| Thousand pieces | 1,000 pcs | High-volume small-item production | Bricks, fasteners, components, packaging items |

## Practical implementation recommendations

1. **Keep the unit list standardized.** Avoid allowing surveyors to enter arbitrary spellings such as `Kg`, `KG`, and `kilograms`; use a controlled dropdown.
2. **Separate the product from its unit.** A product record should reference a standard unit, while production records store the quantity and reporting period.
3. **Allow a primary unit and optional alternate unit.** For example, a manufacturer may report steel in metric tonnes and also track individual pieces.
4. **Do not assume packaging equals product quantity.** One carton may contain a different number of items for different products. If needed, record `units_per_pack` separately.
5. **Keep conversions explicit.** Store conversion factors only when they are known and valid for that specific product (for example, bags per tonne); do not assume every bag has the same weight.
6. **Use metric units as the default.** Prefer kg, t, L, m³, m, and m² for consistent reporting, while retaining common trade units such as piece, pair, roll, bag, and carton.
7. **Make units configurable.** If a surveyed industry requires a special unit, an administrator should be able to add it without changing application code.

## Suggested minimum dropdown for a first release

If you want to keep the form especially short, start with these 15 options:

- Piece (pc)
- Unit
- Kilogram (kg)
- Metric tonne (t)
- Gram (g)
- Litre (L)
- Millilitre (mL)
- Cubic metre (m³)
- Metre (m)
- Square metre (m²)
- Square foot (ft²)
- Roll
- Sheet
- Set
- Pack / Packet

Add `pair`, `box/carton`, `bottle`, `bag/sack`, `dozen`, and `thousand pieces` if they are useful for the product categories included in your survey.

## Important distinction

These are **product quantity units**, not area units or measures of production capacity. For example, `tonne` can describe output produced during a reporting period, while `tonnes per day` describes production capacity or production rate. Keep quantity, reporting period, and capacity/rate in separate fields.
