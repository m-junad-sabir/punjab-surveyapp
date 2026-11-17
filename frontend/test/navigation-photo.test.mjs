import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: { ignored: ['**'] } },
});
after(() => server.close());
const { photoMetadataError, MAX_PHOTO_ACCURACY_M, PHOTO_ACCURACY_WARNING_M } =
  await server.ssrLoadModule('/src/lib/photoCapture.ts');
const { surveySectionStatus, surveySectionIndex, scrollSurveyToTop } =
  await server.ssrLoadModule('/src/lib/surveyNavigation.ts');
const { questionFormatError } = await server.ssrLoadModule('/src/lib/surveyValidation.ts');

const question = (id, code, type = 'TEXT', extra = {}) => ({
  question_id: id, question_code: code, answer_type: type, options: [], is_required: false, ...extra,
});
const section = (code, questions) => ({ section_code: code, questions });
const status = (sec, answers, invalid = () => false, all = sec.questions) =>
  surveySectionStatus(sec, all, answers, invalid);
const photo = {
  photo_id: '12345678-1234-4234-8234-123456789012',
  latitude: 31.5, longitude: 74.3, accuracy_m: 250, captured_at: '2026-11-02T00:00:00.000Z',
};

test('photo capture and draft validation accept the exact 250 m boundary but reject worse/missing GPS', () => {
  assert.equal(MAX_PHOTO_ACCURACY_M, 250);
  assert.equal(PHOTO_ACCURACY_WARNING_M, 50);
  for (const accuracy_m of [0, 50, 50.01, 100, 249.99, 250]) {
    assert.equal(photoMetadataError({ ...photo, accuracy_m }), null);
    assert.equal(questionFormatError(question(1, 'L_PHOTO_INTERVIEW_SESSION', 'PHOTO'),
      { ...photo, accuracy_m }), null);
  }
  for (const accuracy_m of [-1, 250.001, 251, Infinity, NaN, undefined, null, '250']) {
    assert.match(photoMetadataError({ ...photo, accuracy_m }), /between 0 and 250/);
  }
  for (const invalid of [{ latitude: null }, { longitude: undefined }, { latitude: 91 }, { captured_at: '' }]) {
    assert.ok(photoMetadataError({ ...photo, ...invalid }));
  }
});

test('empty B-K sections are Pending, partial coverage is Partial, and every visible answer is needed for Done', () => {
  for (const code of 'BCDEFGHIJK') {
    const sec = section(code, [question(1, `${code}ONE`), question(2, `${code}TWO`)]);
    assert.equal(status(sec, {}), 'pending');
    assert.equal(status(sec, { 1: '', 2: { nested: '' } }), 'pending');
    assert.equal(status(sec, { 1: 'answer' }), 'partial');
    assert.equal(status(sec, { 1: 'answer', 2: 'answer' }), 'done');
    assert.equal(status(sec, { 1: 'answer', 2: 'answer' }, (q) => q.question_id === 2), 'partial');
  }
});

test('explicit zero and No are answers, but blank rows and unselected multi-choices are not', () => {
  const sec = section('E', [question(1, 'ZERO', 'NUMBER'), question(2, 'NO', 'YES_NO')]);
  assert.equal(status(sec, { 1: 0, 2: false }), 'done');
  const rows = section('C', [question(3, 'ROWS', 'REPEATING_GROUP', { repeatable: true })]);
  assert.equal(status(rows, { 3: [{}] }), 'pending');
  assert.equal(status(rows, { 3: [{ name: 'Product' }, {}] }), 'partial');
  const multi = section('I', [question(4, 'MULTI', 'MULTI_CHOICE')]);
  assert.equal(status(multi, { 4: { option_ids: [], other_text: 'unselected' } }), 'partial');
  assert.equal(status(multi, { 4: [1] }), 'done');
});

test('matrix questions need every visible row, not an empty object or description alone', () => {
  const sec = section('I', [question(1, 'MATRIX', 'MATRIX', {
    matrix_items: [
      { id: 10, code: 'ONE', answer_type: 'CHOICE', options: [] },
      { id: 11, code: 'TWO', answer_type: 'RATING_1_5', options: [] },
    ],
  })]);
  assert.equal(status(sec, { 1: { 10: {} } }), 'pending');
  assert.equal(status(sec, { 1: { 10: { other_text: 'description' } } }), 'partial');
  assert.equal(status(sec, { 1: { 10: { choice_value_id: 100 } } }), 'partial');
  assert.equal(status(sec, { 1: { 10: { choice_value_id: 100 }, TWO: { rating: 1 } } }), 'done');
});

test('conditional coverage excludes hidden children and responds to gate changes and draft reload', () => {
  const sec = section('K', [
    question(1, 'K_FUTURE_PLAN', 'REPEATING_GROUP'),
    question(2, 'K_DETAILS'),
  ]);
  assert.equal(status(sec, {}), 'pending');
  const no = { 1: { has_future_plan: false } };
  assert.equal(status(sec, JSON.parse(JSON.stringify(no))), 'done');
  assert.equal(status(sec, { 1: { has_future_plan: true } }), 'partial');
  assert.equal(status(sec, { 1: { has_future_plan: true }, 2: 'plan' }), 'done');
});

test('A and L keep incomplete required-field checks, including both required photos', () => {
  const a = section('A', [question(1, 'A_DETAILS', 'REPEATING_GROUP')]);
  assert.equal(status(a, { 1: { name: 'Factory' } }, () => true), 'partial');
  assert.equal(status(a, { 1: { name: 'Factory', contact: '03001234567' } }), 'done');
  const l = section('L', [
    question(1, 'L_PHOTO_INTERVIEW_SESSION', 'PHOTO', { is_required: true }),
    question(2, 'L_PHOTO_ENTRANCE_SIGNBOARD', 'PHOTO', { is_required: true }),
  ]);
  assert.equal(status(l, {}), 'pending');
  assert.equal(status(l, { 1: photo }), 'partial');
  const answers = { 1: photo, 2: photo };
  assert.equal(status(l, answers, (q) => !!questionFormatError(q, answers[q.question_id])), 'done');
  const invalid = { 1: photo, 2: { ...photo, accuracy_m: 251 } };
  assert.equal(status(l, invalid, (q) => !!questionFormatError(q, invalid[q.question_id])), 'partial');
});

test('section URL lookup and scroll reset target the actual page container, without smooth vertical races', () => {
  const sections = [section('A', []), section('B', []), section('L', [])];
  assert.equal(surveySectionIndex(sections, 'B'), 1);
  assert.equal(surveySectionIndex(sections, 'L'), 2);
  assert.equal(surveySectionIndex(sections, null), 0);
  assert.equal(surveySectionIndex(sections, 'invalid'), 0);
  const calls = [];
  scrollSurveyToTop({ closest: (selector) => {
    assert.equal(selector, '.page-scroll');
    return { scrollTo: (options) => calls.push(options) };
  } });
  assert.deepEqual(calls, [{ top: 0, behavior: 'auto' }]);
  scrollSurveyToTop(null);
});
