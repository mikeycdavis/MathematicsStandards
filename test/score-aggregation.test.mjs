/**
 * Tier 2 step 5 · what belongs in an adopter's compliance score, and what a score may not reward.
 *
 * Design: design/v1.2-evidence-provenance.md §12. Written before the implementation.
 *
 * Steps 2–4 made the evidence surface truthful. This step decides what truthful evaluation means for
 * aggregation, and the governing property is monotonicity:
 *
 *     score(with an unresolved required pointer) <= score(without the pointer)
 *
 * with the same for terminal status. A project must never improve its report by naming an artifact
 * that is not there — that is §0m one level up, and step 4 opened it deliberately rather than
 * closing it with a scoring decision that had not been thought through.
 *
 * The escape hatch, measured at 6eadfe0 on a fixture pair identical apart from one policy line:
 *
 *     escape-hatch-undeclared   NON_COMPLIANT  97   (one honest failure)
 *     escape-hatch-declared     COMPLIANT     100   (the same repository, plus a pointer at nothing)
 *
 * Every assertion names a rule id, a status, or a named denominator part — never a bare aggregate.
 * design/testing-principles.md §4.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { HOME, run } from "./helpers/cli.mjs";

const fixture = (name) => path.join(HOME, "test/fixtures", name);

function validate(name) {
  const { code, out } = run(["validate", `--dir=${fixture(name)}`, "--json"]);
  let envelope = null;
  try {
    envelope = JSON.parse(out);
  } catch {
    /* left null — asserted on below, with the raw output in the message */
  }
  return { code, out, envelope };
}

function resultFor(envelope, ruleId) {
  assert.ok(envelope, "no envelope was produced");
  const r = envelope.results.find((x) => x.ruleId === ruleId);
  assert.ok(r, `${ruleId} is absent from the results; it must be reported, not dropped`);
  return r;
}

/** The verdict lattice. Higher is worse; `NOT_EVALUATED` sits outside it and is not comparable. */
const SEVERITY = {
  COMPLIANT: 0,
  COMPLIANT_WITH_EXCEPTIONS: 1,
  NON_COMPLIANT: 2,
  BLOCKED_BY_INVARIANT: 3,
};

const ROUTES = "lifecycle.failed-routes-preserved";

// ---------------------------------------------------------------------------
// A1 · monotonicity under an unresolved declaration. The milestone property.
// ---------------------------------------------------------------------------

test("A1 · declaring an artifact that does not resolve cannot raise the score", () => {
  const without = validate("escape-hatch-undeclared").envelope;
  const declared = validate("escape-hatch-declared").envelope;

  // Non-vacuity first. If the two fixtures ever stop differing in the one way that matters, the
  // inequality below holds trivially and this file stops testing anything.
  assert.equal(resultFor(without, ROUTES).status, "failed", "the honest twin must fail the rule");
  assert.equal(resultFor(declared, ROUTES).inspected.blocked, true, "the declared twin must be blocked");

  assert.ok(
    declared.score <= without.score,
    `declaring a missing artifact raised the score from ${without.score} to ${declared.score}`,
  );
});

test("A1 · declaring an artifact that does not resolve cannot improve the terminal status", () => {
  const without = validate("escape-hatch-undeclared").envelope;
  const declared = validate("escape-hatch-declared").envelope;

  assert.equal(without.status, "NON_COMPLIANT", "the honest twin's one real failure must show");
  assert.ok(
    SEVERITY[declared.status] >= SEVERITY[without.status],
    `declaring a missing artifact improved the verdict from ${without.status} to ${declared.status}`,
  );
  assert.notEqual(declared.status, "COMPLIANT");
});

test("A1 · the unresolved rule keeps the step-4 status it earned", () => {
  // Monotonicity is enforced by aggregation, NOT by restoring the failure. The framework still does
  // not know whether this project preserves its failed routes, and a `failed` here would assert it
  // does. If a future change buys monotonicity by re-failing the rule, this fails.
  const declared = validate("escape-hatch-declared").envelope;
  const r = resultFor(declared, ROUTES);

  assert.equal(r.status, "skipped");
  assert.equal(r.disposition, "not-evaluated");
  assert.equal(r.notEvaluatedBecause, "unresolved-evidence");
});

// ---------------------------------------------------------------------------
// A2 · the denominator holds project results, and says which parts it holds.
// ---------------------------------------------------------------------------

test("A2 · framework and run subjects are outside the score denominator", () => {
  // §0h's consequence. `integrity.provenance-digest` certifies MathematicsStandards' own source
  // documents; it is identical for every adopter and unreachable by any of them. A pass an adopter
  // cannot affect is not a measurement of that adopter, and five such rows are 5 free points.
  const { envelope } = validate("escape-hatch-undeclared");
  const foreign = envelope.results.filter(
    (r) => r.inspected && r.inspected.subject !== "project" && r.inspected.state !== "no-detector",
  );

  assert.deepEqual(
    foreign.map((r) => r.ruleId).sort(),
    [
      "agent.explainable-findings",
      "evidence.labels",
      "evidence.skipped-never-passed",
      "integrity.provenance-digest",
      "integrity.rule-lifecycle-honest",
    ],
    "the set of rules that are not about the adopter",
  );
  assert.equal(
    envelope.denominator.frameworkSubject + envelope.denominator.runSubject,
    foreign.length,
    "every non-project result must be accounted for as excluded, not silently dropped",
  );
  for (const r of foreign) {
    assert.equal(r.scored, false, `${r.ruleId} is ${r.inspected.subject}-subject and must not be scored`);
  }
});

test("A2 · an unresolved required surface is a zero-credit denominator entry", () => {
  const declared = validate("escape-hatch-declared").envelope;

  assert.equal(declared.denominator.unresolvedRequired, 1);
  assert.equal(resultFor(declared, ROUTES).scored, true, "it stays in the denominator");
  assert.equal(resultFor(declared, ROUTES).status, "skipped", "and earns nothing from it");

  // The arithmetic, stated rather than trusted: the rule occupies a denominator slot and earns
  // nothing for it, which is what makes the score fall rather than merely fail to rise.
  const scoredResults = declared.results.filter((r) => r.scored === true);
  const passed = scoredResults.filter((r) => r.status === "passed").length;
  assert.equal(declared.denominator.scored, scoredResults.length);
  assert.equal(declared.score, Math.round((passed / scoredResults.length) * 100));
});

test("A2 · a rule with no subject stays out of the denominator", () => {
  // Preserved semantics, asserted so the step-5 rework cannot quietly change it. A project that has
  // not written a claims ledger should see "nobody checked", not a denominator slot it cannot fill.
  const { envelope } = validate("no-subject");
  const noSubject = envelope.results.filter((r) => r.inspected?.state === "no-subject");
  assert.ok(noSubject.length > 0, "the fixture must actually produce no-subject rules");

  for (const r of noSubject) {
    assert.equal(r.scored, false, `${r.ruleId} has no subject and must not occupy a denominator slot`);
    assert.equal(r.notEvaluatedBecause, "no-subject");
  }
  assert.equal(envelope.denominator.noSubject, noSubject.length);
});

// ---------------------------------------------------------------------------
// A3 · the three ways a rule can be unevaluated are told apart.
// ---------------------------------------------------------------------------

test("A3 · a stale attestation is distinguishable from a rule nobody attested", () => {
  // At 6eadfe0 both report `skipped / not-evaluated` with the message "No implemented check
  // evaluates evidence.discarded-failures" — which is true of the detector and false about the
  // history: a person reviewed this rule, recorded what they read, and the file has since changed.
  // The three situations arrive at the same status and must not arrive at the same explanation.
  const stale = validate("stale-attestation").envelope;
  const r = resultFor(stale, "evidence.discarded-failures");

  assert.equal(r.status, "skipped");
  assert.equal(r.notEvaluatedBecause, "stale-attestation");
  assert.match(r.message, /review/i, "the message must say a review happened and no longer applies");
  assert.equal(stale.denominator.staleAttestation, 1);

  // And the same rule with no attestation at all reports the other reason.
  const none = validate("no-subject").envelope;
  assert.equal(resultFor(none, "evidence.discarded-failures").notEvaluatedBecause, "no-detector");
});

test("A3 · every unevaluated result states which kind of unevaluated it is", () => {
  const { envelope } = validate("escape-hatch-declared");
  const KINDS = new Set([
    "no-detector",
    "no-subject",
    "unresolved-evidence",
    "stale-attestation",
    "expired-attestation",
    "not-applicable",
  ]);

  const unexplained = envelope.results
    .filter((r) => r.status === "skipped")
    .filter((r) => !KINDS.has(r.notEvaluatedBecause));
  assert.deepEqual(
    unexplained.map((r) => `${r.ruleId} (${r.notEvaluatedBecause})`),
    [],
    "a skipped result that cannot say why is the §0 defect in the field built to replace it",
  );
});

// ---------------------------------------------------------------------------
// A4 · the adopter's verdict is about the adopter, and nothing is lost saying so.
// ---------------------------------------------------------------------------

test("A4 · a run- or framework-subject failure does not become the adopter's non-compliance", () => {
  // The other side of A2, and the one with a hazard. Excluding these rows from the score must not
  // silently discard them: `evidence.skipped-never-passed` failing means the TOOL is lying, and a
  // reader must be told even though it is not their repository's fault.
  const { envelope } = validate("escape-hatch-undeclared");
  assert.ok(Array.isArray(envelope.foreignFailures), "the envelope must carry a place for them");

  // Non-vacuity: this run has none, so the property is that the field exists and is empty rather
  // than absent. An absent key and an empty one are different propositions — Tier 1's lesson.
  assert.deepEqual(envelope.foreignFailures, []);
});

test("A4 · the human render says the score excluded rules that are not about this project", () => {
  const text = run(["validate", `--dir=${fixture("escape-hatch-declared")}`]).out;
  assert.match(text, /not about this project/i);
  assert.match(text, /lifecycle\.failed-routes-preserved/);
  assert.match(
    text,
    /could not be evaluated/i,
    "the unresolved pointer must be visible in the ordinary render, not only in JSON",
  );
});
