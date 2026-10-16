import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('contact picker is user initiated, opt-in, and has a manual fallback', async () => {
  const html = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.match(html, /onclick="pickCustomerFromContacts\(\)"/);
  assert.match(html, /navigator\.contacts/);
  assert.match(html, /picker\.select\(\['name','tel','email'\],\{multiple:false\}\)/);
  assert.match(html, /Contact picker is not supported on this device/);
  assert.match(html, /Contact selected\. Review details, then save\./);
  assert.match(html, /async function saveCustomer\(\)/);
});


test('Android native contact picker is generated, registered, and user-selected only', async () => {
  const prep = await readFile(new URL('../scripts/prepare-android.mjs', import.meta.url), 'utf8');
  const shim = await readFile(new URL('../native-shim.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../dashboard.html', import.meta.url), 'utf8');
  assert.match(prep, /BsrContactsPickerPlugin\.java/);
  assert.match(prep, /Intent\(Intent\.ACTION_PICK, ContactsContract\.CommonDataKinds\.Phone\.CONTENT_URI\)/);
  assert.match(prep, /registerPlugin\(BsrContactsPickerPlugin\.class\)/);
  assert.match(shim, /'BsrContactsPicker'/);
  assert.match(html, /nativePicker\.pickContact\(\)/);
  assert.match(html, /Review details, then save/);
});
