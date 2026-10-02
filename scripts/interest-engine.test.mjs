import test from 'node:test';
import assert from 'node:assert/strict';
import {previewInterest} from './interest-engine.mjs';

test('monthly simple interest over 30 days',()=>{const x=previewInterest({principal:10000,ratePercent:2,startDate:'2026-01-01',endDate:'2026-01-31'});assert.equal(x.interest,197.26);assert.equal(x.elapsedDays,30);});
test('annual simple interest over 365 days',()=>{const x=previewInterest({principal:100000,ratePercent:12,ratePeriod:'annual',startDate:'2025-01-01',endDate:'2026-01-01'});assert.equal(x.interest,12000);});
test('compound preview is greater than simple for positive rate',()=>{const args={principal:10000,ratePercent:2,startDate:'2026-01-01',endDate:'2027-01-01'};assert.ok(previewInterest({...args,mode:'compound'}).interest>previewInterest(args).interest);});
test('rejects negative principal and invalid day count',()=>{assert.throws(()=>previewInterest({principal:-1,ratePercent:2,startDate:'2026-01-01',endDate:'2026-02-01'}));assert.throws(()=>previewInterest({principal:1,ratePercent:2,startDate:'2026-01-01',endDate:'2026-02-01',dayCount:'bad'}));});
test('rejects non-finite rates',()=>{assert.throws(()=>previewInterest({principal:1,ratePercent:NaN,startDate:'2026-01-01',endDate:'2026-02-01'}),/Invalid ratePercent/);assert.throws(()=>previewInterest({principal:1,ratePercent:Infinity,startDate:'2026-01-01',endDate:'2026-02-01'}),/Invalid ratePercent/);});
test('zero principal and zero rate remain exact zero',()=>{assert.equal(previewInterest({principal:0,ratePercent:12,startDate:'2026-01-01',endDate:'2027-01-01'}).interest,0);assert.equal(previewInterest({principal:1000,ratePercent:0,startDate:'2026-01-01',endDate:'2027-01-01'}).interest,0);});
test('same-day preview is zero interest',()=>{assert.equal(previewInterest({principal:1000,ratePercent:2,startDate:'2026-01-01',endDate:'2026-01-01'}).interest,0);});

test('half-paise rounding modes are deterministic',()=>{
  const args={principal:1,ratePercent:182.5,ratePeriod:'annual',startDate:'2026-01-01',endDate:'2026-01-02'};
  assert.equal(previewInterest({...args,rounding:'down'}).interest,0);
  assert.equal(previewInterest({...args,rounding:'half-up'}).interest,0.01);
  assert.equal(previewInterest({...args,rounding:'up'}).interest,0.01);
});

test('large safe-range amount retains exact paise in simple zero-rate calculation',()=>{
  const x=previewInterest({principal:'80000000000000.01',ratePercent:'0',ratePeriod:'annual',startDate:'2026-01-01',endDate:'2027-01-01'});
  assert.equal(x.principal,80000000000000.01);
  assert.equal(x.total,80000000000000.01);
  assert.equal(x.interest,0);
});

test('decimal money inputs are normalized to paise before simple calculation',()=>{
  const x=previewInterest({principal:'1.005',ratePercent:'0',ratePeriod:'annual',startDate:'2026-01-01',endDate:'2027-01-01'});
  assert.equal(x.principal,1.01);
  assert.equal(x.total,1.01);
});

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

test('rejects impossible ISO dates and reversed date ranges',()=>{
  assert.throws(()=>previewInterest({principal:1000,ratePercent:2,startDate:'2026-02-30',endDate:'2026-03-01'}),/Invalid ISO date/);
  assert.throws(()=>previewInterest({principal:1000,ratePercent:2,startDate:'2026-03-01',endDate:'2026-02-28'}),/End date must be on or after start date/);
  assert.throws(()=>previewInterest({principal:1000,ratePercent:2,startDate:'2026-2-01',endDate:'2026-03-01'}),/YYYY-MM-DD/);
});

test('leap-day and exact month interval day counts are deterministic',()=>{
  const leap=previewInterest({principal:10000,ratePercent:12,ratePeriod:'annual',startDate:'2024-02-28',endDate:'2024-03-01',dayCount:'ACT/365'});
  assert.equal(leap.elapsedDays,2);
  assert.equal(leap.interest,6.58);
  const month=previewInterest({principal:10000,ratePercent:12,ratePeriod:'annual',startDate:'2026-01-01',endDate:'2026-02-01',dayCount:'ACT/365'});
  assert.equal(month.elapsedDays,31);
  assert.equal(month.interest,101.92);
});

test('compound frequencies produce deterministic rounded totals',()=>{
  const args={principal:10000,ratePercent:12,ratePeriod:'annual',startDate:'2026-01-01',endDate:'2027-01-01',mode:'compound'};
  assert.equal(previewInterest({...args,compounding:'daily'}).interest,1274.75);
  assert.equal(previewInterest({...args,compounding:'monthly'}).interest,1268.25);
  assert.equal(previewInterest({...args,compounding:'quarterly'}).interest,1255.09);
  assert.equal(previewInterest({...args,compounding:'semiannual'}).interest,1236);
  assert.equal(previewInterest({...args,compounding:'annual'}).interest,1200);
});

test('rounding modes reject unsupported values',()=>{
  assert.throws(()=>previewInterest({principal:1,ratePercent:12,startDate:'2026-01-01',endDate:'2026-01-02',rounding:'bankers'}),/Unsupported rounding mode/);
});
