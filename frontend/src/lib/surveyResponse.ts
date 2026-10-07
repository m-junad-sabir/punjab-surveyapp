import type { OfflineResponse } from '../types';

export function getSurveyUnitName(response: OfflineResponse): string {
  const structuredName = response.answers.find((answer) =>
    answer.answer_value &&
    typeof answer.answer_value === 'object' &&
    typeof answer.answer_value.name === 'string' &&
    answer.answer_value.name.trim().length > 0,
  );
  if (structuredName) return structuredName.answer_value.name;

  const textAnswer = response.answers.find(
    (answer) => typeof answer.answer_value === 'string' && answer.answer_value.trim().length > 0,
  );
  return textAnswer?.answer_value || 'Unnamed Unit';
}
