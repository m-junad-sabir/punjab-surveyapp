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

const sectionH = await server.ssrLoadModule('/src/lib/sectionH.ts');
const { clearHiddenAnswers, isQuestionVisible } = await server.ssrLoadModule('/src/lib/surveyVisibility.ts');
const { revision19FormError } = await server.ssrLoadModule('/src/lib/formRevision.ts');

const option = (id, code, label, extra = {}) => ({ id, code, label, requires_text: false, ...extra });
const question = (id, code, type, extra = {}) => ({
  question_id: id, question_code: code, question_no: 'i', question_text: code,
  answer_type: type, options: [], is_required: false, ...extra,
});
const field = (key, label, options = [], extra = {}) => ({
  key, label, type: 'SINGLE_CHOICE', options, ...extra,
});
const grid = option(1, 'GRID', 'Grid electricity (WAPDA/DISCO)');
const diesel = option(2, 'DIESEL', 'Diesel');
const otherSource = option(3, 'OTHER', 'Other (please specify)', { requires_text: true });
const kwh = option(100, 'KWH', 'Kilowatt-hour', { parent_id: 1 });
const litre = option(101, 'L', 'Liter', { parent_id: 2 });
const kilogram = option(102, 'KG', 'Kilogram', { parent_id: 3 });
const tonne = option(103, 'TON', 'Ton', { parent_id: 3 });
const sources = [grid, diesel, otherSource];
const units = [kwh, litre, kilogram, tonne];
const energy = question(1, 'H_ENERGY_CONSUMPTION', 'REPEATING_GROUP', {
  repeatable: true,
  options: sources,
  fields: [
    field('energy_source_id', 'Fuel / energy source', sources, { required: true }),
    field('other_text', 'Other source', []),
    field('quantity_per_month', 'Quantity per month', [], { type: 'NUMBER' }),
    field('unit_id', 'Unit', units, { reference: 'energy_source_units' }),
    field('share_pct', 'Energy use share (%)', [], { type: 'NUMBER' }),
  ],
});
const generation = question(2, 'H_ENERGY_GENERATION', 'REPEATING_GROUP', {
  repeatable: true,
  fields: [field('power_source_id', 'Power source', [option(20, 'GENSETS', 'Gensets')])],
});
const capacity = question(3, 'H_CAPTIVE_EXPORT_CAPACITY', 'REPEATING_GROUP', {
  fields: [
    field('captive_capacity_kw', 'Total captive capacity (kW)', [], { type: 'NUMBER' }),
    field('export_capacity_kw', 'Export capacity (kW)', [], { type: 'NUMBER' }),
  ],
});
const waterGate = question(4, 'H_WATER_WASTE_GATE', 'YES_NO', { is_required: true });
const solidGate = question(5, 'H_SOLID_WASTE_GATE', 'YES_NO', { is_required: true });
const greenGate = question(6, 'H_GREEN_PRACTICES_GATE', 'YES_NO', { is_required: true });
const water = question(7, 'H_WATER_WASTE_DISPOSAL', 'MATRIX', {
  matrix_items: [{ id: 70, code: 'TREATED', label: 'Treated on-site', answer_type: 'CHOICE',
    allows_text: false, options: [option(700, 'NO', 'No'), option(701, 'YES', 'Yes')] }],
});
const solid = question(8, 'H_SOLID_WASTE', 'REPEATING_GROUP', {
  repeatable: true,
  fields: [
    field('waste_type_id', 'Waste type', [option(30, 'PRODUCTION_SCRAP', 'Production scrap')], { required: true }),
    field('disposal_method_ids', 'Disposal methods', [
      option(40, 'OTHER', 'Other (please specify)', { requires_text: true, parent_id: 30 }),
    ]),
  ],
});
const green = question(9, 'H_GREEN_PRACTICES', 'MATRIX', {
  matrix_items: [{ id: 90, code: 'GREEN_1', label: 'Reduced energy use', answer_type: 'CHOICE',
    allows_text: false, options: [option(900, 'NO', 'No'), option(901, 'YES', 'Yes')] }],
});
const questions = [energy, generation, capacity, waterGate, water, solidGate, solid, greenGate, green];
const references = { energy_source_units: units };

test('energy source changes clear dependent unit and Other text; quantities and shares validate', () => {
  assert.deepEqual(sectionH.changeSectionHField('H_ENERGY_CONSUMPTION', {
    energy_source_id: 1, unit_id: 100, other_text: 'old source', share_pct: 25,
  }, 'energy_source_id', 2), {
    energy_source_id: 2, share_pct: 25,
  });
  assert.equal(sectionH.isSectionHFieldVisible('H_ENERGY_CONSUMPTION', { energy_source_id: 1 },
    'other_text', energy.fields), false);
  assert.equal(sectionH.isSectionHFieldVisible('H_ENERGY_CONSUMPTION', { energy_source_id: 3 },
    'other_text', energy.fields), true);
  assert.match(sectionH.sectionHQuestionError(energy, [
    { energy_source_id: 1, quantity_per_month: 8, unit_id: 101 },
  ], references), /unit available/);
  assert.match(sectionH.sectionHQuestionError(energy, [
    { energy_source_id: 3, share_pct: 20 },
  ], references), /Specify the Other/);
  assert.equal(sectionH.sectionHQuestionError(energy, [
    { energy_source_id: 1, quantity_per_month: 8, unit_id: 100, share_pct: 100 },
  ], references), null);
});

test('solid-waste Other text is validated only when its disposal option is selected', () => {
  assert.match(sectionH.sectionHQuestionError(solid, [{
    waste_type_id: 30, disposal_method_ids: [40],
  }], references), /Specify the Other/);
  assert.equal(sectionH.sectionHQuestionError(solid, [{
    waste_type_id: 30, disposal_method_ids: { option_ids: [40], other_text: { 40: 'Reuse' } },
  }], references), null);
  assert.equal(sectionH.isSectionHFieldVisible('H_SOLID_WASTE', { is_generated: true },
    'is_generated', solid.fields), false);
});

test('water, solid-waste, and green detail visibility follows each independent gate', () => {
  const allQuestions = [waterGate, water, solidGate, solid, greenGate, green];
  const noAnswers = { 4: false, 5: false, 6: false, 7: { 70: 701 }, 8: [{ waste_type_id: 30 }], 9: { 90: 901 } };
  assert.equal(isQuestionVisible(water, allQuestions, noAnswers), false);
  assert.equal(isQuestionVisible(solid, allQuestions, noAnswers), false);
  assert.equal(isQuestionVisible(green, allQuestions, noAnswers), false);
  assert.equal(clearHiddenAnswers(allQuestions, noAnswers)[7], undefined);
  assert.equal(clearHiddenAnswers(allQuestions, noAnswers)[8], undefined);
  assert.equal(clearHiddenAnswers(allQuestions, noAnswers)[9], undefined);
  assert.equal(isQuestionVisible(water, allQuestions, { ...noAnswers, 4: true }), true);
});

test('offline materialization defaults entered energy shares and derives captive capacity', () => {
  const result = sectionH.materializeSectionHAnswers(questions, {
    1: [{ energy_source_id: 1, quantity_per_month: 5 }],
    2: [{ capacity_kw: '10.25' }, { capacity_kw: 2 }],
    3: { export_capacity_kw: 4 },
  });
  assert.equal(result[1][0].share_pct, 0);
  assert.equal(result[3].captive_capacity_kw, 12.25);
  assert.equal(sectionH.totalGenerationCapacity([{ capacity_kw: '10.25' }, { capacity_kw: 2 }]), 12.25);
});

test('only caches Section H after gates, source-specific units, and matrix No values are available', () => {
  const releaseSources = [
    'GRID', 'DIESEL', 'GAS', 'NATURAL_GAS_PROCESS', 'COAL',
    'FURNACE_OIL', 'SOLAR', 'BIOMASS', 'OTHER',
  ].map((code, index) => option(200 + index, code, code, { requires_text: code === 'OTHER' }));
  const mappedUnits = [
    ['GRID', 'KWH'], ['DIESEL', 'L'], ['GAS', 'KG'], ['NATURAL_GAS_PROCESS', 'KG'],
    ['COAL', 'TON'], ['FURNACE_OIL', 'L'], ['SOLAR', 'KWH'], ['BIOMASS', 'TON'],
    ['OTHER', 'KWH'], ['OTHER', 'L'], ['OTHER', 'KG'], ['OTHER', 'TON'],
  ].map(([sourceCode, unitCode], index) => {
    const source = releaseSources.find((candidate) => candidate.code === sourceCode);
    return option(300 + index, unitCode, unitCode, { parent_id: source.id });
  });
  const releaseEnergy = {
    ...energy,
    options: releaseSources,
    fields: energy.fields.map((item) => item.key === 'energy_source_id'
      ? { ...item, options: releaseSources }
      : item),
  };
  const releaseQuestions = questions.map((item) => item === energy ? releaseEnergy : item);
  const form = {
    sections: [{ section_code: 'H', questions: releaseQuestions }],
    references: { energy_source_units: mappedUnits },
  };
  assert.equal(revision19FormError(form), null);
  const stale = {
    ...form,
    sections: [{ section_code: 'H', questions: releaseQuestions.filter((item) => item !== greenGate) }],
  };
  assert.match(revision19FormError(stale), /migration 13/);
});

test('generated PDF shows source units, zero shares, capacity totals, and omits gated details', async (t) => {
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
      }).catch((error) => { this.error = error; this.onerror?.(error); });
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
    sections: [{ section_code: 'H', title: 'Energy and Waste Management', questions }],
  };
  const response = {
    response_id: 'section-h-response', surveyor_id: 'surveyor-id', sync_status: 'draft',
    started_at: '2026-01-01T00:00:00.000Z',
    answers: [
      { question_id: 1, answer_value: [{ energy_source_id: 1, quantity_per_month: 10, unit_id: 100, share_pct: 75 }] },
      { question_id: 2, answer_value: [{ capacity_kw: 10.25, export_kw: 2 }] },
      { question_id: 3, answer_value: { captive_capacity_kw: 0, export_capacity_kw: 4 } },
      { question_id: 4, answer_value: false },
      { question_id: 5, answer_value: false },
      { question_id: 6, answer_value: false },
      { question_id: 7, answer_value: { 70: { choice_value_id: 701 } } },
      { question_id: 8, answer_value: [{ waste_type_id: 30 }] },
      { question_id: 9, answer_value: { 90: { choice_value_id: 901 } } },
    ],
  };
  const { downloadSurveyPdf } = await server.ssrLoadModule('/src/lib/surveyPdf.ts');
  await downloadSurveyPdf(response, form);
  const pdf = [...captures[0].matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)]
    .map((match) => match[1].replace(/\\([\\()])/g, '$1'))
    .join(' ');
  assert.match(pdf, /Total energy use share/);
  assert.match(pdf, /75\.00%/);
  assert.match(pdf, /0\.00%/);
  assert.match(pdf, /Kilowatt-hour/);
  assert.match(pdf, /10\.25/);
  assert.match(pdf, /Export capacity \(kW\)/);
  assert.doesNotMatch(pdf, /Treated on-site/);
  assert.doesNotMatch(pdf, /Production scrap/);
  assert.doesNotMatch(pdf, /Reduced energy use/);
});
