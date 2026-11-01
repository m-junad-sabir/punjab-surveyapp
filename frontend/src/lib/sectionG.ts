import type { QuestionOption, SurveyQuestion } from '../types';

type Row = Record<string, unknown>;

function isRecord(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === 'string' && !value.trim());
}

export function sectionGSelectionId(value: unknown): number | null {
  const raw = isRecord(value) ? value.option_id : value;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  if (typeof raw === 'string' && !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id >= 0 ? id : null;
}

function uniqueOptions(options: QuestionOption[]): QuestionOption[] {
  return options.filter((option, index) => options.findIndex((candidate) => candidate.id === option.id) === index);
}

function withPrevious(available: QuestionOption[], all: QuestionOption[], value: unknown): QuestionOption[] {
  const id = typeof value === 'string' ? null : sectionGSelectionId(value);
  const previous = all.find((option) => option.id === id);
  if (previous && !available.some((option) => option.id === previous.id)) {
    return [...available, {
      ...previous,
      label: `${previous.label} (previously selected; choose another)`,
      is_selectable: false,
    }];
  }
  return available;
}

export function machineOptions(
  options: QuestionOption[],
  industryId: number | null,
  value: unknown,
): QuestionOption[] {
  return withPrevious(options.filter((option) =>
    option.id === 0 || (option.parent_id === industryId && option.is_selectable !== false),
  ), options, value);
}

export function machineValueForDisplay(value: unknown, options: QuestionOption[]): unknown {
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    const match = options.find((option) =>
      option.id > 0 && option.is_selectable !== false &&
      option.label.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    return match?.id ?? { option_id: 0, other_text: value };
  }
  const id = sectionGSelectionId(value);
  return isRecord(value) && id !== null ? { ...value, option_id: id } : id ?? value;
}

export function specificationOptions(
  options: QuestionOption[],
  machines: QuestionOption[],
  industryId: number | null,
  machineValue: unknown,
  value: unknown,
): QuestionOption[] {
  const displayedMachine = machineValueForDisplay(machineValue, machineOptions(machines, industryId, machineValue));
  const machineId = sectionGSelectionId(displayedMachine);
  const currentMachine = machines.find((option) =>
    option.id === machineId && option.parent_id === industryId && option.is_selectable !== false,
  );
  const available = options.filter((option) =>
    option.id === 0 || (currentMachine && option.parent_id === currentMachine.id && option.is_selectable !== false),
  );
  return withPrevious(available, options, value);
}

export function equipmentUnitOptions(
  options: QuestionOption[],
  equipmentValue: unknown,
  value: unknown,
): QuestionOption[] {
  const equipmentId = sectionGSelectionId(equipmentValue);
  const available = uniqueOptions(options.filter((option) =>
    equipmentId !== null && option.parent_id === equipmentId && option.is_selectable !== false,
  ));
  return withPrevious(available, options, value);
}

export function vesselKind(value: unknown): 'BOILER' | 'VESSEL' | null {
  if (value === 'BOILER' || sectionGSelectionId(value) === 1) return 'BOILER';
  if (value === 'VESSEL' || sectionGSelectionId(value) === 2) return 'VESSEL';
  return null;
}

export function isSectionGFieldVisible(questionCode: string, value: unknown, key: string): boolean {
  if (questionCode !== 'G_BOILERS') return true;
  if (key === 'record_kind') return true;
  const kind = isRecord(value) ? vesselKind(value.record_kind) : null;
  if (!kind) return false;
  if (key === 'boiler_type_id' || key === 'heating_surface_raw' || key === 'heating_surface_unit_id') {
    return kind === 'BOILER';
  }
  if (key === 'vessel_category_id' || key === 'capacity_litres') return kind === 'VESSEL';
  return true;
}

export function isSectionGRawDecimalField(questionCode: string, key: string): boolean {
  return (questionCode === 'G_BOILERS' &&
    ['working_pressure_raw', 'heating_surface_raw', 'capacity_litres'].includes(key)) ||
    (questionCode === 'G_WEIGHTS_MEASURES' && key === 'capacity_value_raw');
}

export function changeSectionGField(
  questionCode: string,
  row: Row,
  key: string,
  value: unknown,
): Row {
  const next = { ...row, [key]: value };
  if (questionCode === 'G_CRITICAL_MACHINES' && key === 'machine_name' &&
      sectionGSelectionId(row.machine_name) !== sectionGSelectionId(value)) {
    delete next.specification;
  }
  if (questionCode === 'G_WEIGHTS_MEASURES' && key === 'equipment_type_id' &&
      sectionGSelectionId(row.equipment_type_id) !== sectionGSelectionId(value)) {
    delete next.equipment_unit_id;
  }
  if (questionCode === 'G_BOILERS' && key === 'record_kind' &&
      vesselKind(row.record_kind) !== vesselKind(value)) {
    for (const field of ['boiler_type_id', 'vessel_category_id', 'capacity_litres',
      'heating_surface_raw', 'heating_surface_unit_id']) delete next[field];
  }
  return next;
}

function choiceError(value: unknown, options: QuestionOption[], label: string): string | null {
  const id = sectionGSelectionId(value);
  const option = options.find((candidate) => candidate.id === id && candidate.is_selectable !== false);
  if (!option) return `Choose a valid ${label}.`;
  if (option.requires_text &&
      (!isRecord(value) || typeof value.other_text !== 'string' || !value.other_text.trim())) {
    return `Specify the other ${label}.`;
  }
  return null;
}

function decimalError(value: unknown, label: string): string | null {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  return /^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(text) &&
    Number.isFinite(Number(text)) && Number(text) > 0
    ? null
    : `${label} must be greater than zero with at most three decimal places.`;
}

function wholeError(value: unknown, label: string, minimum: number): string | null {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  const number = Number(text);
  return /^\d+$/.test(text) && Number.isSafeInteger(number) && number >= minimum && number <= 2_147_483_647
    ? null
    : `${label} must be a whole number from ${minimum} to 2147483647.`;
}

function fieldOptions(question: SurveyQuestion, key: string): QuestionOption[] {
  return question.fields?.find((field) => field.key === key)?.options ?? [];
}

export function sectionGRowsError(
  question: SurveyQuestion,
  value: unknown,
  industryId: number | null,
  references: Record<string, QuestionOption[]>,
): string | null {
  if (!['G_CRITICAL_MACHINES', 'G_BOILERS', 'G_WEIGHTS_MEASURES'].includes(question.question_code)) return null;
  if (isBlank(value)) return null;
  if (!Array.isArray(value) || value.some((row) => !isRecord(row))) return 'Provide valid equipment rows.';
  const numbers = new Set<string>();

  for (const row of value as Row[]) {
    if (question.question_code === 'G_CRITICAL_MACHINES') {
      const machines = references.industry_machines ?? fieldOptions(question, 'machine_name');
      const specs = references.machine_specifications ?? fieldOptions(question, 'specification');
      const available = machineOptions(machines, industryId, row.machine_name);
      if (typeof row.machine_name === 'string') {
        if (!row.machine_name.trim()) return 'Choose a machine name for each critical-machine row.';
      } else {
        if (industryId === null) return 'Select Type of Unit before choosing a critical machine.';
        const error = choiceError(row.machine_name, available, 'machine name');
        if (error) return error;
      }
      if (!isBlank(row.specification) && typeof row.specification !== 'string') {
        const error = choiceError(row.specification,
          specificationOptions(specs, machines, industryId, row.machine_name, row.specification),
          'machine specification');
        if (error) return error;
      }
      if (!isBlank(row.quantity)) {
        const error = wholeError(row.quantity, 'Machine quantity', 0);
        if (error) return error;
      }
      continue;
    }

    if (question.question_code === 'G_BOILERS') {
      const kind = vesselKind(row.record_kind);
      if (!kind) return 'Choose boiler or pressure vessel and complete the new fields; older entries must be reviewed.';
      if (typeof row.equipment_number !== 'string' ||
          !/^[A-Za-z0-9/-]+$/.test(row.equipment_number.trim())) {
        return 'A boiler or vessel number must contain only letters, digits, hyphens, or slashes.';
      }
      const number = row.equipment_number.trim().toLowerCase();
      if (numbers.has(number)) return 'Boiler and vessel numbers must be unique within the survey.';
      numbers.add(number);
      const typeKey = kind === 'BOILER' ? 'boiler_type_id' : 'vessel_category_id';
      const typeLabel = kind === 'BOILER' ? 'boiler type' : 'vessel category';
      const error = choiceError(row[typeKey], fieldOptions(question, typeKey), typeLabel) ??
        decimalError(row.working_pressure_raw, 'Working pressure') ??
        choiceError(row.pressure_unit_id, fieldOptions(question, 'pressure_unit_id'), 'pressure unit') ??
        (kind === 'VESSEL'
          ? decimalError(row.capacity_litres, 'Capacity (litres)')
          : decimalError(row.heating_surface_raw, 'Heating surface') ??
            choiceError(row.heating_surface_unit_id, fieldOptions(question, 'heating_surface_unit_id'), 'heating surface unit'));
      if (error) return error;
      continue;
    }

    const equipment = fieldOptions(question, 'equipment_type_id');
    const units = fieldOptions(question, 'equipment_unit_id');
    const error = choiceError(row.equipment_type_id, equipment, 'equipment type') ??
      choiceError(row.equipment_unit_id, equipmentUnitOptions(units, row.equipment_type_id, row.equipment_unit_id), 'equipment unit') ??
      decimalError(row.capacity_value_raw, 'Capacity / denomination') ??
      wholeError(row.number_of_instruments, 'Number of instruments', 1);
    if (error) return error;
  }
  return null;
}

export function legacySectionGFields(questionCode: string, value: unknown): Array<{ label: string; value: string }> {
  if (!isRecord(value)) return [];
  const fields: Record<string, Array<[string, string]>> = {
    G_BOILERS: [
      ['vessel_type', 'Previous boiler / vessel type'],
      ['capacity_tph', 'Previous capacity (tonnes per hour)'],
      ['heating_surface', 'Previous heating surface'],
    ],
    G_WEIGHTS_MEASURES: [
      ['equipment_type', 'Previous equipment type'],
      ['quantity', 'Previous quantity'],
      ['capacity', 'Previous capacity'],
    ],
  };
  return (fields[questionCode] ?? [])
    .filter(([key]) => !isBlank(value[key]))
    .map(([key, label]) => ({ label, value: String(value[key]) }));
}

export function legacyMachineryAgeRows(value: unknown): Row[] | null {
  return Array.isArray(value) && value.length > 0 && value.every(isRecord) ? value : null;
}

export function isLegacyMachineryAgeWrapper(
  value: unknown,
): value is { shares: Row; legacy_counts: unknown[] } {
  return isRecord(value) && isRecord(value.shares) && Array.isArray(value.legacy_counts) &&
    Object.keys(value).every((key) => key === 'shares' || key === 'legacy_counts');
}
