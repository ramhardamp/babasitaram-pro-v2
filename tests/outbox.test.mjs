import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const O = createRequire(import.meta.url)('../outbox.js');
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };
const E = (o = {}) => ({ key: 'k1', customerId: 'c1', type: 'udhaar', amount: 100, note: '', date: '2026-10-10', time: '10:00', dateTime: '2026-10-10T10:00:00', queuedAt: '2026-10-10T10:00:00Z', ...o });
const deps = (o = {}) => ({ isOnline: () => true, customerExists: () => true, exists: async () => false, commit: async () => {}, ...o });

test('add validates and refuses garbage instead of pretending to save', () => {
  const ob = O.create(mem(), 'u');
  for (const bad of [null, E({ key: '' }), E({ type: 'byaj_loan' }), E({ amount: 0 }), E({ amount: -5 }), E({ amount: 'x' })]) assert.equal(ob.add(bad).ok, false);
  assert.equal(ob.count(), 0);
});
test('same key added twice is stored once (no double queue)', () => {
  const ob = O.create(mem(), 'u'); ob.add(E()); assert.equal(ob.add(E()).duplicate, true); assert.equal(ob.count(), 1);
});
test('storage quota error is reported, not swallowed', () => {
  const s = mem(); s.setItem = () => { throw new Error('quota'); };
  assert.equal(O.create(s, 'u').add(E()).ok, false);
});
test('entries survive "app restart" (new outbox object, same storage) and are per-user', () => {
  const s = mem(); O.create(s, 'u1').add(E());
  assert.equal(O.create(s, 'u1').count(), 1); assert.equal(O.create(s, 'u2').count(), 0);
});
test('replay commits oldest first and clears the queue', async () => {
  const ob = O.create(mem(), 'u'); ob.add(E({ key: 'b', queuedAt: '2026-10-10T11:00:00Z' })); ob.add(E({ key: 'a', queuedAt: '2026-10-10T10:00:00Z' }));
  const order = []; const r = await O.replay(ob, deps({ commit: async e => order.push(e.key) }));
  assert.deepEqual(order, ['a', 'b']); assert.equal(r.synced, 2); assert.equal(ob.count(), 0);
});
test('IDEMPOTENT: if the doc already exists on server, nothing is written again', async () => {
  const ob = O.create(mem(), 'u'); ob.add(E()); let commits = 0;
  const r = await O.replay(ob, deps({ exists: async () => true, commit: async () => { commits++; } }));
  assert.equal(commits, 0); assert.equal(r.alreadyThere, 1); assert.equal(ob.count(), 0);
});
test('crash after commit but before cleanup -> second replay does not duplicate', async () => {
  const ob = O.create(mem(), 'u'); ob.add(E()); const server = new Set(); let commits = 0;
  const d = deps({ exists: async e => server.has(e.key), commit: async e => { server.add(e.key); commits++; throw Object.assign(new Error('net'), { code: 'unavailable' }); } });
  await O.replay(ob, d);                       // commit "succeeded" server-side but client saw an error -> entry kept
  assert.equal(ob.count(), 1);
  await O.replay(ob, d);                       // retry finds it on the server -> drops, no 2nd commit
  assert.equal(commits, 1); assert.equal(ob.count(), 0);
});
test('transient error keeps entry and stops (order preserved); nothing lost', async () => {
  const ob = O.create(mem(), 'u'); ob.add(E({ key: 'a' })); ob.add(E({ key: 'b', queuedAt: '2026-10-10T10:05:00Z' }));
  const r = await O.replay(ob, deps({ commit: async () => { throw Object.assign(new Error('x'), { code: 'unavailable' }); } }));
  assert.equal(r.stoppedOffline, true); assert.equal(ob.count(), 2); assert.equal(ob.pending().length, 2);
});
test('permanent error (permission / missing customer) is marked failed and stays visible', async () => {
  const ob = O.create(mem(), 'u'); ob.add(E({ key: 'a' })); ob.add(E({ key: 'b', customerId: 'gone', queuedAt: '2026-10-10T10:05:00Z' }));
  const r = await O.replay(ob, deps({ customerExists: id => id !== 'gone', commit: async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); } }));
  assert.equal(r.failed, 2); assert.equal(ob.failed().length, 2); assert.equal(ob.pending().length, 0);
  assert.equal(r.synced, 0);
});
test('goes offline mid-replay -> stops cleanly, remaining stay queued', async () => {
  const ob = O.create(mem(), 'u'); ob.add(E({ key: 'a' })); ob.add(E({ key: 'b', queuedAt: '2026-10-10T10:05:00Z' }));
  let n = 0; const r = await O.replay(ob, deps({ isOnline: () => n++ < 1 }));
  assert.equal(r.synced, 1); assert.equal(r.stoppedOffline, true); assert.equal(ob.count(), 1);
});
