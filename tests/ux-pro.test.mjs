import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const U = require('../ux-pro.js');
const dash = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const prep = readFileSync(new URL('../scripts/prepare-web.mjs', import.meta.url), 'utf8');
const dayOf = tx => tx.d;
const now = new Date(2026, 9, 11);

test('UX-PRO: statement period presets', () => {
  assert.deepEqual(U.periodPreset('month', now), { from: '2026-10-01', to: '2026-10-11' });
  assert.deepEqual(U.periodPreset('last30', now), { from: '2026-09-12', to: '2026-10-11' });
  assert.deepEqual(U.periodPreset('lastmonth', now), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(U.periodPreset('all', now), { from: '', to: '' });
});
test('UX-PRO: validRange rejects reversed / malformed dates', () => {
  assert.equal(U.validRange({ from: '2026-10-05', to: '2026-10-01' }), false);
  assert.equal(U.validRange({ from: '2026-13-01', to: '2026-13-02' }), false);
  assert.equal(U.validRange({ from: '', to: '' }), true);
  assert.equal(U.validRange({ from: '2026-10-01', to: '2026-10-11' }), true);
});
test('UX-PRO: periodTotals splits payments vs credits, ignores deleted, honours range', () => {
  const tx = [
    { type: 'udhaar', amount: 500, d: '2026-10-02' }, { type: 'jama', amount: 200, d: '2026-10-03' },
    { type: 'byaj_loan', principal: 1000, d: '2026-10-04' }, { type: 'loan_repay', amount: 300, d: '2026-10-05' },
    { type: 'interest_paid', amount: 40, d: '2026-10-06' }, { type: 'jama', amount: 999, d: '2026-10-07', status: 'deleted' },
    { type: 'udhaar', amount: 70, d: '2026-09-01' }];
  const r = U.periodTotals(tx, dayOf, { from: '2026-10-01', to: '2026-10-31' });
  assert.equal(r.credits, 1500); assert.equal(r.payments, 540); assert.equal(r.creditCount, 2); assert.equal(r.paymentCount, 3);
  assert.equal(U.periodTotals(tx, dayOf, { from: '', to: '' }).credits, 1570);
});
test('UX-PRO: collectionTrend compares last 7 days with the 7 before', () => {
  const tx = [{ type: 'jama', amount: 300, d: '2026-10-10' }, { type: 'jama', amount: 100, d: '2026-10-02' }, { type: 'udhaar', amount: 900, d: '2026-10-10' }];
  const r = U.collectionTrend(tx, dayOf, now);
  assert.equal(r.current, 300); assert.equal(r.previous, 100); assert.equal(r.pct, 200);
  assert.equal(U.collectionTrend([], dayOf, now).pct, null);
});
test('UX-PRO: backupStale', () => {
  assert.equal(U.backupStale(0, Date.now(), 7), true);
  assert.equal(U.backupStale(Date.now() - 86400000, Date.now(), 7), false);
  assert.equal(U.backupStale(Date.now() - 8 * 86400000, Date.now(), 7), true);
});
test('UX-PRO: files are wired into dashboard, service worker and web packaging', () => {
  for (const f of ['errlog.js', 'ux-pro.js', 'ux-pro.css']) {
    assert.ok(dash.includes(f), f + ' dashboard me');
    assert.ok(sw.includes('./' + f), f + ' service worker SHELL me');
    assert.ok(prep.includes("'" + f + "'"), f + ' prepare-web me');
  }
});
test('UX-PRO: statement export ab range leta hai (prompt sirf fallback), original signature preserved', () => {
  assert.ok(dash.includes('function exportCustomerStatementPdf(id,range)'));
  assert.ok(dash.includes('if(range&&typeof range===\'object\')'));
  assert.ok(dash.includes("bsp_lastBackup"));
});
test('UX-PRO: Remind Defaulters bar pending hone par dikhta hai', () => {
  assert.ok(dash.includes("t('Remind Defaulters'"));
});
