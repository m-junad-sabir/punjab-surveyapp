import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { jsPDF } from 'jspdf';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: { ignored: ['**'] } },
});
after(() => server.close());

const {
  changeSectionGField,
  equipmentUnitOptions,
  isLegacyMachineryAgeWrapper,
  isSectionGFieldVisible,
  isSectionGRawDecimalField,
  legacySectionGFields,
  machineOptions,
  machineValueForDisplay,
  sectionGRowsError,
  specificationOptions,
} = await server.ssrLoadModule('/src/lib/sectionG.ts');
const { clearHiddenAnswers, isQuestionVisible } = await server.ssrLoadModule('/src/lib/surveyVisibility.ts');
const { materializeSectionEFAnswers, normalizeShares } = await server.ssrLoadModule('/src/lib/sectionEF.ts');
const { revision18FormError } = await server.ssrLoadModule('/src/lib/formRevision.ts');

const option = (id, code, label, extra = {}) => ({ id, code, label, requires_text: false, ...extra });
const question = (id, code, type, extra = {}) => ({
  question_id: id, question_code: code, question_no: 'i', question_text: code,
  answer_type: type, options: [], is_required: false, ...extra,
});
const field = (key, label, options = [], extra = {}) => ({ key, label, type: 'SINGLE_CHOICE', options, ...extra });
const other = option(0, 'OTHER', 'Other (specify)', { requires_text: true, parent_id: null, is_selectable: true });
const machines = [
  other,
  option(101, '101', 'Boiler', { parent_id: 10, is_selectable: true }),
  option(202, '202', 'Loom', { parent_id: 20, is_selectable: true }),
  option(303, '303', 'Old machine', { parent_id: 10, is_selectable: false }),
];
const specifications = [
  other,
  option(101, '101', 'Boiler: 20-150 TPH', { parent_id: 101, is_selectable: true }),
  option(202, '202', 'Loom: 300-1,000 RPM', { parent_id: 202, is_selectable: true }),
];
const machine = question(1, 'G_CRITICAL_MACHINES', 'REPEATING_GROUP', {
  repeatable: true,
  fields: [
    field('machine_name', 'Machine name', machines, { reference: 'industry_machines', required: true }),
    field('quantity', 'Quantity', [], { type: 'NUMBER' }),
    field('specification', 'Specification', specifications, { reference: 'machine_specifications' }),
  ],
});
const kinds = [option(1, 'BOILER', 'Boiler'), option(2, 'VESSEL', 'Pressure vessel')];
const boilerTypes = [option(301, 'WATER_TUBE', 'Water-tube'), option(302, 'OTHER', 'Other (specify)', { requires_text: true })];
const vesselTypes = [option(303, 'A', 'A - Compressed air receivers'), option(304, 'J', 'J - Any other (specify)', { requires_text: true })];
const pressureUnits = [option(401, 'PSI', 'psi'), option(402, 'OTHER', 'Other (specify)', { requires_text: true })];
const heatingUnits = [option(501, 'M2', 'm2'), option(502, 'FT2', 'ft2'), option(503, 'OTHER', 'Other (specify)', { requires_text: true })];
const boilers = question(2, 'G_BOILERS', 'REPEATING_GROUP', {
  repeatable: true,
  fields: [
    field('record_kind', 'Boiler or pressure vessel', kinds, { required: true }),
    field('equipment_number', 'Boiler / vessel number', [], { type: 'TEXT', required: true }),
    field('boiler_type_id', 'Type of boiler', boilerTypes, { required: true }),
    field('vessel_category_id', 'Vessel category', vesselTypes, { required: true }),
    field('working_pressure_raw', 'Working pressure', [], { type: 'NUMBER', required: true }),
    field('pressure_unit_id', 'Working pressure unit', pressureUnits, { required: true }),
    field('capacity_litres', 'Capacity (litres)', [], { type: 'NUMBER', required: true }),
    field('heating_surface_raw', 'Heating surface', [], { type: 'NUMBER', required: true }),
    field('heating_surface_unit_id', 'Heating surface unit', heatingUnits, { required: true }),
  ],
});
const equipmentTypes = [
  option(601, 'EQ10', 'Iron or steel test weights'),
  option(602, 'EQ13', 'Linear measure'),
  option(603, 'EQ21', 'Other (specify)', { requires_text: true }),
];
const equipmentUnits = [
  option(701, 'U03', 'kg', { parent_id: 601 }),
  option(702, 'U10', 'metre', { parent_id: 602 }),
  option(703, 'U11', 'Other (specify)', { parent_id: 601, requires_text: true }),
  option(703, 'U11', 'Other (specify)', { parent_id: 602, requires_text: true }),
  option(701, 'U03', 'kg', { parent_id: 603 }),
  option(702, 'U10', 'metre', { parent_id: 603 }),
  option(703, 'U11', 'Other (specify)', { parent_id: 603, requires_text: true }),
];
const weights = question(3, 'G_WEIGHTS_MEASURES', 'REPEATING_GROUP', {
  repeatable: true,
  fields: [
    field('equipment_type_id', 'Equipment type', equipmentTypes, { required: true }),
    field('equipment_unit_id', 'Unit', equipmentUnits, { required: true }),
    field('capacity_value_raw', 'Capacity / denomination', [], { type: 'NUMBER', required: true }),
    field('number_of_instruments', 'Number of instruments', [], { type: 'NUMBER', required: true }),
  ],
});
const bands = [
  option(11, 'U40_59', '40-59%'), option(12, 'U60_74', '60-74%'),
  option(13, 'U75_84', '75-84%'), option(14, 'U85_95', '85-95%'), option(15, 'ABOVE_95', 'Above 95%'),
];
const utilization = question(4, 'G_UTILIZATION_RATE', 'SINGLE_CHOICE', {
  fields: [field('utilization_rate_id', 'Capacity utilization rate', bands)],
});
const reason = question(5, 'G_UNDERUTILIZATION_REASON', 'MULTI_CHOICE', {
  options: [option(55, 'ENERGY', 'Energy shortage')],
});
const automation = question(6, 'G_AUTOMATION_LEVEL', 'SHARE_PERCENT', {
  options: [option(81, 'MANUAL', 'Manual'), option(82, 'AUTO', 'Automatic')],
});
const age = question(7, 'G_MACHINERY_AGE', 'SHARE_PERCENT', {
  options: [option(91, 'LT5', 'Less than 5 years'), option(92, 'GT20', 'More than 20 years')],
});
const gate = question(8, 'G_INNOVATION_GATE', 'YES_NO', { is_required: true });
const innovation = question(9, 'G_INNOVATION', 'MATRIX', {
  matrix_items: [{
    id: 1001, code: 'I01', label: 'New product', group_label: null,
    answer_type: 'CHOICE', allows_text: false,
    options: [option(901, 'NO_PLAN', 'No Plan'), option(902, 'PLANNED', 'Planned')],
  }],
});
const productUnits = [
  option(1, 'KG', 'Kilogram (kg)', { is_selectable: true }),
  option(99, 'OLD', 'Legacy ton', { is_selectable: false }),
];
const majorInputs = question(30, 'E_MAJOR_INPUTS', 'REPEATING_GROUP', {
  repeatable: true,
  fields: [
    field('input_name', 'Input', [], { type: 'TEXT' }),
    field('unit_id', 'Input unit', productUnits, { reference: 'product_units' }),
  ],
});
const references = { industry_machines: machines, machine_specifications: specifications, product_units: productUnits };
const boilerRow = {
  record_kind: 1, equipment_number: 'B-102', boiler_type_id: 301,
  working_pressure_raw: '150', pressure_unit_id: 401,
  heating_surface_raw: '1500', heating_surface_unit_id: 502,
};
const vesselRow = {
  record_kind: 2, equipment_number: 'V-202', vessel_category_id: 303,
  working_pressure_raw: '2.5', pressure_unit_id: 401, capacity_litres: '2000.125',
};
const weightRow = {
  equipment_type_id: 601, equipment_unit_id: 701, capacity_value_raw: '20', number_of_instruments: '200',
};

test('only caches the updated form after the API and migration provide all revision 18 metadata', () => {
  const updatedBoilers = {
    ...boilers,
    fields: boilers.fields.map((item) => item.key === 'record_kind' ? { ...item, reference: 'g_vessel_kinds' } : item),
  };
  const form = {
    sections: [{ questions: [machine, updatedBoilers, weights, automation, age, gate, innovation, majorInputs] }],
    references,
  };
  assert.equal(revision18FormError(form), null);
  const stale = { ...form, sections: [{ questions: form.sections[0].questions.filter((item) => item !== gate) }] };
  assert.match(revision18FormError(stale), /migration 12/);
  const missingOther = { ...form, references: { ...references, machine_specifications: specifications.slice(1) } };
  assert.match(revision18FormError(missingOther), /updated API/);
  const oldInputs = { ...majorInputs, fields: [field('unit_id', 'Input unit', [], { reference: 'measurement_units' })] };
  const mixed = {
    ...form, sections: [{ questions: form.sections[0].questions.map((item) => item === majorInputs ? oldInputs : item) }],
  };
  assert.match(revision18FormError(mixed), /migration 12/);
});

test('migration reproduces all 216 L2 machines and specifications across the 60 exact industry mappings', async () => {
  const [migration, industriesSql, source] = await Promise.all([
    readFile(new URL('../../database/migration_12_section_g_machinery.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../database/migration_07_type_of_unit.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../documentation/Lists/L2-list-industry-to-machines-and-specs.md', import.meta.url), 'utf8'),
  ]);
  const industries = new Map([...industriesSql.matchAll(/\((\d+),'([^']+)','([^']+)',ARRAY\[/g)]
    .map((match) => [Number(match[1]), { code: match[2], label: match[3] }]));
  const order = new Map();
  const expected = [...source.matchAll(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm)]
    .map((match) => {
      const industry = industries.get(Number(match[1]));
      assert.equal(industry?.label, match[2].trim());
      const position = (order.get(industry.code) ?? 0) + 1;
      order.set(industry.code, position);
      return [industry.code, match[3].trim(), match[4].trim(), position];
    });
  const block = migration.match(/INSERT INTO phase7_machine_seed \(unit_type_code, machine_name, specification, sort_order\) VALUES([\s\S]*?);\s*DO \$\$/)[1];
  const decode = (value) => value.replace(/''/g, "'").replace(/\\([0-9A-F]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  const actual = [...block.matchAll(/\('([^']+)', (?:U&)?'((?:[^']|'')*)', (?:U&)?'((?:[^']|'')*)', (\d+)\)/g)]
    .map((match) => [match[1], decode(match[2]), decode(match[3]), Number(match[4])]);
  assert.equal(expected.length, 216);
  assert.equal(order.size, 60);
  assert.deepEqual(actual, expected);
});

test('migration contains every L3 equipment group and L5 conversion factor without rewriting historical rows', async () => {
  const [migration, l3, setup] = await Promise.all([
    readFile(new URL('../../database/migration_12_section_g_machinery.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../documentation/Lists/L3-list.md', import.meta.url), 'utf8'),
    readFile(new URL('../../SETUP_DATABASE.bat', import.meta.url), 'utf8'),
  ]);
  const expected = [...l3.matchAll(/^\|\s*(EQ\d+)\s*\|\s*([^|]+?)\s*\|\s*(Mass|Length|Volume|Any)\s*\|/gm)]
    .map((match) => [match[1], match[2].trim(), match[3]]);
  const actual = [...migration.matchAll(/\('G_EQUIPMENT_TYPE', '(EQ\d+)', '([^']+)', (?:true|false), \d+, '(Mass|Length|Volume|Any)'/g)]
    .map((match) => [match[1], match[2] === 'Other (specify)' ? 'Other' : match[2], match[3]]);
  assert.equal(actual.length, 21);
  assert.deepEqual(actual, expected);
  for (const factor of ['0.0689476', '0.980665', '0.09290304', '0.000001']) assert.ok(migration.includes(factor));
  assert.match(migration, /ON CONFLICT \(unit_type_id, machine_name\) DO UPDATE/);
  assert.match(migration, /machine_count DROP NOT NULL/);
  assert.match(migration, /conversion_requires_review/);
  assert.match(migration, /NO_PLAN/);
  assert.doesNotMatch(migration, /\b(?:DELETE FROM|TRUNCATE|DROP TABLE)\b/i);
  assert.match(setup, /call :run migration_12_section_g_machinery\.sql/);
});

test('machine and specification options follow industry and retain invalid prior choices for correction', () => {
  assert.deepEqual(machineOptions(machines, 10, null).map((item) => item.id), [0, 101]);
  assert.deepEqual(machineOptions(machines, 20, 101).map((item) => [item.id, item.is_selectable]),
    [[0, true], [202, true], [101, false]]);
  assert.deepEqual(specificationOptions(specifications, machines, 10, 101, null).map((item) => item.id), [0, 101]);
  assert.deepEqual(specificationOptions(specifications, machines, 10, { option_id: 0, other_text: 'Custom' }, null)
    .map((item) => item.id), [0]);
  assert.deepEqual(machineValueForDisplay('Old custom machine', machines), {
    option_id: 0, other_text: 'Old custom machine',
  });
  assert.equal(machineValueForDisplay('Boiler', machines), 101);
  assert.equal(sectionGRowsError(machine, [{ machine_name: 101, specification: 101 }], 10, references), null);
  assert.match(sectionGRowsError(machine, [{ machine_name: 202 }], 10, references), /valid machine name/);
  assert.match(sectionGRowsError(machine, [{ machine_name: 101, specification: 202 }], 10, references), /valid machine specification/);
  assert.match(sectionGRowsError(machine, [{ machine_name: { option_id: 0, other_text: '' } }], 10, references), /Specify/);
  assert.equal(sectionGRowsError(machine, [{ machine_name: 'Historic name', specification: 'Historic spec' }], 10, references), null);
});

test('equipment forms enforce type-specific fields, compatibility, Other text, precision, and uniqueness', () => {
  assert.equal(isSectionGRawDecimalField('G_BOILERS', 'working_pressure_raw'), true);
  assert.equal(isSectionGRawDecimalField('G_BOILERS', 'capacity_litres'), true);
  assert.equal(isSectionGRawDecimalField('G_WEIGHTS_MEASURES', 'capacity_value_raw'), true);
  assert.equal(isSectionGRawDecimalField('G_WEIGHTS_MEASURES', 'number_of_instruments'), false);
  assert.equal(isSectionGFieldVisible('G_BOILERS', boilerRow, 'capacity_litres'), false);
  assert.equal(isSectionGFieldVisible('G_BOILERS', boilerRow, 'heating_surface_raw'), true);
  assert.equal(isSectionGFieldVisible('G_BOILERS', vesselRow, 'capacity_litres'), true);
  assert.equal(isSectionGFieldVisible('G_BOILERS', vesselRow, 'heating_surface_raw'), false);
  assert.deepEqual(equipmentUnitOptions(equipmentUnits, 601, null).map((item) => item.id), [701, 703]);
  assert.equal(sectionGRowsError(boilers, [boilerRow, vesselRow], 10, references), null);
  assert.equal(sectionGRowsError(weights, [weightRow], 10, references), null);
  const exact = '9007199254740993.125';
  const draftRow = JSON.parse(JSON.stringify(changeSectionGField('G_WEIGHTS_MEASURES', weightRow, 'capacity_value_raw', exact)));
  assert.equal(draftRow.capacity_value_raw, exact);
  assert.equal(sectionGRowsError(weights, [draftRow], 10, references), null);
  assert.match(sectionGRowsError(boilers, [boilerRow, { ...vesselRow, equipment_number: 'b-102' }], 10, references), /unique/);
  assert.match(sectionGRowsError(boilers, [{ ...boilerRow, working_pressure_raw: '1.0001' }], 10, references), /three decimal/);
  assert.match(sectionGRowsError(boilers, [{ ...boilerRow, pressure_unit_id: { option_id: 402, other_text: '' } }], 10, references), /Specify/);
  assert.match(sectionGRowsError(weights, [{ ...weightRow, equipment_unit_id: 702 }], 10, references), /equipment unit/);
  assert.match(sectionGRowsError(weights, [{ ...weightRow, number_of_instruments: 1.5 }], 10, references), /whole number/);
  assert.match(sectionGRowsError(weights, [{ ...weightRow, capacity_value_raw: 0 }], 10, references), /greater than zero/);
  assert.match(sectionGRowsError(boilers, [{ vessel_type: 'Old vessel', capacity_tph: 5 }], 10, references), /older entries/);
  assert.deepEqual(legacySectionGFields('G_BOILERS', { vessel_type: 'Old vessel', capacity_tph: 5 }), [
    { label: 'Previous boiler / vessel type', value: 'Old vessel' },
    { label: 'Previous capacity (tonnes per hour)', value: '5' },
  ]);
  assert.deepEqual(changeSectionGField('G_BOILERS', {
    ...boilerRow, vessel_type: 'Old vessel',
  }, 'record_kind', 2), {
    record_kind: 2, equipment_number: 'B-102', working_pressure_raw: '150', pressure_unit_id: 401,
    vessel_type: 'Old vessel',
  });
  assert.deepEqual(changeSectionGField('G_WEIGHTS_MEASURES', weightRow, 'equipment_type_id', 602), {
    equipment_type_id: 602, capacity_value_raw: '20', number_of_instruments: '200',
  });
});

test('share defaults, legacy age counts and the chosen maximum survive draft serialization', () => {
  const oldCounts = [{ age_bracket_id: 91, machine_count: 7 }, { age_bracket_id: 92, machine_count: 3 }];
  const wrapper = { shares: { 91: '33.33' }, legacy_counts: oldCounts };
  assert.equal(isLegacyMachineryAgeWrapper(wrapper), true);
  assert.equal(normalizeShares(age, oldCounts, references).ok, false);
  assert.equal(normalizeShares(age, { 91: 100, 92: 0.01 }, references).ok, false);
  assert.equal(normalizeShares(age, { 91: 0.001 }, references).ok, false);
  const answers = materializeSectionEFAnswers([automation, age], { 7: wrapper }, references);
  const reloaded = JSON.parse(JSON.stringify(answers));
  assert.deepEqual(reloaded[6], { 81: 0, 82: 0 });
  assert.deepEqual(reloaded[7], { legacy_counts: oldCounts, shares: { 91: 33.33, 92: 0 } });
  assert.deepEqual(oldCounts, [{ age_bracket_id: 91, machine_count: 7 }, { age_bracket_id: 92, machine_count: 3 }]);
});

test('utilization threshold and innovation gate match visibility and preserve unresolved legacy answers', () => {
  const questions = [utilization, reason, gate, innovation];
  const low = { 4: { utilization_rate_id: 12 }, 5: [55], 8: true, 9: { 1001: { choice_value_id: 902 } } };
  assert.equal(isQuestionVisible(reason, questions, low), true);
  assert.equal(isQuestionVisible(innovation, questions, low), true);
  const high = { ...low, 4: { utilization_rate_id: 13 }, 8: false };
  assert.equal(isQuestionVisible(reason, questions, high), false);
  assert.equal(isQuestionVisible(innovation, questions, high), false);
  assert.deepEqual(clearHiddenAnswers(questions, high), { 4: { utilization_rate_id: 13 }, 8: false });
  const orphan = { 5: [55], 9: { 1001: { choice_value_id: 902 } } };
  assert.equal(isQuestionVisible(reason, questions, orphan), false);
  assert.equal(isQuestionVisible(innovation, questions, orphan), true);
  assert.deepEqual(clearHiddenAnswers(questions, orphan), orphan);
  assert.equal(isQuestionVisible(innovation, [innovation], orphan), true);
});

test('generated PDF shows Section G labels, historical counts, defaults, gates, and major-input units', async (t) => {
  const png = await readFile(new URL('../public/logos/punjab-industries.png', import.meta.url));
  const jpeg = await readFile(new URL('../public/logos/nespak.jpeg', import.meta.url));
  const originalFetch = globalThis.fetch;
  const originalReader = globalThis.FileReader;
  globalThis.fetch = async (path) => {
    if (path.endsWith('punjab-industries.png')) return { ok: true, blob: async () => new Blob([png], { type: 'image/png' }) };
    if (path.endsWith('nespak.jpeg')) return { ok: true, blob: async () => new Blob([jpeg], { type: 'image/jpeg' }) };
    throw new Error(`Unexpected PDF asset: ${path}`);
  };
  globalThis.FileReader = class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onload?.();
      }).catch((error) => { this.error = error; this.onerror?.(); });
    }
  };
  const captures = [];
  const capture = ['initialized', function () { this.save = () => captures.push(this.output()); }];
  jsPDF.API.events.push(capture);
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalReader === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = originalReader;
    const index = jsPDF.API.events.indexOf(capture);
    if (index >= 0) jsPDF.API.events.splice(index, 1);
  });
  const form = {
    references,
    sections: [
      { section_code: 'E', title: 'Supply', questions: [majorInputs] },
      { section_code: 'G', title: 'Machinery', questions: [machine, utilization, reason, automation, age, boilers, weights, gate, innovation] },
    ],
  };
  const response = {
    response_id: 'response-id', surveyor_id: 'surveyor-id', sync_status: 'draft',
    started_at: '2026-01-01T00:00:00.000Z',
    answers: [
      { question_id: 30, answer_value: [{ input_name: 'Steel', unit_id: '99' }, { input_name: 'Sugar', unit_id: 1 }] },
      { question_id: 1, answer_value: [
        { machine_name: 101, specification: 101, quantity: 2 },
        { machine_name: { option_id: 0, other_text: 'Custom lathe' },
          specification: { option_id: 0, other_text: 'Custom specification' } },
      ] },
      { question_id: 4, answer_value: { utilization_rate_id: 13 } },
      { question_id: 5, answer_value: [55] },
      { question_id: 6, answer_value: { 81: 20 } },
      { question_id: 7, answer_value: { shares: { 91: 40 }, legacy_counts: [{ age_bracket_id: 91, machine_count: 7 }] } },
      { question_id: 2, answer_value: [{ ...boilerRow, vessel_type: 'Historic boiler' }, vesselRow] },
      { question_id: 3, answer_value: [weightRow] },
      { question_id: 8, answer_value: false },
      { question_id: 9, answer_value: { 1001: { choice_value_id: 902 } } },
    ],
  };
  const { downloadSurveyPdf } = await server.ssrLoadModule('/src/lib/surveyPdf.ts');
  await downloadSurveyPdf(response, form);
  const text = [...captures[0].matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)]
    .map((match) => match[1].replace(/\\([\\()])/g, '$1'));
  const valuesAfter = (label) => text.flatMap((item, index) => item === `${label}:` ? [text[index + 1]] : []);
  assert.deepEqual(valuesAfter('Input unit'), ['Legacy ton', 'Kilogram (kg)']);
  assert.deepEqual(valuesAfter('Machine name'), ['Boiler', 'Other (specify): Custom lathe']);
  assert.deepEqual(valuesAfter('Specification'), ['Boiler: 20-150 TPH', 'Other (specify): Custom specification']);
  assert.deepEqual(valuesAfter('Previous count - Less than 5 years'), ['7 machines']);
  assert.deepEqual(valuesAfter('Manual'), ['20%']);
  assert.deepEqual(valuesAfter('Automatic'), ['0%']);
  assert.deepEqual(valuesAfter('Total'), ['20% / 100%', '40% / 100%']);
  assert.ok(valuesAfter('Working pressure unit').includes('psi'));
  assert.deepEqual(valuesAfter('Heating surface unit'), ['ft2']);
  assert.deepEqual(valuesAfter('Capacity (litres)'), ['2000.125']);
  assert.ok(!text.includes('G_UNDERUTILIZATION_REASON'));
  assert.ok(!text.includes('New product:'));
  assert.ok(!captures[0].includes('[object Object]'));

  const empty = { ...response, answers: [{ question_id: 8, answer_value: true }] };
  await downloadSurveyPdf(empty, form);
  const emptyText = [...captures[1].matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)]
    .map((match) => match[1].replace(/\\([\\()])/g, '$1'));
  assert.equal(emptyText.filter((value) => value === 'Not Applicable').length, 3);
  assert.ok(emptyText.includes('New product:'));
});
