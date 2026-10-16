import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const languages = ['en','hi','gu','mr','ne','te'];
const locales = Object.fromEntries(languages.map(lang => [lang, JSON.parse(fs.readFileSync(path.join(root,'assets/i18n',`${lang}.json`),'utf8'))]));
const sourceAliases = [
  'Data load ho raha hai...',
  'PIN, dark mode और language',
  'English / हिंदी · ગુજરાતી · मराठी · नेपाली · తెలుగు',
  'Automatic SMS और reminders',
  'Integrity check, backup और export',
  'पुराने balance को recalculate करें',
  'पुराने customers के लिए public link',
  'Signup - BSRPRO Digital Khata'
];
test('all six locale dictionaries have identical keys and non-empty values', () => {
  const keys = Object.keys(locales.en).sort();
  assert.equal(keys.length, 435);
  for (const lang of languages) {
    assert.deepEqual(Object.keys(locales[lang]).sort(), keys, `${lang} key parity`);
    for (const key of keys) assert.ok(String(locales[lang][key]).trim(), `${lang}.${key} empty`);
  }
});
test('non-dashboard pages load the locale adapter and all locale JSON resources are packaged', () => {
  for (const page of ['index.html','signup.html','forgot-password.html','customer-view.html']) {
    const html = fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html, /v18-i18n\.js/);
    assert.match(html, /localize-pages\.js/);
  }
  const packager = fs.readFileSync(path.join(root,'scripts/prepare-web.mjs'),'utf8');
  assert.match(packager, /assets\/i18n\/te\.json/);
  const sw = fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.match(sw, /assets\/i18n\/gu\.json/);
});
test('all identified mixed-language page strings have source aliases for localization', () => {
  const bundle = fs.readFileSync(path.join(root,'v18-i18n.js'),'utf8');
  for (const phrase of sourceAliases) assert.ok(bundle.includes(phrase), `missing alias ${phrase}`);
  assert.match(bundle, /sourceAliases/);
});
test('page titles are passed through the selected locale lookup', () => {
  const shared = fs.readFileSync(path.join(root,'localize-pages.js'),'utf8');
  const dashboard = fs.readFileSync(path.join(root,'dashboard.html'),'utf8');
  assert.match(shared, /document\.title\s*=\s*lookup\(document\.title\)/);
  assert.match(dashboard, /document\.title=lookup\(document\.title\)/);
});
