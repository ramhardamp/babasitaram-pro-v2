import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const IC = require('../interest-calc.js');
const L = require('../ledger.js');
const near = (a, b, eps = 0.011) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
const man = (o) => IC.calculate({ periodType: 'manual', years: 0, months: 0, days: 0, ...o });

/* ===== SIMPLE ===== */
test('SIMPLE: 10,000 @ 2%/mo, 1 saal = 2,400', () => {
  const r = man({ principal: 10000, rate: 2, rateUnit: 'month', years: 1 });
  assert.equal(r.interest, 2400); assert.equal(r.total, 12400); assert.equal(r.mode, 'simple');
});
test('SIMPLE: mahina+din (5,000 @ 2%/mo, 1y 2m 15d = 14.5 mahine = 1,450)', () => {
  const r = man({ principal: 5000, rate: 2, years: 1, months: 2, days: 15 });
  assert.equal(r.interest, 1450); near(r.months, 14.5, 1e-9);
});
test('SIMPLE: dar ki ikai - 24%/saal == 12%/chhamahi == 2%/mahina', () => {
  const a = man({ principal: 10000, rate: 2, years: 1 }).interest;
  assert.equal(man({ principal: 10000, rate: 24, rateUnit: 'year', years: 1 }).interest, a);
  assert.equal(man({ principal: 10000, rate: 12, rateUnit: 'halfyear', years: 1 }).interest, a);
});
test('SIMPLE: din >= 30 manual me mahine me judte hain (45 din = 1.5 mahina)', () => {
  const r = man({ principal: 1000, rate: 2, days: 45 });
  assert.equal(r.interest, 30); assert.deepEqual([r.period.years, r.period.months, r.period.days], [0, 1, 15]);
});
test('SIMPLE dates (cal30): loan card (ledger) se same number', () => {
  const r = IC.calculate({ principal: 43309, rate: 2, startDate: '2026-06-02', endDate: '2026-10-12' });
  const s = L.calculateLoanState({ principal: 43309, rate: 2, startDate: '2026-06-02', simpleMethod: 'cal30', interestType: 'simple', status: 'active', repayments: [], interestPaid: 0 }, [], new Date(2026, 9, 12), { mode: 'timeline' });
  assert.equal(Math.round(r.interest), s.interestAccrued);
});

/* ===== COMPOUND ===== */
test('COMPOUND dates monthly: 43,309 @ 2%/mo, 2 Jun -> 12 Oct 2026 = 3,882.58 (ledger/reference)', () => {
  const r = IC.calculate({ mode: 'compound', compoundFreq: 'monthly', principal: 43309, rate: 2, startDate: '2026-06-02', endDate: '2026-10-12' });
  assert.equal(r.interest, 3882.58); assert.equal(r.total, 47191.58);
  assert.deepEqual(r.schedule.map(x => x.running), [866.18, 1749.68, 2650.86, 3570.05, 3882.58]);
  assert.equal(r.schedule.at(-1).current, true);
});
test('COMPOUND yearly (manual): 1,000 @ 12%/saal -> 1 saal 120, 2 saal 254.40', () => {
  const o = { mode: 'compound', compoundFreq: 'yearly', principal: 1000, rate: 12, rateUnit: 'year' };
  assert.equal(man({ ...o, years: 1 }).interest, 120);
  assert.equal(man({ ...o, years: 2 }).interest, 254.4);
});
test('COMPOUND: adhura period par baki hissa simple (1,000 @ 1%/mo yearly, 1y 6m = 120 + 1120*6% = 187.20)', () => {
  assert.equal(man({ mode: 'compound', compoundFreq: 'yearly', principal: 1000, rate: 1, years: 1, months: 6 }).interest, 187.2);
});
test('COMPOUND: frequency badhne par byaj badhta hai (yearly <= halfyearly <= quarterly <= monthly <= daily)', () => {
  const v = ['yearly', 'halfyearly', 'quarterly', 'monthly', 'daily'].map(f => man({ mode: 'compound', compoundFreq: f, principal: 50000, rate: 2, years: 3 }).interest);
  for (let i = 1; i < v.length; i++) assert.ok(v[i] >= v[i - 1], v.join(','));
});
test('COMPOUND: compound >= simple, compare block sahi', () => {
  const c = man({ mode: 'compound', compoundFreq: 'monthly', principal: 20000, rate: 2, years: 2 });
  assert.ok(c.interest > man({ principal: 20000, rate: 2, years: 2 }).interest);
  assert.equal(c.compare.mode, 'simple'); assert.equal(c.compare.interest, 9600); near(c.compare.diff, 9600 - c.interest);
});
test('PARITY: calculator == ledger compound (random inputs, 5 frequencies)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) {
    const P = 1000 + Math.floor(rnd() * 200000), rate = Math.round((0.5 + rnd() * 4) * 100) / 100;
    const f = ['daily', 'monthly', 'quarterly', 'halfyearly', 'yearly'][i % 5];
    const s = new Date(2024, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28)), e = new Date(+s + Math.floor(30 + rnd() * 900) * 86400000);
    const fmt = (d) => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    const r = IC.calculate({ mode: 'compound', compoundFreq: f, principal: P, rate, startDate: fmt(s), endDate: fmt(e), rounding: 'rupee' });
    const st = L.calculateLoanState({ principal: P, rate, startDate: fmt(s), interestType: 'compound', compoundFreq: f, status: 'active', repayments: [], interestPaid: 0 }, [], new Date(e.getFullYear(), e.getMonth(), e.getDate()));
    assert.equal(r.interest, st.interestAccrued, `${f} ${P} ${rate} ${fmt(s)}..${fmt(e)}`);
  }
});

/* ===== DAY COUNT / ROUNDING ===== */
test('DAY COUNT actual/365: 36,500 @ 10%/saal, poore 365 din = 3,650', () => {
  const r = IC.calculate({ principal: 36500, rate: 10, rateUnit: 'year', startDate: '2026-01-01', endDate: '2027-01-01', dayCount: 'actual365' });
  assert.equal(r.interest, 3650);
});
test('DAY COUNT actual/360 compound daily chalta hai aur finite hai', () => {
  const r = IC.calculate({ mode: 'compound', compoundFreq: 'daily', principal: 10000, rate: 12, rateUnit: 'year', startDate: '2026-01-01', endDate: '2026-12-31', dayCount: 'actual360' });
  assert.ok(r.ok && isFinite(r.interest) && r.interest > 1200);
});
test('ROUNDING: paise / rupee / floor / ceil', () => {
  const o = { principal: 1234, rate: 1.5, years: 0, months: 7 }; // 129.57
  assert.equal(man({ ...o, rounding: 'paise' }).interest, 129.57);
  assert.equal(man({ ...o, rounding: 'rupee' }).interest, 130);
  assert.equal(man({ ...o, rounding: 'floor' }).interest, 129);
  assert.equal(man({ ...o, rounding: 'ceil' }).interest, 130);
});

/* ===== EXTRA OUTPUTS ===== */
test('EXTRA: avg/month, yearly nominal, effective yearly (compound > nominal)', () => {
  const r = man({ mode: 'compound', compoundFreq: 'monthly', principal: 10000, rate: 2, years: 1 });
  near(r.yearlyNominalPct, 24, 1e-9); assert.ok(r.effectiveYearlyPct > 26.8 && r.effectiveYearlyPct < 26.9, r.effectiveYearlyPct);
  near(r.avgPerMonth, r.interest / 12, 0.01);
});
test('EXTRA: 0% dar = 0 byaj, total == principal', () => {
  const r = man({ principal: 5000, rate: 0, years: 1 }); assert.equal(r.interest, 0); assert.equal(r.total, 5000);
});

/* ===== REVERSE ===== */
test('REVERSE rate (simple): 10,000, 1 saal, byaj 2,400 -> 2%/mahina = 24%/saal', () => {
  const r = IC.solveRate({ periodType: 'manual', years: 1, principal: 10000, interest: 2400 });
  assert.equal(r.ratePerMonth, 2); assert.equal(r.ratePerYear, 24);
});
test('REVERSE rate (compound) round-trip', () => {
  const o = { mode: 'compound', compoundFreq: 'quarterly', periodType: 'manual', years: 2, months: 3, principal: 75000 };
  const fwd = IC.calculate({ ...o, rate: 1.75 });
  const back = IC.solveRate({ ...o, interest: fwd.exactInterest });
  near(back.ratePerMonth, 1.75, 0.0002);
});
test('REVERSE principal: simple & compound round-trip, total se bhi', () => {
  const o = { mode: 'compound', compoundFreq: 'monthly', periodType: 'manual', months: 18, rate: 2 };
  const fwd = IC.calculate({ ...o, principal: 64000 });
  near(IC.solvePrincipal({ ...o, interest: fwd.exactInterest }).principal, 64000, 0.02);
  near(IC.solvePrincipal({ ...o, interest: fwd.principal + fwd.exactInterest }, 'total').principal, 64000, 0.02);
});
test('REVERSE time: simple 10,000 @ 2%, byaj 2,900 = 14.5 mahine (1y 2m 15d)', () => {
  const r = IC.solveTime({ principal: 10000, rate: 2, interest: 2900 });
  assert.deepEqual([r.years, r.monthsPart, r.days], [1, 2, 15]);
});
test('REVERSE time (compound) round-trip', () => {
  const o = { mode: 'compound', compoundFreq: 'monthly', principal: 30000, rate: 2 };
  const fwd = man({ ...o, years: 1, months: 4 });
  const r = IC.solveTime({ ...o, interest: fwd.exactInterest });
  assert.deepEqual([r.years, r.monthsPart, r.days], [1, 4, 0]);
});

/* ===== VALIDATION ===== */
test('VALIDATION: khaali / galat input par saaf error (hi + en), calculation nahi', () => {
  const codes = (r) => r.errors.map(e => e.code);
  assert.ok(codes(IC.calculate({})).includes('principal_required'));
  assert.ok(codes(IC.calculate({ principal: -5, rate: 2, periodType: 'manual', years: 1 })).includes('principal_positive'));
  assert.ok(codes(IC.calculate({ principal: 1e12, rate: 2, periodType: 'manual', years: 1 })).includes('principal_max'));
  assert.ok(codes(IC.calculate({ principal: 100, rate: 500, periodType: 'manual', years: 1 })).includes('rate_max'));
  assert.ok(codes(IC.calculate({ principal: 100, rate: 2, periodType: 'manual' })).includes('period_required'));
  assert.ok(codes(IC.calculate({ principal: 100, rate: 2, periodType: 'manual', years: 101 })).includes('period_max'));
  assert.ok(codes(IC.calculate({ principal: 100, rate: 2, startDate: '2026-05-01', endDate: '2026-04-01' })).includes('end_before_start'));
  const e = IC.calculate({}).errors[0]; assert.ok(e.hi && e.en && e.field);
});
test('VALIDATION: bahut bada compound overflow nahi karta (saaf error ya finite)', () => {
  const r = man({ mode: 'compound', compoundFreq: 'daily', principal: 1e11, rate: 100, years: 100 });
  assert.ok(r.ok === false || isFinite(r.interest));
});
test('periodBetween: saal/mahina/din', () => {
  assert.deepEqual(IC.periodBetween('2024-01-31', '2026-03-05'), { years: 2, months: 1, days: 5, totalDays: 764, totalMonthsInt: 25 });
});
