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

// ---------------------------------------------------------------------------
// A5 · score-history comparability. A number is only meaningful against numbers computed the same
// way, and this framework changed the way once.
// ---------------------------------------------------------------------------

test("A5 · the envelope says which aggregation rules produced the score", () => {
  const { envelope } = validate("escape-hatch-undeclared");

  assert.equal(envelope.scoreBasis.id, "project-subject-required");
  assert.equal(envelope.scoreBasis.version, 2);
  assert.match(envelope.scoreBasis.note, /not comparable/i);

  // RiemannHypothesis reads 89 under version 1 and 88 under version 2 from the same commit, with no
  // mathematics and no records altered: five rules that were never about it left the denominator. A
  // reader comparing across the change sees a regression that did not happen, and the only defence
  // is that the envelope says which basis each number came from.
  assert.ok(envelope.score !== null, "the fixture must produce a score for the field to qualify");
});

// ---------------------------------------------------------------------------
// A6 · whose property is `integrity.provenance-digest` about?
//
// The step-6 architectural question, settled by a property no path constant can fake. Three adopter
// states — no provenance record, a drifted one, a correct one — and two readings of the rule:
//
//   framework-ownership  the result is IDENTICAL across all three, and outside the adopter's score
//   adopter-root         the result VARIES with all three, and is inside it
//
// The catalog decides. `integrity.rule-lifecycle-honest` reads the RULE CATALOG, which exists only
// in the standards pack; there is nothing at an adopter root to relocate it to. And this rule's
// rationale is about editing "the spec" so that fidelity still passes — the standards pack's own
// documents. Neither is an adopter obligation, so the repair is separation, not relocation.
// ---------------------------------------------------------------------------

const DIGEST = "integrity.provenance-digest";

test("A6 · an adopter's own provenance record cannot move the framework's integrity result", () => {
  const states = ["wrong-root-absent", "wrong-root-broken", "wrong-root-clean"];
  const seen = states.map((name) => {
    const r = resultFor(validate(name).envelope, DIGEST);
    return { name, status: r.status, subject: r.inspected.subject, scored: r.scored };
  });

  // Non-vacuity: the three fixtures must actually differ in the way the question is about.
  assert.equal(validate("wrong-root-absent").envelope.results.length > 0, true);
  for (const [name, present] of [
    ["wrong-root-absent", false],
    ["wrong-root-broken", true],
    ["wrong-root-clean", true],
  ]) {
    const { envelope } = validate(name);
    const files = envelope.results.flatMap((r) => r.inspected?.surfaces?.flatMap((s) => s.paths) ?? []);
    assert.equal(
      files.includes("artifacts/provenance-digests.json") && present,
      present,
      `${name}: fixture state`,
    );
  }

  for (const s of seen) {
    assert.equal(s.status, "passed", `${s.name}: ${DIGEST} must not move with the adopter's own record`);
    assert.equal(s.subject, "framework", `${s.name}: the result is about the standards pack`);
    assert.equal(s.scored, false, `${s.name}: and is outside the adopter's score`);
  }
});

test("A6 · the render tells an adopter that its same-named file was not inspected", () => {
  // Separation is only a repair if the reader can act on it. An adopter that keeps its own
  // artifacts/provenance-digests.json has asserted something about its own source documents, and a
  // row reading `integrity.provenance-digest — passed` beside their rules will be read as covering
  // it unless the report says otherwise.
  const text = run(["validate", `--dir=${fixture("wrong-root-broken")}`]).out;
  assert.match(text, /your artifacts\/provenance-digests\.json was not inspected/);

  const absent = run(["validate", `--dir=${fixture("wrong-root-absent")}`]).out;
  assert.doesNotMatch(
    absent,
    /was not inspected/,
    "an adopter with no such file must not be told about one",
  );
});

test("A6 · rule-lifecycle-honest has no adopter-root reading to regress against", () => {
  // Recorded as a test because it is the half of §0h's four-rule category that cannot be argued
  // either way: the detector iterates the RULE CATALOG. An adopter has none. Relocation is not a
  // decision here, it is an impossibility, and a future change that "fixes the root" for this rule
  // would be reading a directory that does not exist.
  for (const name of ["wrong-root-absent", "wrong-root-broken", "wrong-root-clean"]) {
    const r = resultFor(validate(name).envelope, "integrity.rule-lifecycle-honest");
    assert.equal(r.inspected.subject, "framework");
    assert.ok(
      r.inspected.surfaces.every((s) => s.paths.every((p) => p.startsWith("rules/"))),
      `${name}: the surface must be the framework's rule sources and nothing else`,
    );
  }
});
