# Security Model

## Auth & data
- [x] Firebase Email/Password; har user ka data `users/{uid}/…`, rules owner-only (docs/firestore-rules.md)
- [x] Portal token: 32-char crypto-random (rejection sampling, ~190 bit); portal malformed token Firestore tak bhejta hi nahi
- [x] Portal revoke / expire: `revokedAt` / `expiresAt`; rules + client dono enforce; "पोर्टल लिंक बदलें" rotate karta hai (naya token, purana revoked)
- [x] Token console mein log nahi hota; SW navigation cache key mein token store nahi hota

## PIN
- [x] PIN plaintext store nahi: PBKDF2-SHA256, random salt, 150k iterations (`pin-security.js`)
- [x] Purane plaintext PIN pehle successful unlock par apne aap hash mein migrate (plaintext field delete)
- [x] 5 galat attempts ke baad cooldown 30s → doubling → max 15 min (local UI friction; server-side security nahi)
- [ ] PIN sirf app-UI lock hai. Firebase session ke bina data nahi, lekin device compromise par PIN bypass ho sakta hai

## Input / output
- [x] User fields HTML mein `esc()` se (static scan + portal XSS test)
- [x] UPI ID format validate + URL-safe; amount > 0; "UPI app khula" ≠ "payment hua"
- [x] Offline paisa-wala write block (`requireOnline`) — queue/duplicate/hang nahi

## SMS
- [x] DEFAULT build Play-safe: `SEND_SMS` permission nahi, background SMS nahi; sirf SMS composer (Share Hisaab)
- [x] Direct SMS: APK mein DEFAULT ON. Play-Store-safe build ke liye `ENABLE_DIRECT_SMS=false` (workflow_dispatch `direct_sms` unchecked) - SEND_SMS Play policy mein restricted hai

## Known risks (owner decision)
- [ ] Portal UPI QR `quickchart.io` (third-party) se banta hai — UPI ID + amount us service ko jaata hai. Fix ke liye client-side QR library chahiye (offline add nahi ho saki)
- [ ] Portal transaction `note` customer ko dikhta hai (purana behaviour) — internal notes mat likhein
- [ ] EmailJS public key: dashboard (`zVakeKYOCR5og-jon`) canonical rakha; signup ki purani key (`2WakeKYOcR5og_jon`) typo jaisi thi. EmailJS dashboard mein confirm karein
