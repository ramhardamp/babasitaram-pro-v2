import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(f, 'utf8');
const dash = read('dashboard.html');
const index = read('index.html');

/* ---------- 1. Launch flow: splash -> biometric overlay -> dashboard ---------- */
test('LAUNCH: index.html — saved login (bsp_userId) par login screen skip, seedha dashboard; ?login=1 se band', () => {
  const head = index.slice(index.indexOf('LAUNCH FLOW'), index.indexOf('LAUNCH FLOW') + 700);
  assert.match(head, /localStorage\.getItem\('bsp_userId'\)/);
  assert.match(head, /location\.replace\('dashboard\.html'\)/);
  assert.match(head, /login\(=\|&\|\$\)/, '?login=1 escape hatch');
});

test('LAUNCH: dashboard bina user ke bsp_userId hata kar index bhejta hai (redirect loop nahi)', () => {
  assert.match(dash, /if\(!user\)\{try\{localStorage\.removeItem\('bsp_userId'\)\}catch\(e\)\{\}window\.location\.href='index\.html';return\}/);
});

test('LAUNCH: dashboard me splash hai, biometric splash ke upar, paint se pehle; dono paint-sites bootShowDashboard use karte hain', () => {
  assert.match(dash, /<div id="bootSplash"/);
  assert.match(dash, /document\.documentElement\.classList\.add\('booting'\)/);
  assert.match(dash, /async function bootShowDashboard\(\)/);
  assert.equal((dash.match(/\n      bootShowDashboard\(\);/g) || []).length, 2, 'cache path + server path');
  assert.doesNotMatch(dash, /showScreen\('dashboard',true\);\s*maybeStartupLock\(\);/, 'purana "paint phir lock" order nahi');
  const fn = dash.slice(dash.indexOf('async function bootShowDashboard()'), dash.indexOf('/* Lock again after coming back'));
  assert.ok(fn.indexOf('runBiometricPrompt') > fn.indexOf("showScreen('dashboard',true)"), 'dashboard neeche tayyar, phir biometric');
  assert.match(fn, /if\(r\.ok\)\{appLocked=false;endBoot\(\);return\}/, 'success => splash hata, dashboard');
  assert.match(fn, /lockApp\(true\);endBoot\(\)/, 'cancel/fail => PIN screen');
  assert.match(dash, /function showPinScreen\(mode,title,subtitle,callback\)\{\n  endBoot\(\);/, 'PIN screen splash ke upar dikhe');
  assert.match(dash, /function showLoadError\(message\)\{\n  endBoot\(\);/, 'error splash ke peeche na chhupe');
});

/* ---------- 2. Optimistic UI: saveTxn server ack ka intezaar nahi karta ---------- */
test('OPTIMISTIC: saveTxn me batch.commit() await nahi hota; UI turant, sync background me', () => {
  const fn = dash.slice(dash.indexOf('async function saveTxn(type)'), dash.indexOf('function rateUnitLabel'));
  assert.doesNotMatch(fn, /await batch\.commit\(\)/, 'server ack ka intezaar nahi');
  assert.match(fn, /commitP=batch\.commit\(\)/);
  const ui = fn.indexOf('closeModal();'), toastAt = fn.indexOf("toast(t('Entry Successful"), then = fn.indexOf('commitP.then(');
  assert.ok(ui > 0 && toastAt > ui && then > toastAt, 'modal band -> toast -> background sync');
  assert.match(fn, /\},e=>\{\s*syncDone\(\);[\s\S]*could not sync/, 'server reject => error toast (entry chupchap gayab nahi)');
  assert.match(fn, /queueOfflineTxn\(\{customerId,type,amt,note,date\}\)/, 'offline queue waisi hi');
  assert.match(fn, /Credit limit/, 'credit-limit warning waisi hi');
});

/* ---------- 3. Theme toggle login pages se hata ---------- */
test('THEME: login/signup/forgot-password par toggle nahi; theme.js opt-out ko manta hai', () => {
  for (const f of ['index.html', 'signup.html', 'forgot-password.html']) {
    assert.match(read(f), /<html lang="hi" data-no-theme-toggle>/, f);
  }
  assert.match(read('theme.js'), /data-no-theme-toggle/);
  assert.doesNotMatch(dash, /data-no-theme-toggle/, 'dashboard/Settings me toggle rahe');
});

/* ---------- 4. Baaki saves: kaun optimistic, kaun nahi (aur kyun) ---------- */
const fnBody = (name, next) => dash.slice(dash.indexOf(name), dash.indexOf(next, dash.indexOf(name) + name.length));

test('OPTIMISTIC: saveLoan / saveCustomer / updateCustomer bhi server ack ka intezaar nahi karte', () => {
  const loan = fnBody('async function saveLoan()', 'function openRepayModal');
  assert.doesNotMatch(loan, /await loanRef\.set\(/);
  assert.match(loan, /const loanP=loanRef\.set\(loanData\)/);
  assert.match(loan, /Due date cannot be before start date/, 'validation waisi hi');
  const cust = fnBody('async function saveCustomer()', 'function openEditCustomer');
  assert.doesNotMatch(cust, /await batch\.commit\(\)/);
  assert.match(cust, /const custP=batch\.commit\(\)/);
  const upd = fnBody('async function updateCustomer()', 'async function deleteCustomer');
  assert.doesNotMatch(upd, /await db\.collection\('users'\)[^;]*\.update\(updateData\)/);
  assert.match(upd, /const updP=db\.collection/);
  assert.match(upd, /Credit limit is not valid/, 'validation waisi hi');
});

test('SAFETY: read-modify-write server transactions optimistic NAHI banaye (stale balance / double entry ka risk)', () => {
  for (const [fn, next] of [['async function saveRepay()', 'function openIntPaidModal'], ['async function saveIntPaid()', 'function renderReports'], ['async function saveEditedTxn(id)', 'function showLoanMenu'], ['async function deleteTxn(id)', 'function showLoanMenu']]) {
    assert.match(fnBody(fn, next), /await db\.runTransaction\(/, fn + ' transaction hi rahe');
  }
  for (const [fn, next] of [['async function saveRepay()', 'function openIntPaidModal'], ['async function saveIntPaid()', 'function renderReports']]) {
    const b = fnBody(fn, next);
    assert.match(b, /setSaveBusy\(true\)/, fn + ': Save turant "Saving…"');
    assert.match(b, /setSaveBusy\(false\)/, fn + ': fail par button wapas');
  }
});

test('FAILED ENTRIES: server reject => Offline queue "jaanch chahiye" list me (chupchap gayab nahi), Re-enter / Discard', () => {
  const fn = fnBody('async function saveTxn(type)', 'function rateUnitLabel');
  assert.match(fn, /ob\.add\(\{key:txnRef\.id,customerId,type,amount:amt,note,date,time,dateTime\}\)/);
  assert.match(fn, /ob\.mark\(txnRef\.id,'failed'/);
  assert.match(fn, /updateOutboxBanner\(\)/);
  assert.match(dash, /function reenterOutboxEntry\(key\)/);
  assert.match(dash, /reenterOutboxEntry\(\$\{JSON\.stringify\(e\.key\)\}\)/);
  assert.match(dash, /color:var\(--credit\)">\$\{esc\(e\.error\)\}/, 'error text red');
});

test('THEME: VIP ek hi theme — Settings ka dead Light/Dark/System chooser chhupa', () => {
  assert.match(dash, /\[data-theme-set\],\.android-export-title:has\(#uxThemeState\)\{display:none!important\}/);
});
