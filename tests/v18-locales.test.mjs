import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const languages = ['en','hi','gu','mr','ne','te'];

test('V18 locale resources are integrated for all six supported languages', async () => {
  const dictionaries = await Promise.all(languages.map(async lang => [lang, JSON.parse(await readFile(new URL(`../assets/i18n/${lang}.json`, import.meta.url), 'utf8'))]));
  const map = Object.fromEntries(dictionaries);
  assert.deepEqual(Object.keys(map).sort(), [...languages].sort());
  const baseKeys = Object.keys(map.en).sort();
  assert.ok(baseKeys.length >= 190, `expected broad V18 locale coverage, got ${baseKeys.length}`);
  for (const lang of languages) {
    assert.deepEqual(Object.keys(map[lang]).sort(), baseKeys, `${lang} keys differ from English baseline`);
    for (const key of baseKeys) assert.equal(typeof map[lang][key], 'string', `${lang}.${key} must be a string`);
  }
});

test('dashboard exposes all six language choices and loads the V18 locale adapter', async () => {
  const html = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.match(html, /id="langSelect"/);
  for (const lang of languages) assert.match(html, new RegExp(`option value="${lang}"`));
  assert.match(html, /src="v18-i18n\.js"/);
});

test('language switch translates matching static text and accessibility attributes across locales', async () => {
  const html = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.match(html, /function translateStaticDom\(\)/);
  assert.match(html, /document\.createTreeWalker/);
  assert.match(html, /placeholder/);
  assert.match(html, /i18n\.supported\.map/);
});
