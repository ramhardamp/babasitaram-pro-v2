# BSR PRO Interest Ledger — Implementation Specification

Status: researched design; not yet wired into customer transactions. This document is not a migration and must not change existing customer data.

## Product boundary
- Keep the ordinary Khata ledger (udhaar/jama) independent from the Interest/Loan ledger.
- Customer detail first shows two visually distinct destinations: “खाता / Udhaar” and “ब्याज / Loan”.
- Ordinary ledger entry screen contains only Give Udhaar and Take Payment.
- Loan ledger contains New Loan, Interest Entry/Accrual, Principal Repayment, Interest Received, and Settlement.
- Combined customer balance is a read-only sum of the two independently calculated balances. Each history row carries a ledger-type label.
- Do not copy another app's code, artwork, or proprietary UI. Use independently implemented behavior based on publicly described capabilities.

## Publicly described reference capabilities
Based on the Google Play listing for ByajApp (package com.ramkaranyadav18.byajcalculator; listing updated 14 May 2026):
- Per-customer lend/borrow ledger and per-entry interest rate.
- Automatically accrued interest; full and partial repayment; running balance.
- Settle/unsettle with history; edit/delete; receipt/agreement attachments.
- Customer search/filter/sort, overdue indicators, customer and single-entry PDF/share/reminders.
- Configurable day-count, month-length, compounding window, rounding; daily/monthly/quarterly/semiannual/annual compounding.
- Statement should disclose the calculation settings used.
Reference: https://play.google.com/store/apps/details?id=com.ramkaranyadav18.byajcalculator

Other public listing descriptions reviewed:
- Simple interest, compound interest, rate finder, forecast, partial payments, settlement, and interest ledger.
- Daily/monthly interest; allocate receipts to interest, principal, or both; optional interest capitalization/loan merge.
These are feature inspirations only; each behavior must be specified and tested before enabling.

## Calculation modes to support, behind explicit per-loan settings
1. Simple interest, non-capitalizing: I = P × (annualRate/100) × elapsedYearFraction.
2. Periodic simple interest: I = P × (periodRate/100) × completedPeriods, with an explicit policy for partial periods.
3. Compound interest: A = P × (1 + nominalAnnualRate/m)^n, only when compounding is explicitly selected; store compounding frequency and effective interval.
4. Daily accrual: compute by elapsed calendar days and selected day-count basis (ACT/365, ACT/366, ACT/360, or 30/360). Do not silently assume a basis.
5. Rate finder and forecast are calculators only; they must not write ledger records.
6. Legacy loans retain the current legacy calculation until user-confirmed migration/loan edit. Never silently reinterpret old loans.

## Repayment allocation
- Every repayment stores total received, principal allocation, interest allocation, date/time, linked loan ID, and idempotency key.
- Validate allocation sum equals received amount (within currency minor-unit precision).
- Principal allocation cannot exceed outstanding principal.
- Interest received cannot exceed accrued unpaid interest unless an explicit advance/prepayment policy is chosen.
- Allocation policy is explicit: manual split, interest-first, principal-only, or interest-only.
- Recompute from immutable dated events, not by mutating historical amounts.

## Ledger event model (proposed, not yet deployed)
Loan settings snapshot: calculationVersion, principalMinorUnits, currency=INR, annualRateBps or periodRateBps, ratePeriod, interestMode, dayCountBasis, monthLengthPolicy, compoundingFrequency, roundingMode, startDate, timezone, createdAt.
Events: loan_opened, interest_accrued (if materialized), payment_received with principal/interest split, settlement, reopen, correction/reversal. Preserve actor, event timestamp, effective date, reason, source transaction ID, and idempotency key.
Use integer paise for stored monetary amounts; do not use binary floating point as persisted money. Round only at explicitly defined posting/display boundaries.

## UI / UX
- Customer detail: two separate ledger cards and independent balances.
- Khata entry route: Give Udhaar / Take Payment only.
- Loan route: New Loan / Interest / Principal Repayment / Interest Received / Settlement.
- Loan setup preview must show rate unit, calculation mode, day-count, compounding, date range, accrued interest, paid interest, outstanding principal, and total due before save.
- History filters: All, Khata, Loan; every item visibly tagged. Search and date filters.
- PDF/WhatsApp statement includes calculation method, rate, period, day-count/compounding settings, principal, accrued interest, allocations, and as-of date.
- Confirm before settlement, reopening, edit, or reversal. Prefer reversal/correction events over destructive deletion.

## Safety and rollout gates
- No Firestore writes, schema migrations, backfills, or production deployment as part of this specification.
- Keep current legacy records readable and unchanged.
- Before integration: golden test vectors for month-end/leap-year/date boundaries, partial repayment mid-period, zero/negative/invalid rates, same-day events, rounding, settlement/reopen, duplicate retries, and legacy compatibility.
- Test in isolated emulator/test project and use synthetic records only.
- Feature flag new calculation engine; do not switch existing loans until explicit, reviewed migration with export/rollback plan.
- Verify customer balance reconciliation, PDF disclosure, offline behavior, concurrency/idempotency, and Android 16 smoke before release.

## Current implementation gap found in branch
The existing `calcLoan` applies the remaining principal to the elapsed duration as one simple monthly calculation and the loan creation form stores only principal, monthly rate, start date, note, and legacy status. The repayment path currently treats repayments as principal-only; interest receipt is tracked separately. Therefore configurable day-count, compounding, rate finder/forecast, payment allocation, and independent ledger navigation are not yet integrated. Do not claim the research features are shipped until those are implemented and tested.
