import { EntityManager } from 'typeorm';
import {
  clearHiddenSurveyAnswers,
  createIndustrialUnit,
  saveNormalizedSurveyAnswers,
  updateExistingUnitCapitalInvestment,
  validateSectionAAnswers,
  validateSectionBAnswers,
} from './survey-response-writer';

describe('Section A validation and interviewees', () => {
  it('accepts empty optional interviewee and capital investment answers', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await expect(
      validateSectionAAnswers({ query } as unknown as EntityManager, new Map()),
    ).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid establishment and parent-company phone/email values', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await expect(validateSectionAAnswers(
      { query } as unknown as EntityManager,
      new Map([
        ['A_CONTACT', { contact_phone: '0300123456', contact_email: 'invalid' }],
        ['A_PARENT_COMPANY', { has_parent_company: true }],
        ['A_PARENT_COMPANY_DETAILS', { phone: '123', cell: '03001234567', email: 'bad@' }],
      ]),
    )).rejects.toThrow('Establishment mobile number must contain exactly 11 digits.');
  });

  it('rejects malformed email values independently of phone validation', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await expect(validateSectionAAnswers(
      { query } as unknown as EntityManager,
      new Map([['A_CONTACT', { contact_email: 'not-an-email' }]]),
    )).rejects.toThrow('Establishment email must be a valid email address.');
  });

  it('requires capital investment amount and currency to be provided together', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await expect(validateSectionAAnswers(
      { query } as unknown as EntityManager,
      new Map([['A_TOTAL_CAPITAL_INVESTMENT', { total_capital_investment: 3 }]]),
    )).rejects.toThrow('Enter both the total capital investment amount and its currency unit.');
  });

  it('validates capital investment currency and associated-establishment PSIC references', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('CAPITAL_INVESTMENT_UNIT')) return [{ id: 8 }];
      if (sql.includes('FROM psic_classes')) return [{ id: 22 }];
      return [];
    });
    await expect(validateSectionAAnswers(
      { query } as unknown as EntityManager,
      new Map([
        ['A_TOTAL_CAPITAL_INVESTMENT', {
          total_capital_investment: 3,
          capital_investment_unit_id: 8,
        }],
        ['A_ASSOCIATED_ESTABLISHMENTS', [{
          name: 'Branch',
          major_activity_psic_class_id: 22,
        }]],
      ]),
    )).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown currency and PSIC reference ids', async () => {
    const query = jest.fn(async () => []);
    await expect(validateSectionAAnswers(
      { query } as unknown as EntityManager,
      new Map([['A_TOTAL_CAPITAL_INVESTMENT', {
        total_capital_investment: 3,
        capital_investment_unit_id: 999,
      }]]),
    )).rejects.toThrow('Choose a valid capital investment currency unit.');
    await expect(validateSectionAAnswers(
      { query } as unknown as EntityManager,
      new Map([['A_ASSOCIATED_ESTABLISHMENTS', [{
        name: 'Branch',
        major_activity_psic_class_id: 999,
      }]]]),
    )).rejects.toThrow('Choose a valid PSIC class for the associated establishment.');
  });

  it('updates only capital investment on a linked existing unit when supplied', async () => {
    const query = jest.fn(async () => [{ id: 'unit-id' }]);
    await updateExistingUnitCapitalInvestment(
      { query } as unknown as EntityManager,
      'unit-id',
      new Map([['A_TOTAL_CAPITAL_INVESTMENT', {
        total_capital_investment: 5.5,
        capital_investment_unit_id: 8,
      }]]),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE industrial_units'),
      ['unit-id', 5.5, 8],
    );
  });

  it('preserves linked-unit investment when the optional answer is blank', async () => {
    const query = jest.fn(async () => []);
    await updateExistingUnitCapitalInvestment(
      { query } as unknown as EntityManager,
      'unit-id',
      new Map(),
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects partial interviewee rows and validates a complete contact number', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await expect(validateSectionAAnswers(
      { query } as unknown as EntityManager,
      new Map([['A_INTERVIEWEES', [{ name: 'Person', designation: 'Manager', contact_number: '123' }]]]),
    )).rejects.toThrow('Interviewee contact number must contain exactly 11 digits.');
  });

  it('persists each completed interviewee row against its survey response', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await saveNormalizedSurveyAnswers(
      { query } as unknown as EntityManager,
      'response-id',
      new Map([['A_INTERVIEWEES', [{
        name: 'Person',
        designation: 'Manager',
        contact_number: '03001234567',
      }]]]),
      [],
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO response_interviewees'),
      ['response-id', 'Person', 'Manager', '03001234567'],
    );
  });
});

describe('conditional survey answers', () => {
  it('removes stale answers from branches excluded by their controlling responses', async () => {
    const query = jest.fn(async () => [{ code: 'PERM_CLOSED' }]);
    const answers = new Map<string, unknown>([
      ['A_PARENT_COMPANY', { has_parent_company: false }],
      ['A_PARENT_COMPANY_DETAILS', { company_name: 'Old parent' }],
      ['A_ASSOCIATED_ESTABLISHMENTS', [{ name: 'Old establishment' }]],
      ['B_OPERATION_STATUS', 12],
      ['B_OPERATION_MONTHS', { operating_months: [1, 2] }],
      ['B_OPERATIONAL_HOURS', { daily_hours: 8, working_months_per_year: 12 }],
      ['B_CLOSURE_REASON', { closure_reason: 'Closed' }],
      ['E_SUPPLY_DISRUPTION', { had_supply_disruption: false }],
      ['E_SUPPLY_DISRUPTION_REASON', [1]],
      ['F_DEMAND_GAP', { had_demand_gap: false }],
      ['F_DEMAND_GAP_REASON', [2]],
      ['K_FUTURE_PLAN', { has_future_plan: false }],
      ['K_COLLABORATIONS', [{ collaborator_type_id: 3 }]],
    ]);

    const isPermanentlyClosed = await clearHiddenSurveyAnswers(
      { query } as unknown as EntityManager,
      answers,
    );

    expect(isPermanentlyClosed).toBe(true);
    expect(answers.has('A_PARENT_COMPANY_DETAILS')).toBe(false);
    expect(answers.has('A_ASSOCIATED_ESTABLISHMENTS')).toBe(false);
    expect(answers.has('B_OPERATION_MONTHS')).toBe(false);
    expect(answers.has('B_OPERATIONAL_HOURS')).toBe(false);
    expect(answers.has('B_CLOSURE_REASON')).toBe(true);
    expect(answers.has('E_SUPPLY_DISRUPTION_REASON')).toBe(false);
    expect(answers.has('F_DEMAND_GAP_REASON')).toBe(false);
    expect(answers.has('K_COLLABORATIONS')).toBe(false);
  });

  it('removes the closure reason when the establishment is operating', async () => {
    const query = jest.fn(async () => [{ code: 'ACTIVE' }]);
    const answers = new Map<string, unknown>([
      ['B_OPERATION_STATUS', 4],
      ['B_OPERATION_MONTHS', { operating_months: [1] }],
      ['B_OPERATIONAL_HOURS', { daily_hours: 8 }],
      ['B_CLOSURE_REASON', { closure_reason: 'Stale reason' }],
    ]);

    const isPermanentlyClosed = await clearHiddenSurveyAnswers(
      { query } as unknown as EntityManager,
      answers,
    );

    expect(isPermanentlyClosed).toBe(false);
    expect(answers.has('B_CLOSURE_REASON')).toBe(false);
    expect(answers.has('B_OPERATION_MONTHS')).toBe(true);
    expect(answers.has('B_OPERATIONAL_HOURS')).toBe(true);
  });

  it.each(['invalid', 0, 1.5])('rejects an invalid operation status: %s', async (status) => {
    const query = jest.fn(async () => []);
    await expect(clearHiddenSurveyAnswers(
      { query } as unknown as EntityManager,
      new Map([['B_OPERATION_STATUS', status]]),
    )).rejects.toThrow('The selected operation status is not present in the active reference list.');
    expect(query).not.toHaveBeenCalled();
  });

  it('stores null working days for a permanently closed establishment', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await saveNormalizedSurveyAnswers(
      { query } as unknown as EntityManager,
      'response-id',
      new Map<string, unknown>([
        ['B_OPERATION_STATUS', 12],
        ['B_CLOSURE_REASON', { closure_reason: 'Closed' }],
        ['B_OPERATION_MONTHS', { operating_months: [1, 2] }],
        ['B_OPERATIONAL_HOURS', {
          daily_shift_id: 3,
          daily_hours: 8,
          working_days_per_week: 5,
          working_months_per_year: 10,
        }],
      ]),
      [],
      true,
    );

    const operationInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_b_operations'));
    expect(operationInsert?.[1]).toEqual([
      'response-id',
      null,
      12,
      'Closed',
      null,
      null,
      null,
      null,
    ]);
  });

  it('retains the existing working-day default for a non-closed establishment', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await saveNormalizedSurveyAnswers(
      { query } as unknown as EntityManager,
      'response-id',
      new Map([['B_OPERATION_STATUS', 4]]),
      [],
    );

    const operationInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_b_operations'));
    expect(operationInsert?.[1]?.[6]).toBe(6);
  });

  it('does not default hidden operational fields when status is not selected', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await saveNormalizedSurveyAnswers(
      { query } as unknown as EntityManager,
      'response-id',
      new Map([['B_OPERATIONAL_HOURS', { working_days_per_week: 5, working_months_per_year: 10 }]]),
      [],
    );

    const operationInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_b_operations'));
    expect(operationInsert?.[1]).toEqual(['response-id', null, null, null, null, null, null, null]);
  });
});

describe('Section B operating schedule', () => {
  const manager = { query: jest.fn(async () => []) } as unknown as EntityManager;

  it.each([
    ['working_days_per_week', 0, 'Total working days per week must be a whole number between 1 and 7.'],
    ['working_days_per_week', 8, 'Total working days per week must be a whole number between 1 and 7.'],
    ['working_days_per_week', 1.5, 'Total working days per week must be a whole number between 1 and 7.'],
    ['working_months_per_year', 0, 'Total working months per year must be a whole number between 1 and 12.'],
    ['working_months_per_year', 13, 'Total working months per year must be a whole number between 1 and 12.'],
    ['working_months_per_year', 'invalid', 'Total working months per year must be a whole number between 1 and 12.'],
    ['working_months_per_year', 11.5, 'Total working months per year must be a whole number between 1 and 12.'],
  ])('rejects invalid %s value %s', async (key, value, message) => {
    await expect(validateSectionBAnswers(
      manager,
      new Map([['B_OPERATIONAL_HOURS', { [key]: value }]]),
    )).rejects.toThrow(message);
  });

  it.each([
    [{ working_days_per_week: 1, working_months_per_year: 1 }],
    [{ working_days_per_week: 7, working_months_per_year: 12 }],
    [{ working_days_per_week: null, working_months_per_year: '' }],
  ])('accepts valid boundaries and optional blanks: %j', async (hours) => {
    await expect(validateSectionBAnswers(
      manager,
      new Map([['B_OPERATIONAL_HOURS', hours]]),
    )).resolves.toBeUndefined();
  });

  it.each([
    ['B_OPERATIONAL_HOURS', [{ working_months_per_year: 13 }], 'Provide a valid working schedule.'],
    ['B_OPERATIONAL_HOURS', 'invalid', 'Provide a valid working schedule.'],
    ['B_OPERATION_MONTHS', [1, 13], 'Choose valid months of operation.'],
    ['B_OPERATION_MONTHS', 'invalid', 'Choose valid months of operation.'],
    ['B_OPERATIONAL_HOURS', { daily_hours: 'invalid' }, 'Daily hours must be a number.'],
  ])('rejects malformed %s answers', async (key, value, message) => {
    await expect(validateSectionBAnswers(
      manager,
      new Map([[key, value]]),
    )).rejects.toThrow(message);
  });

  it.each([[0], [13], [1, 1], [1, 'invalid']])(
    'rejects invalid or repeated selected months: %j',
    async (...months) => {
      await expect(validateSectionBAnswers(
        manager,
        new Map([['B_OPERATION_MONTHS', { operating_months: months }]]),
      )).rejects.toThrow('Choose valid months of operation');
    },
  );

  it('accepts all twelve months and validates a shift against its active lookup', async () => {
    const query = jest.fn(async () => [{ id: 21 }]);
    await expect(validateSectionBAnswers(
      { query } as unknown as EntityManager,
      new Map([
        ['B_OPERATION_MONTHS', { operating_months: Array.from({ length: 12 }, (_, i) => i + 1) }],
        ['B_OPERATIONAL_HOURS', { daily_shift_id: 21, working_days_per_week: 7, working_months_per_year: 12 }],
      ]),
    )).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("lt.code = 'DAILY_HOURS'"), [21]);
  });

  it('rejects a shift outside the active DAILY_HOURS lookup', async () => {
    await expect(validateSectionBAnswers(
      manager,
      new Map([['B_OPERATIONAL_HOURS', { daily_shift_id: 21 }]]),
    )).rejects.toThrow('Choose a valid daily operating hours / shift option.');
  });

  it('persists selected months and the supplied working schedule', async () => {
    const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => []);
    await saveNormalizedSurveyAnswers(
      { query } as unknown as EntityManager,
      'response-id',
      new Map<string, unknown>([
        ['B_OPERATION_STATUS', 4],
        ['B_OPERATION_MONTHS', { operating_months: [1, 4, 12] }],
        ['B_OPERATIONAL_HOURS', {
          daily_shift_id: 21,
          daily_hours: 7.5,
          working_days_per_week: 6,
          working_months_per_year: 3,
        }],
      ]),
      [],
    );
    const operationInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_b_operations'));
    expect(operationInsert?.[1]).toEqual(['response-id', [1, 4, 12], 4, null, 21, 7.5, 6, 3]);
  });
});

describe('industry PSIC selection', () => {
  function setup(other = false, mapped = true) {
    const query = jest.fn(async (sql: string, parameters: unknown[]) => {
      if (sql.includes('SELECT v.requires_text')) return [{ requires_text: other }];
      if (sql.includes('FROM unit_type_psic_classes')) {
        return mapped ? [{ id: 30, group_id: 20, division_id: 10 }] : [];
      }
      if (sql.includes('FROM (SELECT $1::integer')) {
        expect(parameters).toEqual([10, 20, 30]);
        return [{
          division_id: 10, division_code: '96', division_name: 'Services',
          group_id: 20, group_code: '960', group_name: 'Services',
          class_id: 30, class_code: other ? '9609' : '1072', class_name: other ? 'Other personal service activities n.e.c.' : 'Manufacture of sugar',
        }];
      }
      if (sql.includes('INSERT INTO industrial_units')) return [{ id: 'saved-unit' }];
      return [];
    });
    const answers = new Map<string, unknown>([
      ['A_UNIT_TYPE', other ? { option_id: 61, other_text: 'Custom industry' } : 1],
      ['A_PSIC', { psic_class_id: 30, psic_group_id: 999, psic_division_id: 999 }],
    ]);
    const save = () => createIndustrialUnit(
      { query } as unknown as EntityManager,
      'surveyor', answers, 'Example Unit',
      { lat: null, lng: null, accuracy: null }, true,
    );
    return { query, save };
  }

  it('derives the hierarchy and saves the selected industry', async () => {
    const { query, save } = setup();
    await expect(save()).resolves.toBe('saved-unit');
    expect(query).toHaveBeenCalledWith(
      'UPDATE industrial_units SET unit_type_id = $2, unit_type_other_text = $3 WHERE id = $1',
      ['saved-unit', 1, null],
    );
  });

  it('keeps specified Other text and the official 9609 class', async () => {
    const { query, save } = setup(true);
    await expect(save()).resolves.toBe('saved-unit');
    const insertion = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO industrial_units'));
    expect(insertion?.[1]).toContain('9609 - Other personal service activities n.e.c.');
    expect(query).toHaveBeenCalledWith(
      'UPDATE industrial_units SET unit_type_id = $2, unit_type_other_text = $3 WHERE id = $1',
      ['saved-unit', 61, 'Custom industry'],
    );
  });

  it('rejects a PSIC class outside the chosen industry before inserting the unit', async () => {
    const { query, save } = setup(false, false);
    await expect(save()).rejects.toThrow('Select a PSIC class belonging to the chosen Type of Unit.');
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO industrial_units'))).toBe(false);
  });
});