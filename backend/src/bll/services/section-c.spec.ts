import { DataSource, EntityManager, Repository } from 'typeorm';
import { SurveyForm } from '../../dal/entities/survey-form.entity';
import { SurveyQuestion } from '../../dal/entities/survey-question.entity';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { SurveySection } from '../../dal/entities/survey-section.entity';
import { PhotoService } from './photo.service';
import { SurveyFormService } from './survey-form.service';
import { normalizeSectionCAnswers } from './survey-response-writer';
import { SyncPayload, SyncService } from './sync.service';

describe('Section C product references', () => {
  it('includes industry, kind, selectability, and unit options in the offline form', async () => {
    const products = [
      { id: 0, code: 'OTHER', label: 'Other (specify)', requires_text: true, parent_id: null, product_kind: null, is_selectable: true },
      { id: 101, code: '101', label: 'Sugar', requires_text: false, parent_id: 10, product_kind: 'MAIN', is_selectable: true },
      { id: 102, code: '102', label: 'Bagasse', requires_text: false, parent_id: 10, product_kind: 'SECONDARY', is_selectable: true },
    ];
    const units = [
      { id: 5, code: 'KG', label: 'Kilogram (kg)', requires_text: false, is_selectable: true },
      { id: 99, code: 'TON', label: 'Ton', requires_text: false, is_selectable: false },
    ];
    const builder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 2, section_id: 1, question_code: 'C_PRODUCTS', question_no: '-', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      ]),
    };
    const service = new SurveyFormService(
      { findOne: jest.fn().mockResolvedValue({ id: 1, version: 3 }) } as unknown as Repository<SurveyForm>,
      { find: jest.fn().mockResolvedValue([{ id: 1, section_code: 'C', title: 'Products', sort_order: 1 }]) } as unknown as Repository<SurveySection>,
      { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as Repository<SurveyQuestion>,
      { query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM industry_product_options p')) return products;
        if (sql.includes('LEFT JOIN product_measurement_units p ON p.unit_id = m.id')) return units;
        return [];
      }) } as unknown as DataSource,
    );

    const form = await service.getActiveForm();
    const fields = form.sections[0].questions[0].fields;
    expect(form.references.industry_products).toEqual(products);
    expect(fields.find((field) => field.key === 'product_name')?.options).toEqual(products);
    for (const key of ['daily_output_unit_id', 'annual_production_unit_id', 'unit_of_measurement_id']) {
      expect(fields.find((field) => field.key === key)?.options).toEqual(units);
    }
  });
});

describe('Section C sync and persistence', () => {
  const questions = [
    { id: 1, question_code: 'A_UNIT_TYPE', answer_type: 'SINGLE_CHOICE', lookup_type_id: 30 },
    { id: 2, question_code: 'C_PRODUCTS', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
  ];

  function setup() {
    let nextProductId = 201;
    const query = jest.fn(async (sql: string, parameters: unknown[] = []) => {
      if (sql.includes('SELECT q.id, q.question_code')) {
        const ids = parameters[0] as number[];
        return questions.filter((question) => ids.includes(question.id));
      }
      if (sql.includes('SELECT v.id FROM lookup_values v')) {
        return parameters[0] === 10 || parameters[0] === 61 ? [{ id: parameters[0] }] : [];
      }
      if (sql.includes('SELECT product_name FROM industry_product_options')) {
        const [id, industryId, kind] = parameters;
        if (id === 101 && industryId === 10 && kind === 'MAIN') return [{ product_name: 'Sugar' }];
        if (id === 102 && industryId === 10 && kind === 'SECONDARY') return [{ product_name: 'Bagasse' }];
        return [];
      }
      if (sql.includes('SELECT id FROM measurement_units')) {
        return (parameters[0] as number[]).filter((id) => id === 5 || id === 99).map((id) => ({ id }));
      }
      if (sql.includes('SELECT id, code, description FROM hs_codes')) {
        return parameters[0] === 50 ? [{ id: 50, code: '1701', description: 'Sugar' }] : [];
      }
      if (sql.includes('INSERT INTO products')) return [{ id: nextProductId++ }];
      return [];
    });
    const trx = {
      findOne: jest.fn().mockResolvedValue(null),
      query,
      create: jest.fn((_entity, values) => values),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      query: jest.fn(async (sql: string) => sql.includes('INSERT INTO sync_log') ? [{ id: 1 }] : []),
      transaction: jest.fn(async (operation: (manager: typeof trx) => Promise<unknown>) => operation(trx)),
    };
    const service = new SyncService(
      {} as Repository<SurveyResponse>,
      dataSource as unknown as DataSource,
      { attachRequiredPhotos: jest.fn().mockResolvedValue(undefined) } as unknown as PhotoService,
    );
    const payload = (productRows: unknown, industry: unknown = 10): SyncPayload => ({
      device_id: 'device-id',
      user_id: 'surveyor-id',
      responses: [{
        response_id: 'response-id',
        form_id: 1,
        unit_id: 'unit-id',
        started_at: '2026-01-01T00:00:00.000Z',
        submitted_at: '2026-01-02T00:00:00.000Z',
        answers: [
          { question_id: 1, answer_value: industry },
          { question_id: 2, answer_value: productRows },
        ],
      }],
    });
    return { service, trx, query, payload };
  }

  it('resolves catalog and Other selections and stores main-only details only for main products', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([
      {
        product_kind: 1, product_name: 101, daily_avg_output: 12, daily_output_unit_id: 5,
        transformation_stage_ids: [31], revenue_share_pct: 42, hs_code_id: 50,
      },
      {
        product_kind: 2, product_name: { option_id: 0, other_text: '  Custom by-product  ' },
        annual_production_unit_id: 99, transformation_stage_ids: [32], revenue_share_pct: 99,
        hs_code_id: 50, hs_code_text: 'stale text',
      },
    ]));

    expect(result.results[0].status).toBe('synced');
    const inserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO products'));
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1].slice(0, 6)).toEqual(['response-id', 'MAIN', 'Sugar', 12, 5, null]);
    expect(inserts[0][1].slice(10, 13)).toEqual([42, 50, '1701 - Sugar']);
    expect(inserts[1][1].slice(0, 8)).toEqual(['response-id', 'SECONDARY', 'Custom by-product', null, null, null, 99, null]);
    expect(inserts[1][1].slice(10, 13)).toEqual([null, null, null]);
    const stages = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO product_transformation_stages'));
    expect(stages).toHaveLength(1);
    expect(stages[0][1]).toEqual([201, 31]);
  });

  it('preserves legacy free-text names and existing unit IDs while removing stale secondary fields', async () => {
    const { query } = setup();
    const answers = new Map<string, unknown>([['C_PRODUCTS', [
      {
        product_kind: 'SECONDARY', product_name: '  123  ', unit_of_measurement_id: 99,
        transformation_stage_ids: [32], revenue_share_pct: 4, hs_code_id: 50, hs_code_text: 'old',
      },
    ]]]);
    await normalizeSectionCAnswers({ query } as unknown as EntityManager, answers);
    expect(answers.get('C_PRODUCTS')).toEqual([
      { product_kind: 'SECONDARY', product_name: '123', unit_of_measurement_id: 99 },
    ]);
    expect(query.mock.calls.some(([sql]) => sql.includes('industry_product_options'))).toBe(false);
    expect(query.mock.calls.some(([sql]) => sql.includes('SELECT v.id FROM lookup_values v'))).toBe(false);
  });

  it('syncs legacy text and units without requiring a new industry selection', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([
      { product_kind: 'MAIN', product_name: 'Historic product', unit_of_measurement_id: 99 },
    ], null));
    expect(result.results[0].status).toBe('synced');
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO products'));
    expect(insert?.[1][2]).toBe('Historic product');
    expect(insert?.[1][9]).toBe(99);
  });

  it('accepts Other products for the separate Other industry', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([
      { product_kind: 2, product_name: { option_id: 0, other_text: 'Custom product' } },
    ], 61));
    expect(result.results[0].status).toBe('synced');
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO products'));
    expect(insert?.[1][2]).toBe('Custom product');
  });

  it.each([
    [{ product_kind: 1, product_name: 102 }, 10, 'Choose a product belonging to the selected Type of Unit and product kind.'],
    [{ product_kind: 1, product_name: 101 }, 11, 'Select a valid Type of Unit before choosing a product.'],
    [{ product_kind: 1, product_name: { option_id: 0, other_text: '  ' } }, 10, 'Specify the other product name.'],
    [{ product_kind: 1, product_name: { option_id: 0, other_text: 'Custom' } }, null, 'Select a Type of Unit before choosing a product.'],
    [{ product_kind: 1, product_name: -1 }, 10, 'Choose a valid product name for each product row.'],
    [{ product_kind: 1, product_name: 1.5 }, 10, 'Choose a valid product name for each product row.'],
    [{ product_kind: 'INVALID', product_name: 'Legacy' }, 10, 'Choose Main or Secondary product for each product row.'],
    [{ product_kind: 1, product_name: 'Legacy', daily_output_unit_id: 404 }, 10, 'Choose a valid product measurement unit.'],
    [{ product_kind: 1, product_name: 'Legacy', daily_output_unit_id: 'invalid' }, 10, 'Choose a valid product measurement unit.'],
  ])('rejects invalid rows before any response is saved', async (row, industry, message) => {
    const { service, trx, payload } = setup();
    const result = await service.syncBatch(payload([row], industry));
    expect(result.results[0]).toMatchObject({ status: 'failed', message });
    expect(trx.save).not.toHaveBeenCalled();
  });

  it('rejects malformed product collections rather than silently discarding them', async () => {
    const { service, trx, payload } = setup();
    const result = await service.syncBatch(payload({ product_name: 'Sugar' }));
    expect(result.results[0]).toMatchObject({ status: 'failed', message: 'Provide valid product rows.' });
    expect(trx.save).not.toHaveBeenCalled();
  });
});
