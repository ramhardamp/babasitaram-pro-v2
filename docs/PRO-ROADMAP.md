# PRO Roadmap - Phase 1/2/3 (11 Oct 2026)

Rule: sirf additive changes; ledger / Firestore / PIN / SMS logic untouched. Nayi files: `errlog.js`, `ux-pro.js`, `ux-pro.css`.

## Phase 1 - Stability & trust
| # | Kaam | Status |
|---|------|--------|
| 1 | Error visibility | DONE (on-device): `errlog.js` last 40 errors, Settings -> Theme & App Health -> Error log (copy/clear). **Crashlytics NAHI** - uske liye Firebase console se `google-services.json` + Gradle plugin chahiye (aapki key/account). |
| 2 | Modularization | PARTIAL: saara naya code alag modules me (`ux-pro.js`, `errlog.js`, `ux-pro.css`, pure helpers Node-tested). `dashboard.html` (~4000 lines) ko poora todna **abhi nahi kiya** - tests us file ke source par depend karte hain, aur ek hi baar me todne se regression ka risk bada hai. Agla step: ek-ek screen (reports, settings, recovery) alag file me. |
| 3 | Real-device checklist | DONE: neeche section. |
| 4 | Backup safety | PARTIAL: last backup time save hota hai; 7+ din purana ho to home par dismissible banner. **Auto daily backup NAHI** (WebView me background file write ke liye native storage permission/WorkManager chahiye). Backup checksum + add-only restore pehle se hai. |
| 5 | Accessibility | DONE: 44px touch targets, focus ring, clickable div/card par role=button + keyboard Enter/Space, reduced-motion. TalkBack se real-device check baaki. |

## Phase 2 - OkCredit jaisa feel
| # | Kaam | Status |
|---|------|--------|
| 1 | Customer Statement | DONE: `prompt()` hata kar bottom sheet - chips (is mahine / 30 din / pichla mahina / pura), From/To date, live "पेमेंट दिया / जमा मिला" summary, Download PDF. PDF engine wahi purana (`exportCustomerStatementPdf(id,range)`). |
| 2 | Remind Defaulters | DONE: home par bar ab pending hone par hamesha dikhta hai (30+ din late ho to purana warning wala). Tap -> existing वसूली सूची (Remind next + WhatsApp + Call). |
| 3 | WhatsApp reminder card | Pehle se maujood (`shareHisaabWhatsAppPhoto` image card + text + UPI + portal link). Koi change nahi. |
| 4 | Skeleton loaders | Pehle se maujood (customer list loading skeleton). |
| 5 | Dark mode | DONE: Settings -> Theme & App Health (Light default / Dark / System). Sirf dashboard; login/signup pages light hain. |

## Phase 3 - OkCredit se aage
| # | Kaam | Status |
|---|------|--------|
| 1 | Byaj + loan ledger, Hindi-first, ad-free, offline-first | Pehle se app ka core. |
| 2 | Smart insights (Reports) | DONE: 7-din vasooli vs pichhle hafte (%), 30+ din late ka count/amount, sabse zyada late customer. Sirf existing data se; kuch store nahi hota. |
| 3 | UPI QR + Pay now (customer portal) | Pehle se `customer-view.html` me maujood. |
| 4 | Push notifications (due reminder) | **NAHI** - FCM ke liye Firebase project config + server/Cloud Function jo schedule par bheje + notification permission flow chahiye. Abhi 7-day SMS reminder (native) kaam karta hai. |

## Real-device test checklist (APK banne ke baad)
1. Install/update: purani app uninstall hui ho to naya APK install hota hai (stable signing key).
2. Udhaar/Jama sheet: Note/Date field tap -> sheet keyboard ke upar uthe, Save dikhe; keyboard band -> neeche aaye.
3. Customer -> Statement: chips + dates + Download PDF; PDF print/share khule.
4. Home: "Remind Defaulters" bar -> list -> WhatsApp khule.
5. Reports: Smart insights dikhe, numbers sahi hon.
6. Settings -> Theme & App Health: Dark/Light/System; app restart ke baad yaad rahe.
7. Backup export -> home ka backup banner chala jaye; Settings me "Last backup" dikhe.
8. TalkBack ON: bottom tabs, customer cards, buttons padhe jayen.
9. Low-end phone (2-3 GB RAM): 500+ customers me scroll smooth ho.
10. Android 10, 12, 14, 15: biometric, SMS permission guide, keyboard.
