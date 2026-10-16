# babasitaram-pro-v2
BABASITARAM PRO DIGITAL KHATA v2


## Development commands
- `npm test` — ledger, portal, PIN, Android-generator, release tests (no extra install needed)
- `npm run verify:web` — source/contract checks
- `npm run sync:version` — package.json version ko app-config.js + service worker mein sync
- `npm run test:rules` — Firestore rules tests (Firebase Emulator + Java chahiye; `npm install` ke baad)
- Docs: `docs/ledger-rules.md`, `docs/firestore-rules.md`, `docs/security-model.md`, `docs/release-process.md`, `docs/testing.md`, `docs/known-limitations.md`


## V19.2.0 final-loop candidate: localization/contact/forecast
- Six V18 locale dictionaries are included under `assets/i18n/` and the dashboard offers English, Hindi, Gujarati, Marathi, Nepali and Telugu.
- `v18-i18n.js` adapts V18 locale strings to existing BSR Pro `t(en, hi)` calls; phrases without a matching V18 key fall back to English. This is not full-app translation parity yet.
- Run `npm test`, `npm run verify:web`, and `npm run prepare:web` before a device build.
- Android APK build requires installed npm dependencies, Android SDK and Gradle/Capacitor platform setup; the current build environment did not have a usable installed dependency tree or Android SDK, so no APK is claimed by this candidate.

- V19.2 adds the opt-in browser Contact Picker and a visible future-date forecast label. It does not claim full locale coverage, automatic cloud backup, push notification delivery, or an APK build. See `V18-V19.2-FINAL-LOOP-AUDIT.md`.
