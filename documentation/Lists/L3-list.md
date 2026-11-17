# L3 List Equipment Capacity Entry 

Developer Brief (AI-Agent Readable)

## 1. Purpose

For each kind of weights and measures equipment found in an industrial unit, the enumerator:

1. Picks the **equipment type** (single select).
2. Picks the **unit** (single select).
3. Types the **capacity / denomination** as a number.
4. Types the **number of instruments** of that exact type and capacity.

One entry per row. The form must provide an **Add row** option.

**Example:** 200 weights of 20 kg is one row → Equipment type = `Iron or steel test weights`, Unit = `kg`, Capacity value = `20`, Number of instruments = `200`.

---

## 2. Form Fields

| # | Field name | Input type | Required | Source of values | Validation / behaviour | Notes |
|---|-----------|-----------|----------|------------------|------------------------|-------|
| 1 | Equipment type | Dropdown (single select) | Yes | Equipment List (code + label) | Must be one of the listed values. If `Other` is chosen, show a short text box to name it. | Each equipment value carries a unit group (`Mass`, `Length`, `Volume`, `Any`). |
| 2 | Unit | Dropdown (single select) | Yes | Unit List (code + label) | Must be one of the listed values. Recommended: show only units whose group matches the equipment's group (`Any` shows all). If `Other` is chosen, show a short text box. | SI units only. Local/imperial units (maund, quintal, gallon, inch, foot, yard) deliberately excluded. |
| 3 | Capacity value | Number (decimal allowed) | Yes | Typed by enumerator | Greater than 0. Up to 3 decimal places. No text, no units inside the box. | Maximum capacity of the instrument, or the denomination for weights and measures, expressed in the unit chosen in field 2. |
| 4 | Number of instruments | Whole number | Yes | Typed by enumerator | Integer, 1 or more. No decimals, no text. | How many instruments of this exact type and capacity the unit has (e.g. 200 weights of 20 kg). |

---

## 3. Optional Recommended Behaviour

Store a **converted value** alongside each entry:

- Convert capacity to the base unit of its group using the `Factor to base unit` from the Unit List.
- Base units: **kg** (Mass), **litre** (Volume), **metre** (Length).
- The **raw unit and raw value entered by the enumerator must always be kept** as well.

Converted value formula:

```
converted_value = capacity_value × factor_to_base_unit
converted_unit  = base_unit of the unit's group
```

> For `Other` units (group `Any`, no factor), converted value is not available — store `null`.

---

## 4. Equipment List (dropdown values)

| Code | Equipment type (dropdown value) | Unit group |
|------|--------------------------------|-----------|
| EQ01 | Weigh bridge | Mass |
| EQ02 | Crane scale | Mass |
| EQ03 | Platform scale | Mass |
| EQ04 | Electronic scale (bench or floor) | Mass |
| EQ05 | Precision or analytical balance | Mass |
| EQ06 | Automatic weighing or packing machine | Mass |
| EQ07 | Beam scale | Mass |
| EQ08 | Spring balance | Mass |
| EQ09 | Counter scale | Mass |
| EQ10 | Iron or steel test weights | Mass |
| EQ11 | Brass test weights | Mass |
| EQ12 | Milligram weight set | Mass |
| EQ13 | Linear measure (tape, rod or rule) | Length |
| EQ14 | Automatic length measuring machine | Length |
| EQ15 | Liquid measure (can, jug or graduated measure) | Volume |
| EQ16 | Liquid storage tank | Volume |
| EQ17 | Tank lorry or bowser | Volume |
| EQ18 | Flow meter, fuel pump or filler | Volume |
| EQ19 | Automatic liquid filling machine | Volume |
| EQ20 | LPG, CNG or LNG dispenser | Mass |
| EQ21 | Other | Any |

---

## 5. Unit List (dropdown values + conversion factors)

| Code | Unit (dropdown value) | Unit group | Base unit | Factor to base unit |
|------|----------------------|-----------|-----------|---------------------|
| U01 | mg | Mass | kg | 0.000001 |
| U02 | g | Mass | kg | 0.001 |
| U03 | kg | Mass | kg | 1 |
| U04 | metric ton | Mass | kg | 1000 |
| U05 | ml | Volume | litre | 0.001 |
| U06 | litre | Volume | litre | 1 |
| U07 | cubic metre | Volume | litre | 1000 |
| U08 | mm | Length | metre | 0.001 |
| U09 | cm | Length | metre | 0.01 |
| U10 | metre | Length | metre | 1 |
| U11 | Other | Any | — | — |

---

## 6. Unit-Group Matching Rules

- `Mass` equipment → show only `Mass` units (plus `Other`).
- `Length` equipment → show only `Length` units (plus `Other`).
- `Volume` equipment → show only `Volume` units (plus `Other`).
- `Any` equipment (EQ21 Other) → show **all** units (plus `Other`).

---

## 7. Validation Summary

| Field | Rule |
|-------|------|
| Equipment type | Required; must be a valid dropdown value; if `Other`, free-text name required (short text). |
| Unit | Required; must be a valid dropdown value; recommended filtered by equipment group; if `Other`, free-text unit required (short text). |
| Capacity value | Required; numeric; > 0; max 3 decimal places; no text; no unit string. |
| Number of instruments | Required; integer; ≥ 1; no decimals; no text. |

---

## 8. Data Model (recommended)

Each row stored as:

```json
{
  "equipment_code": "EQ10",
  "equipment_label": "Iron or steel test weights",
  "equipment_other_text": null,
  "unit_group": "Mass",
  "unit_code": "U03",
  "unit_label": "kg",
  "unit_other_text": null,
  "capacity_value_raw": 20,
  "capacity_unit_raw": "kg",
  "number_of_instruments": 200,
  "capacity_value_converted": 20,
  "capacity_unit_converted": "kg",
  "conversion_factor_used": 1
}
```

- `*_raw` fields are always preserved.
- `*_converted` fields are optional/recommended.
- For `Other` unit (U11) with no factor: `capacity_value_converted = null`, `capacity_unit_converted = null`, `conversion_factor_used = null`, and set a review flag.

---


## 10. Notes / Constraints

- SI units only; local or imperial units (maund, quintal, gallon, inch, foot, yard) are deliberately excluded.
- `Other` equipment and `Other` unit each trigger a short free-text box.
- Capacity value expresses the maximum capacity of the instrument, or the denomination for weights and measures, in the unit chosen.
- Number of instruments counts instruments of that exact type and capacity (e.g. 200 weights of 20 kg).