import type { SurveyQuestion } from '../types';
import { clearSecondaryProductFields } from './sectionCProducts';
import { sectionGSelectionId } from './sectionG';

type AnswersByQuestion = Record<number, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function answerForCode(
  code: string,
  questions: SurveyQuestion[],
  answers: AnswersByQuestion,
): unknown {
  const question = questions.find((candidate) => candidate.question_code === code);
  return question ? answers[question.question_id] : undefined;
}

function booleanField(value: unknown, key: string): boolean | null {
  if (!isRecord(value)) return null;
  const fieldValue = value[key];
  return typeof fieldValue === 'boolean' ? fieldValue : null;
}

function selectedOptionCode(
  questionCode: string,
  questions: SurveyQuestion[],
  answers: AnswersByQuestion,
): string | null {
  const question = questions.find((candidate) => candidate.question_code === questionCode);
  if (!question) return null;

  const answer = answers[question.question_id];
  const optionId = isRecord(answer) ? answer.option_id : answer;
  if (typeof optionId !== 'number' || !Number.isInteger(optionId)) return null;
  return question.options.find((option) => option.id === optionId)?.code ?? null;
}

function hasSavedDetail(value: unknown, ignoredKeys: string[] = []): boolean {
  if (Array.isArray(value)) {
    return value.some((row) => isRecord(row) && Object.entries(row)
      .filter(([key]) => !ignoredKeys.includes(key))
      .some(([, entry]) =>
      entry !== undefined && entry !== null && entry !== '',
    ));
  }
  return isRecord(value) && Object.keys(value).length > 0;
}

export function utilizationBandCode(
  questions: SurveyQuestion[],
  answers: AnswersByQuestion,
): string | null {
  const question = questions.find((candidate) => candidate.question_code === 'G_UTILIZATION_RATE');
  if (!question) return null;
  const answer = answers[question.question_id];
  const value = isRecord(answer) ? answer.utilization_rate_id : answer;
  const id = sectionGSelectionId(value);
  const options = question.fields?.find((field) => field.key === 'utilization_rate_id')?.options ?? question.options;
  return options.find((option) => option.id === id)?.code ?? null;
}

export function isQuestionVisible(
  question: SurveyQuestion,
  questions: SurveyQuestion[],
  answers: AnswersByQuestion,
): boolean {
  switch (question.question_code) {
    case 'A_PARENT_COMPANY_DETAILS':
    case 'A_ASSOCIATED_ESTABLISHMENTS':
      return booleanField(answerForCode('A_PARENT_COMPANY', questions, answers), 'has_parent_company') === true;
    case 'B_CLOSURE_REASON':
      return selectedOptionCode('B_OPERATION_STATUS', questions, answers) === 'PERM_CLOSED';
    case 'B_OPERATION_MONTHS':
    case 'B_OPERATIONAL_HOURS': {
      const status = selectedOptionCode('B_OPERATION_STATUS', questions, answers);
      return status !== null && status !== 'PERM_CLOSED';
    }
    case 'E_SUPPLY_DISRUPTION_REASON':
      return booleanField(answerForCode('E_SUPPLY_DISRUPTION', questions, answers), 'had_supply_disruption') === true;
    case 'F_DEMAND_GAP_REASON':
      return booleanField(answerForCode('F_DEMAND_GAP', questions, answers), 'had_demand_gap') === true;
    case 'G_UNDERUTILIZATION_REASON':
      return ['U40_59', 'U60_74'].includes(utilizationBandCode(questions, answers) ?? '');
    case 'G_INNOVATION': {
      const gate = questions.find((candidate) => candidate.question_code === 'G_INNOVATION_GATE');
      if (!gate) return true;
      const answer = answers[gate.question_id];
      if (answer === true) return true;
      if (answer === false) return false;
      const existing = answers[question.question_id];
      return isRecord(existing) && Object.keys(existing).length > 0;
    }
    case 'H_WATER_WASTE_DISPOSAL': {
      const gate = answerForCode('H_WATER_WASTE_GATE', questions, answers);
      if (gate === true) return true;
      if (gate === false) return false;
      return hasSavedDetail(answers[question.question_id]);
    }
    case 'H_SOLID_WASTE': {
      const gate = answerForCode('H_SOLID_WASTE_GATE', questions, answers);
      if (gate === true) return true;
      if (gate === false) return false;
      return hasSavedDetail(answers[question.question_id], ['is_generated']);
    }
    case 'H_GREEN_PRACTICES': {
      const gate = answerForCode('H_GREEN_PRACTICES_GATE', questions, answers);
      if (gate === true) return true;
      if (gate === false) return false;
      return hasSavedDetail(answers[question.question_id]);
    }
    default:
      if (question.question_code.startsWith('K_') && question.question_code !== 'K_FUTURE_PLAN') {
        return booleanField(answerForCode('K_FUTURE_PLAN', questions, answers), 'has_future_plan') === true;
      }
      return true;
  }
}

export function clearHiddenAnswers(
  questions: SurveyQuestion[],
  answers: AnswersByQuestion,
): AnswersByQuestion {
  let nextAnswers = answers;

  for (const question of questions) {
    if (isQuestionVisible(question, questions, nextAnswers)) continue;
    if (question.question_code === 'G_UNDERUTILIZATION_REASON' &&
        utilizationBandCode(questions, nextAnswers) === null) continue;
    if (!Object.prototype.hasOwnProperty.call(nextAnswers, question.question_id)) continue;
    if (nextAnswers === answers) nextAnswers = { ...answers };
    delete nextAnswers[question.question_id];
  }

  const products = questions.find((question) => question.question_code === 'C_PRODUCTS');
  const productRows = products ? nextAnswers[products.question_id] : undefined;
  if (products && Array.isArray(productRows)) {
    const cleanedRows = productRows.map((row) =>
      isRecord(row) ? clearSecondaryProductFields(row) : row,
    );
    if (cleanedRows.some((row, index) => row !== productRows[index])) {
      if (nextAnswers === answers) nextAnswers = { ...answers };
      nextAnswers[products.question_id] = cleanedRows;
    }
  }

  return nextAnswers;
}
