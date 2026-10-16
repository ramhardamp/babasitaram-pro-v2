import test from 'node:test';
import assert from 'node:assert/strict';
import { patchSigning, patchDebugSigning } from '../scripts/configure-android-signing.mjs';
import { readFileSync } from 'node:fs';

const GRADLE = `android {
    namespace "com.bsrpro.digitalkhata"
    defaultConfig {
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
`;
test('signing patch: release block signingConfig use karta hai, secrets file mein nahi', () => {
  const out = patchSigning(GRADLE);
  assert.match(out, /signingConfigs \{\s*release \{/); assert.match(out, /release \{\s*signingConfig signingConfigs\.release/);
  assert.match(out, /System\.getenv\('KEYSTORE_PASSWORD'\)/);
  assert.ok(out.indexOf('signingConfigs {') < out.indexOf('buildTypes {'));
  assert.ok(!/storePassword\s+['"]/.test(out));
});
test('signing patch idempotent; unknown template par error', () => {
  const once = patchSigning(GRADLE); assert.equal(patchSigning(once), once);
  assert.throws(() => patchSigning('apply plugin: "x"'), /not found/);
});
test('release workflow: tag == package.json, secrets required, signed artifacts, draft release', () => {
  const y = readFileSync('.github/workflows/release.yml', 'utf8');
  for (const s of ["tags:", "'v*'", 'package.json', 'ANDROID_KEYSTORE_BASE64', 'assembleRelease', 'bundleRelease', 'apksigner', 'SHA256SUMS', '--draft'])
    assert.ok(y.includes(s), s);
  assert.ok(!y.includes('assembleDebug'));
});

test('debug signing: debug build bhi release key se sign (har APK ka signature same => update chalega)', () => {
  const out = patchDebugSigning(patchSigning(GRADLE));
  assert.match(out, /buildTypes \{\s*debug \{\s*signingConfig signingConfigs\.release/);
  assert.equal(patchDebugSigning(out), out); // idempotent
  assert.throws(() => patchDebugSigning(GRADLE), /patchSigning must run first/);
});
test('android-ci: persistent key step maujood, secrets na ho to (non-PR) build fail', () => {
  const y = readFileSync('.github/workflows/android-ci.yml', 'utf8');
  for (const s of ['configure-android-signing.mjs --debug', 'ANDROID_KEYSTORE_BASE64', '--print-certs', 'exit 1'])
    assert.ok(y.includes(s), s);
  assert.ok(y.indexOf('configure-android-signing.mjs --debug') < y.indexOf('./gradlew assembleDebug'));
});
