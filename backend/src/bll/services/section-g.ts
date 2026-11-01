import { EntityManager } from 'typeorm';
import type { SubmittedQuestion, SurveyAnswers } from './survey-response-writer';

interface LookupValue {
  id: number;
  type_code: string;
  code: string;
  label: string;
  requires_text: boolean;
  is_active: boolean;
  has_conversion: boolean;
  base_unit: string | null;
  factor_to_base: string | null;
}

interface MachineOption {
  id: number;
  machine_name: string;
  specification: string;
}

interface SelectedLookup {
  option: LookupValue;
  otherText: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === 'string' && !value.trim());
}

function selectedId(value: unknown): number | null {
  const raw = isRecord(value) ? value.option_id : value;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  if (typeof raw === 'string' && !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id >= 0 ? id : null;
}

function otherText(value: unknown, label: string): string {
  const text = isRecord(value) ? value.other_text : undefined;
  if (typeof text !== 'string' || !text.trim()) throw new Error(`Specify ${label}.`);
  return text.trim();
}

function selectedLookup(
  value: unknown,
  type: string,
  label: string,
  options: LookupValue[],
): SelectedLookup {
  const id = selectedId(value);
  const option = options.find((candidate) =>
    candidate.id === id && candidate.type_code === type && candidate.is_active,
  );
  if (!option) throw new Error(`Choose a valid ${label}.`);
  return {
    option,
    otherText: option.requires_text ? otherText(value, `the other ${label}`) : null,
  };
}

function conversion(option: LookupValue, label: string): { factor: string | null; baseUnit: string | null } {
  if (!option.has_conversion) throw new Error(`Conversion information is unavailable for ${label}. Refresh the form.`);
  if (option.requires_text) {
    if (option.factor_to_base !== null || option.base_unit !== null) {
      throw new Error(`The other ${label} has an invalid conversion.`);
    }
    return { factor: null, baseUnit: null };
  }
  if (
    option.factor_to_base === null || !Number.isFinite(Number(option.factor_to_base)) ||
    Number(option.factor_to_base) <= 0 || !option.base_unit
  ) {
    throw new Error(`Conversion information is unavailable for ${label}. Refresh the form.`);
  }
  return { factor: option.factor_to_base, baseUnit: option.base_unit };
}

function positiveDecimal(value: unknown, label: string): string {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error(`${label} must be greater than zero with at most three decimal places.`);
  }
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(text) ||
      !Number.isFinite(Number(text)) || Number(text) <= 0) {
    throw new Error(`${label} must be greater than zero with at most three decimal places.`);
  }
  return text;
}

function wholeNumber(value: unknown, label: string, minimum: number): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error(`${label} must be a whole number from ${minimum} to 2147483647.`);
  }
  const text = String(value).trim();
  const parsed = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(parsed) || parsed < minimum || parsed > 2_147_483_647) {
    throw new Error(`${label} must be a whole number from ${minimum} to 2147483647.`);
  }
  return parsed;
}

function answerRows(answers: SurveyAnswers, code: string): Record<string, unknown>[] | null {
  const value = answers.get(code);
  if (isBlank(value)) return null;
  if (!Array.isArray(value) || value.some((row) => !isRecord(row))) {
    throw new Error(`${code}: provide valid equipment rows.`);
  }
  return value as Record<string, unknown>[];
}

function legacyFields(row: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  const legacy = Object.fromEntries(keys.filter((key) => !isBlank(row[key])).map((key) => [key, row[key]]));
  return Object.keys(legacy).length ? legacy : null;
}

async function normalizeMachines(manager: EntityManager, answers: SurveyAnswers): Promise<void> {
  const rows = answerRows(answers, 'G_CRITICAL_MACHINES');
  if (!rows) return;
  const industryId = selectedId(answers.get('A_UNIT_TYPE'));
  const normalized: Record<string, unknown>[] = [];

  for (const row of rows) {
    let name: string;
    let machine: MachineOption | null = null;
    const rawName = row.machine_name;
    const machineId = typeof rawName === 'string' ? null : selectedId(rawName);
    if (typeof rawName === 'string' && rawName.trim()) {
      name = rawName.trim();
    } else {
      if (industryId === null || industryId < 1) {
        throw new Error('Select a Type of Unit before choosing a critical machine.');
      }
      if (machineId === 0) {
        name = otherText(rawName, 'the other machine name');
      } else {
        if (machineId === null || machineId < 1) throw new Error('Choose a machine name for each critical-machine row.');
        const found = await manager.query(
          `SELECT id, machine_name, specification FROM industry_machine_options
            WHERE id = $1 AND unit_type_id = $2 AND is_active = true`,
          [machineId, industryId],
        ) as MachineOption[];
        machine = found[0] ?? null;
        if (!machine) throw new Error('Choose a machine belonging to the selected Type of Unit.');
        name = machine.machine_name;
      }
    }

    let specification: string | null = null;
    const rawSpecification = row.specification;
    if (typeof rawSpecification === 'string') {
      specification = rawSpecification.trim() || null;
    } else if (!isBlank(rawSpecification)) {
      const specificationId = selectedId(rawSpecification);
      if (specificationId === 0) {
        specification = otherText(rawSpecification, 'the other machine specification');
      } else {
        if (specificationId === null || industryId === null || industryId < 1) {
          throw new Error('Choose a valid specification for the selected machine.');
        }
        if (!machine) {
          const found = await manager.query(
            `SELECT id, machine_name, specification FROM industry_machine_options
              WHERE id = $1 AND unit_type_id = $2 AND is_active = true`,
            [specificationId, industryId],
          ) as MachineOption[];
          machine = found[0] ?? null;
        }
        if (!machine || machine.id !== specificationId ||
            machine.machine_name.trim().toLowerCase() !== name.toLowerCase()) {
          throw new Error('Choose a specification belonging to the selected machine.');
        }
        specification = machine.specification;
      }
    }
    const quantity = isBlank(row.quantity) ? null : wholeNumber(row.quantity, 'Machine quantity', 0);
    normalized.push({
      ...row,
      machine_name: name,
      machine_option_id: machine?.id ?? null,
      specification,
      quantity,
    });
  }
  answers.set('G_CRITICAL_MACHINES', normalized);
}

async function normalizeEquipment(manager: EntityManager, answers: SurveyAnswers): Promise<void> {
  const vessels = answerRows(answers, 'G_BOILERS');
  const weights = answerRows(answers, 'G_WEIGHTS_MEASURES');
  if (!vessels?.length && !weights?.length) return;

  const options = await manager.query(
    `SELECT v.id, t.code AS type_code, v.code, v.label, v.requires_text, v.is_active,
            c.unit_id IS NOT NULL AS has_conversion, c.base_unit, c.factor_to_base::text AS factor_to_base
       FROM lookup_values v
       JOIN lookup_types t ON t.id = v.type_id
       LEFT JOIN section_g_unit_conversions c ON c.unit_id = v.id
      WHERE t.code = ANY($1::text[])`,
    [['G_BOILER_TYPE', 'G_VESSEL_CATEGORY', 'G_PRESSURE_UNIT', 'G_HEATING_UNIT',
      'G_EQUIPMENT_TYPE', 'G_EQUIPMENT_UNIT']],
  ) as LookupValue[];
  const links = weights?.length
    ? await manager.query(
      `SELECT l.parent_value_id, l.child_value_id
         FROM lookup_value_links l
         JOIN lookup_values p ON p.id = l.parent_value_id
         JOIN lookup_types pt ON pt.id = p.type_id
         JOIN lookup_values c ON c.id = l.child_value_id
         JOIN lookup_types ct ON ct.id = c.type_id
        WHERE pt.code = 'G_EQUIPMENT_TYPE' AND ct.code = 'G_EQUIPMENT_UNIT'`,
    ) as Array<{ parent_value_id: number; child_value_id: number }>
    : [];
  const numbers = new Set<string>();

  if (vessels) {
    const normalized = vessels.map((row) => {
      const kindId = selectedId(row.record_kind);
      const kind = row.record_kind === 'BOILER' || kindId === 1
        ? 'BOILER'
        : row.record_kind === 'VESSEL' || kindId === 2 ? 'VESSEL' : null;
      if (!kind) {
        throw new Error('Choose boiler or pressure vessel and complete the new fields; older entries must be reviewed.');
      }
      if (typeof row.equipment_number !== 'string' ||
          !/^[A-Za-z0-9/-]+$/.test(row.equipment_number.trim())) {
        throw new Error('A boiler or vessel number must contain only letters, digits, hyphens, or slashes.');
      }
      const equipmentNumber = row.equipment_number.trim();
      const numberKey = equipmentNumber.toLowerCase();
      if (numbers.has(numberKey)) throw new Error('Boiler and vessel numbers must be unique within the survey.');
      numbers.add(numberKey);
      const type = selectedLookup(
        kind === 'BOILER' ? row.boiler_type_id : row.vessel_category_id,
        kind === 'BOILER' ? 'G_BOILER_TYPE' : 'G_VESSEL_CATEGORY',
        kind === 'BOILER' ? 'boiler type' : 'vessel category',
        options,
      );
      const pressure = selectedLookup(row.pressure_unit_id, 'G_PRESSURE_UNIT', 'pressure unit', options);
      const pressureConversion = conversion(pressure.option, 'pressure unit');
      if (pressureConversion.baseUnit && pressureConversion.baseUnit !== 'bar') {
        throw new Error('Pressure units must convert to bar.');
      }
      const heating = kind === 'BOILER'
        ? selectedLookup(row.heating_surface_unit_id, 'G_HEATING_UNIT', 'heating surface unit', options)
        : null;
      const heatingConversion = heating ? conversion(heating.option, 'heating surface unit') : null;
      if (heatingConversion?.baseUnit && heatingConversion.baseUnit !== 'm2') {
        throw new Error('Heating surface units must convert to m2.');
      }
      return {
        ...row,
        record_kind: kind,
        equipment_number: equipmentNumber,
        vessel_type: type.option.label,
        type_id: type.option.id,
        type_other_text: type.otherText,
        working_pressure_raw: positiveDecimal(row.working_pressure_raw, 'Working pressure'),
        pressure_unit_id: pressure.option.id,
        pressure_unit_other_text: pressure.otherText,
        pressure_factor: pressureConversion.factor,
        capacity_litres: kind === 'VESSEL' ? positiveDecimal(row.capacity_litres, 'Capacity (litres)') : null,
        heating_surface_raw: kind === 'BOILER' ? positiveDecimal(row.heating_surface_raw, 'Heating surface') : null,
        heating_surface_unit_id: heating?.option.id ?? null,
        heating_surface_unit_other_text: heating?.otherText ?? null,
        heating_factor: heatingConversion?.factor ?? null,
        legacy_data: legacyFields(row, ['vessel_type', 'capacity_tph', 'heating_surface']),
      };
    });
    answers.set('G_BOILERS', normalized);
  }

  if (weights) {
    const normalized = weights.map((row) => {
      const equipment = selectedLookup(row.equipment_type_id, 'G_EQUIPMENT_TYPE', 'equipment type', options);
      const unit = selectedLookup(row.equipment_unit_id, 'G_EQUIPMENT_UNIT', 'equipment unit', options);
      if (!links.some((link) =>
        link.parent_value_id === equipment.option.id && link.child_value_id === unit.option.id,
      )) {
        throw new Error('Choose a unit compatible with the weights and measures equipment type.');
      }
      const unitConversion = conversion(unit.option, 'equipment unit');
      if (unitConversion.baseUnit && !['kg', 'litre', 'metre'].includes(unitConversion.baseUnit)) {
        throw new Error('The equipment unit has an invalid base unit.');
      }
      return {
        ...row,
        equipment_type: equipment.option.label,
        equipment_type_id: equipment.option.id,
        equipment_other_text: equipment.otherText,
        equipment_unit_id: unit.option.id,
        equipment_unit_other_text: unit.otherText,
        capacity_value_raw: positiveDecimal(row.capacity_value_raw, 'Capacity / denomination'),
        number_of_instruments: wholeNumber(row.number_of_instruments, 'Number of instruments', 1),
        conversion_factor: unitConversion.factor,
        converted_unit: unitConversion.baseUnit,
        legacy_data: legacyFields(row, ['equipment_type', 'quantity', 'capacity']),
      };
    });
    answers.set('G_WEIGHTS_MEASURES', normalized);
  }
}

async function normalizeUtilization(manager: EntityManager, answers: SurveyAnswers): Promise<void> {
  const rate = answers.get('G_UTILIZATION_RATE');
  const raw = isRecord(rate) ? rate.utilization_rate_id : rate;
  const reason = answers.get('G_UNDERUTILIZATION_REASON');
  const hasReason = Array.isArray(reason) ? reason.length > 0
    : isRecord(reason) && Array.isArray(reason.option_ids) ? reason.option_ids.length > 0
      : isRecord(reason) ? Object.keys(reason).length > 0 : !isBlank(reason);
  if (isBlank(raw)) {
    if (hasReason) throw new Error('Select a capacity utilization rate before saving its reason.');
    return;
  }
  const id = selectedId(raw);
  if (id === null || id < 1) throw new Error('Choose a valid capacity utilization rate.');
  const found = await manager.query(
    `SELECT v.code FROM lookup_values v JOIN lookup_types t ON t.id = v.type_id
      WHERE v.id = $1 AND v.is_active = true AND t.code = 'UTILIZATION_BAND'`,
    [id],
  ) as Array<{ code: string }>;
  const code = found[0]?.code;
  if (!code || !['U40_59', 'U60_74', 'U75_84', 'U85_95', 'ABOVE_95'].includes(code)) {
    throw new Error('The capacity utilization band is invalid or its 75% threshold is not configured.');
  }
  if (!['U40_59', 'U60_74'].includes(code)) answers.delete('G_UNDERUTILIZATION_REASON');
}

async function normalizeInnovation(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
): Promise<void> {
  if (!questions.some((question) => question.question_code === 'G_INNOVATION_GATE')) return;
  const gate = answers.get('G_INNOVATION_GATE');
  if (typeof gate !== 'boolean') {
    throw new Error('Select Yes or No for innovation activities in the updated form.');
  }
  if (gate) return;
  const question = questions.find((candidate) => candidate.question_code === 'G_INNOVATION');
  if (!question || question.answer_type !== 'MATRIX') {
    throw new Error('Innovation matrix rows are unavailable. Refresh the survey form.');
  }
  const rows = await manager.query(
    `SELECT mi.id AS item_id, mi.answer_type, v.id AS option_id
       FROM matrix_items mi
       LEFT JOIN lookup_values v ON v.type_id = mi.scale_type_id AND v.code = 'NO_PLAN' AND v.is_active = true
      WHERE mi.question_id = $1
      ORDER BY mi.sort_order, mi.id`,
    [question.id],
  ) as Array<{ item_id: number; answer_type: string; option_id: number | null }>;
  if (!rows.length || rows.some((row) => row.answer_type !== 'CHOICE' || row.option_id === null)) {
    throw new Error('Every innovation activity must have an active No Plan option.');
  }
  answers.set('G_INNOVATION', Object.fromEntries(
    rows.map((row) => [String(row.item_id), { choice_value_id: row.option_id }]),
  ));
}

export async function normalizeSectionGAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
): Promise<void> {
  const age = answers.get('G_MACHINERY_AGE');
  if (Array.isArray(age)) {
    if (age.length > 0) {
      throw new Error('This draft contains machinery-age counts. Review them and re-enter percentage shares.');
    }
    answers.set('G_MACHINERY_AGE', {});
  } else if (isRecord(age) && ('legacy_counts' in age || 'shares' in age)) {
    if (!Array.isArray(age.legacy_counts) || !isRecord(age.shares) ||
        Object.keys(age).some((key) => key !== 'legacy_counts' && key !== 'shares')) {
      throw new Error('The saved machinery-age counts or shares have an invalid format.');
    }
    answers.set('G_MACHINERY_AGE_LEGACY_COUNTS', age.legacy_counts);
    answers.set('G_MACHINERY_AGE', age.shares);
  }
  await normalizeUtilization(manager, answers);
  await normalizeMachines(manager, answers);
  await normalizeEquipment(manager, answers);
  await normalizeInnovation(manager, answers, questions);
}
