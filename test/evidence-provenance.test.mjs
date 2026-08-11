/**
 * Tier 2 · §0 + §0e + §0h + §0m — a result must say what it inspected, and whose property that is.
 *
 * Design: design/v1.2-evidence-provenance.md. Written before the implementation, so what they defeat
 * is fixed in advance and cannot be adjusted to whatever the implementation turns out to do.
 *
 * The milestone claim:
 *
 *     Every result must be able to say what evidence surface it inspected, and whose repository
 *     that evidence belongs to.
 *
 * Each test records what it does at 03f44d6 (the Tier 1 endpoint, this branch's base) and WHY, so a
 * test that goes green for an unrelated reason is visible as one. Two of the fixtures deliberately
 * carry a `###` heading in problem.md purely so the rule under test passes at the base — a fixture
 * where the rule already fails would make its test green without the property ever holding.
 *
 * Every assertion names a rule id and a status. Aggregate counts appear only alongside a named
 * assertion, never instead of one — design/testing-principles.md §4, earned by a Tier 1 test that
 * counted blockers and had been passing against a run that never reached a verdict.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { HOME, run } from "./helpers/cli.mjs";
import { EVALUATED_RULES } from "../scripts/evaluated.mjs";
import { RULE_SURFACES, SURFACES, SUBJECT, assertSurfacesKnown } from "../scripts/surfaces.mjs";

const fixture = (name) => path.join(HOME, "test/fixtures", name);

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

function resultFor(envelope, ruleId) {
  assert.ok(envelope, "no envelope was produced");
  const r = envelope.results.find((x) => x.ruleId === ruleId);
  assert.ok(r, `${ruleId} is absent from the results; it must be reported, not dropped`);
  return r;
}

/** A rule's inspection record, with the failure message the absence of one deserves. */
function inspectedFor(envelope, ruleId) {
  const r = resultFor(envelope, ruleId);
  assert.ok(
    r.inspected,
    `${ruleId} is ${r.status}/${r.disposition} and carries no 'inspected' record. ` +
      `A result that cannot say what it read cannot be audited for whether it read the right thing.`,
  );
  return r.inspected;
}

// ---------------------------------------------------------------------------
// Contracts on the declaration itself. Two registers describing the same 53 detectors drift the
// moment one is edited alone, and the drift is silent in the direction that matters: a rule in
// EVALUATED_RULES but not RULE_SURFACES gets `no-detector` and keeps passing, which is the §0
// defect surviving inside its own fix.
// ---------------------------------------------------------------------------

test("contract · the surface table and the evaluated list describe the same rules", () => {
  const surfaced = [...RULE_SURFACES.keys()].sort();
  const evaluated = [...EVALUATED_RULES].sort();

  assert.deepEqual(
    surfaced.filter((id) => !evaluated.includes(id)),
    [],
    "declared a surface for a rule no detector evaluates",
  );
  assert.deepEqual(
    evaluated.filter((id) => !surfaced.includes(id)),
    [],
    "a detector exists and nothing declares what it reads, so the rule reports no-detector and passes",
  );
});

test("contract · every declared surface and subject is in the closed vocabulary", () => {
  assert.doesNotThrow(assertSurfacesKnown);

  // Non-vacuity: the guard is only worth anything if the vocabulary is actually exercised. Both
  // non-project subjects must be in use, or the §0h distinction exists only on paper.
  const subjects = new Set([...RULE_SURFACES.values()].map((d) => d.subject));
  assert.ok(subjects.has(SUBJECT.framework), "no rule declares the framework as its subject");
  assert.ok(subjects.has(SUBJECT.run), "no rule declares the run as its subject");

  const used = new Set([...RULE_SURFACES.values()].flatMap((d) => d.surfaces));
  assert.deepEqual(
    [...SURFACES].filter((s) => !used.has(s)),
    [],
    "a surface is in the vocabulary and no rule reads it",
  );
});

test("contract · every result carries the inspected key, including hand-built ones", () => {
  // Tier 1's expensive lesson, applied before it can cost anything twice: `label` was omitted from
  // four hand-built result objects and surfaced only when auditing a real repository showed
  // `label=undefined` on two blockers. An absent key and a key saying "nothing was inspected" are
  // different propositions, and only one of them is auditable.
  const { envelope } = validate("attested-no-digest");
  const missing = envelope.results.filter((r) => !("inspected" in r));
  assert.deepEqual(missing.map((r) => `${r.ruleId} (${r.disposition})`), []);

  // Named, not counted: the attested path is the one that skips `base()` entirely.
  const attested = envelope.results.find((r) => r.disposition === "attested");
  assert.ok(attested, "the fixture's attestation must be honoured for this to test the hand-built path");
  assert.ok("inspected" in attested);
});

// ---------------------------------------------------------------------------
// C1 · a PASS names the project evidence it inspected.
//
// At 03f44d6: every `passed / evaluated` result in both frozen adopters carries `evidence: []` —
// 48 of 48 in RiemannHypothesis, 51 of 51 in PvsNP. The only passes naming anything are the ones
// where a human wrote the paths into reviewedAgainst.paths by hand.
//
// Defeats: a fix that populates `inspected` on failures only. A finding already names its evidence;
// the pass is where the framework has been silent, and the pass is the assurance claim.
// ---------------------------------------------------------------------------

test("C1 · a rule that passes over real evidence names the surface it read", () => {
  const { envelope } = validate("math-compliant");
  const inspected = inspectedFor(envelope, "claims.status-vocabulary");

  assert.equal(inspected.state, "inspected", "the fixture has a real ledger; the rule read it");
  assert.equal(inspected.subject, "project", "this is a statement about the adopter");

  const paths = inspected.surfaces.flatMap((s) => s.paths);
  assert.ok(
    paths.includes("artifacts/claims-ledger.md"),
    `claims.status-vocabulary passed and named ${JSON.stringify(paths)}. ` +
      `It reads the claims ledger; the ledger must appear in what it says it read.`,
  );
});

test("C1 · no passing result anywhere claims to have inspected nothing", () => {
  const { envelope } = validate("math-compliant");
  const passes = envelope.results.filter((r) => r.status === "passed" && r.disposition === "evaluated");

  // The count is here to prove the filter is not empty — the assertion below is the claim.
  assert.ok(passes.length > 0, "the honest fixture must produce passes for this test to mean anything");

  const silent = passes.filter((r) => !r.inspected || r.inspected.state !== "inspected");
  assert.deepEqual(
    silent.map((r) => r.ruleId),
    [],
    "these rules are reported as passing while unable to say what they examined",
  );
});

test("C1 · a rule with no subject is not-evaluated, and is not a failure either", () => {
  const { envelope } = validate("no-subject");

  // The fixture is a project that has adopted the standards and not yet written a ledger. At
  // 03f44d6 it scores 97 with 52 passes, most of them over a ledger that does not exist.
  for (const ruleId of ["claims.status-vocabulary", "claims.silent-promotion", "claims.history-complete"]) {
    const r = resultFor(envelope, ruleId);
    assert.equal(
      r.status,
      "skipped",
      `${ruleId} is ${r.status}: there is no claims ledger in this project, so nothing evaluated it`,
    );
    assert.equal(
      r.disposition,
      "not-evaluated",
      `${ruleId} must be not-evaluated. §0 is explicit that an absent prerequisite is not a failure — ` +
        `a project legitimately without a ledger yet must not get a red build for every claim rule`,
    );
    assert.equal(inspectedFor(envelope, ruleId).state, "no-subject");
  }
});

test("C1 · no-subject is distinguishable from no-detector", () => {
  const { envelope } = validate("no-subject");

  // Both are `skipped / not-evaluated`. Reusing the disposition is deliberate — a fourth value would
  // break every consumer switching on it to record something the reason already carries. So the
  // distinction has to be legible somewhere, and this is where.
  const noSubject = inspectedFor(envelope, "claims.status-vocabulary");
  assert.equal(noSubject.state, "no-subject");

  const noDetector = envelope.results.find(
    (r) => r.disposition === "not-evaluated" && r.inspected?.state === "no-detector",
  );
  assert.ok(
    noDetector,
    "every not-evaluated result reports the same state, so 'nothing to read' and 'nothing reads it' " +
      "remain indistinguishable — which is the §0 defect one layer down",
  );
});

// ---------------------------------------------------------------------------
// C2 · a result says whose property it is about, and the two subjects are independent.
//
// Restated from the milestone brief's "wrong-root evidence cannot satisfy an adopter rule". The
// principle holds; its premise does not hold for the rules §0h names. `integrity.provenance-digest`
// and `integrity.rule-lifecycle-honest` are, by their own catalog text, about the standards pack's
// source documents and rule catalog. An adopter owns neither. So the repair is separation, not
// relocation: pointing them at the adopter's root would make every project responsible for
// provenance digests of documents it does not have.
//
// Defeats: a changed path constant, which satisfies neither half of the pair below.
// ---------------------------------------------------------------------------

test("C2 · a framework-integrity result declares the framework as its subject", () => {
  const { envelope } = validate("wrong-root-absent");

  for (const ruleId of ["integrity.provenance-digest", "integrity.rule-lifecycle-honest"]) {
    const inspected = inspectedFor(envelope, ruleId);
    assert.equal(
      inspected.subject,
      "framework",
      `${ruleId} reads the framework's own home and reports a true statement about the framework. ` +
        `Printed identically to a check on this project's evidence, it is a false assurance about ` +
        `this project`,
    );
  }
});

test("C2 · a framework-subject result does not enter the adopter's score", () => {
  const { envelope } = validate("wrong-root-absent");

  const framework = envelope.results.filter((r) => r.inspected?.subject === "framework");
  assert.ok(framework.length > 0, "the fixture must contain framework-subject results");

  assert.equal(
    envelope.denominator.frameworkSubject,
    framework.length,
    "the envelope must state how many results were about the framework, so a consumer reading a " +
      "score can see what it was computed over",
  );
  assert.ok(
    !framework.some((r) => envelope.denominator.scoredRules?.includes(r.ruleId)),
    "a score purporting to describe this project must be computed only from rules about this project",
  );
});

test("C2 · an adopter's own state cannot change a framework-subject result", () => {
  // This fixture carries artifacts/provenance-digests.json with a digest that does not match the
  // file it names — drift, the exact condition the rule catches. It must NOT catch it here. The
  // file is not the one the rule is about, and an adopter must not be able to make the framework
  // fail its own integrity check by writing a file with a familiar name.
  const broken = validate("wrong-root-broken");
  const absent = validate("wrong-root-absent");

  const a = resultFor(broken.envelope, "integrity.provenance-digest");
  const b = resultFor(absent.envelope, "integrity.provenance-digest");

  assert.equal(a.status, "passed", "the framework's own sources are intact; this adopter's file is not evidence about them");
  assert.equal(
    a.status,
    b.status,
    "two adopters with opposite provenance records must produce the same framework-subject result",
  );
  assert.equal(a.inspected?.subject, "framework");
});

// ---------------------------------------------------------------------------
// C3 · an accepted pointer must resolve to, and inspect, its target.
//
// At 03f44d6 both fixtures below are rejected by the policy schema (exit 2, NOT_EVALUATED):
// `mathematics.evidence` does not exist and `additionalProperties` is false throughout. That is the
// honest red for a claim the framework cannot yet express, and it is asserted explicitly so the
// tests cannot go green on a schema change alone.
//
// Defeats: a fix that accepts whatever the adopter declares. Replacing "guess the artifact from its
// path" with "believe the pointer" reproduces §0m with better manners — the rule would then be
// satisfied by the act of naming a file.
// ---------------------------------------------------------------------------

test("C3 · the policy can name the artifact that discharges a rule", () => {
  const { code, envelope, out } = validate("declared-pointer-empty");
  assert.notEqual(
    code,
    2,
    `the policy declaring mathematics.evidence was rejected as invalid: ${out.slice(0, 300)}`,
  );
  assert.ok(envelope, "a declared-evidence policy must load");
  assert.notEqual(envelope.status, "NOT_EVALUATED", "a valid policy must produce a verdict");
});

test("C3 · a declared artifact that does not resolve fails closed", () => {
  const { envelope } = validate("declared-pointer-missing");
  const r = resultFor(envelope, "lifecycle.failed-routes-preserved");

  assert.equal(
    r.status,
    "failed",
    "the policy names docs/FAILED_ATTEMPTS.md and there is no such file. An adopter asserting an " +
      "artifact that is not there is a stronger error than an adopter asserting nothing — the " +
      "silence case is no-subject, this one is a false claim",
  );
  assert.equal(inspectedFor(envelope, "lifecycle.failed-routes-preserved").state, "unresolved-pointer");
});

test("C3 · a declared artifact is read, not merely counted", () => {
  const { envelope } = validate("declared-pointer-empty");
  const r = resultFor(envelope, "lifecycle.failed-routes-preserved");

  // docs/FAILED_ATTEMPTS.md exists here and says "Nothing has been abandoned yet."
  assert.notEqual(
    r.status,
    "passed",
    "the pointer resolves and its target records no abandoned route. A pointer's existence is not " +
      "evidence; the content at the end of it is",
  );

  const inspected = inspectedFor(envelope, "lifecycle.failed-routes-preserved");
  assert.ok(
    inspected.surfaces.flatMap((s) => s.paths).includes("docs/FAILED_ATTEMPTS.md"),
    "the rule must record that it read the declared artifact, not the problem.md heading it used to " +
      "pass on — §0m's whole complaint is a rule satisfied by the framework's thin proxy while blind " +
      "to the project's real one",
  );
});

// ---------------------------------------------------------------------------
// Step 3 · rendering. Strictly observational: these assert what the output SAYS, and none of them
// asserts a status, a score, or a verdict. The substrate is already truthful; the question here is
// whether a person and a program are told the same true thing.
//
// The standing constraint the step-2 measurement produced, which these enforce at the output:
//
//     A surface must identify the semantic subject a detector actually examines, at the
//     granularity of that examination — not merely the file containing it.
// ---------------------------------------------------------------------------

const provenanceText = (name) => run(["validate", `--dir=${fixture(name)}`, "--provenance"]).out;

test("R1 · every evaluated result renders its subject", () => {
  const text = provenanceText("math-compliant");
  const { envelope } = validate("math-compliant");

  const evaluated = envelope.results.filter((r) => r.disposition === "evaluated");
  assert.ok(evaluated.length > 0, "the fixture must produce evaluated results");

  const unlabelled = evaluated.filter((r) => {
    const block = new RegExp(`${r.ruleId.replace(/[.]/g, "\\.")}[\\s\\S]{0,400}?Subject: (project|framework|run)`);
    return !block.test(text);
  });
  assert.deepEqual(
    unlabelled.map((r) => r.ruleId),
    [],
    "these results render without saying whose property they are about",
  );
});

test("R2 · an empty sub-surface is rendered, not omitted", () => {
  // The step-2 discovery, at the output layer: `references: 1, resolvable identifiers: 0` is the
  // whole finding, and a renderer that lists only non-empty surfaces deletes it. Absence is the
  // evidence here — omitting a zero is not a display choice, it is dropping the observation.
  const text = provenanceText("math-compliant");
  const { envelope } = validate("math-compliant");

  const rule = envelope.results.find((r) => r.ruleId === "literature.resolvable-identifiers");
  assert.equal(rule.status, "passed", "the fixture's identifier rule passes; the point is that it says why");

  const zero = rule.inspected.surfaces.find((s) => s.count === 0);
  assert.ok(zero, "the fixture must have an empty sub-surface for this test to mean anything");
  assert.match(
    text,
    new RegExp(`${zero.label}: 0`),
    `the render omits '${zero.label}: 0'. A pass over a surface with nothing in it must show the zero.`,
  );
});

test("R3 · a framework check is visibly marked as one inside an adopter's report", () => {
  // Not behind a flag. A reader of the ordinary report must not take a statement about the standards
  // pack for a statement about their own repository — that is §0h's entire complaint, and hiding the
  // distinction in verbose output leaves it standing for everyone who does not pass the flag.
  const text = run(["validate", `--dir=${fixture("wrong-root-absent")}`]).out;

  assert.match(
    text,
    /integrity\.provenance-digest/,
    "the framework-subject rules must be named in the ordinary report, not silently reclassified",
  );
  assert.match(
    text,
    /about the framework|framework check|not about this project/i,
    "nothing in the default render says these rows are about MathematicsStandards rather than the adopter",
  );
});

test("R4 · human and machine output agree on subject and inspection counts", () => {
  const text = provenanceText("math-compliant");
  const { envelope } = validate("math-compliant");

  // Split on unindented lines rather than matching per rule with a lookahead. A regex ending in
  // `\Z` silently matched nothing for the final block — `\Z` is not JavaScript syntax, so the
  // alternation degenerated to a literal Z and the last rule read as "absent from the render".
  // Worth recording: the first version of this test would have reported a renderer defect that did
  // not exist, which is the same class of error as a detector reporting a phrase match as observed.
  const blocks = new Map();
  let current = null;
  for (const line of text.split("\n")) {
    if (/^\S/.test(line)) {
      current = line.trim();
      blocks.set(current, []);
    } else if (current) {
      blocks.get(current).push(line);
    }
  }

  const disagreements = [];
  for (const r of envelope.results.filter((x) => x.disposition === "evaluated")) {
    const body = blocks.get(r.ruleId)?.join("\n");
    if (body === undefined) {
      disagreements.push(`${r.ruleId} — absent from the human render`);
      continue;
    }
    if (!new RegExp(`Subject: ${r.inspected.subject}`).test(body)) {
      disagreements.push(`${r.ruleId} — JSON says subject ${r.inspected.subject}, the render does not`);
    }
    for (const s of r.inspected.surfaces) {
      if (!new RegExp(`${s.label}: ${s.count}\\b`).test(body)) {
        disagreements.push(`${r.ruleId} — JSON says ${s.label}=${s.count}, the render does not`);
      }
    }
  }
  assert.deepEqual(disagreements, [], "the two output surfaces disagree about what was inspected");
});

test("R4 · the acceptance specimen reads clearly in both surfaces", () => {
  // PvsNP's identifier rule at fixture scale: references present, identifiers zero, PASS unchanged.
  // If a human and a program both come away knowing the zero, step 3 has done its job.
  const { envelope } = validate("math-compliant");
  const rule = envelope.results.find((r) => r.ruleId === "literature.resolvable-identifiers");

  assert.equal(rule.inspected.subject, "project");
  assert.deepEqual(
    rule.inspected.surfaces.map((s) => [s.label, s.count, s.state]),
    [
      ["references", 1, "resolved-nonempty"],
      ["resolvable identifiers", 0, "resolved-empty"],
    ],
    "the machine-readable record must carry the emptiness as an observation, with its resolution state",
  );

  const text = provenanceText("math-compliant");
  assert.match(text, /references: 1/);
  assert.match(text, /resolvable identifiers: 0/);
});

// ---------------------------------------------------------------------------
// C4 · `audit` declares whether a verdict was computed.
//
// The findings-only contract is intentional and stays: the human render already ends with "This is
// evidence, not a verdict." The defect is that the intent is stated only there. `audit --json`
// carries nothing distinguishing "audited, no verdict" from "evaluated, nothing to report", and an
// empty findings array reads as a clean bill of health.
// ---------------------------------------------------------------------------

test("C4 · audit --json says in machine-readable terms that no verdict was computed", () => {
  const { out } = run(["audit", `--dir=${fixture("math-compliant")}`, "--json"]);
  const report = JSON.parse(out);

  assert.equal(report.verdictComputed, false, "audit computes no verdict and must say so");
  assert.equal(report.status, undefined, "audit must not emit a status field a consumer could read as a verdict");
  assert.ok(
    typeof report.note === "string" && /verdict/i.test(report.note),
    "a consumer that ignores the boolean should still meet the words",
  );
});

test("C4 · validate --json says a verdict WAS computed", () => {
  // The declaration is only worth anything if it distinguishes. A field present on one command and
  // absent on the other is read as "this build of the tool does not emit it".
  const { envelope } = validate("math-compliant");
  assert.equal(envelope.verdictComputed, true);
  assert.equal(envelope.status, "COMPLIANT", "the honest fixture's verdict, named rather than counted");
});

// ---------------------------------------------------------------------------
// §0e · the digest exists on one output surface out of three.
//
// Measured against the frozen RH specimen at 03f44d6: 14 of 14 in the human render, 0 under
// `status`, 0 in `--json`. Not "the validator does not report it" — it reports it, on the surface
// the adopter was not reading. See the correction recorded at §0e in design/v1.1-candidates.md.
// ---------------------------------------------------------------------------

test("§0e · an attestation without a recorded digest reports its current one in JSON", () => {
  const { envelope } = validate("attested-no-digest");
  const attested = envelope.results.filter((r) => r.disposition === "attested");

  // Named rather than silently skipped: a conditional assertion that never runs is a test that
  // passes by never being asked, which is the vacuity the standing rule exists to catch.
  assert.deepEqual(
    attested.map((r) => r.ruleId),
    ["evidence.discarded-failures"],
    "the fixture's one attestation must be honoured for this claim to be under test at all",
  );

  for (const r of attested) {
    assert.ok(
      r.attestation.reviewedAgainst?.currentDigest,
      `${r.ruleId} is attested with no digest recorded, so it can never go stale, and the value that ` +
        `would fix that is computed on every run and emitted only in the human render`,
    );
  }
});
