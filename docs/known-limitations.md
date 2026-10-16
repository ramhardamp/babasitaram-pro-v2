# Known Limitations (is release ke baad bhi)

- [ ] Loan interest ka final owner rule confirm nahi: `legacy` default, `timeline` available (docs/ledger-rules.md)
- [ ] Firestore rules emulator tests pehli CI run mein chalenge
- [ ] Real APK build / install / emulator smoke GitHub Actions par hi hota hai
- [ ] `package-lock.json`, release signing secrets owner ko set karne hain
- [ ] Portal QR third-party (`quickchart.io`) — privacy trade-off
- [ ] `dashboard.html` abhi bhi ek badi file hai; modules mein todna alag refactor hai (regression risk)
- [ ] Visual/accessibility audit (320dp, TalkBack) manual baaki
- [ ] Gradle/Capacitor dependency versions pinned hain par lockfile nahi
