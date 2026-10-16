import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../ux-pro.css', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
test('Dashboard: dead hidden quick-actions block is gone (it caused false hero overlap), workflows stay reachable', () => {
  assert.doesNotMatch(html, /v19-quick/);
  assert.doesNotMatch(css, /v19-quick/);
  // The same actions remain available through the regular UI.
  assert.match(html, /id="fab"[^>]*onclick="openAddCustomer\(\)"/);
  assert.match(html, /switchTab\('calc'\)/);
  assert.match(html, /function openRecovery\(/);
  // Long customer names wrap (max 2 lines) instead of being cut with an ellipsis.
  assert.match(css, /\.cc-name\{[^}]*white-space:normal[^}]*-webkit-line-clamp:2/);
  assert.doesNotMatch(css, /\.cc-name\{[^}]*text-overflow:ellipsis/);
});
test('V19 version is a monotonic candidate release', () => {
  assert.match(pkg.version, /^19\.\d+\.\d+$/);
  assert.ok(pkg.version.localeCompare('19.5.0', undefined, { numeric: true }) > 0);
});
