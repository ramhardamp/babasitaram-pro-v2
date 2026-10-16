import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const dash = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const ux = readFileSync(new URL('../ux-pro.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../ux-pro.css', import.meta.url), 'utf8');

test('SYNTAX: dashboard.html ke saare inline <script> blocks parse hote hain', () => {
  const blocks = [...dash.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(blocks.length > 0);
  blocks.forEach((b, i) => assert.doesNotThrow(() => new vm.Script(b), 'inline script #' + i));
  assert.doesNotThrow(() => new vm.Script(ux)); 
});
test('PAGE-MODE: entry forms full page (entry upar, keyboard neeche)', () => {
  assert.ok(ux.includes("classList.add('pm')") && ux.includes('.txn-sheet,#mAmt,#mPrincipal,#mRepay,#mIntAmt'));
  assert.ok(css.includes('.modal-overlay.pm .modal{display:flex;flex-direction:column;height:100%'));
  assert.ok(css.includes('.modal-overlay.pm.kb-open .txn-sheet>.txn-actions{margin-top:14px}'));
});
test('HISTORY: transaction list scrolls independently inside fixed customer detail', () => {
  assert.ok(dash.includes('#screenContainer.customer-mode:has(#customerDetail .txn-history-list) #customerDetail{height:100%;min-height:0;max-height:100%;display:flex;flex-direction:column;overflow:hidden}'));
  assert.ok(dash.includes('#screenContainer.customer-mode:has(#customerDetail .txn-history-list) #customerDetail>.txn-history-list{flex:1 1 auto;min-height:0;max-height:none;overflow-y:auto'));
});
test('EDIT LOAN: Simple <-> Compound, frequency, rate unit, due date (sirf badle fields; simple par delete)', () => {
  assert.ok(dash.includes('${loanTermsFields(loan)}'));
  assert.ok(dash.includes("updateData.interestType=FV.delete();updateData.compoundFreq=FV.delete()"));
  assert.ok(dash.includes("updateData.interestType='compound';updateData.compoundFreq=_fr"));
  assert.ok(dash.includes("else if(loan.rateUnit)updateData.rateUnit=FV.delete()"));
  assert.ok(dash.includes("else if(loan.dueDate)updateData.dueDate=FV.delete()"));
  assert.ok(ux.includes('window.loanTermsFields'));
});

test('LOAN PAGE: loan card tap => page, 3-dot hata, saare actions page ke menu me', () => {
  assert.ok(dash.includes(`onclick="openLoanPage('\${loan.id}')"`));
  assert.ok(!dash.includes(`showLoanMenu('\${loan.id}')">⋮`));
  for (const k of ['edit', 'settle', 'unsettle', 'repay', 'int', 'delete', 'pdf']) assert.ok(ux.includes(`'${k}'`), k);
  assert.ok(ux.includes('window.openLoanPage') && ux.includes('api.lpAct') && ux.includes('returnLoanId'));
  assert.ok(ux.includes("classList.add('pm', 'loan-page')"));
});
test('EDIT LOAN: halfyear rate unit bhi bachta hai', () => {
  assert.ok(dash.includes("_unitRaw==='halfyear'?'halfyear':'month'") && ux.includes('value="halfyear"'));
});
