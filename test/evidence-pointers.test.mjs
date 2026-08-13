/**
 * Tier 2 step 4 · §0m — a pointer is not evidence; the thing at the end of it is.
 *
 * Design: design/v1.2-evidence-provenance.md §11. Written before the implementation.
 *
 * The rule this file pins:
 *
 *     A detector may accept an evidence pointer only if the framework can resolve that pointer to
 *     the artifact the detector actually intends to inspect.
 *
 * At 04ba60e `scripts/pointers.mjs` does not exist, so every test here fails at import. That is the
 * honest red: the claim is that the framework has no way to follow a declared pointer at all, and a
 * missing module states it more precisely than an assertion could.
 *
 * The measurement that motivates the file. `lifecycle.failed-routes-preserved` matches path SHAPES:
 * `/(^|\/)(abandoned|failed|dead-ends?|attempts?)(\/|$)/i`, which requires a whole path segment to
 * be one of those words. Both frozen adopters keep a real record of abandoned work —
 * RiemannHypothesis at `Research/FAILED_APPROACHES.md`, PvsNP at `docs/FAILED_ATTEMPTS.md` — and
 * NEITHER matches, because neither filename is a bare `failed` or `attempts` segment. The rule
 * passes in both repositories on its other arm: a `###` heading somewhere in a problem.md. So the
 * framework's proxy misses the real artifact in 2 of 2 adopters and reports a pass anyway. §0m is
 * not a hypothetical about this rule; it is its measured behaviour.
 *
 * Every assertion names a pointer status or a rule id and a status — design/testing-principles.md §4.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { HOME, run } from "./helpers/cli.mjs";
import { POINTER, resolveEvidencePointer } from "../scripts/pointers.mjs";

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

const ROUTES = "lifecycle.failed-routes-preserved";

// ---------------------------------------------------------------------------
// P1 · the primitive resolves against the project, and only against the project.
// ---------------------------------------------------------------------------

test("P1 · a project-relative pointer resolves inside the adopter", () => {
  const root = fixture("declared-pointer-empty");
  const answer = resolveEvidencePointer(root, "docs/FAILED_ATTEMPTS.md");

  assert.equal(answer.status, POINTER.resolved);
  assert.equal(answer.pointer, "docs/FAILED_ATTEMPTS.md");
  assert.equal(answer.target, "docs/FAILED_ATTEMPTS.md", "the resolved target is project-relative");
  assert.equal(answer.kind, "file");
  assert.equal(answer.reason, null);
});

test("P1 · a path that exists only in the framework does not resolve", () => {
  // The wrong-root defect as a pointer question. `scripts/surfaces.mjs` is a real file in
  // MathematicsStandards and is absent from every fixture, so a resolver that fell back to the
  // framework home — or to cwd, which is the framework home when the suite runs — would report
  // `resolved` here. It must report `missing`, and it must say against which root.
  const answer = resolveEvidencePointer(fixture("no-subject"), "scripts/surfaces.mjs");

  assert.equal(answer.status, POINTER.missing);
  assert.equal(answer.target, "scripts/surfaces.mjs");
  assert.match(answer.reason, /no-subject/, "the reason must name the root that was searched");
});

test("P1 · resolution refuses to run without an explicit project root", () => {
  // Not a defensive nicety. Every wrong-root defect this milestone found is a check that resolved
  // something against whichever root happened to be nearest, and a parameter with a default is how
  // that happens. There is no default.
  for (const root of [undefined, null, "", "docs"]) {
    assert.throws(
      () => resolveEvidencePointer(root, "docs/FAILED_ATTEMPTS.md"),
      /project root/i,
      `resolveEvidencePointer(${JSON.stringify(root)}, …) must throw rather than guess a root`,
    );
  }
});

// ---------------------------------------------------------------------------
// P2 · the three ways a pointer can fail stay distinguishable.
//
// They collapse into one inspection-level `unresolved` state at the rule, deliberately: the verdict
// does not need four new outcomes. But the diagnostic does need to say which one, because the fix
// differs — a missing target is the adopter's, an unsupported form is the framework's.
// ---------------------------------------------------------------------------

test("P2 · missing, unsupported and invalid pointers are distinguishable", () => {
  const root = fixture("declared-pointer-empty");
  const cases = [
    ["docs/NOT_THERE.md", POINTER.missing, /does not exist/i],
    ["https://example.org/notes", POINTER.unsupported, /url/i],
    ["docs/FAILED_ATTEMPTS.md#section", POINTER.unsupported, /fragment/i],
    ["../outside.md", POINTER.invalid, /outside/i],
    ["", POINTER.invalid, /empty/i],
  ];

  for (const [pointer, status, reason] of cases) {
    const answer = resolveEvidencePointer(root, pointer);
    assert.equal(answer.status, status, `${JSON.stringify(pointer)} classified as ${answer.status}`);
    assert.match(answer.reason ?? "", reason, `${JSON.stringify(pointer)} explains itself`);
  }
});

test("P2 · an absolute pointer is invalid rather than resolved", () => {
  // An absolute path resolves to whatever is at it on the machine running the check, which is not a
  // property of the repository being audited. Two runs of the same commit would disagree.
  const root = fixture("declared-pointer-empty");
  const answer = resolveEvidencePointer(root, path.join(root, "docs/FAILED_ATTEMPTS.md"));

  assert.equal(answer.status, POINTER.invalid);
  assert.match(answer.reason, /absolute/i);
});

// ---------------------------------------------------------------------------
// P3 · an unresolved required pointer cannot produce a PASS, and cannot claim a violation.
// ---------------------------------------------------------------------------

test("P3 · a declared artifact that does not resolve cannot pass", () => {
  const { envelope } = validate("declared-pointer-missing");
  const r = resultFor(envelope, ROUTES);

  assert.notEqual(r.status, "passed", "the declared artifact is not there; nothing established the rule");
  assert.equal(r.status, "skipped");
  assert.equal(r.disposition, "not-evaluated");
  assert.equal(
    r.inspected.state,
    "unresolved",
    "the rule's inspection is incomplete, which is neither `inspected` nor `no-subject`",
  );
  assert.deepEqual(r.inspected.unresolved, ["declared-failed-routes"]);
});

test("P3 · an unresolved pointer is not reported as a violation", () => {
  // Absence of evidence access is not evidence of violation. The adopter may be perfectly compliant
  // and have mistyped a path; the framework does not know, and a `failed` here would assert it does.
  const { envelope } = validate("declared-pointer-missing");
  const r = resultFor(envelope, ROUTES);

  assert.notEqual(r.status, "failed");
  assert.equal(envelope.results.filter((x) => x.ruleId === ROUTES && x.status === "failed").length, 0);
});

test("P3 · the reason a rule could not be evaluated reaches the human render", () => {
  const text = run(["validate", `--dir=${fixture("declared-pointer-missing")}`]).out;
  assert.match(text, /lifecycle\.failed-routes-preserved/);
  assert.match(text, /docs\/FAILED_ATTEMPTS\.md/, "the render must name the pointer that did not resolve");
});

test("P3 · a resolved pointer whose target records nothing does not pass", () => {
  // The other side of §0m. `docs/FAILED_ATTEMPTS.md` exists here and says "Nothing has been
  // abandoned yet." Accepting whatever the adopter declares would reproduce the defect with better
  // manners: the rule satisfied by the act of naming a file.
  const { envelope } = validate("declared-pointer-empty");
  const r = resultFor(envelope, ROUTES);

  assert.notEqual(r.status, "passed");
  assert.equal(r.status, "failed", "the pointer resolved, so the framework did look, and found nothing");
  assert.ok(
    r.inspected.surfaces.flatMap((s) => s.paths).includes("docs/FAILED_ATTEMPTS.md"),
    "the rule must record that it read the declared artifact",
  );
});

// ---------------------------------------------------------------------------
// P4 · the acceptance specimen for §0m: one semantic key, two filenames.
// ---------------------------------------------------------------------------

test("P4 · two adopters discharge the same duty through differently named artifacts", () => {
  // The fixtures reproduce the frozen adopters' real shapes: PvsNP keeps
  // `docs/FAILED_ATTEMPTS.md`, RiemannHypothesis keeps `Research/FAILED_APPROACHES.md`. Neither
  // matches the path-shape heuristic, and neither fixture carries the `###` problem.md proxy the
  // heuristic's other arm accepts — so a pass here can only have come from following the pointer.
  for (const name of ["artifact-key-attempts", "artifact-key-approaches"]) {
    const { envelope } = validate(name);
    const r = resultFor(envelope, ROUTES);
    assert.equal(r.status, "passed", `${name}: ${r.message}`);
    assert.equal(r.inspected.state, "inspected");
  }

  const attempts = validate("artifact-key-attempts").envelope;
  const approaches = validate("artifact-key-approaches").envelope;
  assert.ok(
    resultFor(attempts, ROUTES).inspected.surfaces.flatMap((s) => s.paths).includes("docs/FAILED_ATTEMPTS.md"),
  );
  assert.ok(
    resultFor(approaches, ROUTES)
      .inspected.surfaces.flatMap((s) => s.paths)
      .includes("Research/FAILED_APPROACHES.md"),
  );
});

test("P4 · the heuristic still carries an adopter that declares nothing", () => {
  // The declaration is opt-in. Both frozen adopters declare no artifact key, and step 4 must not
  // move them: an undeclared surface resolves to observed-empty, which is not `unresolved` and
  // blocks nothing. Measured against open-problem-gaps, which is in open-problem mode — so the
  // detector actually runs — and passes the rule on the old `###`-in-problem.md arm.
  const { envelope } = validate("open-problem-gaps");
  const r = resultFor(envelope, ROUTES);
  assert.equal(r.status, "passed");
  const declared = r.inspected.surfaces.find((s) => s.surface === "declared-failed-routes");
  assert.equal(declared.state, "resolved-empty", "nothing was declared, which is an observation");
  assert.deepEqual(r.inspected.unresolved, []);
});
