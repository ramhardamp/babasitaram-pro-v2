## BSRPRO Digital Khata 19.9.0

### Theme (Light / Dark) - ab har page par ek hi system
- **Pehle:** 3 alag tarike the (phone ki OS dark setting, purana `body.dark-mode` switch, naya `data-theme`) aur Settings me 2 jagah theme badalne ke options. Phone dark ho to dashboard dark me atak jata tha aur toggle kaam nahi karta tha.
- **Ab:** sirf `theme.js` + `theme.css` (har page par: login, signup, forgot-password, customer-view, dashboard). Choice `localStorage` (`bsp_theme`: light / dark / system) me save hoti hai, reload ke baad yaad rehti hai, doosre page par bhi same dikhti hai, badalte waqt smooth transition.
- Toggle: dashboard top-bar me aur baaki sab pages par chhota floating button. Settings me Light / Dark / System rows. Purana "Dark Mode" row hata diya.
- Dark rang ek palette se aate hain (pehle navy/purple bache hue the, ab hare-kaale).

### Dashboard (home) - naya layout
- Upar ka summary **2x2 grid**; Quick actions **3 barabar column**; filters **ek line me scroll**; bottom tabs **4 barabar column**; FAB tabs ke upar, kabhi overlap nahi.
- **Poora dashboard ek saath scroll hota hai**; search + filters upar chipke rehte hain (pehle upar ka hissa jagah kha leta tha aur customer list sirf ~150px me dikhti thi).
- Customer history page par neeche ki 128px khaali jagah hat gayi; list poori neeche tak.
- **Duplicate CSS saaf:** home ki 140 purani CSS rules (V18/V19/dark-mode/OS-dark layers) hat kar ek hi block (`ux-pro.css` "HOME v3"). Purane audit docs `docs/audits/` me.

### Settings fix
- **PIN badalte waqt purana PIN ab ek hi baar** maanga jaata hai (pehle do baar). Lockout wahi rehta hai.
- Settings ke saare features (profile, UPI, PIN, biometric, language x6, SMS, push, backup/export/import, advanced tools, about, logout) end-to-end test kiye: `tests/e2e-sandbox/t31_settings.py`.

### Tests
- `npm test`: **196 / 196** (13 naye). Browser tests: `t30_theme.py` (26), `t31_settings.py` (37), `t32_home_layout.py` (42: 320/360/412px x light/dark).

## BSR Pro V19.5.0 — Push notifications + Android platform (development candidate)

- Added Android Gradle platform scaffold and native FCM registration/foreground notification plugin.
- Added Settings push opt-in and test-send action, owner-only token storage rules, and secured callable Cloud Functions.
- Android platform source is present; web and automated tests pass.
- **Not a release APK:** the real Android `google-services.json` is not supplied, Cloud Functions are not deployed, npm registry access failed in this environment, and Android SDK/Gradle are unavailable here. Live FCM and physical-device tests remain pending. See `V19.5-PUSH-ANDROID-FIX-LOOP-AUDIT.md`.

## BSR Pro V19.2.0 — final-loop candidate (not release APK)

### Implemented in this loop
- Contact import: added a user-triggered browser Contact Picker button to New Customer. It asks the user to choose one contact, fills name/phone/email for review, and only writes to Firestore after the user presses Save. Unsupported browsers keep the manual-entry path.
- Interest forecast: future-dated estimates are now explicitly labeled “Forecast through [date]”. Existing calculator/ledger math was retained; no new financial formula was introduced.
- Localization: all six locale dictionaries now include the new contact/forecast labels. Language switching also translates exact matching V18 strings in static text and common placeholder/title/aria-label attributes. Unmatched BSR Pro-specific text still falls back to its existing text; this is not yet proof of complete translation of every screen/modal/PDF.
- Candidate version advanced to 19.2.0 (Android versionCode 190200).

### Validation
- `node --test tests/*.test.mjs`: 169 passed, 0 failed.
- `node scripts/verify-web.mjs`: passed.
- `node scripts/prepare-web.mjs`: passed.
- Android APK build remains blocked in this environment: npm dependency installation did not complete, no Android SDK/ANDROID_HOME is configured, and the Capacitor Android platform directory is absent. No APK is included or claimed.

### Not completed / blocked
- Complete six-language translation review across every screen, modal, generated PDF and notification: still needs a full string inventory and native-language QA; missing V18 keys cannot be translated by the adapter alone.
- Native address-book import parity: current picker uses the browser Contact Picker API where supported, not a custom native Contacts plugin for every Android device.
- True automatic backup: current app has verified manual full backup/export and a stale-backup reminder. Automatic cloud backup needs a defined destination, retention/privacy policy, authorization and recovery tests; silent local snapshots are not represented as a reliable backup.
- Push notifications: no VAPID/FCM project configuration, server endpoint, token registration or permission/product flow was supplied, so no nonfunctional push toggle was added.
- Android build/device smoke: needs installed npm dependencies, Capacitor Android platform, Android SDK/Gradle, then APK install/update and real-device testing. No production Firebase data/rules were changed.

## Historical note — BSR Pro V19.1 / app version 19.1.0 (superseded by V19.2)

### V19 update
- Dashboard पर **त्वरित काम** सेक्शन: नया ग्राहक, ब्याज अनुमान और वसूली सूची एक जगह।
- Existing handlers (`openAddCustomer`, `switchTab('calc')`, `openRecovery`) ही उपयोग होते हैं; नया financial-write path नहीं जोड़ा गया।
- Compact responsive layout, keyboard focus visibility और dark-theme support।
- V18 से व्यवहार की तुलना के दौरान BSR Pro का canonical ledger, ब्याज गणना, Firebase सुरक्षा और backup/import safeguards जस के तस रखे गए।
- यह candidate है; लाइव deploy या production Firebase बदलाव नहीं किया गया।

### V18 parity स्थिति
- Simple/Compound interest, ledger, partial payments, settlement और report/share flows BSR Pro में पहले से हैं; exact parity को समान इनपुट वाले behavior tests से जाँचना बाकी है।
- उस V19.1 snapshot में locale integration सीमित थी; V19.2 में dictionaries embed की गईं और exact-match static DOM translation जोड़ा गया। फिर भी हर BSR Pro string का अनुवाद पूरा होने का दावा नहीं है।
- Forecast/Subscription/Rewards जैसे V18 संकेतों को वास्तविक व्यवहार की पुष्टि के बिना parity-complete नहीं माना गया।

### सुरक्षित रिलीज़ की शर्तें
- [ ] Android package और signing key की पुष्टि; production app पर in-place update compatibility जाँचें।
- [ ] Real-device UI smoke test (small screen, keyboard, dark mode, back navigation)।
- [ ] सभी automated tests और `npm run verify:web` पास।
- [ ] Owner की अनुमति के बाद ही release workflow/deploy।

## BSRPRO Digital Khata 6.9.8

### Naya kya hai
- 📄 **Loan entry page** — loan par tap karte hi poora page: principal, dar, type, due, byaj / vapsi / baki, part-payments, ON/OFF toggle aur mahine-wise accrual. Edit, settle, part-payment, byaj bhugtan, delete aur PDF sab usi page ke menu se (card ke 3-dot hata diye)
- 📝 **Entry ab page jaisi** — Udhaar/Jama/Loan/Vapsi form full page me khulta hai: entry upar, keyboard neeche, Save keyboard ke upar
- 📜 **History poori neeche tak** khulti hai (pehle chhoti scroll-box thi)
- ✏️ **Loan edit me Simple ↔ Compound** badal sakte hain (frequency, rate per month/year, due date bhi)
- 🧮 **Byaj Calculator (naya tab "ब्याज")** — kisi customer ke bina bhi byaj nikalo. Saadha / Chakravriddhi, byaj Roz / Mahine / Timahi / 6 mahine / Saal me judta hai, dar per month / half-year / year, avadhi **tareekh se tareekh** ya **saal-mahina-din**. Result turant dikhta hai (button dabane ki zaroorat nahi).
- 🔁 **Ulta hisaab** — *Dar nikalo*, *Muldhan nikalo* (byaj ya kul rakam se), *Samay nikalo*. Naya number ek tap me calculator me bhar sakte ho.
- 📊 **Avadhi-wise byaj table**, **asal salana dar**, **saadha vs chakravriddhi ka farak**.
- ⚙️ **Hisaab ki shartein** — din ginne ka tareeka (30-din mahina = loan card jaisa / asli din ÷365 / ÷360) aur rounding (paise / rupaya / neeche / upar).
- 📤 WhatsApp text, **photo card** aur copy se result bhejo.
- ✅ **Loan card jaisa hi number**: calculator ka engine (`interest-calc.js`) loan engine (`ledger.js`) ke helpers use karta hai; test me 60 random cases me dono barabar nikle.

### Dhyan rahe
- Purane loans / customers ka koi hisaab nahi badla. Calculator sirf nayi screen hai; kuch save nahi hota (sirf aakhri bhare numbers phone me yaad rehte hain, Reset se hat jaate hain).
- Version 6.9.6 (versionCode 60906): purane APK ke upar seedha update hoga (same signing key).

## BSRPRO Digital Khata 6.9.5

### Naya kya hai
- 📈 **Compound byaj** — Simple/Compound, Daily/Monthly/Quarterly/Half-yearly/Yearly, rate per month/year, due date, aur loan card par **Interest accrual** (mahine-wise hisaab). **Wapsi par byaj ON/OFF** (kitna byaj bacha dikhta hai), **OVERDUE badge**, aur statement PDF me byaj ki shartein. Purane loans ka hisaab bilkul nahi badla.
- 🎨 **OkCredit jaisa green UI** — saare screens naye look me
- ⌨️ **Keyboard fix** — Udhaar/Jama sheet ab keyboard ke upar uthti hai, Save hamesha dikhta hai
- 📄 **Customer Statement** — date chips (is mahine / 30 din / pura), live summary, PDF download
- 🔔 **Remind Defaulters** — home par pending ka bar, tap karke seedha WhatsApp reminder
- 🌙 **Dark mode** — Settings → Theme & App Health
- 💡 **Smart insights** — Reports me vasooli trend aur sabse late customer
- ✅ **Loan Settle / Unsettle**, ⚠ **Overdue filter** aur ⇅ **Sort** (naam / balance / aakhri lenden)
- 🧰 **Error log** aur 💾 **backup reminder** banner
- ♿ Accessibility sudhar (bade buttons, TalkBack)

### Install / Update
- Naya phone: APK install karein (Unknown sources allow).
- **"App not installed" aaye to** (sirf ek baar): pehle pending entry sync karein, purani app uninstall karein (data Firebase me safe hai), phir ye APK install karein.
- SMS permission block ho to: App info → 3 dots → *Allow restricted settings* → Permissions → SMS → Allow.

### Files
- `BSRPRO-DigitalKhata-v6.9.5.apk` — phone me install ke liye
- `BSRPRO-DigitalKhata-v6.9.5.aab` — Play Store ke liye
- `SHA256SUMS` — file verify karne ke liye

### Dhyan rahe
Crashlytics, push notification aur auto daily backup is version me nahi hain. Poori list: `docs/PRO-ROADMAP.md`.


## V19 candidate — V18 localization parity pass
- Integrated the six V18 locale dictionaries (English, Hindi, Gujarati, Marathi, Nepali, Telugu) into the BSR Pro dashboard language setting.
- Added locale adapter with English fallback for phrases that do not have an exact V18 translation match. This is partial UI localization, not a claim that every screen or generated report is fully translated.
- Added locale dictionaries and adapter to offline service-worker cache and Android web asset packaging.
- Kept ledger math, Firebase rules, PIN security, and customer/transaction schema unchanged.
- Added locale parity and UI wiring regression tests.


## V19.3.0 — Final loop iteration (development candidate)
- Added an Android system contact picker plugin to the Android preparation script. It opens only after a user tap and returns the selected contact name/phone; it does not enumerate contacts or request broad READ_CONTACTS access.
- Added a V18-style long-range interest forecast table: projections up to 50 years, with half-yearly rows for half-yearly compound mode. It reuses the canonical BSR Pro interest engine rather than introducing a second formula engine.
- Added translated forecast labels to all six locale dictionaries (207 keys per language) and kept the synchronous offline adapter in sync.
- Wired the dashboard contact action to the native picker first, with browser Contact Picker and manual-entry fallbacks. Saving to the ledger remains a separate user action.
- Added regression tests for native picker generation, registration order, fallback behavior, and no broad contacts permission.
- Not a final release: full six-language coverage, verified V18 forecast parity, automatic off-device backup, push notification backend/configuration, Android SDK build, and physical-device QA remain outstanding.

## V19.4.0 — Localization fix loop (development candidate)
- Added shared saved-language translation to login, signup, password-reset and customer-view screens, including dynamically-rendered DOM text and common accessibility/placeholder attributes.
- Added language picker to non-dashboard pages and persisted locale selection.
- Expanded six locale dictionaries to 241 keys and included the translator in web packaging/offline cache.
- Verification: 175 automated tests passed; web verification and web packaging passed.
- Limitation: full translation is NOT complete. Unmatched BSR Pro strings, PDFs/statements and some dynamic messages can remain untranslated. Android APK/device validation is still blocked by missing platform/build dependencies.

## V19.7.0 — Localization fix loop
- Added translated customer-view labels, balance states, transaction types, UPI actions, and footer/copy feedback across six locale dictionaries.
- Regenerated the embedded offline locale bundle from the locale JSON resources and added source aliases for mixed-language legacy labels.
- Added page-title localization and locale parity/alias tests.
- Static HTML localization inventory: 204 text nodes scanned, 0 unmatched after aliases.
- Important: full dynamic localization is still not complete. 180 of 267 unique dashboard `t(English, Hindi)` phrase pairs still have no locale key and fall back to English for Gujarati/Marathi/Nepali/Telugu. See `V19.7-LOCALIZATION-COVERAGE.md`.
- Validation: 183 automated tests pass; web verification passes. This is not an APK release.


## V19.8.0 — Firebase Android configuration candidate

- Added the user-provided Firebase Android configuration at `android/app/google-services.json` after checking that its project ID is `babasitaram-pro-digital-1e8d6` and Android package is `com.bsrpro.digitalkhata`, matching the supplied Firebase Console screenshot.
- Android `versionName` / `versionCode` updated to `19.8.0` / `190800`; web version and cache version synced from `package.json`.
- Web verification passed and all 183 Node tests passed.
- Android build was attempted through `npm run android:build` but did not finish within the available execution window; this environment has no configured `ANDROID_HOME` or `ANDROID_SDK_ROOT`. No APK build success or device test is claimed.
- Localization is still incomplete: 180 of 267 unique dashboard `t(English, Hindi)` phrase pairs still lack a locale key for Gujarati/Marathi/Nepali/Telugu. See `V19.7-LOCALIZATION-COVERAGE.md`.
- No Firebase deployment, Firestore rules change, user-data migration, or production data modification was performed.
