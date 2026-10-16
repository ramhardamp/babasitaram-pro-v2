import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');

// Regression: showTxnMenu's typeMap was keyed `Payment:` instead of `udhaar:`, so typeMap.udhaar was undefined and
// tapping ANY "given" history entry threw "Cannot read properties of undefined (reading 'bg')" (no view/edit/delete).
test('showTxnMenu typeMap has a udhaar entry for every ledger type (no undefined fallback)', () => {
  const i = html.indexOf('function showTxnMenu');
  assert.ok(i > 0);
  const body = html.slice(i, i + 1600);
  const map = body.slice(body.indexOf('const typeMap={'), body.indexOf('};', body.indexOf('const typeMap={')));
  for (const k of ['udhaar', 'jama', 'byaj_loan', 'loan_repay', 'interest_paid']) {
    assert.match(map, new RegExp('\\n\\s*' + k + ':\\{title:'), 'typeMap missing key ' + k);
  }
  assert.doesNotMatch(map, /\n\s*Payment:\{/);
});
