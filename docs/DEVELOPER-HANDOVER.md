# Developer Handover — jo kaam baaki hai (12 Oct 2026, v6.9.5)

Rule: `docs/ledger-rules.md` + `docs/FIXES-2026-10-11.md` + ye file. Naye fields sirf additive; purane loans/entries ke numbers nahi badalne chahiye (tests: `npm test`, `npm run verify:web`).

## Pehle se ho chuka (is round tak)
Green UI, keyboard fix, Statement sheet, Remind Defaulters, Dark mode, Insights, Error log, Backup banner, Simple/Compound (5 frequency, per month/year), Due date + OVERDUE, Interest accrual sheet, Part-payment ON/OFF, Statement par byaj ki shartein, **Settle/Unsettle loan**, **Overdue filter + Sort (name / balance / last activity)**.

---
## A. Firebase / Google se jude kaam (aapke console/account ki zaroorat)

### A1. Attachments (receipt / agreement photo) — Cloud Storage for Firebase
**Zaroori:** Firebase ke official FAQ ke mutabik Cloud Storage for Firebase ab sirf **Blaze (pay-as-you-go)** plan par chalta hai (3 Feb 2026 se Spark par access band). Chhote use me kharcha bahut kam, par billing account jodna padega.
**Console steps**
1. Firebase console -> Upgrade -> Blaze; budget alert (e.g. Rs 100) lagayein.
2. Build -> Storage -> Get started (region apne user ke paas, e.g. `asia-south1`).
3. Storage rules (path per user):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/attachments/{refId}/{file} {
      allow read, write: if request.auth != null && request.auth.uid == uid
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*|application/pdf');
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
**Code kaam**
- `firebase-storage-compat.js` script jodo (same version as firebase app), `service-worker.js` SHELL + `capacitor` network allow-list me.
- UI: transaction/loan form me "Camera" + "File" buttons (`<input type=file accept="image/*,application/pdf" capture>` ya `@capacitor/camera`). Upload se pehle image compress (canvas, max 1280px, JPEG 0.7).
- Doc me sirf metadata: `attachments:[{path,name,type,size,uploadedAt}]` (max 5). Download URL store nahi karna; dikhate waqt `getDownloadURL(path)`.
- Delete par Storage file bhi hatao. Upload sirf online (offline outbox me attachments nahi).
- `firestore.rules`: `attachments` list hai aur size <= 5 validate karo (hasOnly nahi).
- Backup JSON me sirf metadata jayega (files nahi) — README me likho.
**Done jab:** photo attach -> doc me metadata -> doosre phone par dikhe -> delete par file hate; 6MB file reject.

### A2. Crashlytics (crash reports)
1. Firebase console -> Project settings -> Add **Android app**: package `com.bsrpro.digitalkhata`, release keystore ka SHA-1 (web app ki config alag hoti hai).
2. `google-services.json` download. Repo me commit mat karo: GitHub secret `GOOGLE_SERVICES_JSON_BASE64` banao.
3. `scripts/prepare-android.mjs` me: secret se `android/app/google-services.json` likho; Gradle me plugins `com.google.gms.google-services` + `com.google.firebase.crashlytics` jodo.
4. Plugin: `@capacitor-firebase/crashlytics`. `errlog.js` ke `window.onerror/unhandledrejection` me `recordException` bhi bhejo (koi customer naam/phone/amount nahi bhejna).
5. Test: ek debug button se test crash -> Firebase console me aaye. Privacy policy me line jodo.

### A3. Push / due reminders
**Option 1 (sasta, bina server): Local notifications** — `@capacitor/local-notifications`. App khulne par `dueDate` wale loans ke liye schedule (subah 9 baje: "Aaj N loan ki vapsi tareekh"). Android 13+ me `POST_NOTIFICATIONS` permission. Settings me ON/OFF. Offline chalta hai. *Pehle ye karwayein.*
**Option 2 (server push, FCM)** — Blaze + Cloud Functions:
1. `@capacitor/push-notifications`; login ke baad token `users/{uid}/devices/{token}` me save (rules: sirf apna uid).
2. Scheduled Function (daily 09:00 IST) -> har user ke due/overdue loans -> `messaging().sendEachForMulticast`.
3. Notification tap -> वसूली सूची kholo. Invalid token cleanup.
**Done jab:** due wale din phone par notification aaye, tap par sahi screen khule, Settings se band ho sake.

### A4. Auto daily backup
- **Option 1 (on-device):** app khulne par din me ek baar existing `buildBackupPayload()` ka JSON `@capacitor/filesystem` se `Documents/BSRPRO-Backup/` me likho, last 7 rakho. (Background me nahi chalta.)
- **Option 2 (server):** Scheduled Cloud Function (Blaze) -> user ka data JSON -> Storage `backups/{uid}/YYYY-MM-DD.json`, 7 din baad delete.
Home ka "7+ din" banner pehle se hai; auto-backup hone par `bsp_lastBackup` set karo.

---
## B. Product decisions (logic aap batayein, phir ye banega)

### B1. "You borrowed" (aapne Payment liya)
Poochhna hai: (1) kahan dikhe — alag section "आपको देना है"? (2) customer ka total = lent - borrowed (net) ya alag? (3) byaj kiske favour me chale (same formula)? (4) portal / WhatsApp reminder me kya likha jaye? (5) Recovery list me aaye ya nahi?
Data plan: `direction: 'lent' | 'borrowed'` (default `lent`, purane docs me field nahi = lent). `ledger.js customerState` me borrowed ko alag total (`owedByMe`) — kabhi lent se mix nahi (invariant).

### B2. Calculation settings (ByajApp me hain)
Options aap tay karein; prastav:
| Setting | Options | Abhi |
|---|---|---|
| Month length | din/30 (current) / actual days of month | din/30 |
| Rounding | koi nahi / paise / poora rupya; har period par ya antim me | paise (schedule), rupya (card) |
| Day count | 30/360 / Actual/365 | anniversary + din/30 |
Data plan: `loan.calc = {monthLength, rounding, ...}` (undefined = abhi ka behaviour). Statement par pehle se "shartein" table hai — wahi me jodna. Tests: har combination ka number.

### B3. Settle ke baad kya (confirm)
Abhi: settle par bacha hua amount `settledOutstanding` me save hota hai aur balance se hat jata hai ("Waived"). Kya partial settle (kuch amount maaf) chahiye?

---
## C. Engineering
- **dashboard.html (~4100 lines) ko screen-wise todna** (reports, settings, recovery, loans). Pehle `tests/*.test.mjs` ko source-string ke bajay modules par karo, phir ek-ek screen nikalo. Har step ke baad `npm test` + `verify:web` + Chromium smoke.
- **Play Store build** (`ENABLE_DIRECT_SMS=false`) ke liye SMS-less flow ka test.
- **Real-device checklist:** `docs/PRO-ROADMAP.md` (10 points) + naye: loan create (compound), accrual sheet, ON/OFF toggle (PIN), Settle/Unsettle, Overdue filter, Sort.

## D. Reference
- Byaj formula + ByajApp analysis: `docs/BYAJAPP-ANALYSIS.md`
- Release: `RELEASE_NOTES.md`, `docs/release-process.md`
