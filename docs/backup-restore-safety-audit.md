# Backup Import / Restore Safety Audit

Status: investigation only; no restore writes implemented.

## Current backup contract observed on main
- schemaVersion: 2
- data: { user, customers, transactions }
- counts: customer and transaction array lengths
- integrity.checksumSha256: SHA-256 of JSON.stringify(data)
- Export waits for dataReady and checks the digest before download.
- Firestore paths observed: users/{uid}/parties and users/{uid}/transactions.

## Non-negotiable safety gates
1. Parse a selected JSON file without any Firestore writes.
2. Validate supported schema version, exact required arrays, record shapes, IDs, owner scope, and checksum.
3. Build a read-only preview and reconciliation report; never infer/overwrite live records silently.
4. Define explicit restore modes (merge vs replace) only after documented conflict semantics. Default must not delete or overwrite existing records.
5. Require fresh backup of current account before any authorized mutation.
6. Use bounded, resumable batches with idempotency and a durable operation journal; handle Firestore write limits.
7. Never import another user's UID/profile or public-view tokens as authority.
8. Test malformed, tampered, duplicate, orphan, empty, oversized, interrupted, retry, and mixed-schema fixtures in an isolated Firebase emulator/project.
9. Verify customer balances and all transaction/loan types against documented ledger rules.
10. Keep production restore disabled until all automated and manual gates pass.

## Initial audit findings
- No Import/Restore UI or restore writer was found in dashboard.html.
- Existing integrity check currently reconciles only udhaar minus jama for customer balance; loan principal/repayment/interest semantics need a separate ledger specification before restore can be called safe.
- This document does not enable restore or change customer data.
