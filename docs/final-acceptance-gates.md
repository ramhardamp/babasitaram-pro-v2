# BSR PRO Final Acceptance Gates

Status: NOT APPROVED FOR PRODUCTION RELEASE

This document is a non-runtime audit record. It does not alter customer data, Firebase rules, ledger behavior, or release settings.

## Verified in Android workflow run #153
- Isolated interest-engine tests and web static verification passed.
- Capacitor asset preparation and Android sync passed.
- Debug APK build, signature verification, manifest/package/permission check, archive validation, and artifact upload passed.
- Android API 36 emulator install, launch/resumed-activity check, running-process check, and fatal-exception smoke check passed.
- GitHub Release was skipped because publish_release was not opted in.

## Blocking gates before production approval
1. Obtain explicit business approval for monthly-rate semantics: current monthly rate is annualized as rate x 12 and prorated by day-count fraction. Example: 10,000 principal, 2% monthly, 30 ACT/365 days yields 197.26, not a full-month 200. Do not silently change this convention.
2. Replace or formally approve floating-point money arithmetic and rounding policy; add paise/integer-decimal golden tests including half-paise boundaries, large values, and fractional compounding periods.
3. Approve day-count convention explicitly. 30/360 currently aliases European 30E/360; do not interpret it as US/NASD 30/360 without approval.
4. Add deterministic tests for zero rate, zero principal, invalid/NaN/Infinity inputs, leap days, year boundaries, exact month intervals, compounding frequencies, and rounding modes.
5. Conduct real-device SMS acceptance with user-granted SEND_SMS permission: scheduled delivery, reboot/update reschedule, cancellation after payment, duplicate prevention, permission revoked before alarm, dual-SIM/device behavior, and Android background restrictions. Emulator smoke alone does not establish delivery.
6. Run non-destructive manual acceptance against a disposable/test Firebase account and synthetic dataset only: auth/login, customer create/edit, payment/loan/interest transaction, history, exports/import integrity, offline/cache recovery, and large-list scrolling. Never use live customer records for destructive tests.
7. Verify backup/restore recovery using a separate test account and confirm schema migration/rollback behavior before any production migration.
8. Review brand assets and user-approved app identity across login, dashboard, customer avatar, PDF, and Android launcher before release.
9. Only after all gates pass, obtain explicit release authorization and separately opt in to publishing. Current APK is debug-signed; it is not a production signing/release approval.

## Data protection guardrail
No production Firebase writes, migrations, deployment, customer-data edits, or public release are authorized by this audit record.
