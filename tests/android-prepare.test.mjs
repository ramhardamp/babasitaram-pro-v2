// prepare-android.mjs ko Capacitor-7 jaise fake skeleton par chalata hai (Gradle/SDK ki zaroorat nahi).
// Ye "cap add android" ke baad ke patching ko deterministic aur idempotent saabit karta hai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const SCRIPT = resolve('scripts/prepare-android.mjs');
const PKG = 'com/bsrpro/digitalkhata';
function skeleton() {
  const dir = mkdtempSync(join(tmpdir(), 'bsr-android-'));
  const main = join(dir, 'android/app/src/main');
  mkdirSync(join(main, 'java', PKG), { recursive: true });
  writeFileSync(join(main, 'java', PKG, 'MainActivity.java'),
    'package com.bsrpro.digitalkhata;\n\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n}\n');
  writeFileSync(join(dir, 'android/app/build.gradle'), "apply plugin: 'com.android.application'\n\nandroid {\n}\n\ndependencies {\n    implementation fileTree(include: ['*.jar'], dir: 'libs')\n}\n");
  writeFileSync(join(main, 'AndroidManifest.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application android:label="x">\n        <activity android:name=".MainActivity" android:exported="true"/>\n    </application>\n    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n');
  return { dir, main };
}
const run = (dir, env = {}) => execFileSync('node', [SCRIPT], { cwd: dir, env: { ...process.env, ENABLE_DIRECT_SMS: '', ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const read = (main, rel) => readFileSync(join(main, rel), 'utf8');
function wellFormed(xml) { // simple tag balance (XML parser nahi): open == close + self-closing
  const tags = [...xml.matchAll(/<(\/?)([A-Za-z][\w:.-]*)[^>]*?(\/?)>/g)];
  const stack = [];
  for (const [, close, name, self] of tags) { if (self) continue; if (close) { if (stack.pop() !== name) return false; } else stack.push(name); }
  return stack.length === 0;
}

test('ENABLE_DIRECT_SMS=false (Play-safe): SEND_SMS / boot receiver manifest mein nahi', () => {
  const { dir, main } = skeleton(); run(dir, { ENABLE_DIRECT_SMS: 'false' });
  const m = read(main, 'AndroidManifest.xml');
  assert.ok(!m.includes('android.permission.SEND_SMS')); assert.ok(!m.includes('RECEIVE_BOOT_COMPLETED')); assert.ok(!m.includes('BsrSmsBootReceiver'));
  assert.ok(m.includes('android.permission.INTERNET')); assert.ok(wellFormed(m));
});
test('DEFAULT build: automatic SMS ON (SEND_SMS + receivers)', () => {
  const { dir, main } = skeleton(); run(dir);
  const m = read(main, 'AndroidManifest.xml');
  assert.ok(m.includes('android.permission.SEND_SMS')); assert.ok(m.includes('.BsrSmsAlarmReceiver')); assert.ok(m.includes('.BsrSmsBootReceiver')); assert.ok(wellFormed(m));
});
test('REGRESSION: plugin registerPlugin() super.onCreate() se PEHLE (warna SMS plugin "not implemented")', () => {
  const { dir, main } = skeleton(); run(dir);
  const a = read(main, `java/${PKG}/MainActivity.java`);
  const reg = a.indexOf('registerPlugin(BsrSmsSchedulerPlugin.class)'); const sup = a.indexOf('super.onCreate(savedInstanceState)');
  assert.ok(reg >= 0 && sup >= 0 && reg < sup, 'registerPlugin must come before super.onCreate');
  assert.equal((a.match(/registerPlugin\(BsrSmsSchedulerPlugin\.class\)/g) || []).length, 1);
});
test('MIGRATION: purana (galat order) prepared project ko ye script theek kar deta hai', () => {
  const { dir, main } = skeleton();
  const f = join(main, 'java', PKG, 'MainActivity.java');
  writeFileSync(f, 'package com.bsrpro.digitalkhata;\n\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n  @Override public void onCreate(android.os.Bundle savedInstanceState) { super.onCreate(savedInstanceState); registerPlugin(BsrSmsSchedulerPlugin.class); }\n}\n');
  run(dir);
  const a = readFileSync(f, 'utf8');
  assert.ok(a.indexOf('registerPlugin(BsrSmsSchedulerPlugin.class)') < a.indexOf('super.onCreate(savedInstanceState)'));
  assert.equal((a.match(/registerPlugin\(BsrSmsSchedulerPlugin/g) || []).length, 1); assert.equal((a.match(/registerPlugin\(BsrBiometricPlugin/g) || []).length, 1); assert.ok(a.includes('bsrSetupAndroidBack'));
});
test('direct SMS build: permission + receivers manifest mein', () => {
  const { dir, main } = skeleton(); run(dir, { ENABLE_DIRECT_SMS: 'true' });
  const m = read(main, 'AndroidManifest.xml');
  assert.ok(m.includes('android.permission.SEND_SMS')); assert.ok(m.includes('.BsrSmsAlarmReceiver')); assert.ok(m.includes('.BsrSmsBootReceiver')); assert.ok(wellFormed(m));
});
test('native Java files generate hote hain; MainActivity plugin + back handler patch', () => {
  const { dir, main } = skeleton(); run(dir);
  for (const f of ['BsrSmsSchedulerPlugin', 'BsrContactsPickerPlugin', 'BsrSmsAlarmReceiver', 'BsrSmsBootReceiver']) assert.ok(existsSync(join(main, 'java', PKG, f + '.java')), f);
  const a = read(main, `java/${PKG}/MainActivity.java`);
  assert.ok(a.includes('registerPlugin(BsrSmsSchedulerPlugin.class)')); assert.ok(a.includes('registerPlugin(BsrContactsPickerPlugin.class)')); assert.ok(a.indexOf('registerPlugin(BsrContactsPickerPlugin.class)') < a.indexOf('super.onCreate(savedInstanceState)')); assert.ok(a.includes('bsrSetupAndroidBack')); assert.ok(a.includes('OnBackPressedCallback'));
  assert.equal((a.match(/public class MainActivity/g) || []).length, 1);
});
test('idempotent: dobara chalane par koi file nahi badalti', () => {
  for (const env of [{}, { ENABLE_DIRECT_SMS: 'true' }, { ENABLE_DIRECT_SMS: 'false' }]) {
    const { dir, main } = skeleton(); run(dir, env);
    const snap = ['AndroidManifest.xml', `java/${PKG}/MainActivity.java`, `java/${PKG}/BsrSmsSchedulerPlugin.java`].map(f => read(main, f));
    run(dir, env);
    assert.deepEqual(['AndroidManifest.xml', `java/${PKG}/MainActivity.java`, `java/${PKG}/BsrSmsSchedulerPlugin.java`].map(f => read(main, f)), snap);
  }
});
test('unknown MainActivity template par saaf error (silently galat patch nahi)', () => {
  const { dir, main } = skeleton();
  writeFileSync(join(main, 'java', PKG, 'MainActivity.java'), 'package x; class Other {}');
  assert.throws(() => run(dir), /Command failed/);
});

test('BIOMETRIC: plugin file + registration BEFORE super.onCreate + gradle dep + USE_BIOMETRIC', () => {
  const { dir, main } = skeleton(); run(dir);
  assert.ok(existsSync(join(main, 'java', PKG, 'BsrBiometricPlugin.java')));
  const j = read(main, `java/${PKG}/BsrBiometricPlugin.java`);
  assert.ok(j.includes('name = "BsrBiometric"')); assert.ok(j.includes('BiometricPrompt')); assert.ok(j.includes('@PluginMethod public void authenticate'));
  const a = read(main, `java/${PKG}/MainActivity.java`);
  const b = a.indexOf('registerPlugin(BsrBiometricPlugin.class)'); const sup = a.indexOf('super.onCreate(savedInstanceState)');
  assert.ok(b >= 0 && b < sup, 'biometric plugin must be registered before super.onCreate');
  assert.equal((a.match(/registerPlugin\(BsrBiometricPlugin\.class\)/g) || []).length, 1);
  const g = readFileSync(join(dir, 'android/app/build.gradle'), 'utf8');
  assert.equal((g.match(/androidx\.biometric:biometric/g) || []).length, 1);
  assert.ok(read(main, 'AndroidManifest.xml').includes('android.permission.USE_BIOMETRIC'));
});
test('BIOMETRIC works in the Play-safe build too (no SMS permission needed)', () => {
  const { dir, main } = skeleton(); run(dir, { ENABLE_DIRECT_SMS: 'false' });
  const m = read(main, 'AndroidManifest.xml');
  assert.ok(m.includes('android.permission.USE_BIOMETRIC')); assert.ok(!m.includes('android.permission.SEND_SMS'));
});
test('MIGRATION: project prepared by previous version (SMS plugin only) gets biometric registered', () => {
  const { dir, main } = skeleton();
  const f = join(main, 'java', PKG, 'MainActivity.java');
  writeFileSync(f, 'package com.bsrpro.digitalkhata;\n\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n  @Override public void onCreate(android.os.Bundle savedInstanceState) { registerPlugin(BsrSmsSchedulerPlugin.class); super.onCreate(savedInstanceState); bsrSetupAndroidBack(); }\n  private void bsrSetupAndroidBack() {}\n}\n');
  run(dir);
  const a = readFileSync(f, 'utf8');
  assert.ok(a.indexOf('registerPlugin(BsrBiometricPlugin.class)') < a.indexOf('super.onCreate(savedInstanceState)'));
  assert.equal((a.match(/registerPlugin\(BsrSmsSchedulerPlugin/g) || []).length, 1);
  assert.equal((a.match(/bsrSetupAndroidBack\(\);/g) || []).length, 1);
});
test('native shim exposes BsrBiometric proxy', () => {
  assert.ok(readFileSync('native-shim.js', 'utf8').includes("'BsrBiometric'"));
});

test('SMS "Restricted settings" fix: native openAppSettings (App info kholta hai) generate hota hai', () => {
  const { dir, main } = skeleton(); run(dir);
  const j = read(main, `java/${PKG}/BsrSmsSchedulerPlugin.java`);
  assert.ok(j.includes('void openAppSettings(PluginCall call)')); assert.ok(j.includes('ACTION_APPLICATION_DETAILS_SETTINGS'));
});


test('CONTACTS: system picker plugin is generated and needs no broad READ_CONTACTS permission', () => {
  const { dir, main } = skeleton(); run(dir);
  const j = read(main, `java/${PKG}/BsrContactsPickerPlugin.java`);
  assert.ok(j.includes('Intent.ACTION_PICK'));
  assert.ok(j.includes('ContactsContract.CommonDataKinds.Phone.CONTENT_URI'));
  assert.ok(j.includes('startActivityForResult(call, intent, "contactPicked")'));
  assert.ok(!read(main, 'AndroidManifest.xml').includes('android.permission.READ_CONTACTS'));
  const a = read(main, `java/${PKG}/MainActivity.java`);
  assert.ok(a.indexOf('registerPlugin(BsrContactsPickerPlugin.class)') < a.indexOf('super.onCreate(savedInstanceState)'));
});
