/**
 * FE-28 (#59) — a gate on the attempt, orthogonal to any claim's status.
 *
 * Design: design/fe27-fe28-blocker-and-attempt-gates.md (frozen) and its "Implementation
 * clarifications" section. Written before the rule. Each test names the criterion it answers:
 *
 *   C1  A check can be attached to an attempt with no claim.
 *   C2  The framework does not fix the content of such checks (no built-in gate list).
 *   C3  RH G1-G5 and PvsNP per-iteration checks are both expressible.
 *   C4  An unrun gate is reported as unrun, not passed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import { EVALUATED_RULES } from "../scripts/evaluated.mjs";
import { RULE_SURFACES } from "../scripts/surfaces.mjs";
import { GATE_STATES, parseAttempt, rollup } from "../scripts/attempts.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const RULE = "lifecycle.attempt-gates-valid";
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const auditJson = (name) => JSON.parse(run(["audit", `--dir=${fixture(name)}`, "--json"]).out);
const findingsFor = (name) => auditJson(name).findings.filter((f) => f.rule === RULE);
const attemptText = (name, id) =>
  readFileSync(path.join(fixture(name), "artifacts/research-attempts", id, "attempt.md"), "utf8");

const gateDoc = (...gates) => `# Attempt\n\n## Gates\n\n${gates.join("\n\n")}\n`;
const gate = (name, ...lines) => `### ${name}\n\n${lines.join("\n")}`;

// ---------------------------------------------------------------------------
// C1 — no claim required
// ---------------------------------------------------------------------------

test("C1 · an attempt with gates and no claim is valid", () => {
  const attempt = parseAttempt(gateDoc(gate("any check", "State: unrun")));
  assert.equal(attempt.gates.length, 1);
  assert.deepEqual(attempt.errors, []);
  assert.deepEqual(attempt.gates[0].errors, []);
});

test("C1 · the fixtures carry no claim and validate", () => {
  assert.doesNotMatch(attemptText("attempt-gates-rh", "rh-attempt-07"), /\bCLM-\d+/);
  assert.deepEqual(findingsFor("attempt-gates-rh"), []);
});

// ---------------------------------------------------------------------------
// C2 — the framework fixes no content
// ---------------------------------------------------------------------------

test("C2 · the states are exactly four", () => {
  assert.deepEqual([...GATE_STATES].sort(), ["executed", "failed", "passed", "unrun"]);
});

test("C2 · a gate may have any name; a name the framework has never seen is valid", () => {
  for (const name of ["G1", "Relativization check", "zeta-zero density sweep", "gate with ünïcode"]) {
    const attempt = parseAttempt(gateDoc(gate(name, "State: unrun")));
    assert.deepEqual(attempt.gates[0].errors, [], name);
    assert.equal(attempt.gates[0].name, name);
  }
});

test("C2 · no gate name or gate list is built into the framework sources", () => {
  const source = readFileSync(path.join(HOME, "scripts/attempts.mjs"), "utf8");
  for (const forbidden of [/\bG[1-5]\b/, /relativiz/i, /natural[- ]proofs/i, /algebriz/i]) {
    assert.doesNotMatch(source, forbidden, `scripts/attempts.mjs names a gate: ${forbidden}`);
  }
  assert.equal(parseAttempt(gateDoc()).gates.length, 0, "an empty document must not conjure gates");
});

test("C2 · gate names must be unique within an attempt, compared trimmed and case-folded", () => {
  const attempt = parseAttempt(gateDoc(gate("Check", "State: unrun"), gate("  check ", "State: unrun")));
  assert.ok(attempt.errors.some((e) => /duplicate/i.test(e)), JSON.stringify(attempt.errors));
});

// ---------------------------------------------------------------------------
// C3 — RH and PvsNP both expressible
// ---------------------------------------------------------------------------

test("C3 · RH G1 to G5 are expressible as five named gates, and the fixture validates", () => {
  const attempt = parseAttempt(attemptText("attempt-gates-rh", "rh-attempt-07"));
  assert.deepEqual(attempt.gates.map((g) => g.name), ["G1", "G2", "G3", "G4", "G5"]);
  assert.deepEqual(attempt.gates.map((g) => g.reported), ["passed", "passed", "failed", "executed", "unrun"]);
  assert.deepEqual(attempt.errors, []);
  assert.deepEqual(findingsFor("attempt-gates-rh"), []);
});

test("C3 · the PvsNP per-iteration checks are expressible, and the fixture validates", () => {
  const attempt = parseAttempt(attemptText("attempt-gates-pvsnp", "iteration-0012"));
  assert.deepEqual(attempt.gates.map((g) => g.name), [
    "Relativization check",
    "Natural-proofs check",
    "Algebrization check",
    "Literature check",
  ]);
  assert.deepEqual(findingsFor("attempt-gates-pvsnp"), []);
});

test("C3 · the two projects share no gate name and the same parser reads both", () => {
  const rh = new Set(parseAttempt(attemptText("attempt-gates-rh", "rh-attempt-07")).gates.map((g) => g.name));
  const pvsnp = parseAttempt(attemptText("attempt-gates-pvsnp", "iteration-0012")).gates.map((g) => g.name);
  assert.ok(pvsnp.every((n) => !rh.has(n)));
});

// ---------------------------------------------------------------------------
// C4 — unrun is reported as unrun, never passed
// ---------------------------------------------------------------------------

test("C4 · an unrun gate is reported unrun, in the gate and in the roll-up", () => {
  const attempt = parseAttempt(attemptText("attempt-gates-rh", "rh-attempt-07"));
  const g5 = attempt.gates.find((g) => g.name === "G5");
  assert.equal(g5.reported, "unrun");
  const summary = rollup(attempt);
  assert.equal(summary.counts.unrun, 1);
  assert.notEqual(summary.status, "all-passed");
});

test("C4 · an attempt is all-passed only if it has a gate and every gate is passed with valid evidence", () => {
  const ok = gate("A", "State: passed", "Execution evidence: logs/a.txt", "Verdict evidence: reviews/a.md");
  assert.equal(rollup(parseAttempt(gateDoc(ok))).status, "all-passed");
  assert.equal(rollup(parseAttempt(gateDoc(ok, gate("B", "State: unrun")))).status, "not-all-passed");
  assert.equal(rollup(parseAttempt(gateDoc(ok, gate("B", "State: failed", "Execution evidence: logs/b.txt", "Verdict evidence: reviews/b.md")))).status, "not-all-passed");
  assert.equal(rollup(parseAttempt(gateDoc(ok, gate("B", "State: executed", "Execution evidence: logs/b.txt")))).status, "not-all-passed");
});

test("C4 · a zero-gate attempt is reported as having no gates, not as passing", () => {
  assert.equal(rollup(parseAttempt("# Attempt\n\nNothing here.\n")).status, "no-gates");
  assert.equal(rollup(parseAttempt(gateDoc())).status, "no-gates");
});

// ---------------------------------------------------------------------------
// Evidence rules, fail closed
// ---------------------------------------------------------------------------

const E = "Execution evidence: logs/run.txt";
const V = "Verdict evidence: reviews/verdict.md";

test("evidence · every non-unrun state requires execution evidence", () => {
  for (const state of ["executed", "passed", "failed"]) {
    const g = parseAttempt(gateDoc(gate("G", `State: ${state}`, V))).gates[0];
    assert.ok(g.errors.some((e) => /execution evidence/i.test(e)), `${state}: ${JSON.stringify(g.errors)}`);
  }
});

test("evidence · passed and failed also require evidence supporting the verdict", () => {
  for (const state of ["passed", "failed"]) {
    const g = parseAttempt(gateDoc(gate("G", `State: ${state}`, E))).gates[0];
    assert.ok(g.errors.some((e) => /verdict evidence/i.test(e)), `${state}: ${JSON.stringify(g.errors)}`);
  }
});

test("evidence · an executed gate carries execution evidence only", () => {
  assert.deepEqual(parseAttempt(gateDoc(gate("G", "State: executed", E))).gates[0].errors, []);
  const withVerdict = parseAttempt(gateDoc(gate("G", "State: executed", E, V))).gates[0];
  assert.ok(withVerdict.errors.some((e) => /executed/i.test(e) && /verdict/i.test(e)), JSON.stringify(withVerdict.errors));
});

test("evidence · an unrun gate carries no evidence", () => {
  assert.deepEqual(parseAttempt(gateDoc(gate("G", "State: unrun"))).gates[0].errors, []);
  assert.deepEqual(parseAttempt(gateDoc(gate("G", "State: unrun", "Execution evidence: none"))).gates[0].errors, []);
  assert.ok(parseAttempt(gateDoc(gate("G", "State: unrun", E))).gates[0].errors.length >= 1);
  assert.ok(parseAttempt(gateDoc(gate("G", "State: unrun", V))).gates[0].errors.length >= 1);
});

test("evidence · a stated reference is a URL, a path or a commit; free text alone does not count", () => {
  const valid = ["logs/run.txt", "notes.md", "https://example.org/x", "http://example.org", "commit 3f9a1c2d", "commit: 3f9a1c2d4e5f", "see logs/run.txt for details"];
  for (const value of valid) {
    const g = parseAttempt(gateDoc(gate("G", "State: executed", `Execution evidence: ${value}`))).gates[0];
    assert.deepEqual(g.errors, [], `should count: ${value}`);
  }
  const invalid = ["I ran it", "it passed", "defaced", "deadbeef", "v1.2", "none", "e.g.", "commit abc", "TODO"];
  for (const value of invalid) {
    const g = parseAttempt(gateDoc(gate("G", "State: executed", `Execution evidence: ${value}`))).gates[0];
    assert.ok(g.errors.length >= 1, `should not count: ${value}`);
  }
});

test("evidence · a missing, unknown or repeated State and a repeated field are errors", () => {
  assert.ok(parseAttempt(gateDoc(gate("G", E))).gates[0].errors.length >= 1, "missing State");
  assert.ok(parseAttempt(gateDoc(gate("G", "State: green", E, V))).gates[0].errors.length >= 1, "unknown State");
  assert.ok(parseAttempt(gateDoc(gate("G", "State: unrun", "State: passed"))).gates[0].errors.length >= 1, "repeated State");
  assert.ok(parseAttempt(gateDoc(gate("G", "State: executed", E, E))).gates[0].errors.length >= 1, "repeated field");
});

test("evidence · the state is read case-insensitively but only the four words are states", () => {
  assert.deepEqual(parseAttempt(gateDoc(gate("G", "State: UNRUN"))).gates[0].errors, []);
  assert.ok(parseAttempt(gateDoc(gate("G", "State: not run"))).gates[0].errors.length >= 1);
  assert.ok(parseAttempt(gateDoc(gate("G", "State: pass", E, V))).gates[0].errors.length >= 1);
});

test("fail closed · a gate with any error is reported invalid, and never as passed", () => {
  const attempt = parseAttempt(attemptText("attempt-gates-invalid", "bad-attempt"));
  assert.ok(attempt.gates.length >= 9);
  const claimsPassed = attempt.gates.filter((g) => g.state === "passed");
  assert.ok(claimsPassed.length >= 3, "the fixture must declare passed gates for this to mean anything");
  for (const g of attempt.gates) {
    if (g.errors.length > 0) assert.equal(g.reported, "invalid", `${g.name} reported ${g.reported} with errors`);
  }
  assert.ok(attempt.gates.every((g) => g.reported !== "passed"), "no gate in this fixture is validly passed");
  const summary = rollup(attempt);
  assert.equal(summary.counts.passed, 0);
  assert.equal(summary.status, "not-all-passed");
});

// ---------------------------------------------------------------------------
// Through the audit
// ---------------------------------------------------------------------------

test("audit · the invalid fixture is reported by the rule, naming each defective gate", () => {
  const found = findingsFor("attempt-gates-invalid");
  assert.equal(found.length, 1);
  const text = found[0].evidence.join("\n");
  for (const name of ["passed-without-evidence", "passed-without-verdict", "passed-on-free-text", "executed-without-evidence", "executed-with-verdict", "unrun-with-evidence", "unknown-state", "missing-state"]) {
    assert.ok(text.includes(name), `the finding does not name ${name}`);
  }
  assert.ok(/duplicate/i.test(text));
  assert.equal(found[0].label, "OBSERVED");
});

test("audit · a zero-gate attempt is valid but is reported as having no gates", () => {
  assert.deepEqual(findingsFor("attempt-gates-none"), []);
  const report = auditJson("attempt-gates-none");
  assert.equal(report.researchAttempts.length, 1);
  assert.equal(report.researchAttempts[0].rollup, "no-gates");
});

test("audit · the JSON and the human report both give each gate's reported state", () => {
  const report = auditJson("attempt-gates-rh");
  const attempt = report.researchAttempts.find((a) => a.id === "rh-attempt-07");
  assert.deepEqual(attempt.gates.map((g) => [g.name, g.reported]), [
    ["G1", "passed"], ["G2", "passed"], ["G3", "failed"], ["G4", "executed"], ["G5", "unrun"],
  ]);
  assert.equal(attempt.rollup, "not-all-passed");

  const human = run(["audit", `--dir=${fixture("attempt-gates-rh")}`]).out;
  assert.match(human, /rh-attempt-07/);
  assert.match(human, /unrun/);
  assert.match(human, /not all passed/);
});

test("audit · the invalid fixture's human report never says all passed", () => {
  const human = run(["audit", `--dir=${fixture("attempt-gates-invalid")}`]).out;
  assert.match(human, /bad-attempt/);
  assert.match(human, /invalid/);
  assert.doesNotMatch(human, /(?<!not )all passed/);
});

// ---------------------------------------------------------------------------
// The rule is wired like every other rule
// ---------------------------------------------------------------------------

test("the rule is catalogued, evaluated, and declares its surface", async () => {
  const catalog = await loadCatalog(path.join(HOME, "rules"));
  const rule = catalog.rules.get(RULE);
  assert.ok(rule, `${RULE} is not in the catalog`);
  assert.equal(rule.level, "recommended");
  assert.equal(rule.severity, "warning");
  assert.equal(rule.standard, 18);
  assert.ok(EVALUATED_RULES.includes(RULE));
  assert.deepEqual(RULE_SURFACES.get(RULE)?.surfaces, ["research-attempts"]);
});

test("with no attempt record the rule is not-evaluated, never passed", () => {
  const verdict = JSON.parse(run(["validate", `--dir=${fixture("math-compliant")}`, "--json"]).out);
  const result = verdict.results.find((r) => r.ruleId === RULE);
  assert.ok(result, "the rule has no result at all");
  assert.notEqual(result.status, "passed");
});
