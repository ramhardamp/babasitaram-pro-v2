# Backup reconciliation harness (prepared, not executed)

These are synthetic fixture inputs only. They are not customer exports and must never be pointed at production.

- Run target is intended to be Node's built-in test runner in an isolated checkout/emulator environment.
- The test module imports only Node built-ins; it has no Firebase SDK, network, filesystem write, or Firestore mutation path. It reads fixture files only.
- The harness computes the checksum for fixtures marked `__HARNESS_COMPUTE__`; the tampered fixture deliberately retains a wrong digest.
- This is a preparation scaffold, not proof that tests pass or that the app's complete backup contract has been covered.
- Do not execute until the owner separately authorizes emulator test preparation to proceed to execution. Production restore remains disabled.
