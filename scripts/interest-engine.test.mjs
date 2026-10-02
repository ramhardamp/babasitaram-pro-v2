import test from 'node:test';
import assert from 'node:assert/strict';
import {previewInterest} from './interest-engine.mjs';
test('monthly simple interest over 30 days',()=>{const x=previewInterest({principal:10000,ratePercent:2,startDate:'2026-01-01',endDate:'2026-01-31'});assert.equal(x.interest,197.26);assert.equal(x.elapsedDays,30);});
test('annual simple interest over 365 days',()=>{const x=previewInterest({principal:100000,ratePercent:12,ratePeriod:'annual',startDate:'2025-01-01',endDate:'2026-01-01'});assert.equal(x.interest,12000);});
test('compound preview is greater than simple for positive rate',()=>{const args={principal:10000,ratePercent:2,startDate:'2026-01-01',endDate:'2027-01-01'};assert.ok(previewInterest({...args,mode:'compound'}).interest>previewInterest(args).interest);});
test('rejects negative principal and invalid day count',()=>{assert.throws(()=>previewInterest({principal:-1,ratePercent:2,startDate:'2026-01-01',endDate:'2026-02-01'}));assert.throws(()=>previewInterest({principal:1,ratePercent:2,startDate:'2026-01-01',endDate:'2026-02-01',dayCount:'bad'}));});
test('same-day preview is zero interest',()=>{assert.equal(previewInterest({principal:1000,ratePercent:2,startDate:'2026-01-01',endDate:'2026-01-01'}).interest,0);});

test('30E/360 applies European month-end normalization',()=>{
  const feb=previewInterest({principal:36000,ratePercent:10,ratePeriod:'annual',startDate:'2026-01-31',endDate:'2026-02-28',dayCount:'30E/360'});
  assert.equal(feb.elapsedDays,28);
  assert.equal(feb.interest,280);
  const march=previewInterest({principal:36000,ratePercent:10,ratePeriod:'annual',startDate:'2026-02-28',endDate:'2026-03-31',dayCount:'30E/360'});
  assert.equal(march.interest,320);
  assert.equal(march.dayCount,'30E/360');
});
test('legacy 30/360 label normalizes to explicit 30E/360',()=>{
  const x=previewInterest({principal:36000,ratePercent:10,ratePeriod:'annual',startDate:'2026-01-31',endDate:'2026-02-28',dayCount:'30/360'});
  assert.equal(x.dayCount,'30E/360');
  assert.equal(x.interest,280);
});
