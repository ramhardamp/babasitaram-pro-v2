import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const IC = require('../interest-calc.js');

test('future-dated interest estimate returns a projection through the chosen date', () => {
  const result = IC.calculate({ mode:'compound', compoundFreq:'monthly', principal:10000, rate:2, startDate:'2026-10-12', endDate:'2027-10-12' });
  assert.equal(result.ok, true);
  assert.equal(result.endDate, '2027-10-12');
  assert.equal(result.schedule.length, 12);
  assert.equal(result.schedule.at(-1).date, '2027-10-12');
  assert.ok(result.interest > 0);
});

test('calculator labels future estimates as a forecast', async () => {
  const ui = await readFile(new URL('../interest-calc-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /Forecast through/);
  assert.match(ui, /r\.endDate > todayISO\(\)/);
});


test('V18-style forecast table projects 50 years and half-yearly compound rows through the canonical engine', async () => {
  const ui = await readFile(new URL('../interest-calc-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /function forecastHTML\(\)/);
  assert.match(ui, /years <= 50/);
  assert.match(ui, /S\.mode === 'compound' && S\.freq === 'halfyearly'/);
  assert.match(ui, /IC\.calculate\(input\)/);
  assert.match(ui, /data-act=\"forecast\"/);
  const firstYear = IC.calculate({mode:'simple', principal:10000, rate:2, rateUnit:'month', periodType:'manual', years:1, months:0, days:0, compoundFreq:'yearly'});
  assert.equal(firstYear.ok, true);
  assert.equal(firstYear.interest, 2400);
  assert.equal(firstYear.total, 12400);
  const firstHalf = IC.calculate({mode:'compound', principal:10000, rate:2, rateUnit:'month', periodType:'manual', years:0.5, months:0, days:0, compoundFreq:'halfyearly'});
  assert.equal(firstHalf.ok, true);
  assert.equal(firstHalf.interest, 1200);
  assert.equal(firstHalf.total, 11200);
});
