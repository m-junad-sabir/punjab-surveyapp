'use strict';
const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/+$/, '');
const USERNAME = process.env.TEST_USERNAME;
const PASSWORD = process.env.TEST_PASSWORD;
const DURATION = parseInt(process.env.DURATION || '15', 10);
const LEVELS = (process.env.LEVELS || '10,50,100,200').split(',').map(Number);

if (!['localhost', '127.0.0.1'].includes(new URL(BASE_URL).hostname)) {
  console.error('Refusing to run: BASE_URL must point to this machine (localhost).');
  process.exit(1);
}
if (!USERNAME || !PASSWORD) { console.error('Set TEST_USERNAME and TEST_PASSWORD first.'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => Math.round(n * 10) / 10;

const http = require('http');
function rawGet(urlStr, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = http.get({ hostname: u.hostname, port: u.port, path: u.pathname, headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
  });
}

(async () => {
  const login = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!login.ok) { console.error(`Login failed with HTTP ${login.status}`); process.exit(1); }
  const token = (await login.json()).access_token;
  const url = `${BASE_URL}/survey-forms/active`;

  const first = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  await first.arrayBuffer();
  const etag = first.headers.get('etag');
  if (!etag) { console.error('The server sent no ETag header, so a conditional test is not possible.'); process.exit(1); }
  const checkStatus = await rawGet(url, { Authorization: `Bearer ${token}`, 'If-None-Match': etag });
  console.log(`Sanity check: HTTP ${checkStatus} (expected 304)`);
  if (checkStatus !== 304) { console.error('The server did not answer 304, stopping.'); process.exit(1); }

  const headers = { Authorization: `Bearer ${token}`, 'If-None-Match': etag };
  const rows = [];
  for (const c of LEVELS) {
    console.log(`GET /survey-forms/active (cached copy) at ${c} connections for ${DURATION}s...`);
    const r = await autocannon({ url, headers, connections: c, duration: DURATION, timeout: 10 });
    rows.push({
      c, rps: round(r.requests.average), avg: round(r.latency.average), p50: r.latency.p50,
      p99: r.latency.p99, max: r.latency.max, notModified: r['3xx'], bad: r['4xx'] + r['5xx'],
      errors: r.errors, timeouts: r.timeouts,
    });
    await sleep(3000);
  }

  const lines = ['# Form download test, returning devices (conditional request)', '',
    `Date: ${new Date().toString()}`, '',
    'Each request sends the form\'s ETag in `If-None-Match`, like an app that already holds the current form. The server should answer 304 with no body.', '',
    '| Connections | Req/s | Avg (ms) | p50 (ms) | p99 (ms) | Max (ms) | 304 replies | 4xx/5xx | Errors | Timeouts |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const r of rows) lines.push(`| ${r.c} | ${r.rps} | ${r.avg} | ${r.p50} | ${r.p99} | ${r.max} | ${r.notModified} | ${r.bad} | ${r.errors} | ${r.timeouts} |`);
  const dir = path.join(__dirname, 'results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `form-conditional-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  fs.writeFileSync(file, lines.join('\n'));
  console.log('\n' + lines.join('\n'));
  console.log(`\nSaved: ${file}`);
})().catch((e) => { console.error('Test failed:', e.message); process.exit(1); });