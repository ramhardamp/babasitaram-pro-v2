# Read-only Backup Reconciliation Test Plan

Status: planning document only. No production reads are initiated by this plan; no Firestore writes, deletes, imports, migrations, or restore operations are authorized.

## Objective

Validate a selected backup and compare its customer/transaction/loan data with a controlled reference dataset, producing a report only. Production account data must not be used for destructive or mutation tests. Use synthetic fixtures and an isolated Firebase Emulator/project for test execution.

## Safety boundaries

- The parser and validator must be pure/read-only: no Firestore client write methods, batch commits, deletes, or public-view updates.
- Never trust imported UID, account profile, or public-view token fields as authorization.
- Do not log raw customer PII, credentials, tokens, or complete backup contents.
- Do not modify, repair, normalize, or silently drop source records. Report invalid rows and stable record identifiers/hashes.
- Any unexpected network/write call is an immediate test failure and stop condition.
- Production restore stays disabled regardless of test outcomes until all gates are separately approved.

## Test phases

### Phase 1 — Backup envelope

Check supported schema version, required object/array types, counts, checksum encoding and verification, UTF-8/JSON parse errors, maximum file size, and unsupported future versions. Verify checksum is integrity detection, not authenticity or authorization.

### Phase 2 — Record validation

Validate required fields and types; finite non-negative monetary values and precision; stable unique IDs; valid dates/timezone assumptions; known transaction types; customer references; owner scope; deleted/voided markers; and safe handling of unknown fields. Invalid records must be reported/quarantined, never guessed into validity.

### Phase 3 — Read-only reconciliation

For each customer, report:
- Source customer balance versus independently recomputed active non-loan balance, using only confirmed ledger semantics.
- Active, deleted/voided, and orphan transaction counts separately.
- Duplicate IDs, missing customer references, unrecognized types, invalid dates/amounts, and count/checksum mismatches.
- Loan principal, repayment, interest paid/accrued/outstanding, closure status, and unexplained differences only after the loan specification is approved.

Do not treat a current stored balance as authoritative without checking its derivation. Do not include loan amounts in ordinary udhaar/jama reconciliation unless documented policy explicitly requires it.

### Phase 4 — Synthetic fixture matrix

| Fixture | Expected read-only result |
|---|---|
| Empty valid backup | Valid envelope; zero-record report; no writes |
| Malformed JSON / missing required fields | Reject with actionable validation error |
| Tampered payload / wrong checksum | Reject integrity verification |
| Duplicate customer or transaction IDs | Reject or quarantine with duplicate diagnostics |
| Orphan transaction | Report unresolved reference; block restore readiness |
| Unknown schema/type | Reject or quarantine; never infer |
| Negative, NaN-like, infinite, excessive precision/size values | Reject invalid monetary data |
| Deleted/voided event | Excluded from active totals, retained in audit counts |
| Loan edge cases | Expected outputs only from approved specification examples |
| Oversized input | Bounded failure without excessive memory use |
| Interrupted/retried dry-run | Deterministic same report; no writes |
| Cross-owner identifiers/tokens | Must not grant access or alter authenticated scope |

### Phase 5 — Emulator isolation and instrumentation

Use a dedicated emulator dataset/project with synthetic identities and seeded fixtures. Instrument or wrap write APIs so any attempted write during parse/preview/reconciliation fails the test. Capture test logs without PII. Confirm the live Firebase project is not configured as the test target.

### Phase 6 — Evidence and acceptance

For every case record fixture version/hash, expected result, actual result, test command/tool version, and pass/fail. Require:
- All read-only tests pass.
- Zero write attempts during validation/reconciliation.
- Deterministic reports across repeat runs.
- No silent record loss or mutation.
- Loan examples approved by the owner and matched exactly.
- Manual reviewer sign-off for every applicable safety gate.

A passing plan/test suite is not permission to enable production restore. Restore requires a separate reviewed implementation, recovery/rollback design, fresh backup procedure, explicit user confirmation, and release authorization.

## Current status

Not executed. No emulator results are claimed. Production restore remains disabled.
