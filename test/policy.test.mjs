import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkPolicy } from "../scripts/policy.mjs";
import { loadCatalog, CatalogError } from "../scripts/catalog.mjs";
import { evaluate, STATUS, isInvariant } from "../scripts/compliance.mjs";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = path.join(HOME, "schemas/project-policy.schema.json");
const TODAY = "2026-08-09";

const catalog = await loadCatalog(path.join(HOME, "rules"));

/** Write a policy to a scratch file and check it. Fixtures are content, not files on disk. */
async function check(yaml) {
  const dir = await mkdtemp(path.join(tmpdir(), "mathstd-policy-"));
  const file = path.join(dir, "project-policy.yml");
  await writeFile(file, yaml, "utf8");
  try {
    return await checkPolicy(file, SCHEMA, TODAY);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const BASE = 'standardVersion: "1.0.0"\nproject: "t"\n';

test("a minimal policy is valid", async () => {
  const result = await check(BASE);
  assert.equal(result.status, "ok", JSON.stringify(result.errors));
});

test("the mathematics block accepts the documented shape", async () => {
  const result = await check(
    BASE +
      "mathematics:\n  regimes:\n    - formal\n    - open-problem\n" +
      '  claimsLedger: "artifacts/claims-ledger.md"\n' +
      "  proofAssistants:\n    - lean4\n  openProblemMode: true\n",
  );
  assert.equal(result.status, "ok", JSON.stringify(result.errors));
});

test("an unknown regime is rejected", async () => {
  const result = await check(BASE + "mathematics:\n  regimes:\n    - vibes\n");
  assert.equal(result.status, "invalid");
});

test("an unknown proof assistant is rejected", async () => {
  const result = await check(BASE + "mathematics:\n  proofAssistants:\n    - metamath\n");
  assert.equal(result.status, "invalid");
});

test("a non-canonical rule id is rejected by the schema, not normalised", async () => {
  // One spelling has always been the rule here. The reference framework needed an alias mechanism
  // because two spellings had both been written; making the second impossible from the first commit
  // is what avoids ever needing one.
  const result = await check(BASE + "rules:\n  claims.silentPromotion:\n    level: required\n");
  assert.equal(result.status, "invalid");
});

test("an exception against a non-exemptible rule is refused", async () => {
  const result = await check(
    BASE +
      "exceptions:\n  - rule: formal.placeholder-in-chain\n" +
      '    reason: "the release is Friday"\n    approvedBy: "someone"\n    approvedAt: "2026-01-01"\n',
  );
  assert.equal(result.status, "findings");
  assert.ok(result.findings.some((f) => f.id === "policy.non-exemptible-rule"));
});

test("an expired exception is a failure, not a resolution", async () => {
  const result = await check(
    BASE +
      "exceptions:\n  - rule: computation.scope-declared\n" +
      '    reason: "legacy scans"\n    approvedBy: "someone"\n    approvedAt: "2025-01-01"\n    expires: "2025-06-01"\n',
  );
  assert.ok(result.findings.some((f) => f.id === "policy.expired-exception"));
});

test("a rule cannot be both not-applicable and excepted", async () => {
  const result = await check(
    BASE +
      "applicability:\n  computation.scope-declared:\n    status: not-applicable\n" +
      '    reason: "no computation here"\n    revisitWhen: "a computation is added"\n' +
      "exceptions:\n  - rule: computation.scope-declared\n" +
      '    reason: "also this"\n    approvedBy: "someone"\n    approvedAt: "2026-01-01"\n',
  );
  assert.ok(result.findings.some((f) => f.id === "policy.conflicting-classification"));
});

test("a not-applicable declaration with no revisit condition is refused", async () => {
  // Standard 1 R2. Without an end condition the classification is a permanent exemption wearing a
  // temporary label — it stops being true the moment the project gains the capability, and nothing
  // would ever prompt anyone to notice.
  const result = await check(
    BASE + 'applicability:\n  formal.axiom-disclosure:\n    status: not-applicable\n    reason: "no Lean here"\n',
  );
  assert.equal(result.status, "findings");
  assert.ok(result.findings.some((f) => f.id === "policy.missing-revisit-condition"));

  const fixed = await check(
    BASE +
      'applicability:\n  formal.axiom-disclosure:\n    status: not-applicable\n    reason: "no Lean here"\n' +
      '    revisitWhen: "a .lean file is added"\n',
  );
  assert.equal(fixed.status, "ok");
});

test("the shipped template validates and uses only canonical ids", async () => {
  const template = await readFile(path.join(HOME, "templates/project-policy.yml"), "utf8");
  const result = await check(template);
  assert.equal(result.status, "ok", JSON.stringify(result.errors));
  assert.deepEqual(result.aliases, []);
});

test("this repository's own policy validates", async () => {
  const result = await checkPolicy(path.join(HOME, "project-policy.yml"), SCHEMA, TODAY);
  assert.equal(result.status, "ok", JSON.stringify(result.errors ?? result.findings));
});

// ---------------------------------------------------------------------------
// The verdict engine
// ---------------------------------------------------------------------------

const policyDoc = { standardVersion: "1.0.0", project: "t" };
const invariantRule = [...catalog.rules.values()].find(isInvariant);
const ordinaryRule = [...catalog.rules.values()].find((r) => r.level === "required" && !r.nonExemptible);

test("an observed violation of an invariant produces BLOCKED_BY_INVARIANT", () => {
  const verdict = evaluate({
    catalog,
    policy: policyDoc,
    findings: [{ rule: invariantRule.id, message: "planted", evidence: ["x"] }],
    evaluated: [invariantRule.id],
    today: TODAY,
  });
  assert.equal(verdict.status, STATUS.BLOCKED_BY_INVARIANT);
  assert.deepEqual(verdict.blockedBy.map((b) => b.rule), [invariantRule.id]);
});

test("BLOCKED_BY_INVARIANT outranks NON_COMPLIANT", () => {
  const verdict = evaluate({
    catalog,
    policy: policyDoc,
    findings: [
      { rule: ordinaryRule.id, message: "ordinary failure", evidence: [] },
      { rule: invariantRule.id, message: "planted", evidence: [] },
    ],
    evaluated: [ordinaryRule.id, invariantRule.id],
    today: TODAY,
  });
  assert.equal(verdict.status, STATUS.BLOCKED_BY_INVARIANT);
});

test("an ordinary failure alone is NON_COMPLIANT and lists no block", () => {
  const verdict = evaluate({
    catalog,
    policy: policyDoc,
    findings: [{ rule: ordinaryRule.id, message: "ordinary failure", evidence: [] }],
    evaluated: [ordinaryRule.id],
    today: TODAY,
  });
  assert.equal(verdict.status, STATUS.NON_COMPLIANT);
  assert.deepEqual(verdict.blockedBy, []);
});

test("no exception clears an invariant", () => {
  const verdict = evaluate({
    catalog,
    policy: {
      ...policyDoc,
      exceptions: [
        { rule: invariantRule.id, reason: "inconvenient", approvedBy: "me", approvedAt: "2026-01-01" },
      ],
    },
    findings: [{ rule: invariantRule.id, message: "planted", evidence: [] }],
    evaluated: [invariantRule.id],
    today: TODAY,
  });
  assert.equal(verdict.status, STATUS.BLOCKED_BY_INVARIANT);
  assert.ok(verdict.results.some((r) => r.disposition === "rejected-exception"));
});

test("an attestation contradicted by a finding fails, and still blocks", () => {
  // Evidence outranks assertion. Without the invariant flag on the contradiction result, writing an
  // attestation would downgrade BLOCKED_BY_INVARIANT to NON_COMPLIANT — a bypass through the back
  // door, which is exactly what Standard 21 prohibits.
  const attestable = [...catalog.rules.values()].find((r) => isInvariant(r) && r.attestable);
  const verdict = evaluate({
    catalog,
    policy: {
      ...policyDoc,
      attestations: {
        [attestable.id]: {
          status: "approved",
          reviewedBy: "me",
          reviewedAt: "2026-01-01",
          evidence: "I looked and it is fine",
        },
      },
    },
    findings: [{ rule: attestable.id, message: "a check observed otherwise", evidence: [] }],
    evaluated: [attestable.id],
    today: TODAY,
  });
  const result = verdict.results.find((r) => r.ruleId === attestable.id);
  assert.equal(result.disposition, "contradicted-attestation");
  assert.equal(verdict.status, STATUS.BLOCKED_BY_INVARIANT);
});

test("a clean run over evaluated rules is COMPLIANT and skipped rules do not score", () => {
  const verdict = evaluate({
    catalog,
    policy: policyDoc,
    findings: [],
    evaluated: [ordinaryRule.id],
    today: TODAY,
  });
  assert.equal(verdict.status, STATUS.COMPLIANT);
  assert.equal(verdict.denominator.scored, 1, "only the rule that was evaluated counts");
  const unevaluated = verdict.results.filter((r) => r.ruleId !== ordinaryRule.id);
  assert.ok(unevaluated.every((r) => r.status === "skipped"));
});

test("no policy at all is NOT_EVALUATED", () => {
  const verdict = evaluate({ catalog, policy: null, findings: [], evaluated: [], today: TODAY });
  assert.equal(verdict.status, STATUS.NOT_EVALUATED);
});

// ---------------------------------------------------------------------------
// The catalog loader
// ---------------------------------------------------------------------------

test("the catalog refuses a rule that is missing a lifecycle field", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mathstd-cat-"));
  await writeFile(
    path.join(dir, "bad.json"),
    JSON.stringify({
      rules: [
        {
          id: "test.missing-lifecycle",
          title: "t",
          standard: 1,
          category: "test",
          level: "required",
          severity: "error",
          validationType: "structural",
          assurance: "full",
          nonExemptible: false,
          introducedIn: "1.0.0",
          description: "d",
          rationale: "r",
          remediation: "m",
          aliases: [],
        },
      ],
    }),
    "utf8",
  );
  await assert.rejects(() => loadCatalog(dir), CatalogError);
  await rm(dir, { recursive: true, force: true });
});

test("the catalog refuses a camelCase rule id", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mathstd-cat-"));
  await writeFile(
    path.join(dir, "bad.json"),
    JSON.stringify({
      rules: [
        {
          id: "test.camelCase",
          title: "t",
          standard: 1,
          category: "test",
          level: "required",
          severity: "error",
          validationType: "structural",
          assurance: "full",
          nonExemptible: false,
          introducedIn: "1.0.0",
          description: "d",
          rationale: "r",
          remediation: "m",
          aliases: [],
          deprecatedIn: null,
          supersededBy: null,
          removedIn: null,
        },
      ],
    }),
    "utf8",
  );
  await assert.rejects(() => loadCatalog(dir), CatalogError);
  await rm(dir, { recursive: true, force: true });
});
