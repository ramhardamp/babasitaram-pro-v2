# Isolated Read-only Emulator Test Guide

Status: instructions for synthetic-only validation. This guide does not deploy application code, import data, run restore, or perform Firestore writes.

## Safety contract

- Use only the synthetic JSON fixtures committed in `tests/backup-reconciliation/fixtures/`.
- Use the reserved Firebase demo project ID `demo-bsr-readonly` (starts with `demo-`).
- Do not add credentials, service-account keys, real account identifiers, or real exports to this test directory.
- Keep all commands local. Do not run deploy, import, export, seed-to-live, or restore commands.
- Stop if Firebase CLI reports a non-demo project or if any test attempts a write.

## Prerequisites (Windows PowerShell)

1. Install a current Node.js LTS release. Confirm:
   ```powershell
   node --version
   npm --version
   ```
2. Install a supported Java runtime (JDK 11 or later) and confirm:
   ```powershell
   java -version
   ```
3. Open PowerShell and clone the repository, then switch to the PR branch:
   ```powershell
   git clone https://github.com/ramhardamp/babasitaram-pro-v2.git
   cd babasitaram-pro-v2
   git fetch origin
   git switch --track origin/audit/loan-ledger-spec-20261002
   ```
   If that branch is already present locally, use `git switch audit/loan-ledger-spec-20261002`.

## Step A — Run the current fixture harness

The current `backup-reconciliation.test.mjs` is a pure Node fixture validator: it imports no Firebase SDK and does not call Firestore. Run it from the repository root:

```powershell
node --test tests/backup-reconciliation/backup-reconciliation.test.mjs
```

Expected case behavior: empty synthetic envelope is accepted; malformed JSON and checksum tampering are rejected; duplicate IDs and orphan references are surfaced. Record the actual terminal output. Do not label tests PASS unless the command exits with code 0 and every assertion is reported as passing.

## Step B — Start an isolated Firestore Emulator (optional environment check)

This confirms the local emulator can start under a demo project ID. It does **not** make the current pure fixture harness an emulator integration test; that harness does not connect to Firestore.

1. Install Firebase CLI for the current user:
   ```powershell
   npm install --global firebase-tools
   firebase --version
   ```
2. In the repository root, create a temporary `firebase.json` outside version control (or use a separate empty test folder) with only:
   ```json
   {
     "emulators": {
       "firestore": { "port": 8080 },
       "ui": { "enabled": false }
     }
   }
   ```
3. Start the emulator with the demo project ID:
   ```powershell
   firebase emulators:exec --only firestore --project demo-bsr-readonly "node --test tests/backup-reconciliation/backup-reconciliation.test.mjs"
   ```
   The CLI starts the local emulator, runs the command, and shuts it down afterward. The fixture test remains local-only and does not seed or mutate emulator documents.

## Step C — Verify the boundary

- Confirm the CLI output identifies `demo-bsr-readonly` and the local Firestore emulator.
- Confirm the test process exits normally and capture the complete summary.
- Confirm no application server, deployed site, or remote Firebase endpoint is configured by this test.
- If any unexpected network activity, write attempt, project-ID mismatch, or emulator startup error appears, stop and report it; do not retry against another target.

## Current coverage limitation

The prepared harness currently tests JSON envelope shape/checksum/counts, duplicate identifiers, and orphan transaction references. It is not yet an emulator-backed Firestore rules test, full reconciliation engine test, loan-calculation test, or production-backup compatibility proof. Do not interpret an emulator startup plus Node test run as those broader validations. A future integration test must use a dedicated demo-only Firebase configuration, synthetic fixture documents, explicit read-only assertions, and write-attempt instrumentation before it can be called emulator-backed.

## Evidence to report

Include Node version, Firebase CLI version, Java version, exact command, exit code, per-test results, emulator startup/shutdown result, and any warnings. Share only synthetic fixture names and test output; omit secrets and personal data.

No application behavior, persistent database, restore path, or release state is changed by following this guide.
