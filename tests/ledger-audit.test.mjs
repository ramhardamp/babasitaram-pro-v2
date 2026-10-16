import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../ledger.js');
const asOf='2026-10-10';
const loan=(o={})=>({type:'byaj_loan',id:'L1',principal:10000,rate:2,startDate:'2026-04-10',repayments:[],interestPaid:0,status:'active',...o});
const st=(l,m='legacy')=>L.calculateLoanState(l,[],asOf,{mode:m});

test('audit: 6 full months @2%/month on 10,000 = 1,200 interest',()=>{
  const s=st(loan()); assert.equal(s.interestAccrued,1200); assert.equal(s.totalOutstanding,11200);
});
test('audit: over-repayment of principal never gives negative outstanding',()=>{
  const s=st(loan({repayments:[{amount:15000,date:'2026-06-10'}]}));
  assert.equal(s.principalOutstanding,0); assert.ok(s.interestOutstanding>=0);
});
test('audit: over-payment of interest never gives negative interest',()=>{
  const s=st(loan({interestPaid:99999})); assert.equal(s.interestOutstanding,0);
});
test('audit: closing — principal repaid AND interest paid => closed (both modes)',()=>{
  const l=loan({repayments:[{amount:10000,date:'2026-10-10'}],interestPaid:1200});
  assert.equal(st(l,'legacy').status,'closed'); assert.equal(st(l,'timeline').status,'closed');
});
// ---- POLICY FINDING #2 (documented, NOT changed) ----
test('POLICY (needs owner decision): full principal repayment with unpaid interest',()=>{
  const l=loan({repayments:[{amount:10000,date:'2026-10-10'}]});
  const a=st(l,'legacy'), b=st(l,'timeline');
  console.log('# legacy: status='+a.status+' interestOutstanding='+a.interestOutstanding+' | timeline: status='+b.status+' interestOutstanding='+b.interestOutstanding);
  assert.equal(a.interestOutstanding,0);   // legacy silently forgives 6 months of interest
  assert.equal(b.interestOutstanding,1200);
});
test('audit: backdated start in the future / invalid date gives 0 interest, not NaN',()=>{
  assert.equal(st(loan({startDate:'2027-01-01'})).interestAccrued,0);
  const s=st(loan({startDate:'garbage'})); assert.ok(Number.isFinite(s.interestAccrued)&&Number.isFinite(s.totalOutstanding));
});
test('audit: deleted transactions are ignored by customerState',()=>{
  const t=[{type:'udhaar',amount:500},{type:'udhaar',amount:700,status:'deleted'},{type:'jama',amount:100,deletedAt:'x'}];
  const s=L.customerState(t,asOf,{mode:'legacy'}); assert.equal(s.ordinaryOutstanding,500);
});
test('audit: string/garbage amounts are treated as 0, never NaN',()=>{
  const s=L.customerState([{type:'udhaar',amount:'abc'},{type:'udhaar',amount:'250'}],asOf,{mode:'legacy'});
  assert.equal(s.ordinaryOutstanding,250);
});
test('audit: decimals — rounding is on interest only, sums stay exact',()=>{
  const s=L.customerState([{type:'udhaar',amount:100.10},{type:'jama',amount:0.10}],asOf,{mode:'legacy'});
  assert.ok(Math.abs(s.ordinaryOutstanding-100)<1e-9);
});
test('audit: advance (over-payment) is shown separately, not netted against loan',()=>{
  const s=L.customerState([{type:'jama',amount:300},loan()],asOf,{mode:'legacy'});
  assert.equal(s.advance,300); assert.equal(s.ordinaryOutstanding,0); assert.ok(s.totalOutstanding>=10000);
});
// ---- POLICY FINDING (documented, NOT changed): legacy mode re-prices ALL elapsed months at the reduced principal ----
test('POLICY (needs owner decision): legacy vs timeline differ after a partial repayment',()=>{
  const l=loan({repayments:[{amount:5000,date:'2026-07-10'}]});
  const a=st(l,'legacy').interestAccrued, b=st(l,'timeline').interestAccrued;
  console.log('# legacy interest =',a,' timeline interest =',b);
  assert.notEqual(a,b);
});
