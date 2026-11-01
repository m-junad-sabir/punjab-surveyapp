import { DataSource, EntityManager, Repository } from 'typeorm';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { PhotoService } from './photo.service';
import { normalizeSectionEFAnswers } from './section-e-f';
import { normalizeSectionGAnswers } from './section-g';
import { QUESTION_INPUTS } from './survey-questionnaire';
import { saveNormalizedSurveyAnswers, SubmittedQuestion, validateMajorInputUnits } from './survey-response-writer';
import { SyncPayload, SyncService } from './sync.service';

const lookup = (
  id: number,
  type_code: string,
  code: string,
  label: string,
  requires_text = false,
  base_unit: string | null = null,
  factor_to_base: string | null = null,
) => ({
  id, type_code, code, label, requires_text, is_active: true,
  has_conversion: ['G_PRESSURE_UNIT', 'G_HEATING_UNIT', 'G_EQUIPMENT_UNIT'].includes(type_code),
  base_unit, factor_to_base,
});

const equipmentOptions = [
  lookup(301, 'G_BOILER_TYPE', 'WATER_TUBE', 'Water-tube'),
  lookup(302, 'G_BOILER_TYPE', 'OTHER', 'Other (specify)', true),
  lookup(303, 'G_VESSEL_CATEGORY', 'A', 'A - Compressed air receivers'),
  lookup(304, 'G_VESSEL_CATEGORY', 'J', 'J - Any other (specify)', true),
  lookup(401, 'G_PRESSURE_UNIT', 'PSI', 'psi', false, 'bar', '0.0689476'),
  lookup(402, 'G_PRESSURE_UNIT', 'OTHER', 'Other (specify)', true),
  lookup(403, 'G_PRESSURE_UNIT', 'BAR', 'bar', false, 'bar', '1'),
  lookup(501, 'G_HEATING_UNIT', 'M2', 'm2', false, 'm2', '1'),
  lookup(502, 'G_HEATING_UNIT', 'FT2', 'ft2', false, 'm2', '0.09290304'),
  lookup(503, 'G_HEATING_UNIT', 'OTHER', 'Other (specify)', true),
  lookup(601, 'G_EQUIPMENT_TYPE', 'EQ10', 'Iron or steel test weights'),
  lookup(602, 'G_EQUIPMENT_TYPE', 'EQ13', 'Linear measure'),
  lookup(603, 'G_EQUIPMENT_TYPE', 'EQ21', 'Other (specify)', true),
  lookup(701, 'G_EQUIPMENT_UNIT', 'U03', 'kg', false, 'kg', '1'),
  lookup(702, 'G_EQUIPMENT_UNIT', 'U10', 'metre', false, 'metre', '1'),
  lookup(703, 'G_EQUIPMENT_UNIT', 'U11', 'Other (specify)', true),
];

const links = [
  { parent_value_id: 601, child_value_id: 701 },
  { parent_value_id: 601, child_value_id: 703 },
  { parent_value_id: 602, child_value_id: 702 },
  { parent_value_id: 602, child_value_id: 703 },
  { parent_value_id: 603, child_value_id: 701 },
  { parent_value_id: 603, child_value_id: 702 },
  { parent_value_id: 603, child_value_id: 703 },
];

const genericOptions = [
  { id: 81, type_id: 801, code: 'MANUAL', label: 'Manual', requires_text: false, is_active: true },
  { id: 82, type_id: 801, code: 'AUTO', label: 'Automatic', requires_text: false, is_active: true },
  { id: 91, type_id: 802, code: 'LT5', label: 'Less than 5 years', requires_text: false, is_active: true },
  { id: 92, type_id: 802, code: 'GT20', label: 'More than 20 years', requires_text: false, is_active: true },
  { id: 901, type_id: 803, code: 'NO_PLAN', label: 'No Plan', requires_text: false, is_active: true },
  { id: 902, type_id: 803, code: 'PLANNED', label: 'Planned', requires_text: false, is_active: true },
];

const machineCatalog = [
  { id: 101, unit_type_id: 10, machine_name: 'Boiler', specification: 'Boiler: 20-150 TPH' },
  { id: 202, unit_type_id: 20, machine_name: 'Loom', specification: 'Loom: 300-1,000 RPM' },
];

const automation: SubmittedQuestion = {
  id: 21, question_code: 'G_AUTOMATION_LEVEL', answer_type: 'SHARE_PERCENT', lookup_type_id: 801,
};
const age: SubmittedQuestion = {
  id: 22, question_code: 'G_MACHINERY_AGE', answer_type: 'SHARE_PERCENT', lookup_type_id: 802,
};
const gate: SubmittedQuestion = {
  id: 23, question_code: 'G_INNOVATION_GATE', answer_type: 'YES_NO', lookup_type_id: null,
};
const innovation: SubmittedQuestion = {
  id: 24, question_code: 'G_INNOVATION', answer_type: 'MATRIX', lookup_type_id: null,
};
const matrixItems = [
  { id: 1001, question_id: 24, item_code: 'I01', item_label: 'New product', answer_type: 'CHOICE', scale_type_id: 803, allows_text: false },
  { id: 1002, question_id: 24, item_code: 'I02', item_label: 'Certification', answer_type: 'CHOICE', scale_type_id: 803, allows_text: false },
];

function fixture() {
  const query = jest.fn(async (sql: string, parameters: unknown[] = []) => {
    if (sql.includes('SELECT v.code FROM lookup_values')) {
      const bands: Record<number, string> = {
        1: 'U40_59', 2: 'U60_74', 3: 'U75_84', 4: 'U85_95', 5: 'ABOVE_95', 6: 'UNKNOWN',
      };
      return bands[Number(parameters[0])] ? [{ code: bands[Number(parameters[0])] }] : [];
    }
    if (sql.includes('FROM industry_machine_options')) {
      return machineCatalog.filter((item) => item.id === parameters[0] && item.unit_type_id === parameters[1]);
    }
    if (sql.includes('LEFT JOIN section_g_unit_conversions')) return equipmentOptions;
    if (sql.includes('SELECT l.parent_value_id')) return links;
    if (sql.includes('mi.id AS item_id')) {
      return matrixItems.map((item) => ({ item_id: item.id, answer_type: item.answer_type, option_id: 901 }));
    }
    if (sql.includes('FROM matrix_items mi')) {
      return matrixItems.filter((item) => (parameters[0] as number[]).includes(item.question_id));
    }
    if (sql.includes('FROM lookup_values lv') && sql.includes('lv.type_id = ANY')) {
      return genericOptions.filter((option) => (parameters[0] as number[]).includes(option.type_id));
    }
    return [];
  });
  return { manager: { query } as unknown as EntityManager, query };
}

describe('Section G form and normalization', () => {
  it('uses the product units for major inputs and keeps energy units unchanged', () => {
    expect(QUESTION_INPUTS.E_MAJOR_INPUTS.fields.find((field) => field.key === 'unit_id')?.reference)
      .toBe('product_units');
    expect(QUESTION_INPUTS.H_ENERGY_CONSUMPTION.fields.find((field) => field.key === 'unit_id')?.reference)
      .toBe('measurement_units');
    expect(QUESTION_INPUTS.G_CRITICAL_MACHINES.fields.map((field) => field.reference))
      .toEqual(['industry_machines', undefined, 'machine_specifications']);
    expect(QUESTION_INPUTS.G_MACHINERY_AGE).toBeUndefined();
  });

  it('validates major input unit IDs while preserving both approved and historical units', async () => {
    const query = jest.fn(async (_sql: string, [ids]: [number[]]) =>
      ids.filter((id) => [1, 99].includes(id)).map((id) => ({ id })));
    const manager = { query } as unknown as EntityManager;
    await expect(validateMajorInputUnits(manager, new Map([
      ['E_MAJOR_INPUTS', [{ unit_id: 1 }, { unit_id: '99' }, {}]],
    ]))).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      'SELECT id FROM measurement_units WHERE id = ANY($1::int[])', [[1, 99]],
    );
    await expect(validateMajorInputUnits(manager, new Map([
      ['E_MAJOR_INPUTS', [{ unit_id: 404 }]],
    ]))).rejects.toThrow('valid measurement unit');
    await expect(validateMajorInputUnits(manager, new Map([
      ['E_MAJOR_INPUTS', [{ unit_id: 'invalid' }]],
    ]))).rejects.toThrow('valid measurement unit');
  });

  it('resolves industry-specific machines, custom values, and historical free text', async () => {
    const { manager } = fixture();
    const answers = new Map<string, unknown>([
      ['A_UNIT_TYPE', 10],
      ['G_CRITICAL_MACHINES', [
        { machine_name: 101, specification: 101, quantity: '2' },
        { machine_name: { option_id: 0, other_text: ' Custom machine ' },
          specification: { option_id: 0, other_text: ' Custom specification ' } },
        { machine_name: ' Previously recorded machine ', specification: ' Historic specification ', quantity: 0 },
      ]],
    ]);
    await normalizeSectionGAnswers(manager, answers, []);
    expect(answers.get('G_CRITICAL_MACHINES')).toEqual([
      expect.objectContaining({ machine_name: 'Boiler', specification: 'Boiler: 20-150 TPH', machine_option_id: 101, quantity: 2 }),
      expect.objectContaining({ machine_name: 'Custom machine', specification: 'Custom specification', machine_option_id: null }),
      expect.objectContaining({ machine_name: 'Previously recorded machine', specification: 'Historic specification', quantity: 0 }),
    ]);
  });

  it.each([
    [{ machine_name: 202, specification: 202 }, 'belonging to the selected Type of Unit'],
    [{ machine_name: 101, specification: 202 }, 'specification belonging'],
    [{ machine_name: { option_id: 0, other_text: ' ' } }, 'other machine name'],
    [{ machine_name: 101, specification: { option_id: 0, other_text: '' } }, 'other machine specification'],
    [{ machine_name: 101, quantity: 1.5 }, 'whole number'],
  ])('rejects invalid critical-machine selections %#', async (row, message) => {
    const { manager } = fixture();
    await expect(normalizeSectionGAnswers(manager, new Map<string, unknown>([
      ['A_UNIT_TYPE', 10], ['G_CRITICAL_MACHINES', [row]],
    ]), [])).rejects.toThrow(message);
  });

  it.each([
    [1, true], [2, true], [3, false], [4, false], [5, false],
  ])('applies the 75%% utilization boundary for band %i', async (rate, visible) => {
    const { manager } = fixture();
    const answers = new Map<string, unknown>([
      ['G_UTILIZATION_RATE', { utilization_rate_id: rate }],
      ['G_UNDERUTILIZATION_REASON', [50]],
    ]);
    await normalizeSectionGAnswers(manager, answers, []);
    expect(answers.has('G_UNDERUTILIZATION_REASON')).toBe(visible);
  });

  it('rejects unknown bands and preserves orphaned reasons for explicit correction', async () => {
    const { manager } = fixture();
    const orphan = new Map<string, unknown>([['G_UNDERUTILIZATION_REASON', [50]]]);
    await expect(normalizeSectionGAnswers(manager, orphan, [])).rejects.toThrow('Select a capacity utilization rate');
    expect(orphan.get('G_UNDERUTILIZATION_REASON')).toEqual([50]);
    await expect(normalizeSectionGAnswers(manager, new Map([
      ['G_UTILIZATION_RATE', { utilization_rate_id: 6 }],
    ]), [])).rejects.toThrow('threshold is not configured');
    await expect(normalizeSectionGAnswers(manager, new Map([
      ['G_UNDERUTILIZATION_REASON', { option_ids: [], other_text: {} }],
    ]), [])).resolves.toBeUndefined();
  });

  it('preserves old age counts and writes separately re-entered percentage shares', async () => {
    const { manager, query } = fixture();
    const oldCounts = [{ age_bracket_id: 91, machine_count: 7 }, { age_bracket_id: 92, machine_count: 3 }];
    const legacy = new Map<string, unknown>([['G_MACHINERY_AGE', oldCounts]]);
    await expect(normalizeSectionGAnswers(manager, legacy, [age])).rejects.toThrow('re-enter percentage shares');
    expect(legacy.get('G_MACHINERY_AGE')).toEqual(oldCounts);
    const answers = new Map<string, unknown>([
      ['G_MACHINERY_AGE', { legacy_counts: oldCounts, shares: { 91: '33.33' } }],
      ['G_AUTOMATION_LEVEL', { 81: 50 }],
    ]);
    await normalizeSectionGAnswers(manager, answers, [age, automation]);
    await normalizeSectionEFAnswers(manager, answers, [age, automation]);
    expect(answers.get('G_MACHINERY_AGE')).toEqual({ 91: 33.33, 92: 0 });
    expect(answers.get('G_AUTOMATION_LEVEL')).toEqual({ 81: 50, 82: 0 });
    await saveNormalizedSurveyAnswers(manager, 'response-id', answers, [age, automation]);
    const section = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_g_technology'));
    expect(JSON.parse(String(section?.[1][12]))).toEqual(oldCounts);
    const ageInserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO machinery_age_profile'));
    expect(ageInserts.map(([, params]) => params)).toEqual([
      ['response-id', 91, 33.33], ['response-id', 92, 0],
    ]);
    expect(ageInserts.every(([sql]) => sql.includes('NULL, $3'))).toBe(true);
  });

  it('enforces the share maximum and decimal precision for machinery questions', async () => {
    const { manager } = fixture();
    await expect(normalizeSectionEFAnswers(manager, new Map([
      ['G_AUTOMATION_LEVEL', { 81: 100, 82: 0.01 }],
    ]), [automation])).rejects.toThrow('cannot exceed 100%');
    await expect(normalizeSectionEFAnswers(manager, new Map([
      ['G_MACHINERY_AGE', { 91: 0.001 }],
    ]), [age])).rejects.toThrow('two decimal places');
  });

  it('stores No Plan for each innovation row and rejects a missing gate or invalid matrix value', async () => {
    const { manager, query } = fixture();
    const answers = new Map<string, unknown>([
      ['G_INNOVATION_GATE', false],
      ['G_INNOVATION', { 1001: { choice_value_id: 902 } }],
    ]);
    await normalizeSectionGAnswers(manager, answers, [gate, innovation]);
    await normalizeSectionEFAnswers(manager, answers, [gate, innovation]);
    expect(answers.get('G_INNOVATION')).toEqual({
      1001: { choice_value_id: 901 }, 1002: { choice_value_id: 901 },
    });
    await saveNormalizedSurveyAnswers(manager, 'response-id', answers, [gate, innovation]);
    const saved = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_matrix_answers'));
    expect(saved.map(([, params]) => params)).toEqual([
      ['response-id', 1001, 901, null, null], ['response-id', 1002, 901, null, null],
    ]);
    const section = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_g_technology'));
    expect(section?.[1][11]).toBe(false);
    await expect(normalizeSectionGAnswers(manager, new Map(), [gate, innovation])).rejects.toThrow('Select Yes or No');
    await expect(normalizeSectionEFAnswers(manager, new Map([
      ['G_INNOVATION', { 1001: { choice_value_id: 999 } }],
    ]), [innovation])).rejects.toThrow();
  });
});

describe('Section G equipment', () => {
  const boiler = {
    record_kind: 1, equipment_number: 'B-102', boiler_type_id: 301,
    working_pressure_raw: '150', pressure_unit_id: 401,
    heating_surface_raw: '1500', heating_surface_unit_id: 502,
    vessel_type: 'Old boiler text', capacity_tph: 5, heating_surface: 'Old surface',
  };
  const vessel = {
    record_kind: 2, equipment_number: 'V-202',
    vessel_category_id: { option_id: 304, other_text: 'Custom tank' },
    working_pressure_raw: '2.5', pressure_unit_id: { option_id: 402, other_text: 'atm' },
    capacity_litres: '2000.125',
  };
  const weight = {
    equipment_type_id: 601, equipment_unit_id: 701, capacity_value_raw: '20',
    number_of_instruments: '200', equipment_type: 'Old weights', quantity: 8, capacity: 'Old capacity',
  };

  it('keeps raw values, computes using exact database factors, and flags Other units', async () => {
    const { manager, query } = fixture();
    const answers = new Map<string, unknown>([
      ['G_BOILERS', [boiler, vessel]],
      ['G_WEIGHTS_MEASURES', [
        { ...weight, capacity_value_raw: '9007199254740993.125' },
        { equipment_type_id: { option_id: 603, other_text: 'Custom measure' },
          equipment_unit_id: { option_id: 703, other_text: 'bucket' },
          capacity_value_raw: '2.500', number_of_instruments: 1 },
      ]],
    ]);
    await normalizeSectionGAnswers(manager, answers, []);
    await saveNormalizedSurveyAnswers(manager, 'response-id', answers, []);
    const boilers = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO boilers_pressure_vessels'));
    expect(boilers).toHaveLength(2);
    expect(boilers[0][0]).toContain('$7::numeric * $14::numeric');
    expect(boilers[0][0]).toContain('$11::numeric * $15::numeric');
    expect(boilers[0][1][6]).toBe('150');
    expect(boilers[0][1][13]).toBe('0.0689476');
    expect(boilers[0][1][14]).toBe('0.09290304');
    expect(JSON.parse(String(boilers[0][1][15]))).toEqual({
      vessel_type: 'Old boiler text', capacity_tph: 5, heating_surface: 'Old surface',
    });

    expect(boilers[0][1][16]).toBe(false);
    expect(boilers[1][1][13]).toBeNull();
    expect(boilers[1][1][16]).toBe(true);
    expect(150 * Number(boilers[0][1][13])).toBeCloseTo(10.34214);
    expect(1500 * Number(boilers[0][1][14])).toBeCloseTo(139.35456);
    const weights = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO weights_measures_equipment'));
    expect(weights[0][0]).toContain('$6::numeric * $9::numeric');
    expect(weights[0][1].slice(5, 10)).toEqual(['9007199254740993.125', 701, null, '1', 'kg']);
    expect(JSON.parse(String(weights[0][1][10]))).toEqual({
      equipment_type: 'Old weights', quantity: 8, capacity: 'Old capacity',
    });
    expect(weights[1][1].slice(8, 10)).toEqual([null, null]);
    expect(weights[1][1][11]).toBe(true);
  });

  it.each([
    [{ ...boiler, equipment_number: 'bad number' }, 'only letters'],
    [{ ...boiler, working_pressure_raw: '0' }, 'greater than zero'],
    [{ ...boiler, working_pressure_raw: '1.0001' }, 'three decimal places'],
    [{ ...boiler, pressure_unit_id: { option_id: 402, other_text: '' } }, 'other pressure unit'],
    [{ ...boiler, boiler_type_id: { option_id: 302, other_text: '' } }, 'other boiler type'],
  ])('rejects invalid boiler data %#', async (row, message) => {
    const { manager } = fixture();
    await expect(normalizeSectionGAnswers(manager, new Map([['G_BOILERS', [row]]]), []))
      .rejects.toThrow(message);
  });

  it('requires unique numbers and does not silently reinterpret legacy rows', async () => {
    const { manager } = fixture();
    await expect(normalizeSectionGAnswers(manager, new Map([
      ['G_BOILERS', [boiler, { ...vessel, equipment_number: 'b-102' }]],
    ]), [])).rejects.toThrow('unique within the survey');
    const legacy = new Map<string, unknown>([['G_BOILERS', [{ vessel_type: 'Old vessel', capacity_tph: 3 }]]]);
    await expect(normalizeSectionGAnswers(manager, legacy, [])).rejects.toThrow('older entries must be reviewed');
    expect(legacy.get('G_BOILERS')).toEqual([{ vessel_type: 'Old vessel', capacity_tph: 3 }]);
  });

  it.each([
    [{ ...weight, equipment_unit_id: 702 }, 'compatible'],
    [{ ...weight, capacity_value_raw: '1.2345' }, 'three decimal places'],
    [{ ...weight, number_of_instruments: 0 }, 'whole number'],
    [{ ...weight, number_of_instruments: 1.1 }, 'whole number'],
    [{ ...weight, equipment_type_id: { option_id: 603, other_text: '' } }, 'other equipment type'],
    [{ ...weight, equipment_unit_id: { option_id: 703, other_text: '' } }, 'other equipment unit'],
  ])('rejects invalid weights-and-measures data %#', async (row, message) => {
    const { manager } = fixture();
    await expect(normalizeSectionGAnswers(manager, new Map([['G_WEIGHTS_MEASURES', [row]]]), []))
      .rejects.toThrow(message);
  });
});

describe('Section G sync', () => {
  const questions: SubmittedQuestion[] = [
    { id: 1, question_code: 'A_UNIT_TYPE', answer_type: 'SINGLE_CHOICE', lookup_type_id: 1 },
    { id: 2, question_code: 'G_CRITICAL_MACHINES', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    { id: 3, question_code: 'G_BOILERS', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    { id: 4, question_code: 'G_WEIGHTS_MEASURES', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    { id: 5, question_code: 'G_UTILIZATION_RATE', answer_type: 'SINGLE_CHOICE', lookup_type_id: 2 },
    { id: 6, question_code: 'G_UNDERUTILIZATION_REASON', answer_type: 'MULTI_CHOICE', lookup_type_id: 3 },
    { id: 7, question_code: 'E_MAJOR_INPUTS', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    automation, age, gate, innovation,
  ];

  function syncFixture() {
    const base = fixture();
    const query = jest.fn(async (sql: string, parameters: unknown[] = []) => {
      if (sql.includes('SELECT q.id, q.question_code')) {
        const ids = parameters[0] as number[];
        const defaults = parameters[2] as string[];
        return questions.filter((question) => ids.includes(question.id) || defaults.includes(question.question_code));
      }
      if (sql.includes('SELECT id FROM measurement_units')) {
        return (parameters[0] as number[]).filter((id) => [1, 99].includes(id)).map((id) => ({ id }));
      }
      return base.query(sql, parameters);
    });
    const transaction = {
      query,
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_entity, values) => values),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SyncService(
      {} as Repository<SurveyResponse>,
      {
        query: jest.fn(async (sql: string) => sql.includes('INSERT INTO sync_log') ? [{ id: 1 }] : []),
        transaction: jest.fn(async (operation: (manager: typeof transaction) => Promise<unknown>) => operation(transaction)),
      } as unknown as DataSource,
      { attachRequiredPhotos: jest.fn().mockResolvedValue(undefined) } as unknown as PhotoService,
    );
    const payload = (answers: SyncPayload['responses'][number]['answers']): SyncPayload => ({
      device_id: 'device-id', user_id: 'surveyor-id',
      responses: [{
        response_id: 'response-id', form_id: 1, unit_id: 'unit-id',
        started_at: '2026-01-01T00:00:00.000Z', submitted_at: '2026-01-02T00:00:00.000Z', answers,
      }],
    });
    return { service, query, transaction, payload };
  }

  it('syncs machine choices, converted equipment, age shares, and hidden No Plan rows together', async () => {
    const { service, query, payload } = syncFixture();
    const oldCounts = [{ age_bracket_id: 91, machine_count: 7 }];
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: 10 },
      { question_id: 2, answer_value: [{ machine_name: 101, quantity: 2, specification: 101 }] },
      { question_id: 3, answer_value: [{
        record_kind: 1, equipment_number: 'B-1', boiler_type_id: 301,
        working_pressure_raw: 150, pressure_unit_id: 401,
        heating_surface_raw: 1500, heating_surface_unit_id: 502,
      }] },
      { question_id: 4, answer_value: [{
        equipment_type_id: 601, equipment_unit_id: 701, capacity_value_raw: 20, number_of_instruments: 200,
      }] },
      { question_id: 5, answer_value: { utilization_rate_id: 3 } },
      { question_id: 6, answer_value: [50] },
      { question_id: 7, answer_value: [
        { input_name: 'Steel', unit_id: 99 }, { input_name: 'Sugar', unit_id: 1 },
      ] },
      { question_id: 22, answer_value: { legacy_counts: oldCounts, shares: { 91: 40 } } },
      { question_id: 23, answer_value: false },
    ]));
    expect(result.results[0].status).toBe('synced');
    const machine = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO critical_machines'));
    expect(machine?.[1]).toEqual(['response-id', 'Boiler', 2, 'Boiler: 20-150 TPH', 101]);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO boilers_pressure_vessels'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO weights_measures_equipment'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO response_choices'))).toBe(false);
    const inputs = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO major_inputs'));
    expect(inputs.map(([, params]) => params.slice(1, 3))).toEqual([['Steel', 99], ['Sugar', 1]]);
    const shares = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_shares'));
    expect(shares.map(([, params]) => params)).toEqual(expect.arrayContaining([
      ['response-id', 21, 81, 0, null], ['response-id', 21, 82, 0, null],
      ['response-id', 22, 91, 40, null], ['response-id', 22, 92, 0, null],
    ]));
    const matrix = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO response_matrix_answers'));
    expect(matrix.map(([, params]) => params)).toEqual([
      ['response-id', 1001, 901, null, null], ['response-id', 1002, 901, null, null],
    ]);
    const section = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_g_technology'));
    expect(section?.[1][11]).toBe(false);
    expect(JSON.parse(String(section?.[1][12]))).toEqual(oldCounts);
  });

  it('rejects outdated drafts before writing rather than discarding their counts or innovation answer', async () => {
    const { service, transaction, payload } = syncFixture();
    const legacy = await service.syncBatch(payload([
      { question_id: 22, answer_value: [{ age_bracket_id: 91, machine_count: 7 }] },
      { question_id: 23, answer_value: false },
    ]));
    expect(legacy.results[0]).toMatchObject({
      status: 'failed', message: expect.stringContaining('re-enter percentage shares'),
    });
    expect(transaction.save).not.toHaveBeenCalled();
    const noGate = await service.syncBatch(payload([
      { question_id: 24, answer_value: { 1001: { choice_value_id: 902 } } },
    ]));
    expect(noGate.results[0]).toMatchObject({
      status: 'failed', message: expect.stringContaining('Select Yes or No'),
    });
    expect(transaction.save).not.toHaveBeenCalled();
    const badUnit = await service.syncBatch(payload([
      { question_id: 7, answer_value: [{ input_name: 'Steel', unit_id: 404 }] },
      { question_id: 23, answer_value: false },
    ]));
    expect(badUnit.results[0]).toMatchObject({
      status: 'failed', message: expect.stringContaining('valid measurement unit'),
    });
    expect(transaction.save).not.toHaveBeenCalled();
  });
});
