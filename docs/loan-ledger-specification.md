# Loan Ledger Specification (Owner-Approved Rules; Implementation Pending)

Status: business rules below are OWNER-APPROVED as of 2026-10-02. This is specification approval only; it does not change application behavior or authorize migration, import, restore, or production writes.

## Scope observed in the current dashboard

The dashboard recognizes these transaction types:
- `byaj_loan`: loan record; active loan selection uses this type and `status === 'active'`.
- `loan_repay`: loan repayment entry.
- `interest_paid`: interest payment entry.
- `udhaar` and `jama`: separate customer credit/debit ledger entries.

Current summary code calls `calcLoan(loan)` for active `byaj_loan` records. This draft does not assume that the current calculation is correct or define undocumented historical behavior as policy.

## Approved business rules

The owner explicitly approved the following core rules on 2026-10-02:

| Topic | Approved rule | Status |
|---|---|---|
| Interest model | Simple interest; no interest-on-interest (no compounding). | APPROVED |
| Repayment allocation | Principal-first allocation. | APPROVED |
| Overpayment | Preserve the excess as separately tracked advance/unapplied credit; do not discard or silently refund it. | APPROVED |
| Closure | A loan closes only when both principal outstanding and interest due are fully settled. | APPROVED |

The approval does not by itself settle the remaining operational details below (rate unit, day-count basis, accrual date boundaries, rounding, treatment of waivers/write-offs, rate changes, corrections, and legacy incomplete records). Those must be specified and tested before implementation. Where a payment exceeds principal under principal-first allocation, the approved overpayment-credit rule applies to the excess after the applicable allocation; interest accounting must remain separately visible.

## Remaining implementation details (not yet approved)



The remaining items require explicit decisions before implementation; they must block production restore until resolved.

| Topic | Candidate choices | Current decision |
|---|---|---|
| Interest model | Simple interest; compound interest; flat/periodic fee; no interest | APPROVED: simple interest |
| Rate unit | Per day, month, year, or explicit period | UNDECIDED |
| Day-count convention | Actual days/365; Actual/Actual; 30/360; fixed monthly periods | UNDECIDED |
| Accrual start/end | Disbursement date; next day; due date; closure date/inclusive rule | UNDECIDED |
| Compounding cadence (if applicable) | Daily, monthly, yearly, none | UNDECIDED |
| Repayment allocation | Interest-first; principal-first; proportional; user-designated allocation | APPROVED: principal-first |
| Partial payments | Allocation and rounding rules | UNDECIDED |
| Overpayment | Reject; refund/credit; carry forward | APPROVED: retain as advance credit |
| Rate changes | Prospective only; effective-dated schedule; other | UNDECIDED |
| Backdated edits/deletes | Recompute derived ledger; preserve immutable audit events; correction entry | UNDECIDED |
| Closure | Close only when principal and due interest are zero; explicit waiver/write-off; manual close with reason | APPROVED: principal and interest both fully settled; exception/write-off mechanics pending |
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


## PROPOSED (Pending Owner Approval)

**Important:** Core rules listed in the Approved business rules section are owner-approved. The remaining proposals below are not adopted policy and are not implementation authorization; no code may rely on unresolved details.

| Topic | Standard accounting proposal for review | Owner decision |
|---|---|---|
| Interest model | Simple interest on outstanding principal; no interest-on-interest. If the business actually quotes a flat fee on original principal, record that as a distinct fee model, not silently as reducing-balance interest. | PENDING |
| Rate unit | Store the quoted rate and explicit unit; proposed default is annual nominal percentage, with the UI displaying the unit unambiguously. | PENDING |
| Day count | Actual elapsed calendar days / 365 for annual simple interest; define leap-year treatment explicitly before adoption. | PENDING |
| Accrual boundaries | Start on the day after disbursement; accrue through the day before settlement/closure. Dates use the account's declared timezone and date-only effective dates. | PENDING |
| Compounding | None under the simple-interest proposal. | PENDING |
| Repayment allocation | Proposed principal-first: allocate the repayment to principal outstanding up to that amount; then to accrued interest; any remainder becomes unapplied advance credit. Show the allocation breakdown before recording. This is a business choice, not a universal accounting rule. | PENDING |
| Partial payments | Apply the same approved allocation deterministically; retain the original payment event and record any correction as a separate linked event. | PENDING |
| Overpayment | Do not discard or silently refund. Keep excess as a separately identified customer advance/unapplied credit; require an explicit later application or refund event and audit trail. | PENDING |
| Rate changes | Effective-dated and prospective only; never retroactively change already accrued periods without an explicit correction event and owner-approved reason. | PENDING |
| Backdated edits/deletes | Preserve the original event in audit history; use linked reversal/correction events. Recompute derived balances from the corrected event stream in preview only; do not mutate source history. | PENDING |
| Closure | Close when principal and due interest are both zero, or after an explicitly recorded, authorized waiver/write-off with amount, date, reason, and actor. A manual close with a nonzero balance must be visibly exceptional and must not erase the balance. | PENDING |
| Reopen | No silent reopen. Use an authorized, audited correction/reopen event with reason and linkage to the closure. | PENDING |
| Currency rounding | INR amounts stored as integer paise; proposed round-half-up to paise at each explicitly defined accrual period, with no binary floating-point money arithmetic. Confirm tax/contract treatment separately where applicable. | PENDING |
| Legacy missing fields | Quarantine for manual review; do not infer rate unit, dates, allocation, owner, or loan linkage. Preserve original bytes/record evidence and report blockers. | PENDING |

### Approval worksheet

For each row, owner response must be one of **ACCEPT**, **REJECT**, or **EDIT**, with any replacement rule and at least one worked example. Until all remaining required choices and worked examples are approved, restore readiness remains blocked.

## Required approval

Core owner approval recorded 2026-10-02. Before implementation, resolve the remaining details, approve worked examples, and version the specification. Any change to approved rules requires a new version and regression fixtures.

## Release boundary

Production restore and ledger mutation remain disabled until all documented safety gates, emulator tests, manual review, and reconciliation acceptance criteria pass. This document alone grants no permission to enable them.
