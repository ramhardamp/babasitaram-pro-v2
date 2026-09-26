# BABASITARAM PRO — Master Fix State

## Production safety rule
- Existing customer data, transaction history, balances, public tokens and auth accounts must not be deleted or migrated destructively.
- No production schema migration was performed.
- All fixes are non-destructive and preserve legacy records.

## Final audited state — 2026-09-26
- [x] Atomic normal transaction save using Firestore batch.
- [x] Atomic transaction edit/delete using Firestore transactions.
- [x] Duplicate-write guard for rapid financial submissions.
- [x] Customer deletion protected: any ledger history blocks deletion; zero-history deletion is transaction-protected.
- [x] Loan principal edit/delete protected when repayment/interest history exists.
- [x] Derived loan repayment/interest records cannot be independently edited/deleted.
- [x] New loan-derived records carry loanId and validate ownership; legacy records are left untouched.
- [x] Post-commit public-view/email failures cannot cause a committed financial write to appear failed/retryable.
- [x] PublicViews owner-only write/delete rules published; public read by token retained.
- [x] Firestore rules baseline published.
- [x] Auth/profile lookup errors no longer incorrectly route existing accounts into first-time setup.
- [x] Firestore web persistence enabled with synchronizeTabs.
- [x] Full-viewport responsive dashboard and dedicated customer-list scrolling.
- [x] Incremental/lazy customer rendering for large customer lists.
- [x] Guru Shree logo standardized across web pages; obsolete logo asset removed.
- [x] Web packaging/verification updated for the standardized logo.
- [x] Backup export includes user profile + customers + full transaction/loan records with schemaVersion and SHA-256 checksum.
- [x] Data integrity check verifies orphan transactions and customer balance consistency without modifying data.
- [x] No destructive restore/import feature was added; this is intentional to prevent accidental production overwrite/data loss.
- [x] Android Autofill / Chrome Password SaveRequest audited and removed from scope: repository contains only Capacitor Android packaging, not an Autofill implementation.
- [x] EmailJS transaction-send path audited: email is secondary to committed ledger writes and cannot trigger duplicate financial retry.
- [x] API v1 design/write work removed from active fix scope because no API implementation is part of the current product.
- [x] Web verification failure caused by an obsolete customer-delete assertion was fixed to match the current transaction-protected implementation.
- [x] Dashboard indefinite-loading hardening added: Firestore account load timeout, initialization watchdog, Retry/Logout error state, and visible listener failures.
- [x] GitHub Actions web verification passed.
- [x] Capacitor Android sync passed.
- [x] Debug APK build passed.
- [x] APK signature verification passed.
- [x] APK manifest/package verification passed for com.babasitaram.pro.
- [x] APK archive verification passed.
- [x] Android emulator install/launch/runtime smoke passed with no fatal exception detected.
- [x] GitHub Android release artifact created from the passing build.

## Backup & export hardening — 2026-09-26
- [x] Existing full JSON recovery backup retained; schemaVersion, record counts and SHA-256 integrity metadata preserved.
- [x] Backup/export UI expanded into separate Full Backup, Excel Workbook, Business PDF, and CSV actions.
- [x] Excel export uses SheetJS on demand and creates Summary, Customers, Transactions, Loans and Integrity sheets; CSV fallback remains available if the spreadsheet library cannot load.
- [x] Business PDF is generated as a print-ready report so the browser can save it as PDF without modifying production data.
- [x] Customer-level Statement PDF/print export added to the customer detail action grid.
- [x] Customer/transaction/loan export rows preserve existing stored fields and add derived display fields without writing back to Firestore.
- [x] Export operations are read-only; no destructive restore/import was introduced.
- [x] Web verification assertions added for backup/export UI and export logic.

## Offline scope
- [x] Firestore offline cache/persistence foundation exists.
- [x] Multi-tab synchronization is enabled.
- [x] No speculative offline financial-write queue was added, because an unverified queue could create duplicate financial writes.
- [x] Offline financial operations are therefore not represented as a guaranteed offline ledger mode.

## Data-loss policy
- No customer/transaction/loan/public-token migration was performed.
- No bulk delete or destructive restore was introduced.
- Legacy loan-derived records remain untouched.
- Backup/export is additive and read-only.

## Release verification
Passing workflow:
- GitHub Actions run: 36227250005
- Commit: 7053c96798cd404c27ed647158c219d7b37943a0
- Android release tag: android-build-36227250005
- APK package: com.babasitaram.pro
- Latest APK artifact/release was generated by the passing workflow.

## Explicitly out of scope
- Android AutofillService / Chrome Autofill / Password SaveRequest.
- Server/API v1.
- Destructive backup restore/import.
- A speculative offline transaction queue.

## Final status
Production code is audited and the current web + Android packaging pipeline has a passing CI build/runtime smoke test. Real customer-data backup/restore against production data was not performed; no such destructive test is appropriate without a separately supplied test dataset.


## Customer Hisaab sharing — 2026-09-26
- [x] Customer detail now has a dedicated **Share Hisaab** action.
- [x] Reminder message uses the customer name plus the business profile name, owner name and business phone; app/developer branding is excluded from the outgoing reminder text.
- [x] WhatsApp reminder opens the customer’s saved number with a pre-filled, review-before-send message.
- [x] SMS reminder opens the device SMS composer with the customer number and pre-filled message where supported.
- [x] Optional photo reminder card is generated locally as PNG and can be shared through the device Web Share sheet when file sharing is supported; otherwise WhatsApp text fallback is used. The Web Share API is feature-detected because file sharing is not available on every browser/device. citeturn3search0turn3search1
- [x] Share card uses an available profile photo from existing profile/Auth fields when present, otherwise a profile initial is shown.
- [x] Loan + Udhaar balances are distinguished in the reminder text; portal link is included when the customer already has a public view token.
- [x] Existing portal sharing was also corrected so its WhatsApp signature uses business/owner/phone instead of the app name.
- [x] Share operations are read-only and do not modify customer, transaction or balance data.
