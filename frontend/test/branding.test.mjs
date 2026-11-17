import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false, appType: 'custom', logLevel: 'silent',
  server: { middlewareMode: true, hmr: false, watch: { ignored: ['**'] } },
  plugins: [{
    name: 'branding-test-contexts',
    enforce: 'pre',
    resolveId(source) {
      if (source === '../context/SurveyContext') return '\0branding-survey-context';
      if (source === '../context/AuthContext') return '\0branding-auth-context';
    },
    load(id) {
      if (id === '\0branding-survey-context') {
        return 'export function useSurvey() { return { pendingCount: 0, isOnline: true }; }';
      }
      if (id === '\0branding-auth-context') {
        return 'export function useAuth() { return { user: { full_name: "Test User" }, hasPermission: () => false, isAuthenticated: false }; }';
      }
    },
  }],
});
after(() => server.close());
const { default: Layout } = await server.ssrLoadModule('/src/components/Layout.tsx');
const { default: LoginPage } = await server.ssrLoadModule('/src/pages/LoginPage.tsx');

const renderAt = (component, path) => renderToStaticMarkup(
  React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(component)),
);
const logoSources = /src="\/logos\/(?:punjab-industries\.png|nespak\.jpeg)"/g;

test('both logos appear once on the dashboard and not on other application pages', () => {
  for (const path of ['/dashboard', '/dashboard/', '/dashboard?view=all']) {
    const html = renderAt(Layout, path);
    assert.deepEqual(html.match(logoSources), [
      'src="/logos/punjab-industries.png"',
      'src="/logos/nespak.jpeg"',
    ], path);
    assert.match(html, /class="bottom-nav"/, path);
  }

  for (const path of [
    '/surveys', '/surveys/new', '/surveys/123', '/sync',
    '/supervisor', '/supervisor/units/123', '/admin', '/dashboard/child',
  ]) {
    const html = renderAt(Layout, path);
    assert.doesNotMatch(html, logoSources, path);
    assert.doesNotMatch(html, /aria-label="Punjab Industries and NESPAK"/, path);
    assert.match(html, /class="bottom-nav"/, path);
  }
});

test('the login page retains its sign-in form without the logos', () => {
  const html = renderAt(LoginPage, '/login');
  assert.doesNotMatch(html, logoSources);
  assert.match(html, /Punjab Industrial Survey/);
  assert.match(html, /<form /);
});
