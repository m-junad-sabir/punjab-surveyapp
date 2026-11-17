import type { QuestionOption, SurveyQuestion } from '../types';

export const MAX_WORKFORCE_COUNT = 2_147_483_647;

export const WORKFORCE_GENDERS = [
  { id: 1, code: 'MALE', label: 'Male' },
  { id: 2, code: 'FEMALE', label: 'Female' },
  { id: 3, code: 'Other', label: 'Other' },
] as const;

export const EMPLOYMENT_CATEGORIES = [
  { key: 'regular_count', label: 'Regular employees' },
  { key: 'contract_count', label: 'Contract employees' },
  { key: 'daily_wage_count', label: 'Daily wages' },
] as const;

export type WorkforceGender = typeof WORKFORCE_GENDERS[number]['code'];
type EmploymentCountField = typeof EMPLOYMENT_CATEGORIES[number]['key'];
type EmploymentRow = { gender: number } & Record<EmploymentCountField, number>;
type SkillRow = { gender: number; skill_level_id: number; headcount: number };
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type WorkforceSkillOption = QuestionOption & { unknown?: boolean };

export function isWorkforceRow(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlankRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((value) =>
    value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0),
  );
}

function readRows(value: unknown, label: string): Result<Array<Record<string, unknown>>> {
  if (value === undefined || value === null || value === '') return { ok: true, value: [] };
  if (!Array.isArray(value) || value.some((row) => !isWorkforceRow(row))) {
    return { ok: false, error: `Provide valid ${label} rows.` };
  }
  return { ok: true, value };
}

export function workforceSelectionId(value: unknown): number | null {
  const selected = isWorkforceRow(value) ? value.option_id : value;
  if (typeof selected !== 'number' && typeof selected !== 'string') return null;
  if (typeof selected === 'string' && !selected.trim()) return null;
  const id = Number(selected);
  return Number.isInteger(id) ? id : null;
}

export function workforceGender(value: unknown): WorkforceGender | null {
  const selected = isWorkforceRow(value) ? value.option_id : value;
  return WORKFORCE_GENDERS.find((gender) =>
    selected === gender.code || workforceSelectionId(value) === gender.id,
  )?.code ?? null;
}

export function workforceCount(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return 0;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 && count <= MAX_WORKFORCE_COUNT ? count : null;
}

export function totalWorkforceCounts(values: unknown[]): number | null {
  let total = 0;
  for (const value of values) {
    const count = workforceCount(value);
    if (count === null) return null;
    total += count;
  }
  return total;
}

export function workforceCellValue(values: unknown[]): number | string {
  const total = totalWorkforceCounts(values);
  if (total !== null) return total;
  const invalid = values.find((value) => workforceCount(value) === null);
  return typeof invalid === 'string' || (typeof invalid === 'number' && Number.isFinite(invalid))
    ? invalid
    : 'Invalid';
}

function countError(label: string): string {
  return `${label} must be a whole number between 0 and ${MAX_WORKFORCE_COUNT}.`;
}

export function normalizeEmployment(value: unknown): Result<EmploymentRow[]> {
  const input = readRows(value, 'employment');
  if (!input.ok) return input;
  const rows: EmploymentRow[] = WORKFORCE_GENDERS.map((gender) => ({
    gender: gender.id, regular_count: 0, contract_count: 0, daily_wage_count: 0,
  }));
  for (const entry of input.value) {
    if (isBlankRow(entry)) continue;
    const gender = workforceGender(entry.gender);
    const index = WORKFORCE_GENDERS.findIndex((option) => option.code === gender);
    if (index < 0) return { ok: false, error: 'Choose a valid gender for each workforce row.' };
    for (const category of EMPLOYMENT_CATEGORIES) {
      const count = workforceCount(entry[category.key]);
      if (count === null) return { ok: false, error: countError(category.label) };
      rows[index][category.key] += count;
      if (rows[index][category.key] > MAX_WORKFORCE_COUNT) {
        return { ok: false, error: `${category.label} for ${gender} cannot exceed ${MAX_WORKFORCE_COUNT}.` };
      }
    }
  }
  for (const row of rows) {
    if (EMPLOYMENT_CATEGORIES.reduce((total, category) => total + row[category.key], 0) > MAX_WORKFORCE_COUNT) {
      const gender = WORKFORCE_GENDERS.find((option) => option.id === row.gender);
      return { ok: false, error: `The employment total for ${gender?.code} cannot exceed ${MAX_WORKFORCE_COUNT}.` };
    }
  }
  return { ok: true, value: rows };
}

function uniqueOptions(options: QuestionOption[]): QuestionOption[] {
  return options.filter((option, index) => options.findIndex((item) => item.id === option.id) === index);
}

function activeSkillOptions(question: SurveyQuestion): QuestionOption[] {
  return uniqueOptions((question.fields?.find((field) => field.key === 'skill_level_id')?.options ?? [])
    .filter((option) => option.is_selectable !== false));
}

export function workforceSkillOptions(
  question: SurveyQuestion,
  value: unknown,
  references: Record<string, QuestionOption[]>,
): WorkforceSkillOption[] {
  const active = activeSkillOptions(question);
  const known = uniqueOptions([...(references.workforce_skill_levels ?? []), ...active]);
  const selectedIds = new Set(
    (Array.isArray(value) ? value : [])
      .filter(isWorkforceRow)
      .map((row) => workforceSelectionId(row.skill_level_id))
      .filter((id): id is number => id !== null && id > 0),
  );
  const previous = known
    .filter((option) => selectedIds.has(option.id) && !active.some((item) => item.id === option.id))
    .map((option) => ({ ...option, label: `${option.label} (previously recorded)`, is_selectable: false }));
  const unknown = [...selectedIds]
    .filter((id) => !known.some((option) => option.id === id))
    .map((id) => ({
      id, code: 'UNKNOWN', label: `Unknown skill level (ID ${id})`, requires_text: false,
      is_selectable: false, unknown: true,
    }));
  return [...active, ...previous, ...unknown];
}

export function normalizeSkills(
  question: SurveyQuestion,
  value: unknown,
  references: Record<string, QuestionOption[]>,
): Result<SkillRow[]> {
  const input = readRows(value, 'skill');
  if (!input.ok) return input;
  if (activeSkillOptions(question).length === 0) {
    return { ok: false, error: 'Workforce skill levels are unavailable. Refresh the survey form and try again.' };
  }
  const options = workforceSkillOptions(question, value, references);
  const counts = new Map<string, number>();
  for (const entry of input.value) {
    if (isBlankRow(entry)) continue;
    const gender = workforceGender(entry.gender);
    if (!gender) return { ok: false, error: 'Choose a valid gender for each workforce row.' };
    const skillId = workforceSelectionId(entry.skill_level_id);
    const option = options.find((item) => item.id === skillId);
    if (!option || option.unknown) {
      return { ok: false, error: 'Choose a valid skill level for each workforce row, or remove the unknown saved level.' };
    }
    const count = workforceCount(entry.headcount);
    if (count === null) return { ok: false, error: countError('Skill headcount') };
    const key = `${skillId}:${gender}`;
    const total = (counts.get(key) ?? 0) + count;
    if (total > MAX_WORKFORCE_COUNT) {
      return { ok: false, error: `Skill headcount for ${gender} cannot exceed ${MAX_WORKFORCE_COUNT}.` };
    }
    counts.set(key, total);
  }
  return {
    ok: true,
    value: options.flatMap((option) => WORKFORCE_GENDERS.map((gender) => ({
      gender: gender.id,
      skill_level_id: option.id,
      headcount: counts.get(`${option.id}:${gender.code}`) ?? 0,
    }))),
  };
}

export function normalizeWorkforceAnswer(
  question: SurveyQuestion,
  value: unknown,
  references: Record<string, QuestionOption[]>,
): Result<EmploymentRow[] | SkillRow[]> | null {
  if (question.question_code === 'D_EMPLOYMENT') return normalizeEmployment(value);
  if (question.question_code === 'D_SKILLS') return normalizeSkills(question, value, references);
  return null;
}

export function materializeWorkforceAnswers(
  questions: SurveyQuestion[],
  answers: Record<number, unknown>,
  references: Record<string, QuestionOption[]>,
): Record<number, unknown> {
  const result = { ...answers };
  for (const question of questions) {
    const normalized = normalizeWorkforceAnswer(question, answers[question.question_id], references);
    if (normalized?.ok) result[question.question_id] = normalized.value;
  }
  return result;
}
