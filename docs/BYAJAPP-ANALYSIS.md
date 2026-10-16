# ByajApp (com.ramkaranyadav18.byajcalculator) - analysis (12 Oct 2026)

**Source & confidence:** (1) Play Store listing (public description, "What's new", reviews), (2) user ke 3 screenshots. App ka andar ka code/APK dekha nahi gaya. Formula screenshot ke numbers se nikala aur reproduce kiya (exact match). Jahan "inferred" likha hai wo anumaan hai.

## 1. Formula (verified - screenshot numbers se exact)
Compound, Monthly, 2%/month, principal 43,309, start 2 Jun 2026, asOf 12 Oct 2026:
| Period | Interest | Running |
|---|---|---|
| 2 Jun -> 2 Jul | 43,309 x 2% = 866.18 | 866.18 |
| -> 2 Aug | (43,309 + 866.18) x 2% = 883.50 | 1,749.68 |
| -> 2 Sep | (43,309 + 1,749.68) x 2% = 901.18 | 2,650.86 |
| -> 2 Oct | (43,309 + 2,650.86) x 2% = 919.19 | 3,570.05 |
| 2 Oct -> 12 Oct (10 din) | (43,309 + 3,570.05) x 2% x 10/30 = 312.53 | 3,882.58 |
Outstanding = 43,309 + 3,882.58 = 47,191.58.
- Period start date ki **anniversary** se (calendar 1st se nahi); chalu period **din/30**; period end par byaj principal me **capitalize**.
- Frequency N mahine (Monthly 1, Quarterly 3, Half-yearly 6, Yearly 12): poora period = base x rate x N; Daily: roz base x rate/30 capitalize (inferred, same convention).
- Rate per year => /12 (inferred).

## 2. Features (store listing)
Customers ka alag ledger - lent/borrowed + rate - auto accrued interest - full/part repayment + running balance - settle/unsettle - edit/delete - receipt/agreement attach (Pro) - overdue at a glance - search/filter (direction, overdue, activity) + sort (name, balance, last activity) - PDF statement + share (WhatsApp/email) - one-tap reminder - per-entry share - PIN lock (hashed+salted) - phone-number sign-in + sync - multi-language - Calculation settings (day count, month length, compounding window, rounding) - Daily/Monthly/Quarterly/Semiannual/Annual compounding - statement PDF par calculation settings.
Review insight: users ne maanga ki part-payment par principal ghate (warna byaj poore principal par chalta rehta hai).

## 3. Gap: ByajApp vs hamari app
| Feature | Status |
|---|---|
| Simple/Compound, 5 frequencies, per month/year | DONE (v6.9.3) |
| Due date + OVERDUE badge | DONE (v6.9.4) |
| Month-wise accrual table (running, CURRENT) | DONE |
| Part-payments list + "Interest on part-payments" ON/OFF + saved amount | DONE (v6.9.4, inferred semantics - neeche) |
| Statement PDF par byaj ki shartein | DONE (v6.9.4) |
| PIN lock, PDF, WhatsApp/SMS reminder, multi-language, sync, edit/delete | Pehle se hai |
| Borrowed direction ("You borrowed") | NAHI - logic chahiye |
| Attachments (receipt/agreement) | NAHI - Firebase Storage chahiye |
| Settle / unsettle toggle | NAHI - abhi confirm nahi |
| Calculation settings (day count, month length, rounding options) | NAHI - options ki list nahi pata |
| Filter by direction/overdue/activity, sort by last activity | NAHI |

## 4. "Interest on part-payments" ka logic (INFERRED)
Screenshot: OFF = "Repayments do not accrue interest", EARNED Rs0.00. Review = "part pay se principal nahi ghatta, byaj poore principal par".
- **OFF:** byaj poore principal par chalta rehta hai; repayment outstanding se face-value par kat-ti hai.
- **ON:** repayment ki tareekh se interest-bearing base ghatta hai; "SAVED/EARNED" = ON aur OFF ke byaj ka farak.
Misaal (10,000 vapsi 2 Aug): ON byaj 3,409 / baki 36,718 (bachat 474); OFF byaj 3,883 / baki 37,192.
**Default hamari app me ON** (purane loans ka behaviour: repayment principal ghatati hai). Reference app ka default OFF dikhta hai - confirm karein.


## Update 12 Oct 2026 - asli APK dekhne ke baad
Pehle sirf Play listing + screenshots the. Ab APK ke feature/behaviour dekhe (code copy nahi kiya, sirf kya karta hai):
- Simple calculator: Principal, Rate (per month; Advance mode me half-yearly/yearly), avadhi saal/mahina/din, Calculate -> Interest + Total. **Simple formula = hamare manual mode jaisa (verified).**
- Compound: sirf half-yearly / yearly interval. "Rate nikalo" (reverse) hai.
- Limits: principal <= 10,00,00,00,000, rate <= 30 per month, 2 decimal; Share app / Rate us / Contact us; ads.
**Hamare yahan ab usse zyada:** 5 compounding frequencies, dates se avadhi, reverse (dar/muldhan/samay), day-count + rounding, table, effective rate, compare, WhatsApp/photo share, ad-free, loan card ke saath same engine. Details: `docs/INTEREST-ENGINE.md`.
