import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = ['index.html','dashboard.html','customer-view.html','signup.html','forgot-password.html'];

test('all app pages load the shared locale dictionary', async () => {
  for (const page of pages) {
    const html = await readFile(new URL('../'+page, import.meta.url), 'utf8');
    assert.match(html, /src="v18-i18n\.js"/, `${page} must load locale resources`);
  }
});

test('non-dashboard pages apply saved locale to static and dynamically rendered text', async () => {
  for (const page of ['index.html','customer-view.html','signup.html','forgot-password.html']) {
    const html = await readFile(new URL('../'+page, import.meta.url), 'utf8');
    assert.match(html, /src="localize-pages\.js"/, `${page} must load shared page translator`);
  }
  const adapter = await readFile(new URL('../localize-pages.js', import.meta.url), 'utf8');
  assert.match(adapter, /localStorage\.getItem\('bsp_lang'\)/);
  assert.match(adapter, /MutationObserver/);
  assert.match(adapter, /placeholder.*aria-label.*title/);
});

test('web packaging and offline cache include the shared page translator', async () => {
  const prepare = await readFile(new URL('../scripts/prepare-web.mjs', import.meta.url), 'utf8');
  const sw = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(prepare, /'localize-pages\.js'/);
  assert.match(sw, /'\.\/localize-pages\.js'/);
});
