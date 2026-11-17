(async () => {
  const TEMPLATE_ANSWERS = [{"question_id":3,"answer_value":{"35":0,"36":0,"37":0,"38":0}},{"question_id":4,"answer_value":{"28":0,"29":0,"30":0,"31":0,"32":0,"33":0,"34":0}},{"question_id":5,"answer_value":{"1":{"choice_value_id":108},"2":{"choice_value_id":108},"3":{"choice_value_id":108},"4":{"choice_value_id":108},"5":{"choice_value_id":108},"6":{"choice_value_id":108}}},{"question_id":6,"answer_value":{"7":{"choice_value_id":111},"8":{"choice_value_id":111},"9":{"choice_value_id":111},"10":{"choice_value_id":111},"11":{"choice_value_id":111}}},{"question_id":9,"answer_value":{"71":0,"72":0,"73":0,"74":0}},{"question_id":10,"answer_value":{"64":0,"65":0,"66":0,"67":0,"68":0,"69":0,"70":0}},{"question_id":12,"answer_value":{"125":0,"126":0,"127":0,"128":0,"129":0}},{"question_id":27,"answer_value":{"name":"Stress Test Unit 001"}},{"question_id":28,"answer_value":{"establishment_year":2015}},{"question_id":30,"answer_value":{"address":"10"}},{"question_id":31,"answer_value":{"district_id":10,"tehsil_id":39}},{"question_id":33,"answer_value":{"psic_class_id":74}},{"question_id":34,"answer_value":{"zone_type_id":317}},{"question_id":35,"answer_value":{"ownership_type_id":331}},{"question_id":36,"answer_value":{"legal_structure_id":337}},{"question_id":42,"answer_value":3},{"question_id":45,"answer_value":[{"product_kind":1,"product_name":5,"daily_avg_output":10,"daily_output_unit_id":25,"annual_production":10,"annual_production_unit_id":25,"installed_capacity":5,"installed_capacity_period":1,"unit_of_measurement_id":25}]},{"question_id":46,"answer_value":[{"gender":1,"regular_count":0,"contract_count":0,"daily_wage_count":0},{"gender":2,"regular_count":0,"contract_count":0,"daily_wage_count":0},{"gender":3,"regular_count":0,"contract_count":0,"daily_wage_count":0}]},{"question_id":47,"answer_value":[{"gender":1,"skill_level_id":17,"headcount":0},{"gender":2,"skill_level_id":17,"headcount":0},{"gender":3,"skill_level_id":17,"headcount":0},{"gender":1,"skill_level_id":18,"headcount":0},{"gender":2,"skill_level_id":18,"headcount":0},{"gender":3,"skill_level_id":18,"headcount":0},{"gender":1,"skill_level_id":19,"headcount":0},{"gender":2,"skill_level_id":19,"headcount":0},{"gender":3,"skill_level_id":19,"headcount":0},{"gender":1,"skill_level_id":20,"headcount":0},{"gender":2,"skill_level_id":20,"headcount":0},{"gender":3,"skill_level_id":20,"headcount":0},{"gender":1,"skill_level_id":21,"headcount":0},{"gender":2,"skill_level_id":21,"headcount":0},{"gender":3,"skill_level_id":21,"headcount":0}]},{"question_id":68,"answer_value":{"136":0,"137":0,"138":0,"139":0}},{"question_id":78,"answer_value":{"captive_capacity_kw":0}},{"question_id":84,"answer_value":{"has_future_plan":true}},{"question_id":91,"answer_value":352},{"question_id":92,"answer_value":[{"name":"Stress Test Unit 001","designation":"Stress Test Unit 001","contact_number":"13001234567"}]},{"question_id":93,"answer_value":{"capital_investment_unit_id":414,"total_capital_investment":10}},{"question_id":94,"answer_value":true},{"question_id":95,"answer_value":true},{"question_id":96,"answer_value":true},{"question_id":97,"answer_value":true}];
  const YEAR = 10;
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
