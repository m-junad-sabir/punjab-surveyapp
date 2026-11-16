import type { QuestionOption, SurveyQuestion } from '../types';

type ReinvestmentArea = Record<string, unknown>;

function isRecord(value: unknown): value is ReinvestmentArea {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function selectedId(value: unknown): number | null {
  const raw = isRecord(value) ? value.option_id : value;
  if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
  return typeof raw === 'string' && raw.trim() && Number.isInteger(Number(raw))
    ? Number(raw)
    : null;
}

export function isReinvestmentOtherVisible(
  value: unknown,
  options: QuestionOption[],
): boolean {
  const id = selectedId(value);
  return id !== null && options.some((option) => option.id === id && option.code === 'OTHER');
}

export function isSectionIOtherTextVisible(
  questionCode: string,
  itemCode: string,
  selectedOptionCode: string | undefined,
): boolean {
  if (!['I_COMPLIANCE_PERMITS', 'I_CERTIFICATIONS'].includes(questionCode) || itemCode !== 'OTHER') {
    return true;
  }
  return selectedOptionCode === 'HELD' || selectedOptionCode === 'IN_PROGRESS';
}

export function clearSectionIOtherText(question: SurveyQuestion, value: unknown): unknown {
  if (!['I_COMPLIANCE_PERMITS', 'I_CERTIFICATIONS'].includes(question.question_code) ||
      !isRecord(value)) return value;
  let next: Record<string, unknown> | null = null;
  for (const item of question.matrix_items ?? []) {
    if (item.code !== 'OTHER') continue;
    const key = String(item.id);
    const raw = value[key] ?? value[item.code];
    if (!isRecord(raw)) continue;
    const choice = raw.choice_value_id ?? raw.option_id;
    const choiceId = selectedId(choice);
    const code = item.options.find((option) => option.id === choiceId)?.code;
    if (code === 'HELD' || code === 'IN_PROGRESS') continue;
    if (!Object.prototype.hasOwnProperty.call(raw, 'other_text') &&
        !(isRecord(choice) && Object.prototype.hasOwnProperty.call(choice, 'other_text'))) continue;

    next ??= { ...value };
    const cleaned = { ...raw };
    delete cleaned.other_text;
    if (isRecord(choice) && Object.prototype.hasOwnProperty.call(choice, 'other_text')) {
      cleaned.choice_value_id = choiceId;
      delete cleaned.option_id;
    }
    next[key] = cleaned;
    if (key !== item.code) delete next[item.code];
  }
  return next ?? value;
}

export function reinvestmentAreaError(question: SurveyQuestion, value: unknown): string | null {
  if (!isRecord(value)) return null;
  const id = selectedId(value.reinvestment_area_id);
  const nestedText = isRecord(value.reinvestment_area_id)
    ? value.reinvestment_area_id.other_text
    : undefined;
  const otherText = value.reinvestment_area_other ?? nestedText;
  if (id === null) {
    return typeof otherText === 'string' && otherText.trim()
      ? 'Choose a primary area of reinvestment.'
      : null;
  }
  const option = question.fields?.find((field) => field.key === 'reinvestment_area_id')
    ?.options?.find((candidate) => candidate.id === id);
  if (!option) return 'Choose a valid primary area of reinvestment.';
  if (option.requires_text &&
      (typeof otherText !== 'string' || !otherText.trim())) {
    return 'Specify the Other primary area of reinvestment.';
  }
  return null;
}

export function changeReinvestmentArea(
  value: ReinvestmentArea,
  key: string,
  nextValue: unknown,
  options: QuestionOption[],
): ReinvestmentArea {
  const next = { ...value, [key]: nextValue };
  if (key !== 'reinvestment_area_id') return next;

  const id = selectedId(nextValue);
  const selected = options.find((option) => option.id === id);
  next.reinvestment_area_id = id;
  if (selected?.code !== 'OTHER') delete next.reinvestment_area_other;
  else if (isRecord(nextValue) && typeof nextValue.other_text === 'string') {
    next.reinvestment_area_other = nextValue.other_text;
  }
  return next;
}
