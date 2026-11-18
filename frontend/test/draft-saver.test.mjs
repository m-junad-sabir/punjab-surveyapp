import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: { ignored: ['**'] } },
});
after(() => server.close());
const { DraftSaver, AUTOSAVE_INTERVAL_MS } = await server.ssrLoadModule('/src/lib/draftSaver.ts');

test('autosave skips unchanged data and uses a ten-second interval', async () => {
  const writes = [];
  const saver = new DraftSaver(async (value) => writes.push(value));
  assert.equal(AUTOSAVE_INTERVAL_MS, 10000);
  assert.equal(await saver.save(() => 'unused'), false);
  saver.changed();
  assert.equal(await saver.save(() => 'first'), true);
  assert.equal(saver.dirty, false);
  assert.equal(await saver.save(() => 'unused'), false);
  assert.deepEqual(writes, ['first']);
});

test('edits made during a save stay dirty and queued writes use the latest snapshot', async () => {
  let release;
  const writes = [];
  const saver = new DraftSaver(async (value) => {
    writes.push(value);
    if (value === 'first') await new Promise((resolve) => { release = resolve; });
  });
  let answer = 'first';
  saver.changed();
  const first = saver.save(() => answer);
  await Promise.resolve();
  answer = 'second';
  saver.changed();
  const second = saver.save(() => answer);
  assert.deepEqual(writes, ['first']);
  release();
  await first;
  await second;
  assert.deepEqual(writes, ['first', 'second']);
  assert.equal(saver.dirty, false);
});

test('failed writes retain unsaved changes and do not prevent a retry', async () => {
  let fail = true;
  const saver = new DraftSaver(async () => {
    if (fail) throw new Error('Storage unavailable');
  });
  saver.changed();
  await assert.rejects(saver.save(() => 'answer'), /Storage unavailable/);
  assert.equal(saver.dirty, true);
  fail = false;
  assert.equal(await saver.save(() => 'answer'), true);
  assert.equal(saver.dirty, false);
});

test('a submission waits for an in-flight draft and a later autosave cannot overwrite it', async () => {
  let release;
  const writes = [];
  const saver = new DraftSaver(async (value) => {
    writes.push(value);
    if (value === 'draft') await new Promise((resolve) => { release = resolve; });
  });
  saver.changed();
  const draft = saver.save(() => 'draft');
  await Promise.resolve();
  const submission = saver.save(() => 'pending_sync', true);
  const autosave = saver.save(() => 'draft');
  release();
  await Promise.all([draft, submission, autosave]);
  assert.deepEqual(writes, ['draft', 'pending_sync']);
  assert.equal(saver.dirty, false);
});
