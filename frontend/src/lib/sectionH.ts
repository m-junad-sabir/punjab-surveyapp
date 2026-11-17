import type { QuestionOption, SurveyQuestion } from '../types';

type Row = Record<string, unknown>;

function isRecord(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0);
}

export function sectionHSelectionId(value: unknown): number | null {
  const raw = isRecord(value) ? value.option_id : value;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  if (typeof raw === 'string' && !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function selectedIds(value: unknown): number[] | null {
  const ids = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.option_ids) ? value.option_ids : null;
  if (!ids) return null;
  const result = ids.map(sectionHSelectionId);
  return result.every((id): id is number => id !== null) ? result : null;
}

function rowIsBlank(value: unknown, ignored: string[] = []): boolean {
  return !isRecord(value) || Object.entries(value)
    .filter(([key]) => !ignored.includes(key))
    .every(([, entry]) => isBlank(entry));
}

function decimalIsValid(value: unknown): boolean {
  if (isBlank(value)) return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number(parsed.toFixed(2)) === parsed;
}

function fieldOptions(question: SurveyQuestion, key: string): QuestionOption[] {
  return question.fields?.find((field) => field.key === key)?.options ?? [];
}

export function isSectionHFieldVisible(
  questionCode: string,
  row: unknown,
  key: string,
  fields: SurveyQuestion['fields'] = [],
): boolean {
  if (!isRecord(row)) return true;
  if (questionCode === 'H_SOLID_WASTE' && key === 'is_generated') return false;
  if (key !== 'other_text') return true;
  if (questionCode === 'H_ENERGY_CONSUMPTION') {
    const sourceId = sectionHSelectionId(row.energy_source_id);
    return fields?.find((field) => field.key === 'energy_source_id')
      ?.options.some((option) => option.id === sourceId && option.code === 'OTHER') ?? false;
  }
  if (questionCode === 'H_ENERGY_GENERATION') {
    const sourceId = sectionHSelectionId(row.power_source_id);
    return fields?.find((field) => field.key === 'power_source_id')
      ?.options.some((option) => option.id === sourceId && option.code === 'OTHER') ?? false;
  }
  return true;
}

export function changeSectionHField(questionCode: string, row: Row, key: string, value: unknown): Row {
  const next = { ...row, [key]: value };
  if (questionCode === 'H_ENERGY_CONSUMPTION' && key === 'energy_source_id' &&
      sectionHSelectionId(row.energy_source_id) !== sectionHSelectionId(value)) {
    delete next.unit_id;
    delete next.other_text;
  }
  if (questionCode === 'H_ENERGY_GENERATION' && key === 'power_source_id' &&
      sectionHSelectionId(row.power_source_id) !== sectionHSelectionId(value)) {
    delete next.other_text;
  }
  return next;
}

export function totalGenerationCapacity(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  const total = value.reduce((sum, row) => {
    if (!isRecord(row) || isBlank(row.capacity_kw)) return sum;
    const parsed = Number(row.capacity_kw);
    return Number.isFinite(parsed) && parsed >= 0 ? sum + parsed : sum;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function materializeSectionHAnswers(
  questions: SurveyQuestion[],
  answers: Record<number, unknown>,
): Record<number, unknown> {
  const result = { ...answers };
  const energyQuestion = questions.find((question) => question.question_code === 'H_ENERGY_CONSUMPTION');
  if (energyQuestion && Array.isArray(answers[energyQuestion.question_id])) {
    result[energyQuestion.question_id] = (answers[energyQuestion.question_id] as unknown[]).map((row) =>
      isRecord(row) && !rowIsBlank(row)
        ? { ...row, share_pct: isBlank(row.share_pct) ? 0 : row.share_pct }
        : row,
    );
  }
  const generationQuestion = questions.find((question) => question.question_code === 'H_ENERGY_GENERATION');
  const capacityQuestion = questions.find((question) => question.question_code === 'H_CAPTIVE_EXPORT_CAPACITY');
  if (capacityQuestion) {
    const existing = isRecord(answers[capacityQuestion.question_id])
      ? answers[capacityQuestion.question_id] as Row
      : {};
    result[capacityQuestion.question_id] = {
      ...existing,
      captive_capacity_kw: totalGenerationCapacity(
        generationQuestion ? answers[generationQuestion.question_id] : [],
      ),
    };
  }
  return result;
}

function sourceRowsError(
  question: SurveyQuestion,
  value: unknown,
  references: Record<string, QuestionOption[]>,
): string | null {
  if (isBlank(value)) return null;
  if (!Array.isArray(value) || value.some((row) => row !== null && !isRecord(row))) {
    return 'Provide valid Section H rows.';
  }
  const sourceKey = question.question_code === 'H_ENERGY_CONSUMPTION'
    ? 'energy_source_id' : 'power_source_id';
  const sourceOptions = fieldOptions(question, sourceKey)
    .filter((option) => option.is_selectable !== false);
  const seen = new Set<number>();
  for (const raw of value) {
    if (rowIsBlank(raw, ['is_generated'])) continue;
    const row = raw as Row;
    const sourceId = sectionHSelectionId(row[sourceKey]);
    const source = sourceOptions.find((option) => option.id === sourceId);
    if (!source) return 'Choose a valid source for each row.';
    if (seen.has(source.id)) return 'Each source may be entered only once.';
    seen.add(source.id);
    const otherText = typeof row.other_text === 'string' ? row.other_text.trim() : '';
    const quantityKey = question.question_code === 'H_ENERGY_CONSUMPTION'
      ? 'quantity_per_month' : 'capacity_kw';
    const quantity = row[quantityKey];
    if (!isBlank(quantity) &&
        (Number(quantity) < 0 || !Number.isFinite(Number(quantity)) || !decimalIsValid(quantity))) {
      return 'Energy quantities and capacities must be non-negative with at most two decimal places.';
    }
    if (question.question_code === 'H_ENERGY_CONSUMPTION') {
      const share = row.share_pct;
      if (!isBlank(share) && (Number(share) < 0 || Number(share) > 100 ||
          !Number.isFinite(Number(share)) || Math.round(Number(share) * 100) !== Number(share) * 100)) {
        return 'Energy use share must be between 0 and 100 with at most two decimal places.';
      }
      const unitId = sectionHSelectionId(row.unit_id);
      if (!isBlank(quantity)) {
        if (unitId === null) return 'Choose the monthly quantity unit for each energy source.';
        const allowed = references.energy_source_units ?? [];
        if (!allowed.some((option) => option.parent_id === source.id && option.id === unitId)) {
          return 'Choose a unit available for the selected energy source.';
        }
      } else if (unitId !== null) {
        const allowed = references.energy_source_units ?? [];
        if (!allowed.some((option) => option.parent_id === source.id && option.id === unitId)) {
          return 'Choose a unit available for the selected energy source.';
        }
      }
    } else {
      const exportValue = row.export_kw;
      if (!isBlank(exportValue) &&
          (Number(exportValue) < 0 || !Number.isFinite(Number(exportValue)) || !decimalIsValid(exportValue))) {
        return 'Exported power must be non-negative with at most two decimal places.';
      }
    }
    if (source.requires_text &&
        (!isBlank(quantity) || !isBlank(row.unit_id) || Number(row.share_pct ?? 0) > 0 ||
         Number(row.export_kw ?? 0) > 0) && !otherText) {
      return 'Specify the Other source.';
    }
  }
  return null;
}

function solidWasteError(question: SurveyQuestion, value: unknown): string | null {
  if (isBlank(value)) return null;
  if (!Array.isArray(value) || value.some((row) => row !== null && !isRecord(row))) {
    return 'Provide valid solid-waste rows.';
  }
  const types = fieldOptions(question, 'waste_type_id').filter((option) => option.is_selectable !== false);
  const methods = fieldOptions(question, 'disposal_method_ids');
  const seen = new Set<number>();
  for (const raw of value) {
    if (rowIsBlank(raw)) continue;
    const row = raw as Row;
    const typeId = sectionHSelectionId(row.waste_type_id);
    if (!types.some((option) => option.id === typeId)) return 'Choose a valid waste type.';
    if (seen.has(typeId!)) return 'Each waste type may be entered only once.';
    seen.add(typeId!);
    const ids = selectedIds(row.disposal_method_ids);
    if (!ids) return 'Choose valid disposal methods.';
    if (new Set(ids).size !== ids.length) return 'Remove duplicate disposal methods.';
    const allowed = methods.filter((option) => option.parent_id === typeId);
    if (ids.some((id) => !allowed.some((option) => option.id === id))) {
      return 'Choose disposal methods available for the selected waste type.';
    }
    const other = allowed.find((option) => option.code === 'OTHER');
    if (other && ids.includes(other.id)) {
      const text = isRecord(row.disposal_method_ids)
        ? recordOtherText(row.disposal_method_ids, other.id)
        : '';
      if (other.requires_text && !text.trim() &&
          !(typeof row.other_text === 'string' && row.other_text.trim())) {
        return 'Specify the Other disposal method.';
      }
    }
  }
  return null;
}

function recordOtherText(value: Row, optionId: number): string {
  const text = isRecord(value.other_text) ? value.other_text[String(optionId)] : '';
  return typeof text === 'string' ? text : '';
}

export function sectionHQuestionError(
  question: SurveyQuestion,
  value: unknown,
  references: Record<string, QuestionOption[]>,
): string | null {
  if (question.question_code === 'H_ENERGY_CONSUMPTION' ||
      question.question_code === 'H_ENERGY_GENERATION') {
    return sourceRowsError(question, value, references);
  }
  if (question.question_code === 'H_SOLID_WASTE') return solidWasteError(question, value);
  if (question.question_code === 'H_CAPTIVE_EXPORT_CAPACITY' && isRecord(value) &&
      !isBlank(value.export_capacity_kw) &&
      (Number(value.export_capacity_kw) < 0 || !Number.isFinite(Number(value.export_capacity_kw)) ||
       !decimalIsValid(value.export_capacity_kw))) {
    return 'Export capacity must be non-negative with at most two decimal places.';
  }
  return null;
}
