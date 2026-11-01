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

const { areAllOptionsSelected, toggleAllOptions } = await server.ssrLoadModule('/src/lib/optionSelection.ts');
const { questionFormatError } = await server.ssrLoadModule('/src/lib/surveyValidation.ts');
const { clearHiddenAnswers, isQuestionVisible } = await server.ssrLoadModule('/src/lib/surveyVisibility.ts');

const months = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
const status = {
  question_id: 1,
  question_code: 'B_OPERATION_STATUS',
  options: [
    { id: 1, code: 'RUNNING' },
    { id: 2, code: 'OFF_SEASON' },
    { id: 3, code: 'TEMP_CLOSED' },
    { id: 4, code: 'PERM_CLOSED' },
  ],
};
const operatingMonths = { question_id: 2, question_code: 'B_OPERATION_MONTHS', options: [] };
const closureReason = { question_id: 3, question_code: 'B_CLOSURE_REASON', options: [] };
const operatingHours = { question_id: 4, question_code: 'B_OPERATIONAL_HOURS', options: [] };
const unrelated = { question_id: 5, question_code: 'A_ESTABLISHMENT_NAME', options: [] };
const questions = [status, operatingMonths, closureReason, operatingHours, unrelated];

test('select all, individual deselection, reselect, and deselect all stay synchronized', () => {
  const all = toggleAllOptions(months, []);
  assert.deepEqual(all, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(areAllOptionsSelected(months, all), true);

  const partial = all.filter((id) => id !== 5);
  assert.equal(areAllOptionsSelected(months, partial), false);
  assert.deepEqual(toggleAllOptions(months, partial), all);
  assert.deepEqual(toggleAllOptions(months, all), []);
  assert.equal(areAllOptionsSelected([], []), false);
});

test('status controls the same visible questions used by the form and PDF', () => {
  for (const id of [1, 2, 3]) {
    const answers = { 1: id };
    assert.equal(isQuestionVisible(operatingMonths, questions, answers), true);
    assert.equal(isQuestionVisible(operatingHours, questions, answers), true);
    assert.equal(isQuestionVisible(closureReason, questions, answers), false);
  }
  const closed = { 1: { option_id: 4 } };
  assert.equal(isQuestionVisible(closureReason, questions, closed), true);
  assert.equal(isQuestionVisible(operatingMonths, questions, closed), false);
  assert.equal(isQuestionVisible(operatingHours, questions, closed), false);
  assert.equal(isQuestionVisible(operatingMonths, questions, {}), false);
  assert.equal(isQuestionVisible(operatingHours, questions, {}), false);
  assert.equal(isQuestionVisible(closureReason, questions, {}), false);
});

test('hidden draft answers are removed without affecting unrelated values', () => {
  const draft = {
    1: 4,
    2: { operating_months: [1, 2] },
    3: { closure_reason: 'Closed' },
    4: { daily_hours: 8, working_days_per_week: 6, working_months_per_year: 12 },
    5: { name: 'Example' },
  };
  const cleaned = clearHiddenAnswers(questions, draft);
  assert.deepEqual(cleaned, { 1: 4, 3: { closure_reason: 'Closed' }, 5: { name: 'Example' } });
  assert.ok(draft[2]);
  assert.ok(draft[4]);

  const reopened = clearHiddenAnswers(questions, { ...cleaned, 1: 1 });
  assert.equal(reopened[2], undefined);
  assert.equal(reopened[3], undefined);
  assert.equal(reopened[4], undefined);
  assert.deepEqual(reopened[5], { name: 'Example' });
});

test('working-day and working-month validation handles blanks, boundaries, and invalid values', () => {
  const question = {
    ...operatingHours,
    fields: [
      { key: 'working_days_per_week', label: 'Total working days per week', type: 'NUMBER', min: 1, max: 7, step: 1 },
      { key: 'working_months_per_year', label: 'Total working months per year', type: 'NUMBER', min: 1, max: 12, step: 1 },
    ],
  };
  for (const answer of [
    {},
    { working_days_per_week: null, working_months_per_year: '' },
    { working_days_per_week: 1, working_months_per_year: 1 },
    { working_days_per_week: 7, working_months_per_year: 12 },
  ]) {
    assert.equal(questionFormatError(question, answer), null);
  }
  for (const value of [0, 8, 1.5, 'invalid', ' ']) {
    assert.equal(
      questionFormatError(question, { working_days_per_week: value }),
      'Total working days per week must be a whole number between 1 and 7.',
    );
  }
  for (const value of [0, 13, 1.5, 'invalid', ' ']) {
    assert.equal(
      questionFormatError(question, { working_months_per_year: value }),
      'Total working months per year must be a whole number between 1 and 12.',
    );
  }
});

test('generated PDFs show the applicable Section B branch and working-month value', async (t) => {
  const png = await readFile(new URL('../public/logos/punjab-industries.png', import.meta.url));
  const jpeg = await readFile(new URL('../public/logos/nespak.jpeg', import.meta.url));
  const originalFetch = globalThis.fetch;
  const originalReader = globalThis.FileReader;
  globalThis.fetch = async (path) => {
    if (path.endsWith('punjab-industries.png')) {
      return { ok: true, blob: async () => new Blob([png], { type: 'image/png' }) };
    }
    if (path.endsWith('nespak.jpeg')) {
      return { ok: true, blob: async () => new Blob([jpeg], { type: 'image/jpeg' }) };
    }
    throw new Error(`Unexpected PDF asset: ${path}`);
  };
  globalThis.FileReader = class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onload?.();
      }).catch((error) => {
        this.error = error;
        this.onerror?.();
      });
    }
  };
  const captures = [];
  const capture = ['initialized', function () {
    this.save = () => captures.push(this.output());
  }];
  jsPDF.API.events.push(capture);
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalReader === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = originalReader;
    const index = jsPDF.API.events.indexOf(capture);
    if (index >= 0) jsPDF.API.events.splice(index, 1);
  });

  const pdfQuestions = [
    { ...status, question_no: 'ii', question_text: 'Current operation status', answer_type: 'SINGLE_CHOICE',
      options: status.options.map((option) => ({ ...option, label: option.code === 'PERM_CLOSED' ? 'Permanently closed' : option.code })) },
    { ...operatingMonths, question_no: 'i', question_text: 'Months of operation', answer_type: 'MULTI_CHOICE',
      fields: [{ key: 'operating_months', label: 'Months of operation', options: [
        { id: 1, label: 'January' }, { id: 12, label: 'December' },
      ] }] },
    { ...closureReason, question_no: 'ii', question_text: 'Reason for closure', answer_type: 'TEXT',
      fields: [{ key: 'closure_reason', label: 'Reason for closure', options: [] }] },
    { ...operatingHours, question_no: 'iii', question_text: 'Working schedule', answer_type: 'REPEATING_GROUP',
      fields: [
        { key: 'daily_shift_id', label: 'Daily operating hours / shift', options: [{ id: 21, label: 'Less than 8 Hours' }] },
        { key: 'working_days_per_week', label: 'Total working days per week', default_value: 6, options: [] },
        { key: 'working_months_per_year', label: 'Total working months per year', options: [] },
      ] },
  ];
  const form = { sections: [{ section_code: 'B', title: 'Operational details', questions: pdfQuestions }] };
  const response = {
    response_id: 'response-id', surveyor_id: 'surveyor-id', sync_status: 'draft',
    started_at: '2026-01-01T00:00:00.000Z',
    answers: [
      { question_id: 1, answer_value: 4 },
      { question_id: 2, answer_value: { operating_months: [1, 12] } },
      { question_id: 3, answer_value: { closure_reason: 'Closed' } },
      { question_id: 4, answer_value: { daily_shift_id: 21, working_days_per_week: 7, working_months_per_year: 12 } },
    ],
  };
  const { downloadSurveyPdf } = await server.ssrLoadModule('/src/lib/surveyPdf.ts');
  await downloadSurveyPdf(response, form);
  const closedPdf = captures[0];
  assert.ok(closedPdf.includes('Permanently closed'));
  assert.ok(closedPdf.includes('Reason for closure'));
  assert.ok(!closedPdf.includes('Months of operation'));
  assert.ok(!closedPdf.includes('Working schedule'));

  response.answers[0].answer_value = 1;
  await downloadSurveyPdf(response, form);
  const operatingPdf = captures[1];
  assert.ok(operatingPdf.includes('January, December'));
  assert.ok(operatingPdf.includes('Less than 8 Hours'));
  assert.ok(!operatingPdf.includes('Reason for closure'));
  const explicitDaysLabel = operatingPdf.indexOf('Total working days per week');
  assert.ok(explicitDaysLabel >= 0);
  assert.ok(operatingPdf.slice(explicitDaysLabel, explicitDaysLabel + 200).includes('(7)'));
  const monthsLabel = operatingPdf.indexOf('Total working months per year');
  assert.ok(monthsLabel >= 0);
  assert.ok(operatingPdf.slice(monthsLabel, monthsLabel + 200).includes('(12)'));

  response.answers[3].answer_value = { daily_shift_id: 21, working_months_per_year: 12 };
  await downloadSurveyPdf(response, form);
  const defaultPdf = captures[2];
  const daysLabel = defaultPdf.indexOf('Total working days per week');
  assert.ok(daysLabel >= 0);
  assert.ok(defaultPdf.slice(daysLabel, daysLabel + 200).includes('6 \\(default\\)'));

  response.answers = response.answers.filter((answer) => answer.question_id !== 4);
  await downloadSurveyPdf(response, form);
  assert.ok(captures[3].includes('6 \\(default\\)'));
});
