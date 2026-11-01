import { EntityManager } from 'typeorm';
import {
  saveNormalizedSurveyAnswers,
  SubmittedQuestion,
  SurveyAnswers,
} from './survey-response-writer';
import { normalizeSectionHAnswers } from './section-h';

const hQuestions: SubmittedQuestion[] = [
  { id: 1, question_code: 'H_WATER_WASTE_GATE', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 2, question_code: 'H_SOLID_WASTE_GATE', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 3, question_code: 'H_GREEN_PRACTICES_GATE', answer_type: 'YES_NO', lookup_type_id: null },
];

function answers(overrides: Record<string, unknown> = {}): SurveyAnswers {
  return new Map(Object.entries({
    H_WATER_WASTE_GATE: true,
    H_SOLID_WASTE_GATE: true,
    H_GREEN_PRACTICES_GATE: true,
    ...overrides,
  }));
}

describe('Section H normalization', () => {
  it('requires an explicit Yes or No for each applicability gate', async () => {
    await expect(normalizeSectionHAnswers(
      { query: jest.fn() } as unknown as EntityManager,
      new Map([['H_WATER_WASTE_GATE', true], ['H_SOLID_WASTE_GATE', true]]),
      hQuestions,
    )).rejects.toThrow('Select Yes or No for green practices.');
  });

  it('stores omitted source shares as zero and enforces the approved per-source units', async () => {
    const questions = [
      ...hQuestions,
      { id: 4, question_code: 'H_ENERGY_CONSUMPTION', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 5, question_code: 'H_ENERGY_GENERATION', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("source_type.code = 'ENERGY_SOURCE'")) {
        if (sql.includes('energy_source_units')) {
          return [{ energy_source_id: 10, unit_id: 100 }, { energy_source_id: 11, unit_id: 101 }];
        }
        return [
          { id: 10, code: 'GRID', requires_text: false },
          { id: 11, code: 'OTHER', requires_text: true },
        ];
      }
      if (sql.includes("source_type.code = 'POWER_SOURCE'")) {
        return [{ id: 20, code: 'POWERHOUSE', requires_text: false }];
      }
      return [];
    });
    const submitted = answers({
      H_ENERGY_CONSUMPTION: [{ energy_source_id: 10, quantity_per_month: 8, unit_id: 100 }],
      H_ENERGY_GENERATION: [{ power_source_id: 20, capacity_kw: 10.25, export_kw: 2 }],
      H_CAPTIVE_EXPORT_CAPACITY: { export_capacity_kw: 7 },
    });

    await normalizeSectionHAnswers(
      { query } as unknown as EntityManager,
      submitted,
      questions,
    );

    expect(submitted.get('H_ENERGY_CONSUMPTION')).toEqual([
      { energy_source_id: 10, quantity_per_month: 8, unit_id: 100, share_pct: 0 },
      { energy_source_id: 11, quantity_per_month: null, unit_id: null, share_pct: 0 },
    ]);
    expect(submitted.get('H_CAPTIVE_EXPORT_CAPACITY')).toEqual({
      captive_capacity_kw: 10.25,
      export_capacity_kw: 7,
    });
  });

  it('rejects a unit that is not mapped to the selected energy source', async () => {
    const questions = [
      ...hQuestions,
      { id: 4, question_code: 'H_ENERGY_CONSUMPTION', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("source_type.code = 'ENERGY_SOURCE'")) {
        return sql.includes('energy_source_units')
          ? [{ energy_source_id: 10, unit_id: 100 }]
          : [{ id: 10, code: 'GRID', requires_text: false }];
      }
      return [];
    });
    await expect(normalizeSectionHAnswers(
      { query } as unknown as EntityManager,
      answers({ H_ENERGY_CONSUMPTION: [{ energy_source_id: 10, quantity_per_month: 8, unit_id: 101 }] }),
      questions,
    )).rejects.toThrow('not available for this energy source');
  });

  it('persists No for each dependent matrix row when a gate is No', async () => {
    const questions = [
      ...hQuestions,
      { id: 4, question_code: 'H_WATER_WASTE_DISPOSAL', answer_type: 'MATRIX', lookup_type_id: null },
      { id: 5, question_code: 'H_GREEN_PRACTICES', answer_type: 'MATRIX', lookup_type_id: null },
    ];
    const query = jest.fn(async (_sql: string, [questionId]: [number]) => questionId === 4
      ? [
          { item_id: 40, answer_type: 'CHOICE', option_id: 400 },
          { item_id: 41, answer_type: 'CHOICE', option_id: 401 },
        ]
      : [{ item_id: 50, answer_type: 'CHOICE', option_id: 500 }]);
    const submitted = answers({
      H_WATER_WASTE_GATE: false,
      H_SOLID_WASTE_GATE: false,
      H_GREEN_PRACTICES_GATE: false,
      H_WATER_WASTE_DISPOSAL: { 40: { choice_value_id: 900 } },
      H_GREEN_PRACTICES: { 50: { choice_value_id: 901 } },
      H_SOLID_WASTE: [{ waste_type_id: 30 }],
    });

    await normalizeSectionHAnswers(
      { query } as unknown as EntityManager,
      submitted,
      questions,
    );

    expect(submitted.get('H_WATER_WASTE_DISPOSAL')).toEqual({
      40: { choice_value_id: 400 },
      41: { choice_value_id: 401 },
    });
    expect(submitted.get('H_GREEN_PRACTICES')).toEqual({
      50: { choice_value_id: 500 },
    });
    expect(submitted.get('H_SOLID_WASTE')).toEqual([]);
  });

  it('stores Other disposal text only with its selected method', async () => {
    const questions = [
      ...hQuestions,
      { id: 4, question_code: 'H_SOLID_WASTE', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT waste.id, waste.code')) return [{ id: 30, code: 'PRODUCTION_SCRAP' }];
      if (sql.includes('FROM lookup_value_links')) {
        return [{ waste_type_id: 30, method_id: 50, code: 'OTHER', requires_text: true }];
      }
      return [];
    });
    const submitted = answers({
      H_SOLID_WASTE: [{
        waste_type_id: 30,
        disposal_method_ids: { option_ids: [50], other_text: { 50: 'Reuse through a local partner' } },
      }],
    });

    await normalizeSectionHAnswers(
      { query } as unknown as EntityManager,
      submitted,
      questions,
    );
    expect(submitted.get('H_SOLID_WASTE')).toEqual([{
      waste_type_id: 30,
      is_generated: true,
      disposal_method_ids: { option_ids: [50], other_text: { 50: 'Reuse through a local partner' } },
    }]);

    await expect(normalizeSectionHAnswers(
      { query } as unknown as EntityManager,
      answers({ H_SOLID_WASTE: [{ waste_type_id: 30, disposal_method_ids: [50] }] }),
      questions,
    )).rejects.toThrow('Specify the Other disposal method.');
  });

  it('persists gates, the calculated captive total, and one Other disposal description', async () => {
    const query = jest.fn(async (sql: string, ..._parameters: unknown[]) =>
      sql.includes('INSERT INTO solid_waste_streams') ? [{ id: 123 }] : [],
    );
    const submitted = answers({
      H_ENERGY_GENERATION: [{ power_source_id: 20, capacity_kw: 10.25, export_kw: 3 }],
      H_CAPTIVE_EXPORT_CAPACITY: { captive_capacity_kw: 999, export_capacity_kw: 4 },
      H_SOLID_WASTE: [{
        waste_type_id: 30,
        is_generated: true,
        disposal_method_ids: { option_ids: [50], other_text: { 50: 'Reuse through a local partner' } },
      }],
    });

    await saveNormalizedSurveyAnswers(
      { query } as unknown as EntityManager,
      'response-id',
      submitted,
      [],
    );

    expect(query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_h_environment'))?.[1])
      .toEqual(['response-id', 10.25, 4, true, true, true]);
    expect(query.mock.calls.find(([sql]) => sql.includes('INSERT INTO solid_waste_disposals'))?.[1])
      .toEqual([123, 50, 'Reuse through a local partner']);
  });
});
