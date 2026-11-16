import { EntityManager } from 'typeorm';
import type { SubmittedQuestion, SurveyAnswers } from './survey-response-writer';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function selectionId(value: unknown): number | null {
  const raw = record(value).option_id ?? value;
  if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() && Number.isInteger(Number(raw))) return Number(raw);
  return null;
}

function requireGate(answers: SurveyAnswers, code: string, label: string): boolean {
  const answer = answers.get(code);
  if (typeof answer !== 'boolean') throw new Error(`Select Yes or No for ${label}.`);
  return answer;
}

export async function normalizeSectionKAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
): Promise<void> {
  if (!questions.some((question) => question.question_code.startsWith('K_'))) return;
  if (!questions.some((question) => question.question_code === 'K_FUTURE_PLAN')) {
    throw new Error('The Section K future-plan question is unavailable. Refresh the survey form.');
  }
  const hasFuturePlan = record(answers.get('K_FUTURE_PLAN')).has_future_plan;
  if (typeof hasFuturePlan !== 'boolean') throw new Error('Select Yes or No for a future plan.');
  if (!hasFuturePlan) return;

  const barrierGate = questions.find((question) => question.question_code === 'K_BARRIERS_GATE');
  const barriers = questions.find((question) => question.question_code === 'K_BARRIERS');
  if (!barrierGate || barrierGate.answer_type !== 'YES_NO' || !barriers || barriers.answer_type !== 'MATRIX') {
    throw new Error('The Section K barriers gate or ratings are unavailable. Refresh the survey form.');
  }
  if (requireGate(answers, 'K_BARRIERS_GATE', 'whether the establishment faces barriers')) return;

  const items = await manager.query(
    `SELECT id AS item_id, answer_type
       FROM matrix_items
      WHERE question_id = $1
      ORDER BY sort_order, id`,
    [barriers.id],
  ) as Array<{ item_id: number; answer_type: string }>;
  if (!items.length || items.some((item) => item.answer_type !== 'RATING_1_5')) {
    throw new Error('The Section K barrier-rating rows are unavailable. Refresh the survey form.');
  }
  answers.set('K_BARRIERS', Object.fromEntries(
    items.map((item) => [String(item.item_id), { rating: null }]),
  ));
}

export async function clearNoCollaborationPurposes(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  const value = answers.get('K_COLLABORATIONS');
  if (!Array.isArray(value) || value.length === 0) return;
  const rows = await manager.query(
    `SELECT lv.id
       FROM lookup_values lv
       JOIN lookup_types lt ON lt.id = lv.type_id
      WHERE lt.code = 'COLLABORATOR_TYPE'
        AND lv.code = 'NONE'
        AND lv.is_active = true`,
  ) as Array<{ id: number }>;
  const noneId = rows[0]?.id;
  if (noneId === undefined) {
    throw new Error("The active 'Not interested in any collaboration' option is unavailable. Refresh the survey form.");
  }
  answers.set('K_COLLABORATIONS', value.map((row) => {
    const collaboration = record(row);
    if (selectionId(collaboration.collaborator_type_id) !== noneId ||
        !Object.prototype.hasOwnProperty.call(collaboration, 'purpose_ids')) return row;
    const cleaned = { ...collaboration };
    delete cleaned.purpose_ids;
    return cleaned;
  }));
}
