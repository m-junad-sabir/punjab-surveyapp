import { EntityManager } from 'typeorm';
import type { SubmittedQuestion, SurveyAnswers } from './survey-response-writer';

export const SECTION_EF_SHARE_CODES = [
  'E_SOURCING_TYPE',
  'E_RAW_MATERIAL_ORIGIN',
  'F_BUYER_TYPE',
  'F_BUYER_LOCATION',
] as const;

export const SECTION_G_SHARE_CODES = ['G_AUTOMATION_LEVEL', 'G_MACHINERY_AGE'] as const;
export const DEFAULT_SHARE_CODES = [...SECTION_EF_SHARE_CODES, ...SECTION_G_SHARE_CODES];

export const SECTION_EF_MATRIX_DEFAULTS: Readonly<Record<string, string>> = {
  F_STRENGTH_VS_COMPETITORS: 'DK_NA',
  F_DIGITAL_PRESENCE: 'NA',
};

const REASON_CODES = ['E_SUPPLY_DISRUPTION_REASON', 'F_DEMAND_GAP_REASON'];

interface LookupValue {
  id: number;
  type_id: number;
  code: string;
  label: string;
  requires_text: boolean;
  is_active: boolean;
}

interface MatrixItem {
  id: number;
  question_id: number;
  item_code: string;
  item_label: string;
  answer_type: 'CHOICE' | 'RATING_1_5';
  scale_type_id: number | null;
  allows_text: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === 'string' && value.trim() === '');
}

function positiveId(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function matrixChoiceId(value: unknown): number | null {
  return positiveId(isRecord(value) ? value.option_id : value);
}

function hundredths(value: unknown): number | null {
  if (isBlank(value)) return 0;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100);
}

function optionsFor(question: SubmittedQuestion, options: LookupValue[]): LookupValue[] {
  if (question.lookup_type_id === null) {
    throw new Error(`${question.question_code} has no configured lookup type.`);
  }
  return options.filter((option) => option.type_id === question.lookup_type_id);
}

function normalizeShare(
  question: SubmittedQuestion,
  value: unknown,
  options: LookupValue[],
): Record<string, number | { percent: number; other_text: string }> {
  if (question.answer_type !== 'SHARE_PERCENT') {
    throw new Error(`${question.question_code} is not configured as a share question.`);
  }
  if (!isBlank(value) && !isRecord(value)) {
    throw new Error(`${question.question_code}: provide valid share categories.`);
  }
  const supplied = isRecord(value) ? value : {};
  const available = optionsFor(question, options);
  if (!available.some((option) => option.is_active)) {
    throw new Error(`${question.question_code}: share categories are unavailable. Refresh the survey form.`);
  }
  for (const key of Object.keys(supplied)) {
    const id = positiveId(key);
    if (id === null || !available.some((option) => option.id === id)) {
      throw new Error(`${question.question_code}: remove or correct unknown saved share category ${key}.`);
    }
  }

  const result: Record<string, number | { percent: number; other_text: string }> = {};
  let total = 0;
  for (const option of available) {
    const key = String(option.id);
    if (!option.is_active && !(key in supplied)) continue;
    const entry = supplied[key];
    if (isRecord(entry) && Object.keys(entry).some((field) => field !== 'percent' && field !== 'other_text')) {
      throw new Error(`${question.question_code}: ${option.label} contains unsupported saved data.`);
    }
    const raw = isRecord(entry) ? entry.percent : entry;
    const amount = hundredths(raw);
    if (amount === null) {
      throw new Error(`${question.question_code}: ${option.label} must be between 0 and 100 with at most two decimal places.`);
    }
    const otherText = isRecord(entry) ? entry.other_text : undefined;
    if (!isBlank(otherText) && typeof otherText !== 'string') {
      throw new Error(`${question.question_code}: ${option.label} has invalid description text.`);
    }
    total += amount;
    result[key] = typeof otherText === 'string' && otherText.trim()
      ? { percent: amount / 100, other_text: otherText.trim() }
      : amount / 100;
  }
  if (total > 10_000) {
    throw new Error(`${question.question_code}: the share total cannot exceed 100%.`);
  }
  return result;
}

function validateReason(question: SubmittedQuestion, value: unknown, options: LookupValue[]): void {
  if (isBlank(value)) return;
  if (question.answer_type !== 'MULTI_CHOICE') {
    throw new Error(`${question.question_code} is not configured as a multiple-choice question.`);
  }
  const selected = Array.isArray(value) ? value : isRecord(value) ? value.option_ids : undefined;
  if (!Array.isArray(selected)) {
    throw new Error(`${question.question_code}: provide valid selected reasons.`);
  }
  const otherText = isRecord(value) ? value.other_text : undefined;
  if (otherText !== undefined && otherText !== null && !isRecord(otherText)) {
    throw new Error(`${question.question_code}: provide valid reason descriptions.`);
  }
  const available = optionsFor(question, options);
  const ids = new Set<number>();
  for (const selectedValue of selected) {
    const id = positiveId(selectedValue);
    const option = available.find((candidate) => candidate.id === id);
    if (!option || id === null || ids.has(id)) {
      throw new Error(`${question.question_code}: remove or correct an unknown or duplicate reason.`);
    }
    ids.add(id);
    const description = isRecord(otherText) ? otherText[String(id)] : undefined;
    if (!isBlank(description) && typeof description !== 'string') {
      throw new Error(`${question.question_code}: ${option.label} has invalid description text.`);
    }
    if (option.code === 'OTHER') {
      if (typeof description !== 'string' || !description.trim()) {
        throw new Error(`${question.question_code}: specify the Other reason.`);
      }
    }
  }
  if (isRecord(otherText)) {
    for (const [key, description] of Object.entries(otherText)) {
      const id = positiveId(key);
      if (!isBlank(description) && (id === null || !ids.has(id))) {
        throw new Error(`${question.question_code}: remove description text for an unselected reason.`);
      }
    }
  }
}

function normalizeMatrix(
  question: SubmittedQuestion,
  value: unknown,
  items: MatrixItem[],
  options: LookupValue[],
): Record<string, { choice_value_id?: number; rating?: number; other_text?: string }> {
  if (!isBlank(value) && !isRecord(value)) {
    throw new Error(`${question.question_code}: provide valid matrix rows.`);
  }
  const supplied = isRecord(value) ? value : {};
  const questionItems = items.filter((item) => item.question_id === question.id);
  const defaultCode = SECTION_EF_MATRIX_DEFAULTS[question.question_code];
  if (defaultCode && questionItems.length === 0) {
    throw new Error(`${question.question_code}: matrix rows are unavailable. Refresh the survey form.`);
  }
  const entries = new Map<number, unknown>();
  for (const [key, entry] of Object.entries(supplied)) {
    const matches = questionItems.filter((candidate) => String(candidate.id) === key || candidate.item_code === key);
    const item = matches[0];
    if (matches.length !== 1 || entries.has(item.id)) {
      throw new Error(`${question.question_code}: remove or correct unknown or duplicate matrix row ${key}.`);
    }
    entries.set(item.id, entry);
  }

  const result: Record<string, { choice_value_id?: number; rating?: number; other_text?: string }> = {};
  for (const item of questionItems) {
    const raw = entries.get(item.id);
    const entry = isRecord(raw) ? raw : {};
    if (isRecord(raw) && Object.keys(entry).some((field) =>
      field !== 'choice_value_id' && field !== 'option_id' && field !== 'rating' && field !== 'other_text',
    )) {
      throw new Error(`${question.question_code}: ${item.item_label} contains unsupported saved data.`);
    }
    const otherText = entry.other_text;
    if (!isBlank(otherText) && typeof otherText !== 'string') {
      throw new Error(`${question.question_code}: ${item.item_label} has invalid description text.`);
    }
    const row: { choice_value_id?: number; rating?: number; other_text?: string } = {};
    if (typeof otherText === 'string' && otherText.trim()) row.other_text = otherText.trim();

    if (item.answer_type === 'CHOICE') {
      if (!isBlank(entry.rating)) {
        throw new Error(`${question.question_code}: ${item.item_label} requires a choice, not a rating.`);
      }
      const choice = isRecord(raw) ? entry.choice_value_id ?? entry.option_id : raw;
      const available = options.filter((option) => option.type_id === item.scale_type_id);
      if (!isBlank(entry.choice_value_id) && !isBlank(entry.option_id) &&
          matrixChoiceId(entry.choice_value_id) !== matrixChoiceId(entry.option_id)) {
        throw new Error(`${question.question_code}: ${item.item_label} has conflicting saved choices.`);
      }
      if (isRecord(choice)) {
        if (Object.keys(choice).some((field) => field !== 'option_id' && field !== 'other_text')) {
          throw new Error(`${question.question_code}: ${item.item_label} contains unsupported saved choice data.`);
        }
        const nestedText = choice.other_text;
        if (!isBlank(nestedText) && typeof nestedText !== 'string') {
          throw new Error(`${question.question_code}: ${item.item_label} has invalid description text.`);
        }
        if (typeof nestedText === 'string' && nestedText.trim()) {
          if (row.other_text && row.other_text !== nestedText.trim()) {
            throw new Error(`${question.question_code}: ${item.item_label} has conflicting description text.`);
          }
          row.other_text = nestedText.trim();
        }
      }
      const fallback = defaultCode
        ? available.find((option) => option.code === defaultCode && option.is_active)
        : undefined;
      if (defaultCode && !fallback) {
        throw new Error(`${question.question_code}: required ${defaultCode} option is unavailable. Refresh the survey form.`);
      }
      const selectedChoice = isRecord(choice) ? choice.option_id : choice;
      if (!isBlank(selectedChoice)) {
        const id = matrixChoiceId(choice);
        if (id === null || !available.some((option) => option.id === id)) {
          throw new Error(`${question.question_code}: choose a valid option for ${item.item_label}.`);
        }
        row.choice_value_id = id;
      } else if (defaultCode) {
        row.choice_value_id = fallback!.id;
      }
    } else if (item.answer_type === 'RATING_1_5') {
      if (defaultCode) {
        throw new Error(`${question.question_code}: ${item.item_label} must use a choice scale.`);
      }
      if (!isBlank(entry.choice_value_id) || !isBlank(entry.option_id)) {
        throw new Error(`${question.question_code}: ${item.item_label} requires a rating, not a choice.`);
      }
      const rating = isRecord(raw) ? entry.rating : raw;
      if (!isBlank(rating)) {
        const parsed = positiveId(rating);
        if (parsed === null || parsed > 5) {
          throw new Error(`${question.question_code}: ${item.item_label} must be rated from 1 to 5.`);
        }
        row.rating = parsed;
      }
    } else {
      throw new Error(`${question.question_code}: ${item.item_label} has an unsupported matrix type.`);
    }
    if (Object.keys(row).length) result[String(item.id)] = row;
  }
  return result;
}

export async function normalizeSectionEFAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
): Promise<void> {
  const shareQuestions = questions.filter((question) =>
    DEFAULT_SHARE_CODES.some((code) => code === question.question_code) && answers.has(question.question_code),
  );
  const reasonQuestions = questions.filter((question) =>
    REASON_CODES.includes(question.question_code) && answers.has(question.question_code),
  );
  const matrixQuestions = questions.filter((question) =>
    question.answer_type === 'MATRIX' && answers.has(question.question_code),
  );
  for (const question of questions) {
    if (SECTION_EF_MATRIX_DEFAULTS[question.question_code] && question.answer_type !== 'MATRIX') {
      throw new Error(`${question.question_code} is not configured as a matrix.`);
    }
  }
  if (!shareQuestions.length && !reasonQuestions.length && !matrixQuestions.length) return;

  const matrixItems: MatrixItem[] = matrixQuestions.length
    ? await manager.query(
      `SELECT mi.id, mi.question_id, mi.item_code, mi.item_label, mi.answer_type,
              mi.scale_type_id, mi.allows_text
         FROM matrix_items mi
        WHERE mi.question_id = ANY($1::int[])
        ORDER BY mi.question_id, mi.sort_order, mi.id`,
      [matrixQuestions.map((question) => question.id)],
    )
    : [];
  const typeIds = [...new Set([
    ...shareQuestions.map((question) => question.lookup_type_id),
    ...reasonQuestions.map((question) => question.lookup_type_id),
    ...matrixItems.map((item) => item.scale_type_id),
  ].filter((id): id is number => id !== null))];
  const options: LookupValue[] = typeIds.length
    ? await manager.query(
      `SELECT lv.id, lv.type_id, lv.code, lv.label, lv.requires_text, lv.is_active
         FROM lookup_values lv
        WHERE lv.type_id = ANY($1::int[])
        ORDER BY lv.sort_order, lv.id`,
      [typeIds],
    )
    : [];

  for (const question of shareQuestions) {
    answers.set(question.question_code, normalizeShare(question, answers.get(question.question_code), options));
  }
  for (const question of reasonQuestions) {
    validateReason(question, answers.get(question.question_code), options);
  }
  for (const question of matrixQuestions) {
    answers.set(question.question_code, normalizeMatrix(
      question, answers.get(question.question_code), matrixItems, options,
    ));
  }
}
