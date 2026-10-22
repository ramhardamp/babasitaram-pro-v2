# Fix.md — BSRPRO Digital Khata (Source of Truth)

Last updated: 2026-10-20 · App version: v19.9.1 -> **v19.9.4** (patch)

Is file me jo likha hai wahi final logic hai. Jo yahan nahi hai, uske liye pehle poocho: *"Ye scenario Fix.md me nahi hai, exact logic bataiye."* Koi naya feature, schema ya data format apne aap nahi badlega. Saare badlav backward compatible hain.

---

## 1. Amount Colour Rule (Dashboard + Email + Customer View)

| Type | Matlab | Rang |
|---|---|---|
| `udhaar` | Diya (Giving) | 🔴 Red `#ef4444` |
| `byaj_loan` | Loan diya | 🔴 Red |
| `jama` | Mila (Received) | 🟢 Green `#10b981` |
| `loan_repay` | Loan wapsi mili | 🟢 Green |
| `interest_paid` | Byaj mila | 🟢 Green |

| Balance | Dashboard card | Email | Customer View hero |
|---|---|---|---|
| > 0 (customer ka baaki) | 🔴 Red | 🔴 Red | 🔴 Red |
| < 0 (advance) | 🟢 Green | 🟢 Green | 🟢 Green |
| = 0 | default (rang nahi) | 🟢 Green | 🟢 Green |

Rule ek hi jagah define hai: `dashboard.html` me `AMT_COLORS`, `txnAmountColor()`, `balanceColor()`, `balanceStyle()`. Email aur dashboard dono yahi use karte hain.

---

## 2. Fixed

| # | Severity | Issue -> Root cause | Fix (file) |
|---|---|---|---|
| 1 | High | Email me amount ka rang nahi tha. `sendTransactionEmail()` rang bhejta hi nahi tha, template ka text dark tha. | `dashboard.html`: `amount_color`, `type_color`, `balance_color`, `balance_label` params |
| 2 | High | Dashboard customer card par Udhaar/Byaj value par rang nahi. `fmt()` sign hata deta hai, diya aur mila ek jaise dikhte the. | `dashboard.html` `balanceTone()` + `balanceStyle()` |
| 3 | Medium | History me `byaj_loan` default rang, `loan_repay` blue, `interest_paid` violet. | `dashboard.html` inline CSS `.txn-amt` |
| 4 | Low | `Math.abs(newBalance)` undefined par `NaN`. | `Math.abs(newBalance \|\| 0)` |
| 5 | Medium | Advance par email label "कुल बकाया राशि" galat. | `balance_label` param: advance -> "एडवांस राशि" |
| 6 | Medium | `customer-view.html` loan types amber/blue/violet. | `customer-view.html` CSS |
| 7 | High | Dashboard par rang nahi dikha: `service-worker.js` `ux-pro.css` ko cache-first deta hai, purani CSS me naye class nahi the. | Card par inline `style="color:..."` (CSS file par depend nahi) |
| 8 | High | Email me "कुल बकाया" ka number gayab, customer naam khali: EmailJS template ke variable naam code se match nahi karte. | Naya template `emailjs-template-txn.html` + balance 7 common naam se bhi jata hai |
| 9 | Medium | Email me zero balance grey. | `balanceColor()`: zero/advance = green |
| 10 | Medium | Email me type text white, amount chhota. | Template: type red/green, amount 34px, balance 40px |
| 11 | Low | Welcome email purane design me. | `emailjs-template-welcome-vip.html` (black + gold) |
| 12 | High | `customer-view.html` hero white background par white text (invisible): `ok-theme` ne `--gradient-dark` white kar diya tha. | `customer-view.html` `<style id="vip-theme">` (black + gold) |
| 13 | High | `index.html` (login), `signup.html`, `forgot-password.html` ka header white tha aur title white (invisible): same `ok-theme` bug jo customer-view me tha. | Teeno me `<style id="vip-theme">` (black + gold), `theme.css` ke baad. Header, card, input, button, message, toast sab VIP |
| 14 | High | **`dashboard.html` (main app: home, customer, reports, settings, calculator, modals) VIP nahi tha.** Sab pages ab ek jaise black + gold. | `dashboard.html` me `<style id="vip-theme">` (variables + hard-coded light rang override); top-bar / dash-hero / bottom-tabs / fab ki **original definition** `ux-pro.css` me badli (project rule: har component ki CSS sirf ek jagah, test #181) |
| 15 | Medium | Cache: `service-worker.js` `ux-pro.css` ko cache-first deta hai, naya CSS purane users tak na pahunchta. | Version `19.9.2` (`package.json` -> `npm run sync:version`: `app-config.js`, `service-worker.js` cache name) |
| 16 | Low | Status bar / PWA rang green tha. | `<meta name="theme-color">` = `#000000` (5 pages), `manifest.json` `theme_color` `#000000`, `background_color` `#050505` |
| 17 | High | **Launch flow:** Splash -> Login flash -> Biometric -> Loading -> Dashboard. Returning user ko bhi login page dikhta tha, aur dashboard pehle paint hota phir lock. | `index.html`: saved login (`bsp_userId`) ho to head me hi `location.replace('dashboard.html')` (login skip). `dashboard.html`: `#bootSplash` splash; `bootShowDashboard()`: dashboard neeche tayyar, **biometric splash ke upar**, success => splash hata dashboard turant, cancel/fail => PIN. Session expire => dashboard `bsp_userId` hata kar index bhejta hai (loop nahi). `?login=1` se auto-skip band |
| 18 | High | **Save 3-5 sec** (Payment/Jama; Loan, Customer add/edit bhi, D2): `saveTxn` `await batch.commit()` karta tha (server ack ka intezaar). User dobara entry kar deta tha. | `saveTxn`: Optimistic UI. `batch.commit()` await nahi; modal band + **"Entry Successful ✅"** toast turant; form clear; sync background. Net slow/band => Firestore SDK local me rakh kar apne aap sync karta hai. Server reject => error toast (entry chupchap gayab nahi). Offline queue, credit-limit warning, email/SMS/public-view waise hi (commit ke baad background me) |
| 19 | Low | Login/Signup/Forgot-password par theme toggle (chand ka icon). | `theme.js` ab `<html data-no-theme-toggle>` manta hai; teeno pages me laga. Toggle sirf Settings me |
| 20 | Info | **Local-first data:** pehle se maujood. Firestore offline persistence (`enablePersistence`) hi local DB hai, `onSnapshot` reactive stream hai (dashboard cache se turant paint). Naya Hive/SQLite nahi joda (is stack me hai hi nahi, duplicate data se balance mismatch ka risk). | Koi badlav nahi; sirf spinner ki jagah splash, aur biometric paint se pehle |

Detail aur exact code diff: `FIXES-2026-10-20-amount-colors.md`.

---

## 3. Files jo badle

| File | Kya badla |
|---|---|
| `dashboard.html` | Colour helpers, email params, card inline rang, history CSS, debug log `📧 Email params` |
| `customer-view.html` | Loan type rang, hero balance class, VIP theme block |
| `index.html`, `signup.html`, `forgot-password.html` | VIP theme block (sirf CSS, JS/IDs/logic same) |
| `ux-pro.css` | `.cc-box-value.amt-*` + `.top-bar`, `.dash-hero`, `.bottom-tabs`, `.fab` VIP rang (in-place) |
| `manifest.json`, `package.json`, `app-config.js`, `service-worker.js` | theme rang + version 19.9.4 + cache name |
| `theme.js` | `data-no-theme-toggle` opt-out; dark status-bar rang `#000000` |
| `index.html`, `signup.html`, `forgot-password.html` | `<html data-no-theme-toggle>`; index me returning-user redirect |
| `tests/launch-optimistic.test.mjs` (naya) | launch flow / optimistic save / theme toggle ke guard tests |
| `www/*` | Generated copy, `npm run prepare:web` se update hota hai |
| EmailJS `template_vhuakzs` | `emailjs-template-txn.html` se poora replace |
| EmailJS `template_w0qs21r` (welcome) | `emailjs-template-welcome-vip.html` se poora replace |

**Nahi badla:** storage schema, encryption, backup format, `ledger.js`, `interest-calc.js`, Firestore rules.

---

## 4. Email Template Variables (code -> template, naam exact yahi)

Transaction (`template_vhuakzs`): `shop_name`, `customer_name`, `customer_email`, `transaction_type`, `type_color`, `amount`, `amount_color`, `date`, `balance`, `balance_color`, `balance_label`, `view_link`, `note`.
Welcome: `user_name`, `user_email`, `app_link`, `reset_link`.

Extra balance aliases (harmless): `balance_display`, `total_balance`, `total_due`, `outstanding`, `new_balance`, `balance_amount`.

---

## 5. Deploy Checklist

1. `patched/` ki saari 11 files root me rakho (is baar sirf `dashboard.html`, `package.json`, `app-config.js`, `service-worker.js` naye hain, baaki pichhli baar jaisi): `dashboard.html`, `customer-view.html`, `index.html`, `signup.html`, `forgot-password.html`, `ux-pro.css`, `manifest.json`, `package.json`, `app-config.js`, `service-worker.js`, `theme.js`. Aur `patched/tests/launch-optimistic.test.mjs` repo ke `tests/` folder me.
2. `npm run prepare:web` (ya wahi files `www/` me bhi).
3. GitHub par push, deploy ka wait.
4. Browser: service worker unregister + Ctrl+F5. APK: update/reinstall.
5. EmailJS me dono templates replace karo, Save.
6. Test: ek diya + ek mila entry, Gmail me dekho (rang, amount size, कुल बकाया number).

---

## 6. Testing

- `npm test`: 211/211 pass (9 naye guard tests). `verify:web`: PASS. Pehli baar VIP block me 2 guard tests fail hue the (`#a78bfa` hardcode, aur ek component ki CSS do jagah), dono theek kiye, test dheela nahi kiya.
- `customer-view.html` Chromium me mock data se render check: baaki, zero, advance teeno sahi.
- `index`, `signup`, `forgot-password` Chromium screenshot: header title padhne layak, input/button/footer VIP.
- `dashboard.html` Chromium (mock state): home, customer, reports, settings screens VIP, JS error nahi.
- Chromium flow tests (mock Firebase + mock biometric): returning user login skip; stale session loop nahi; biometric splash ke upar (dashboard neeche tayyar), success => dashboard, cancel => PIN; fresh user par login pages me theme toggle 0; save: server 3s slow ho tab bhi toast **63 ms** me, server reject par error toast aur pending 0.

## 7. NOT TESTED

- Asli email delivery (sandbox me network band). EmailJS template aapke account me hai.
- Real Android WebView, asli Firebase, **asli fingerprint/face prompt** (plugin mock tha), Gmail dark mode.
- Live GitHub Pages deploy.

## 8. Developer decisions (pehle open sawal the, ab fix ho gaye)

| # | Sawal | Faisla | Kyun |
|---|---|---|---|
| D1 | Settings theme toggle: VIP me Light/Dark same dikhte hain | Settings ka Light/Dark/System chooser **chhupa diya** (`[data-theme-set]`); theme.js API waisi hi. App Health rows rehti hain | Jo control kuch badalta nahi wo bug hai. VIP = ek brand theme. Wapas chahiye to `dashboard.html` VIP block ki ek CSS line hatao + Light VIP variant banao |
| D2 | Optimistic baaki saves par | `saveLoan`, `saveCustomer`, `updateCustomer` **optimistic** (simple write, koi read-modify-write nahi). `saveRepay`, `saveIntPaid`, `saveEditedTxn`, `deleteTxn` **optimistic nahi**: ye `runTransaction` hain jo server ki taaza value padh kar likhte hain | Inhe optimistic karte to 3-5 sec balance purana dikhta (double entry wapas aati) ya doosre phone ki repayment overwrite ho sakti thi. Inme Save button turant "⏳ Saving…" + disable hota hai (`setSaveBusy`), fail par wapas |
| D3 | Server reject par entry | Reject hui entry ab Offline queue ki **"जाँच चाहिए"** list me aati hai (banner ⚠️), wahan **✏️ Re-enter** (form prefilled) aur 🗑 Discard. Error text lal | Entry chupchap gayab nahi hoti. Purana outbox UI reuse kiya, naya system nahi |

## 9. Open points

1. Gmail dark mode me red/green ka alag shade chahiye? (abhi email me `#ef4444` / `#10b981`)
2. Dashboard card me zero balance par bhi green chahiye? (abhi default rang)
3. `deleteLoan`, `saveEditedLoan`, `settleLoan` bhi `runTransaction`/read-modify-write jaisi hain, isliye D2 ke rule se optimistic nahi kiye.
