import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../ledger.js');

// ---- Frozen reference: purana dashboard calcLoan (v6.8.2) - regression oracle ----
function refMonths(start, end) {
  const s = new Date(start), e = new Date(end); if (e <= s) return 0;
  let years = e.getFullYear() - s.getFullYear(), months = e.getMonth() - s.getMonth(), days = e.getDate() - s.getDate();
  if (days < 0) { months -= 1; days += new Date(e.getFullYear(), e.getMonth(), 0).getDate(); }
  const total = years * 12 + months, dim = new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
  return Math.max(0, total + days / dim);
}
function refCalcLoan(loan, now) {
  const principal = Math.max(0, Number(loan.principal) || 0), rate = Math.max(0, Number(loan.rate) || 0);
  const repaid = (Array.isArray(loan.repayments) ? loan.repayments : []).reduce((s, r) => s + (Number(r?.amount) || 0), 0);
  const currentP = Math.max(0, principal - repaid);
  const mr = refMonths(loan.startDate, now), months = Number.isFinite(mr) ? mr : 0;
  const accr = Math.round((currentP * rate * months) / 100), intPaid = Math.max(0, Number(loan.interestPaid) || 0), intOut = Math.max(0, accr - intPaid);
  return { repaidPrincipal: Math.round(repaid), currentPrincipal: Math.round(currentP), months: Math.round(months * 10) / 10, interestAccrued: accr,
    interestPaid: Math.round(intPaid), interestOutstanding: Math.round(intOut), loanTotal: Math.round(currentP + intOut),
    progress: principal > 0 ? Math.min(100, Math.round((repaid / principal) * 100)) : 0 };
}
const D = (s) => new Date(s + 'T12:00:00');
const loan = (o = {}) => ({ id: 'L1', loanId: 'L1', type: 'byaj_loan', status: 'active', principal: 100000, rate: 2, startDate: '2026-01-15T12:00:00', repayments: [], interestPaid: 0, ...o });

test('legacy mode == purana calcLoan (200 random loans)', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 200; i++) {
    const principal = Math.floor(rnd() * 500000) + 1000, rate = Math.round(rnd() * 50) / 10;
    const start = new Date(2025, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), 12);
    const n = Math.floor(rnd() * 4), repayments = [];
    for (let k = 0; k < n; k++) repayments.push({ amount: Math.floor(rnd() * principal / 4), date: '2026-01-01' });
    const l = loan({ principal, rate, startDate: start.toISOString(), repayments, interestPaid: Math.floor(rnd() * 3000) });
    const now = new Date(2026, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), 12);
    const got = L.calculateLoanState(l, [], now, { mode: 'legacy' }), ref = refCalcLoan(l, now);
    for (const k of Object.keys(ref)) assert.equal(got[k], ref[k], `${k} drift`);
  }
});

test('legacy: known value (6 months, 2%/mo, 1,00,000 => 12,000)', () => {
  const s = L.calculateLoanState(loan(), [], D('2026-07-15'));
  assert.equal(s.interestAccrued, 12000); assert.equal(s.interestOutstanding, 12000); assert.equal(s.totalOutstanding, 112000);
});

test('timeline: repayment ke baad agle period se kam principal (10,800 vs legacy 9,600)', () => {
  const l = loan({ repayments: [{ amount: 20000, date: '2026-04-15T12:00:00' }] });
  assert.equal(L.calculateLoanState(l, [], D('2026-07-15'), { mode: 'timeline' }).interestAccrued, 10800);
  assert.equal(L.calculateLoanState(l, [], D('2026-07-15'), { mode: 'legacy' }).interestAccrued, 9600);
});

test('timeline: poori repayment ke baad bhi accrued byaj bacha rehta hai, principal 0', () => {
  const l = loan({ status: 'closed', repayments: [{ amount: 100000, date: '2026-04-15T12:00:00' }] });
  const s = L.calculateLoanState(l, [], D('2026-07-15'), { mode: 'timeline' });
  assert.equal(s.principalOutstanding, 0); assert.equal(s.interestOutstanding, 6000); assert.equal(s.status, 'active');
  const c = L.customerState([l], D('2026-07-15'), { mode: 'timeline' });
  assert.equal(c.interestOutstanding, 6000); assert.equal(c.totalOutstanding, 6000);
  assert.equal(L.customerState([l], D('2026-07-15')).totalOutstanding, 0); // legacy: band loan gina nahi jata (compat)
});

test('interest payment sirf interest ghatata hai, principal nahi', () => {
  const s = L.calculateLoanState(loan({ interestPaid: 5000 }), [], D('2026-07-15'));
  assert.equal(s.principalOutstanding, 100000); assert.equal(s.interestOutstanding, 7000);
});

test('interest paid > accrued => outstanding 0 (negative nahi)', () => {
  assert.equal(L.calculateLoanState(loan({ interestPaid: 99999 }), [], D('2026-07-15')).interestOutstanding, 0);
});

test('embedded history authoritative; linked sirf tab jab embedded khaali', () => {
  const l = loan({ repayments: [] });
  const txns = [l, { type: 'loan_repay', loanId: 'L1', amount: 30000, date: '2026-03-15T12:00:00' }, { type: 'interest_paid', loanId: 'L1', amount: 1000 },
    { type: 'loan_repay', loanId: 'L1', amount: 99999, status: 'deleted' }];
  const s = L.calculateLoanState(l, txns, D('2026-07-15'));
  assert.equal(s.principalOutstanding, 70000); assert.equal(s.interestPaid, 1000);
});

test('embedded non-empty ho to linked txns ignore (purani history nahi badalti)', () => {
  const l = loan({ repayments: [{ amount: 10000, date: '2026-02-15T12:00:00' }], interestPaid: 500 });
  const s = L.calculateLoanState(l, [l, { type: 'loan_repay', loanId: 'L1', amount: 40000 }, { type: 'interest_paid', loanId: 'L1', amount: 9000 }], D('2026-07-15'));
  assert.equal(s.principalOutstanding, 90000); assert.equal(s.interestPaid, 500);
});

test('ordinary: udhaar - jama, advance alag, deleted ignore', () => {
  const t = [{ type: 'udhaar', amount: 500 }, { type: 'jama', amount: 200 }, { type: 'udhaar', amount: 999, status: 'deleted' }, { type: 'jama', amount: 1, deletedAt: 'x' }];
  assert.deepEqual(L.ordinaryState(t), { net: 300, ordinaryOutstanding: 300, advance: 0 });
  assert.deepEqual(L.ordinaryState([{ type: 'udhaar', amount: 100 }, { type: 'jama', amount: 250 }]), { net: -150, ordinaryOutstanding: 0, advance: 150 });
});

test('advance loan se net nahi hota: total = ordinary + principal + interest', () => {
  const t = [{ type: 'jama', amount: 5000 }, loan()];
  const s = L.customerState(t, D('2026-07-15'));
  assert.equal(s.advance, 5000); assert.equal(s.ordinaryOutstanding, 0); assert.equal(s.totalOutstanding, 112000);
  assert.deepEqual(L.checkInvariants(s), []);
});

test('messageKind: normal / advance / loan / mixed / clear', () => {
  const k = (t) => L.messageKind(L.customerState(t, D('2026-07-15')));
  assert.equal(k([{ type: 'udhaar', amount: 10 }]), 'normal');
  assert.equal(k([{ type: 'jama', amount: 10 }]), 'advance');
  assert.equal(k([loan()]), 'loan');
  assert.equal(k([loan(), { type: 'udhaar', amount: 10 }]), 'mixed');
  assert.equal(k([]), 'clear');
});

test('publicSummary: ordinary aur loan alag sections, deleted exclude', () => {
  const t = [{ type: 'udhaar', amount: 700 }, { type: 'jama', amount: 200 }, loan(), { type: 'loan_repay', amount: 100, loanId: 'L1' }, { type: 'interest_paid', amount: 50, loanId: 'L1' }, { type: 'udhaar', amount: 9, status: 'deleted' }];
  const p = L.publicSummary(L.customerState(t, D('2026-07-15')), t);
  assert.equal(p.ordinaryUdhaar, 700); assert.equal(p.ordinaryJama, 200); assert.equal(p.loanGiven, 100000);
  assert.equal(p.loanRepaid, 100); assert.equal(p.interestPaid, 50); assert.equal(p.schemaVersion, 2);
});

test('invariants hold on 300 random ledgers (both modes)', () => {
  let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 300; i++) {
    const t = [];
    for (let k = 0; k < Math.floor(rnd() * 8); k++) t.push({ type: rnd() < 0.5 ? 'udhaar' : 'jama', amount: Math.floor(rnd() * 5000) });
    if (rnd() < 0.7) t.push(loan({ principal: Math.floor(rnd() * 90000) + 1000, rate: Math.round(rnd() * 40) / 10, repayments: rnd() < 0.5 ? [{ amount: 500, date: '2026-03-01T12:00:00' }] : [], interestPaid: Math.floor(rnd() * 500) }));
    for (const mode of ['legacy', 'timeline']) {
      const s = L.customerState(t, D('2026-09-01'), { mode });
      assert.deepEqual(L.checkInvariants(s), []);
      const net = t.filter(x => x.type === 'udhaar').reduce((a, x) => a + x.amount, 0) - t.filter(x => x.type === 'jama').reduce((a, x) => a + x.amount, 0);
      assert.equal(s.ordinaryOutstanding - s.advance, net);
    }
  }
});

test('portfolioTotals = per-customer sum', () => {
  const a = L.customerState([{ type: 'udhaar', amount: 100 }], D('2026-07-15')), b = L.customerState([loan()], D('2026-07-15')), c = L.customerState([{ type: 'jama', amount: 40 }], D('2026-07-15'));
  const t = L.portfolioTotals([a, b, c]);
  assert.equal(t.total, 100 + 112000); assert.equal(t.advance, 40); assert.equal(t.ordinary, 100);
});

test('bad inputs crash nahi karte (NaN/undefined/string amounts)', () => {
  const s = L.customerState([{ type: 'udhaar', amount: 'abc' }, { type: 'jama' }, null === 1 ? 0 : { type: 'byaj_loan', status: 'active', principal: 'x', rate: undefined }], D('2026-07-15'));
  assert.equal(s.totalOutstanding, 0);
});

// ---------- integrity ----------
const cust = (o = {}) => ({ id: 'p1', name: 'Ram', balance: 0, ...o });
const rep = (customers, transactions) => L.integrityReport({ customers, transactions, now: D('2026-07-15') });
const codes = (r) => Object.keys(r.counts).sort();

test('integrity: clean data => ok, koi issue nahi', () => {
  const t = [{ id: 't1', partyId: 'p1', type: 'udhaar', amount: 100, date: '2026-07-01' }];
  const r = rep([cust({ balance: 100 })], t);
  assert.equal(r.ok, true); assert.equal(r.issues.length, 0);
});
test('integrity: orphan, invalid type/amount, duplicate id, balance mismatch', () => {
  const t = [{ id: 't1', partyId: 'zzz', type: 'udhaar', amount: 5 }, { id: 't1', partyId: 'p1', type: 'gift', amount: 5 }, { id: 't3', partyId: 'p1', type: 'udhaar', amount: -2 }];
  const r = rep([cust({ balance: 77 })], t);
  for (const c of ['orphan_transaction', 'duplicate_txn_id', 'invalid_type', 'invalid_amount', 'balance_mismatch']) assert.ok(codes(r).includes(c), c);
  assert.equal(r.ok, false);
});
test('integrity: loan link issues (orphan loanId, deleted loan, mismatch, exceeds principal, status)', () => {
  const l = loan({ id: 'L1', loanId: 'L1', partyId: 'p1', repayments: [{ amount: 150000 }], status: 'active' });
  const t = [l, { id: 'r1', partyId: 'p1', type: 'loan_repay', amount: 10, loanId: 'L1' }, { id: 'r2', partyId: 'p1', type: 'loan_repay', amount: 10, loanId: 'NOPE' },
    { id: 'r3', partyId: 'p1', type: 'interest_paid', amount: 5 }];
  const r = rep([cust()], t);
  for (const c of ['repaid_exceeds_principal', 'repayment_mismatch', 'derived_orphan_loan', 'derived_without_loanid', 'status_should_be_closed']) assert.ok(codes(r).includes(c), c);
  const del = loan({ id: 'L2', loanId: 'L2', partyId: 'p1', status: 'deleted' });
  assert.ok(codes(rep([cust()], [del, { id: 'r9', partyId: 'p1', type: 'loan_repay', amount: 1, loanId: 'L2' }])).includes('derived_on_deleted_loan'));
});
test('integrity: deleted txns ignore, future-dated warn, malformed token warn', () => {
  const t = [{ id: 'a', partyId: 'p1', type: 'udhaar', amount: 100, status: 'deleted' }, { id: 'b', partyId: 'p1', type: 'jama', amount: 1, date: '2027-12-01' }];
  const r = rep([cust({ balance: -1, viewToken: 'short' })], t);
  assert.ok(codes(r).includes('future_dated')); assert.ok(codes(r).includes('malformed_view_token')); assert.equal(r.ok, true);
});
test('balanceFixPlan: dry-run sirf mismatch dikhata hai', () => {
  const plan = L.balanceFixPlan([cust({ id: 'p1', balance: 5 }), cust({ id: 'p2', name: 'S', balance: 100 })],
    [{ id: 'a', partyId: 'p1', type: 'udhaar', amount: 100 }, { id: 'b', partyId: 'p2', type: 'udhaar', amount: 100 }]);
  assert.deepEqual(plan, [{ id: 'p1', name: 'Ram', from: 5, to: 100 }]);
});
