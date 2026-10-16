# Release Process

## Version
- [x] Single source: `package.json` → `node scripts/sync-version.mjs` → `app-config.js` + service-worker cache name; `--check` CI mein
- [x] Android `versionName` = package version; `versionCode = major×10000 + minor×100 + patch`

## Workflows
- [x] `web-ci.yml` — npm test, verify-web, version-sync, Firestore rules (emulator)
- [x] `android-ci.yml` — main push / PR: tests + debug APK + emulator smoke. Debug APK `debug-build-*` **pre-release** (production nahi)
- [x] `release.yml` — `v*` tag: tag == package version, signing secrets required, signed APK+AAB, apksigner/aapt/permission verify, SHA256SUMS, **draft** GitHub Release

## Steps
1. `package.json` version badhao → `npm run sync:version` → commit
2. PR → CI green (web-ci + android-ci)
3. `git tag vX.Y.Z && git push --tags`
4. Draft release review → publish

## Secrets (GitHub → Settings → Secrets)
- [ ] `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` — owner ko set karne hain; missing ho to release job saaf error ke saath fail hota hai
- [ ] **android-ci.yml bhi yahi 4 secrets use karta hai** (debug APK same key se sign => update chalta hai). Secrets ke bina non-PR build fail hoti hai
- [ ] Keystore ek baar banane ka tareeka: `keytool -genkeypair -v -keystore bsrpro.keystore -alias bsrpro -keyalg RSA -keysize 2048 -validity 10000` phir `base64 -w0 bsrpro.keystore` ka output `ANDROID_KEYSTORE_BASE64` me daalein
- [ ] Keystore backup safe jagah rakhein — kho gaya to same app update nahi hoga
- [ ] `package-lock.json` abhi repo mein nahi; networked machine par `npm install` karke commit karein
