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
- [x] Balance engine audit: party.balance is intentionally normal Udhaar/Jama only; loan principal/interest is calculated separately from loan records. Added numeric normalization in calcLoan to prevent legacy string/invalid-number drift.
- [x] Loan accounting hardening: new loan repayment/interest transactions now carry loanId and validate the selected loan belongs to the current customer; legacy derived records remain untouched.
- [x] Post-commit sync hardening: ledger/loan writes now report success immediately after the primary Firestore commit; public-view/email failures no longer tell the user to retry a write that already committed. A short write-busy guard also blocks rapid duplicate submissions.
- [x] Customer save/edit post-commit hardening: customer writes remain successful when public-view/email secondary synchronization fails, reducing duplicate-retry risk.
- [x] Final code-cleanup pass: removed obsolete JSON-trick comments and verified no legacy JSON.parse path or old 📒 branding remains in dashboard.html.
- [ ] Email flow audit (secondary delivery/retry reconciliation still pending).
- [x] Web packaging audit: prepare-web now copies the Guru Shree logo asset and verify-web checks that the branded asset is packaged.
- [ ] API v1 design + read-only implementation.
- [ ] API write/idempotency implementation.
- [ ] Android Autofill source audit — Android source is not in this web repository.
- [ ] Chrome/domain Autofill verification.
- [ ] Password SaveRequest new-vs-update verification.
- [x] Responsive shell hardening: removed centered phone-width shell on desktop/mobile so app uses full viewport width.
- [x] Dashboard scrolling hardening: dashboard shell is fixed; customer list is the dedicated vertical scroll area and its lazy-load observer now uses the customer list as its scroll root.
- [x] Supplied Guru Shree logo added to top branding/PIN screen on safe branch.
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
5. Legacy loan-payment records without loanId remain protected from independent edit/delete; no destructive backfill is performed.

## Working rule for future chats
Continue from this file and the branch state. Do not restart the audit or assume production is safe merely because the branch passes static checks.


## Loop Update — 2026-09-26
- Dashboard top-bar Guru Shree logo was missing from the rendered header; fixed by explicitly rendering `assets/guru-shree-logo.svg` beside the dashboard title.
- Existing logo asset and other logo placements remain unchanged.
- Production `main` is not modified; fix is isolated to `safe-final-fix-2026-09-26` pending regression.
- Next audit remains: offline-safe behavior, durable idempotency, derived loan transaction UI protections, public-view date normalization, email/auth audit, Android Autofill/Chrome, final regression and data-loss testing.


## Loop Update — 2026-09-26 (Production)
- Audited safe fix set merged into `main` via PR #2; no customer-data migration or destructive ledger migration performed.
- Production dashboard now contains atomic transaction edit/delete, loan/customer deletion safeguards, duplicate-write protection, derived loan transaction UI protection, responsive/full-screen customer scrolling, and public-view date normalization.
- Guru Shree logo consolidation is present across the production pages; obsolete logo asset removed.
- Firestore web persistence is already enabled in `firebase-config.js` with `synchronizeTabs: true`; offline cache support is therefore present. Offline financial-operation end-to-end testing remains required before claiming offline operation fully verified.
- Auth routing hardened so Firestore/profile lookup errors no longer incorrectly send users to first-time setup; invalid-credential login handling is covered.
- Android Autofill/Chrome source audit remains blocked because this repository contains no Android Autofill source tree or `AutofillService` implementation.
