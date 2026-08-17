/**
 * FE-41 · a status of NOT_EVALUATED carries no compliance score.
 *
 * WHERE THIS DEFECT CAME FROM. Not from this repository's own review. StandardsEnforcer found it
 * from the outside, integrating MathematicsStandards as a pack: its `describe()` used to print the
 * pack's project, score and pass counts beside the verdict, and it stopped because
 * MathematicsStandards reported `score: 97` with 52 rules passed *beside a status of
 * `NOT_EVALUATED`*. The consumer worked around it by printing less. Reproduced against v2.0.0 on a
 * fixture pair identical apart from one file:
 *
 *     not-evaluated-absent-policy      NOT_EVALUATED  score 50   (4 passed, 2 scored)
 *     not-evaluated-unreadable-policy  NOT_EVALUATED  score 80   (7 passed, 5 scored)
 *
 * The number ROSE as the configuration got worse. With the policy unreadable, fewer required
 * project-subject rules resolved into the denominator and the surviving passes dominated what was
 * left, so a consumer ranking repositories by score placed the broken policy above the absent one.
 * That is EP-07's false assurance arriving through the surface EP-07 did not check: the human
 * renderer has always returned on both NOT_EVALUATED paths before printing a Score line, and only
 * the JSON envelope diverged.
 *
 * WHAT IS PINNED HERE. That the two surfaces now agree, that both routes to NOT_EVALUATED are
 * covered rather than the one that was reported, and that the absence of a score is reported with a
 * reason rather than as a bare null — `score: null` alone cannot distinguish "no verdict was
 * reached" from "the denominator was empty", and the second is a legitimate state of a fully
 * COMPLIANT run.
 *
 * Every assertion names a status, a token or a named denominator part — never a bare aggregate.
 * design/testing-principles.md §4.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import { evaluate, STATUS } from "../scripts/compliance.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const catalog = await loadCatalog(path.join(HOME, "rules"));
const fixture = (name) => path.join(HOME, "test/fixtures", name);

function validate(name, extra = []) {
  const { code, out } = run(["validate", `--dir=${fixture(name)}`, ...extra]);
  return { code, out };
}

function envelopeFor(name) {
  const { out } = validate(name, ["--json"]);
  try {
    return JSON.parse(out);
  } catch {
    assert.fail(`no JSON envelope from ${name}: ${out.slice(0, 400)}`);
  }
}

/** The two routes to NOT_EVALUATED. Both must be covered; only the first was ever reported. */
const ABSENT = "not-evaluated-absent-policy";
const UNREADABLE = "not-evaluated-unreadable-policy";

// ---------------------------------------------------------------------------
// A1 · non-vacuity. The pair must actually reach NOT_EVALUATED, by two routes.
//
// Without this, every assertion below could hold because the fixtures quietly stopped being
// NOT_EVALUATED at all, and the file would pin nothing.
// ---------------------------------------------------------------------------

test("A1 · both halves of the pair reach NOT_EVALUATED, and exit 2", () => {
  for (const name of [ABSENT, UNREADABLE]) {
    const envelope = envelopeFor(name);
    assert.equal(envelope.status, STATUS.NOT_EVALUATED, `${name} no longer reaches NOT_EVALUATED`);
    assert.equal(
      validate(name).code,
      2,
      `${name} must exit 2: an unusable policy is a configuration error, not a compliance failure`,
    );
  }
});

test("A1 · they differ in the one way the pair exists to isolate", () => {
  // The unreadable half resolves more rules than the absent half — that difference is the engine
  // of the old defect, and it is deliberately NOT removed by this fix. What changes is that the
  // difference can no longer reach a published number.
  assert.notEqual(
    envelopeFor(ABSENT).denominator.scored,
    envelopeFor(UNREADABLE).denominator.scored,
    "the pair no longer differs in what resolves; the ranking regression below would hold trivially",
  );
});

// ---------------------------------------------------------------------------
// A2 · the score itself.
// ---------------------------------------------------------------------------

test("A2 · an absent policy yields no score, with the reason", () => {
  const envelope = envelopeFor(ABSENT);
  assert.equal(envelope.score, null, "measured 50 before this fix");
  assert.equal(envelope.scoreBasis.unavailable.reason, "not-evaluated");
  assert.match(envelope.scoreBasis.unavailable.note, /no verdict was reached/i);
});

test("A2 · an unreadable policy yields no score, with the same reason", () => {
  const envelope = envelopeFor(UNREADABLE);
  assert.equal(envelope.score, null, "measured 80 before this fix");
  assert.equal(envelope.scoreBasis.unavailable.reason, "not-evaluated");
});

test("A2 · the reason is a token to branch on, not only prose", () => {
  // A consumer must not have to regex the note. The vocabulary is closed at two.
  const unavailable = envelopeFor(ABSENT).scoreBasis.unavailable;
  assert.deepEqual(Object.keys(unavailable).sort(), ["note", "reason"]);
  assert.ok(["not-evaluated", "no-scorable-rules"].includes(unavailable.reason));
});

// ---------------------------------------------------------------------------
// A3 · THE REGRESSION. The malformed half cannot rank above the absent half.
//
// Stated as "neither has a score", not as "the scores are equal". Equality would also be satisfied
// by two numbers that happened to coincide, and the property is the absence, not the tie.
// ---------------------------------------------------------------------------

test("A3 · breaking the policy cannot produce a better number, because there is no number", () => {
  const absent = envelopeFor(ABSENT);
  const unreadable = envelopeFor(UNREADABLE);

  assert.equal(typeof absent.score, "object", `score must be null, got ${absent.score}`);
  assert.equal(typeof unreadable.score, "object", `score must be null, got ${unreadable.score}`);
  assert.equal(absent.score, null);
  assert.equal(unreadable.score, null);

  // The old comparison, written out so a future reader can see what it was: 80 > 50, from the
  // repository that had made its configuration worse.
  assert.ok(
    !(unreadable.score > absent.score),
    "a repository improved its published score by breaking its policy file",
  );
});

// ---------------------------------------------------------------------------
// A4 · the two surfaces agree.
//
// The human renderer was already correct. This asserts the fix closed the gap rather than moving
// it: if a future change starts printing a Score line on these paths, the JSON is no longer the
// only surface that could be wrong.
// ---------------------------------------------------------------------------

test("A4 · the human render carries no score on either NOT_EVALUATED path", () => {
  for (const name of [ABSENT, UNREADABLE]) {
    const { out } = validate(name);
    assert.match(out, /NOT_EVALUATED/, `${name} must say so in the human output`);
    assert.doesNotMatch(out, /^\s*Score:/m, `${name} printed a score beside a status meaning none`);
  }
});

// ---------------------------------------------------------------------------
// A5 · nothing else moved. Scoring is unchanged wherever a verdict was reached.
// ---------------------------------------------------------------------------

test("A5 · verdicts that were reached keep their scores, and declare no unavailability", () => {
  // One of each shape: compliant, non-compliant, blocked. Numbers are the v2.0.0 values.
  for (const [name, status, score] of [
    ["math-compliant", "COMPLIANT", 100],
    ["escape-hatch-undeclared", "NON_COMPLIANT", 97],
    ["sorry-certified", "BLOCKED_BY_INVARIANT", 93],
  ]) {
    const envelope = envelopeFor(name);
    assert.equal(envelope.status, status, name);
    assert.equal(envelope.score, score, `${name}'s score moved; this change was not meant to touch it`);
    assert.equal(envelope.scoreBasis.unavailable, null, `${name} has a score and must claim none is missing`);
  }
});

test("A5 · the basis identity is untouched, so scores stay comparable across this change", () => {
  // FE-41 changes when a score exists, never how one is computed. A bumped version here would tell
  // every consumer their historical numbers are incomparable, which would not be true.
  const basis = envelopeFor("escape-hatch-undeclared").scoreBasis;
  assert.equal(basis.id, "project-subject-required");
  assert.equal(basis.version, 2);
  assert.equal(basis.since, "1.2.0");
});

// ---------------------------------------------------------------------------
// A6 · the second token, at the verdict boundary.
//
// `no-scorable-rules` is the pre-existing null: a run that reached a verdict over an empty
// denominator. No fixture produces it — every one of them scores something — so it is asserted
// where it is reachable without inventing a repository, and it matters because it is the case
// `not-evaluated` must not be confused with.
// ---------------------------------------------------------------------------

test("A6 · an empty denominator is distinguished from an unreached verdict", () => {
  const verdict = evaluate({ catalog, policy: { standardVersion: "1.0.0", project: "t" }, findings: [], evaluated: [], today: "2026-08-16" });
  assert.equal(verdict.status, STATUS.COMPLIANT, "a verdict WAS reached here");
  assert.equal(verdict.score, null);
  assert.equal(verdict.scoreUnavailable.reason, "no-scorable-rules");
});

test("A6 · no policy is the other one, at the same boundary", () => {
  const verdict = evaluate({ catalog, policy: null, findings: [], evaluated: [], today: "2026-08-16" });
  assert.equal(verdict.status, STATUS.NOT_EVALUATED);
  assert.equal(verdict.score, null);
  assert.equal(verdict.scoreUnavailable.reason, "not-evaluated");
});
