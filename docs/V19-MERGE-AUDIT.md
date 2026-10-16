# BSR Pro V19 — V18 parity and iterative upgrade audit

## Scope / safety
V18 archive contains an Android package with a NativeScript compiled bundle (`assets/app/bundle.js`, `vendor.js`) and locale JSON files; no original V18 application source tree was found in the archive. BSR Pro archive contains editable HTML/JS/CSS, ledger, calculator, Firebase rules, backup tooling and tests. Therefore, do not wholesale-copy the V18 bundle into BSR Pro.

No production data, Firebase rules, auth accounts, customer/transaction records, live hosting, or release credentials were modified.

## V18 inventory evidenced by bundle/resources
- Simple and compound interest calculator terminology and rate/period inputs.
- Forecast-related UI/resource strings.
- Ledger/customer/contact, partial-payment and settlement terminology.
- Reports/download/share terminology.
- Rewards and subscription terminology (strings are not proof of a complete working flow).
- Locale resource files: `en.json`, `hi.json`, `gu.json`, `mr.json`, `ne.json`, `te.json`, 197 keys each.

## BSR Pro baseline evidenced in source/tests
- `ledger.js`: canonical loan/customer/portfolio calculations and integrity helpers.
- `interest-calc.js` + `interest-calc-ui.js`: simple/compound calculator, rate/time reverse calculations, period table and share/export UI.
- `backup-import.js` + `recovery.js`: integrity-checked backup/import planning and recovery flows.
- `firestore.rules`, `pin-security.js`, `outbox.js`, `errlog.js`: security, PIN and operational safety.
- `ux-pro.css`/`ux-pro.js`: responsive UX, dark theme, statement tools, insights, health panel and loan detail page.
- Test baseline: `npm test` reports 161 passing subtests. One `prepare-android.mjs` fixture prints a `MainActivity marker not found` stack trace before the test summary, although the test command exits successfully; investigate this noisy fixture separately before release.

## V19 change in this candidate
- Added a compact dashboard quick-actions panel for New Customer, Interest Estimate (existing calculator tab), and Recovery List (existing recovery view).
- Uses existing handlers only; no financial formulas, Firestore schema, security rules or data migrations changed.
- Updated package semantic version to 19.0.0 (Android versionCode derived by project formula is 190000), app config and service-worker cache via the existing version sync script. This is a candidate only; signing-key and in-place update compatibility must be confirmed before distribution.

## Iterative upgrade loop
1. **Compare** V18 strings/screens/resources against BSR Pro workflows.
2. **Implement** one isolated feature/UI change using BSR Pro's current data model.
3. **Test** automated checks plus behavior-parity cases with identical inputs.
4. **Audit again** for ledger drift, permissions, backup compatibility, accessibility, responsive layout and regression.

## Backlog / not claimed complete
- Full V18 runtime walkthrough and feature-by-feature parity matrix (requires source or runnable app/screens).
- Six-language localization integration (translations and every user-facing string need completeness review).
- Forecast flow validation and implementation only if it adds value beyond the current calculator.
- Contact import permission/consent UX.
- Subscription/rewards validation before any implementation.
- Safe import/restore completion, auto backup, Crashlytics/push notification review.
- Physical Android smoke, offline/online synchronization checks, release-signature validation.
