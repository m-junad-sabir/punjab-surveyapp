import { EntityManager } from 'typeorm';
import {
  clearHiddenSurveyAnswers,
  saveNormalizedSurveyAnswers,
  SubmittedQuestion,
  SurveyAnswers,
} from './survey-response-writer';
import { normalizeSectionEFAnswers } from './section-e-f';
import { normalizeSectionIJAnswers } from './section-i-j';

const questions: SubmittedQuestion[] = [
  { id: 1, question_code: 'I_COMPLIANCE_GATE', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 2, question_code: 'I_COMPLIANCE_PERMITS', answer_type: 'MATRIX', lookup_type_id: null },
  { id: 3, question_code: 'I_CERTIFICATIONS_GATE', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 4, question_code: 'I_CERTIFICATIONS', answer_type: 'MATRIX', lookup_type_id: null },
  { id: 5, question_code: 'J_STRATEGIC_PLAN_GATE', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 6, question_code: 'J_OPERATIONAL_PLANNING_GATE', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 7, question_code: 'J_PLANNING_AREAS', answer_type: 'MATRIX', lookup_type_id: null },
  { id: 8, question_code: 'J_REINVESTMENT_AREA', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
];

function sentinelManager() {
  const query = jest.fn(async (_sql: string, [questionId, optionCode]: [number, string]) => {
    const optionIds: Record<string, number> = { NA: 901, NONE: 902 };
    return [{
      item_id: questionId * 100,
      answer_type: 'CHOICE',
      option_id: optionIds[optionCode] ?? null,
    }];
  });
  return { manager: { query } as unknown as EntityManager, query };
}

describe('Section I/J gates', () => {
  it('sets N/A independently for each Section I No branch', async () => {
    const { manager, query } = sentinelManager();
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['I_COMPLIANCE_GATE', false],
      ['I_COMPLIANCE_PERMITS', { 200: { choice_value_id: 1 } }],
      ['I_CERTIFICATIONS_GATE', true],
      ['I_CERTIFICATIONS', { 400: { choice_value_id: 2 } }],
    ]);

    await normalizeSectionIJAnswers(manager, answers, questions.slice(0, 4));

    expect(answers.get('I_COMPLIANCE_PERMITS')).toEqual({
      200: { choice_value_id: 901 },
    });
    expect(answers.get('I_CERTIFICATIONS')).toEqual({ 400: { choice_value_id: 2 } });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('lv.code = $2'), [2, 'NA']);
  });

  it('requires explicit Section I gates and an operational-planning answer when the plan exists', async () => {
    const { manager } = sentinelManager();
    await expect(normalizeSectionIJAnswers(manager, new Map(), questions))
      .rejects.toThrow('Select Yes or No for factory safety and environmental compliance.');
    await expect(normalizeSectionIJAnswers(
      manager,
      new Map<string, unknown>([
        ['I_COMPLIANCE_GATE', true],
        ['I_CERTIFICATIONS_GATE', true],
        ['J_STRATEGIC_PLAN_GATE', true],
      ]),
      questions,
    )).rejects.toThrow('Select Yes or No for operational planning.');
  });

  it('stores No Plan for every operational-planning matrix row when its gate is No', async () => {
    const { manager } = sentinelManager();
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['I_COMPLIANCE_GATE', true],
      ['I_CERTIFICATIONS_GATE', true],
      ['J_STRATEGIC_PLAN_GATE', true],
      ['J_OPERATIONAL_PLANNING_GATE', false],
      ['J_PLANNING_AREAS', { 700: { choice_value_id: 1 } }],
    ]);

    await normalizeSectionIJAnswers(manager, answers, questions);

    expect(answers.get('J_PLANNING_AREAS')).toEqual({
      700: { choice_value_id: 902 },
    });
  });

  it('removes all strategic-plan details when the top-level answer is No', async () => {
    const { manager, query } = sentinelManager();
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['I_COMPLIANCE_GATE', true],
      ['I_CERTIFICATIONS_GATE', true],
      ['J_STRATEGIC_PLAN_GATE', false],
      ['J_OPERATIONAL_PLANNING_GATE', true],
      ['J_PLANNING_AREAS', { 700: { choice_value_id: 1 } }],
      ['J_REINVESTMENT_AREA', { reinvestment_area_id: 12 }],
      ['J_REINVESTMENT_LEVEL', { reinvestment_level_id: 13 }],
    ]);

    await clearHiddenSurveyAnswers(manager, answers);
    await normalizeSectionIJAnswers(manager, answers, questions);

    expect([...answers.keys()]).toEqual([
      'I_COMPLIANCE_GATE',
      'I_CERTIFICATIONS_GATE',
      'J_STRATEGIC_PLAN_GATE',
    ]);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires and trims reinvestment Other text, and ignores it for other selections', async () => {
    const query = jest.fn(async (_sql: string) => [{ code: 'OTHER', requires_text: true }]);
    const manager = { query } as unknown as EntityManager;
    const base = new Map<string, unknown>([
      ['I_COMPLIANCE_GATE', true],
      ['I_CERTIFICATIONS_GATE', true],
      ['J_STRATEGIC_PLAN_GATE', true],
      ['J_OPERATIONAL_PLANNING_GATE', true],
      ['J_REINVESTMENT_AREA', { reinvestment_area_id: null, reinvestment_area_other: '' }],
    ]);
    await expect(normalizeSectionIJAnswers(manager, base, questions)).resolves.toBeUndefined();
    expect(base.get('J_REINVESTMENT_AREA')).toEqual({ reinvestment_area_id: null });

    base.set('J_REINVESTMENT_AREA', { reinvestment_area_id: 12 });
    await expect(normalizeSectionIJAnswers(manager, base, questions))
      .rejects.toThrow('Specify the Other primary area of reinvestment.');

    base.set('J_REINVESTMENT_AREA', {
      reinvestment_area_id: 12,
      reinvestment_area_other: '  Waste heat recovery  ',
    });
    await normalizeSectionIJAnswers(manager, base, questions);
    expect(base.get('J_REINVESTMENT_AREA')).toEqual({
      reinvestment_area_id: 12,
      reinvestment_area_other: 'Waste heat recovery',
    });
  });

  it('persists I/J gate answers in their response-linked section records', async () => {
    const query = jest.fn(async (_sql: string, ..._parameters: unknown[]) => []);
    const answers: SurveyAnswers = new Map<string, unknown>([
      ['I_COMPLIANCE_GATE', false],
      ['I_CERTIFICATIONS_GATE', true],
      ['J_STRATEGIC_PLAN_GATE', true],
      ['J_OPERATIONAL_PLANNING_GATE', false],
    ]);

    await saveNormalizedSurveyAnswers(
      { query } as unknown as EntityManager,
      'response-id',
      answers,
      questions,
    );

    expect(query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_i_compliance'))?.[1])
      .toEqual(['response-id', null, false, true]);
    expect(query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_j_strategy'))?.[1])
      .toEqual(['response-id', true, false, null, null, null, null]);
  });

  it('requires and persists descriptions for a selected Section I Other row', async () => {
    const matrixItem = {
      id: 200,
      question_id: 2,
      item_code: 'OTHER',
      item_label: 'Other (specify)',
      answer_type: 'CHOICE',
      scale_type_id: 50,
      allows_text: true,
    };
    const options = [
      { id: 501, type_id: 50, code: 'HELD', label: 'Held', requires_text: false, is_active: true },
      { id: 502, type_id: 50, code: 'NA', label: 'N/A', requires_text: false, is_active: true },
    ];
    const manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM matrix_items mi')) return [matrixItem];
        if (sql.includes('FROM lookup_values lv')) return options;
        return [];
      }),
    } as unknown as EntityManager;
    const matrixQuestion = [questions[1]];
    const answers: SurveyAnswers = new Map([
      ['I_COMPLIANCE_PERMITS', { 200: { choice_value_id: 501 } }],
    ]);

    await expect(normalizeSectionEFAnswers(manager, answers, matrixQuestion))
      .rejects.toThrow('specify the Other item');

    answers.set('I_COMPLIANCE_PERMITS', {
      200: { choice_value_id: 501, other_text: '  Local fire permit  ' },
    });
    await normalizeSectionEFAnswers(manager, answers, matrixQuestion);
    expect(answers.get('I_COMPLIANCE_PERMITS')).toEqual({
      200: { choice_value_id: 501, other_text: 'Local fire permit' },
    });

    answers.set('I_COMPLIANCE_PERMITS', {
      200: { choice_value_id: 502, other_text: 'Stale text' },
    });
    await normalizeSectionEFAnswers(manager, answers, matrixQuestion);
    expect(answers.get('I_COMPLIANCE_PERMITS')).toEqual({
      200: { choice_value_id: 502 },
    });
  });
});
