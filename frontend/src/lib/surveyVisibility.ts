import type { SurveyQuestion } from '../types';

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
    if (!Object.prototype.hasOwnProperty.call(nextAnswers, question.question_id)) continue;
    if (nextAnswers === answers) nextAnswers = { ...answers };
    delete nextAnswers[question.question_id];
  }

  return nextAnswers;
}
