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

const { clearHiddenAnswers, isQuestionVisible } = await server.ssrLoadModule('/src/lib/surveyVisibility.ts');
const {
  changeReinvestmentArea,
  clearSectionIOtherText,
  isReinvestmentOtherVisible,
  isSectionIOtherTextVisible,
  reinvestmentAreaError,
} = await server.ssrLoadModule('/src/lib/sectionIJ.ts');
const { revision20FormError } = await server.ssrLoadModule('/src/lib/formRevision.ts');
const { normalizeMatrix } = await server.ssrLoadModule('/src/lib/sectionEF.ts');

const option = (id, code, label, requires_text = false) => ({ id, code, label, requires_text });
const question = (id, code, answer_type = 'MATRIX', extra = {}) => ({
  question_id: id,
  question_code: code,
  question_no: 'i',
  question_text: code,
  answer_type,
  options: [],
  is_required: true,
  ...extra,
});
const matrix = (id, code, optionCode) => question(id, code, 'MATRIX', {
  matrix_items: [{
    id: id * 100,
    code: 'OTHER',
    label: 'Other',
    answer_type: 'CHOICE',
    allows_text: true,
    options: [
      option(id * 1000, optionCode, optionCode),
      option(id * 1000 + 1, 'OTHER', 'Other', true),
      option(id * 1000 + 2, 'NA', 'N/A'),
      option(id * 1000 + 3, 'NONE', 'No Plan'),
      option(id * 1000 + 4, 'IN_PROGRESS', 'In Progress'),
    ],
  }],
});

const complianceGate = question(1, 'I_COMPLIANCE_GATE', 'YES_NO');
const compliance = matrix(2, 'I_COMPLIANCE_PERMITS', 'HELD');
const certificationGate = question(3, 'I_CERTIFICATIONS_GATE', 'YES_NO');
const certifications = matrix(4, 'I_CERTIFICATIONS', 'HELD');
const strategicGate = question(5, 'J_STRATEGIC_PLAN_GATE', 'YES_NO');
const planningGate = question(6, 'J_OPERATIONAL_PLANNING_GATE', 'YES_NO');
const planning = matrix(7, 'J_PLANNING_AREAS', 'FORMAL');
const reinvestmentOther = question(8, 'J_REINVESTMENT_AREA', 'REPEATING_GROUP', {
  fields: [
    { key: 'reinvestment_area_id', options: [option(81, 'MACHINERY', 'Machinery'), option(82, 'OTHER', 'Other', true)] },
    { key: 'reinvestment_area_other' },
  ],
});
const otherJQuestion = question(9, 'J_UPSCALING_TIME', 'SINGLE_CHOICE');
const questions = [
  complianceGate, compliance, certificationGate, certifications, strategicGate,
  planningGate, planning, reinvestmentOther, otherJQuestion,
];

test('Section I gates independently hide and clear stale detail answers', () => {
  const answers = {
    1: false,
    2: { 200: { choice_value_id: 2001 } },
    3: true,
    4: { 400: { choice_value_id: 4001 } },
  };
  assert.equal(isQuestionVisible(compliance, questions, answers), false);
  assert.equal(isQuestionVisible(certifications, questions, answers), true);
  assert.deepEqual(clearHiddenAnswers(questions, answers), {
    1: false,
    3: true,
    4: { 400: { choice_value_id: 4001 } },
  });
});

test('Section J strategic and operational gates hide only their dependent details', () => {
  const answers = {
    5: true,
    6: false,
    7: { 700: { choice_value_id: 7001 } },
    8: { reinvestment_area_id: 81 },
    9: 2,
  };
  assert.equal(isQuestionVisible(planning, questions, answers), false);
  assert.equal(isQuestionVisible(reinvestmentOther, questions, answers), true);
  assert.deepEqual(clearHiddenAnswers(questions, answers), {
    5: true,
    6: false,
    8: { reinvestment_area_id: 81 },
    9: 2,
  });

  const noPlan = { ...answers, 5: false };
  assert.equal(isQuestionVisible(reinvestmentOther, questions, noPlan), false);
  assert.equal(isQuestionVisible(otherJQuestion, questions, noPlan), false);
});

test('Other reinvestment text is conditional, singular, and required only for Other', () => {
  const options = reinvestmentOther.fields[0].options;
  assert.equal(isReinvestmentOtherVisible(81, options), false);
  assert.equal(isReinvestmentOtherVisible(82, options), true);
  assert.deepEqual(changeReinvestmentArea(
    { reinvestment_area_id: 82, reinvestment_area_other: 'Old detail' },
    'reinvestment_area_id',
    81,
    options,
  ), { reinvestment_area_id: 81 });
  assert.equal(reinvestmentAreaError(reinvestmentOther, {
    reinvestment_area_id: 82,
  }), 'Specify the Other primary area of reinvestment.');
  assert.equal(reinvestmentAreaError(reinvestmentOther, {
    reinvestment_area_id: 82,
    reinvestment_area_other: 'New product line',
  }), null);
  assert.equal(reinvestmentAreaError(reinvestmentOther, {
    reinvestment_area_id: null,
    reinvestment_area_other: '',
  }), null);
});

test('matrix Other choices retain and validate their descriptions', () => {
  const otherMatrix = matrix(20, 'I_COMPLIANCE_PERMITS', 'HELD');
  assert.match(normalizeMatrix(otherMatrix, {
    2000: { choice_value_id: 20000 },
  }, {}).error, /Specify/);
  assert.deepEqual(normalizeMatrix(otherMatrix, {
    2000: { choice_value_id: { option_id: 20000, other_text: 'Other permit' } },
  }, {}).value, {
    2000: { choice_value_id: 20000, other_text: 'Other permit' },
  });
  assert.equal(isSectionIOtherTextVisible('I_COMPLIANCE_PERMITS', 'OTHER', 'HELD'), true);
  assert.equal(isSectionIOtherTextVisible('I_CERTIFICATIONS', 'OTHER', 'NA'), false);
  assert.deepEqual(clearSectionIOtherText(otherMatrix, {
    2000: { choice_value_id: 20002, other_text: 'Old certification' },
  }), {
    2000: { choice_value_id: 20002 },
  });
});

test('revision 20 requires all gates, sentinel choices, and reinvestment Other metadata', () => {
  const form = {
    sections: [{ section_code: 'I', questions }],
  };
  assert.equal(revision20FormError(form), null);
  assert.match(revision20FormError({
    sections: [{ section_code: 'I', questions: questions.filter((item) => item.question_code !== 'I_COMPLIANCE_GATE') }],
  }), /Apply migration 15/);
});

test('migration 15 is allowlisted, nullable, and preserves historical answers', async () => {
  const migration = await readFile(new URL('../../database/migration_15_section_i_j_gates.sql', import.meta.url), 'utf8');
  const setup = await readFile(new URL('../../SETUP_DATABASE.bat', import.meta.url), 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS has_factory_compliance boolean/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS has_strategic_business_plan boolean/);
  assert.match(migration, /I_COMPLIANCE_GATE/);
  assert.match(migration, /J_OPERATIONAL_PLANNING_GATE/);
  assert.doesNotMatch(migration, /\b(?:DELETE|TRUNCATE|DROP)\b/i);
  assert.match(setup, /call :run migration_15_section_i_j_gates\.sql/);
});

test('PDF shows strategic-plan No and only includes applicable Section I/J details', async (t) => {
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

  const complianceGatePdf = question(31, 'I_COMPLIANCE_GATE', 'YES_NO');
  const compliancePdf = matrix(32, 'I_COMPLIANCE_PERMITS', 'HELD');
  const certGatePdf = question(33, 'I_CERTIFICATIONS_GATE', 'YES_NO');
  const certificationPdf = matrix(34, 'I_CERTIFICATIONS', 'HELD');
  const strategicGatePdf = question(35, 'J_STRATEGIC_PLAN_GATE', 'YES_NO', {
    question_text: 'Do you have a Strategic Business Plan?',
  });
  const planningGatePdf = question(36, 'J_OPERATIONAL_PLANNING_GATE', 'YES_NO');
  const planningPdf = matrix(37, 'J_PLANNING_AREAS', 'FORMAL');
  const form = {
    sections: [
      {
        section_code: 'I',
        title: 'Compliance',
        questions: [complianceGatePdf, compliancePdf, certGatePdf, certificationPdf],
      },
      {
        section_code: 'J',
        title: 'Strategy',
        questions: [strategicGatePdf, planningGatePdf, planningPdf, otherJQuestion],
      },
    ],
  };
  const response = {
    response_id: 'response-id',
    surveyor_id: 'surveyor-id',
    sync_status: 'draft',
    started_at: '2026-01-01T00:00:00.000Z',
    answers: [
      { question_id: 31, answer_value: false },
      { question_id: 32, answer_value: { 3200: { choice_value_id: 32000 } } },
      { question_id: 33, answer_value: true },
      { question_id: 34, answer_value: { 3400: { choice_value_id: { option_id: 34000, other_text: 'ISO 9001' } } } },
      { question_id: 35, answer_value: false },
      { question_id: 36, answer_value: true },
      { question_id: 37, answer_value: { 3700: { choice_value_id: 37000 } } },
      { question_id: 9, answer_value: 'stale strategic detail' },
    ],
  };
  const { downloadSurveyPdf } = await server.ssrLoadModule('/src/lib/surveyPdf.ts');
  await downloadSurveyPdf(response, form);

  const text = [...captures[0].matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((match) => match[1]);
  assert.match(captures[0], /Strategic Business Plan/);
  assert.ok(text.includes('No'));
  assert.match(captures[0], /ISO 9001/);
  assert.doesNotMatch(captures[0], /Factory safety and environmental compliances/);
  assert.doesNotMatch(captures[0], /Operational planning/);
  assert.doesNotMatch(captures[0], /stale strategic detail/);
});
