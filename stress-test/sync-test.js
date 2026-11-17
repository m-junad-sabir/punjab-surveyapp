'use strict';
// Sync stress test. Each "survey" = 2 photo uploads + 1 POST /sync.
// THIS WRITES DATA. Run it only against the throwaway copy (punjab_stress_test).
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/+$/, '');
const USERNAME = process.env.TEST_USERNAME;
const PASSWORD = process.env.TEST_PASSWORD;
const LEVELS = (process.env.LEVELS || '1,5,10,20').split(',').map(Number);
const DURATION = parseInt(process.env.DURATION || '30', 10);
const MAX_SURVEYS = parseInt(process.env.MAX_SURVEYS || '300', 10);
const BATCH = parseInt(process.env.BATCH || '1', 10);
const PHOTO_KB = Math.min(parseInt(process.env.PHOTO_KB || '300', 10), 2800);

if (!['localhost', '127.0.0.1'].includes(new URL(BASE_URL).hostname)) {
  console.error('Refusing to run: BASE_URL must point to this machine (localhost).');
  process.exit(1);
}
if (process.env.CONFIRM_COPY_DB !== 'yes') {
  console.error('This test WRITES data. Start the backend against the throwaway copy, then set CONFIRM_COPY_DB=yes.');
  process.exit(1);
}
if (!USERNAME || !PASSWORD) {
  console.error('Set TEST_USERNAME and TEST_PASSWORD first.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => Math.round(n * 10) / 10;
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};
const bump = (obj, key) => { obj[key] = (obj[key] || 0) + 1; };

const template = JSON.parse(fs.readFileSync(path.join(__dirname, 'template-draft.json'), 'utf8'));
const resultsDir = path.join(__dirname, 'results');
fs.mkdirSync(resultsDir, { recursive: true });
const counterFile = path.join(resultsDir, '.sync-counter');
let counter = fs.existsSync(counterFile) ? parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0 : 0;

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed with HTTP ${res.status}`);
  const data = await res.json();
  return { token: data.access_token, userId: data.user.user_id };
}

function findQuestionId(node, code) {
  if (Array.isArray(node)) {
    for (const n of node) { const r = findQuestionId(n, code); if (r !== null) return r; }
    return null;
  }
  if (node && typeof node === 'object') {
    const id = node.question_id !== undefined ? node.question_id : node.id;
    if ((node.question_code === code || node.code === code) && id !== undefined) return id;
    for (const v of Object.values(node)) { const r = findQuestionId(v, code); if (r !== null) return r; }
  }
  return null;
}

async function loadPhotoQuestionIds(token) {
  if (process.env.PHOTO_Q_INTERVIEW && process.env.PHOTO_Q_SIGNBOARD) {
    return { interview: Number(process.env.PHOTO_Q_INTERVIEW), signboard: Number(process.env.PHOTO_Q_SIGNBOARD) };
  }
  const res = await fetch(`${BASE_URL}/survey-forms/active`, { headers: { Authorization: `Bearer ${token}` } });
  const form = await res.json();
  const interview = findQuestionId(form, 'L_PHOTO_INTERVIEW_SESSION');
  const signboard = findQuestionId(form, 'L_PHOTO_ENTRANCE_SIGNBOARD');
  if (interview === null || signboard === null) {
    console.error('Could not find the two photo question IDs in the form response. Tell Claude; the IDs can be read from the database instead.');
    process.exit(1);
  }
  return { interview, signboard };
}

function newResponse(userId, Q) {
  const i = counter++;
  const tag = String(i).padStart(6, '0');
  const row = i % 200;
  const col = Math.floor(i / 200);
  const lat = Number((31.2 + row * 0.001).toFixed(6));
  const lng = Number((74.0 + col * 0.001).toFixed(6));
  const answers = JSON.parse(JSON.stringify(template.answers)).map((a) => {
    if (a.question_id === 27) return { ...a, answer_value: { ...a.answer_value, name: `Stress Test Unit ${tag}` } };
    if (a.question_id === 92) return { ...a, answer_value: a.answer_value.map((x) => ({ ...x, name: `Stress Tester ${tag}` })) };
    return a;
  });
  const photos = [
    { id: crypto.randomUUID(), type: 'L_PHOTO_INTERVIEW_SESSION', questionId: Q.interview },
    { id: crypto.randomUUID(), type: 'L_PHOTO_ENTRANCE_SIGNBOARD', questionId: Q.signboard },
  ];
  for (const p of photos) answers.push({ question_id: p.questionId, answer_value: { photo_id: p.id } });
  const body = {
    response_id: crypto.randomUUID(),
    surveyor_id: userId,
    form_id: template.form_id,
    gps_lat: lat,
    gps_lng: lng,
    gps_accuracy_m: 12,
    started_at: new Date(Date.now() - 600000).toISOString(),
    submitted_at: new Date().toISOString(),
    answers,
  };
  return { body, photos, skip: false };
}

async function uploadPhoto(token, body, photo) {
  const size = PHOTO_KB * 1024;
  const buf = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(size - 6), Buffer.from([0xff, 0xd9])]);
  const form = new FormData();
  form.append('photo_id', photo.id);
  form.append('response_id', body.response_id);
  form.append('photo_type', photo.type);
  form.append('latitude', String(body.gps_lat));
  form.append('longitude', String(body.gps_lng));
  form.append('accuracy_m', '12');
  form.append('captured_at', new Date().toISOString());
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), `${photo.type}.jpg`);
  const t = performance.now();
  const res = await fetch(`${BASE_URL}/sync/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  const ms = performance.now() - t;
  const text = await res.text();
  return { ok: res.ok, status: res.status, ms, text };
}

async function syncBatch(token, bodies) {
  const t = performance.now();
  const res = await fetch(`${BASE_URL}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: 'STRESS-TEST', responses: bodies }),
    signal: AbortSignal.timeout(120000),
  });
  const ms = performance.now() - t;
  let data = null;
  try { data = await res.json(); } catch (e) { /* not JSON */ }
  return { ok: res.ok, status: res.status, ms, data };
}

const newStats = () => ({
  attempted: 0, synced: 0, duplicate: 0, already: 0, failed: 0, photoFail: 0, netErr: 0,
  photoMs: [], syncMs: [], totalMs: [], problems: {},
});

async function surveyFlow(token, userId, Q, stats) {
  const t0 = performance.now();
  const items = Array.from({ length: BATCH }, () => newResponse(userId, Q));
  stats.attempted += items.length;
  for (const it of items) {
    for (const p of it.photos) {
      const r = await uploadPhoto(token, it.body, p);
      stats.photoMs.push(r.ms);
      if (!r.ok) {
        stats.photoFail++;
        it.skip = true;
        bump(stats.problems, `photo upload HTTP ${r.status}: ${r.text.slice(0, 120)}`);
      }
    }
  }
  const ready = items.filter((i) => !i.skip);
  if (!ready.length) return;
  const s = await syncBatch(token, ready.map((i) => i.body));
  stats.syncMs.push(s.ms);
  if (!s.ok || !s.data || !Array.isArray(s.data.results)) {
    stats.failed += ready.length;
    bump(stats.problems, `sync HTTP ${s.status}`);
    return;
  }
  for (const r of s.data.results) {
    if (r.status === 'synced') stats.synced++;
    else if (r.status === 'duplicate_flagged') stats.duplicate++;
    else if (r.status === 'already_synced') stats.already++;
    else { stats.failed++; bump(stats.problems, `sync failed: ${String(r.message).slice(0, 160)}`); }
  }
  stats.totalMs.push(performance.now() - t0);
}

async function worker(token, userId, Q, stats, endAt) {
  while (Date.now() < endAt && stats.attempted < MAX_SURVEYS) {
    try {
      await surveyFlow(token, userId, Q, stats);
    } catch (e) {
      stats.netErr++;
      bump(stats.problems, `network/timeout: ${e.name}: ${e.message}`);
      await sleep(200);
    }
  }
}

async function waitUntilIdle(token) {
  for (let attempt = 0; attempt < 120; attempt++) {
    let fast = 0;
    for (let i = 0; i < 5; i++) {
      const started = Date.now();
      try { await fetch(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }); } catch (e) { break; }
      if (Date.now() - started >= 100) break;
      fast++;
    }
    if (fast === 5) return;
    await sleep(1000);
  }
}

async function runLevel(token, userId, Q, concurrency) {
  const stats = newStats();
  const started = performance.now();
  const endAt = Date.now() + DURATION * 1000;
  await Promise.all(Array.from({ length: concurrency }, () => worker(token, userId, Q, stats, endAt)));
  const secs = (performance.now() - started) / 1000;
  return {
    concurrency,
    secs: round(secs),
    attempted: stats.attempted,
    synced: stats.synced,
    duplicate: stats.duplicate,
    already: stats.already,
    failed: stats.failed,
    photoFail: stats.photoFail,
    netErr: stats.netErr,
    surveysPerSec: round((stats.synced + stats.duplicate + stats.already) / secs),
    photo: { p50: pct(stats.photoMs, 50), p95: pct(stats.photoMs, 95) },
    sync: { p50: pct(stats.syncMs, 50), p95: pct(stats.syncMs, 95) },
    survey: { p50: pct(stats.totalMs, 50), p95: pct(stats.totalMs, 95) },
    problems: stats.problems,
  };
}

const isClean = (r) => r.failed === 0 && r.photoFail === 0 && r.netErr === 0 && r.survey.p95 <= 3000;

(async () => {
  console.log('Logging in...');
  const { token, userId } = await login();
  const Q = await loadPhotoQuestionIds(token);
  console.log(`Photo question IDs: interview=${Q.interview}, signboard=${Q.signboard}`);

  console.log('Probe: sending one complete survey...');
  const probe = newStats();
  await surveyFlow(token, userId, Q, probe);
  if (probe.synced !== 1) {
    console.error('The probe survey was NOT accepted. Problems:');
    console.error(probe.problems);
    fs.writeFileSync(counterFile, String(counter));
    process.exit(1);
  }
  console.log('Probe OK: the server accepted a full survey. Starting the load levels.');

  const rows = [];
  for (const c of LEVELS) {
    await waitUntilIdle(token);
    console.log(`${c} simultaneous surveyors (up to ${DURATION}s or ${MAX_SURVEYS} surveys)...`);
    rows.push(await runLevel(token, userId, Q, c));
  }
  fs.writeFileSync(counterFile, String(counter));

  const cpus = os.cpus();
  const lines = [];
  lines.push('# Sync Stress Test Report (POST /sync with photo uploads)', '');
  lines.push(`Date: ${new Date().toString()}`, '');
  lines.push('## Environment', '');
  lines.push(`- Target: ${BASE_URL} (local; API, database and load tool share one machine)`);
  lines.push(`- Machine: ${cpus[0].model}, ${cpus.length} logical CPUs, ${Math.round(os.totalmem() / 1073741824)} GB RAM`);
  lines.push(`- Node: ${process.version}`);
  lines.push('- Database: throwaway copy (punjab_stress_test). All surveys and photos written by this test live only there.');
  lines.push(`- One survey = 2 photo uploads (${PHOTO_KB} KB each, synthetic JPEG) + 1 POST /sync with ${BATCH} survey(s); template taken from a real saved draft (30 answers + 2 photo answers).`);
  lines.push(`- Each level runs up to ${DURATION}s or ${MAX_SURVEYS} surveys. Levels: ${LEVELS.join(', ')} simultaneous surveyors.`);
  lines.push('- "Comfortable" = no failed surveys, no photo failures, no network errors, and 95th percentile of a whole survey at or under 3000 ms.', '');
  let best = 'none';
  for (const r of rows) { if (!isClean(r)) break; best = r.concurrency; }
  lines.push('## Summary', '');
  lines.push(`Highest comfortable level: **${best}** simultaneous surveyors.`, '');
  lines.push('## Outcomes', '');
  lines.push('| Surveyors | Seconds | Tried | Synced | Duplicate flagged | Failed | Photo failures | Network errors | Surveys/s |');
  lines.push('|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) lines.push(`| ${r.concurrency} | ${r.secs} | ${r.attempted} | ${r.synced} | ${r.duplicate} | ${r.failed} | ${r.photoFail} | ${r.netErr} | ${r.surveysPerSec} |`);
  lines.push('', '## Latency (ms)', '');
  lines.push('| Surveyors | Photo p50 | Photo p95 | Sync p50 | Sync p95 | Whole survey p50 | Whole survey p95 |');
  lines.push('|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) lines.push(`| ${r.concurrency} | ${r.photo.p50} | ${r.photo.p95} | ${r.sync.p50} | ${r.sync.p95} | ${r.survey.p50} | ${r.survey.p95} |`);
  const problems = rows.filter((r) => Object.keys(r.problems).length);
  if (problems.length) {
    lines.push('', '## Problems seen', '');
    for (const r of problems) {
      lines.push(`**${r.concurrency} surveyors**`, '');
      for (const [msg, n] of Object.entries(r.problems)) lines.push(`- ${n} x ${msg}`);
      lines.push('');
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(resultsDir, `sync-report-${stamp}.md`), lines.join('\n'));
  fs.writeFileSync(path.join(resultsDir, `sync-raw-${stamp}.json`), JSON.stringify(rows, null, 2));
  console.log(`\nDone. Report saved in stress-test/results/sync-report-${stamp}.md`);
  console.log('Cleanup later: rm -rf /tmp/stress-uploads (fake photos) and drop the copy database.');
})().catch((e) => { console.error('Sync test failed:', e.message); process.exit(1); });