# Loan Ledger Specification (Draft — Decision Required)

Status: draft for business-rule confirmation only. This document does not change application behavior and is not authorization to calculate, migrate, import, or restore production records.

## Scope observed in the current dashboard

The dashboard recognizes these transaction types:
- `byaj_loan`: loan record; active loan selection uses this type and `status === 'active'`.
- `loan_repay`: loan repayment entry.
- `interest_paid`: interest payment entry.
- `udhaar` and `jama`: separate customer credit/debit ledger entries.

Current summary code calls `calcLoan(loan)` for active `byaj_loan` records. This draft does not assume that the current calculation is correct or define undocumented historical behavior as policy.

## Decisions required before implementation

The owner must confirm each item against actual business practice and existing customer records. Until then, each item is **UNDECIDED** and must block production restore.

| Topic | Candidate choices | Current decision |
|---|---|---|
| Interest model | Simple interest; compound interest; flat/periodic fee; no interest | UNDECIDED |
| Rate unit | Per day, month, year, or explicit period | UNDECIDED |
| Day-count convention | Actual days/365; Actual/Actual; 30/360; fixed monthly periods | UNDECIDED |
| Accrual start/end | Disbursement date; next day; due date; closure date/inclusive rule | UNDECIDED |
| Compounding cadence (if applicable) | Daily, monthly, yearly, none | UNDECIDED |
| Repayment allocation | Interest-first; principal-first; proportional; user-designated allocation | UNDECIDED |
| Partial payments | Allocation and rounding rules | UNDECIDED |
| Overpayment | Reject; refund/credit; carry forward | UNDECIDED |
| Rate changes | Prospective only; effective-dated schedule; other | UNDECIDED |
| Backdated edits/deletes | Recompute derived ledger; preserve immutable audit events; correction entry | UNDECIDED |
| Closure | Close only when principal and due interest are zero; explicit waiver/write-off; manual close with reason | UNDECIDED |
| Reopen | Prohibited; authorized correction workflow | UNDECIDED |
| Currency rounding | INR paise precision and per-period vs final rounding | UNDECIDED |
| Legacy records lacking fields | Quarantine/manual review; never silently infer | UNDECIDED |

## Required ledger model (proposed, not yet adopted)

Keep source events distinct from derived balances. Each loan should be traceable by stable loan ID and event ID, with customer/account ownership, event type, amount in integer paise where feasible, effective date, recorded timestamp, status/deletion marker, and correction/audit linkage. Do not use imported owner IDs or public-view tokens as authority.

Derived reporting should separately expose:
- Original principal and principal outstanding.
- Accrued interest, interest paid, and interest outstanding.
- Unallocated/overpayment credit, if policy permits.
- Loan state and closure reason/date.
- Reconciliation differences and source event IDs.

Never silently rewrite historical source events to make totals agree. A correction must be attributable and reversible.

## Invariants to validate

1. Amounts are finite, non-negative, and within documented precision/range.
2. Every event refers to exactly one valid loan/customer in the same authenticated owner scope.
3. Duplicate event IDs and ambiguous loan links are rejected or quarantined.
4. Deleted/voided events are excluded from active calculations but remain auditable.
5. Principal and interest are never conflated in reporting or allocation.
6. Replaying the same event set deterministically yields the same result.
7. Date ordering, same-day ordering, timezone, and rounding are explicit and tested.
8. Closure requires the approved closure rule and a recorded reason where an adjustment/waiver occurs.
9. Unknown transaction types or missing required fields block restore; no guessed defaults.
10. Reconciliation emits differences without writing to Firestore.

## Required approval

Before implementation, record the owner's explicit answers for every decision above, approve example calculations, and version the specification. Any change to approved rules requires a new version and regression fixtures.

## Release boundary

Production restore and ledger mutation remain disabled until all documented safety gates, emulator tests, manual review, and reconciliation acceptance criteria pass. This document alone grants no permission to enable them.
