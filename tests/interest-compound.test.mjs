import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../ledger.js');
const base = { principal: 43309, rate: 2, startDate: '2026-06-02', status: 'active', repayments: [], interestPaid: 0 };
const asOf = new Date(2026, 9, 12);
const comp = (o) => L.calculateLoanState({ ...base, interestType: 'compound', compoundFreq: 'monthly', ...o }, [], asOf);

test('COMPOUND: monthly 2%/mo on 43,309 (2 Jun -> 12 Oct 2026) = reference app ke numbers', () => {
  const s = comp({});
  assert.deepEqual(s.schedule.map(r => r.running), [866.18, 1749.68, 2650.86, 3570.05, 3882.58]);
  assert.deepEqual(s.schedule.map(r => r.amount), [866.18, 883.5, 901.18, 919.19, 312.53]);
  assert.equal(s.schedule.at(-1).current, true);
  assert.equal(s.interestAccrued, 3883); assert.equal(s.totalOutstanding, 47192); assert.equal(s.mode, 'compound');
});
test('COMPOUND: frequency badhne par byaj ghatta hai (daily >= monthly >= quarterly >= half-yearly >= yearly)', () => {
  const v = ['daily', 'monthly', 'quarterly', 'halfyearly', 'yearly'].map(f => comp({ compoundFreq: f }).interestAccrued);
  for (let i = 1; i < v.length; i++) assert.ok(v[i - 1] >= v[i], v.join(','));
});
test('COMPOUND: 24%/year == 2%/month', () => {
  assert.equal(comp({ rate: 24, rateUnit: 'year' }).interestAccrued, comp({}).interestAccrued);
});
test('COMPOUND: principal repayment base ghatata hai, outstanding formula sahi', () => {
  const full = comp({}), part = comp({ repayments: [{ amount: 10000, date: '2026-08-02' }] });
  assert.equal(part.principalOutstanding, 33309); assert.ok(part.interestAccrued < full.interestAccrued);
  assert.equal(part.totalOutstanding, part.principalOutstanding + part.interestOutstanding);
});
test('COMPOUND: interest_paid sirf outstanding ghatata hai', () => {
  const s = comp({ interestPaid: 1000 });
  assert.equal(s.interestAccrued, 3883); assert.equal(s.interestOutstanding, 2883);
});
test('COMPOUND: future start date par byaj 0', () => {
  assert.equal(comp({ startDate: '2026-12-01' }).interestAccrued, 0);
});
test('LEGACY: purane loan (interestType nahi) ka number nahi badla; per-year sirf naye loans', () => {
  const o = L.calculateLoanState(base, [], asOf);
  assert.equal(o.mode, 'legacy'); assert.equal(o.interestAccrued, 3744); assert.equal(o.schedule, undefined);
  const y = L.calculateLoanState({ ...base, rate: 24, rateUnit: 'year' }, [], asOf);
  assert.equal(y.interestAccrued, 3744);
});

test('COMPOUND: "Interest on part-payments" ON (default) vs OFF', () => {
  const reps = [{ amount: 10000, date: '2026-08-02' }];
  const on = comp({ repayments: reps }), off = comp({ repayments: reps, partPaymentInterest: false });
  assert.equal(on.partPaymentInterest, true); assert.equal(off.partPaymentInterest, false);
  assert.equal(off.interestAccrued, comp({}).interestAccrued, 'OFF: byaj poore principal par (repayment se asar nahi)');
  assert.ok(on.interestAccrued < off.interestAccrued);
  assert.equal(on.interestSaved, off.interestAccrued - on.interestAccrued); assert.equal(off.interestSaved, 0);
  assert.equal(off.principalOutstanding, 33309); assert.equal(off.totalOutstanding, 33309 + off.interestOutstanding);
  assert.equal(comp({}).interestSaved, 0);
});

test('SETTLE: hath se settle kiya loan (settled:true) balance me nahi ginta, unsettle par wapas', () => {
  const loan = { id: 'l1', loanId: 'l1', type: 'byaj_loan', principal: 20000, rate: 2, startDate: '2026-07-01', status: 'closed', settled: true, repayments: [], interestPaid: 0 };
  for (const mode of ['legacy', 'timeline']) {
    assert.equal(L.customerState([loan], asOf, { mode }).loanOutstanding, 0, mode);
    const back = L.customerState([{ ...loan, status: 'active', settled: false }], asOf, { mode });
    assert.ok(back.loanOutstanding > 20000, mode);
  }
});

// ---- Reference calculator ke formule se mel (naye simple loans = cal30, per-6-months dar) ----
const refTP = (s, e) => { const d = [31,28,31,30,31,30,31,31,30,31,30,31]; const y = e.getFullYear(); if (y % 400 === 0 || (y % 100 !== 0 && y % 4 === 0)) d[1]++;
  let n = 0, a = 0, o = 0, r = 0; if (e.getDate() >= s.getDate()) o = e.getDate() - s.getDate(); else { o = d[e.getMonth() > 0 ? e.getMonth() - 1 : 11] - s.getDate() + e.getDate(); n++; }
  if (e.getMonth() - n >= s.getMonth()) r = e.getMonth() - n - s.getMonth(); else { r = 12 - s.getMonth() + (e.getMonth() - n); a++; }
  return { year: e.getFullYear() - s.getFullYear() - a, month: r, day: o }; };
const refSimple = (P, rm, tp) => P * rm * (12 * tp.year + tp.month + tp.day / 30) / 100;
const refCompound = (P, rm, tp, half) => { let e = rm, n = tp.year + tp.month / 12 + tp.day / 360; if (half) { e /= 2; n *= 2; }
  const w = Math.floor(n + 1e-12), f = n - w; return P * Math.pow(1 + 12 * e / 100, w) * (1 + f * e * 12 / 100) - P; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('REF: naya simple loan (cal30) = P x rate x (12y+m+d/30) / 100', () => {
  const s = new Date(2026, 5, 2), e = new Date(2026, 9, 12);
  const st = L.calculateLoanState({ ...base, simpleMethod: 'cal30' }, [], e);
  assert.equal(st.interestAccrued, Math.round(refSimple(43309, 2, refTP(s, e)))); assert.equal(st.interestAccrued, 3753);
});
test('REF: purana simple loan (simpleMethod nahi) ka number nahi badla (3744)', () => {
  assert.equal(L.calculateLoanState(base, [], asOf).interestAccrued, 3744);
});
test('REF: 600 random cases - simple(cal30), yearly aur half-yearly compound reference formule se +-1 rupee ke andar', () => {
  let seed = 12345; const rnd = (a, b) => { seed = (seed * 1103515245 + 12345) % 2147483648; return a + (seed % (b - a + 1)); };
  for (let i = 0; i < 600; i++) {
    const P = rnd(1000, 500000), rate = [1, 1.5, 2, 2.5, 3, 5][rnd(0, 5)];
    const s = new Date(rnd(2022, 2025), rnd(0, 11), rnd(1, 28)), e = new Date(s.getTime() + rnd(5, 1500) * 86400000), tp = refTP(s, e);
    const b = { principal: P, rate, startDate: iso(s), status: 'active', repayments: [], interestPaid: 0 };
    assert.ok(Math.abs(L.calculateLoanState({ ...b, simpleMethod: 'cal30' }, [], e).interestAccrued - refSimple(P, rate, tp)) <= 1, 'simple');
    assert.ok(Math.abs(L.calculateLoanState({ ...b, interestType: 'compound', compoundFreq: 'yearly' }, [], e).interestAccrued - refCompound(P, rate, tp, false)) <= 1, 'yearly');
    assert.ok(Math.abs(L.calculateLoanState({ ...b, interestType: 'compound', compoundFreq: 'halfyearly' }, [], e).interestAccrued - refCompound(P, rate, tp, true)) <= 1, 'halfyearly');
  }
});
test('REF: dar "per 6 months" = dar/6 per month (12% / 6 mahine == 2% / mahina)', () => {
  const a = L.calculateLoanState({ ...base, rate: 12, rateUnit: 'halfyear', simpleMethod: 'cal30' }, [], asOf).interestAccrued;
  const b = L.calculateLoanState({ ...base, rate: 2, simpleMethod: 'cal30' }, [], asOf).interestAccrued;
  assert.equal(a, b);
  assert.equal(comp({ rate: 12, rateUnit: 'halfyear' }).interestAccrued, comp({}).interestAccrued);
});
