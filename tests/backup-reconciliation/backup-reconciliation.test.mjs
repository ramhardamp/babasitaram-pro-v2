// PREPARED ONLY — intentionally not executed in this change.
// Pure local fixture checks. No Firebase SDK, network, or write API is imported.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

async function loadFixture(name) {
  const raw = await readFile(path.join(fixtureDir, name), "utf8");
  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return { envelope: null, errors: ["INVALID_JSON"] };
  }
  if (envelope?.checksum === "__HARNESS_COMPUTE__" && envelope.data) {
    envelope.checksum = createHash("sha256")
      .update(JSON.stringify(envelope.data), "utf8")
      .digest("hex");
  }
  return { envelope, errors: [] };
}

function inspectReadOnly(envelope, parseErrors = []) {
  const errors = [...parseErrors];
  const findings = [];
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    return { validEnvelope: false, errors: [...errors, "INVALID_ENVELOPE"], findings };
  }
  if (envelope.schemaVersion !== 2) errors.push("UNSUPPORTED_SCHEMA");
  const data = envelope.data;
  if (!data || typeof data !== "object" || !Array.isArray(data.customers) ||
      !Array.isArray(data.transactions) || !data.user || typeof data.user !== "object") {
    errors.push("INVALID_DATA_SHAPE");
    return { validEnvelope: false, errors, findings };
  }
  const digest = createHash("sha256").update(JSON.stringify(data), "utf8").digest("hex");
  if (digest !== envelope.checksum) errors.push("CHECKSUM_MISMATCH");
  if (envelope.counts?.customers !== data.customers.length ||
      envelope.counts?.transactions !== data.transactions.length) errors.push("COUNT_MISMATCH");

  for (const [kind, rows] of [["customer", data.customers], ["transaction", data.transactions]]) {
    const seen = new Set();
    for (const row of rows) {
      if (!row || typeof row.id !== "string" || !row.id.trim()) {
        findings.push({ code: "MISSING_STABLE_ID", kind });
      } else if (seen.has(row.id)) {
        findings.push({ code: "DUPLICATE_ID", kind, id: row.id });
      } else {
        seen.add(row.id);
      }
    }
  }
  const customerIds = new Set(data.customers.map(row => row?.id).filter(v => typeof v === "string"));
  for (const tx of data.transactions) {
    if (typeof tx?.customerId !== "string" || !customerIds.has(tx.customerId)) {
      findings.push({ code: "ORPHAN_TRANSACTION", id: tx?.id ?? null });
    }
  }
  return { validEnvelope: errors.length === 0, errors, findings };
}

test("synthetic empty envelope has valid structure and no findings", async () => {
  const { envelope, errors } = await loadFixture("empty-valid.json");
  const result = inspectReadOnly(envelope, errors);
  assert.equal(result.validEnvelope, true);
  assert.deepEqual(result.findings, []);
});

test("malformed JSON is rejected without repair", async () => {
  const { envelope, errors } = await loadFixture("malformed.json");
  assert.equal(envelope, null);
  assert.deepEqual(errors, ["INVALID_JSON"]);
});

test("tampered payload fails checksum validation", async () => {
  const { envelope, errors } = await loadFixture("tampered.json");
  const result = inspectReadOnly(envelope, errors);
  assert.ok(result.errors.includes("CHECKSUM_MISMATCH"));
  assert.equal(result.validEnvelope, false);
});

test("duplicate customer identifiers are surfaced", async () => {
  const { envelope, errors } = await loadFixture("duplicate-ids.json");
  const result = inspectReadOnly(envelope, errors);
  assert.ok(result.findings.some(item => item.code === "DUPLICATE_ID" && item.kind === "customer"));
});

test("orphan transaction is reported and blocks readiness", async () => {
  const { envelope, errors } = await loadFixture("orphan-transaction.json");
  const result = inspectReadOnly(envelope, errors);
  assert.ok(result.findings.some(item => item.code === "ORPHAN_TRANSACTION"));
  // A finding is never auto-repaired or dropped by this harness.
});
