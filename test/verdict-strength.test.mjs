/**
 * Tier 1 · §0b + §0i — a finding's evidence strength constrains the verdict it can produce.
 *
 * Design: design/v1.1-tier1-verdict-strength.md. These are the four mutations named there, written
 * before the implementation so that what they defeat is fixed in advance and cannot be adjusted to
 * whatever the implementation turns out to do.
 *
 * The acceptance rule the whole milestone answers to:
 *
 *     No finding acquires evidentiary certainty through a default.
 *
 * Each test states the mutation it defeats. A test whose failure message does not distinguish
 * "the ceiling is broken" from "some detector changed" is too wide, so M1 works at the
 * verdict-composition boundary and never goes through a detector.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import { evaluate, isInvariant, STATUS } from "../scripts/compliance.mjs";
import { parseLedger } from "../scripts/claims.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const catalog = await loadCatalog(path.join(HOME, "rules"));
const TODAY = "2026-08-10";
const policyDoc = { standardVersion: "1.0.0", project: "t" };

const invariantRule = [...catalog.rules.values()].find(isInvariant);
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const auditJson = (name) => JSON.parse(run(["audit", `--dir=${fixture(name)}`, "--json"]).out || "{}");

// ---------------------------------------------------------------------------
// M1 · the ceiling. One finding, two labels, nothing else different.
//
// Defeats: an engine that ignores the label, and an engine that "fixes" the block by dropping the
// finding. Both assertions carry the retention clause for that reason.
// ---------------------------------------------------------------------------

function verdictFor(label) {
  return evaluate({
    catalog,
    policy: policyDoc,
    findings: [{ rule: invariantRule.id, message: "planted", evidence: ["x"], label }],
    evaluated: [invariantRule.id],
    today: TODAY,
  });
}

const failedFor = (verdict, ruleId) =>
  verdict.results.find((r) => r.ruleId === ruleId && r.status === "failed");

test("M1 · an INFERRED finding against an invariant is capped at NON_COMPLIANT", () => {
  const verdict = verdictFor("INFERRED");
  assert.equal(verdict.status, STATUS.NON_COMPLIANT, "a heuristic must not reach the terminal verdict");
  assert.deepEqual(verdict.blockedBy, [], "nothing may be reported as blocking");
  assert.ok(failedFor(verdict, invariantRule.id), "the finding must still be present and failing");
});

test("M1 · an OBSERVED finding against the same invariant still blocks", () => {
  const verdict = verdictFor("OBSERVED");
  assert.equal(verdict.status, STATUS.BLOCKED_BY_INVARIANT);
  assert.deepEqual(verdict.blockedBy.map((b) => b.rule), [invariantRule.id]);
  assert.ok(failedFor(verdict, invariantRule.id), "the finding must still be present and failing");
});

test("M1 · the capped result records why it was capped", () => {
  const capped = failedFor(verdictFor("INFERRED"), invariantRule.id);
  assert.equal(capped.label, "INFERRED", "the label must survive into the result");
  assert.equal(capped.cappedFrom, STATUS.BLOCKED_BY_INVARIANT, "the verdict it would have produced");
});

test("M1 · a capped finding still fails the run", () => {
  const verdict = verdictFor("INFERRED");
  assert.notEqual(verdict.status, STATUS.COMPLIANT);
  assert.notEqual(verdict.status, STATUS.COMPLIANT_WITH_EXCEPTIONS);
});

test("M1 · neither unused label elevates", () => {
  for (const label of ["CONFIRMED_BY_OWNER", "UNKNOWN"]) {
    const verdict = verdictFor(label);
    assert.notEqual(
      verdict.status,
      STATUS.BLOCKED_BY_INVARIANT,
      `${label} must not carry blocking power before anything emits it`,
    );
  }
});

test("M1 · a finding with no label at all cannot elevate", () => {
  const verdict = evaluate({
    catalog,
    policy: policyDoc,
    findings: [{ rule: invariantRule.id, message: "planted", evidence: ["x"] }],
    evaluated: [invariantRule.id],
    today: TODAY,
  });
  assert.notEqual(verdict.status, STATUS.BLOCKED_BY_INVARIANT, "absence of a label is not certainty");
});

// ---------------------------------------------------------------------------
// M2 · detector basis. The two arms of one rule must declare different bases.
//
// Defeats: labelling the whole of claims.silent-promotion INFERRED to make PvsNP pass. That would
// also stop a genuine unevidenced promotion from blocking — trading a false positive for a false
// negative inside the same rule.
// ---------------------------------------------------------------------------

const promotionFindings = (name) =>
  (auditJson(name).findings ?? []).filter((f) => f.rule === "claims.silent-promotion");

test("M2 · the prose arm is INFERRED", () => {
  const found = promotionFindings("silent-promotion");
  assert.equal(found.length, 1, "the prose fixture must fire exactly the prose arm");
  assert.equal(found[0].label, "INFERRED", "a 48-character window over running text is an inference");
});

test("M2 · the ledger arm is OBSERVED", () => {
  const found = promotionFindings("unevidenced-promotion");
  assert.equal(found.length, 1, "the ledger fixture must fire exactly the ledger arm");
  assert.equal(found[0].label, "OBSERVED", "a parsed History field with no evidence is observed");
});

test("M2 · the two arms are the same rule with different bases", () => {
  const prose = promotionFindings("silent-promotion")[0];
  const ledger = promotionFindings("unevidenced-promotion")[0];
  assert.equal(prose.rule, ledger.rule, "same rule, or this test is about nothing");
  assert.notEqual(prose.label, ledger.label, "one rule, two bases — this is the point");
});

test("M2 · the genuine promotion still blocks and the prose one does not", () => {
  const ledger = JSON.parse(run(["validate", `--dir=${fixture("unevidenced-promotion")}`, "--json"]).out || "{}");
  const prose = JSON.parse(run(["validate", `--dir=${fixture("silent-promotion")}`, "--json"]).out || "{}");
  assert.equal(ledger.status, STATUS.BLOCKED_BY_INVARIANT, "an unevidenced promotion is a real violation");
  assert.notEqual(prose.status, STATUS.BLOCKED_BY_INVARIANT, "a prose match must not be terminal");
  assert.ok(
    (prose.findings ?? []).some((f) => f.rule === "claims.silent-promotion"),
    "and the prose finding must still be reported",
  );
});

// ---------------------------------------------------------------------------
// M3 · parser uncertainty. Unrecognised obligation text cannot become observed fact.
//
// Defeats: extending the grammar to accept `none — <explanation>` and leaving the next unrecognised
// spelling to be manufactured into an open obligation.
// ---------------------------------------------------------------------------

const LEDGER_WITH_UNPARSEABLE_OBLIGATION = `# Claims ledger

## CLM-0001 — A proved thing

- **Status:** THEOREM
- **Statement:** Something true.
- **Domain:** N
- **Quantifiers:** universal
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none — the claim is an implication and the implication is complete
- **Equivalences:** none
- **Evidence:**
  - proof — \`notes/argument.md\`
- **Formal:** none
- **History:**
  - 2026-04-01 → THEOREM (registered, \`notes/argument.md\`)
`;

test("M3 · an unrecognised obligation is marked unrecognised, not defaulted to open", () => {
  const ledger = parseLedger(LEDGER_WITH_UNPARSEABLE_OBLIGATION);
  const entry = ledger.entries.get("CLM-0001");
  assert.ok(entry, "the fixture must parse into an entry");
  const [obligation] = entry.obligations;
  if (obligation === undefined) return; // treating it as no obligation is also acceptable
  assert.notEqual(
    obligation.state,
    "open",
    "a defaulting branch is a guess and must not be reported as an open obligation",
  );
  assert.equal(obligation.state, "unrecognised", "say what happened rather than picking a state");
});

test("M3 · nothing resting on an unrecognised parse is OBSERVED", () => {
  const ledger = parseLedger(LEDGER_WITH_UNPARSEABLE_OBLIGATION);
  const entry = ledger.entries.get("CLM-0001");
  const [obligation] = entry.obligations;
  if (obligation === undefined) return;
  assert.notEqual(
    obligation.label ?? "INFERRED",
    "OBSERVED",
    "the parser must not hand a detector grounds to claim certainty",
  );
});

// ---------------------------------------------------------------------------
// M4 · the default guard, structural.
//
// Defeats the easiest wrong implementation: flipping report()'s default label to INFERRED. That
// makes both frozen specimens go green in one edit and moves the hidden assumption rather than
// removing it.
//
//     Every report() invocation supplies an explicit valid label.
// ---------------------------------------------------------------------------

const LABELS = ["OBSERVED", "INFERRED", "CONFIRMED_BY_OWNER", "UNKNOWN"];
const detectorSource = readFileSync(path.join(HOME, "scripts/standards.mjs"), "utf8");

test("M4 · report() has no default label", () => {
  assert.doesNotMatch(
    detectorSource,
    /function report\([^)]*label\s*=/s,
    "a default label is forbidden in either direction — the point is that there is no default",
  );
});

test("M4 · every report() invocation supplies an explicit valid label", () => {
  // Each call is `report(<rule>, { ... })`; take the object literal by brace matching so a nested
  // object inside the options cannot truncate the scan.
  const calls = [];
  const re = /\breport\(\s*("[^"]+"|'[^']+')\s*,\s*\{/g;
  let m;
  while ((m = re.exec(detectorSource)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < detectorSource.length && depth > 0) {
      if (detectorSource[i] === "{") depth++;
      else if (detectorSource[i] === "}") depth--;
      i++;
    }
    calls.push({ rule: m[1].slice(1, -1), body: detectorSource.slice(re.lastIndex, i - 1) });
  }

  assert.ok(calls.length > 20, `expected the detector file to contain many report() calls, saw ${calls.length}`);

  const unlabelled = calls.filter((c) => !/\blabel\s*:/.test(c.body));
  assert.deepEqual(
    unlabelled.map((c) => c.rule),
    [],
    "these report() calls do not state what their finding rests on",
  );

  const invalid = calls
    .map((c) => ({ rule: c.rule, label: /\blabel\s*:\s*"([A-Z_]+)"/.exec(c.body)?.[1] }))
    .filter((c) => c.label !== undefined && !LABELS.includes(c.label));
  assert.deepEqual(invalid, [], "a label outside the validated set");
});

test("M4 · omitting the label fails at runtime too, not only in this test", () => {
  // Defence in depth: the meta-test above is the guard, but a new call site written against a
  // future refactor must not be able to omit the label and merely go unnoticed until CI.
  assert.match(
    detectorSource,
    /throw new Error\([^)]*label/s,
    "report() must reject a missing label when it is called, not only when this file is scanned",
  );
});
