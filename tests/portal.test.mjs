import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const Ledger = createRequire(import.meta.url)('../ledger.js');

// customer-view.html ka asli inline script stub DOM/Firebase mein chalta hai
const html = readFileSync(new URL('../customer-view.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(x => x.includes('function renderView'));

function boot({ search, docData }) {
  const els = {};
  const el = (id) => (els[id] ||= { id, innerHTML: '', textContent: '', classList: { s: new Set(['hidden']), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); } } });
  const reads = [];
  const ctx = {
    Ledger, console: { log() {}, warn() {}, error() {} }, alert() {}, navigator: {},
    document: { getElementById: el },
    URLSearchParams,
    window: { location: { search }, addEventListener() {} },
    firebase: { initializeApp() {}, firestore: () => ({ collection: (c) => ({ doc: (id) => ({ get: async () => { reads.push(c + '/' + id); return { exists: docData !== null, data: () => docData }; } }) }) }) },
  };
  ctx.window.document = ctx.document;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  return { ctx, els, el, reads, visible: () => ['loadingScreen', 'errorScreen', 'contentScreen'].filter(i => !el(i).classList.s.has('hidden')) };
}
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const v2 = (o = {}) => ({ schemaVersion: 2, shopName: 'Guru Shop', customerName: 'Ram', customerPhone: '9999999999', balance: 700, totalUdhaar: 100700, totalJama: 200,
  ordinaryOutstanding: 700, advance: 0, loanPrincipalOutstanding: 100000, interestOutstanding: 12000, totalOutstanding: 112700,
  upiId: 'shop@upi', transactions: [{ type: 'udhaar', amount: 700, date: '2026-07-01', note: 'x' }], shopPhone: '8888888888', ...o });

test('malformed / missing token => Firestore read hi nahi hota', async () => {
  for (const search of ['', '?token=', '?token=abc', '?token=../../users/x', '?token=' + 'A'.repeat(65)]) {
    const b = boot({ search, docData: v2() });
    await b.ctx.loadCustomerView();
    assert.deepEqual(b.reads, [], search); assert.deepEqual(b.visible(), ['errorScreen']);
  }
});
test('unknown token => error screen', async () => {
  const b = boot({ search: '?token=' + TOKEN, docData: null });
  await b.ctx.loadCustomerView(); assert.deepEqual(b.reads, ['publicViews/' + TOKEN]); assert.deepEqual(b.visible(), ['errorScreen']);
});
test('revoked token reject; expired reject; future expiry ok', async () => {
  let b = boot({ search: '?token=' + TOKEN, docData: v2({ revokedAt: { toDate: () => new Date() } }) });
  await b.ctx.loadCustomerView(); assert.deepEqual(b.visible(), ['errorScreen']);
  b = boot({ search: '?token=' + TOKEN, docData: v2({ expiresAt: new Date(Date.now() - 1000).toISOString() }) });
  await b.ctx.loadCustomerView(); assert.deepEqual(b.visible(), ['errorScreen']);
  b = boot({ search: '?token=' + TOKEN, docData: v2({ expiresAt: new Date(Date.now() + 86400000).toISOString() }) });
  await b.ctx.loadCustomerView(); assert.deepEqual(b.visible(), ['contentScreen']);
});
test('v2 portal: hero total = ordinary + loan principal + interest; sections alag', async () => {
  const b = boot({ search: '?token=' + TOKEN, docData: v2() });
  await b.ctx.loadCustomerView();
  const h = b.el('contentScreen').innerHTML;
  assert.match(h, /1,12,700/); assert.match(h, /1,00,000/); assert.match(h, /12,000/); assert.match(h, /700/);
  assert.doesNotMatch(h, /<script/i);
});
test('v2 advance only: hero advance dikhta hai, UPI card nahi', async () => {
  const b = boot({ search: '?token=' + TOKEN, docData: v2({ ordinaryOutstanding: 0, advance: 5000, loanPrincipalOutstanding: 0, interestOutstanding: 0, totalOutstanding: 0, balance: -5000 }) });
  await b.ctx.loadCustomerView();
  const h = b.el('contentScreen').innerHTML;
  assert.match(h, /5,000/); assert.doesNotMatch(h, /upi-pay-card/);
});
test('UPI amount = totalOutstanding, link validated; bad UPI id => link nahi', async () => {
  let b = boot({ search: '?token=' + TOKEN, docData: v2() });
  await b.ctx.loadCustomerView();
  assert.match(b.el('contentScreen').innerHTML, /upi:\/\/pay\?pa=shop@upi&amp;am=112700\.00&amp;cu=INR/);
  b = boot({ search: '?token=' + TOKEN, docData: v2({ upiId: 'x@y&am=1" onmouseover="alert(1)' }) });
  await b.ctx.loadCustomerView();
  assert.doesNotMatch(b.el('contentScreen').innerHTML, /upi:\/\/pay/);
});
test('XSS: customer/shop/note escaped', async () => {
  const b = boot({ search: '?token=' + TOKEN, docData: v2({ customerName: '<img src=x onerror=alert(1)>', shopName: '<b>s</b>', transactions: [{ type: 'udhaar', amount: 1, date: '2026-07-01', note: '<script>alert(1)</script>' }] }) });
  await b.ctx.loadCustomerView();
  const h = b.el('contentScreen').innerHTML;
  assert.doesNotMatch(h, /<img src=x|<script>alert|<b>s<\/b>/);
});
test('legacy payload (schemaVersion nahi) purane tareeke se render', async () => {
  const b = boot({ search: '?token=' + TOKEN, docData: { shopName: 'S', customerName: 'R', balance: 300, totalUdhaar: 500, totalJama: 200, transactions: [] } });
  await b.ctx.loadCustomerView();
  assert.deepEqual(b.visible(), ['contentScreen']); assert.match(b.el('contentScreen').innerHTML, /300/);
});
test('Ledger UPI helpers', () => {
  assert.equal(Ledger.buildUpiUrl('a.b-c@okaxis', 150.5), 'upi://pay?pa=a.b-c@okaxis&am=150.50&cu=INR');
  for (const bad of ['', 'abc', 'a@', '@b', 'a b@upi', 'a@upi&am=1', 'a@1x']) assert.equal(Ledger.buildUpiUrl(bad, 10), '', bad);
  for (const amt of [0, -5, NaN, Infinity, 'x', 1e12]) assert.equal(Ledger.buildUpiUrl('a@upi', amt), '', String(amt));
  assert.equal(Ledger.isWellFormedToken(TOKEN), true); assert.equal(Ledger.isWellFormedToken('short'), false);
});
