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
  changeProductKind,
  clearProductNames,
  isProductFieldVisible,
  isProductNameComplete,
  productOptionsForRow,
  productRowsError,
  productUnitsForDisplay,
  productUnitValueForDisplay,
  productValueForDisplay,
} = await server.ssrLoadModule('/src/lib/sectionCProducts.ts');
const { clearHiddenAnswers } = await server.ssrLoadModule('/src/lib/surveyVisibility.ts');

const products = [
  { id: 0, code: 'OTHER', label: 'Other (specify)', requires_text: true, parent_id: null, product_kind: null, is_selectable: true },
  { id: 101, code: '101', label: 'Sugar', requires_text: false, parent_id: 10, product_kind: 'MAIN', is_selectable: true },
  { id: 102, code: '102', label: 'Bagasse', requires_text: false, parent_id: 10, product_kind: 'SECONDARY', is_selectable: true },
  { id: 103, code: '103', label: 'Inactive', requires_text: false, parent_id: 10, product_kind: 'MAIN', is_selectable: false },
  { id: 201, code: '201', label: 'Wood', requires_text: false, parent_id: 20, product_kind: 'MAIN', is_selectable: true },
];
const units = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: index + 1, code: `UNIT_${index + 1}`, label: `Approved unit ${index + 1}`,
    requires_text: false, is_selectable: true,
  })),
  { id: 99, code: 'TON', label: 'Legacy ton', requires_text: false, is_selectable: false },
];

test('migration seeds the exact approved units and both complete L2 lists', async () => {
  const [migration, industriesSql, unitList, mainList, secondaryList] = await Promise.all([
    readFile(new URL('../../database/migration_10_section_c_products.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../database/migration_07_type_of_unit.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../documentation/Lists/products-unit-list.md', import.meta.url), 'utf8'),
    readFile(new URL('../../documentation/Lists/l2-list-industry-to-main-products.md', import.meta.url), 'utf8'),
    readFile(new URL('../../documentation/Lists/L2-list-industry-to-secondary-products.md', import.meta.url), 'utf8'),
  ]);
  const approvedUnits = unitList.split('## Suggested minimum dropdown for a first release')[1]
    .split('## Important distinction')[0]
    .match(/^- .+$/gm).map((line) => line.slice(2));
  const unitBlock = migration.match(/INSERT INTO phase4_product_unit_seed VALUES([\s\S]*?);/)[1];
  const seededUnits = [...unitBlock.matchAll(/\('([A-Z0-9]+)', '([^']+)', '(AREA|QUANTITY)', (?:U&)?'([^']+)', (\d+)\)/g)]
    .map((match) => ({
      code: match[1],
      label: match[4].replace(/\\00B2/g, '²').replace(/\\00B3/g, '³'),
      order: Number(match[5]),
    }));
  assert.equal(approvedUnits.length, 15);
  assert.deepEqual(seededUnits.map((unit) => unit.label), approvedUnits);
  assert.deepEqual(seededUnits.map((unit) => unit.code), [
    'PC', 'UNIT', 'KG', 'TONNE', 'G', 'L', 'ML', 'M3', 'M', 'SQM', 'SQFT', 'ROLL', 'SHEET', 'SET', 'PACK',
  ]);
  assert.deepEqual(seededUnits.map((unit) => unit.order), Array.from({ length: 15 }, (_, index) => index + 1));

  const industries = new Map([...industriesSql.matchAll(/^\s*\((\d+),'([^']+)','([^']+)',ARRAY/gm)]
    .map((match) => [Number(match[1]), { code: match[2], label: match[3] }]));
  const expected = [];
  for (const [source, kind, count] of [[mainList, 'MAIN', 101], [secondaryList, 'SECONDARY', 236]]) {
    const counters = new Map();
    const rows = [...source.matchAll(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)];
    assert.equal(rows.length, count);
    for (const match of rows) {
      const industry = industries.get(Number(match[1]));
      assert.equal(industry?.label, match[2].trim());
      const order = (counters.get(industry.code) ?? 0) + 1;
      counters.set(industry.code, order);
      expected.push([industry.code, kind, match[3].trim(), order]);
    }
    assert.equal(counters.size, 60);
  }
  const seededProducts = [...migration.matchAll(/^\s*\('([A-Z0-9_]+)', '(MAIN|SECONDARY)', '((?:[^']|'')*)', (\d+)\)[,;]/gm)]
    .map((match) => [match[1], match[2], match[3].replace(/''/g, "'"), Number(match[4])]);
  assert.deepEqual(seededProducts, expected);
  assert.doesNotMatch(migration, /PRODUCT_CATALOG_DATA/);
  assert.match(migration, /products_secondary_main_fields_check[\s\S]+NOT VALID/);
  assert.match(migration, /product_stages_main_product_fk[\s\S]+NOT VALID/);
});

test('product and unit choices filter by industry and kind while preserving old selections', () => {
  assert.deepEqual(productOptionsForRow(products, 10, 1, null).map((option) => option.id), [0, 101]);
  assert.deepEqual(productOptionsForRow(products, 10, 'SECONDARY', null).map((option) => option.id), [0, 102]);
  assert.deepEqual(productOptionsForRow(products, 20, 1, null).map((option) => option.id), [0, 201]);
  assert.deepEqual(productOptionsForRow(products, 61, 1, null).map((option) => option.id), [0]);
  assert.deepEqual(productOptionsForRow(products, null, null, null).map((option) => option.id), [0]);
  const previous = productOptionsForRow(products, 10, 1, 201).find((option) => option.id === 201);
  assert.equal(previous.is_selectable, false);
  assert.match(previous.label, /previously selected/);
  const mainOptions = productOptionsForRow(products, 10, 1, null);
  assert.equal(productValueForDisplay(' sugar ', mainOptions), 101);
  assert.deepEqual(productValueForDisplay('Historic product', mainOptions), {
    option_id: 0, other_text: 'Historic product',
  });
  assert.deepEqual(productValueForDisplay({ option_id: '0', other_text: 'Legacy Other' }, mainOptions), {
    option_id: 0, other_text: 'Legacy Other',
  });
  assert.equal(productUnitValueForDisplay('99'), 99);
  assert.deepEqual(productUnitsForDisplay(units, null).map((option) => option.id), units.slice(0, 15).map((unit) => unit.id));
  const withLegacy = productUnitsForDisplay(units, 99);
  assert.equal(withLegacy.length, 16);
  assert.equal(withLegacy[15].is_selectable, false);
  assert.match(withLegacy[15].label, /Legacy ton.*previously selected/);
});

test('Other text, legacy values, and invalid selections are validated consistently', () => {
  assert.equal(productRowsError([{ product_kind: 1, product_name: 101, daily_output_unit_id: 1 }], 10, products, units), null);
  assert.equal(productRowsError([{ product_kind: 2, product_name: { option_id: 0, other_text: 'Custom product' } }], 10, products, units), null);
  assert.equal(productRowsError([{ product_kind: 'MAIN', product_name: 'Historic name', unit_of_measurement_id: 99 }], null, products, units), null);
  assert.equal(productRowsError([{ product_kind: 2, product_name: { option_id: 0, other_text: ' ' } }], 10, products, units), 'Specify the other product name.');
  assert.equal(productRowsError([{ product_kind: 1, product_name: 102 }], 10, products, units), 'Choose a product belonging to the selected Type of Unit and product kind.');
  assert.equal(productRowsError([{ product_kind: 1, product_name: 103 }], 10, products, units), 'Choose a product belonging to the selected Type of Unit and product kind.');
  assert.equal(productRowsError([{ product_kind: 1, product_name: 101 }], null, products, units), 'Select a Type of Unit before choosing a product.');
  assert.equal(productRowsError([{ product_kind: 1, product_name: 'Legacy', daily_output_unit_id: 404 }], 10, products, units), 'Choose a valid product measurement unit.');
  assert.equal(productRowsError([null], 10, products, units), 'Provide valid product rows.');
  assert.equal(isProductNameComplete({ option_id: 0, other_text: '' }), false);
  assert.equal(isProductNameComplete({ option_id: 0, other_text: 'Custom' }), true);
});

test('draft cleanup and controller changes remove stale fields without mutating old answers', () => {
  const original = {
    product_kind: 1, product_name: 101, daily_avg_output: 10,
    transformation_stage_ids: [31], revenue_share_pct: 25, hs_code_id: 50, hs_code_text: 'old',
  };
  assert.deepEqual(changeProductKind(original, 2), { product_kind: 2, daily_avg_output: 10 });
  assert.deepEqual(changeProductKind({ product_name: 'Old name' }, 1), { product_name: 'Old name', product_kind: 1 });
  assert.deepEqual(clearProductNames([original]), [{
    product_kind: 1, daily_avg_output: 10, transformation_stage_ids: [31],
    revenue_share_pct: 25, hs_code_id: 50, hs_code_text: 'old',
  }]);
  const secondary = { ...original, product_kind: 'SECONDARY' };
  const answers = { 7: [secondary] };
  const cleaned = clearHiddenAnswers([{ question_id: 7, question_code: 'C_PRODUCTS', options: [] }], answers);
  assert.deepEqual(cleaned[7], [{ product_kind: 'SECONDARY', product_name: 101, daily_avg_output: 10 }]);
  assert.deepEqual(answers[7][0], secondary);
  assert.equal(isProductFieldVisible('C_PRODUCTS', secondary, 'hs_code_id'), false);
  assert.equal(isProductFieldVisible('C_PRODUCTS', original, 'hs_code_id'), true);
});

test('generated PDF shows main-only fields for main products, not secondary products', async (t) => {
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

  const question = {
    question_id: 7, question_code: 'C_PRODUCTS', question_no: '-', question_text: 'Products',
    answer_type: 'REPEATING_GROUP', repeatable: true, options: [],
    fields: [
      { key: 'product_kind', label: 'Product kind', options: [{ id: 1, label: 'Main' }, { id: 2, label: 'Secondary' }] },
      { key: 'product_name', label: 'Product name', reference: 'industry_products', options: products },
      { key: 'unit_of_measurement_id', label: 'Capacity unit', reference: 'product_units', options: units },
      { key: 'transformation_stage_ids', label: 'Transformation stage', options: [{ id: 31, label: 'Main stage' }, { id: 32, label: 'Secondary stale stage' }] },
      { key: 'revenue_share_pct', label: 'Revenue share', options: [] },
      { key: 'hs_code_id', label: 'HS code', reference: 'hs_codes', options: [] },
    ],
  };
  const form = {
    references: { hs_codes: [{ id: 50, label: '1701 - Main sugar code' }, { id: 51, label: 'Secondary stale HS code' }] },
    sections: [{ section_code: 'C', title: 'Products', questions: [question] }],
  };
  const response = {
    response_id: 'response-id', surveyor_id: 'surveyor-id', sync_status: 'draft',
    started_at: '2026-01-01T00:00:00.000Z',
    answers: [{ question_id: 7, answer_value: [
      { product_kind: 1, product_name: { option_id: '0', other_text: 'Custom main product' }, unit_of_measurement_id: 1,
        transformation_stage_ids: [31], revenue_share_pct: 42, hs_code_id: 50 },
      { product_kind: 'SECONDARY', product_name: 'Historic by-product', unit_of_measurement_id: '99',
        transformation_stage_ids: [32], revenue_share_pct: 99, hs_code_id: 51 },
    ] }],
  };
  const { downloadSurveyPdf } = await server.ssrLoadModule('/src/lib/surveyPdf.ts');
  await downloadSurveyPdf(response, form);
  const pdf = captures[0];
  assert.ok(pdf.includes('Custom main product'));
  assert.ok(pdf.includes('Other \\(specify\\)'));
  assert.ok(pdf.includes('Historic by-product'));
  assert.ok(pdf.includes('Secondary'));
  assert.ok(pdf.includes('Legacy ton'));
  assert.ok(pdf.includes('Main stage'));
  assert.ok(pdf.includes('1701 - Main sugar code'));
  assert.ok(!pdf.includes('Secondary stale stage'));
  assert.ok(!pdf.includes('Secondary stale HS code'));
  assert.equal((pdf.match(/Transformation stage/g) ?? []).length, 1);
  assert.equal((pdf.match(/Revenue share/g) ?? []).length, 1);
  assert.equal((pdf.match(/HS code/g) ?? []).length, 1);
});
