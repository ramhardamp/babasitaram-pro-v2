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
- [ ] Firestore Rules audit — source not present in repository.
- [ ] PublicViews security audit — depends on actual Firestore Rules.
- [ ] Customer delete strategy — must be made non-destructive/rollback-safe before production merge.
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

## Important unresolved blockers
1. Actual Firestore Rules are required before security can be marked PASS.
2. Android Autofill cannot be fully verified from this repository because Android source is absent.
3. Customer deletion currently performs multiple destructive steps and must be redesigned before production release.

## Working rule for future chats
Continue from this file and the branch state. Do not restart the audit or assume production is safe merely because the branch passes static checks.
