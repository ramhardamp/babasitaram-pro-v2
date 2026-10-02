import test from 'node:test';
import assert from 'node:assert/strict';
import {previewInterest} from './interest-engine.mjs';
test('monthly simple interest over 30 days',()=>{const x=previewInterest({principal:10000,ratePercent:2,startDate:'2026-01-01',endDate:'2026-01-31'});assert.equal(x.interest,197.26);assert.equal(x.elapsedDays,30);});
test('annual simple interest over 365 days',()=>{const x=previewInterest({principal:100000,ratePercent:12,ratePeriod:'annual',startDate:'2025-01-01',endDate:'2026-01-01'});assert.equal(x.interest,12000);});
test('compound preview is greater than simple for positive rate',()=>{const args={principal:10000,ratePercent:2,startDate:'2026-01-01',endDate:'2027-01-01'};assert.ok(previewInterest({...args,mode:'compound'}).interest>previewInterest(args).interest);});
test('rejects negative principal and invalid day count',()=>{assert.throws(()=>previewInterest({principal:-1,ratePercent:2,startDate:'2026-01-01',endDate:'2026-02-01'}));assert.throws(()=>previewInterest({principal:1,ratePercent:2,startDate:'2026-01-01',endDate:'2026-02-01',dayCount:'bad'}));});
test('same-day preview is zero interest',()=>{assert.equal(previewInterest({principal:1000,ratePercent:2,startDate:'2026-01-01',endDate:'2026-01-01'}).interest,0);});
