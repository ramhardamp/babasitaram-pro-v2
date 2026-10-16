import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync(new URL('../native-shim.js', import.meta.url), 'utf8');

function run({ page = 'dashboard.html', hasBack = undefined, historyLen = 1, noCapacitor = false } = {}) {
  const calls = [], listeners = {}, nav = { href: null, backed: 0 };
  const cap = noCapacitor ? undefined : {
    nativePromise: (p, m, o) => { calls.push([p, m, o]); return Promise.resolve({ ok: true }); },
    addListener: (p, e, cb) => { listeners[p + ':' + e] = cb; return { remove() {} }; },
  };
  const w = { Capacitor: cap, location: { pathname: '/app/' + page, get href() { return nav.href; }, set href(v) { nav.href = v; } },
    history: { length: historyLen, back() { nav.backed++; } } };
  if (hasBack !== undefined) w.__nativeAndroidBack = hasBack;
  w.window = w; vm.runInNewContext(code, w);
  return { w, calls, listeners, nav };
}
test('shim creates App + BsrSmsScheduler proxies that call the native bridge', async () => {
  const { w, calls } = run();
  assert.ok(w.Capacitor.Plugins.App && w.Capacitor.Plugins.BsrSmsScheduler);
  await w.Capacitor.Plugins.BsrSmsScheduler.checkPermission();
  await w.Capacitor.Plugins.BsrSmsScheduler.scheduleReminder({ id: 'x' });
  assert.deepEqual(calls.map(c => c.slice(0, 2).join('.')), ['BsrSmsScheduler.checkPermission', 'BsrSmsScheduler.scheduleReminder']);
  assert.deepEqual(calls[1][2], { id: 'x' });
  assert.equal(w.Capacitor.Plugins.BsrSmsScheduler.then, undefined, 'proxy must not look like a Promise');
});
test('plain browser (no Capacitor): shim does nothing and does not throw', () => {
  const { w } = run({ noCapacitor: true }); assert.equal(w.Capacitor, undefined);
});
test('exactly ONE backButton listener is registered; double load does not duplicate', () => {
  const { w, listeners } = run(); assert.equal(Object.keys(listeners).length, 1);
  vm.runInNewContext(code, w); assert.equal(Object.keys(listeners).length, 1);
});
test('dashboard: handled Back never exits the app', () => {
  const { w, listeners, calls } = run({ hasBack: () => true }); listeners['App:backButton']();
  assert.equal(calls.filter(c => c[1] === 'exitApp').length, 0);
});
test('dashboard: unhandled Back exits through App.exitApp', () => {
  const { listeners, calls } = run({ hasBack: () => false }); listeners['App:backButton']();
  assert.equal(calls.filter(c => c[1] === 'exitApp').length, 1);
});
test('signup / forgot-password: Back goes to previous page, app stays open', () => {
  for (const page of ['signup.html', 'forgot-password.html']) {
    const r = run({ page, historyLen: 3 }); r.listeners['App:backButton']();
    assert.equal(r.nav.backed, 1); assert.equal(r.calls.filter(c => c[1] === 'exitApp').length, 0);
  }
});
test('signup opened directly (no history): Back returns to login, not exit', () => {
  const r = run({ page: 'signup.html', historyLen: 1 }); r.listeners['App:backButton']();
  assert.equal(r.nav.href, 'index.html'); assert.equal(r.calls.filter(c => c[1] === 'exitApp').length, 0);
});
test('login page is the root: Back exits', () => {
  const r = run({ page: 'index.html' }); r.listeners['App:backButton']();
  assert.equal(r.calls.filter(c => c[1] === 'exitApp').length, 1);
});
test('an error inside the dashboard handler falls back to exit instead of freezing', () => {
  const r = run({ hasBack: () => { throw new Error('boom'); } }); r.listeners['App:backButton']();
  assert.equal(r.calls.filter(c => c[1] === 'exitApp').length, 1);
});
