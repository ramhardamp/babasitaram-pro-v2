import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dash = readFileSync('dashboard.html', 'utf8');
const sw = readFileSync('service-worker.js', 'utf8');
const prep = readFileSync('scripts/prepare-web.mjs', 'utf8');

test('Byaj calculator: scripts, screen, tab, back-rules dashboard me juden', () => {
  assert.ok(dash.indexOf('<script src="ledger.js"></script>') < dash.indexOf('<script src="interest-calc.js"></script>'), 'engine ledger.js ke baad');
  assert.ok(dash.includes('<script src="interest-calc-ui.js"></script>'));
  assert.ok(dash.includes('id="screen-calc"'));
  assert.ok(dash.includes("switchTab('calc')"));
  assert.ok(dash.includes("const NO_BACK_SCREENS = ['dashboard', 'reports', 'calc', 'settings', 'pin'];"));
  assert.ok(dash.includes("const showTabs = ['dashboard', 'reports', 'calc', 'settings'].includes(name);"));
  assert.ok(dash.includes("name === 'calc' && typeof renderCalc === 'function'"));
});
test('Byaj calculator: offline cache aur APK web build me dono files', () => {
  for (const f of ['interest-calc.js', 'interest-calc-ui.js']) { assert.ok(sw.includes('./' + f), 'service-worker ' + f); assert.ok(prep.includes("'" + f + "'"), 'prepare-web ' + f); }
});
test('Byaj calculator UI: change-event se result dobara draw nahi hota (button tap kho jata tha)', () => {
  const ui = readFileSync('interest-calc-ui.js', 'utf8');
  assert.ok(ui.includes("if (e.type === 'change' && S[f] === v) return;"));
  assert.ok(ui.includes('box._html !== html'));
});
