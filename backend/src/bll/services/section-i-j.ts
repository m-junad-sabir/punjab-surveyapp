import { EntityManager } from 'typeorm';
import { SubmittedQuestion, SurveyAnswers } from './survey-response-writer';

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

async function setMatrixValue(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
  questionCode: string,
  optionCode: string,
): Promise<void> {
  const question = questions.find((item) => item.question_code === questionCode);
  if (!question || question.answer_type !== 'MATRIX') {
    throw new Error(`${questionCode} is unavailable. Refresh the survey form after the Section I/J update.`);
  }
  const rows = await manager.query(
    `SELECT mi.id AS item_id, mi.answer_type, lv.id AS option_id
       FROM matrix_items mi
       LEFT JOIN lookup_values lv ON lv.type_id = mi.scale_type_id
                                AND lv.code = $2
                                AND lv.is_active = true
      WHERE mi.question_id = $1
      ORDER BY mi.sort_order, mi.id`,
    [question.id, optionCode],
  ) as Array<{ item_id: number; answer_type: string; option_id: number | null }>;
  if (!rows.length || rows.some((row) => row.answer_type !== 'CHOICE' || row.option_id === null)) {
    throw new Error(`${questionCode} is missing an active ${optionCode} option for every row.`);
  }
  answers.set(questionCode, Object.fromEntries(
    rows.map((row) => [String(row.item_id), { choice_value_id: row.option_id }]),
  ));
}

function requireGate(answers: SurveyAnswers, code: string, label: string): boolean {
  const answer = answers.get(code);
  if (typeof answer !== 'boolean') throw new Error(`Select Yes or No for ${label}.`);
  return answer;
}

export async function normalizeSectionIJAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
): Promise<void> {
  if (questions.some((question) => question.question_code.startsWith('I_'))) {
    for (const [gateCode, matrixCode, label] of [
      ['I_COMPLIANCE_GATE', 'I_COMPLIANCE_PERMITS', 'factory safety and environmental compliance'],
      ['I_CERTIFICATIONS_GATE', 'I_CERTIFICATIONS', 'quality, safety, export, and green certifications'],
    ]) {
      if (!questions.some((question) => question.question_code === gateCode)) {
        throw new Error(`The Section I ${label} gate is unavailable. Refresh the survey form after the update.`);
      }
      if (!questions.some((question) => question.question_code === matrixCode)) {
        throw new Error(`The Section I ${label} details are unavailable. Refresh the survey form after the update.`);
      }
      if (!requireGate(answers, gateCode, label)) {
        await setMatrixValue(manager, answers, questions, matrixCode, 'NA');
      }
    }
  }

  if (questions.some((question) => question.question_code.startsWith('J_'))) {
    if (!questions.some((question) => question.question_code === 'J_STRATEGIC_PLAN_GATE')) {
      throw new Error('The Section J strategic-plan gate is unavailable. Refresh the survey form after the update.');
    }
    const hasPlan = requireGate(answers, 'J_STRATEGIC_PLAN_GATE', 'a strategic business plan');
    if (hasPlan) {
      if (!questions.some((question) => question.question_code === 'J_OPERATIONAL_PLANNING_GATE')) {
        throw new Error('The Section J operational-planning gate is unavailable. Refresh the survey form after the update.');
      }
      if (!questions.some((question) => question.question_code === 'J_PLANNING_AREAS')) {
        throw new Error('The Section J operational-planning details are unavailable. Refresh the survey form after the update.');
      }
      if (!requireGate(answers, 'J_OPERATIONAL_PLANNING_GATE', 'operational planning')) {
        await setMatrixValue(manager, answers, questions, 'J_PLANNING_AREAS', 'NONE');
      }
    }

    const areaAnswer = answers.get('J_REINVESTMENT_AREA');
    if (hasPlan && areaAnswer !== undefined) {
      const area = record(areaAnswer);
      const areaId = selectionId(area.reinvestment_area_id);
      if (areaId === null) {
        const nestedText = record(area.reinvestment_area_id).other_text;
        const otherText = area.reinvestment_area_other ?? nestedText;
        if (typeof otherText === 'string' && otherText.trim()) {
          throw new Error('Choose a primary area of reinvestment.');
        }
        delete area.reinvestment_area_other;
        answers.set('J_REINVESTMENT_AREA', area);
      } else {
        const options = await manager.query(
          `SELECT lv.code, lv.requires_text
             FROM lookup_values lv
             JOIN lookup_types lt ON lt.id = lv.type_id
            WHERE lv.id = $1 AND lv.is_active = true AND lt.code = 'REINVESTMENT_AREA'`,
          [areaId],
        ) as Array<{ code: string; requires_text: boolean }>;
        const selected = options[0];
        if (!selected) throw new Error('Choose a valid primary area of reinvestment.');
        if (selected.requires_text) {
          const nestedText = record(area.reinvestment_area_id).other_text;
          const otherText = area.reinvestment_area_other ?? nestedText;
          if (typeof otherText !== 'string' || !otherText.trim()) {
            throw new Error('Specify the Other primary area of reinvestment.');
          }
          answers.set('J_REINVESTMENT_AREA', {
            ...area,
            reinvestment_area_id: areaId,
            reinvestment_area_other: otherText.trim(),
          });
        } else {
          area.reinvestment_area_id = areaId;
          delete area.reinvestment_area_other;
          answers.set('J_REINVESTMENT_AREA', area);
        }
      }
    }
  }
}
