/**
 * FE-27 (#58) — naming what currently blocks a programme.
 *
 * Design: design/fe27-fe28-blocker-and-attempt-gates.md (frozen), and its "Implementation
 * clarifications" section, which defines the syntax and the concrete rejected-form marker.
 *
 * Written before the rule. Each test names the acceptance criterion it answers:
 *
 *   C1  A programme can name its blocker as a point or a set.
 *   C2  No validation requires ordering or exactly one.
 *   C3  RH (point) and PvsNP (set) shapes both validate in fixtures. The rejected
 *       first-unproved-bridge form is rejected by a test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import { EVALUATED_RULES } from "../scripts/evaluated.mjs";
import { RULE_SURFACES } from "../scripts/surfaces.mjs";
import { parseBlocker } from "../scripts/blocker.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const RULE = "problems.blocker-named";
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const auditJson = (name) => JSON.parse(run(["audit", `--dir=${fixture(name)}`, "--json"]).out);
const findingsFor = (name) => auditJson(name).findings.filter((f) => f.rule === RULE);
const validateJson = (name) => JSON.parse(run(["validate", `--dir=${fixture(name)}`, "--json"]).out);

/** A problem record whose only interesting section is the blocker. */
const record = (body) => `# P\n\n## Target Statement\n\nT.\n\n## Current Blocker\n\n${body}\n\n## Known Barriers\n\nNone.\n`;

// ---------------------------------------------------------------------------
// C1 — a point or a set
// ---------------------------------------------------------------------------

test("C1 · a single list item is a point", () => {
  const blocker = parseBlocker(record("- Contract C3."));
  assert.equal(blocker.status, "point");
  assert.deepEqual(blocker.points, ["Contract C3."]);
  assert.deepEqual(blocker.problems, []);
});

test("C1 · several list items are a set", () => {
  const blocker = parseBlocker(record("- A.\n- B.\n- C."));
  assert.equal(blocker.status, "set");
  assert.equal(blocker.points.length, 3);
  assert.deepEqual(blocker.problems, []);
});

test("C1 · an explicit none is a valid answer, with or without an explanation", () => {
  for (const body of ["none", "None.", "NONE — the programme is not currently blocked."]) {
    const blocker = parseBlocker(record(body));
    assert.equal(blocker.status, "none", body);
    assert.deepEqual(blocker.problems, [], body);
  }
});

// ---------------------------------------------------------------------------
// C2 — no order, no cardinality
// ---------------------------------------------------------------------------

test("C2 · reordering a set changes nothing the validation sees", () => {
  const forward = parseBlocker(record("- A.\n- B.\n- C."));
  const reversed = parseBlocker(record("- C.\n- B.\n- A."));
  assert.equal(forward.status, reversed.status);
  assert.deepEqual(forward.problems, reversed.problems);
  assert.deepEqual([...forward.points].sort(), [...reversed.points].sort());
});

test("C2 · one element and many elements are both valid; nothing asks for exactly one", () => {
  for (const n of [1, 2, 5, 12]) {
    const body = Array.from({ length: n }, (_, i) => `- Point ${i + 1}.`).join("\n");
    assert.deepEqual(parseBlocker(record(body)).problems, [], `${n} point(s)`);
  }
});

test("C2 · a numbered list is accepted and its numerals carry no meaning", () => {
  const blocker = parseBlocker(record("3. Later one.\n1. Earlier one.\n2) Middle one."));
  assert.equal(blocker.status, "set");
  assert.deepEqual(blocker.problems, []);
  assert.deepEqual(blocker.points, ["Later one.", "Earlier one.", "Middle one."]);
});

test("C2 · prose before the list is allowed and is not a point", () => {
  const blocker = parseBlocker(record("These are independent.\n\n- A.\n- B."));
  assert.equal(blocker.status, "set");
  assert.deepEqual(blocker.points, ["A.", "B."]);
});

// ---------------------------------------------------------------------------
// C3 — the rejected form, concretely
// ---------------------------------------------------------------------------

test("C3 · the marker is the label `First unproved bridge`, in any of its spellings", () => {
  for (const line of [
    "First unproved bridge: C3",
    "- First unproved bridge: C3",
    "- **First-unproved-bridge**: C3",
    "* `first_unproved_bridge`: C3",
    "1. FIRST   UNPROVED BRIDGE : C3",
  ]) {
    const blocker = parseBlocker(record(line));
    assert.equal(blocker.rejected.length, 1, `not rejected: ${line}`);
    assert.ok(blocker.problems.length >= 1, `no problem reported for: ${line}`);
  }
});

test("C3 · the phrase inside prose, or outside the section, is not the marker", () => {
  const prose = parseBlocker(record("- C3, which RH's notes call the first unproved bridge of the chain."));
  assert.deepEqual(prose.rejected, []);
  assert.deepEqual(prose.problems, []);

  const elsewhere = parseBlocker(
    "# P\n\n## Where the Difficulty Lives\n\nFirst unproved bridge: C3\n\n## Current Blocker\n\n- A.\n- B.\n",
  );
  assert.deepEqual(elsewhere.rejected, []);
  assert.deepEqual(elsewhere.problems, []);
});

test("C3 · the rejection does not turn on cardinality or order", () => {
  // A point and a set are both valid; only the marker rejects.
  assert.deepEqual(parseBlocker(record("- A.")).problems, []);
  assert.deepEqual(parseBlocker(record("- B.\n- A.")).problems, []);
  assert.ok(parseBlocker(record("- A.\n- First unproved bridge: B")).problems.length >= 1);
});

// ---------------------------------------------------------------------------
// Fail closed
// ---------------------------------------------------------------------------

test("fail closed · an absent section is a problem, never an implicit none", () => {
  const blocker = parseBlocker("# P\n\n## Target Statement\n\nT.\n");
  assert.equal(blocker.status, "absent");
  assert.ok(blocker.problems.length >= 1);
});

test("fail closed · an empty section, prose with no list, an empty item and duplicates are each reported", () => {
  assert.equal(parseBlocker(record("")).status, "empty");
  assert.ok(parseBlocker(record("")).problems.length >= 1);

  assert.equal(parseBlocker(record("It is hard.")).status, "malformed");
  assert.ok(parseBlocker(record("It is hard.")).problems.length >= 1);

  assert.ok(parseBlocker(record("- A.\n-")).problems.length >= 1, "an empty list item");
  assert.ok(parseBlocker(record("- A.\n-   a.  ")).problems.length >= 1, "a repeated point, after trimming and case-folding");
});

test("fail closed · `none` beside a list is not a none: the list is read", () => {
  const blocker = parseBlocker(record("none\n- A."));
  assert.equal(blocker.status, "point");
});

// ---------------------------------------------------------------------------
// Fixtures through the audit
// ---------------------------------------------------------------------------

test("C3 · the RH-shaped fixture (a point) validates", () => {
  assert.deepEqual(findingsFor("blocker-point-rh"), []);
  assert.equal(parseBlocker(readProblem("blocker-point-rh", "riemann")).status, "point");
});

test("C3 · the PvsNP-shaped fixture (a set) validates", () => {
  assert.deepEqual(findingsFor("blocker-set-pvsnp"), []);
  assert.equal(parseBlocker(readProblem("blocker-set-pvsnp", "p-vs-np")).status, "set");
});

test("C3 · the first-unproved-bridge fixture is rejected, and the finding names the marker line", () => {
  const found = findingsFor("blocker-first-unproved-bridge");
  assert.equal(found.length, 1);
  assert.ok(found[0].evidence.some((e) => /First unproved bridge/i.test(e)), JSON.stringify(found[0].evidence));
  assert.equal(found[0].label, "OBSERVED");
});

test("fail closed · a problem record with no Current Blocker section is reported by the rule", () => {
  const found = findingsFor("blocker-absent");
  assert.equal(found.length, 1);
  assert.ok(found[0].evidence.some((e) => /Current Blocker/.test(e)));
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
  assert.equal(rule.standard, 17);
  assert.ok(EVALUATED_RULES.includes(RULE));
  assert.deepEqual(RULE_SURFACES.get(RULE)?.surfaces, ["open-problems"]);
});

test("with no open-problem record the rule is not-evaluated, never passed", () => {
  const verdict = validateJson("math-compliant");
  const result = verdict.results.find((r) => r.ruleId === RULE);
  assert.ok(result, "the rule has no result at all");
  assert.notEqual(result.status, "passed");
});

import { readFileSync } from "node:fs";
function readProblem(name, slug) {
  return readFileSync(path.join(fixture(name), "artifacts/open-problems", slug, "problem.md"), "utf8");
}
