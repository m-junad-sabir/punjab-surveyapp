'use strict';
const autocannon = require('autocannon');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/+$/, '');
const USERNAME = process.env.TEST_USERNAME;
const PASSWORD = process.env.TEST_PASSWORD;
const DURATION = parseInt(process.env.DURATION || '15', 10);
const LEVELS = (process.env.LEVELS || '10,50,100,200').split(',').map(Number);

// Safety: only ever test this machine, never the Render/Neon deployments.
const host = new URL(BASE_URL).hostname;
if (!['localhost', '127.0.0.1'].includes(host)) {
  console.error('Refusing to run: BASE_URL must point to this machine (localhost).');
  process.exit(1);
}
if (!USERNAME || !PASSWORD) {
  console.error('Set TEST_USERNAME and TEST_PASSWORD first.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => Math.round(n * 10) / 10;

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed with HTTP ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function probe(pathname, token) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.text();
  return { status: res.status, bytes: Buffer.byteLength(body), body };
}

// Wait until the server answers quickly again, so one test's leftover
// work cannot distort the next one.
async function waitUntilIdle(token) {
  for (let attempt = 0; attempt < 120; attempt++) {
    let fast = 0;
    for (let i = 0; i < 5; i++) {
      const started = Date.now();
      try { await probe('/auth/me', token); } catch (e) { break; }
      if (Date.now() - started >= 100) break;
      fast++;
    }
    if (fast === 5) return;
    await sleep(1000);
  }
}

async function runLevel(opts, connections, duration) {
  const r = await autocannon({ ...opts, connections, duration, timeout: 10 });
  return {
    connections,
    rps: round(r.requests.average),
    avg: round(r.latency.average),
    p50: r.latency.p50,
    p99: r.latency.p99,
    max: r.latency.max,
    non2xx: r.non2xx,
    errors: r.errors,
    timeouts: r.timeouts,
    mbps: round(r.throughput.average / 1048576),
  };
}

const isClean = (r) => r.non2xx === 0 && r.errors === 0 && r.timeouts === 0 && r.p99 <= 1000;

function comfortable(rows) {
  let best = 'none';
  for (const r of rows) {
    if (!isClean(r)) break;
    best = r.connections;
  }
  return best;
}

function table(rows) {
  const head =
    '| Connections | Req/s | Avg (ms) | p50 (ms) | p99 (ms) | Max (ms) | Non-2xx | Errors | Timeouts | MB/s |\n' +
    '|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
  return head + rows.map((r) =>
    `| ${r.connections} | ${r.rps} | ${r.avg} | ${r.p50} | ${r.p99} | ${r.max} | ${r.non2xx} | ${r.errors} | ${r.timeouts} | ${r.mbps} |`
  ).join('\n');
}

(async () => {
  console.log('Logging in once to get a token...');
  const token = await login();
  const auth = { Authorization: `Bearer ${token}` };

  const list = await probe('/industrial-units', token);
  let unitId = null;
  try {
    const parsed = JSON.parse(list.body);
    const arr = Array.isArray(parsed) ? parsed : parsed.data || [];
    unitId = arr[0] && (arr[0].id || arr[0].unit_id);
  } catch (e) { /* no unit id found */ }

    const targets = [
    { name: 'GET /auth/me', path: '/auth/me' },
    { name: 'GET /industrial-units', path: '/industrial-units' },
  ];
  if (unitId) targets.push({ name: 'GET /industrial-units/:id', path: `/industrial-units/${unitId}` });
  // Heaviest endpoint goes last so its backlog cannot distort the others.
  targets.push({ name: 'GET /survey-forms/active', path: '/survey-forms/active' });

  const results = [];
  for (const t of targets) {
    const p = await probe(t.path, token);
    const entry = { name: t.name, status: p.status, bytes: p.bytes, rows: [], note: '' };
    if (p.status !== 200) {
      entry.note = `Skipped: a single test request returned HTTP ${p.status}.`;
      results.push(entry);
      continue;
    }
    for (const c of LEVELS) {
      console.log(`${t.name} at ${c} connections for ${DURATION}s...`);
      entry.rows.push(await runLevel({ url: BASE_URL + t.path, headers: auth }, c, DURATION));
      await waitUntilIdle(token);
    }
    results.push(entry);
  }

  // Login is CPU-heavy (bcrypt), so it is tested separately at low load.
  const loginRows = [];
  for (const c of [1, 5, 10]) {
    console.log(`POST /auth/login at ${c} connections for 10s...`);
    loginRows.push(await runLevel({
      url: `${BASE_URL}/auth/login`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    }, c, 10));
    await waitUntilIdle(token);
  }

  const cpus = os.cpus();
  const lines = [];
  lines.push('# API Stress Test Report', '');
  lines.push(`Date: ${new Date().toString()}`, '');
  lines.push('## Environment', '');
  lines.push(`- Target: ${BASE_URL} (local; the API and the load tool share one machine)`);
  lines.push(`- Machine: ${cpus[0].model}, ${cpus.length} logical CPUs, ${Math.round(os.totalmem() / 1073741824)} GB RAM, ${os.platform()} kernel ${os.release()}`);
  lines.push(`- Node: ${process.version}`);
  lines.push(`- Tool: autocannon; ${DURATION}s per level; connection levels: ${LEVELS.join(', ')}`);
  lines.push(`- Reads only; no data was written. Database: ${process.env.DB_NOTE || 'local copy of punjab_industrial_survey (2 industrial units)'}.`, '');
  lines.push('## Summary', '');
  lines.push('"Comfortable level" is the highest connection count with no errors, non-2xx responses or timeouts and p99 latency at or under 1000 ms.', '');
  lines.push('| Endpoint | Response size | Comfortable level (connections) |', '|---|---:|---:|');
  for (const r of results) {
    lines.push(`| ${r.name} | ${(r.bytes / 1024).toFixed(1)} KB | ${r.rows.length ? comfortable(r.rows) : 'skipped'} |`);
  }
  lines.push(`| POST /auth/login (bcrypt) | n/a | ${comfortable(loginRows)} |`, '');
  lines.push('## Detailed results', '');
  for (const r of results) {
    lines.push(`### ${r.name}`, '');
    lines.push(r.rows.length ? table(r.rows) : r.note, '');
  }
  lines.push('### POST /auth/login (password hashing, tested at low load)', '', table(loginRows), '');
  lines.push('## Notes', '');
  lines.push('- Every protected request runs one extra session-check query in the guard, so database connection limits show up early.');
  lines.push('- Results from a shared laptop show relative behaviour, not production capacity.');

  const dir = path.join(__dirname, 'results');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(dir, `report-${stamp}.md`), lines.join('\n'));
  fs.writeFileSync(path.join(dir, `raw-${stamp}.json`), JSON.stringify({ results, loginRows }, null, 2));
  console.log(`\nDone. Report saved in stress-test/results/report-${stamp}.md`);
})().catch((e) => { console.error('Stress test failed:', e.message); process.exit(1); });