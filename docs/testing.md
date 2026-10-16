# Testing

## Automatic (CI + local `npm test`)
- [x] `tests/ledger.test.mjs` — loan/balance/public summary/integrity (purane calcLoan se bit-for-bit match)
- [x] `tests/portal.test.mjs` — portal asli script stubbed DOM mein (balance, revoked/expired, UPI, XSS)
- [x] `tests/pin.test.mjs` — PIN hash/verify/lockout
- [x] `tests/android-prepare.test.mjs` — native generator fake skeleton par (default + direct SMS, idempotent)
- [x] `tests/release.test.mjs` — signing patch + release workflow guard
- [x] `scripts/verify-web.mjs` — source/contract checks
- [x] `tests/rules/*` — Firestore rules (`npm run test:rules`, emulator chahiye)

## Manual (device/emulator par — automation yahan nahi)
- [ ] 320dp / badi font / dark mode / TalkBack
- [ ] Android back button, PIN lock/unlock, offline banner
- [ ] Portal link kisi doosre phone par; revoke ke baad band
- [ ] APK install + upgrade (versionCode badhta hai)


## Browser (Playwright) scripts - 19.9.0
`tests/e2e-sandbox/` me: `t30_theme.py` (theme toggle har page), `t31_settings.py` (Settings ke saare features), `t32_home_layout.py` (home layout 320/360/412px, light+dark).
Chalane ke liye `python3 -m http.server 8765` project folder me, aur `/home/claude/harness/` me `mock-firebase.js` + `pinrec.json` (dekho `lib.py`).
