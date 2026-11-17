# Area Measurement Units: SI Units and Units Used in Pakistan

This reference covers **SI (International System of Units) area measurements** and common **land-area units used in Pakistan**. Local land units can vary by province, district, revenue practice, and property type, so confirm the applicable conversion for legal or land-record work.

## 1. SI units for area

The SI unit of area is the **square metre (m²)**. Other metric units are related to it by powers of ten.

| Unit | Symbol | Equivalent in square metres | Common use |
|---|---:|---:|---|
| Square kilometre | km² | 1,000,000 m² | Large regions, districts, land cover |
| Hectare | ha | 10,000 m² | Agriculture, forestry, land management |
| Are | a | 100 m² | Land-area measurement; less common in Pakistan |
| Square metre | m² | 1 m² | Standard SI unit; buildings and plots |

**Note:** The hectare and are are accepted for use with the SI, but they are not SI units themselves. The square metre is the coherent SI unit for area.

## 2. Common land-area units used in Pakistan

The following are commonly encountered in Pakistan, particularly in property, agriculture, and revenue contexts. Conversions involving marla, kanal, and regional units may differ locally.

| Unit | Common relationship | Approximate area in m² | Approximate area in ft² |
|---|---|---:|---:|
| Square foot | 1 ft² | 0.092903 | 1 |
| Square yard (gazz/gaz in property contexts) | 1 yd² = 9 ft² | 0.836127 | 9 |
| Marla (common standard) | 1 marla = 272.25 ft² | 25.2929 | 272.25 |
| Marla (some local schemes) | 1 marla = 225 ft² | 20.903 | 225 |
| Kanal (common standard) | 1 kanal = 20 marla = 5,445 ft² | 505.857 | 5,445 |
| Kanal (where 225 ft² marla is used) | 1 kanal = 20 marla = 4,500 ft² | 418.064 | 4,500 |
| Acre (international) | 1 acre = 4,840 yd² = 43,560 ft² | 4,046.856 | 43,560 |
| Hectare | 1 ha = 10,000 m² | 10,000 | 107,639.1 |
| Square kilometre | 1 km² = 100 ha | 1,000,000 | 10,763,910.4 |

### Important regional/revenue units

| Unit | Common relationship or note | Approximate area |
|---|---|---:|
| Murabba | In many Punjab revenue contexts, 1 murabba = 25 acres | 101,171 m² (about 10.117 ha) |
| Killa | Often used for an acre-sized agricultural field in Punjab; confirm local record convention | Commonly about 1 acre = 4,046.856 m² |
| Square gazz/gaz | Often used informally for square yard in property contexts; terminology can vary | Commonly 0.836127 m² if meaning square yard |

## 3. Quick conversion reference

| From | To | Conversion |
|---|---|---:|
| 1 km² | hectares | 100 ha |
| 1 hectare | m² | 10,000 m² |
| 1 hectare | acres | about 2.47105 acres |
| 1 acre | m² | about 4,046.856 m² |
| 1 acre | kanal | 8 kanals when 1 kanal = 5,445 ft² |
| 1 kanal | marla | 20 marla (common convention) |
| 1 marla | ft² | 272.25 ft² under the 5,445 ft² kanal convention |
| 1 ft² | m² | about 0.092903 m² |
| 1 yd² | m² | about 0.836127 m² |

## 4. Recommendations for GIS, surveys, and land records

- **Store area calculations in square metres (m²)** or square kilometres (km²) for consistent SI-based data management.
- For agriculture and large land parcels, hectares (ha) and acres are practical display units.
- If users expect local land units, display conversions such as kanal/marla or murabba alongside the metric value, but label the convention used.
- Do not apply a single marla, kanal, bigha, or biswa conversion nationwide without confirming the relevant local revenue or housing-scheme standard.
- In GIS, calculate area using an appropriate projected coordinate reference system or a geodesic area method; do not calculate land area directly from longitude/latitude coordinates as though they were planar metres.
- Keep the **original measured area** and the **display conversion** separate where auditability matters.

## 5. Worked examples

Using the common convention of **1 kanal = 5,445 ft²**, **1 marla = 272.25 ft²**, and **1 acre = 8 kanals**:

- **1 kanal** ≈ 505.857 m² ≈ 0.050586 ha.
- **1 marla** ≈ 25.293 m².
- **1 acre** ≈ 4,046.856 m² ≈ 0.404686 ha ≈ 8 kanals.
- **1 murabba** (25 acres under a common Punjab revenue convention) ≈ 101,171 m² ≈ 10.117 ha.

These are reference conversions, not a substitute for the definitions recorded by the relevant land-revenue authority, development authority, or housing scheme.
