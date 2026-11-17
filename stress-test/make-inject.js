'use strict';
// Builds browser-inject.js: a snippet to paste into Chrome's Console.
// The snippet adds ONE complete, ready-to-sync survey (with two photos) to the browser's own storage.
const fs = require('fs');
const path = require('path');

const tpl = JSON.parse(fs.readFileSync(path.join(__dirname, 'template-draft.json'), 'utf8'));
const answers = tpl.answers.filter((a) => a.question_id !== 87 && a.question_id !== 88);
const year = process.env.YEAR ? Number(process.env.YEAR) : null;
const outName = process.env.OUT || 'browser-inject.js';

const code = `(async () => {
  const TEMPLATE_ANSWERS = ${JSON.stringify(answers)};
  const YEAR = ${year === null ? 'null' : String(year)};
  const Q_INTERVIEW = 87;
  const Q_SIGNBOARD = 88;
  const openDb = () => new Promise((res, rej) => {
    const r = indexedDB.open('survey-pwa');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const db = await openDb();
  const readAll = (store) => new Promise((res, rej) => {
    const q = db.transaction(store).objectStore(store).getAll();
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
  const drafts = await readAll('offline_responses');
  if (!drafts.length) throw new Error('No saved survey found. Save a draft first, so the account ID can be copied from it.');
  const base = drafts[0];
  const owner = base.surveyor_id;
  const makeJpeg = (label) => new Promise((res, rej) => {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 800;
    const g = c.getContext('2d');
    g.fillStyle = '#35516b'; g.fillRect(0, 0, 1200, 800);
    g.fillStyle = '#ffffff'; g.font = '48px sans-serif';
    g.fillText(label, 60, 120);
    g.fillText(new Date().toISOString(), 60, 200);
    c.toBlob((b) => (b ? res(b) : rej(new Error('JPEG encoding failed'))), 'image/jpeg', 0.75);
  });
  const stamp = String(Date.now()).slice(-6);
  const responseId = crypto.randomUUID();
  const capturedAt = new Date().toISOString();
  const lat = 30.1 + (Math.floor(Date.now() / 1000) % 500) * 0.001;
  const lng = 71.4;
  const photos = [
    { id: crypto.randomUUID(), type: 'L_PHOTO_INTERVIEW_SESSION', q: Q_INTERVIEW },
    { id: crypto.randomUUID(), type: 'L_PHOTO_ENTRANCE_SIGNBOARD', q: Q_SIGNBOARD },
  ];
  const blobs = await Promise.all(photos.map((p) => makeJpeg('Test photo ' + p.type + ' ' + stamp)));
  const answers = JSON.parse(JSON.stringify(TEMPLATE_ANSWERS)).map((a) => {
    if (a.question_id === 27) a.answer_value = Object.assign({}, a.answer_value, { name: 'Offline Sync Test ' + stamp });
    if (a.question_id === 92) a.answer_value = a.answer_value.map((x) => Object.assign({}, x, { name: 'Offline Tester ' + stamp }));
    if (a.question_id === 28 && YEAR !== null) a.answer_value = Object.assign({}, a.answer_value, { establishment_year: YEAR });
    return a;
  });
  photos.forEach((p) => answers.push({ question_id: p.q, answer_value: { photo_id: p.id, photo_type: p.type, latitude: lat, longitude: lng, accuracy_m: 12, captured_at: capturedAt } }));
  const tx = db.transaction(['photos', 'offline_responses'], 'readwrite');
  photos.forEach((p, i) => tx.objectStore('photos').put({ photo_id: p.id, response_id: responseId, owner_id: owner, photo_type: p.type, blob: blobs[i], mime_type: 'image/jpeg', size_bytes: blobs[i].size, latitude: lat, longitude: lng, accuracy_m: 12, captured_at: capturedAt }));
  tx.objectStore('offline_responses').put({ response_id: responseId, form_id: base.form_id, surveyor_id: owner, device_id: base.device_id, gps_lat: lat, gps_lng: lng, gps_accuracy_m: 12, started_at: new Date(Date.now() - 600000).toISOString(), submitted_at: capturedAt, answers: answers, sync_status: 'pending_sync', created_at: capturedAt });
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  console.log('Added survey', responseId, 'named Offline Sync Test ' + stamp, 'for account', owner, 'with', answers.length, 'answers and 2 photos (' + blobs.map((b) => Math.round(b.size / 1024) + ' KB').join(', ') + '). Status: pending_sync.');
})();
`;

fs.writeFileSync(path.join(__dirname, outName), code);
console.log('Wrote ' + outName + ' (' + code.length + ' characters, ' + answers.length + ' template answers).');