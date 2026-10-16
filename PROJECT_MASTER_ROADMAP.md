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
- [x] APK manifest/package verification passed (historical build; canonical Application ID is now `com.bsrpro.digitalkhata`, see Application ID section).
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
- Android release tag: android-build-36227250005 (historical; debug builds now publish as debug-build-* pre-releases, production via v* tags)
- APK package: legacy ID (historical, see Application ID section)
- Latest APK artifact/release was generated by the passing workflow.

## Explicitly out of scope
- Android AutofillService / Chrome Autofill / Password SaveRequest.
- Server/API v1.
- Destructive backup restore/import.
- A speculative offline transaction queue.

## Login / Dashboard loading optimization — 2026-09-26
- [x] Removed the ledger preload from the Login critical path.
- [x] Removed the extra blocking `users/{uid}` profile read before Dashboard navigation.
- [x] Removed the email-verification 700ms artificial redirect delay and duplicate profile read.
- [x] Removed the auto-login blocking profile read.
- [x] Dashboard starts customer and transaction listeners immediately and in parallel.
- [x] Dashboard uses Firestore local profile cache as a fast paint path, followed by authoritative server profile hydration.
- [x] Added `[LOGIN-TIMING]` and `[DASH-BOOT]` instrumentation to identify the exact remaining latency stage instead of guessing.
- [x] Pages deployment passed for the latest loading-flow commit `ae5892ed920b2d400e9f2e455c9efcf89e7707e1` (workflow `36245048127`).
- [ ] Real-device timing check: confirm login-to-dashboard first meaningful paint on the user's actual device/network and record the measured stages.
- [ ] Rebuild the Android APK from the latest app-code commit after the web loading optimization; the previous APK release predates this optimization.

## Final status
Production code is audited. Web loading optimization is deployed and the latest Pages build passed. Android packaging/runtime smoke has passed on the previous app-code release; a fresh Android build is still required after the latest web loading changes, and physical SIM SMS testing remains the final device-only validation. Real customer-data backup/restore against production data was not performed; no such destructive test is appropriate without a separately supplied test dataset.


## Customer Hisaab sharing — 2026-09-26
- [x] Customer detail now has a dedicated **Share Hisaab** action.
- [x] Reminder message uses the customer name plus the business profile name, owner name and business phone; app/developer branding is excluded from the outgoing reminder text.
- [x] WhatsApp reminder opens the customer’s saved number with a pre-filled, review-before-send message.
- [x] SMS reminder opens the device SMS composer with the customer number and pre-filled message where supported.
- [x] Optional photo reminder card is generated locally as PNG and can be shared through the device Web Share sheet when file sharing is supported; otherwise WhatsApp text fallback is used. The Web Share API is feature-detected because file sharing is not available on every browser/device.
- [x] Share card uses an available profile photo from existing profile/Auth fields when present, otherwise a profile initial is shown.
- [x] Loan + Payment balances are distinguished in the reminder text; portal link is included when the customer already has a public view token.
- [x] Existing portal sharing was also corrected so its WhatsApp signature uses business/owner/phone instead of the app name.
- [x] Share operations are read-only and do not modify customer, transaction or balance data.


## Final development pass — 2026-09-26
- [x] Removed duplicate header Settings control; Settings remains in bottom navigation only.
- [x] PIN / Security and Language controls are inside Settings.
- [x] Removed stale header lock DOM references that caused `Cannot read properties of null (reading 'style')`.
- [x] Added Android-native SMS bridge preparation with SEND_SMS permission handling.
- [x] Added on-device 7-day SMS reminder scheduler with persistence and reboot rescheduling.
- [x] Added automatic transaction-update SMS hooks for Payment and payment saves/edits.
- [x] Added duplicate-reminder cancellation when payments/deletions/edits occur.
- [x] Added Settings controls for Automatic SMS, Transaction Update SMS and 7-Day Reminder.
- [x] Added CI verification for SMS web hooks and native Android preparation.
- [ ] Physical Android SMS send/scheduled-reminder test on a real SIM-capable device (emulator cannot send carrier SMS).
- [x] Login -> data-ready -> dashboard web verification and Android runtime smoke completed after the null-style fix.
- [x] Integrated Android build, signature, manifest, archive and emulator runtime smoke passed in workflow 36243789635.
- [x] APK release generated from the final app-code commit 29b528aff8b3efa0c02c39a92030a7863bc82fe7; subsequent commit only changed Android workflow triggering to manual.


## Application ID — canonical
- [x] Canonical Android applicationId: `com.bsrpro.digitalkhata` (capacitor.config.json, scripts/prepare-android.mjs, android workflow, app-config.js).
- [x] Legacy ID `com.babasitaram.pro` appears only in this history note; earlier release builds used it. It is not used in any executable code.

## Batch 1 — release/config hygiene — 2026-10-08
- [x] Single version source: package.json (6.8.3). scripts/sync-version.mjs writes it to app-config.js and the service-worker cache name; `--check` fails CI on drift.
- [x] Backup payload appVersion now comes from APP_CONFIG.appVersion (was hardcoded 6.8.0).
- [x] Android versionName/versionCode are set from package.json via scripts/set-android-version.mjs; workflow verifies versionName in the built APK.
- [x] Android workflow triggers: push to main, pull_request to main, tags v*, manual. GitHub Release step is skipped on pull_request.
- [x] Customer portal, welcome email and password-reset links no longer hardcode the repository URL; base URL is derived from the current page, with APP_CONFIG.productionWebUrl as fallback for APK/file:// (override at build with PRODUCTION_WEB_URL).
- [ ] package-lock.json: needs `npm install` on a networked machine and commit (workflow still uses npm install).
- [ ] Release-signed APK/AAB on v* tags needs signing secrets (Batch 4).
- [ ] Real GitHub Actions run on new main (cannot be run from this environment).

## Batch 2 — canonical ledger + portal — 2026-10-08
- [x] `ledger.js` pure module: `calculateLoanState`, `customerState`, `portfolioTotals`, `publicSummary`, `integrityReport`, `balanceFixPlan`, UPI/token helpers. Legacy interest mode purane `calcLoan` se bit-for-bit match (200 random loans).
- [x] `getSummary/calcLoan/getTotals` ledger se; total = ordinary + loan principal + interest, advance alag (visible change: advance ab loan se net nahi hota).
- [x] Public portal payload `schemaVersion:2` (fresh transactions se, stale party.balance nahi); portal sections: ordinary / loan principal / interest / advance; UPI amount = totalOutstanding.
- [x] Statement closing = period-end canonical state; interest_paid principal nahi ghatata; principal/interest/advance boxes.
- [x] Dashboard Byaj tile ke neeche principal + interest; advance customers ke liye alag share message.
- [ ] Loan interest ka final owner rule confirm (default `legacy`, `timeline` available).

## Batch 3 — Firestore rules — 2026-10-08
- [x] Schema-aware rules (docs/firestore-rules.md): type/amount validation, immutables, soft-delete only, publicViews list band, revoked/expired enforcement, default deny.
- [x] Emulator test suite `tests/rules/` + CI job.
- [ ] Emulator tests abhi tak chalaye nahi gaye (is environment mein emulator nahi) — pehli CI run par confirm.

## Batch 4 — security, SMS, Android, CI — 2026-10-08
- [x] PIN PBKDF2 hash + legacy migration + cooldown. Portal token rotate/revoke. Token logging hata, SW token cache nahi.
- [x] Integrity checker (15+ checks) + Fix All Balances dry-run/confirm/chunked batch.
- [x] `requireOnline` guard sab ledger writes par.
- [x] EmailJS config ek jagah (app-config.js); dead `auth.js` hata. UPI builder ek (validated).
- [x] Direct SMS opt-in (default Play-safe: no SEND_SMS). Generator fixture tests.
- [x] CI split: web-ci / android-ci / release (signed APK+AAB, draft release). Signing env-based.
- [ ] Release secrets, package-lock.json, real CI run — owner/GitHub side (docs/release-process.md).
