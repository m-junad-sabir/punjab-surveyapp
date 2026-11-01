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
  materializeWorkforceAnswers,
  normalizeEmployment,
  normalizeSkills,
  totalWorkforceCounts,
  workforceCellValue,
  workforceSkillOptions,
} = await server.ssrLoadModule('/src/lib/sectionDWorkforce.ts');

const active = [
  { id: 11, code: 'UNSKILLED', label: 'Unskilled', requires_text: false },
  { id: 12, code: 'SEMI', label: 'Semi-skilled', requires_text: false },
  { id: 13, code: 'SKILLED', label: 'Skilled', requires_text: false },
  { id: 14, code: 'TECHNICAL', label: 'Technical', requires_text: false },
  { id: 15, code: 'PROFESSIONAL', label: 'Professional', requires_text: false },
];
const legacy = { id: 99, code: 'LEGACY', label: 'Legacy skill', requires_text: false, is_selectable: false };
const references = { workforce_skill_levels: [...active, legacy] };
const employmentQuestion = {
  question_id: 1, question_code: 'D_EMPLOYMENT', question_no: 'i', question_text: 'Employment details',
  answer_type: 'REPEATING_GROUP', repeatable: true, is_required: true, options: [], fields: [],
};
const skillsQuestion = {
  question_id: 2, question_code: 'D_SKILLS', question_no: 'ii', question_text: 'Employment skill levels',
  answer_type: 'REPEATING_GROUP', repeatable: true, is_required: true, options: [],
  fields: [{ key: 'skill_level_id', label: 'Skill level', options: active }],
};
const employment = [
  { gender: 1, regular_count: 4, contract_count: 2, daily_wage_count: '' },
  { gender: 'MALE', regular_count: 1 },
  { gender: 2, regular_count: 3, contract_count: null, daily_wage_count: 1 },
  { gender: 'Other', regular_count: 0, contract_count: 4, daily_wage_count: 2 },
];
const skills = [
  { gender: 1, skill_level_id: 11, headcount: 2 },
  { gender: 'MALE', skill_level_id: 11, headcount: 3 },
  { gender: 2, skill_level_id: 11, headcount: 2 },
  { gender: 3, skill_level_id: 11, headcount: 1 },
  { gender: 1, skill_level_id: 12, headcount: 2 },
  { gender: 2, skill_level_id: 12, headcount: 2 },
  { gender: 'Other', skill_level_id: 13, headcount: 5 },
];

test('blank answers are saved as zeros only for Section D', () => {
  const original = { 3: null };
  const result = materializeWorkforceAnswers([employmentQuestion, skillsQuestion], original, references);
  assert.deepEqual(original, { 3: null });
  assert.deepEqual(result[1], [
    { gender: 1, regular_count: 0, contract_count: 0, daily_wage_count: 0 },
    { gender: 2, regular_count: 0, contract_count: 0, daily_wage_count: 0 },
    { gender: 3, regular_count: 0, contract_count: 0, daily_wage_count: 0 },
  ]);
  assert.equal(result[2].length, 15);
  assert.ok(result[2].every((row) => row.headcount === 0));
  assert.equal(result[2].filter((row) => row.gender === 3).length, 5);
  assert.equal(result[3], null);
  assert.equal(totalWorkforceCounts([]), 0);
  assert.equal(workforceCellValue([]), 0);
});

test('partial and legacy rows round-trip with the same per-gender totals', () => {
  const result = materializeWorkforceAnswers([employmentQuestion, skillsQuestion], {
    1: employment,
    2: [...skills, { gender: { option_id: 'Other' }, skill_level_id: { option_id: '99' }, headcount: '7' }],
  }, references);
  assert.deepEqual(result[1], [
    { gender: 1, regular_count: 5, contract_count: 2, daily_wage_count: 0 },
    { gender: 2, regular_count: 3, contract_count: 0, daily_wage_count: 1 },
    { gender: 3, regular_count: 0, contract_count: 4, daily_wage_count: 2 },
  ]);
  assert.equal(result[2].length, 18);
  assert.equal(result[2].find((row) => row.gender === 3 && row.skill_level_id === 99).headcount, 7);
  assert.match(workforceSkillOptions(skillsQuestion, result[2], references).at(-1).label, /Legacy skill.*previously recorded/);
  assert.equal(workforceCellValue([4, '1']), 5);
  assert.equal(totalWorkforceCounts([5, '', null, 2]), 7);
  assert.equal(totalWorkforceCounts([5, -1]), null);
});

test('invalid inputs are reported and retained in drafts rather than converted to zero', () => {
  for (const invalid of [-1, 0.5, 2_147_483_648, 'bad', true, NaN]) {
    const input = [{ gender: 1, regular_count: invalid }];
    assert.equal(normalizeEmployment(input).ok, false);
    const draft = materializeWorkforceAnswers([employmentQuestion], { 1: input }, references);
    assert.deepEqual(draft[1], input);
  }
  assert.equal(normalizeEmployment({}).ok, false);
  assert.equal(normalizeEmployment([null]).ok, false);
  assert.equal(normalizeEmployment([{ gender: 'OTHER', regular_count: 1 }]).ok, false);
  assert.equal(normalizeSkills(skillsQuestion, [{ gender: 1, skill_level_id: 11, headcount: -1 }], references).ok, false);
  assert.equal(totalWorkforceCounts([workforceCellValue([true])]), null);
  assert.equal(normalizeSkills({ ...skillsQuestion, fields: [] }, [], references).ok, false);
});

test('unknown saved skill levels remain visible but block normalization until corrected', () => {
  const answer = [{ gender: 3, skill_level_id: 404, headcount: 9 }];
  const unknown = workforceSkillOptions(skillsQuestion, answer, references).find((option) => option.id === 404);
  assert.equal(unknown.unknown, true);
  assert.match(unknown.label, /404/);
  assert.match(normalizeSkills(skillsQuestion, answer, references).error, /valid skill level/);
  const draft = materializeWorkforceAnswers([skillsQuestion], { 2: answer }, references);
  assert.deepEqual(draft[2], answer);
});

test('individual and generated-total integer limits are enforced', () => {
  const max = 2_147_483_647;
  assert.equal(normalizeEmployment([{ gender: 1, regular_count: max }]).ok, true);
  assert.match(normalizeEmployment([{ gender: 1, regular_count: max, contract_count: 1 }]).error, /cannot exceed/);
  assert.match(normalizeEmployment([{ gender: 1, regular_count: max }, { gender: 1, regular_count: 1 }]).error, /cannot exceed/);
  assert.match(normalizeSkills(skillsQuestion, [
    { gender: 1, skill_level_id: 11, headcount: max },
    { gender: 1, skill_level_id: 11, headcount: 1 },
  ], references).error, /cannot exceed/);
});

test('checked-in schema and existing migration retain exact Other gender compatibility', async () => {
  const [schema, migration] = await Promise.all([
    readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../database/migration_03_workforce_gender_other.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(schema, /workforce_employment[\s\S]*?CHECK \(gender IN \('MALE','FEMALE','Other'\)\)/);
  assert.match(schema, /workforce_skills[\s\S]*?CHECK \(gender IN \('MALE','FEMALE','Other'\)\)/);
  assert.match(schema, /total_count int GENERATED ALWAYS AS \(regular_count \+ contract_count \+ daily_wage_count\)/);
  assert.equal((migration.match(/CHECK \(gender IN \('MALE', 'FEMALE', 'Other'\)\)/g) ?? []).length, 2);
});

test('generated PDFs show zero counts and accurate Section D subtotals', async (t) => {
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
      }).catch((error) => {
        this.error = error;
        this.onerror?.();
      });
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
    sections: [{ section_code: 'D', title: 'Workforce', questions: [employmentQuestion, skillsQuestion] }],
  };
  const response = {
    response_id: 'response-id', surveyor_id: 'surveyor-id', sync_status: 'draft',
    started_at: '2026-01-01T00:00:00.000Z', answers: [],
  };
  const { downloadSurveyPdf } = await server.ssrLoadModule('/src/lib/surveyPdf.ts');
  await downloadSurveyPdf(response, form);
  await downloadSurveyPdf({
    ...response,
    answers: [{ question_id: 1, answer_value: employment }, { question_id: 2, answer_value: skills }],
  }, form);
  await downloadSurveyPdf({
    ...response,
    answers: [
      { question_id: 1, answer_value: [{ gender: 1, regular_count: -1 }] },
      { question_id: 2, answer_value: [{ gender: 'Other', skill_level_id: 99, headcount: 7 }] },
    ],
  }, form);

  function valuesAfterLabel(pdf, label) {
    const text = [...pdf.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((match) => match[1]);
    return text.flatMap((item, index) => item === `${label}:` ? [text[index + 1]] : []);
  }
  assert.ok(!captures[0].includes('No entries recorded'));
  assert.deepEqual(valuesAfterLabel(captures[0], 'All employees'), ['0', '0']);
  assert.deepEqual(valuesAfterLabel(captures[0], 'Other employee subtotal'), ['0', '0']);
  assert.deepEqual(valuesAfterLabel(captures[1], 'Male employee subtotal'), ['7', '7']);
  assert.deepEqual(valuesAfterLabel(captures[1], 'Female employee subtotal'), ['4', '4']);
  assert.deepEqual(valuesAfterLabel(captures[1], 'Other employee subtotal'), ['6', '6']);
  assert.deepEqual(valuesAfterLabel(captures[1], 'All employees'), ['17', '17']);
  assert.deepEqual(valuesAfterLabel(captures[1], 'Unskilled total'), ['8']);
  assert.ok(captures[2].includes('must be a whole number'));
  assert.ok(captures[2].includes('Legacy skill'));
  assert.deepEqual(valuesAfterLabel(captures[2], 'All employees'), ['7']);
});
