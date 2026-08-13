/**
 * Tier 3 · §0c + §0d + A1 — what counts as the evidence is declared once, and strength is not
 * relevance.
 *
 * Design: design/tier3-semantic-consistency.md. Written before the implementation, so what these
 * defeat is fixed in advance and cannot be adjusted to whatever the implementation turns out to do.
 *
 * The milestone claim:
 *
 *     What counts as the evidence is declared once and read; and how strong a claim is and what it
 *     bears on are two facts, not one.
 *
 * WHICH OF THESE ARE FALSIFIERS AND WHICH ARE GUARDS. Stated here because the distinction is the
 * one design/testing-principles.md says gets lost first, and A1 is where it would have been lost:
 *
 *   - C1, C2, C3, C4, C5 are FALSIFIERS. Each must be red at 3bc38fa for the reason recorded on it.
 *   - C1', C2', C3' are TRUE POSITIVES that must be green before and after. They exist because
 *     every falsifier above them is otherwise satisfiable by weakening or deleting a rule.
 *   - C6 is a GUARD, and green at 3bc38fa for an uninteresting reason: relevance cannot influence a
 *     rank today because nothing reads it. Claiming it as a falsifier would be claiming credit for
 *     a property the baseline has by accident. It is here because the property must survive the
 *     change that makes the field readable, which is exactly when it could be lost.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";

import { HOME, run } from "./helpers/cli.mjs";

const fixture = (name) => path.join(HOME, "test/fixtures", name);
const detectorSource = readFileSync(path.join(HOME, "scripts/standards.mjs"), "utf8");

/** Run `validate --json` against a fixture. A non-zero exit is data; the envelope is the subject. */
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

/** The evidence lines a rule reported, or [] when it reported nothing. */
function evidenceFor(envelope, ruleId) {
  assert.ok(envelope, "no envelope was produced");
  const finding = (envelope.findings ?? []).filter((f) => f.rule === ruleId);
  return finding.flatMap((f) => f.evidence ?? []);
}

/** Did this rule report anything naming this claim? */
function reported(envelope, ruleId, claimId) {
  return evidenceFor(envelope, ruleId).some((e) => e.includes(claimId));
}

// ---------------------------------------------------------------------------
// C1 · §0c — a marker that carries the required evidence is not evidence of its absence.
//
// At 3bc38fa: `\bO\(` is a member of the *approximate* trigger list in detectComputationEvidence,
// and `O(x^{1/2} log x)` contains no member of the separately authored *bounded* suppressor list.
// So an asymptotic statement is reported as an approximation with no stated error bound, when the
// asymptotic notation IS the stated bound. RiemannHypothesis's recorded case.
//
// The property is not "O( should be in the other list". It is that a marker cannot be allowed to
// trigger an obligation it discharges — which has to hold for markers nobody has written yet.
// ---------------------------------------------------------------------------

test("C1 · an asymptotic statement is not an approximation with no bound", () => {
  const { envelope } = validate("evidence-markers");
  assert.ok(envelope, "the fixture must reach a verdict, or nothing below is under test");

  assert.equal(
    reported(envelope, "computation.error-bounds-stated", "CLM-0001"),
    false,
    "CLM-0001 states its bound in the only notation asymptotics have. Reporting it as an " +
      "approximation with no stated bound reads the evidence as its absence, which is §0c.",
  );
});

test("C1' · a genuine unbounded approximation is still reported", () => {
  // Without this, C1 is satisfiable by deleting the rule, and a deleted rule would satisfy every
  // falsifier in this file at once.
  const { envelope } = validate("evidence-markers");
  assert.equal(
    reported(envelope, "computation.error-bounds-stated", "CLM-0002"),
    true,
    "CLM-0002 approximates a constant and states no bound anywhere. It is what the rule is for.",
  );
});

test("C1 · no marker may trigger an obligation it discharges", async () => {
  // The property, over the declaration rather than over one fixture. A table-level invariant is
  // what stops the next marker reintroducing the defect; the fixture above only shows today's.
  //
  // Red at 3bc38fa because there is no declaration to check: the trigger and the suppressor are two
  // regex literals inside a detector, and nothing can be asserted about their relationship.
  let markers = null;
  try {
    ({ APPROXIMATION_MARKERS: markers } = await import("../scripts/markers.mjs"));
  } catch {
    /* asserted below */
  }
  assert.ok(
    markers,
    "§0c's recognition is not declared anywhere a test can reach it. Two regex literals authored " +
      "independently inside one detector is the defect, not the implementation of the fix.",
  );

  for (const marker of markers) {
    if (!marker.asserts || !marker.carries) continue;
    assert.notEqual(
      marker.asserts,
      marker.carries,
      `${marker.pattern} both asserts and discharges '${marker.asserts}', so it can trigger a ` +
        `finding about the very obligation it satisfies`,
    );
  }
});

// ---------------------------------------------------------------------------
// C2 · §0c — an ambiguous prose token needs its context, and a suppressor must match the language.
//
// At 3bc38fa, two arms, both PvsNP's:
//   - `\babout\b` matches the English preposition, so a statement that approximates nothing is an
//     approximation. The marker is only mathematical when it governs a quantity.
//   - `\bbound\b` does not match `bounds`; the word boundary falls between `d` and `s`. A statement
//     that says its bound in the plural is unsuppressed.
// ---------------------------------------------------------------------------

test("C2 · 'about' as an English preposition is not an approximation", () => {
  const { envelope } = validate("evidence-markers");
  assert.equal(
    reported(envelope, "computation.error-bounds-stated", "CLM-0003"),
    false,
    "CLM-0003 records a fact ABOUT a kernel. It approximates nothing, so it cannot be an " +
      "approximation missing its bound.",
  );
});

test("C2 · a suppressor matches the word forms of its own language", () => {
  const { envelope } = validate("evidence-markers");
  assert.equal(
    reported(envelope, "computation.error-bounds-stated", "CLM-0004"),
    false,
    "CLM-0004 says 'bounds'. A recogniser that accepts 'bound' and not 'bounds' is reading a " +
      "present, correct statement of the evidence as its absence.",
  );
});

test("C2' · the same word governing a quantity still is one", () => {
  const { envelope } = validate("evidence-markers");
  assert.equal(
    reported(envelope, "computation.error-bounds-stated", "CLM-0005"),
    true,
    "CLM-0005's 'About 10^9' does approximate, and states no bound. Suppressing this one would " +
      "mean the repair had removed the marker rather than qualified it.",
  );
});

// ---------------------------------------------------------------------------
// C3 · §0d — an evidence type means the same thing to every rule.
//
// At 3bc38fa, `citation` is in PROOF_EVIDENCE (claims.mjs) and absent from the inline list in
// detectCounterexampleSearch (standards.mjs). The same declared type is adequate proof to one rule
// and no answer at all to another. RiemannHypothesis's recorded case: a theorem published in 2005,
// asked to search for counterexamples.
//
// The guarantee is semantic consistency across consumers. A capability table is how this milestone
// intends to get it and is not what is asserted here.
// ---------------------------------------------------------------------------

test("C3 · a citation that proves a claim also answers the counterexample question", () => {
  const { envelope } = validate("evidence-capabilities");
  assert.ok(envelope, "the fixture must reach a verdict, or nothing below is under test");

  assert.equal(
    reported(envelope, "proof.counterexample-search-recorded", "CLM-0001"),
    false,
    "CLM-0001 is carried to proved rank by its citation and simultaneously told that citation " +
      "records no search. One declared type, two incompatible capabilities, which is §0d.",
  );
});

test("C3' · numerical evidence alone still owes a counterexample search", () => {
  const { envelope } = validate("evidence-capabilities");
  assert.equal(
    reported(envelope, "proof.counterexample-search-recorded", "CLM-0002"),
    true,
    "A bounded scan is not a search for counterexamples outside its bound. Losing this would mean " +
      "the repair had widened the skip list rather than reconciled the vocabularies.",
  );
});

test("C3 · the two consumers agree about every evidence type, not just citation", () => {
  // The pair above fixes one token. This asserts there is a single declaration both consumers read,
  // which is the only form in which "means the same thing to every rule" is checkable.
  //
  // Red at 3bc38fa: PROOF_EVIDENCE exists, the counterexample list is a literal beside it, and no
  // object relates them. `computational` differs in the opposite direction and is correct only by
  // accident.
  const inlineTypeList = /\[\s*"counterexample-search"[^\]]*\]/.test(detectorSource);
  assert.equal(
    inlineTypeList,
    false,
    "detectCounterexampleSearch decides what an evidence type is worth with a literal array. " +
      "Whatever replaces it, a second private list is how the vocabularies drifted apart.",
  );
});

// ---------------------------------------------------------------------------
// C4 · the shared discipline, and the only test that would have caught both defects.
//
// §0c and §0d are different substrates and get different declarations. What they share is that in
// both, what counts as the evidence was written down more than once and the copies drifted. This is
// that stated as a contract.
// ---------------------------------------------------------------------------

test("C4 · no detector holds a private list of evidence types", () => {
  // Bidirectional with the declaration once one exists: every evidence-type token appearing in the
  // detector source must come from the vocabulary module, not from a literal in a comparison.
  const EVIDENCE_TOKENS = [
    "counterexample-search",
    "proof-sketch",
    "literature-search",
    "computational",
    "numerical",
    "symbolic",
    "heuristic",
    "citation",
    "formal",
  ];
  // THE FALSIFIER HAD THE DEFECT IT WAS WRITTEN TO CATCH, AND THAT IS RECORDED RATHER THAN QUIETLY
  // CORRECTED. Its first form flagged any evidence-token spelling anywhere in the file and found
  // eight sites. Three were not evidence-type lists at all:
  //
  //     standards.mjs  !e.fields.has("formal")                        the LEDGER FIELD named formal
  //     standards.mjs  REGIMES = new Set([… "computational", "formal" …])   APPLICABILITY REGIMES
  //
  // Three vocabularies, one spelling. Recognising a token without the context that says which
  // vocabulary it belongs to is §0c — the defect this milestone exists to repair — committed by the
  // test written to prove §0d. So the scan now requires the literal to sit where evidence data is
  // being interrogated, which is the same qualification `requiresQuantity` makes for `about`.
  //
  // Five sites were genuine and all five are migrated. The eight-versus-five correction is in the
  // design record; a falsifier that over-reports is as much a defect as one that under-reports,
  // and this one over-reported by 60%.
  const INTERROGATES_EVIDENCE = /\.type\b|\btypes\b|\bevidence\b/;
  const offenders = [];
  const lines = detectorSource.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // a comment naming a type is mention, not use
    if (!INTERROGATES_EVIDENCE.test(line)) continue;
    for (const token of EVIDENCE_TOKENS) {
      if (line.includes(`"${token}"`)) offenders.push(`standards.mjs:${i + 1} ${token}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "an evidence type's meaning belongs to the vocabulary that declares it. Every site here is a " +
      "second opinion about what a type is worth, and a second opinion is what §0d is",
  );
});

// ---------------------------------------------------------------------------
// A1 · relevance.
//
// C5 is the falsifier: the axis is unrepresentable today. Both frozen adopters recorded it in prose
// and said so explicitly, RH additionally listing it among the things it maintains that "have no
// field here".
//
// C6 is a guard, green at the baseline for an uninteresting reason. See the header.
// ---------------------------------------------------------------------------

test("C5 · a declared relevance is carried into the result", () => {
  const { envelope } = validate("relevance-declared");
  assert.ok(envelope, "the fixture must reach a verdict, or nothing below is under test");

  const claims = envelope.claims ?? null;
  assert.ok(
    claims,
    "nothing in the envelope carries the ledger's claims, so a relevance recorded in the ledger " +
      "cannot reach a consumer. Both adopters wrote this axis in prose for exactly this reason.",
  );
  assert.equal(claims["CLM-0001"]?.relevance, "target");
  assert.equal(claims["CLM-0002"]?.relevance, "off-target");
});

test("C5 · a relevance outside the declared scale is a finding, and the policy is expressible", () => {
  // Red at 3bc38fa in the sharpest possible way: `mathematics` is additionalProperties:false, so a
  // policy that declares a relevance scale is rejected outright and the run reaches no verdict.
  const { code, envelope } = validate("relevance-off-scale");
  assert.notEqual(
    code,
    2,
    "the policy declaring mathematics.relevanceScale was rejected. The format cannot express the " +
      "axis at all, which is a stronger statement of A1's absence than failing to check it.",
  );
  assert.ok(envelope, "no envelope was produced");
  assert.equal(
    reported(envelope, "claims.relevance-vocabulary", "CLM-0001"),
    true,
    "'category-2' is not in the declared scale. Membership is the whole of the validation: the " +
      "scale is a set, not an order.",
  );
});

test("C6 · relevance changes no status, rank, verdict or score", () => {
  // The pair differs only in its two relevance values. Any divergence is the axis feeding the
  // ladder, which is precisely what both adopters refused to do by hand.
  const a = validate("relevance-declared");
  const b = validate("relevance-shifted");
  assert.ok(a.envelope && b.envelope, "both fixtures must reach a verdict");

  assert.equal(a.envelope.status, b.envelope.status, "the verdict moved with relevance alone");
  assert.equal(a.envelope.score, b.envelope.score, "the score moved with relevance alone");

  const shape = (env) =>
    env.results.map((r) => `${r.ruleId}:${r.status}:${r.disposition}`).sort();
  assert.deepEqual(shape(a.envelope), shape(b.envelope), "a per-rule outcome moved with relevance alone");

  // STRENGTHENED BY ITS OWN MUTATION TEST, AND THIS IS WHY. The per-rule shape above compares a
  // multiset of outcomes, and the pair is symmetric: A declares CLM-0001 target and CLM-0002
  // off-target, B is the mirror. So a coupling that penalised off-target claims would penalise
  // exactly one claim in each run and produce the same multiset — invisible here, and the mutation
  // that should have failed this test passed it.
  //
  // Which claim is named is the part that moves. Comparing the findings themselves catches it, and
  // the fixtures are identical apart from the two relevance values, so there is nothing else the
  // comparison could legitimately be reporting.
  const claimsNamed = (env) =>
    (env.findings ?? [])
      .flatMap((f) => (f.evidence ?? []).map((e) => `${f.rule} ${e.replace(/^.*?(CLM-\d{4})/, "$1")}`))
      .sort();
  assert.deepEqual(
    claimsNamed(a.envelope),
    claimsNamed(b.envelope),
    "the same rules fired, but about different claims, which is relevance reaching a per-claim outcome",
  );
});

test("C6 · the ranking cannot read relevance", () => {
  // Behaviour is not enough here. C6 above passes for as long as nobody has written the coupling,
  // and the change that makes relevance readable is exactly when someone would.
  const claimsSource = readFileSync(path.join(HOME, "scripts/claims.mjs"), "utf8");
  const rankingRegion = claimsSource.slice(
    claimsSource.indexOf("export const STATUS_RANK"),
    claimsSource.indexOf("export function parseLedger"),
  );
  assert.ok(rankingRegion.length > 200, "the ranking region could not be located; the guard is vacuous");
  assert.equal(
    /relevance/i.test(rankingRegion),
    false,
    "the epistemic ordering, the proved-rank test and support propagation must not mention " +
      "relevance. An axis that feeds the ladder is worse than no second axis.",
  );
});
