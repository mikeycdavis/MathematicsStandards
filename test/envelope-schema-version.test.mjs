/**
 * FE-41 · the result envelope declares the shape it is actually emitting.
 *
 * WHY THIS FILE EXISTS. FE-41 landed the behaviour — `score: null` on `NOT_EVALUATED`, with
 * `scoreBasis.unavailable` saying which of the two reasons applies — and the release that published
 * it found a gap the implementation had not considered. `CHANGELOG.md` has said since 1.1.0 that
 * this framework "versions the format on incompatible change". Two releases left `schemaVersion` at
 * "1.0" and both said why in the entry: they only ADDED fields, so a consumer joining on `ruleId`
 * could not break. FE-41 is the first envelope change where that test comes out the other way — an
 * existing machine-consumed field widened from numeric to nullable — and nothing in the
 * implementation, its story, or its tests had noticed that the declaration needed to move with it.
 *
 * The defect that would have shipped is not a wrong number. It is one version identifying two
 * incompatible shapes, which disables the only thing a schema version does. A consumer pinning
 * "1.0" would have had no way to tell the envelope it was written against from the one that breaks
 * it.
 *
 * WHAT IS PINNED HERE. Not "the constant equals 2.0" — that assertion is satisfied by the constant
 * and proves nothing about the documents. Every assertion below reads a real envelope produced by a
 * real CLI run, and the last group is the point of the file: the nullable-score capability and the
 * declared schema version cannot drift apart again, whichever of them someone edits.
 *
 * Every assertion names a status, a token, or a named field — never a bare aggregate.
 * design/testing-principles.md §4.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { ENVELOPE_SCHEMA_VERSION } from "../scripts/compliance.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const fixture = (name) => path.join(HOME, "test/fixtures", name);

function envelopeFor(name, command = "validate") {
  const { out } = run([command, `--dir=${fixture(name)}`, "--json"]);
  try {
    return JSON.parse(out);
  } catch {
    assert.fail(`no JSON envelope from ${command} ${name}: ${out.slice(0, 400)}`);
  }
}

/** The two routes to NOT_EVALUATED, and one control per scored verdict family. */
const UNSCORED = ["not-evaluated-absent-policy", "not-evaluated-unreadable-policy"];
const SCORED = [
  { name: "math-compliant", status: "COMPLIANT" },
  { name: "escape-hatch-undeclared", status: "NON_COMPLIANT" },
  { name: "sorry-certified", status: "BLOCKED_BY_INVARIANT" },
];

// ---------------------------------------------------------------------------
// B1 · every envelope this build emits declares schema 2.0.
//
// Both surfaces, because a field that appears on one command and not the other is read as "this
// build does not emit it". `audit` and `validate` are separate call sites into the same emitter and
// nothing but this assertion says so.
// ---------------------------------------------------------------------------

test("B1 · every validate envelope declares schemaVersion 2.0", () => {
  for (const name of [...UNSCORED, ...SCORED.map((s) => s.name)]) {
    const e = envelopeFor(name);
    assert.equal(e.schemaVersion, "2.0", `${name} declared ${JSON.stringify(e.schemaVersion)}`);
  }
});

test("B1 · the audit findings report is a separate document and did not move with the envelope", () => {
  // `audit` and `validate` emit two different formats, versioned independently: the findings report
  // from `scripts/standards.mjs` and the compliance envelope from `scripts/compliance.mjs`. This
  // assertion exists because the obvious guess is that they are one document — they are not, and a
  // release note claiming the audit format changed would be wrong.
  //
  // The findings report is untouched by FE-41 for a reason that is checkable rather than asserted:
  // it carries no compliance score at all, so the field whose domain widened does not appear in it.
  for (const name of ["math-compliant", "not-evaluated-absent-policy"]) {
    const report = envelopeFor(name, "audit");
    assert.equal(report.schemaVersion, "1.0.0", `${name} audit report schema`);
    assert.equal(report.score, undefined, `${name} audit report unexpectedly carries a score`);
    assert.notEqual(report.schemaVersion, envelopeFor(name, "validate").schemaVersion);
  }
});

test("B1 · the exported constant is what the documents actually carry", () => {
  // Non-vacuity for the whole file: if these ever disagree, every assertion above is testing a
  // constant against itself rather than against a document.
  assert.equal(envelopeFor("math-compliant").schemaVersion, ENVELOPE_SCHEMA_VERSION);
});

// ---------------------------------------------------------------------------
// B2 · under schema 2.0, NOT_EVALUATED carries no score and says why.
// ---------------------------------------------------------------------------

test("B2 · both routes to NOT_EVALUATED report a null score with a reason", () => {
  for (const name of UNSCORED) {
    const e = envelopeFor(name);
    assert.equal(e.status, "NOT_EVALUATED", name);
    assert.equal(e.score, null, `${name} score`);
    assert.equal(e.scoreBasis.unavailable.reason, "not-evaluated", `${name} reason`);
    assert.ok(e.scoreBasis.unavailable.note.length > 0, `${name} note`);
  }
});

test("B2 · a null score is never reported bare", () => {
  // `score: null` alone cannot distinguish "no verdict was reached" from "the denominator was
  // empty", and the natural guess — "nothing passed" — is wrong in both cases.
  for (const name of UNSCORED) {
    const e = envelopeFor(name);
    assert.notEqual(e.scoreBasis.unavailable, null, `${name} reported a bare null score`);
  }
});

// ---------------------------------------------------------------------------
// B3 · scored verdicts are untouched by the schema move.
//
// The bump is a statement about the format's compatibility, not about arithmetic. If a scored
// number moved, the release note would be wrong about what changed.
// ---------------------------------------------------------------------------

test("B3 · every scored verdict family keeps a numeric score and basis version 2", () => {
  for (const { name, status } of SCORED) {
    const e = envelopeFor(name);
    assert.equal(e.status, status, name);
    assert.equal(typeof e.score, "number", `${name} score type`);
    assert.equal(e.scoreBasis.version, 2, `${name} basis version`);
    assert.equal(e.scoreBasis.unavailable, null, `${name} claimed unavailability while scored`);
  }
});

test("B3 · the scoring basis did not move with the schema", () => {
  // Two version numbers, two questions. `scoreBasis.version` says whether two scores are
  // comparable; bumping it here would tell every consumer their historical numbers are
  // incomparable, which is not true — FE-41 changed whether a score exists, never how one is
  // computed.
  assert.equal(envelopeFor("math-compliant").scoreBasis.version, 2);
  assert.notEqual(String(envelopeFor("math-compliant").scoreBasis.version), ENVELOPE_SCHEMA_VERSION);
});

// ---------------------------------------------------------------------------
// B4 · the capability and the declaration cannot drift apart.
//
// This is the assertion the file is for. The three groups above would all stay green if someone
// later reverted the schema to "1.0" while keeping the nullable shape — B1 reads the constant, and
// the constant would have moved with it. B4 reads the pairing instead: whatever the version says,
// a document containing `score: null` may not claim a schema that predates nullable scores.
// ---------------------------------------------------------------------------

test("B4 · no envelope emits a nullable score while claiming schema 1.0", () => {
  for (const name of [...UNSCORED, ...SCORED.map((s) => s.name)]) {
    const e = envelopeFor(name);
    if (e.score === null) {
      assert.notEqual(
        e.schemaVersion,
        "1.0",
        `${name} emits the nullable-score shape while declaring the schema that predates it`,
      );
    }
  }
});

test("B4 · the nullable-score shape requires a schema of 2.0 or later", () => {
  const major = (v) => Number.parseInt(String(v).split(".")[0], 10);
  for (const name of UNSCORED) {
    const e = envelopeFor(name);
    assert.equal(e.score, null, `${name} no longer reaches the shape this assertion guards`);
    assert.ok(
      major(e.schemaVersion) >= 2,
      `${name} declares ${JSON.stringify(e.schemaVersion)} for a document containing score: null`,
    );
  }
});

test("B4 · the schema version has exactly one source, so the two cannot be edited apart", () => {
  // A second literal is the drift itself: one site could be updated and the other left behind, and
  // every assertion above would keep passing on whichever site it happened to read.
  const source = readFileSync(path.join(HOME, "scripts/compliance.mjs"), "utf8");
  const assignments = source.match(/schemaVersion:\s*[^,\n]+/g) ?? [];
  assert.equal(assignments.length, 1, `expected one schemaVersion assignment, found ${assignments.length}`);
  assert.match(assignments[0], /schemaVersion:\s*ENVELOPE_SCHEMA_VERSION/);
  assert.doesNotMatch(source, /schemaVersion:\s*"1\.0"/);
});
