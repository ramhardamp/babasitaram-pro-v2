# BSR PRO Digital Khata — Ledger Rules (single source of truth)

Code: `ledger.js` (pure functions). Tests: `tests/ledger.test.mjs`. Har screen (dashboard, portal, share, UPI, statement, export, integrity) isi se balance nikalti hai.

## Transaction types
- [x] `udhaar` — ordinary credit diya (+ordinary)
- [x] `jama` — ordinary payment mila (−ordinary)
- [x] `byaj_loan` — loan (principal + monthly rate + startDate); embedded `repayments[]` aur `interestPaid`
- [x] `loan_repay` — sirf principal ghatata hai (loanId zaroori)
- [x] `interest_paid` — sirf interest ghatata hai, principal nahi (loanId zaroori)
- [x] Deleted record (`status:'deleted'` ya `deletedAt`) kisi total mein nahi ginta

## Canonical formula
- [x] `ordinaryNet = Σudhaar − Σjama`
- [x] `ordinaryOutstanding = max(0, ordinaryNet)`, `advance = max(0, −ordinaryNet)` (dono kabhi saath >0 nahi)
- [x] `totalOutstanding = ordinaryOutstanding + loanPrincipalOutstanding + interestOutstanding`
- [x] Advance loan/interest se **net nahi hota** — alag dikhta hai (visible change: pehle `grandTotal` mein advance loan se kat jaata tha)
- [x] `interestOutstanding = max(0, interestAccrued − interestPaid)` (negative nahi)

## Loan interest mode (`APP_CONFIG.interestMode`)
- [x] `legacy` (DEFAULT) — purana rule: current principal × monthly rate × poore elapsed months. Purani history ka koi number nahi badla (200 random loans par purane `calcLoan` se bit-for-bit match test).
- [x] `timeline` — repayment ke baad agle period se kam principal par interest; poori repayment ke baad bacha hua accrued byaj band loan mein bhi dikhta hai.
- [ ] Owner ka final business rule confirm hona baaki hai. Mode badalne se purane customers ke interest numbers badal sakte hain — pehle owner se confirm karein.
- [x] `loan.repayments[]` / `loan.interestPaid` authoritative; linked `loanId` transactions sirf tab fallback jab embedded khaali ho. Integrity checker dono ka mismatch pakadta hai.

## Public portal payload (`schemaVersion: 2`)
- [x] Fields: `ordinaryOutstanding, advance, loanPrincipalOutstanding, interestOutstanding, totalOutstanding, ordinaryUdhaar/Jama, loanGiven/Repaid, interestPaid, updatedAt`
- [x] Legacy fields (`balance, totalUdhaar, totalJama, transactions`) compat ke liye rehte hain
- [x] Payload ab fresh transactions se bante hain, stale `party.balance` se nahi
- [x] `merge:true` write — `createdAt / revokedAt / expiresAt` overwrite nahi hote

## Invariants (tests mein enforced)
- [x] ordinary/advance negative nahi; dono saath >0 nahi
- [x] total aur loan formula exact
- [x] `ordinaryOutstanding − advance == Σudhaar − Σjama` (300 random ledgers, dono modes)

## Statement
- [x] Closing balance period ke end tak ka canonical state (pehle hamesha "abhi" ka tha)
- [x] `interest_paid` running loan (principal) column ghatata nahi
- [x] Loan principal / interest / advance alag boxes mein
