import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createServer } from 'vite';

const form = {
  form_id: 1,
  sections: [{
    section_id: 1,
    section_code: 'A',
    title: 'Test section',
    questions: [
      {
        question_id: 1, question_code: 'A_INTERNAL_TEXT', question_text: 'Required text question',
        answer_type: 'TEXT', is_required: true, options: [],
      },
      {
        question_id: 2, question_code: 'A_INTERNAL_NUMBER', question_text: 'Optional number question',
        answer_type: 'NUMBER', is_required: false, options: [],
      },
    ],
  }],
  references: {},
};

const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: { ignored: ['**'] } },
  plugins: [{
    name: 'survey-page-test-contexts',
    enforce: 'pre',
    resolveId(source) {
      if (source === '../context/SurveyContext') return '\0test-survey-context';
      if (source === '../context/AuthContext') return '\0test-auth-context';
    },
    load(id) {
      if (id === '\0test-survey-context') {
        return `export function useSurvey() { return { form: ${JSON.stringify(form)} }; }`;
      }
      if (id === '\0test-auth-context') {
        return 'export function useAuth() { return { user: { user_id: "test-surveyor" }, registerSessionEndSave: () => () => {} }; }';
      }
    },
  }],
});
after(() => server.close());
const { default: SurveyPage } = await server.ssrLoadModule('/src/pages/SurveyPage.tsx');

function renderSurvey() {
  const router = createMemoryRouter([{ path: '/', element: React.createElement(SurveyPage) }]);
  return renderToStaticMarkup(React.createElement(RouterProvider, { router }));
}

test('question cards show prompts and required badges without internal labels', () => {
  const html = renderSurvey();
  const cards = html.split('<div class="question-card">').slice(1);

  assert.equal(cards.length, 2);
  assert.match(cards[0], /Required text question/);
  assert.match(cards[0], /class="question-mandatory">★ Required/);
  assert.match(cards[0], /type="text"/);
  assert.match(cards[1], /Optional number question/);
  assert.doesNotMatch(cards[1], /class="question-meta"|class="question-mandatory"/);
  assert.match(cards[1], /type="text" inputMode="decimal"/);
  assert.doesNotMatch(html, /A_INTERNAL_TEXT|A_INTERNAL_NUMBER|class="question-code"|>TEXT<\/span>|>NUMBER<\/span>/);
});

test('survey page does not display dashboard branding', () => {
  const html = renderSurvey();
  assert.doesNotMatch(html, /src="\/logos\/(?:punjab-industries\.png|nespak\.jpeg)"/);
});
