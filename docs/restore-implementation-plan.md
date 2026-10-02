# Restore Implementation Plan (Approval Required)

**Status:** Planning only — no implementation authorized  
**Branch:** `plan/restore-implementation-20261002`  
**Production restore:** DISABLED  
**Data policy:** No production reads beyond existing app behavior, no writes, no migrations, no deployment, and no restore execution until separate approval.

## 1. Objective and scope

Design a future restore pipeline that validates a user-selected backup, previews its impact, reconciles records safely, and only applies changes after explicit authorization. The first implementation must target a disposable Firebase Emulator project only. Production restore remains unavailable behind a hard-disabled capability flag until a separately reviewed release decision.

## 2. Proposed modules and functions

Names are provisional and require approval before coding.

- `parseBackup(input)`: parse supported JSON/backup formats; enforce size and schema-version limits.
- `validateBackupEnvelope(backup)`: validate required metadata, version, integrity/checksum, and allowed top-level shapes.
- `validateRecordSchemas(backup)`: validate customers, transactions, identifiers, dates, numeric amounts, and required fields without mutating data.
- `buildRestoreManifest(backup, currentSnapshot)`: create a deterministic plan of create/update/skip/conflict counts and stable record references.
- `detectDuplicateIds(records)`: identify repeated IDs within the backup.
- `detectOrphanTransactions(customers, transactions)`: identify transactions whose customer reference is absent.
- `classifyConflicts(incoming, existing)`: detect ID collisions, incompatible schema versions, and divergent records; default to conflict/skip, never silent overwrite.
- `calculatePreview(manifest)`: report counts and totals, including excluded/deleted/soft-deleted records, without writing.
- `requireRestoreAuthorization(preview, confirmation)`: require authenticated owner, explicit confirmation, and matching preview fingerprint.
- `applyRestorePlan(plan, adapter)`: future write boundary; initially callable only with an emulator-only adapter and explicit test capability.
- `verifyRestoreResult(expected, actual)`: post-apply counts, key relationships, balances/invariants, and integrity checks.
- `recordRestoreAudit(metadata)`: future audit metadata; do not log secrets, raw backup payloads, or personal data.
- `rollbackRestore(operationId)`: not part of initial scope unless a separately reviewed, proven rollback design is approved. Do not promise rollback where atomic recovery is not guaranteed.

## 3. Safety architecture

- Keep restore feature flag hard-disabled in production; no UI entry point or callable production restore path.
- Separate pure validation/planning from the future write adapter.
- Require an explicit environment guard that accepts only the named demo emulator project and loopback emulator endpoint during initial integration tests.
- Never infer permission to overwrite from a valid backup. Conflicts default to stop/skip and require a documented resolution policy.
- Use deterministic idempotency keys and operation IDs; define retry behavior before enabling writes.
- Enforce backup size, record-count, schema-version, and parsing limits.
- Avoid logging backup contents, credentials, customer phone numbers, or other personal data.
- No automatic restore, background restore, cloud-triggered restore, or production migration.

## 4. Emulator test plan (synthetic data only)

Use an isolated project such as `demo-bsr-restore` and Firestore Emulator on loopback. A future write-enabled test may seed only synthetic fixtures in that disposable emulator; it must never point at a production project.

### Validation-only cases
- Valid empty and populated backup.
- Malformed JSON, unsupported schema version, oversized input, missing required fields.
- Invalid amounts/dates and invalid identifiers.
- Checksum/integrity mismatch.
- Duplicate customer/transaction IDs.
- Orphan transactions.
- Existing-record collisions and divergent updates.
- Preview determinism and zero database mutations.

### Emulator apply cases — only after explicit authorization
- Empty emulator restore and expected record counts.
- Idempotent repeated operation does not duplicate records.
- Conflict policy stops or skips as configured; no silent overwrite.
- Referential integrity between customers and transactions.
- Balance/ledger invariants and date ordering.
- Simulated interruption/retry and verification of partial-state handling.
- Post-restore verification mismatch blocks success.
- Confirm emulator-only guard rejects missing, production-like, or non-loopback environment settings.

Capture test logs and synthetic before/after counts as evidence. Never import a real customer backup into CI.

## 5. Approval gates

1. Owner approves this plan and unresolved business rules.
2. Review schema/version compatibility and conflict/duplicate semantics.
3. Approve a separate implementation PR limited to pure validators and preview logic first.
4. Approve emulator-only write adapter and synthetic integration tests separately.
5. Security review confirms production restore remains unreachable and disabled.
6. Only a separate explicit release authorization may consider production enablement; this plan grants none.

## 6. Decisions still required

- Supported backup formats and schema-version migration policy.
- Whether restore is merge-only or can replace selected data; default proposal is merge with conflicts surfaced.
- Exact treatment of soft-deleted records, deleted transactions, and historical records.
- Duplicate identity resolution and customer matching rules.
- Monetary precision, date/time zone, and ledger reconciliation rules.
- Whether any rollback mechanism is technically supportable.
- Owner confirmation UX, authorization freshness, and audit retention.

## 7. Current status

This document is a proposal only. No restore implementation, Firestore write, restore execution, production configuration change, or deployment is included.