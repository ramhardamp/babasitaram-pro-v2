const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
initializeApp();
const db = getFirestore();

async function sendToUid(uid, title, body, data = {}) {
  const snap = await db.collection('users').doc(uid).collection('pushTokens').get();
  const tokens = snap.docs.map(d => ({ id: d.id, token: d.get('token') })).filter(x => typeof x.token === 'string' && x.token.length >= 20);
  if (!tokens.length) return { sent: 0, reason: 'no_registered_devices' };
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const result = await getMessaging().sendEachForMulticast({
      tokens: batch.map(x => x.token),
      notification: { title: String(title).slice(0, 80), body: String(body).slice(0, 240) },
      data: Object.fromEntries(Object.entries(data).slice(0, 10).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 500)])),
      android: { priority: 'high', notification: { channelId: 'bsrpro_updates' } }
    });
    sent += result.successCount;
    const cleanup = db.batch();
    result.responses.forEach((r, idx) => {
      if (!r.success && ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(r.error && r.error.code)) {
        cleanup.delete(db.collection('users').doc(uid).collection('pushTokens').doc(batch[idx].id));
      }
    });
    await cleanup.commit();
  }
  return { sent, registered: tokens.length };
}

exports.sendTestPush = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return sendToUid(request.auth.uid, 'BSR Pro test notification', 'Push notifications are connected to this device.');
});

exports.sendPushToUser = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (request.auth.token.admin !== true) throw new HttpsError('permission-denied', 'Admin claim required.');
  const uid = String(request.data && request.data.uid || '').trim();
  const title = String(request.data && request.data.title || '').trim();
  const body = String(request.data && request.data.body || '').trim();
  if (!uid || !title || !body) throw new HttpsError('invalid-argument', 'uid, title and body are required.');
  return sendToUid(uid, title, body, request.data && request.data.data || {});
});
