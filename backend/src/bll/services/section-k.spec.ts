import { EntityManager } from 'typeorm';
import {
  clearHiddenSurveyAnswers,
  saveNormalizedSurveyAnswers,
  SubmittedQuestion,
  SurveyAnswers,
} from './survey-response-writer';
import { normalizeSectionKAnswers } from './section-k';

const questions: SubmittedQuestion[] = [
  { id: 1, question_code: 'K_FUTURE_PLAN', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
  { id: 2, question_code: 'K_BARRIERS_GATE', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 3, question_code: 'K_BARRIERS', answer_type: 'MATRIX', lookup_type_id: null },
];

describe('Section K conditional answers', () => {
  it('clears collaboration purposes when the selected collaborator is NONE', async () => {
    const manager = {
      query: jest.fn(async () => [{ id: 8 }]),
    } as unknown as EntityManager;
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['K_FUTURE_PLAN', { has_future_plan: true }],
      ['K_COLLABORATIONS', [
        { collaborator_type_id: 8, purpose_ids: [21] },
        { collaborator_type_id: 9, purpose_ids: [22] },
      ]],
    ]);

    await clearHiddenSurveyAnswers(manager, answers);

    expect(answers.get('K_COLLABORATIONS')).toEqual([
      { collaborator_type_id: 8 },
      { collaborator_type_id: 9, purpose_ids: [22] },
    ]);
  });

  it('omits all dependent answers when there is no future plan', async () => {
    const manager = { query: jest.fn(async () => []) } as unknown as EntityManager;
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['K_FUTURE_PLAN', { has_future_plan: false }],
      ['K_BARRIERS_GATE', false],
      ['K_COLLABORATIONS', [{ collaborator_type_id: 9, purpose_ids: [22] }]],
      ['K_BARRIERS', { '301': { rating: 5 } }],
    ]);

    await clearHiddenSurveyAnswers(manager, answers);
    await normalizeSectionKAnswers(manager, answers, questions);

    expect([...answers.keys()]).toEqual(['K_FUTURE_PLAN']);
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('stores null ratings for every barrier when the barrier gate is No', async () => {
    const manager = {
      query: jest.fn(async () => [
        { item_id: 301, answer_type: 'RATING_1_5' },
        { item_id: 302, answer_type: 'RATING_1_5' },
      ]),
    } as unknown as EntityManager;
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['K_FUTURE_PLAN', { has_future_plan: true }],
      ['K_BARRIERS_GATE', false],
    ]);

    await normalizeSectionKAnswers(manager, answers, questions);

    expect(answers.get('K_BARRIERS')).toEqual({
      '301': { rating: null },
      '302': { rating: null },
    });
  });

  it('persists null ratings for all barrier rows on the No branch', async () => {
    const calls: Array<{ sql: string; parameters: unknown[] }> = [];
    const manager = {
      query: jest.fn(async (sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return [];
      }),
    } as unknown as EntityManager;
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['K_FUTURE_PLAN', { has_future_plan: true }],
      ['K_BARRIERS_GATE', false],
      ['K_BARRIERS', {
        '301': { rating: null },
        '302': { rating: null },
      }],
    ]);

    await saveNormalizedSurveyAnswers(manager, 'response-id', answers, [questions[2]]);

    expect(calls.filter(({ sql }) => sql.includes('INSERT INTO response_matrix_answers'))).toEqual([
      {
        sql: expect.stringContaining('INSERT INTO response_matrix_answers'),
        parameters: ['response-id', 301, null, null, null],
      },
      {
        sql: expect.stringContaining('INSERT INTO response_matrix_answers'),
        parameters: ['response-id', 302, null, null, null],
      },
    ]);
  });
});
