import { DataSource, EntityManager, Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SurveyForm } from '../../dal/entities/survey-form.entity';
import { SurveyQuestion } from '../../dal/entities/survey-question.entity';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { SurveySection } from '../../dal/entities/survey-section.entity';
import { PhotoService } from './photo.service';
import { normalizeSectionEFAnswers } from './section-e-f';
import { SurveyFormService } from './survey-form.service';
import { clearHiddenSurveyAnswers, saveNormalizedSurveyAnswers, SubmittedQuestion } from './survey-response-writer';
import { SyncPayload, SyncService } from './sync.service';

const questions: SubmittedQuestion[] = [
  { id: 1, question_code: 'E_SOURCING_TYPE', answer_type: 'SHARE_PERCENT', lookup_type_id: 101 },
  { id: 2, question_code: 'E_RAW_MATERIAL_ORIGIN', answer_type: 'SHARE_PERCENT', lookup_type_id: 102 },
  { id: 3, question_code: 'F_BUYER_TYPE', answer_type: 'SHARE_PERCENT', lookup_type_id: 103 },
  { id: 4, question_code: 'F_BUYER_LOCATION', answer_type: 'SHARE_PERCENT', lookup_type_id: 104 },
  { id: 5, question_code: 'F_STRENGTH_VS_COMPETITORS', answer_type: 'MATRIX', lookup_type_id: null },
  { id: 6, question_code: 'F_DIGITAL_PRESENCE', answer_type: 'MATRIX', lookup_type_id: null },
  { id: 7, question_code: 'G_AUTOMATION_LEVEL', answer_type: 'SHARE_PERCENT', lookup_type_id: 105 },
  { id: 8, question_code: 'K_BARRIERS', answer_type: 'MATRIX', lookup_type_id: null },
  { id: 9, question_code: 'G_INNOVATION', answer_type: 'MATRIX', lookup_type_id: null },
  { id: 10, question_code: 'E_SUPPLY_DISRUPTION_REASON', answer_type: 'MULTI_CHOICE', lookup_type_id: 203 },
  { id: 11, question_code: 'F_DEMAND_GAP_REASON', answer_type: 'MULTI_CHOICE', lookup_type_id: 204 },
  { id: 12, question_code: 'E_SUPPLY_DISRUPTION', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 13, question_code: 'F_DEMAND_GAP', answer_type: 'YES_NO', lookup_type_id: null },
  { id: 14, question_code: 'E_ON_TIME_DELIVERY', answer_type: 'SINGLE_CHOICE', lookup_type_id: 205 },
  { id: 15, question_code: 'E_PRODUCT_ACCEPTANCE', answer_type: 'SINGLE_CHOICE', lookup_type_id: 206 },
];

const options = [
  { id: 11, type_id: 101, code: 'DIRECT', label: 'Direct', requires_text: false, is_active: true },
  { id: 12, type_id: 101, code: 'OTHER', label: 'Other source', requires_text: true, is_active: true },
  { id: 13, type_id: 101, code: 'OLD', label: 'Old source', requires_text: false, is_active: false },
  { id: 21, type_id: 102, code: 'LOCAL', label: 'Local', requires_text: false, is_active: true },
  { id: 22, type_id: 102, code: 'IMPORTED', label: 'Imported', requires_text: false, is_active: true },
  { id: 31, type_id: 103, code: 'RETAIL', label: 'Retailers', requires_text: false, is_active: true },
  { id: 32, type_id: 103, code: 'OTHER', label: 'Other buyer', requires_text: true, is_active: true },
  { id: 41, type_id: 104, code: 'DOMESTIC', label: 'Domestic', requires_text: false, is_active: true },
  { id: 42, type_id: 104, code: 'EXPORT', label: 'Export', requires_text: false, is_active: true },
  { id: 91, type_id: 105, code: 'AUTO', label: 'Automatic', requires_text: false, is_active: true },
  { id: 501, type_id: 201, code: 'STRONGER', label: 'Stronger', requires_text: false, is_active: true },
  { id: 502, type_id: 201, code: 'DK_NA', label: "Don't Know / NA", requires_text: false, is_active: true },
  { id: 503, type_id: 201, code: 'OLD', label: 'Old strength', requires_text: false, is_active: false },
  { id: 601, type_id: 202, code: 'ACTIVE', label: 'Active', requires_text: false, is_active: true },
  { id: 602, type_id: 202, code: 'NA', label: 'NA', requires_text: false, is_active: true },
  { id: 701, type_id: 203, code: 'OTHER', label: 'Other', requires_text: true, is_active: true },
  { id: 702, type_id: 203, code: 'PRICE', label: 'Price', requires_text: false, is_active: true },
  { id: 703, type_id: 203, code: 'OLD', label: 'Old disruption', requires_text: false, is_active: false },
  { id: 711, type_id: 204, code: 'OTHER', label: 'Other', requires_text: true, is_active: true },
  { id: 712, type_id: 204, code: 'DEMAND', label: 'Demand', requires_text: false, is_active: true },
  { id: 801, type_id: 205, code: 'NOT_FORMALLY_TRACKED', label: 'Not Formally Tracked', requires_text: false, is_active: true },
  { id: 802, type_id: 206, code: 'NOT_FORMALLY_TRACKED', label: 'Not Formally Tracked', requires_text: false, is_active: true },
];

const items = [
  { id: 1001, question_id: 5, item_code: 'QUALITY', item_label: 'Quality', answer_type: 'CHOICE', scale_type_id: 201, allows_text: false },
  { id: 1002, question_id: 5, item_code: 'PRICE', item_label: 'Price', answer_type: 'CHOICE', scale_type_id: 201, allows_text: false },
  { id: 1101, question_id: 6, item_code: 'WEBSITE', item_label: 'Website', answer_type: 'CHOICE', scale_type_id: 202, allows_text: false },
  { id: 1102, question_id: 6, item_code: 'SOCIAL', item_label: 'Social', answer_type: 'CHOICE', scale_type_id: 202, allows_text: false },
  { id: 1201, question_id: 8, item_code: 'B01', item_label: 'Finance', answer_type: 'RATING_1_5', scale_type_id: null, allows_text: false },
  { id: 1301, question_id: 9, item_code: 'OTHER', item_label: 'Other innovation', answer_type: 'CHOICE', scale_type_id: 202, allows_text: true },
];

function lookupManager(available = options) {
  const query = jest.fn(async (sql: string, parameters: unknown[] = []) => {
    if (sql.includes('FROM matrix_items mi')) {
      return items.filter((item) => (parameters[0] as number[]).includes(item.question_id));
    }
    if (sql.includes('FROM lookup_values lv') && sql.includes('lv.type_id = ANY')) {
      return available.filter((option) => (parameters[0] as number[]).includes(option.type_id));
    }
    return [];
  });
  return { manager: { query } as unknown as EntityManager, query };
}

describe('Section E/F normalization', () => {
  it('fills the requested shares and two matrices without changing supplied automation values', async () => {
    const { manager } = lookupManager();
    const answers = new Map<string, unknown>([
      ...questions.slice(0, 6).map((question) => [question.question_code, {}] as [string, unknown]),
      ['G_AUTOMATION_LEVEL', { 91: 25 }],
    ]);
    await normalizeSectionEFAnswers(manager, answers, questions.slice(0, 7));
    expect(answers.get('E_SOURCING_TYPE')).toEqual({ 11: 0, 12: 0 });
    expect(answers.get('E_RAW_MATERIAL_ORIGIN')).toEqual({ 21: 0, 22: 0 });
    expect(answers.get('F_BUYER_TYPE')).toEqual({ 31: 0, 32: 0 });
    expect(answers.get('F_BUYER_LOCATION')).toEqual({ 41: 0, 42: 0 });
    expect(answers.get('F_STRENGTH_VS_COMPETITORS')).toEqual({
      1001: { choice_value_id: 502 }, 1002: { choice_value_id: 502 },
    });
    expect(answers.get('F_DIGITAL_PRESENCE')).toEqual({
      1101: { choice_value_id: 602 }, 1102: { choice_value_id: 602 },
    });
    expect(answers.get('G_AUTOMATION_LEVEL')).toEqual({ 91: 25 });
  });

  it('writes one zero/default row for every checked-in E/F category and matrix item', async () => {
    const seed = readFileSync(join(__dirname, '..', '..', '..', '..', 'database', 'seed.sql'), 'utf8');
    const categoryCounts = [
      ['SOURCING_TYPE', 7], ['RAW_MATERIAL_ORIGIN', 4], ['BUYER_TYPE', 7], ['BUYER_LOCATION', 4],
    ] as const;
    for (const [type, count] of categoryCounts) {
      expect((seed.match(new RegExp(`^\\s*\\('${type}','[^']+','.*',(?:true|false),\\d+\\),?\\r?$`, 'gm')) ?? []))
        .toHaveLength(count);
    }
    expect((seed.match(/\('F_STRENGTH_VS_COMPETITORS',NULL,/g) ?? [])).toHaveLength(6);
    expect((seed.match(/\('F_DIGITAL_PRESENCE',NULL,/g) ?? [])).toHaveLength(5);

    const allOptions = categoryCounts.flatMap(([, count], index) =>
      Array.from({ length: count }, (_unused, i) => ({
        id: 2000 + index * 100 + i, type_id: 101 + index, code: `OPTION_${i}`,
        label: `Category ${i}`, requires_text: false, is_active: true,
      })),
    ).concat(options.filter((option) => option.type_id === 201 || option.type_id === 202));
    const allItems = [
      ...Array.from({ length: 6 }, (_unused, i) => ({
        id: 3000 + i, question_id: 5, item_code: `S${i}`, item_label: `Strength ${i}`,
        answer_type: 'CHOICE', scale_type_id: 201, allows_text: false,
      })),
      ...Array.from({ length: 5 }, (_unused, i) => ({
        id: 4000 + i, question_id: 6, item_code: `D${i}`, item_label: `Digital ${i}`,
        answer_type: 'CHOICE', scale_type_id: 202, allows_text: false,
      })),
    ];
    const query = jest.fn(async (sql: string, parameters: unknown[] = []) => {
      if (sql.includes('FROM matrix_items mi')) return allItems;
      if (sql.includes('FROM lookup_values lv') && sql.includes('lv.type_id = ANY')) {
        return allOptions.filter((option) => (parameters[0] as number[]).includes(option.type_id));
      }
      return [];
    });
    const manager = { query } as unknown as EntityManager;
    const defaultQuestions = questions.slice(0, 6);
    const answers = new Map<string, unknown>(defaultQuestions.map((question) => [question.question_code, {}]));
    await normalizeSectionEFAnswers(manager, answers, defaultQuestions);
    await saveNormalizedSurveyAnswers(manager, 'response-id', answers, defaultQuestions);
    const shares = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_shares')).map(([, params]) => params);
    const matrices = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_matrix_answers')).map(([, params]) => params);
    expect(shares).toHaveLength(22);
    expect(shares.every((row) => row[3] === 0)).toBe(true);
    expect(matrices).toHaveLength(11);
    expect(matrices.filter((row) => row[2] === 502)).toHaveLength(6);
    expect(matrices.filter((row) => row[2] === 602)).toHaveLength(5);
  });

  it('retains decimal shares, optional Other text, inactive categories, and exact totals', async () => {
    const { manager } = lookupManager();
    const answers = new Map<string, unknown>([
      ['E_SOURCING_TYPE', { 11: '33.33', 12: { percent: '66.67', other_text: '  brokers  ' }, 13: 0 }],
      ['F_BUYER_TYPE', { 32: { percent: 40, other_text: '' } }],
    ]);
    await normalizeSectionEFAnswers(manager, answers, [questions[0], questions[2]]);
    expect(answers.get('E_SOURCING_TYPE')).toEqual({ 11: 33.33, 12: { percent: 66.67, other_text: 'brokers' }, 13: 0 });
    expect(answers.get('F_BUYER_TYPE')).toEqual({ 31: 0, 32: 40 });
  });

  it.each([-1, 100.01, 1.001, '1.00000000001', 'bad', true, NaN])('rejects invalid share %p instead of coercing it', async (value) => {
    const { manager } = lookupManager();
    await expect(normalizeSectionEFAnswers(manager, new Map([['E_SOURCING_TYPE', { 11: value }]]), [questions[0]]))
      .rejects.toThrow('between 0 and 100 with at most two decimal places');
  });

  it('rejects totals over 100, unknown categories, and unavailable reference lists', async () => {
    const { manager } = lookupManager();
    await expect(normalizeSectionEFAnswers(manager, new Map([['E_SOURCING_TYPE', { 11: 100, 12: 0.01 }]]), [questions[0]]))
      .rejects.toThrow('share total cannot exceed 100%');
    await expect(normalizeSectionEFAnswers(manager, new Map([['E_SOURCING_TYPE', { 999: 1 }]]), [questions[0]]))
      .rejects.toThrow('unknown saved share category 999');
    const unavailable = lookupManager(options.filter((option) => option.type_id !== 101)).manager;
    await expect(normalizeSectionEFAnswers(unavailable, new Map([['E_SOURCING_TYPE', {}]]), [questions[0]]))
      .rejects.toThrow('share categories are unavailable');
  });

  it('normalizes code-keyed and scalar choices and ratings without defaulting other matrices', async () => {
    const { manager } = lookupManager();
    const answers = new Map<string, unknown>([
      ['F_STRENGTH_VS_COMPETITORS', { QUALITY: '503', PRICE: { choice_value_id: 501 } }],
      ['K_BARRIERS', { B01: '5' }],
      ['G_INNOVATION', { OTHER: { choice_value_id: { option_id: 601, other_text: 'custom process' } } }],
    ]);
    await normalizeSectionEFAnswers(manager, answers, [questions[4], questions[7], questions[8]]);
    expect(answers.get('F_STRENGTH_VS_COMPETITORS')).toEqual({
      1001: { choice_value_id: 503 }, 1002: { choice_value_id: 501 },
    });
    expect(answers.get('K_BARRIERS')).toEqual({ 1201: { rating: 5 } });
    expect(answers.get('G_INNOVATION')).toEqual({ 1301: { choice_value_id: 601, other_text: 'custom process' } });
    const empty = new Map<string, unknown>([['K_BARRIERS', {}]]);
    await normalizeSectionEFAnswers(manager, empty, [questions[7]]);
    expect(empty.get('K_BARRIERS')).toEqual({});
  });

  it('rejects invalid matrix choices, ratings, duplicate rows, and missing defaults', async () => {
    const { manager } = lookupManager();
    const cases: Array<[SubmittedQuestion, unknown, string]> = [
      [questions[4], { QUALITY: 601 }, 'valid option'],
      [questions[4], { QUALITY: { rating: 2 } }, 'choice, not a rating'],
      [questions[4], { QUALITY: { choice_value_id: 501, option_id: 502 } }, 'conflicting saved choices'],
      [questions[4], { QUALITY: { choice_value_id: { option_id: 501, other_text: 'one' }, other_text: 'two' } }, 'conflicting description text'],
      [questions[4], { QUALITY: 501, 1001: 502 }, 'duplicate matrix row'],
      [questions[7], { B01: 6 }, 'rated from 1 to 5'],
      [questions[7], { B01: { choice_value_id: 501 } }, 'rating, not a choice'],
      [questions[7], { UNKNOWN: 1 }, 'unknown or duplicate matrix row'],
    ];
    for (const [question, value, message] of cases) {
      await expect(normalizeSectionEFAnswers(manager, new Map([[question.question_code, value]]), [question]))
        .rejects.toThrow(message);
    }
    const unavailable = lookupManager(options.filter((option) => option.code !== 'DK_NA')).manager;
    await expect(normalizeSectionEFAnswers(unavailable, new Map([['F_STRENGTH_VS_COMPETITORS', {}]]), [questions[4]]))
      .rejects.toThrow('required DK_NA option is unavailable');
  });

  it.each([
    [questions[9], 701, 702, 'E_SUPPLY_DISRUPTION', 'had_supply_disruption'],
    [questions[10], 711, 712, 'F_DEMAND_GAP', 'had_demand_gap'],
  ] as const)('requires Other text only on the visible Yes branch for %s', async (question, other, normal, parent, field) => {
    const { manager } = lookupManager();
    const otherWithoutText = new Map<string, unknown>([[parent, { [field]: true }], [question.question_code, [other]]]);
    await clearHiddenSurveyAnswers(manager, otherWithoutText);
    await expect(normalizeSectionEFAnswers(manager, otherWithoutText, [question])).rejects.toThrow('specify the Other reason');
    const otherWithText = new Map<string, unknown>([
      [parent, { [field]: true }],
      [question.question_code, { option_ids: [other], other_text: { [other]: 'explained' } }],
    ]);
    await clearHiddenSurveyAnswers(manager, otherWithText);
    await expect(normalizeSectionEFAnswers(manager, otherWithText, [question])).resolves.toBeUndefined();
    const normalReason = new Map<string, unknown>([[parent, { [field]: true }], [question.question_code, [normal]]]);
    await clearHiddenSurveyAnswers(manager, normalReason);
    await expect(normalizeSectionEFAnswers(manager, normalReason, [question])).resolves.toBeUndefined();
    const orphanText = new Map<string, unknown>([
      [question.question_code, { option_ids: [normal], other_text: { [other]: 'orphaned description' } }],
    ]);
    await expect(normalizeSectionEFAnswers(manager, orphanText, [question])).rejects.toThrow('unselected reason');
    const invalidText = new Map<string, unknown>([
      [question.question_code, { option_ids: [normal], other_text: { [normal]: 42 } }],
    ]);
    await expect(normalizeSectionEFAnswers(manager, invalidText, [question])).rejects.toThrow('invalid description text');
    const hidden = new Map<string, unknown>([[parent, { [field]: false }], [question.question_code, [other]]]);
    await clearHiddenSurveyAnswers(manager, hidden);
    expect(hidden.has(question.question_code)).toBe(false);
    await expect(normalizeSectionEFAnswers(manager, hidden, [question])).resolves.toBeUndefined();
  });
});

describe('Section E/F form and sync', () => {
  it('exposes active choices and historical share/matrix labels for offline use', async () => {
    const formQuestions = questions.filter((question) => [1, 5, 14].includes(question.id))
      .map((question) => ({ ...question, section_id: 1, question_no: 'i' }));
    const builder = {
      where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(formQuestions),
    };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM matrix_items mi') && sql.includes('mi.item_label')) return items.filter((item) => item.question_id === 5);
      if (sql.includes('l.parent_value_id AS parent_id')) return options.filter((option) => option.is_active).map((option) => ({
        ...option, parent_id: null, type_code: option.type_id === 205 ? 'RELIABILITY_BAND' : 'TEST',
      }));
      if (sql.includes('SELECT q.id AS parent_id')) return options.filter((option) => option.type_id === 101)
        .map((option) => ({ ...option, parent_id: 1, is_selectable: option.is_active }));
      if (sql.includes('SELECT mi.id AS parent_id')) return items.filter((item) => item.question_id === 5)
        .flatMap((item) => options.filter((option) => option.type_id === item.scale_type_id)
          .map((option) => ({ ...option, parent_id: item.id, is_selectable: option.is_active })));
      return [];
    });
    const service = new SurveyFormService(
      { findOne: jest.fn().mockResolvedValue({ id: 1, version: 3 }) } as unknown as Repository<SurveyForm>,
      { find: jest.fn().mockResolvedValue([{ id: 1, section_code: 'E', sort_order: 1 }]) } as unknown as Repository<SurveySection>,
      { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as Repository<SurveyQuestion>,
      { query } as unknown as DataSource,
    );
    const form = await service.getActiveForm();
    const share = form.sections[0].questions.find((question) => question.question_code === 'E_SOURCING_TYPE');
    const reliability = form.sections[0].questions.find((question) => question.question_code === 'E_ON_TIME_DELIVERY');
    expect(share.options.map((option) => option.id)).toEqual([11, 12]);
    expect(reliability.fields[0].options.some((option) => option.label === 'Not Formally Tracked')).toBe(true);
    expect(form.references.section_ef_options).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 13, parent_id: 1, is_selectable: false }),
    ]));
    expect(form.references.matrix_options).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 503, parent_id: 1001, is_selectable: false }),
    ]));
  });

  function setup() {
    const query = jest.fn(async (sql: string, parameters: unknown[] = []) => {
      if (sql.includes('SELECT q.id, q.question_code')) {
        const ids = parameters[0] as number[];
        const defaults = parameters[2] as string[];
        const formQuestions = parameters[1] === 1 ? questions : [questions[6]];
        return formQuestions.filter((question) => ids.includes(question.id) || defaults.includes(question.question_code));
      }
      if (sql.includes('FROM matrix_items mi')) {
        return items.filter((item) => (parameters[0] as number[]).includes(item.question_id));
      }
      if (sql.includes('FROM lookup_values lv') && sql.includes('lv.type_id = ANY')) {
        return options.filter((option) => (parameters[0] as number[]).includes(option.type_id));
      }
      return [];
    });
    const trx = {
      findOne: jest.fn().mockResolvedValue(null), query,
      create: jest.fn((_entity, values) => values), save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SyncService(
      {} as Repository<SurveyResponse>,
      {
        query: jest.fn(async (sql: string) => sql.includes('INSERT INTO sync_log') ? [{ id: 1 }] : []),
        transaction: jest.fn(async (operation: (manager: typeof trx) => Promise<unknown>) => operation(trx)),
      } as unknown as DataSource,
      { attachRequiredPhotos: jest.fn().mockResolvedValue(undefined) } as unknown as PhotoService,
    );
    const payload = (answers: SyncPayload['responses'][number]['answers'], formId = 1): SyncPayload => ({
      device_id: 'device-id', user_id: 'surveyor-id',
      responses: [{
        response_id: 'response-id', form_id: formId, unit_id: 'unit-id',
        started_at: '2026-01-01T00:00:00.000Z', submitted_at: '2026-01-02T00:00:00.000Z', answers,
      }],
    });
    return { service, trx, query, payload };
  }

  it('materializes omitted older-client questions and persists values with matching sums', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: { 11: 33.33, 12: { percent: 66.67, other_text: 'local market' } } },
      { question_id: 14, answer_value: { ontime_delivery_id: 801 } },
      { question_id: 15, answer_value: { product_acceptance_id: 802 } },
    ]));
    expect(result.results[0].status).toBe('synced');
    const shares = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_shares')).map(([, params]) => params);
    const matrices = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_matrix_answers')).map(([, params]) => params);
    expect(shares).toHaveLength(9);
    expect(shares.filter((row) => row[1] === 1).map((row) => row[3])).toEqual([33.33, 66.67]);
    expect(shares.filter((row) => row[1] === 1).reduce((sum, row) => sum + Math.round(Number(row[3]) * 100), 0)).toBe(10_000);
    expect(shares).toContainEqual(['response-id', 1, 12, 66.67, 'local market']);
    expect(shares.filter((row) => row[1] !== 1).every((row) => row[3] === 0)).toBe(true);
    expect(matrices).toHaveLength(4);
    expect(matrices).toContainEqual(['response-id', 1001, 502, null, null]);
    expect(matrices).toContainEqual(['response-id', 1101, 602, null, null]);
    const sectionE = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_e_supply_chain'));
    expect(sectionE[1].slice(-2)).toEqual([801, 802]);
  });

  it('does not add defaults to other forms and rejects foreign questions', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([{ question_id: 7, answer_value: { 91: 25 } }], 2));
    expect(result.results[0].status).toBe('synced');
    const shareRows = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_shares'));
    expect(shareRows).toHaveLength(1);
    expect(shareRows[0][1][1]).toBe(7);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO response_matrix_answers'))).toBe(false);
    const invalid = await service.syncBatch(payload([{ question_id: 1, answer_value: {} }], 2));
    expect(invalid.results[0]).toMatchObject({ status: 'failed', message: expect.stringContaining('does not belong') });
  });

  it('rejects over-limit shares before writing and keeps hidden Other reasons out of persistence', async () => {
    const { service, trx, query, payload } = setup();
    const invalid = await service.syncBatch(payload([{ question_id: 1, answer_value: { 11: 100, 12: 0.01 } }]));
    expect(invalid.results[0]).toMatchObject({ status: 'failed', message: expect.stringContaining('cannot exceed 100%') });
    expect(trx.save).not.toHaveBeenCalled();
    const hidden = await service.syncBatch(payload([
      { question_id: 12, answer_value: { had_supply_disruption: false } },
      { question_id: 10, answer_value: [701] },
    ]));
    expect(hidden.results[0].status).toBe('synced');
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO response_choices'))).toBe(false);
  });
});
