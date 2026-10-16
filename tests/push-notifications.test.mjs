import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = (p) => readFile(new URL('../' + p, import.meta.url), 'utf8');

test('push notification settings are wired to the consent-first client module', async () => {
  const html = await read('dashboard.html');
  const js = await read('push-notifications.js');
  assert.match(html, /id="pushNotificationsToggle"/);
  assert.match(html, /onclick="togglePushNotifications\(\)"/);
  assert.match(html, /src="push-notifications\.js"/);
  assert.match(js, /BsrPushNotifications/);
  assert.match(js, /collection\('pushTokens'\)/);
  assert.match(js, /function disable\(\)/);
});

test('push tokens are owner-only and sender functions require authentication/admin', async () => {
  const rules = await read('firestore.rules');
  const fn = await read('functions/index.js');
  assert.match(rules, /match \/pushTokens\/\{tokenId\}/);
  assert.match(rules, /allow create, update: if isOwner\(userId\)/);
  assert.match(fn, /exports\.sendTestPush = onCall/);
  assert.match(fn, /request\.auth\.token\.admin !== true/);
  assert.match(fn, /sendEachForMulticast/);
});

test('Android platform scaffold and native FCM plugin are present', async () => {
  const main = await read('android/app/src/main/java/com/bsrpro/digitalkhata/MainActivity.java');
  const prep = await read('scripts/prepare-android.mjs');
  const gradle = await read('android/app/build.gradle');
  const manifest = await read('android/app/src/main/AndroidManifest.xml');
  await access(new URL('../android/settings.gradle', import.meta.url));
  await access(new URL('../android/gradle/wrapper/gradle-wrapper.properties', import.meta.url));
  assert.match(main, /BridgeActivity/);
  assert.match(prep, /BsrPushNotificationsPlugin\.java/);
  assert.match(prep, /registerPlugin\(BsrPushNotificationsPlugin\.class\)/);
  const nativePush = await read('android/app/src/main/java/com/bsrpro/digitalkhata/BsrPushNotificationsPlugin.java');
  const nativeService = await read('android/app/src/main/java/com/bsrpro/digitalkhata/BsrFirebaseMessagingService.java');
  const activity = await read('android/app/src/main/java/com/bsrpro/digitalkhata/MainActivity.java');
  assert.match(nativePush, /FirebaseMessaging\.getInstance\(\)\.getToken/);
  assert.match(nativeService, /onMessageReceived/);
  assert.match(activity, /registerPlugin\(BsrPushNotificationsPlugin\.class\)/);
  assert.match(activity, /ensureChannel\(this\)/);
  assert.match(gradle, /firebase-messaging:24\.1\.0/);
  assert.match(manifest, /POST_NOTIFICATIONS/);
});

test('web packaging and offline shell include push client module', async () => {
  const prep = await read('scripts/prepare-web.mjs');
  const sw = await read('service-worker.js');
  assert.match(prep, /'push-notifications\.js'/);
  assert.match(sw, /'\.\/push-notifications\.js'/);
});
