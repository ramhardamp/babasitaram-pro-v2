import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const L = req('../ledger.js'), R = req('../recovery.js');
const asOf = '2026-10-10';
const C = [{id:'a',name:'Ram',phone:'9876543210'},{id:'b',name:'Shyam'},{id:'c',name:'Clear'},{id:'d',name:'Adv'}];
const T = [
  // a: udhaar 1000 (Jun) + 500 (Sep); paid 1000 -> oldest unpaid is the Sep 500
  {id:'1',partyId:'a',type:'udhaar',amount:1000,date:'2026-06-01'},
  {id:'2',partyId:'a',type:'udhaar',amount:500,date:'2026-09-20'},
  {id:'3',partyId:'a',type:'jama',amount:1000,date:'2026-09-25'},
  // b: single old udhaar, unpaid
  {id:'4',partyId:'b',type:'udhaar',amount:2000,date:'2026-05-01'},
  // c: fully paid
  {id:'5',partyId:'c',type:'udhaar',amount:300,date:'2026-08-01'},
  {id:'6',partyId:'c',type:'jama',amount:300,date:'2026-08-02'},
  // d: advance (customer overpaid) -> nothing to recover
  {id:'7',partyId:'d',type:'jama',amount:400,date:'2026-09-01'},
  // deleted row must be ignored
  {id:'8',partyId:'c',type:'udhaar',amount:9999,date:'2026-01-01',status:'deleted'},
];
test('only customers who owe appear; paid-up and advance customers are excluded', () => {
  const rows = R.buildRecoveryList(L, C, T, asOf);
  assert.deepEqual(rows.map(r => r.id).sort(), ['a','b']);
});
test('amount equals the canonical ledger (not a re-computation)', () => {
  const rows = R.buildRecoveryList(L, C, T, asOf);
  for (const r of rows) assert.equal(r.due, L.customerState(T.filter(t => t.partyId === r.id), asOf, {mode:'legacy'}).totalOutstanding);
});
test('FIFO ageing: payment clears the OLDEST udhaar first', () => {
  const a = R.buildRecoveryList(L, C, T, asOf).find(r => r.id === 'a');
  assert.equal(a.due, 500);
  assert.equal(a.daysOverdue, 20);          // 20 Sep -> 10 Oct, not 131 days from June
  assert.equal(a.bucket, 'due');
  assert.equal(a.sinceLastPayment, 15);
});
test('old unpaid udhaar is critical and sorted first by priority', () => {
  const rows = R.buildRecoveryList(L, C, T, asOf);
  assert.equal(rows[0].id, 'b'); assert.equal(rows[0].bucket, 'critical'); assert.equal(rows[0].daysOverdue, 162);
});
test('bucket edges', () => {
  assert.deepEqual([0,7,8,30,31,90,91].map(R.bucketOf), ['ok','ok','due','due','late','late','critical']);
});
test('summary totals match rows', () => {
  const rows = R.buildRecoveryList(L, C, T, asOf), s = R.summarize(rows);
  assert.equal(s.count, 2); assert.equal(s.total, 2500); assert.equal(s.critical, 1); assert.equal(s.due, 1);
});
test('garbage dates / missing data never throw or produce NaN', () => {
  const rows = R.buildRecoveryList(L, [{id:'x',name:'X'}], [{id:'z',partyId:'x',type:'udhaar',amount:100,date:'bad'}], asOf);
  assert.equal(rows.length, 1); assert.ok(Number.isFinite(rows[0].daysOverdue) && Number.isFinite(rows[0].priority));
  assert.deepEqual(R.buildRecoveryList(L, null, null, asOf), []);
});
test('loan with unpaid interest is included and aged from its start date', () => {
  const loan = {id:'L1',partyId:'p',type:'byaj_loan',principal:10000,rate:2,startDate:'2026-04-10',status:'active',repayments:[],interestPaid:0};
  const r = R.buildRecoveryList(L, [{id:'p',name:'P'}], [loan], asOf)[0];
  assert.ok(r.due >= 10000); assert.equal(r.interestDue, 1200); assert.ok(r.daysOverdue >= 183);
});

test('credit limit: warns only when crossed; no/invalid limit never warns', () => {
  assert.deepEqual(R.checkLimit(5000, 4000, 500), { hasLimit: true, exceeds: false, newDue: 4500, limit: 5000, over: 0 });
  const x = R.checkLimit(5000, 4800, 500); assert.equal(x.exceeds, true); assert.equal(x.over, 300);
  assert.equal(R.checkLimit(5000, 4500, 500).exceeds, false);           // exactly at the limit is allowed
  for (const none of [undefined, null, '', 0, -1, 'abc']) assert.equal(R.checkLimit(none, 99999, 99999).exceeds, false);
  assert.equal(R.checkLimit(1000, -300, 500).newDue, 500);              // advance is not counted as negative debt
});
