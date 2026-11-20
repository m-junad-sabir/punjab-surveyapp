'use strict';
// Injection and malformed-input test. THIS WRITES DATA (a few test surveys and photo rows).
// Run it only against the throwaway copy (punjab_stress_test) on this machine.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/+$/, '');
const USERNAME = process.env.TEST_USERNAME;
const PASSWORD = process.env.TEST_PASSWORD;
const Q_INTERVIEW = Number(process.env.PHOTO_Q_INTERVIEW || 87);
const Q_SIGNBOARD = Number(process.env.PHOTO_Q_SIGNBOARD || 88);

if (!['localhost', '127.0.0.1'].includes(new URL(BASE_URL).hostname)) {
  console.error('Refusing to run: BASE_URL must point to this machine (localhost).');
  process.exit(1);
}
if (process.env.CONFIRM_COPY_DB !== 'yes') {
  console.error('This test WRITES data. Start the backend against the throwaway copy, check it, then set CONFIRM_COPY_DB=yes.');
  process.exit(1);
}
if (!USERNAME || !PASSWORD) {
  console.error('Set TEST_USERNAME and TEST_PASSWORD first.');
  process.exit(1);
}

const template = JSON.parse(fs.readFileSync(path.join(__dirname, 'template-draft.json'), 'utf8'));
const results = [];
let token = null;
let userId = null;
let seq = 0;

const short = (s, n = 110) => String(s).replace(/[\u0000-\u001f\u202a-\u202e\s]+/g, ' ').slice(0, n);
const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const jpegBuf = (kb) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(kb * 1024 - 6), Buffer.from([0xff, 0xd9])]);

function add(id, title, verdict, status, ms, note) {
  results.push({ id, title, verdict, status, ms, note: note || '' });
  console.log(`${verdict.padEnd(8)}${id.padEnd(7)}${title} -> ${status} (${ms} ms)${note ? ' | ' + short(note, 90) : ''}`);
}

async function call(method, urlPath, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body;
  if (opts.form) body = opts.form;
  else if (opts.raw !== undefined) body = opts.raw;
  else if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }
  const t = performance.now();
  try {
    const res = await fetch(BASE_URL + urlPath, { method, headers, body, signal: AbortSignal.timeout(30000) });
    const text = await res.text();
    return { status: res.status, text, ms: Math.round(performance.now() - t) };
  } catch (e) {
    return { status: 0, text: `${e.name}: ${e.message}`, ms: Math.round(performance.now() - t) };
  }
}

function check(id, title, expected, res, info = false) {
  let verdict = 'OK';
  let note = '';
  if (res.status === 0) { verdict = 'FINDING'; note = res.text; }
  else if (res.status >= 500 && !expected.includes(res.status)) { verdict = 'FINDING'; note = 'server error: ' + short(res.text, 80); }
  else if (info) { verdict = 'INFO'; note = short(res.text, 80); }
  else if (!expected.includes(res.status) && res.status >= 200 && res.status < 300) {
    verdict = 'FINDING';
    note = 'accepted, expected ' + expected.join('/') + ': ' + short(res.text, 80);
  }
  add(id, title, verdict, res.status, res.ms, note);
}

function photoForm(fields = {}, fileBuf = jpegBuf(20), mime = 'image/jpeg') {
  const base = {
    photo_id: crypto.randomUUID(), response_id: crypto.randomUUID(), photo_type: 'L_PHOTO_INTERVIEW_SESSION',
    latitude: '31.5', longitude: '74.3', accuracy_m: '12', captured_at: new Date().toISOString(), ...fields,
  };
  const f = new FormData();
  for (const [k, v] of Object.entries(base)) if (v !== undefined) f.append(k, v);
  if (fileBuf !== null) f.append('file', new Blob([fileBuf], { type: mime }), 'photo.jpg');
  return f;
}

function surveyFrom(text) {
  const i = seq++;
  const lat = Number((28.0 + (i % 100) * 0.002).toFixed(6));
  const lng = Number((70.0 + Math.floor(i / 100) * 0.002).toFixed(6));
  const answers = JSON.parse(JSON.stringify(template.answers))
    .filter((a) => a.question_id !== Q_INTERVIEW && a.question_id !== Q_SIGNBOARD)
    .map((a) => {
      if (a.question_id === 27) return { ...a, answer_value: { ...a.answer_value, name: text } };
      if (a.question_id === 30) return { ...a, answer_value: { ...a.answer_value, address: text.length > 200 ? 'Test street 1' : text } };
      if (a.question_id === 92) return { ...a, answer_value: a.answer_value.map((x) => ({ ...x, name: 'Tester ' + i, designation: text.length > 200 ? 'Tester' : text })) };
      return a;
    });
  const photos = [
    { id: crypto.randomUUID(), type: 'L_PHOTO_INTERVIEW_SESSION', q: Q_INTERVIEW },
    { id: crypto.randomUUID(), type: 'L_PHOTO_ENTRANCE_SIGNBOARD', q: Q_SIGNBOARD },
  ];
  photos.forEach((p) => answers.push({ question_id: p.q, answer_value: { photo_id: p.id } }));
  const body = {
    response_id: crypto.randomUUID(), surveyor_id: userId, form_id: template.form_id,
    gps_lat: lat, gps_lng: lng, gps_accuracy_m: 12,
    started_at: new Date(Date.now() - 600000).toISOString(), submitted_at: new Date().toISOString(), answers,
  };
  return { body, photos };
}

async function syncCase(id, title, survey, withPhotos) {
  if (withPhotos) {
    for (const p of survey.photos) {
      await call('POST', '/sync/photos', { token, form: photoForm({ photo_id: p.id, response_id: survey.body.response_id, photo_type: p.type }) });
    }
  }
  const res = await call('POST', '/sync', { token, json: { device_id: 'INJECTION-TEST', responses: [survey.body] } });
  let item = null;
  try { item = JSON.parse(res.text).results[0]; } catch (e) { /* not JSON */ }
  if (res.status === 0 || res.status >= 500) add(id, title, 'FINDING', res.status, res.ms, res.status === 0 ? res.text : 'server error: ' + short(res.text, 80));
  else if (res.status >= 400) add(id, title, 'OK', res.status, res.ms, 'rejected: ' + short(res.text, 80));
  else if (item) add(id, title, item.status === 'failed' || item.status === 'synced' ? 'OK' : 'INFO', res.status, res.ms, `survey ${item.status}: ${item.message}`);
  else add(id, title, 'INFO', res.status, res.ms, short(res.text, 80));
  return { res, item };
}

(async () => {
  console.log('Logging in...');
  const lr = await call('POST', '/auth/login', { json: { username: USERNAME, password: PASSWORD } });
  if (lr.status < 200 || lr.status >= 300) { console.error('Login failed: HTTP ' + lr.status); process.exit(1); }
  const login = JSON.parse(lr.text);
  token = login.access_token;
  userId = login.user.user_id;

  // ---- A. Login input
  const L = (id, title, json, expected = [400, 401]) =>
    call('POST', '/auth/login', { json }).then((r) => check(id, 'login: ' + title, expected, r));
  await L('A01', "SQL-looking username (' OR '1'='1' --)", { username: "' OR '1'='1' --", password: 'x' });
  await L('A02', "SQL comment in username (admin' --)", { username: "admin' --", password: 'x' });
  await L('A03', 'username and password sent as objects', { username: { $ne: null }, password: { $ne: null } });
  await L('A04', 'username sent as an array', { username: ['a', 'b'], password: 'x' });
  await L('A05', 'username sent as a number', { username: 12345, password: 'x' });
  await L('A06', 'username null, real password', { username: null, password: PASSWORD });
  await L('A07', 'username missing, real password', { password: PASSWORD });
  await L('A08', 'empty username, real password', { username: '', password: PASSWORD });
  await L('A09', 'password missing, real username', { username: USERNAME });
  await L('A10', 'username of 100,000 characters', { username: 'a'.repeat(100000), password: 'x' });
  await L('A11', 'username containing a NUL character', { username: 'a\u0000b', password: 'x' });
  check('A12', 'login: malformed JSON', [400], await call('POST', '/auth/login', { headers: { 'Content-Type': 'application/json' }, raw: '{"username": ' }));
  await L('A13', 'password of 1 MB, real username', { username: USERNAME, password: 'p'.repeat(1000000) });
  await L('A14', 'body over 2 MB', { username: 'x'.repeat(3 * 1024 * 1024), password: 'y' }, [413]);

  // ---- B. Tokens and permissions
  check('B01', 'no token', [401], await call('GET', '/auth/me'));
  check('B02', 'garbage token', [401], await call('GET', '/auth/me', { token: 'garbage' }));
  const forged = `${b64u({ alg: 'none', typ: 'JWT' })}.${b64u({ sub: userId, user_id: userId, username: 'x', permissions: ['USER_CREATE', 'USER_REMOVE', 'SURVEY_CONFIRM', 'SURVEY_SUBMIT'], tv: 0 })}.`;
  check('B03', 'token with algorithm "none"', [401], await call('GET', '/auth/users', { token: forged }));
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  payload.permissions = [...new Set([...(payload.permissions || []), 'USER_CREATE', 'USER_REMOVE', 'SURVEY_CONFIRM'])];
  const tampered = `${parts[0]}.${b64u(payload)}.${parts[2]}`;
  check('B04', 'token with changed permissions, old signature', [401], await call('GET', '/auth/users', { token: tampered }));
  check('B05', 'token without the Bearer word', [401], await call('GET', '/auth/me', { headers: { Authorization: token } }));
  check('B06', 'surveyor lists users', [403], await call('GET', '/auth/users', { token }));
  check('B07', 'surveyor registers an ADMIN user', [403], await call('POST', '/auth/register', { token, json: { username: 'inj-admin', full_name: 'x', password: 'Passw0rd!x', role_code: 'ADMIN' } }));
  check('B08', 'surveyor lists roles', [403], await call('GET', '/auth/roles', { token }));
  const zero = '00000000-0000-0000-0000-000000000000';
  check('B09', 'surveyor deactivates a user', [403], await call('PATCH', `/auth/users/${zero}/status`, { token, json: { is_active: false } }));
  check('B10', 'surveyor approves a unit', [403], await call('POST', `/industrial-units/${zero}/approve`, { token, json: {} }));
  check('B11', 'surveyor rejects a unit', [403], await call('POST', `/industrial-units/${zero}/reject`, { token, json: {} }));

  // ---- C. Odd IDs in the address
  const ids = [
    ['abc', 'plain text id', [400, 404]],
    ["1' OR '1'='1", 'SQL-looking id', [400, 404]],
    ['../../etc/passwd', 'path traversal id', [400, 404]],
    ['\u0000', 'NUL character id', [400, 404]],
    ['a'.repeat(5000), '5,000-character id', [400, 404, 414]],
    [zero, 'valid UUID that does not exist', [200, 404]],
  ];
  const routes = [['/industrial-units/', 'unit'], ['/attachments/', 'attachment'], ['/attachments/unit/', 'unit attachments']];
  let n = 1;
  for (const [rp, rname] of routes) {
    for (const [value, vname, expected] of ids) {
      const res = await call('GET', rp + encodeURIComponent(value), { token });
      check('C' + String(n++).padStart(2, '0'), `GET ${rname}: ${vname}`, expected, res);
    }
  }

  // ---- INJ. Hostile text inside a real survey
  const texts = [
    ['INJ01', "Robert'); DROP TABLE industrial_units;-- INJ01", "Robert');"],
    ['INJ02', "' OR '1'='1' -- INJ02", "' OR '1'='1' --"],
    ['INJ03', "<script>alert('xss')</script> INJ03", "<script>alert('xss')</script>"],
    ['INJ04', '<img src=x onerror=alert(1)> INJ04', '<img src=x onerror=alert(1)>'],
    ['INJ05', '${7*7} {{7*7}} INJ05', '${7*7} {{7*7}}'],
    ['INJ06', 'A'.repeat(20000) + ' INJ06', null],
    ['INJ07', 'unicode \u202Etxet 😀 \u0644\u0627 INJ07', '😀'],
    ['INJ08', 'null\u0000byte INJ08', null],
    ['INJ09', 'line1\nline2\r\n\ttab INJ09', null],
    ['INJ10', "'; SELECT pg_sleep(5); -- INJ10", 'SELECT pg_sleep(5)'],
  ];
  const stored = [];
  for (const [id, text, literal] of texts) {
    const { res, item } = await syncCase(id, `hostile text in the name field (${id})`, surveyFrom(text), true);
    if (item && item.status === 'synced') stored.push({ id, literal });
    if (id === 'INJ10' && res.ms > 4500) add('INJ10t', 'time-based check (pg_sleep)', 'FINDING', res.status, res.ms, 'the request was slow enough that the injected sleep may have run');
  }
  const list = await call('GET', '/industrial-units', { token });
  for (const s of stored) {
    const marker = list.text.includes(s.id);
    const literal = s.literal ? list.text.includes(s.literal) : null;
    add(s.id + 'v', `stored text of ${s.id} ${marker ? 'found in the unit list' : 'NOT found in the unit list'}${literal === null ? '' : literal ? ', unchanged' : ', CHANGED'}`, marker && literal !== false ? 'OK' : 'INFO', list.status, list.ms);
  }

  // ---- S. Broken sync requests
  const sync = (json) => call('POST', '/sync', { token, json });
  check('S01', 'sync: empty responses list', [400], await sync({ device_id: 't', responses: [] }));
  check('S02', 'sync: responses missing', [400], await sync({ device_id: 't' }));
  check('S03', 'sync: responses is a string', [400], await sync({ device_id: 't', responses: 'x' }));
  check('S04', 'sync: responses contains null', [400, 403], await sync({ device_id: 't', responses: [null] }));
  { const s = surveyFrom('Other owner'); s.body.surveyor_id = crypto.randomUUID();
    check('S05', 'sync: survey owned by another account', [403], await sync({ device_id: 't', responses: [s.body] })); }
  check('S06', 'sync: body is plain text', [400], await call('POST', '/sync', { token, headers: { 'Content-Type': 'text/plain' }, raw: 'hello' }));
  check('S07', 'sync: body over 2 MB', [413], await sync({ device_id: 't', responses: [{ pad: 'a'.repeat(3 * 1024 * 1024) }] }));
  const mut = (fn) => { const s = surveyFrom('Broken survey'); fn(s.body); return s; };
  await syncCase('S08', 'sync: answers missing', mut((b) => { delete b.answers; }), false);
  await syncCase('S09', 'sync: question_id is SQL-looking text', mut((b) => { b.answers[0].question_id = '1 OR 1=1'; }), false);
  await syncCase('S10', 'sync: question_id not in the form', mut((b) => { b.answers[0].question_id = 999999; }), false);
  await syncCase('S11', 'sync: started_at is not a date', mut((b) => { b.started_at = 'not a date'; }), false);
  await syncCase('S12', 'sync: response_id is not a UUID', mut((b) => { b.response_id = 'not-a-uuid'; }), false);
  await syncCase('S13', 'sync: GPS latitude 999', mut((b) => { b.gps_lat = 999; }), true);
  let deep = 1;
  for (let k = 0; k < 2000; k++) deep = { a: deep };
  await syncCase('S14', 'sync: answer nested 2,000 levels deep', mut((b) => { b.answers.find((a) => a.question_id === 28).answer_value = deep; }), true);
  await syncCase('S15', 'sync: duplicate question IDs', mut((b) => { b.answers.push({ question_id: 27, answer_value: { name: 'Duplicate name' } }); }), true);

  // ---- P. Photo uploads
  const post = (form) => call('POST', '/sync/photos', { token, form });
  check('P01', 'photo: PNG file', [400], await post(photoForm({}, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]), 'image/png')));
  check('P02', 'photo: empty file', [400], await post(photoForm({}, Buffer.alloc(0))));
  check('P03', 'photo: 3.5 MB file', [400, 413], await post(photoForm({}, jpegBuf(3500))));
  check('P04', 'photo: unknown photo_type', [400], await post(photoForm({ photo_type: 'EVIL_TYPE' })));
  check('P05', 'photo: photo_id is not a UUID', [400], await post(photoForm({ photo_id: 'not-a-uuid' })));
  check('P06', 'photo: latitude missing', [400], await post(photoForm({ latitude: undefined })));
  check('P07', 'photo: accuracy 999 m', [400], await post(photoForm({ accuracy_m: '999' })));
  check('P08', 'photo: no file at all', [400], await post(photoForm({}, null)));
  check('P09', 'photo: JPEG header followed by text (not an image)', [], await post(photoForm({}, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('this is not an image')]))), true);

  // ---- Summary
  const counts = { OK: 0, INFO: 0, FINDING: 0 };
  results.forEach((r) => { counts[r.verdict] += 1; });
  console.log(`\nTotals: ${counts.OK} OK, ${counts.INFO} INFO, ${counts.FINDING} FINDING (of ${results.length} checks)`);
  const findings = results.filter((r) => r.verdict === 'FINDING');
  console.log(findings.length ? '\nFINDINGS:' : '\nNo findings.');
  findings.forEach((r) => console.log(`- ${r.id} ${r.title}: HTTP ${r.status}; ${short(r.note, 160)}`));
  const infos = results.filter((r) => r.verdict === 'INFO');
  if (infos.length) {
    console.log('\nINFO:');
    infos.forEach((r) => console.log(`- ${r.id} ${r.title}: HTTP ${r.status}; ${short(r.note, 140)}`));
  }

  const esc = (s) => String(s).replace(/\|/g, '/');
  const lines = [
    '# Injection and malformed-input test', '', `Date: ${new Date().toString()}`, '',
    `Target: ${BASE_URL} (throwaway database copy). ${results.length} checks: ${counts.OK} OK, ${counts.INFO} INFO, ${counts.FINDING} FINDING.`, '',
    '| ID | Check | Verdict | HTTP | ms | Note |', '|---|---|---|---:|---:|---|',
  ];
  results.forEach((r) => lines.push(`| ${r.id} | ${esc(r.title)} | ${r.verdict} | ${r.status} | ${r.ms} | ${esc(short(r.note, 140))} |`));
  const dir = path.join(__dirname, 'results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `injection-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`\nSaved: ${file}`);
})().catch((e) => { console.error('Test failed:', e.message); process.exit(1); });