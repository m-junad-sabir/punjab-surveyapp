import type { SurveyInputField, SurveyQuestion } from '../types';

type SectionKRow = Record<string, unknown>;

function isRecord(value: unknown): value is SectionKRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selectedOptionId(value: unknown): number | null {
  const raw = isRecord(value) ? value.option_id : value;
  if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() && Number.isInteger(Number(raw))) return Number(raw);
  return null;
}

function isNoCollaboration(row: SectionKRow, fields: SurveyInputField[]): boolean {
  const collaborator = fields.find((field) => field.key === 'collaborator_type_id');
  const selectedId = selectedOptionId(row.collaborator_type_id);
  return selectedId !== null &&
    collaborator?.options?.some((option) => option.id === selectedId && option.code === 'NONE') === true;
}

export function isSectionKFieldVisible(
  questionCode: string,
  row: unknown,
  fieldKey: string,
  fields: SurveyInputField[] = [],
): boolean {
  if (questionCode !== 'K_COLLABORATIONS' || fieldKey !== 'purpose_ids' || !isRecord(row)) {
    return true;
  }
  return !isNoCollaboration(row, fields);
}

export function clearSectionKCollaborationPurposes(
  question: SurveyQuestion,
  value: unknown,
): unknown {
  if (question.question_code !== 'K_COLLABORATIONS' || !Array.isArray(value)) return value;
  let next: SectionKRow[] | null = null;
  value.forEach((row, index) => {
    if (!isRecord(row) || !isNoCollaboration(row, question.fields ?? []) ||
        !Object.prototype.hasOwnProperty.call(row, 'purpose_ids')) return;
    next ??= value.slice() as SectionKRow[];
    next[index] = { ...row };
    delete next[index].purpose_ids;
  });
  return next ?? value;
}
