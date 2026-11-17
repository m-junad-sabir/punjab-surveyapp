# L5 List Pressure Vessels & Boilers: 

Data Entry Forms — Developer Brief (AI-Agent Readable)

Two parameters sharing the same pressure-unit list and conversion logic:

- **Pressure Vessels** (one row per vessel)
- **Boilers** (one row per boiler)

Both preserve raw values/units as entered; converted values (pressure in **bar**, heating surface in **m²**) are optional/recommended.

---

## 1. Pressure Vessels

### 1.1 Intent

The enumerator records each pressure vessel in an industrial unit on **one row**, with its number, category, working pressure and capacity in litres. Optional: store pressure in **bar** using the factors in `Lists`, always keeping the raw value and unit as entered.

### 1.2 Fields

| # | Field name | Input type | Required | Source of values | Validation / behaviour | Notes |
|---|-----------|-----------|----------|------------------|------------------------|-------|
| 1 | Vessel number | Text (alphanumeric) | Yes | Typed by enumerator | Letters, digits and hyphen or slash allowed. Must not repeat within the same survey. | One row per vessel. |
| 2 | Type (category) | Dropdown (single select) | Yes | `Lists` column C | Must be one of the listed values. | If the last category (`J - Any other`) is chosen, show a required "Please specify" text box. |
| 3 | Working pressure | Number (decimal allowed) | Yes | Typed by enumerator | Greater than 0. Up to 3 decimal places. | Taken as gauge pressure, as normally printed on the nameplate. |
| 3.1 | Working pressure unit | Dropdown (single select) | Yes | `Lists` column E | Must be one of the listed values. | Same list as the Boiler Form. If `Other` is chosen, show a required "Please specify" text box. |
| 4 | Capacity (litres) | Number (decimal allowed) | Yes | Typed by enumerator | Greater than 0. Up to 3 decimal places. | Always in litres — no unit dropdown. Label the field **"Capacity (litres)"**. |

### 1.3 Worked Examples (yellow cells = enumerator entries)

| # | Vessel number | Type (category) | Type: please specify | Working pressure | Pressure unit | Pressure unit: please specify | Capacity (litres) | Pressure in bar |
|---|--------------|----------------|----------------------|------------------|---------------|-------------------------------|-------------------|-----------------|
| 1 | V-201 | A - Compressed air receivers | | 10 | bar | | 500 | 10 |
| 2 | V-202 | F - Hydrogen storage tanks | | 150 | psi | | 2000 | 10.34214 |
| 3 | V-203 | H - Urea reactors | | 2.5 | MPa | | 12000 | 25 |

### 1.4 Conversion (recommended)

```
pressure_bar = working_pressure × factor_to_bar(working_pressure_unit)
```

Raw `working_pressure` and `working_pressure_unit` are always preserved.

---

## 2. Boilers

### 2.1 Intent

The enumerator records each boiler in an industrial unit on **one row**, with its number, type, working pressure and heating surface. Value and unit are entered together for pressure and heating surface. Optional: store pressure in **bar** and heating surface in **m²** using the factors in `Lists`, always keeping the raw value and unit as entered.

### 2.2 Fields

| # | Field name | Input type | Required | Source of values | Validation / behaviour | Notes |
|---|-----------|-----------|----------|------------------|------------------------|-------|
| 1 | Boiler number | Text (alphanumeric) | Yes | Typed by enumerator | Letters, digits and hyphen or slash allowed. Must not repeat within the same survey. | One row per boiler. |
| 2 | Type of boiler | Dropdown (single select) | Yes | `Lists` column A | Must be one of the listed values. | If `Other` is chosen, show a required "Please specify" text box. |
| 3 | Working pressure | Number (decimal allowed) | Yes | Typed by enumerator | Greater than 0. Up to 3 decimal places. | Taken as gauge pressure, as normally printed on the nameplate. |
| 3.1 | Working pressure unit | Dropdown (single select) | Yes | `Lists` column E | Must be one of the listed values. | If `Other` is chosen, show a required "Please specify" text box. |
| 4 | Heating surface | Number (decimal allowed) | Yes | Typed by enumerator | Greater than 0. Up to 3 decimal places. | |
| 4.1 | Heating surface unit | Dropdown (single select) | Yes | `Lists` column H | Must be one of the listed values. | If `Other` is chosen, show a required "Please specify" text box. |

### 2.3 Worked Examples (yellow cells = enumerator entries)

| # | Boiler number | Type of boiler | Type: please specify | Working pressure | Pressure unit | Pressure unit: please specify | Heating surface | Heating surface unit | Heating surface unit: please specify | Pressure in bar | Heating surface in m² |
|---|--------------|---------------|----------------------|------------------|---------------|-------------------------------|-----------------|----------------------|-------------------------------------|-----------------|-----------------------|
| 1 | B-101 | Water-tube | | 10 | kgf/cm2 | | 120 | m2 | | 9.80665 | 120 |
| 2 | B-102 | Fire-tube | | 150 | psi | | 1500 | ft2 | | 10.34214 | 139.35456 |
| 3 | B-103 | Other | Electrode boiler | 1.2 | MPa | | 80 | m2 | | 12 | 80 |
| 4 | B-104 | Thermic fluid heater | | 8 | Other | atm | 15 | Other | sq. yard | — | — |

> Row 4 shows `Other` units with no factor → converted values unavailable (store `null`, flag for review).

### 2.4 Conversion (recommended)

```
pressure_bar          = working_pressure   × factor_to_bar(working_pressure_unit)
heating_surface_m2    = heating_surface    × factor_to_m2(heating_surface_unit)
```

Raw values and units are always preserved.

---

## 3. Lists

### 3.1 Boiler type (dropdown values — `Lists` column A)

- Fire-tube
- Water-tube
- Packaged
- Waste heat recovery
- Thermic fluid heater
- Steam generator
- Other

### 3.2 Vessel category (dropdown values — `Lists` column C)

- A - Compressed air receivers
- B - Oxygen receiving tanks
- C - Deaerator
- D - Blow down tanks
- E - CO2 tanks
- F - Hydrogen storage tanks
- G - De-sulfurizing tanks
- H - Urea reactors
- J - Any other

### 3.3 Pressure unit + factor to bar (`Lists` column E)

| Pressure unit | Factor to bar |
|---------------|---------------|
| psi | 0.0689476 |
| MPa | 10 |
| kgf/cm2 | 0.980665 |
| bar | 1 |
| kPa | 0.01 |
| Other | — (no factor) |

### 3.4 Heating surface unit + factor to m² (`Lists` column H)

| Heating surface unit | Factor to m² |
|----------------------|--------------|
| cm2 | 0.0001 |
| m2 | 1 |
| ft2 | 0.09290304 |
| Other | — (no factor) |

---

## 4. Validation Summary

| Field | Rule |
|-------|------|
| Vessel number / Boiler number | Required; letters, digits, hyphen or slash only; unique within the survey. |
| Type (category) / Type of boiler | Required; must be a valid dropdown value; if `Other` / `J - Any other`, required free-text "Please specify". |
| Working pressure | Required; numeric; > 0; max 3 decimal places; gauge pressure. |
| Working pressure unit | Required; valid dropdown value; if `Other`, required free-text "Please specify". |
| Capacity (litres) — vessels | Required; numeric; > 0; max 3 decimal places; no unit dropdown. |
| Heating surface — boilers | Required; numeric; > 0; max 3 decimal places. |
| Heating surface unit — boilers | Required; valid dropdown value; if `Other`, required free-text "Please specify". |

---

## 5. Data Model (recommended)

### 5.1 Pressure vessel row

```json
{
  "vessel_number": "V-202",
  "type_category_code": "F",
  "type_category_label": "F - Hydrogen storage tanks",
  "type_other_text": null,
  "working_pressure_raw": 150,
  "working_pressure_unit_raw": "psi",
  "working_pressure_unit_other_text": null,
  "capacity_litres": 2000,
  "working_pressure_bar": 10.34214,
  "conversion_factor_used": 0.0689476
}
```

### 5.2 Boiler row

```json
{
  "boiler_number": "B-103",
  "type_code": "Other",
  "type_label": "Other",
  "type_other_text": "Electrode boiler",
  "working_pressure_raw": 1.2,
  "working_pressure_unit_raw": "MPa",
  "working_pressure_unit_other_text": null,
  "heating_surface_raw": 80,
  "heating_surface_unit_raw": "m2",
  "heating_surface_unit_other_text": null,
  "working_pressure_bar": 12,
  "heating_surface_m2": 80,
  "pressure_conversion_factor_used": 10,
  "heating_surface_conversion_factor_used": 1
}
```

Rules:

- `*_raw` fields are always preserved.
- Converted fields are optional/recommended.
- If pressure or heating-surface unit is `Other` (no factor): converted value = `null`, factor = `null`.
- `type_other_text` is required when the type/category selected is `Other` / `J - Any other`.

---

## 7. Notes / Constraints

- Pressure is taken as **gauge pressure**, as printed on the nameplate.
- Capacity for vessels is always in **litres** — no unit dropdown.
- Both forms share the same pressure-unit list.
- Raw value + raw unit must always be stored alongside any converted value.