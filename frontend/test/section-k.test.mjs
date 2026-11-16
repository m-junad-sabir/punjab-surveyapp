import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: { ignored: ['**'] } },
});
after(() => server.close());

const { clearHiddenAnswers, isQuestionVisible } = await server.ssrLoadModule('/src/lib/surveyVisibility.ts');
const { clearSectionKCollaborationPurposes, isSectionKFieldVisible } =
  await server.ssrLoadModule('/src/lib/sectionK.ts');
const { revision21FormError } = await server.ssrLoadModule('/src/lib/formRevision.ts');

const option = (id, code) => ({ id, code, label: code, requires_text: false });
const question = (id, code, answer_type = 'MATRIX', extra = {}) => ({
  question_id: id,
  question_code: code,
  question_no: 'iv',
  question_text: code,
  answer_type,
  options: [],
  is_required: true,
  ...extra,
});

test('collaboration purpose is hidden and cleared only for the NONE collaborator', () => {
  const collaborations = question(2, 'K_COLLABORATIONS', 'REPEATING_GROUP', {
    fields: [
      { key: 'collaborator_type_id', options: [option(8, 'NONE'), option(9, 'SUPPLIER')] },
      { key: 'purpose_ids' },
    ],
  });
  const none = { collaborator_type_id: 8, purpose_ids: [21] };
  const supplier = { collaborator_type_id: 9, purpose_ids: [22] };

  assert.equal(isSectionKFieldVisible('K_COLLABORATIONS', none, 'purpose_ids', collaborations.fields), false);
  assert.equal(isSectionKFieldVisible('K_COLLABORATIONS', supplier, 'purpose_ids', collaborations.fields), true);
  assert.deepEqual(clearSectionKCollaborationPurposes(collaborations, [none, supplier]), [
    { collaborator_type_id: 8 },
    supplier,
  ]);
});

test('future-plan No omits all dependent questions and barrier No clears stale ratings', () => {
  const futurePlan = question(1, 'K_FUTURE_PLAN', 'REPEATING_GROUP', {
    fields: [{ key: 'has_future_plan' }],
  });
  const barrierGate = question(3, 'K_BARRIERS_GATE', 'YES_NO');
  const barriers = question(4, 'K_BARRIERS', 'MATRIX', {
    matrix_items: [{ id: 41, code: 'B01', label: 'Electricity shortage', answer_type: 'RATING_1_5', options: [] }],
  });
  const questions = [futurePlan, barrierGate, barriers];
  const noPlan = {
    1: { has_future_plan: false },
    3: false,
    4: { 41: { rating: 5 } },
  };
  assert.equal(isQuestionVisible(futurePlan, questions, noPlan), true);
  assert.equal(isQuestionVisible(barrierGate, questions, noPlan), false);
  assert.equal(isQuestionVisible(barriers, questions, noPlan), false);
  assert.deepEqual(clearHiddenAnswers(questions, noPlan), { 1: { has_future_plan: false } });

  const hasPlanNoBarriers = { 1: { has_future_plan: true }, 3: false, 4: { 41: { rating: 5 } } };
  assert.equal(isQuestionVisible(barrierGate, questions, hasPlanNoBarriers), true);
  assert.equal(isQuestionVisible(barriers, questions, hasPlanNoBarriers), false);
  assert.deepEqual(clearHiddenAnswers(questions, hasPlanNoBarriers), {
    1: { has_future_plan: true },
    3: false,
  });
});

test('migration 16 and database setup allowlist include the Section K gate', async () => {
  const migration = await readFile(new URL('../../database/migration_16_section_k_gates.sql', import.meta.url), 'utf8');
  const setup = await readFile(new URL('../../SETUP_DATABASE.bat', import.meta.url), 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS has_barriers boolean/);
  assert.match(migration, /K_BARRIERS_GATE/);
  assert.match(migration, /K_BARRIERS/);
  assert.match(migration, /Rate barriers and bottlenecks/);
  assert.doesNotMatch(migration, /\b(?:DELETE|TRUNCATE|DROP)\b/i);
  assert.match(setup, /call :run migration_16_section_k_gates\.sql/);
});

test('form revision requires the Section K gates and collaboration choice metadata', () => {
  const form = {
    sections: [{
      section_code: 'K',
      title: 'Future plans and barriers',
      questions: [
        question(1, 'K_FUTURE_PLAN', 'REPEATING_GROUP', {
          fields: [{ key: 'has_future_plan', required: true }],
        }),
        question(2, 'K_COLLABORATIONS', 'REPEATING_GROUP', {
          fields: [
            { key: 'collaborator_type_id', options: [option(8, 'NONE')] },
            { key: 'purpose_ids' },
          ],
        }),
        question(3, 'K_BARRIERS_GATE', 'YES_NO'),
        question(4, 'K_BARRIERS', 'MATRIX', {
          matrix_items: [{ id: 41, code: 'B01', label: 'Electricity', answer_type: 'RATING_1_5', options: [] }],
        }),
      ],
    }],
  };
  assert.equal(revision21FormError(form), null);
  form.sections[0].questions = form.sections[0].questions.filter((item) =>
    item.question_code !== 'K_BARRIERS_GATE');
  assert.match(revision21FormError(form), /migration 16/);
});
