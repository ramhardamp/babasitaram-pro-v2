# BABASITARAM PRO — Master Fix State

## Non-negotiable production rule
- Existing customer data, transaction history, balances, public tokens and auth accounts must not be deleted or migrated destructively.
- No production schema migration without verified backup and rollback.
- Fixes are staged on branch `safe-final-fix-2026-09-26` before merge to `main`.

## Current phases
- [x] Safety branch created from main.
- [x] Existing transaction-save path reviewed.
- [x] Transaction edit changed to atomic Firestore transaction.
- [x] Transaction delete changed to atomic Firestore transaction.
- [x] Loan principal edit is blocked after repayment history exists.
- [x] Loan delete is blocked when payment history exists.
- [x] dashboard.html JavaScript syntax verified by extracting all script blocks and compiling them.
- [x] Production Firestore Rules captured from Firebase Console and added to safe branch.
- [x] PublicViews security baseline tightened: public read retained; writes/deletes restricted to owning business UID.
- [x] Customer deletion hardened: customers with ledger history are never destructively deleted; zero-history deletion is transaction-protected.
- [ ] Balance engine full audit.
- [ ] Email flow audit.
- [ ] API v1 design + read-only implementation.
- [ ] API write/idempotency implementation.
- [ ] Android Autofill source audit — Android source is not in this web repository.
- [ ] Chrome/domain Autofill verification.
- [ ] Password SaveRequest new-vs-update verification.
- [ ] Full regression test.
- [ ] Production merge.

## Changes already committed on this branch
1. `70509b1` — atomic transaction edit/delete balance updates.
2. `54546e0` — protect loan payment history from destructive edit/delete.
3. `400a0e6` — add audited Firestore Rules baseline on safe branch.
4. `1342e40` — prevent destructive customer deletion and independent loan-payment transaction edits.

## Important unresolved blockers
1. Firestore Rules still need live Emulator/Rules Playground verification against every production write path before release.
2. Android Autofill cannot be fully verified from this repository because Android source is absent.
3. Balance engine, loan accounting, email, API, and regression testing remain pending.
4. Production merge remains blocked until backup/data-integrity and live regression checks pass.

## Working rule for future chats
Continue from this file and the branch state. Do not restart the audit or assume production is safe merely because the branch passes static checks.
