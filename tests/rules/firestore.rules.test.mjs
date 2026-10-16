// Firestore Emulator par chalta hai:  npm run test:rules   (CI: .github/workflows/web-ci.yml 'rules' job)
import test, { before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const A = 'ownerA', B = 'ownerB';
const TOK = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345', TOK2 = 'ZyXwVuTsRqPoNmLkJiHgFeDcBa987654';
let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-bsrpro', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const u of [A, B]) { await setDoc(doc(db, `users/${u}`), { uid: u, email: `${u}@x.com` }); await setDoc(doc(db, `users/${u}/parties/p1`), { name: 'Ram', balance: 0 }); }
    await setDoc(doc(db, `users/${A}/transactions/t1`), { partyId: 'p1', type: 'udhaar', amount: 500, createdAt: Timestamp.now() });
    await setDoc(doc(db, `publicViews/${TOK}`), { businessUid: A, partyId: 'p1', customerName: 'Ram' });
  });
});
const dbA = () => env.authenticatedContext(A).firestore(), dbB = () => env.authenticatedContext(B).firestore(), dbN = () => env.unauthenticatedContext().firestore();
const txn = (o = {}) => ({ partyId: 'p1', type: 'udhaar', amount: 100, createdAt: serverTimestamp(), ...o });

test('unauthenticated: private ledger read/write band', async () => {
  await assertFails(getDoc(doc(dbN(), `users/${A}`)));
  await assertFails(getDoc(doc(dbN(), `users/${A}/transactions/t1`)));
  await assertFails(setDoc(doc(dbN(), `users/${A}/transactions/x`), txn()));
});
test('owner B kabhi owner A ka private ledger read/write nahi kar sakta', async () => {
  await assertFails(getDoc(doc(dbB(), `users/${A}`)));
  await assertFails(getDocs(collection(dbB(), `users/${A}/transactions`)));
  await assertFails(setDoc(doc(dbB(), `users/${A}/transactions/x`), txn()));
  await assertFails(updateDoc(doc(dbB(), `users/${A}/parties/p1`), { name: 'hacked' }));
});
test('owner A: valid udhaar create + read', async () => {
  await assertSucceeds(setDoc(doc(dbA(), `users/${A}/transactions/ok1`), txn()));
  await assertSucceeds(getDoc(doc(dbA(), `users/${A}/transactions/t1`)));
});
test('invalid type / negative / zero / NaN-string amount / forged createdAt reject', async () => {
  const d = dbA();
  await assertFails(setDoc(doc(d, `users/${A}/transactions/b1`), txn({ type: 'gift' })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/b2`), txn({ amount: -5 })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/b3`), txn({ amount: 0 })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/b4`), txn({ amount: '100' })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/b5`), txn({ amount: 1e12 })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/b6`), txn({ createdAt: Timestamp.fromDate(new Date('2001-01-01')) })));
});
test('transaction missing customer (orphan) reject', async () => {
  await assertFails(setDoc(doc(dbA(), `users/${A}/transactions/o1`), txn({ partyId: 'nope' })));
});
test('loan create validation: principal > 0, rate >= 0; repay/interest need loanId', async () => {
  const d = dbA();
  const loan = (o = {}) => ({ partyId: 'p1', type: 'byaj_loan', principal: 1000, rate: 2, status: 'active', interestPaid: 0, repayments: [], loanId: 'L1', createdAt: serverTimestamp(), ...o });
  await assertSucceeds(setDoc(doc(d, `users/${A}/transactions/L1`), loan()));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/L2`), loan({ principal: -1 })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/L3`), loan({ rate: -1 })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/R1`), txn({ type: 'loan_repay' })));
  await assertSucceeds(setDoc(doc(d, `users/${A}/transactions/R2`), txn({ type: 'loan_repay', loanId: 'L1' })));
});
test('update: partyId / type immutable; amount > 0', async () => {
  const r = doc(dbA(), `users/${A}/transactions/t1`);
  await assertFails(updateDoc(r, { partyId: 'other' }));
  await assertFails(updateDoc(r, { type: 'jama' }));
  await assertFails(updateDoc(r, { amount: -1 }));
  await assertSucceeds(updateDoc(r, { amount: 750, note: 'edit' }));
});
test('soft delete ok (deletedBy = apna uid); forged deletedBy reject; deleted record wapas nahi khulta', async () => {
  const r = doc(dbA(), `users/${A}/transactions/t1`);
  await assertFails(updateDoc(r, { status: 'deleted', deletedBy: B }));
  await assertSucceeds(updateDoc(r, { status: 'deleted', deletedBy: A, deletedAt: serverTimestamp() }));
  await assertFails(updateDoc(r, { status: 'active' }));
  await assertFails(updateDoc(r, { amount: 5 }));
});
test('hard delete of transaction band (owner ke liye bhi)', async () => {
  await assertFails(deleteDoc(doc(dbA(), `users/${A}/transactions/t1`)));
});
test('party: name required, balance number, viewToken well-formed', async () => {
  const d = dbA();
  await assertSucceeds(setDoc(doc(d, `users/${A}/parties/p2`), { name: 'Shyam', balance: 0, viewToken: TOK2 }));
  await assertFails(setDoc(doc(d, `users/${A}/parties/p3`), { name: '', balance: 0 }));
  await assertFails(setDoc(doc(d, `users/${A}/parties/p4`), { name: 'X', balance: 'zero' }));
  await assertFails(setDoc(doc(d, `users/${A}/parties/p5`), { name: 'X', balance: 0, viewToken: '../x' }));
});
test('user doc: forged uid reject; account delete band', async () => {
  await assertFails(updateDoc(doc(dbA(), `users/${A}`), { uid: B }));
  await assertFails(deleteDoc(doc(dbA(), `users/${A}`)));
  await assertSucceeds(updateDoc(doc(dbA(), `users/${A}`), { shopName: 'Guru Shop' }));
});
test('publicViews: anyone get(token) ok, list band, malformed token band', async () => {
  await assertSucceeds(getDoc(doc(dbN(), `publicViews/${TOK}`)));
  await assertFails(getDocs(collection(dbN(), 'publicViews')));
  await assertFails(getDoc(doc(dbN(), 'publicViews/short')));
});
test('publicViews: owner B A ka view overwrite/delete nahi kar sakta', async () => {
  const r = doc(dbB(), `publicViews/${TOK}`);
  await assertFails(setDoc(r, { businessUid: B, partyId: 'p1' }));
  await assertFails(updateDoc(r, { customerName: 'hacked' }));
  await assertFails(deleteDoc(r));
});
test('publicViews: businessUid forge / unauth create reject; owner create ok', async () => {
  await assertFails(setDoc(doc(dbB(), `publicViews/${TOK2}`), { businessUid: A, partyId: 'p1' }));
  await assertFails(setDoc(doc(dbN(), `publicViews/${TOK2}`), { businessUid: A, partyId: 'p1' }));
  await assertFails(setDoc(doc(dbA(), `publicViews/${TOK2}`), { businessUid: A, partyId: 'ghost' }));
  await assertSucceeds(setDoc(doc(dbA(), `publicViews/${TOK2}`), { businessUid: A, partyId: 'p1', updatedAt: serverTimestamp() }));
});
test('publicViews: owner update ok but partyId / businessUid badal nahi sakta', async () => {
  const r = doc(dbA(), `publicViews/${TOK}`);
  await assertSucceeds(setDoc(r, { businessUid: A, partyId: 'p1', totalOutstanding: 10 }, { merge: true }));
  await assertFails(updateDoc(r, { partyId: 'p9' }));
  await assertFails(updateDoc(r, { businessUid: B }));
});
test('publicViews: revoked / expired link public ko nahi, owner ko dikhta hai', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `publicViews/${TOK2}`), { businessUid: A, partyId: 'p1', revokedAt: Timestamp.now() });
    await setDoc(doc(ctx.firestore(), `publicViews/${TOK.replace('A', 'Q')}`), { businessUid: A, partyId: 'p1', expiresAt: Timestamp.fromDate(new Date('2001-01-01')) });
  });
  await assertFails(getDoc(doc(dbN(), `publicViews/${TOK2}`)));
  await assertFails(getDoc(doc(dbN(), `publicViews/${TOK.replace('A', 'Q')}`)));
  await assertSucceeds(getDoc(doc(dbA(), `publicViews/${TOK2}`)));
});
test('unknown collection band', async () => {
  await assertFails(setDoc(doc(dbA(), 'secrets/x'), { a: 1 }));
});

// ---- Import-backup write shapes (added with backup-import.js) ----
test('import: new customer then txns+balance in ONE batch is allowed for owner; other owner cannot', async () => {
  const { writeBatch, increment } = await import('firebase/firestore');
  const d = dbA();
  await assertSucceeds(setDoc(doc(d, `users/${A}/parties/imp1`), { name: 'Imported', phone: '', email: '', balance: 0, viewToken: TOK2, importBatchId: 'imp-x' }));
  const b = writeBatch(d);
  b.set(doc(d, `users/${A}/transactions/i1`), txn({ partyId: 'imp1', amount: 300, importBatchId: 'imp-x', originalCreatedAt: { seconds: 1, nanoseconds: 0 } }));
  b.set(doc(d, `users/${A}/transactions/i2`), { partyId: 'imp1', type: 'byaj_loan', principal: 1000, rate: 2, repayments: [], createdAt: serverTimestamp() });
  b.set(doc(d, `users/${A}/transactions/i3`), txn({ partyId: 'imp1', type: 'loan_repay', amount: 100, loanId: 'i2' }));
  b.update(doc(d, `users/${A}/parties/imp1`), { balance: increment(300) });
  await assertSucceeds(b.commit());
  await assertFails(setDoc(doc(dbB(), `users/${A}/parties/imp2`), { name: 'x', balance: 0 }));
});
test('import: deleted record cannot be created and original createdAt cannot be forged', async () => {
  const d = dbA();
  await assertFails(setDoc(doc(d, `users/${A}/transactions/bad1`), txn({ status: 'deleted' })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/bad2`), txn({ createdAt: Timestamp.fromDate(new Date('2020-01-01')) })));
  await assertFails(setDoc(doc(d, `users/${A}/transactions/bad3`), txn({ partyId: 'does-not-exist' })));
});
test('import: empty party rollback (delete) allowed, financial history hard-delete still blocked', async () => {
  const d = dbA();
  await setDoc(doc(d, `users/${A}/parties/imp3`), { name: 'Tmp', balance: 0, viewToken: TOK2 });
  await assertSucceeds(deleteDoc(doc(d, `users/${A}/parties/imp3`)));
  await assertFails(deleteDoc(doc(d, `users/${A}/transactions/t1`)));
});
