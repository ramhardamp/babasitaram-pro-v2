import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (f) => readFileSync(f, 'utf8');
const PAGES = ['dashboard.html', 'index.html', 'signup.html', 'forgot-password.html', 'customer-view.html'];

/* ---------- theme.js: pure logic (fake DOM) ---------- */
function loadTheme({ stored = {}, systemDark = false } = {}) {
  const store = { ...stored }; const attrs = {}; const listeners = {}; const classes = new Set();
  const doc = {
    readyState: 'complete', documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } },
    querySelector: () => null, querySelectorAll: () => [], addEventListener: (e, f) => { listeners[e] = f; }, body: { appendChild() {} }, getElementById: () => null, createElement: () => ({ setAttribute() {}, className: '' })
  };
  const win = { addEventListener: (e, f) => { listeners['w:' + e] = f; }, matchMedia: () => ({ matches: systemDark, addEventListener() {} }), CustomEvent: class {}, dispatchEvent() {} };
  const ctx = vm.createContext({ document: doc, window: win, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, matchMedia: win.matchMedia, CustomEvent: win.CustomEvent, setTimeout, clearTimeout });
  vm.runInContext(read('theme.js'), ctx);
  return { T: win.BspTheme, store, attrs, classes };
}
test('theme.js: default light, set/toggle save hota hai, data-theme lagta hai', () => {
  const { T, store, attrs } = loadTheme();
  assert.equal(T.get(), 'light'); assert.equal(attrs['data-theme'], 'light');
  T.set('dark'); assert.equal(store.bsp_theme, 'dark'); assert.equal(attrs['data-theme'], 'dark');
  T.toggle(); assert.equal(store.bsp_theme, 'light'); assert.equal(attrs['data-theme'], 'light');
  T.toggle(); assert.equal(T.effective(), 'dark');
});
test('theme.js: galat value => light; purana bsp_dark_mode=1 => dark (migration)', () => {
  assert.equal(loadTheme({ stored: { bsp_theme: 'purple' } }).T.get(), 'light');
  const m = loadTheme({ stored: { bsp_dark_mode: '1' } }); assert.equal(m.T.get(), 'dark'); assert.equal(m.store.bsp_theme, 'dark');
});
test('theme.js: system mode phone ki setting follow karta hai; OS dark light ko force nahi karta', () => {
  assert.equal(loadTheme({ stored: { bsp_theme: 'system' }, systemDark: true }).attrs['data-theme'], 'dark');
  assert.equal(loadTheme({ stored: { bsp_theme: 'system' }, systemDark: false }).attrs['data-theme'], 'light');
  assert.equal(loadTheme({ stored: { bsp_theme: 'light' }, systemDark: true }).attrs['data-theme'], 'light');
});
test('theme.js: toggle ke waqt smooth class lagti hai', () => {
  const { T, classes } = loadTheme(); T.set('dark'); assert.ok(classes.has('theme-anim'));
});

/* ---------- har page par ek hi theme system ---------- */
test('THEME: har page par theme.js (head me sabse pehle) + theme.css; OS-media / body.dark-mode duplicate nahi', () => {
  for (const f of PAGES) {
    const s = read(f);
    assert.ok(s.includes('<script src="theme.js"></script>') && s.includes('href="theme.css"'), f);
    assert.ok(s.indexOf('theme.js') < s.indexOf('<style'), f + ': theme.js style se pehle');
    assert.ok(!/prefers-color-scheme:\s*dark/.test(s), f + ': OS media dark nahi');
    assert.ok(!s.includes('.dark-mode') && !s.includes('bsp_dark_mode'), f + ': purana dark-mode nahi');
  }
  const d = read('dashboard.html');
  assert.ok(!d.includes('toggleDarkMode') && !d.includes('applyDarkMode') && !d.includes('darkModeState'));
  assert.ok(d.includes('data-theme-toggle'), 'top-bar toggle');
});
test('THEME: ux-pro.js ke Settings rows BspTheme use karte hain (alag storage logic nahi)', () => {
  const u = read('ux-pro.js');
  assert.ok(u.includes('BspTheme.set(m)') && u.includes('data-theme-set'));
  assert.ok(!/localStorage\.setItem\(THEME_KEY/.test(u) && !u.includes("addEventListener('change', applyTheme)"));
});
test('THEME: dark palette ek hi jagah (theme.css), dashboard me navy/purple hardcode nahi', () => {
  const css = read('theme.css'); assert.ok(css.includes('html[data-theme="dark"]{color-scheme:dark;'));
  const d = read('dashboard.html'); for (const bad of ['#1b293d', '#182337', '#a78bfa', 'rgba(29,27,75']) assert.ok(!d.includes(bad), bad);
});
test('THEME: theme files offline cache + APK web build me', () => {
  for (const f of ['theme.js', 'theme.css']) { assert.ok(read('service-worker.js').includes('./' + f)); assert.ok(read('scripts/prepare-web.mjs').includes("'" + f + "'")); }
});

/* ---------- HOME v3: ek hi definition, page-scroll, overlap nahi ---------- */
function allCss() { const d = read('dashboard.html'); return (d.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n') + '\n' + read('ux-pro.css'); }
test('HOME: har home component ki CSS sirf ek jagah (V18/V19 layers hat gayi)', () => {
  const css = allCss();
  for (const sel of ['.customer-card', '.dash-hero', '.dash-split', '.customer-search-wrap', '.bottom-tabs', '.fab', '.top-bar']) {
    const n = (css.match(new RegExp('(^|[};\\n\\s])' + sel.replace(/[.]/g, '\\.') + '\\{', 'g')) || []).length;
    assert.equal(n, 1, sel + ' definitions=' + n);
  }
});
test('HOME: poora dashboard ek saath scroll hota hai; search+filters sticky; observer container par', () => {
  const d = read('dashboard.html'), c = read('ux-pro.css');
  assert.ok(!/\.screen#screen-dashboard\.active\s*\{/.test(allCss()), 'purana flex/overflow:hidden rule nahi');
  assert.ok(c.includes('#screen-dashboard.active{display:block'));
  assert.ok(/\.customer-search-wrap\{position:sticky/.test(c) && /\.tabs\{position:sticky/.test(c));
  assert.ok(d.includes("root:document.getElementById('screenContainer')"));
});
test('HOME: summary 2x2 grid, tabs 4 barabar column, FAB tabs ke upar', () => {
  const c = read('ux-pro.css');
  assert.ok(c.includes('.dash-split{display:grid;grid-template-columns:1fr 1fr'));
  assert.ok(c.includes('.bottom-tabs{position:absolute') && c.includes('grid-auto-flow:column;grid-auto-columns:1fr'));
  assert.ok(/\.fab\{[^}]*bottom:calc\(var\(--hv-tabs-h\) \+ 16px/.test(c));
});
test('HOME: customer screen par neeche 128px khaali jagah nahi (history poori neeche tak)', () => {
  assert.ok(read('ux-pro.css').includes('.screen-container.customer-mode{padding-bottom:calc(24px'));
  assert.ok(read('dashboard.html').includes("screenContainer.classList.toggle('customer-mode', name === 'customer')"));
});

/* ---------- Settings fixes ---------- */
test('SETTINGS: PIN badalte waqt purana PIN sirf ek baar (verify + lockout), phir seedha naya PIN', () => {
  const d = read('dashboard.html');
  const fn = d.slice(d.indexOf('function changePIN()'), d.indexOf('function setLang('));
  assert.ok(fn.includes('requirePIN(') && fn.includes("showPinScreen('change-new'") && !fn.includes('change-old'));
  assert.ok(!d.includes("pinMode==='change-old'"));
});

test('CUSTOMER: long history renders in bounded batches and can load older rows without deleting records', () => {
  const d = read('dashboard.html');
  assert.ok(d.includes('let customerHistoryRenderLimit = 100;'));
  assert.ok(d.includes('const visibleTxns=txns.slice(0,Math.max(1,customerHistoryRenderLimit));'));
  assert.ok(d.includes('function loadOlderCustomerHistory()'));
  assert.ok(d.includes("t('Load older transactions','पुरानी एंट्री देखें')"));
  assert.ok(d.includes('customerHistoryRenderLimit=100;'));
});
test('CUSTOMER: transaction amounts show no plus/minus signs; labels remain localized', () => {
  const d = read('dashboard.html');
  assert.ok(d.includes("label:t('Giving','दिया')"));
  assert.ok(d.includes("label:t('Received','मिला')"));
  assert.ok(!d.includes("label:t('Giving','दिया'),sign:'−'"));
  assert.ok(!d.includes("label:t('Received','मिला'),sign:'+'"));
  assert.ok(!d.includes("${m.sign}${fmt(amount)}"));
  assert.ok(!d.includes("${deleted?'':m.sign}${fmt(amount)}"));
  for (const page of ['customer-view.html','www/customer-view.html']) {
    const publicView = read(page);
    assert.ok(!publicView.includes("${m.sign}${fmt(amt)}"));
    assert.ok(!publicView.includes("sign: '+'") && !publicView.includes("sign: '-'"));
  }
  assert.ok(d.includes('.action-btn.Payment.primary') && d.includes('.action-btn.jama.primary'));
});
test('CUSTOMER: only history list scrolls inside bounded customer viewport', () => {
  const d = read('dashboard.html');
  assert.ok(d.includes('#screenContainer.customer-mode{display:flex;flex-direction:column;overflow:hidden!important'));
  assert.ok(d.includes('#screen-customer.active>#customerDetail{display:flex;flex:1 1 auto;flex-direction:column;min-height:0'));
  assert.ok(d.includes('#customerDetail>.txn-history-list{flex:1 1 auto;min-height:0;max-height:none;overflow-y:auto'));
});
