import type { QuestionOption, SurveyMatrixItem, SurveyQuestion } from '../types';

export const SECTION_EF_SHARE_CODES = [
  'E_SOURCING_TYPE', 'E_RAW_MATERIAL_ORIGIN', 'F_BUYER_TYPE', 'F_BUYER_LOCATION',
] as const;

export const SECTION_EF_MATRIX_DEFAULTS: Readonly<Record<string, string>> = {
  F_STRENGTH_VS_COMPETITORS: 'DK_NA',
  F_DIGITAL_PRESENCE: 'NA',
};

const REASON_CODES = ['E_SUPPLY_DISRUPTION_REASON', 'F_DEMAND_GAP_REASON'];
type References = Record<string, QuestionOption[]>;
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type DisplayOption = QuestionOption & { unknown?: boolean };
export type ShareEntry = number | { percent: number; other_text: string };
export type MatrixEntry = { choice_value_id?: number; rating?: number; other_text?: string };

export function isSectionEfShare(question: SurveyQuestion): boolean {
  return SECTION_EF_SHARE_CODES.some((code) => code === question.question_code);
}

export function isSectionEfReason(question: SurveyQuestion): boolean {
  return REASON_CODES.includes(question.question_code);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === 'string' && value.trim() === '');
}

export function positiveId(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function matrixChoiceId(value: unknown): number | null {
  return positiveId(isRecord(value) ? value.option_id : value);
}

export function percentageHundredths(value: unknown): number | null {
  if (isBlank(value)) return 0;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100);
}

export function formatPercentage(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function uniqueOptions(options: QuestionOption[]): QuestionOption[] {
  return options.filter((option, index) => options.findIndex((candidate) => candidate.id === option.id) === index);
}

function availableQuestionOptions(question: SurveyQuestion, references: References): QuestionOption[] {
  return uniqueOptions([
    ...question.options,
    ...(references.section_ef_options ?? []).filter((option) => option.parent_id === question.question_id),
  ]);
}

function priorOption(option: QuestionOption): DisplayOption {
  return { ...option, label: `${option.label} (previously recorded)`, is_selectable: false };
}

export function shareOptions(
  question: SurveyQuestion,
  value: unknown,
  references: References,
): DisplayOption[] {
  const supplied = isRecord(value) ? value : {};
  const active = uniqueOptions(question.options.filter((option) => option.is_selectable !== false));
  const known = availableQuestionOptions(question, references);
  return [
    ...active,
    ...known.filter((option) => String(option.id) in supplied && !active.some((item) => item.id === option.id))
      .map(priorOption),
  ];
}

export function invalidShareKeys(question: SurveyQuestion, value: unknown, references: References): string[] {
  if (!isRecord(value)) return [];
  const known = availableQuestionOptions(question, references);
  return Object.keys(value).filter((key) => {
    const id = positiveId(key);
    return id === null || !known.some((option) => option.id === id);
  });
}

export function shareTotal(value: unknown): number | null {
  if (isBlank(value)) return 0;
  if (!isRecord(value)) return null;
  let total = 0;
  for (const entry of Object.values(value)) {
    const amount = percentageHundredths(isRecord(entry) ? entry.percent : entry);
    if (amount === null) return null;
    total += amount;
  }
  return total / 100;
}

export function normalizeShares(
  question: SurveyQuestion,
  value: unknown,
  references: References,
): Result<{ entries: Record<string, ShareEntry>; total: number }> {
  if (question.answer_type !== 'SHARE_PERCENT') {
    return { ok: false, error: 'This question is not configured as a share question.' };
  }
  if (!isBlank(value) && !isRecord(value)) return { ok: false, error: 'Provide valid share categories.' };
  const supplied = isRecord(value) ? value : {};
  if (!question.options.some((option) => option.is_selectable !== false)) {
    return { ok: false, error: 'Share categories are unavailable. Refresh the survey form.' };
  }
  const invalid = invalidShareKeys(question, value, references);
  if (invalid.length) return { ok: false, error: `Remove or correct unknown saved share category ${invalid[0]}.` };
  const entries: Record<string, ShareEntry> = {};
  let total = 0;
  for (const option of shareOptions(question, value, references)) {
    const entry = supplied[String(option.id)];
    if (isRecord(entry) && Object.keys(entry).some((field) => field !== 'percent' && field !== 'other_text')) {
      return { ok: false, error: `${option.label} contains unsupported saved data. Remove or correct this category.` };
    }
    const amount = percentageHundredths(isRecord(entry) ? entry.percent : entry);
    if (amount === null) {
      return { ok: false, error: `${option.label} must be between 0 and 100 with at most two decimal places.` };
    }
    const otherText = isRecord(entry) ? entry.other_text : undefined;
    if (!isBlank(otherText) && typeof otherText !== 'string') {
      return { ok: false, error: `${option.label} has invalid description text.` };
    }
    total += amount;
    entries[String(option.id)] = typeof otherText === 'string' && otherText.trim()
      ? { percent: amount / 100, other_text: otherText.trim() }
      : amount / 100;
  }
  if (total > 10_000) return { ok: false, error: 'The share total cannot exceed 100%.' };
  return { ok: true, value: { entries, total: total / 100 } };
}

export function matrixRawEntry(item: SurveyMatrixItem, value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  return value[String(item.id)] ?? value[item.code];
}

export function matrixEntryForDisplay(
  question: SurveyQuestion,
  item: SurveyMatrixItem,
  value: unknown,
): Record<string, unknown> {
  const raw = matrixRawEntry(item, value);
  const entry: Record<string, unknown> = isRecord(raw)
    ? { ...raw }
    : item.answer_type === 'RATING_1_5' ? { rating: raw } : { choice_value_id: raw };
  const choice = entry.choice_value_id ?? entry.option_id;
  if (isRecord(choice)) {
    if (isBlank(entry.other_text) && typeof choice.other_text === 'string') entry.other_text = choice.other_text;
    entry.choice_value_id = choice.option_id;
    delete entry.option_id;
  }
  if (item.answer_type === 'CHOICE' && isBlank(entry.choice_value_id) && isBlank(entry.option_id)) {
    const defaultCode = SECTION_EF_MATRIX_DEFAULTS[question.question_code];
    const fallback = item.options.find((option) => option.code === defaultCode && option.is_selectable !== false);
    if (fallback) entry.choice_value_id = fallback.id;
  }
  return entry;
}

function knownMatrixOptions(item: SurveyMatrixItem, references: References): QuestionOption[] {
  return uniqueOptions([
    ...item.options,
    ...(references.matrix_options ?? []).filter((option) => option.parent_id === item.id),
  ]);
}

export function matrixOptions(
  item: SurveyMatrixItem,
  entry: Record<string, unknown>,
  references: References,
): DisplayOption[] {
  const active = uniqueOptions(item.options.filter((option) => option.is_selectable !== false));
  const selectedId = matrixChoiceId(entry.choice_value_id ?? entry.option_id);
  if (selectedId === null || active.some((option) => option.id === selectedId)) return active;
  const known = knownMatrixOptions(item, references).find((option) => option.id === selectedId);
  return [
    ...active,
    known ? priorOption(known) : {
      id: selectedId, code: 'UNKNOWN', label: `Unknown option (ID ${selectedId})`,
      requires_text: false, is_selectable: false, unknown: true,
    },
  ];
}

export function invalidMatrixKeys(question: SurveyQuestion, value: unknown): string[] {
  if (!isRecord(value)) return [];
  const seen = new Set<number>();
  const invalid: string[] = [];
  for (const key of Object.keys(value)) {
    const matches = (question.matrix_items ?? []).filter((candidate) =>
      String(candidate.id) === key || candidate.code === key,
    );
    const item = matches[0];
    if (matches.length !== 1 || seen.has(item.id)) invalid.push(key);
    else seen.add(item.id);
  }
  return invalid;
}

export function normalizeMatrix(
  question: SurveyQuestion,
  value: unknown,
  references: References,
): Result<Record<string, MatrixEntry>> {
  if (!isBlank(value) && !isRecord(value)) return { ok: false, error: 'Provide valid matrix rows.' };
  const items = question.matrix_items ?? [];
  const defaultCode = SECTION_EF_MATRIX_DEFAULTS[question.question_code];
  if (defaultCode && !items.length) {
    return { ok: false, error: 'Matrix rows are unavailable. Refresh the survey form.' };
  }
  const invalid = invalidMatrixKeys(question, value);
  if (invalid.length) return { ok: false, error: `Remove or correct unknown or duplicate matrix row ${invalid[0]}.` };
  const result: Record<string, MatrixEntry> = {};
  for (const item of items) {
    const raw = matrixRawEntry(item, value);
    const entry = isRecord(raw) ? raw : {};
    if (isRecord(raw) && Object.keys(entry).some((field) =>
      field !== 'choice_value_id' && field !== 'option_id' && field !== 'rating' && field !== 'other_text',
    )) {
      return { ok: false, error: `${item.label} contains unsupported saved data. Remove or correct this row.` };
    }
    if (!isBlank(entry.other_text) && typeof entry.other_text !== 'string') {
      return { ok: false, error: `${item.label} has invalid description text.` };
    }
    const row: MatrixEntry = {};
    if (typeof entry.other_text === 'string' && entry.other_text.trim()) row.other_text = entry.other_text.trim();
    if (item.answer_type === 'CHOICE') {
      if (!isBlank(entry.rating)) return { ok: false, error: `${item.label} requires a choice, not a rating.` };
      const choice = isRecord(raw) ? entry.choice_value_id ?? entry.option_id : raw;
      if (!isBlank(entry.choice_value_id) && !isBlank(entry.option_id) &&
          matrixChoiceId(entry.choice_value_id) !== matrixChoiceId(entry.option_id)) {
        return { ok: false, error: `${item.label} has conflicting saved choices.` };
      }
      if (isRecord(choice)) {
        if (Object.keys(choice).some((field) => field !== 'option_id' && field !== 'other_text')) {
          return { ok: false, error: `${item.label} contains unsupported saved choice data.` };
        }
        if (!isBlank(choice.other_text) && typeof choice.other_text !== 'string') {
          return { ok: false, error: `${item.label} has invalid description text.` };
        }
        if (typeof choice.other_text === 'string' && choice.other_text.trim()) {
          if (row.other_text && row.other_text !== choice.other_text.trim()) {
            return { ok: false, error: `${item.label} has conflicting description text.` };
          }
          row.other_text = choice.other_text.trim();
        }
      }
      const fallback = defaultCode
        ? item.options.find((option) => option.code === defaultCode && option.is_selectable !== false)
        : undefined;
      if (defaultCode && !fallback) {
        return { ok: false, error: `Required ${defaultCode} option is unavailable. Refresh the survey form.` };
      }
      const selectedChoice = isRecord(choice) ? choice.option_id : choice;
      if (!isBlank(selectedChoice)) {
        const id = matrixChoiceId(choice);
        if (id === null || !knownMatrixOptions(item, references).some((option) => option.id === id)) {
          return { ok: false, error: `Choose a valid option for ${item.label}.` };
        }
        row.choice_value_id = id;
      } else if (defaultCode) {
        row.choice_value_id = fallback!.id;
      }
    } else if (item.answer_type === 'RATING_1_5') {
      if (defaultCode) return { ok: false, error: `${item.label} must use a choice scale.` };
      if (!isBlank(entry.choice_value_id) || !isBlank(entry.option_id)) {
        return { ok: false, error: `${item.label} requires a rating, not a choice.` };
      }
      const rating = isRecord(raw) ? entry.rating : raw;
      if (!isBlank(rating)) {
        const parsed = positiveId(rating);
        if (parsed === null || parsed > 5) return { ok: false, error: `${item.label} must be rated from 1 to 5.` };
        row.rating = parsed;
      }
    } else {
      return { ok: false, error: `${item.label} has an unsupported matrix type.` };
    }
    if (Object.keys(row).length) result[String(item.id)] = row;
  }
  return { ok: true, value: result };
}

export function reasonSelection(value: unknown): unknown[] | null {
  if (isBlank(value)) return [];
  if (Array.isArray(value)) return value;
  return isRecord(value) && Array.isArray(value.option_ids) ? value.option_ids : null;
}

export function reasonOptions(question: SurveyQuestion, value: unknown, references: References): DisplayOption[] {
  const active = uniqueOptions(question.options.filter((option) => option.is_selectable !== false));
  const known = availableQuestionOptions(question, references);
  const ids = [...new Set((reasonSelection(value) ?? []).map(positiveId).filter((id): id is number => id !== null))];
  return [
    ...active,
    ...ids.filter((id) => !active.some((option) => option.id === id)).map((id) => {
      const option = known.find((candidate) => candidate.id === id);
      return option ? priorOption(option) : {
        id, code: 'UNKNOWN', label: `Unknown reason (ID ${id})`,
        requires_text: false, is_selectable: false, unknown: true,
      };
    }),
  ];
}

export function reasonError(question: SurveyQuestion, value: unknown, references: References): string | null {
  if (question.answer_type !== 'MULTI_CHOICE') return 'This question is not configured for multiple-choice reasons.';
  const selected = reasonSelection(value);
  if (!selected) return 'Provide valid selected reasons.';
  const text = isRecord(value) ? value.other_text : undefined;
  if (text !== undefined && text !== null && !isRecord(text)) return 'Provide valid reason descriptions.';
  const available = availableQuestionOptions(question, references);
  const seen = new Set<number>();
  for (const choice of selected) {
    const id = positiveId(choice);
    const option = available.find((candidate) => candidate.id === id);
    if (id === null || !option || seen.has(id)) return 'Remove or correct an unknown or duplicate reason.';
    seen.add(id);
    const description = isRecord(text) ? text[String(id)] : undefined;
    if (!isBlank(description) && typeof description !== 'string') {
      return `${option.label} has invalid description text.`;
    }
    if (option.code === 'OTHER') {
      if (typeof description !== 'string' || !description.trim()) return 'Specify the Other reason.';
    }
  }
  if (isRecord(text)) {
    for (const [key, description] of Object.entries(text)) {
      const id = positiveId(key);
      if (!isBlank(description) && (id === null || !seen.has(id))) {
        return 'Remove description text for an unselected reason.';
      }
    }
  }
  return null;
}

export function normalizeReason(question: SurveyQuestion, value: unknown, references: References): Result<unknown> {
  const error = reasonError(question, value, references);
  if (error) return { ok: false, error };
  if (isBlank(value)) return { ok: true, value };
  const ids = (reasonSelection(value) ?? []).map((choice) => positiveId(choice)!);
  return {
    ok: true,
    value: Array.isArray(value) ? ids : isRecord(value) ? { ...value, option_ids: ids } : value,
  };
}

export function materializeSectionEFAnswers(
  questions: SurveyQuestion[],
  answers: Record<number, unknown>,
  references: References,
): Record<number, unknown> {
  const result = { ...answers };
  for (const question of questions) {
    const value = answers[question.question_id];
    if (isSectionEfShare(question)) {
      const normalized = normalizeShares(question, value, references);
      if (normalized.ok) result[question.question_id] = normalized.value.entries;
    } else if (isSectionEfReason(question) && Object.prototype.hasOwnProperty.call(answers, question.question_id)) {
      const normalized = normalizeReason(question, value, references);
      if (normalized.ok) result[question.question_id] = normalized.value;
    } else if (question.answer_type === 'MATRIX' &&
      (Object.prototype.hasOwnProperty.call(answers, question.question_id) ||
       SECTION_EF_MATRIX_DEFAULTS[question.question_code])) {
      const normalized = normalizeMatrix(question, value, references);
      if (normalized.ok) result[question.question_id] = normalized.value;
    }
  }
  return result;
}
