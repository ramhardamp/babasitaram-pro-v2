# Interest Engine (interest-calc.js) - rules (12 Oct 2026)

Pure functions, koi UI/Firestore nahi. `node --test tests/interest-calc.test.mjs`. Loan card ka engine `ledger.js` hi source of truth hai; calculator uske helpers (`calendarMonths`, `compoundSchedule`) use karta hai taaki dono jagah same number aaye.

## Dar
`rate` + `rateUnit` (month | halfyear | year) -> andar hamesha per-month: `rm = rate/100 / (1 | 6 | 12)`.

## Avadhi
- **Tareekh se tareekh (cal30, default):** simple = `Ledger.calendarMonths(start,end)` (loan card jaisa); compound = `Ledger.compoundSchedule` (anniversary periods, adhura period = poore mahine + bache din/30).
- **Saal-mahina-din:** `months = 12*Y + M + D/30` (din >= 30 mahine me jud jaate hain).
- **actual365 / actual360:** `months = din/365*12` ya `din/360*12`.

## Formula
- Simple: `I = P * rm * months`
- Compound (N = 1, 3, 6, 12 mahine): har poore period ka byaj principal me judta hai: `base_k = P*(1+rm*N)^k`; adhure hisse par `base_k * rm * (bache mahine)` (simple). Daily: roz `base * rm/30` (actual365 me `rm*12/365`) capitalize.
- Rounding (sirf aakhir me): paise (2 decimal, default) | rupee (nearest) | floor | ceil.

## Ulta hisaab
- Dar: simple = `I/(P*months)`; compound = bisection (byaj dar ke saath badhta hai).
- Muldhan: byaj P ke seedhe anupaat me hai -> `P = I / I(P=1)`; kul rakam di ho to `P = total / (1 + I(P=1))`.
- Samay: simple = `I/(P*rm)`; compound = bisection (manual, 30-din mahina).

## Seemayein
Muldhan <= 1e11, dar <= 100% per month (halfyear 600, year 1200), avadhi <= 100 saal. Galat input par `errors[]` (`hi` + `en` message) milte hain, calculation nahi hoti.

## Reference app (ByajApp APK) se milan - 12 Oct 2026
APK ka calculator simple hai: simple = `P * rm * (12Y + M + D/30)` (hamare manual mode se EXACT same). Uska compound sirf half-yearly/yearly hai aur din ko `/360` se ginta hai; hamara engine 5 frequencies deta hai aur loan engine se match karta hai, isliye compound ke numbers jaan-bujhkar uske jaise nahi rakhe (hamare numbers loan card ke saath consistent hain).
