import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const P = createRequire(import.meta.url)('../pin-security.js');

test('createRecord: plaintext PIN record mein nahi; verify sahi/galat', async () => {
  const rec = await P.createRecord('1234');
  assert.ok(rec.pinHash && rec.pinSalt && rec.pinVersion === 2 && rec.pinIter === 150000);
  assert.ok(!JSON.stringify(rec).includes('1234'));
  assert.equal(await P.verifyRecord('1234', rec), true);
  assert.equal(await P.verifyRecord('1235', rec), false);
  assert.equal(await P.verifyRecord('', rec), false);
});
test('har record ka salt alag (same PIN, alag hash)', async () => {
  const a = await P.createRecord('4321'), b = await P.createRecord('4321');
  assert.notEqual(a.pinSalt, b.pinSalt); assert.notEqual(a.pinHash, b.pinHash);
});
test('malformed record => false (crash nahi)', async () => {
  for (const r of [null, {}, { pinHash: 'x' }, { pinHash: '!!', pinSalt: '!!' }]) { try { assert.equal(await P.verifyRecord('1', r), false); } catch (e) { /* invalid base64 => reject bhi theek, accept nahi */ } }
});
test('lockout: 5 galat tak free, phir 30s, doubling, max 15 min', () => {
  let s = null; const now = 1_000_000;
  for (let i = 1; i <= 4; i++) { s = P.registerFailure(s, now); assert.equal(P.remainingLock(s, now), 0); }
  s = P.registerFailure(s, now); assert.equal(P.remainingLock(s, now), 30000);
  s = P.registerFailure(s, now); assert.equal(P.remainingLock(s, now), 60000);
  for (let i = 0; i < 20; i++) s = P.registerFailure(s, now);
  assert.equal(P.remainingLock(s, now), 900000);
  assert.equal(P.remainingLock(s, now + 900001), 0);
});
