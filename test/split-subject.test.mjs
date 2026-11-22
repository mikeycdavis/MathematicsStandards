/**
 * FE-25 (#56) · split-subject applicability, mechanism tests.
 *
 * MECHANISM EVIDENCE ONLY, NOT CREDITED TO C2. Every fixture used here is a stand-in
 * (`split-subject-standin*`, the negatives) or an unevidenced declarations-only fixture with pinned
 * citations (`split-subject-lean-pinned`). A declaration counts toward C2 only with a real adopter
 * citation at the pinned SHA, a per-rule basis for each portion, named checked statements AND owner
 * review. None of that has happened, so nothing in this file satisfies C2, and C2 stays open.
 * The reworded T19 is a separate owner-reviewed change and is not implemented here.
 *
 * NOT IMPLEMENTED, blocked by #55/#57 (signature design): T8b, the signature part of T10, and the
 * signature part of T16. The engine has no signed-confirmation path, and these tests do not
 * pretend it does.
 *
 * HELD BEHIND THE 3.0 ENVELOPE CHANGE: the 2.0 envelope is unchanged. The last group pins that, so a
 * held field cannot leak into 2.0 by accident.
 *
 * Negative tests assert the SPECIFIC finding id or schema message, never only an exit code.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import { evaluate, ENVELOPE_SCHEMA_VERSION } from "../scripts/compliance.mjs";
import { validateApplicability, ApplicabilityError, referenceState } from "../scripts/applicability.mjs";
import { hasReference } from "../scripts/attempts.mjs";
import { parseYaml } from "../scripts/yaml.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const catalog = await loadCatalog(path.join(HOME, "rules"));
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const policyOf = (name) => parseYaml(readFileSync(path.join(fixture(name), "project-policy.yml"), "utf8"));
const clone = (v) => JSON.parse(JSON.stringify(v));
const LABEL = /MECHANISM EVIDENCE ONLY, NOT CREDITED TO C2/;
const SHA = "a2789dfe75f0c342c3a1001f4ec334aec34bb3dd";

function verdictFor(policy, files) {
  return evaluate({ catalog, policy, findings: [], evaluated: [], inspections: new Map(), today: "2026-11-22", digests: new Map(), files });
}
const resultOf = (verdict, id) => verdict.results.find((r) => r.ruleId === id);
const splitOf = (verdict, id) => verdict.splitSubject.find((s) => s.ruleId === id);

const EDGE = "proof.edge-cases-addressed";
const INDUCTION = "proof.induction-gaps";

// ---------------------------------------------------------------------------
// Labelling: stand-ins and unevidenced declarations say so in the fixture header.
// ---------------------------------------------------------------------------
test("every split-subject and attestation-binding fixture header says mechanism evidence only, not credited to C2", () => {
  const names = [
    "split-subject-standin", "split-subject-standin-attested", "split-subject-lean-pinned",
    "split-subject-invalid-empty-applies-to", "split-subject-invalid-empty-impossible", "split-subject-invalid-missing-declared",
    "split-subject-invalid-missing-subject", "split-subject-invalid-missing-statement", "split-subject-invalid-basis-string",
    "split-subject-invalid-malformed-reference", "split-subject-invalid-overlap", "split-subject-invalid-unknown-subject",
    "split-subject-unclassified-portion", "split-subject-invalid-unclear", "split-subject-invalid-profile-key",
    "split-subject-invalid-unpinned-later-citation", "split-subject-invalid-status-and-mode", "split-subject-invalid-no-revisit", "split-subject-invalid-detector-rule",
    "attestation-portions-missing", "attestation-portion-impossible", "attestation-portions-on-unsplit", "attestation-partial-portions",
  ];
  for (const name of names) {
    const text = readFileSync(path.join(fixture(name), "project-policy.yml"), "utf8");
    assert.match(text.split("\n").slice(0, 3).join("\n"), LABEL, `${name} header`);
  }
});

// ---------------------------------------------------------------------------
// Reference form: does the pinned `path@<40-hex>:lines` token pass hasReference?
// ---------------------------------------------------------------------------
test("hasReference accepts a pinned path@sha:lines token when the path has a slash, and rejects prose", () => {
  assert.equal(hasReference(`PvsNP/TM/Rewind.lean@${SHA}:116-217`), true);
  assert.equal(hasReference(`docs/NEXT_STEPS.md@${SHA}:71-72`), true);
  assert.equal(hasReference("see the notes"), false);
  // hasReference is deliberately unchanged (other callers rely on it): a slash-less pinned token is
  // still not a reference to IT. Split declarations accept it through a local pinned-citation
  // recognizer in applicability.mjs (next tests), so the exact repository-relative path is enough.
  assert.equal(hasReference(`README.md@${SHA}:33`), false);
});

test("a slash-less pinned citation (README.md@<sha>:33) is accepted in a split declaration, in either role; every negative still fails", () => {
  const base = policyOf("split-subject-standin");
  const withRef = (key, ref) => {
    const p = clone(base);
    p.applicability[EDGE][key][0].basis.reference = ref;
    return validateApplicability(p, catalog);
  };
  // No directory is required by the citation form, for appliesTo or structurallyImpossibleFor.
  for (const key of ["appliesTo", "structurallyImpossibleFor"]) {
    assert.deepEqual(withRef(key, `README.md@${SHA}:33`), [], key);
    assert.deepEqual(withRef(key, `README.md@${SHA}`), [], key);
    assert.deepEqual(withRef(key, `README.md@${SHA}:33-40 docs/B.md@${SHA}:3`), [], key);
    const state = referenceState(`README.md@${SHA}:33`, new Set());
    assert.deepEqual(state, { state: "reference-unresolved", pinned: true });
    // Negatives, slash-less and slashed alike.
    for (const bad of [
      `README.md@${SHA.slice(0, 7)}:33`, // short sha
      `README.md@${SHA.toUpperCase()}:33`, // uppercase sha
      `README.md@${SHA}#L5`, // #L5 form
      `README.md@${SHA}:3-`,
      "see the notes",
    ]) {
      assert.ok(withRef(key, bad).some((e) => e.id === "applicability.reference-malformed"), `${key}: ${bad}`);
    }
    // An unpinned later citation beside a pinned slash-less one is still refused.
    assert.ok(withRef(key, `README.md@${SHA}:33 docs/B.md`).some((e) => /unpinned among pinned/.test(e.message)));
    assert.ok(withRef(key, `README.md@${SHA}:33 NOTES.md`).some((e) => /unpinned among pinned/.test(e.message)));
  }
});

test("the citation form does not itself require a directory: the portion boundary is the subject id, not a path (no directory-boundary field exists in the 2.0 declaration)", () => {
  const schema = JSON.parse(readFileSync(path.join(HOME, "schemas/project-policy.schema.json"), "utf8"));
  const props = Object.keys(schema.$defs.applicabilityDeclaration.properties);
  assert.equal(props.some((k) => /path|dir|scope/i.test(k)), false, "no path or directory field defines a portion boundary");
});

test("KNOWN LIMITATION, pinned as is: scheme-less domains and numbered prose with a slash are path-like, so beside a pin they are refused as unpinned; a scheme URL or the statement field is the workaround", () => {
  const base = policyOf("split-subject-standin");
  const pin = `docs/A.md@${SHA}:1`;
  const withRef = (ref) => {
    const p = clone(base);
    p.applicability[EDGE].appliesTo[0].basis.reference = ref;
    return validateApplicability(p, catalog);
  };
  // Not fixed: excluding a first segment that looks like a domain would let a genuine unpinned
  // repository path in a directory of that name (for example docs.com/x.md) pass the unpinned check.
  for (const ref of ["www.example.com/x", "example.com/x", "github.com/o/r/blob/main/x.md", "Lemma 2.1/Thm 3"]) {
    assert.ok(withRef(`${pin} ${ref}`).some((e) => /unpinned among pinned/.test(e.message)), ref);
  }
  assert.deepEqual(withRef(`${pin} https://www.example.com/x`), []);
});

// ---------------------------------------------------------------------------
// T1, T8, T11: the stand-in reports an evaluated portion, never not-applicable (mechanism only)
// ---------------------------------------------------------------------------
test("T1/T8: stand-in S1 is evaluated on prose-record only, is not not-applicable, and the invariant rule is kept", () => {
  const verdict = verdictFor(policyOf("split-subject-standin"), new Set(["BARRIERS.md", "formal/Main.lean"]));
  for (const id of [EDGE, INDUCTION]) {
    const r = resultOf(verdict, id);
    assert.notEqual(r.disposition, "not-applicable", id);
    assert.equal(r.status, "skipped", `${id} awaits judgement`);
    assert.equal(r.disposition, "not-evaluated");
    const s = splitOf(verdict, id);
    assert.equal(s.covered, true);
    assert.equal(s.scope, "evaluated-portion-only");
    assert.deepEqual(s.evaluated.map((e) => e.subject), ["prose-record"]);
    assert.deepEqual(s.structurallyImpossible.map((e) => e.subject), ["formal-development"]);
  }
  // T4: a statement-only basis is accepted; a repository path that resolves is `resolved`.
  assert.equal(splitOf(verdict, INDUCTION).evaluated[0].referenceState, "none");
  assert.equal(splitOf(verdict, EDGE).evaluated[0].referenceState, "resolved");
  // T8: split on an invariant rule keeps it in the result set.
  assert.equal(resultOf(verdict, INDUCTION).invariant, true);
});

test("T4: an unresolved repository path is reported as reference-unresolved, not an error", () => {
  const verdict = verdictFor(policyOf("split-subject-standin"), new Set());
  assert.equal(splitOf(verdict, EDGE).evaluated[0].referenceState, "reference-unresolved");
  assert.equal(run(["validate", `--dir=${fixture("split-subject-standin")}`]).code, 1); // other rules fail; not exit 2
});

test("T11: the human report and `explain` state the evaluated and structurally impossible portions and the scope", () => {
  const { out } = run(["validate", `--dir=${fixture("split-subject-standin")}`]);
  assert.match(out, /Split subject \(2\):/);
  assert.match(out, /proof\.edge-cases-addressed NOT EVALUATED, awaiting judgement \(scored on: prose-record only; structurally impossible: formal-development\)/);
  const explain = run(["explain", INDUCTION, `--dir=${fixture("split-subject-standin")}`]).out;
  assert.match(explain, /In this project: split-subject/);
  assert.match(explain, /scope: evaluated-portion-only/);
  assert.match(explain, /prose-record — An induction sketched in prose/);
  assert.match(explain, /formal-development — A Lean induction cannot omit its base case/);
  assert.match(explain, /coverage: complete/);
});

test("an unclassified split states that it remains unclassified and why the generic no-detector token is shown (human report and explain)", () => {
  const dir = fixture("split-subject-unclassified-portion");
  const { out } = run(["validate", `--dir=${dir}`]);
  assert.match(out, /the split remains unclassified: external-notes is declared in declaredSubject but in neither appliesTo nor structurallyImpossibleFor/);
  assert.match(out, /the JSON shows the generic 'no-detector' token \(envelope 2\.0 has no precise token\); it does not mean a detector is missing/);
  const explain = run(["explain", EDGE, `--dir=${dir}`]).out;
  assert.match(explain, /coverage: INCOMPLETE, unclassified: external-notes/);
  assert.match(explain, /the split remains unclassified: external-notes has no classification/);
  assert.match(explain, /skipped \/ not-evaluated \/ 'no-detector', the generic 2\.0 token .* does not mean a detector is missing/);
  // A fully classified split does not carry the sentence.
  const ok = run(["explain", INDUCTION, `--dir=${fixture("split-subject-standin")}`]).out;
  assert.doesNotMatch(ok, /remains unclassified/);
  assert.doesNotMatch(run(["validate", `--dir=${fixture("split-subject-standin")}`]).out, /remains unclassified/);
});

test("S2: a rejection bound to prose-record fails the rule and the report says what it was scored on", () => {
  const policy = policyOf("split-subject-standin-attested");
  const verdict = verdictFor(policy, new Set(["BARRIERS.md", "formal/Main.lean"]));
  assert.equal(resultOf(verdict, EDGE).disposition, "attested-rejected");
  assert.equal(resultOf(verdict, EDGE).status, "failed");
  assert.deepEqual(splitOf(verdict, EDGE).attestedPortions, ["prose-record"]);
  const { out } = run(["validate", `--dir=${fixture("split-subject-standin-attested")}`]);
  assert.match(out, /proof\.edge-cases-addressed FAIL \(scored on: prose-record only; structurally impossible: formal-development\)/);
});

// ---------------------------------------------------------------------------
// T2, T3, T5, T6, T9, T12, T13: invalid declarations are rejected with the specific message
// ---------------------------------------------------------------------------
const NEGATIVES = [
  ["split-subject-invalid-empty-applies-to", /appliesTo:? must contain at least 1 item\(s\)/],
  ["split-subject-invalid-empty-impossible", /structurallyImpossibleFor:? must contain at least 1 item\(s\)/],
  ["split-subject-invalid-missing-subject", /appliesTo\[0\]\.subject:? is required but missing/],
  ["split-subject-invalid-missing-statement", /basis\.statement:? is required but missing/],
  ["split-subject-invalid-basis-string", /basis:? expected object, found string/],
  ["split-subject-invalid-unclear", /mode:? must be one of 'split-subject'/],
  ["split-subject-invalid-profile-key", /unknown property 'profile'/],
  ["split-subject-invalid-missing-declared", /applicability\.split-incomplete/],
  ["split-subject-invalid-malformed-reference", /applicability\.reference-malformed/],
  ["split-subject-invalid-unpinned-later-citation", /applicability\.reference-malformed.*'docs\/B\.md' is unpinned among pinned citations/],
  ["split-subject-invalid-overlap", /applicability\.split-overlap/],
  ["split-subject-invalid-unknown-subject", /applicability\.unknown-subject/],
  ["split-subject-invalid-status-and-mode", /applicability\.status-and-mode/],
  ["split-subject-invalid-no-revisit", /applicability\.split-missing-revisit/],
  ["split-subject-invalid-detector-rule", /applicability\.split-on-detectable-rule/],
  ["attestation-portions-missing", /attestation\.portions-required/],
  ["attestation-portion-impossible", /attestation\.portion-not-evaluated/],
  ["attestation-portions-on-unsplit", /attestation\.portions-on-unsplit-rule/],
  ["applicability-empty-entry", /applicability\.neither/],
  ["applicability-status-without-reason", /applicability\.missing-reason/],
];

test("T2/T3/T5/T6/T9/T12/T13/T18: each invalid declaration exits 2 with its specific message, in validate (T14; policy.mjs is covered next; audit is evidence discovery and does not read the policy)", () => {
  for (const [name, message] of NEGATIVES) {
    const dir = fixture(name);
    const v = run(["validate", `--dir=${dir}`]);
    assert.equal(v.code, 2, `validate ${name}`);
    assert.match(v.out, message, `validate ${name}`);
  }
});

test("T14: `scripts/policy.mjs` exits 2 with the same message for every negative", async () => {
  const { execFileSync } = await import("node:child_process");
  for (const [name, message] of NEGATIVES) {
    let code = 0;
    let out = "";
    try {
      out = execFileSync(process.execPath, [path.join(HOME, "scripts/policy.mjs"), path.join(fixture(name), "project-policy.yml")], { encoding: "utf8" });
    } catch (error) {
      code = error.status;
      out = `${error.stdout}${error.stderr}`;
    }
    assert.equal(code, 2, name);
    assert.match(out, message, name);
  }
});

test("positive twins: the valid fixtures pass the semantic layer", () => {
  for (const name of ["split-subject-standin", "split-subject-standin-attested", "split-subject-lean-pinned", "split-subject-unclassified-portion", "attestation-partial-portions"]) {
    assert.deepEqual(validateApplicability(policyOf(name), catalog), [], name);
  }
});

test("every citation in a multi-citation reference is checked, and duplicates are refused with the existing id", () => {
  const base = policyOf("split-subject-standin");
  const sha = SHA;
  const withRef = (ref) => {
    const p = clone(base);
    p.applicability[EDGE].appliesTo[0].basis.reference = ref;
    return validateApplicability(p, catalog);
  };
  assert.deepEqual(withRef(`docs/A.md@${sha}:1-2 docs/B.md@${sha}:3`), []);
  const messages = (ref) => withRef(ref).map((e) => `${e.id}: ${e.message}`);
  assert.ok(messages(`docs/A.md@${sha}:1-2 docs/B.md@abc:3`).some((m) => /docs\/B\.md@abc:3' is not a valid pinned citation/.test(m)));
  assert.ok(messages(`docs/A.md@${sha}:1-2 docs/B.md`).some((m) => /unpinned among pinned/.test(m)));
  // path@sha#L5 is intentionally not a valid pin.
  assert.ok(messages(`docs/A.md@${sha}#L5`).some((m) => /not a valid pinned citation/.test(m)));
  // Realistic surrounding prose, URLs and emails beside a pin are accepted, not malformed.
  const pin = `docs/A.md@${sha}:1-2`;
  for (const ref of [
    `${pin} (contact bob@example.com)`,
    `${pin} see https://example.org/spec.md`,
    `https://github.com/o/r/blob/${sha}/x.md and ${pin}`,
    `${pin}, section 3.2`,
    `${pin} e.g. the lemma`,
    `${pin} i.e. the base case, v1.2 of the notes`,
    `${pin} / ${pin}`,
  ]) {
    assert.deepEqual(withRef(ref), [], ref);
    const files = new Set();
    const state = referenceState(ref, files);
    assert.equal(state.state, "reference-unresolved", ref);
    assert.equal(state.pinned, true, ref);
  }
  // A URL beside a pin does not mask it, and a URL alone is not a path.
  assert.equal(referenceState(`see https://example.org/spec.md ${pin}`, new Set()).pinned, true);
  assert.equal(referenceState("https://example.org/spec.md", new Set()).state, "not-a-path");
  const dup = clone(base);
  dup.applicability[EDGE].declaredSubject.push("prose-record");
  assert.equal(validateApplicability(dup, catalog)[0].id, "applicability.split-duplicate");
  const dupPortions = clone(base);
  dupPortions.attestations = { [EDGE]: ATTEST("approved", ["prose-record", "prose-record"]) };
  assert.equal(validateApplicability(dupPortions, catalog)[0].id, "applicability.split-duplicate");
});

test("the detector-rule fixture really is a rule the catalog does not evaluate by manual review", () => {
  assert.notEqual(catalog.rules.get("claims.ledger-exists").validationType, "manual-review");
});

test("the engine fails closed on an invalid split declaration instead of evaluating it", () => {
  const bad = clone(policyOf("split-subject-standin"));
  bad.applicability[EDGE].structurallyImpossibleFor.push({ subject: "prose-record", basis: { statement: "x" } });
  assert.throws(() => verdictFor(bad), ApplicabilityError);
});

test("T17: the key set of applicabilityDeclaration.properties is exactly the approved set (no profile or bundle)", () => {
  const schema = JSON.parse(readFileSync(path.join(HOME, "schemas/project-policy.schema.json"), "utf8"));
  assert.deepEqual(
    Object.keys(schema.$defs.applicabilityDeclaration.properties).sort(),
    ["appliesTo", "declaredSubject", "mode", "reason", "reviewedAt", "revisitWhen", "status", "structurallyImpossibleFor"],
  );
  assert.equal(schema.$defs.applicabilityDeclaration.additionalProperties, false);
});

// ---------------------------------------------------------------------------
// T7: an unclassified portion
// ---------------------------------------------------------------------------
const ATTEST = (status, portions) => ({
  status,
  reviewedBy: "Example Reviewer",
  reviewedAt: "2026-11-16",
  evidence: "Read the stand-in.",
  reviewedAgainst: { paths: ["BARRIERS.md"], portions },
});

test("T7: an unclassified portion is not evaluated, not passed, not not-applicable, and an approval cannot override it", () => {
  const base = policyOf("split-subject-unclassified-portion");
  const verdict = verdictFor(base);
  const r = resultOf(verdict, EDGE);
  assert.equal(r.status, "skipped");
  assert.notEqual(r.disposition, "not-applicable");
  assert.notEqual(r.status, "passed");
  const s = splitOf(verdict, EDGE);
  assert.equal(s.covered, false);
  assert.deepEqual(s.unclassified, ["external-notes"]);
  assert.equal(s.notEvaluatedBecause, "unclassified-subject");

  const approved = clone(base);
  approved.attestations = { [EDGE]: ATTEST("approved", ["prose-record"]) };
  const a = verdictFor(approved);
  assert.equal(resultOf(a, EDGE).status, "skipped");
  assert.notEqual(resultOf(a, EDGE).disposition, "attested");
  assert.equal(splitOf(a, EDGE).notEvaluatedBecause, "unclassified-subject");

  const rejected = clone(base);
  rejected.attestations = { [EDGE]: ATTEST("rejected", ["prose-record"]) };
  const j = verdictFor(rejected);
  assert.equal(resultOf(j, EDGE).status, "failed");
  assert.equal(resultOf(j, EDGE).disposition, "attested-rejected");
  assert.equal(splitOf(j, EDGE).covered, false); // both facts are visible
  assert.deepEqual(splitOf(j, EDGE).unclassified, ["external-notes"]);
  const { out } = run(["validate", `--dir=${fixture("split-subject-unclassified-portion")}`]);
  assert.match(out, /proof\.edge-cases-addressed NOT EVALUATED, unclassified: external-notes/);
});

// ---------------------------------------------------------------------------
// T10 (non-signature parts): attestation-to-portion binding
// ---------------------------------------------------------------------------
test("T10: portions equal to appliesTo are judged as today and a pass covers exactly them", () => {
  const policy = clone(policyOf("split-subject-standin"));
  policy.attestations = { [EDGE]: ATTEST("approved", ["prose-record"]) };
  const verdict = verdictFor(policy);
  assert.equal(resultOf(verdict, EDGE).disposition, "attested");
  assert.equal(resultOf(verdict, EDGE).status, "passed");
  assert.deepEqual(splitOf(verdict, EDGE).attestedPortions, ["prose-record"]);
  assert.deepEqual(splitOf(verdict, EDGE).unattestedPortions, []);
});

test("T10: a proper subset approval is portion-unattested and does not discharge; a rejection on it still fails", () => {
  const base = policyOf("attestation-partial-portions");
  const verdict = verdictFor(base);
  assert.equal(resultOf(verdict, EDGE).status, "skipped");
  assert.notEqual(resultOf(verdict, EDGE).disposition, "attested");
  assert.equal(splitOf(verdict, EDGE).notEvaluatedBecause, "portion-unattested");
  assert.deepEqual(splitOf(verdict, EDGE).unattestedPortions, ["design-notes"]);

  const rejected = clone(base);
  rejected.attestations[EDGE].status = "rejected";
  const j = verdictFor(rejected);
  assert.equal(resultOf(j, EDGE).status, "failed");
  assert.equal(resultOf(j, EDGE).disposition, "attested-rejected");
  assert.deepEqual(splitOf(j, EDGE).unattestedPortions, ["design-notes"]);
});

// ---------------------------------------------------------------------------
// Lean pinned fixture: declarations-only, unevidenced. MECHANISM EVIDENCE ONLY, NOT CREDITED TO C2.
// ---------------------------------------------------------------------------
const CASES = [
  ["proof.edge-cases-addressed", "rewind-formal"],
  ["proof.unjustified-triviality", "manifest-listed-formal"],
  ["proof.induction-gaps", "manifest-listed-formal"],
];

test("lean-pinned (mechanism evidence only, not credited to C2): cases 1 to 3 report an evaluated and a structurally impossible portion, none not-applicable", () => {
  const dir = fixture("split-subject-lean-pinned");
  const policy = policyOf("split-subject-lean-pinned");
  const verdict = verdictFor(policy, new Set()); // declarations only: no adopter file is in this repository
  for (const [id, formal] of CASES) {
    const r = resultOf(verdict, id);
    assert.notEqual(r.disposition, "not-applicable", id);
    const s = splitOf(verdict, id);
    assert.equal(s.covered, true, id);
    assert.deepEqual(s.evaluated.map((e) => e.subject), ["prose-record"], id);
    assert.deepEqual(s.structurallyImpossible.map((e) => e.subject), [formal], id);
    assert.match(s.revisitWhen, /\S/);
    // Every citation is a pinned path@40-hex token, reported reference-unresolved (accepted).
    for (const e of [...s.evaluated, ...s.structurallyImpossible]) {
      assert.match(e.reference, new RegExp(`@${SHA}(?::\\d+(?:-\\d+)?)?`), `${id} ${e.subject}`);
      assert.equal(e.referenceState, "reference-unresolved", `${id} ${e.subject}`);
      assert.equal(e.pinned, true);
    }
  }
  // Case 1 uses the owner-ruled portion id and keeps its evidence pending.
  assert.ok(splitOf(verdict, "proof.edge-cases-addressed").structurallyImpossible[0].statement.startsWith("PENDING owner review"));
  assert.equal(run(["validate", `--dir=${dir}`]).out.includes("reference-unresolved"), true);
  assert.match(readFileSync(path.join(dir, "project-policy.yml"), "utf8"), /UNEVIDENCED: mechanism evidence only, not credited to C2/);
});

test("lean-pinned: case 4 rigor.symbolic-validity-conditions is recorded not-evaluated, is not not-applicable, and has no applicability.mode", () => {
  const dir = fixture("split-subject-lean-pinned");
  const policy = policyOf("split-subject-lean-pinned");
  const rule = "rigor.symbolic-validity-conditions";
  assert.equal(policy.applicability[rule], undefined, "case 4 has no applicability entry at all");
  assert.equal(policy.applicability[rule]?.mode, undefined);
  const header = readFileSync(path.join(dir, "project-policy.yml"), "utf8").split("standardVersion")[0];
  assert.match(header, /Case 4, rigor\.symbolic-validity-conditions: NOT-EVALUATED/);
  const verdict = verdictFor(policy, new Set());
  const r = resultOf(verdict, rule);
  assert.notEqual(r.disposition, "not-applicable");
  assert.equal(r.status, "skipped");
  assert.equal(r.disposition, "not-evaluated");
  assert.equal(splitOf(verdict, rule), undefined);
});

// ---------------------------------------------------------------------------
// Compatibility guard: the 2.0 envelope is unchanged. Everything held behind 3.0 stays out.
// ---------------------------------------------------------------------------
test("the 2.0 envelope is unchanged by split-subject: no new keys, no new tokens, version still 2.0", () => {
  assert.equal(ENVELOPE_SCHEMA_VERSION, "2.0");
  const { out } = run(["validate", `--dir=${fixture("split-subject-standin")}`, "--json"]);
  const envelope = JSON.parse(out);
  assert.equal(envelope.schemaVersion, "2.0");
  assert.equal("splitSubject" in envelope.denominator, false);
  assert.equal("unclassifiedSubject" in envelope.denominator, false);
  assert.equal("splitSubject" in envelope, false);
  for (const r of envelope.results) assert.equal("applicability" in r, false, r.ruleId);
  const known = new Set(["no-detector", "no-subject", "unresolved-evidence", "stale-attestation", "expired-attestation", "not-applicable", null]);
  for (const r of envelope.results) assert.ok(known.has(r.notEvaluatedBecause), `${r.ruleId}: ${r.notEvaluatedBecause}`);
  const unclassified = JSON.parse(run(["validate", `--dir=${fixture("split-subject-unclassified-portion")}`, "--json"]).out);
  const r = unclassified.results.find((x) => x.ruleId === EDGE);
  assert.equal(r.status, "skipped");
  assert.equal(r.disposition, "not-evaluated");
  assert.equal(r.notEvaluatedBecause, "no-detector"); // the generic 2.0 token; the precise one is held
  assert.match(r.message, /unclassified portion\(s\) \(external-notes\)/);
});
