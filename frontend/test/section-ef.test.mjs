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
  formatPercentage,
  invalidMatrixKeys,
  invalidShareKeys,
  materializeSectionEFAnswers,
  matrixEntryForDisplay,
  matrixOptions,
  normalizeMatrix,
  normalizeReason,
  normalizeShares,
  reasonError,
  reasonOptions,
  shareOptions,
  shareTotal,
} = await server.ssrLoadModule('/src/lib/sectionEF.ts');
const { clearHiddenAnswers, isQuestionVisible } = await server.ssrLoadModule('/src/lib/surveyVisibility.ts');

const option = (id, code, label, requires_text = false) => ({ id, code, label, requires_text });
const question = (id, code, answer_type, options = [], extra = {}) => ({
  question_id: id, question_code: code, question_no: 'i', question_text: code,
  answer_type, options, is_required: false, ...extra,
});
const source = question(1, 'E_SOURCING_TYPE', 'SHARE_PERCENT', [
  option(11, 'DIRECT', 'Direct'), option(12, 'OTHER', 'Other source', true),
]);
const origin = question(2, 'E_RAW_MATERIAL_ORIGIN', 'SHARE_PERCENT', [
  option(21, 'LOCAL', 'Local'), option(22, 'IMPORTED', 'Imported'),
]);
const buyers = question(3, 'F_BUYER_TYPE', 'SHARE_PERCENT', [
  option(31, 'RETAIL', 'Retailers'), option(32, 'OTHER', 'Other buyer', true),
]);
const location = question(4, 'F_BUYER_LOCATION', 'SHARE_PERCENT', [
  option(41, 'DOMESTIC', 'Domestic'), option(42, 'EXPORT', 'Export'),
]);
const strengthOptions = [option(501, 'STRONGER', 'Stronger'), option(502, 'DK_NA', "Don't Know / NA")];
const digitalOptions = [option(601, 'ACTIVE', 'Active'), option(602, 'NA', 'NA')];
const matrixItem = (id, code, label, answer_type, options, allows_text = false) => ({
  id, code, label, answer_type, options, allows_text, group_label: null,
});
const strength = question(5, 'F_STRENGTH_VS_COMPETITORS', 'MATRIX', [], {
  matrix_items: [
    matrixItem(1001, 'QUALITY', 'Quality', 'CHOICE', strengthOptions),
    matrixItem(1002, 'PRICE', 'Price', 'CHOICE', strengthOptions),
  ],
});
const digital = question(6, 'F_DIGITAL_PRESENCE', 'MATRIX', [], {
  matrix_items: [
    matrixItem(1101, 'WEBSITE', 'Website', 'CHOICE', digitalOptions),
    matrixItem(1102, 'SOCIAL', 'Social', 'CHOICE', digitalOptions),
  ],
});
const rating = question(8, 'J_UPSCALING_READINESS', 'MATRIX', [], {
  matrix_items: [matrixItem(1201, 'FINANCE', 'Finance', 'RATING_1_5', [])],
});
const innovation = question(9, 'G_INNOVATION', 'MATRIX', [], {
  matrix_items: [matrixItem(1301, 'OTHER', 'Other innovation', 'CHOICE', digitalOptions, true)],
});
const disruptionParent = question(10, 'E_SUPPLY_DISRUPTION', 'YES_NO');
const disruption = question(11, 'E_SUPPLY_DISRUPTION_REASON', 'MULTI_CHOICE', [
  option(701, 'OTHER', 'Other', true), option(702, 'PRICE', 'Price'),
]);
const demandParent = question(12, 'F_DEMAND_GAP', 'YES_NO');
const demand = question(13, 'F_DEMAND_GAP_REASON', 'MULTI_CHOICE', [
  option(711, 'OTHER', 'Other', true), option(712, 'DEMAND', 'Demand'),
]);
const reliability = question(14, 'E_ON_TIME_DELIVERY', 'SINGLE_CHOICE', [], {
  fields: [{
    key: 'ontime_delivery_id', label: 'On-time delivery reliability', type: 'SINGLE_CHOICE',
    options: [option(801, 'NOT_FORMALLY_TRACKED', 'Not Formally Tracked')],
  }],
});
const acceptance = question(15, 'E_PRODUCT_ACCEPTANCE', 'SINGLE_CHOICE', [], {
  fields: [{
    key: 'product_acceptance_id', label: 'Product acceptance rate', type: 'SINGLE_CHOICE',
    options: [option(802, 'NOT_FORMALLY_TRACKED', 'Not Formally Tracked')],
  }],
});
const references = {
  section_ef_options: [
    { ...option(13, 'OLD', 'Old source'), parent_id: 1, is_selectable: false },
    { ...option(703, 'OLD', 'Old disruption'), parent_id: 11, is_selectable: false },
  ],
  matrix_options: [
    { ...option(503, 'OLD', 'Old strength'), parent_id: 1001, is_selectable: false },
  ],
};

test('requested E/F and G distributions and the two F matrices materialize when omitted', () => {
  const automation = question(7, 'G_AUTOMATION_LEVEL', 'SHARE_PERCENT', [option(91, 'AUTO', 'Automatic')]);
  const original = { 7: null };
  const result = materializeSectionEFAnswers([source, origin, buyers, location, strength, digital, automation, rating], original, references);
  assert.deepEqual(original, { 7: null });
  assert.deepEqual(result[1], { 11: 0, 12: 0 });
  assert.deepEqual(result[2], { 21: 0, 22: 0 });
  assert.deepEqual(result[3], { 31: 0, 32: 0 });
  assert.deepEqual(result[4], { 41: 0, 42: 0 });
  assert.deepEqual(result[5], { 1001: { choice_value_id: 502 }, 1002: { choice_value_id: 502 } });
  assert.deepEqual(result[6], { 1101: { choice_value_id: 602 }, 1102: { choice_value_id: 602 } });
  assert.deepEqual(result[7], { 91: 0 });
  assert.equal(Object.hasOwn(result, 8), false);
  assert.equal(matrixEntryForDisplay(strength, strength.matrix_items[0], {}).choice_value_id, 502);
  assert.equal(matrixEntryForDisplay(digital, digital.matrix_items[0], {}).choice_value_id, 602);
  assert.equal(matrixEntryForDisplay(rating, rating.matrix_items[0], {}).rating, undefined);
});

test('share arithmetic accepts up to two decimals and blocks totals over 100', () => {
  const full = { 11: '33.33', 12: { percent: '66.67', other_text: '  brokers  ' }, 13: 0 };
  const normalized = normalizeShares(source, full, references);
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.value, {
    entries: { 11: 33.33, 12: { percent: 66.67, other_text: 'brokers' }, 13: 0 }, total: 100,
  });
  assert.equal(shareTotal(full), 100);
  assert.equal(formatPercentage(33.3), '33.3');
  assert.equal(formatPercentage(0), '0');
  assert.equal(formatPercentage(100), '100');
  assert.equal(normalizeShares(buyers, { 32: { percent: 40, other_text: '' } }, references).ok, true);
  assert.match(normalizeShares(source, { 11: 100, 12: 0.01 }, references).error, /cannot exceed 100%/);
  for (const invalid of [-1, 100.01, 1.001, '1.00000000001', 'bad', true, NaN]) {
    const answer = { 11: invalid };
    assert.equal(normalizeShares(source, answer, references).ok, false);
    assert.deepEqual(materializeSectionEFAnswers([source], { 1: answer }, references)[1], answer);
  }
});

test('historical and unknown share options remain visible or require explicit correction', () => {
  const answer = { 11: 10, 13: 20, 404: 7 };
  assert.match(shareOptions(source, answer, references).find((item) => item.id === 13).label, /previously recorded/);
  assert.deepEqual(invalidShareKeys(source, answer, references), ['404']);
  assert.match(normalizeShares(source, answer, references).error, /unknown saved share category 404/);
  assert.deepEqual(materializeSectionEFAnswers([source], { 1: answer }, references)[1], answer);
  assert.equal(normalizeShares({ ...source, options: [] }, {}, references).ok, false);
});

test('matrix choices, ratings, defaults, legacy text, and invalid rows are handled explicitly', () => {
  const historical = { QUALITY: '503', PRICE: { choice_value_id: 501 } };
  assert.deepEqual(normalizeMatrix(strength, historical, references).value, {
    1001: { choice_value_id: 503 }, 1002: { choice_value_id: 501 },
  });
  assert.match(matrixOptions(strength.matrix_items[0], { choice_value_id: 503 }, references).at(-1).label, /Old strength.*previously recorded/);
  assert.equal(matrixOptions(strength.matrix_items[0], { choice_value_id: 404 }, references).at(-1).unknown, true);
  assert.deepEqual(normalizeMatrix(rating, { FINANCE: '5' }, references).value, { 1201: { rating: 5 } });
  assert.deepEqual(normalizeMatrix(rating, {}, references).value, {});
  assert.deepEqual(normalizeMatrix(innovation, { OTHER: { choice_value_id: { option_id: 601, other_text: 'custom process' } } }, references).value,
    { 1301: { choice_value_id: 601, other_text: 'custom process' } });
  assert.deepEqual(matrixEntryForDisplay(innovation, innovation.matrix_items[0], {
    OTHER: { choice_value_id: { option_id: 601, other_text: 'custom process' } },
  }), { choice_value_id: 601, other_text: 'custom process' });
  assert.match(normalizeMatrix(rating, { FINANCE: 6 }, references).error, /rated from 1 to 5/);
  assert.match(normalizeMatrix(strength, { QUALITY: 601 }, references).error, /valid option/);
  assert.match(normalizeMatrix(strength, { QUALITY: { choice_value_id: 501, option_id: 502 } }, references).error, /conflicting/);
  assert.deepEqual(invalidMatrixKeys(strength, { 1001: 501, QUALITY: 502, UNKNOWN: 1 }), ['QUALITY', 'UNKNOWN']);
  const invalid = { FINANCE: 6 };
  assert.deepEqual(materializeSectionEFAnswers([rating], { 8: invalid }, references)[8], invalid);
  const missingDefault = { ...digital, matrix_items: [{ ...digital.matrix_items[0], options: [digitalOptions[0]] }] };
  assert.match(normalizeMatrix(missingDefault, {}, references).error, /required NA option is unavailable/i);
});

test('Other reason text is required only when selected on the visible Yes branch', () => {
  for (const [parent, reason, field, other, normal] of [
    [disruptionParent, disruption, 'had_supply_disruption', 701, 702],
    [demandParent, demand, 'had_demand_gap', 711, 712],
  ]) {
    const questions = [parent, reason];
    const yes = { [parent.question_id]: { [field]: true }, [reason.question_id]: [other] };
    assert.equal(isQuestionVisible(reason, questions, yes), true);
    assert.match(reasonError(reason, yes[reason.question_id], references), /Specify the Other reason/);
    assert.equal(reasonError(reason, [normal], references), null);
    assert.equal(reasonError(reason, { option_ids: [other], other_text: { [other]: 'explained' } }, references), null);
    const no = { ...yes, [parent.question_id]: { [field]: false } };
    assert.equal(isQuestionVisible(reason, questions, no), false);
    assert.equal(Object.hasOwn(clearHiddenAnswers(questions, no), reason.question_id), false);
  }
  assert.match(reasonOptions(disruption, [703], references).at(-1).label, /previously recorded/);
  assert.equal(reasonOptions(disruption, [999], references).at(-1).unknown, true);
  assert.match(reasonError(disruption, [999], references), /unknown/);
  assert.match(reasonError(disruption, { option_ids: [702], other_text: { 701: 'orphaned' } }, references), /unselected reason/);
  assert.match(reasonError(disruption, { option_ids: [702], other_text: { 702: 42 } }, references), /invalid description text/);
  assert.deepEqual(normalizeReason(disruption, {
    option_ids: ['701', '703'], other_text: { 701: 'explained' },
  }, references).value, { option_ids: [701, 703], other_text: { 701: 'explained' } });
});

test('migration and setup contain the requested lookups and verification without deleting responses', async () => {
  const [migration, seed, setup] = await Promise.all([
    readFile(new URL('../../database/migration_11_section_e_f_lookups.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../database/seed.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../SETUP_DATABASE.bat', import.meta.url), 'utf8'),
  ]);
  assert.match(migration, /ON CONFLICT \(type_id, code\) DO UPDATE/);
  assert.match(migration, /RELIABILITY_BAND.*NOT_FORMALLY_TRACKED/);
  assert.match(migration, /ACCEPTANCE_BAND.*NOT_FORMALLY_TRACKED/);
  assert.match(migration, /STRENGTH_SCALE.*DK_NA/);
  assert.match(migration, /ACTIVITY_STATUS.*NA/);
  assert.match(migration, /rows_with_active_default/);
  assert.doesNotMatch(migration, /\b(?:DELETE|TRUNCATE|DROP)\b/i);
  assert.equal((seed.match(/NOT_FORMALLY_TRACKED/g) ?? []).length, 2);
  assert.match(setup, /call :run migration_11_section_e_f_lookups\.sql/);
});

test('generated PDF shows shares, totals, matrix labels, rating values, and new lookup choices', async (t) => {
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
      { section_code: 'E', title: 'Supply', questions: [source, origin, reliability, acceptance] },
      { section_code: 'F', title: 'Market', questions: [buyers, location, strength, digital] },
      { section_code: 'J', title: 'Planning', questions: [rating, innovation] },
    ],
  };
  const response = {
    response_id: 'response-id', surveyor_id: 'surveyor-id', sync_status: 'draft',
    started_at: '2026-01-01T00:00:00.000Z',
    answers: [
      { question_id: 1, answer_value: { 11: 33.33, 12: { percent: 66.67, other_text: 'brokers' } } },
      { question_id: 5, answer_value: { QUALITY: 501 } },
      { question_id: 8, answer_value: { FINANCE: 4 } },
      { question_id: 9, answer_value: { OTHER: { choice_value_id: 601, other_text: 'custom process' } } },
      { question_id: 14, answer_value: { ontime_delivery_id: 801 } },
      { question_id: 15, answer_value: { product_acceptance_id: 802 } },
    ],
  };
  const { downloadSurveyPdf } = await server.ssrLoadModule('/src/lib/surveyPdf.ts');
  await downloadSurveyPdf(response, form);
  const text = [...captures[0].matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((match) => match[1]);
  const valuesAfter = (label) => text.flatMap((item, index) => item === `${label}:` ? [text[index + 1]] : []);
  assert.deepEqual(valuesAfter('Direct'), ['33.33%']);
  assert.deepEqual(valuesAfter('Other source: brokers'), ['66.67%']);
  assert.deepEqual(valuesAfter('Total'), ['100% / 100%', '0% / 100%', '0% / 100%', '0% / 100%']);
  assert.deepEqual(valuesAfter('Quality'), ['Stronger']);
  assert.deepEqual(valuesAfter('Price'), ["Don't Know / NA"]);
  assert.deepEqual(valuesAfter('Website'), ['NA']);
  assert.deepEqual(valuesAfter('Social'), ['NA']);
  assert.deepEqual(valuesAfter('Finance'), ['4']);
  assert.deepEqual(valuesAfter('Other innovation'), ['Active: custom process']);
  assert.equal(valuesAfter('On-time delivery reliability')[0], 'Not Formally Tracked');
  assert.equal(valuesAfter('Product acceptance rate')[0], 'Not Formally Tracked');
  assert.ok(!captures[0].includes('[object Object]'));
  assert.ok(!captures[0].includes('choice_value_id'));
});
