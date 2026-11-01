import { EntityManager } from 'typeorm';
import { SubmittedQuestion, SurveyAnswers } from './survey-response-writer';

type Row = Record<string, unknown>;

interface EnergySource {
  id: number;
  code: string;
  requires_text: boolean;
}

interface EnergyUnit {
  energy_source_id: number;
  unit_id: number;
}

interface WasteMethod {
  waste_type_id: number;
  method_id: number;
  code: string;
  requires_text: boolean;
}

function record(value: unknown): Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Row
    : {};
}

function number(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function selectionId(value: unknown): number | null {
  const raw = record(value).option_id ?? value;
  const id = number(raw);
  return id !== null && Number.isSafeInteger(id) && id > 0 ? id : null;
}

function selectionIds(value: unknown): number[] | null {
  const selected = Array.isArray(value)
    ? value
    : Array.isArray(record(value).option_ids)
      ? record(value).option_ids as unknown[]
      : null;
  if (!selected) return null;
  const ids = selected.map(selectionId);
  return ids.every((id): id is number => id !== null) ? ids : null;
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && Object.keys(record(value)).length === 0;
}

function rows(value: unknown, label: string): Row[] {
  if (isBlank(value)) return [];
  if (!Array.isArray(value) || value.some((entry) =>
    entry === null || typeof entry !== 'object' || Array.isArray(entry),
  )) {
    throw new Error(`${label} must contain valid rows.`);
  }
  return value.map(record);
}

function rowHasData(row: Row, ignored: string[] = []): boolean {
  return Object.entries(row).some(([key, value]) => !ignored.includes(key) && !isBlank(value));
}

function validateNonNegative(value: unknown, label: string): number | null {
  if (isBlank(value)) return null;
  const parsed = number(value);
  if (parsed === null || parsed < 0) throw new Error(`${label} must be a non-negative number.`);
  if (Number(parsed.toFixed(2)) !== parsed) {
    throw new Error(`${label} must have at most two decimal places.`);
  }
  return parsed;
}

function normalizeShare(value: unknown): number {
  if (isBlank(value)) return 0;
  const parsed = number(value);
  if (parsed === null || parsed < 0 || parsed > 100 ||
      Math.round(parsed * 100) !== parsed * 100) {
    throw new Error('Energy use share must be between 0 and 100 with at most two decimal places.');
  }
  return parsed;
}

async function setNoMatrixValues(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
  questionCode: string,
): Promise<void> {
  const question = questions.find((item) => item.question_code === questionCode);
  if (!question || question.answer_type !== 'MATRIX') {
    throw new Error(`${questionCode} is unavailable. Refresh the survey form after the Section H update.`);
  }
  const items = await manager.query(
    `SELECT mi.id AS item_id, mi.answer_type, lv.id AS option_id
       FROM matrix_items mi
       JOIN lookup_values lv ON lv.type_id = mi.scale_type_id
                            AND lv.code = 'NO'
                            AND lv.is_active = true
      WHERE mi.question_id = $1
      ORDER BY mi.sort_order, mi.id`,
    [question.id],
  ) as Array<{ item_id: number; answer_type: string; option_id: number }>;
  if (!items.length || items.some((item) => item.answer_type !== 'CHOICE' || !item.option_id)) {
    throw new Error(`${questionCode} does not have an active No option for every row.`);
  }
  answers.set(questionCode, Object.fromEntries(
    items.map((item) => [String(item.item_id), { choice_value_id: item.option_id }]),
  ));
}

async function normalizeEnergyConsumption(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  const sources = await manager.query(
    `SELECT source.id, source.code, source.requires_text
       FROM lookup_values source
       JOIN lookup_types source_type ON source_type.id = source.type_id
      WHERE source_type.code = 'ENERGY_SOURCE'
        AND source.is_active = true
      ORDER BY source.sort_order, source.id`,
  ) as EnergySource[];
  if (!sources.length) throw new Error('Energy sources are unavailable. Refresh the survey form.');
  const allowedUnits = await manager.query(
    `SELECT mapping.energy_source_id, mapping.unit_id
       FROM energy_source_units mapping
       JOIN lookup_values source ON source.id = mapping.energy_source_id
       JOIN lookup_types source_type ON source_type.id = source.type_id
      WHERE source_type.code = 'ENERGY_SOURCE'
        AND source.is_active = true`,
  ) as EnergyUnit[];

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const allowedUnitIds = new Map<number, Set<number>>();
  for (const mapping of allowedUnits) {
    const units = allowedUnitIds.get(mapping.energy_source_id) ?? new Set<number>();
    units.add(mapping.unit_id);
    allowedUnitIds.set(mapping.energy_source_id, units);
  }

  const rowsBySource = new Map<number, Row>();
  for (const row of rows(answers.get('H_ENERGY_CONSUMPTION'), 'Energy consumption')) {
    if (!rowHasData(row)) continue;
    const sourceId = selectionId(row.energy_source_id);
    const source = sourceId === null ? undefined : sourceById.get(sourceId);
    if (!source) throw new Error('Choose a valid energy source for each consumption row.');
    if (rowsBySource.has(source.id)) throw new Error('Each energy source may be entered only once.');
    const quantity = validateNonNegative(row.quantity_per_month, 'Monthly energy quantity');
    const unitId = isBlank(row.unit_id) ? null : selectionId(row.unit_id);
    if (!isBlank(row.unit_id) && unitId === null) throw new Error('Choose a valid energy unit.');
    if (quantity !== null && unitId === null) {
      throw new Error('Choose the monthly quantity unit for each energy source.');
    }
    if (unitId !== null && !allowedUnitIds.get(source.id)?.has(unitId)) {
      throw new Error('The selected unit is not available for this energy source.');
    }
    const share = normalizeShare(row.share_pct);
    const otherText = typeof row.other_text === 'string' ? row.other_text.trim() : '';
    const hasUsage = quantity !== null || unitId !== null || share > 0;
    if (source.requires_text && hasUsage && !otherText) {
      throw new Error('Specify the Other energy source.');
    }
    rowsBySource.set(source.id, {
      energy_source_id: source.id,
      ...(otherText && source.requires_text ? { other_text: otherText } : {}),
      quantity_per_month: quantity,
      unit_id: unitId,
      share_pct: share,
    });
  }

  answers.set('H_ENERGY_CONSUMPTION', sources.map((source) =>
    rowsBySource.get(source.id) ?? {
      energy_source_id: source.id,
      quantity_per_month: null,
      unit_id: null,
      share_pct: 0,
    },
  ));
}

async function normalizeGeneration(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  const sources = await manager.query(
    `SELECT source.id, source.code, source.requires_text
       FROM lookup_values source
       JOIN lookup_types source_type ON source_type.id = source.type_id
      WHERE source_type.code = 'POWER_SOURCE'
        AND source.is_active = true
      ORDER BY source.sort_order, source.id`,
  ) as EnergySource[];
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const seen = new Set<number>();
  const normalized = rows(answers.get('H_ENERGY_GENERATION'), 'Power generation')
    .filter((row) => rowHasData(row))
    .map((row) => {
      const sourceId = selectionId(row.power_source_id);
      const source = sourceId === null ? undefined : sourceById.get(sourceId);
      if (!source) throw new Error('Choose a valid power source for each generation row.');
      if (seen.has(source.id)) throw new Error('Each power source may be entered only once.');
      seen.add(source.id);
      const capacity = validateNonNegative(row.capacity_kw, 'Generation capacity');
      const exportedPower = validateNonNegative(row.export_kw, 'Exported power');
      const otherText = typeof row.other_text === 'string' ? row.other_text.trim() : '';
      if (source.requires_text && (capacity !== null || exportedPower !== null) && !otherText) {
        throw new Error('Specify the Other power source.');
      }
      return {
        power_source_id: source.id,
        ...(otherText && source.requires_text ? { other_text: otherText } : {}),
        capacity_kw: capacity,
        export_kw: exportedPower,
      };
    });
  answers.set('H_ENERGY_GENERATION', normalized);
}

async function normalizeSolidWaste(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  const submittedRows = rows(answers.get('H_SOLID_WASTE'), 'Solid waste');
  if (!submittedRows.length) {
    answers.set('H_SOLID_WASTE', []);
    return;
  }
  const types = await manager.query(
    `SELECT waste.id, waste.code
       FROM lookup_values waste
       JOIN lookup_types waste_type ON waste_type.id = waste.type_id
      WHERE waste_type.code = 'WASTE_TYPE'
        AND waste.is_active = true`,
  ) as Array<{ id: number; code: string }>;
  const typeById = new Map(types.map((type) => [type.id, type]));
  const selectedTypeIds = submittedRows.map((row) => selectionId(row.waste_type_id))
    .filter((id): id is number => id !== null);
  const methods = selectedTypeIds.length
    ? await manager.query(
      `SELECT waste.id AS waste_type_id, method.id AS method_id, method.code,
              method.requires_text
         FROM lookup_value_links link
         JOIN lookup_values waste ON waste.id = link.parent_value_id
         JOIN lookup_types waste_type ON waste_type.id = waste.type_id
         JOIN lookup_values method ON method.id = link.child_value_id
         JOIN lookup_types method_type ON method_type.id = method.type_id
        WHERE waste_type.code = 'WASTE_TYPE'
          AND method_type.code = 'WASTE_DISPOSAL'
          AND waste.id = ANY($1::int[])
          AND waste.is_active = true
          AND method.is_active = true`,
      [[...new Set(selectedTypeIds)]],
    ) as WasteMethod[]
    : [];
  const seenTypes = new Set<number>();
  const normalized = submittedRows.filter((row) => rowHasData(row, ['is_generated']))
    .map((row) => {
      const wasteTypeId = selectionId(row.waste_type_id);
      if (wasteTypeId === null || !typeById.has(wasteTypeId)) {
        throw new Error('Choose a valid waste type for each waste row.');
      }
      if (seenTypes.has(wasteTypeId)) throw new Error('Each waste type may be entered only once.');
      seenTypes.add(wasteTypeId);

      const ids = selectionIds(row.disposal_method_ids);
      if (ids === null) throw new Error('Choose valid disposal methods.');
      if (new Set(ids).size !== ids.length) throw new Error('Remove duplicate disposal methods.');
      const available = methods.filter((method) => method.waste_type_id === wasteTypeId);
      if (ids.some((id) => !available.some((method) => method.method_id === id))) {
        throw new Error('Choose a valid disposal method for the selected waste type.');
      }
      const oldText = typeof row.other_text === 'string' ? row.other_text.trim() : '';
      const textById = record(record(row.disposal_method_ids).other_text);
      const other = available.find((method) => method.code === 'OTHER');
      const otherSelected = other ? ids.includes(other.method_id) : false;
      const otherText = other ? textById[String(other.method_id)] : undefined;
      if (otherSelected && typeof otherText === 'string' && otherText.trim() &&
          oldText && oldText !== otherText.trim()) {
        throw new Error('Other disposal method has conflicting descriptions.');
      }
      if (otherSelected && other?.requires_text &&
          !(typeof otherText === 'string' && otherText.trim()) && !oldText) {
        throw new Error('Specify the Other disposal method.');
      }
      if (!otherSelected && (oldText || Object.values(textById).some((text) => !isBlank(text)))) {
        throw new Error('Remove Other disposal text unless Other is selected.');
      }
      const normalizedText = otherSelected
        ? typeof otherText === 'string' && otherText.trim() ? otherText.trim() : oldText
        : '';
      const otherTextMap = otherSelected && other ? { [other.method_id]: normalizedText } : {};
      return {
        waste_type_id: wasteTypeId,
        is_generated: typeof row.is_generated === 'boolean' ? row.is_generated : true,
        disposal_method_ids: { option_ids: ids, other_text: otherTextMap },
      };
    });
  answers.set('H_SOLID_WASTE', normalized);
}

export async function normalizeSectionHAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
): Promise<void> {
  if (!questions.some((question) => question.question_code.startsWith('H_'))) return;

  for (const [gateCode, label] of [
    ['H_WATER_WASTE_GATE', 'water-waste management'],
    ['H_SOLID_WASTE_GATE', 'solid-waste generation'],
    ['H_GREEN_PRACTICES_GATE', 'green practices'],
  ]) {
    if (!questions.some((question) => question.question_code === gateCode)) {
      throw new Error(`The Section H ${label} gate is unavailable. Refresh the survey form after the update.`);
    }
    const gate = answers.get(gateCode);
    if (typeof gate !== 'boolean') throw new Error(`Select Yes or No for ${label}.`);
  }

  if (answers.get('H_WATER_WASTE_GATE') === false) {
    await setNoMatrixValues(manager, answers, questions, 'H_WATER_WASTE_DISPOSAL');
  } else if (!answers.has('H_WATER_WASTE_DISPOSAL')) {
    answers.set('H_WATER_WASTE_DISPOSAL', {});
  }
  if (answers.get('H_GREEN_PRACTICES_GATE') === false) {
    await setNoMatrixValues(manager, answers, questions, 'H_GREEN_PRACTICES');
  } else if (!answers.has('H_GREEN_PRACTICES')) {
    answers.set('H_GREEN_PRACTICES', {});
  }
  if (answers.get('H_SOLID_WASTE_GATE') === false) {
    answers.set('H_SOLID_WASTE', []);
  }

  if (questions.some((question) => question.question_code === 'H_ENERGY_CONSUMPTION')) {
    await normalizeEnergyConsumption(manager, answers);
  }
  if (questions.some((question) => question.question_code === 'H_ENERGY_GENERATION')) {
    await normalizeGeneration(manager, answers);
  }
  if (answers.get('H_SOLID_WASTE_GATE') === true) {
    await normalizeSolidWaste(manager, answers);
  }

  const capacityAnswer = record(answers.get('H_CAPTIVE_EXPORT_CAPACITY'));
  const exportCapacity = validateNonNegative(capacityAnswer.export_capacity_kw, 'Export capacity');
  const generation = rows(answers.get('H_ENERGY_GENERATION'), 'Power generation');
  const captiveCapacity = generation.reduce(
    (total, row) => total + (number(row.capacity_kw) ?? 0),
    0,
  );
  answers.set('H_CAPTIVE_EXPORT_CAPACITY', {
    captive_capacity_kw: Math.round(captiveCapacity * 100) / 100,
    export_capacity_kw: exportCapacity,
  });
}
