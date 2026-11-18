import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createServer } from 'vite';

const currentYear = new Date().getFullYear();
const form = {
  form_id: 1,
  sections: [{
    section_id: 1,
    section_code: 'A',
    title: 'Identity',
    questions: [
      {
        question_id: 1, question_code: 'A_ESTABLISHMENT_YEAR', question_text: 'Year of establishment',
        answer_type: 'NUMBER', is_required: false, options: [],
        fields: [{ key: 'establishment_year', label: 'Year of establishment', type: 'YEAR', min: 1800, max: currentYear, options: [] }],
      },
    ],
  }],
  references: {},
};

const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: { ignored: ['**'] } },
  plugins: [{
    name: 'year-field-test-contexts',
    enforce: 'pre',
    resolveId(source) {
      if (source === '../context/SurveyContext') return '\0year-survey-context';
      if (source === '../context/AuthContext') return '\0year-auth-context';
    },
    load(id) {
      if (id === '\0year-survey-context') {
        return `export function useSurvey() { return { form: ${JSON.stringify(form)} }; }`;
      }
      if (id === '\0year-auth-context') {
        return 'export function useAuth() { return { user: { user_id: "test-surveyor" }, registerSessionEndSave: () => () => {} }; }';
      }
    },
  }],
});
after(() => server.close());
const { default: SurveyPage } = await server.ssrLoadModule('/src/pages/SurveyPage.tsx');

test('the Year of establishment field renders a year picker trigger, not a date or number input', () => {
  const router = createMemoryRouter([{ path: '/', element: React.createElement(SurveyPage) }]);
  const html = renderToStaticMarkup(React.createElement(RouterProvider, { router }));
  const card = html.split('<div class="question-card">').slice(1)[0];

  assert.ok(card, 'the establishment-year question card is rendered');
  assert.match(card, /Select year/);
  assert.doesNotMatch(card, /type="date"/);
  assert.doesNotMatch(card, /type="number"/);
});
