import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCatalog, assertBindings } from "../scripts/catalog.mjs";
import { isInvariant, STATUS } from "../scripts/compliance.mjs";
import { EVALUATED_RULES } from "../scripts/evaluated.mjs";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(HOME, "scripts/standards.mjs");
const fixture = (name) => path.join(HOME, "test/fixtures", name);

/** Run the CLI and return { code, stdout }. A non-zero exit is data here, not a failure. */
function run(args) {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" }) };
  } catch (error) {
    return { code: error.status ?? 1, stdout: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

const auditJson = (name) => JSON.parse(run(["audit", `--dir=${fixture(name)}`, "--json"]).stdout);
const validateJson = (name) => JSON.parse(run(["validate", `--dir=${fixture(name)}`, "--json"]).stdout);
const rulesFired = (name) => new Set(auditJson(name).findings.map((f) => f.rule));

const catalog = await loadCatalog(path.join(HOME, "rules"));

// ---------------------------------------------------------------------------
// The catalog, the evaluator, and the documentation cannot drift apart
// ---------------------------------------------------------------------------

test("every evaluated rule id exists in the catalog", () => {
  assert.doesNotThrow(() => assertBindings(catalog, EVALUATED_RULES));
});

test("every rule a detector actually reports is in EVALUATED_RULES", () => {
  // The other direction of the same guarantee. A detector reporting against a rule that is not in
  // the list would produce a finding for a rule the verdict reports as not-evaluated — a failure
  // and a "nobody looked" at the same time.
  const declared = new Set(EVALUATED_RULES);
  const seen = new Set();
  for (const name of ["math-compliant", "silent-promotion", "numerics-as-proof", "circular", "open-problem-gaps", "sorry-certified"]) {
    for (const rule of rulesFired(name)) seen.add(rule);
  }
  for (const rule of seen) {
    assert.ok(declared.has(rule), `${rule} is reported by a detector but not declared in EVALUATED_RULES`);
  }
});

test("every rule carries the metadata an agent needs to explain it", () => {
  for (const rule of catalog.rules.values()) {
    for (const field of ["title", "description", "rationale", "remediation", "$assuranceNote"]) {
      assert.ok(
        typeof rule[field] === "string" && rule[field].trim().length > 0,
        `${rule.id} has no ${field}`,
      );
    }
    assert.deepEqual(rule.aliases, [], `${rule.id} carries an alias; one spelling has always been the rule here`);
  }
});

test("every prohibition is non-exemptible, and nothing else is", () => {
  for (const rule of catalog.rules.values()) {
    if (rule.level === "forbidden") {
      assert.equal(rule.nonExemptible, true, `${rule.id} is forbidden but exemptible`);
    } else {
      assert.equal(rule.nonExemptible, false, `${rule.id} is non-exemptible without being forbidden`);
    }
  }
  assert.ok([...catalog.rules.values()].some(isInvariant), "the catalog defines at least one invariant");
});

test("every rule binds to a standard that exists and has a document", async () => {
  const inventory = JSON.parse(await readFile(path.join(HOME, "artifacts/standards-source-inventory.json"), "utf8"));
  const known = new Map(inventory.standards.map((s) => [s.number, s.implementedBy]));
  for (const rule of catalog.rules.values()) {
    const doc = known.get(rule.standard);
    assert.ok(doc, `${rule.id} binds to standard ${rule.standard}, which the inventory does not list`);
    assert.ok(existsSync(path.join(HOME, doc)), `${doc} does not exist`);
  }
});

test("a rule with no detector reports not-evaluated, never passed", () => {
  const report = validateJson("math-compliant");
  const evaluated = new Set(EVALUATED_RULES);
  for (const result of report.results) {
    if (evaluated.has(result.ruleId)) continue;
    assert.notEqual(result.status, "passed", `${result.ruleId} passed without being evaluated`);
  }
  const falseGreen = report.results.filter((r) => r.status === "passed" && r.disposition === "not-evaluated");
  assert.deepEqual(falseGreen, [], "unknown must never be a pass");
});

test("every finding carries what an explanation needs", () => {
  for (const name of ["silent-promotion", "numerics-as-proof", "sorry-certified"]) {
    for (const finding of auditJson(name).findings) {
      assert.ok(finding.rule, "a finding with no rule cannot be explained");
      assert.ok(finding.standardRef && existsSync(path.join(HOME, finding.standardRef)), `${finding.rule} points at a document that does not exist`);
      assert.ok(finding.message && finding.message.length > 0);
      assert.ok(["OBSERVED", "INFERRED", "CONFIRMED_BY_OWNER", "UNKNOWN"].includes(finding.label));
      assert.ok(catalog.rules.get(finding.rule).remediation);
    }
  }
});

test("heuristic findings are never labelled OBSERVED", () => {
  // A phrase match reported as an observation is this tool fabricating certainty about its own
  // output — the same error as presenting numerical evidence as proof, committed by the checker.
  const heuristics = new Set([
    "computation.finite-case-generalization",
    "computation.error-bounds-stated",
    "computation.scope-declared",
    "computation.float-as-exact",
    "literature.unchecked-novelty",
    "proof.counterexample-search-recorded",
    "lifecycle.failed-routes-preserved",
  ]);
  for (const name of ["numerics-as-proof", "open-problem-gaps", "math-compliant"]) {
    for (const finding of auditJson(name).findings) {
      if (!heuristics.has(finding.rule)) continue;
      assert.equal(finding.label, "INFERRED", `${finding.rule} reported a heuristic as OBSERVED`);
    }
  }
});

// ---------------------------------------------------------------------------
// Detectors: each asserted to fire AND not to fire
// ---------------------------------------------------------------------------

test("the compliant fixture reports nothing its policy has not already answered", () => {
  const fired = rulesFired("math-compliant");
  for (const rule of [
    "claims.silent-promotion", "claims.status-exceeds-support", "claims.conditional-as-unconditional",
    "proof.circular-dependency", "proof.complete-with-open-obligations",
    "computation.evidence-as-proof", "computation.finite-case-generalization",
    "formal.placeholder-in-chain", "formal.placeholder-inventory", "formal.axiom-disclosure",
    "evidence.artifact-linked", "literature.known-result-comparison",
  ]) {
    assert.ok(!fired.has(rule), `${rule} fired on the honest fixture`);
  }
  assert.equal(validateJson("math-compliant").status, STATUS.COMPLIANT);
});

test("a conditional theorem resting on a conjecture is not a finding", () => {
  // It is the honest ceiling. A rule that fired at its own remedy would be impossible to satisfy,
  // and an impossible rule gets switched off.
  assert.ok(!rulesFired("math-compliant").has("claims.status-exceeds-support"));
});

test("a lean comment and a string literal containing sorry do not fire", () => {
  // Use versus mention, in the detector this repository can least afford to get wrong.
  assert.ok(!rulesFired("math-compliant").has("formal.placeholder-inventory"));
});

test("a primed identifier does not blind the placeholder scan", () => {
  // Regression, found by the mutation suite. `'` is a string delimiter in most languages and part of
  // an identifier in mathematics — `sq_nonneg'`, `x'`, `h'`. Treating it as a quote meant the first
  // prime opened a string that never closed, everything after it vanished from the structural view,
  // and the detector reported a clean file. A false green produced by the machinery that exists to
  // prevent false greens.
  const lean = readFileSync(path.join(fixture("sorry-certified"), "formal/Main.lean"), "utf8");
  assert.match(lean, /support_lemma'/, "the fixture must keep a primed identifier");
  // lastIndexOf, not indexOf: the file's own comment explaining this regression mentions the token,
  // and that mention is precisely what must not count. The live placeholder is the last occurrence.
  assert.ok(lean.indexOf("support_lemma'") < lean.lastIndexOf("sorry"), "the prime must come first");
  assert.ok(rulesFired("sorry-certified").has("formal.placeholder-inventory"));
});

test("a verilog .v file is not read as Coq", () => {
  const evidence = auditJson("sorry-certified").findings.flatMap((f) => f.evidence);
  assert.ok(!evidence.some((e) => e.includes("counter.v")), ".v is equally a Verilog extension");
});

test("sorry-backed machine certification fires, and blocks", () => {
  const fired = rulesFired("sorry-certified");
  assert.ok(fired.has("formal.placeholder-in-chain"));
  assert.ok(fired.has("formal.axiom-disclosure"), "an undisclosed axiom is a hidden assumption");
  assert.ok(fired.has("formal.placeholder-inventory"), "the placeholder itself is reported as information");

  const report = validateJson("sorry-certified");
  assert.equal(report.status, STATUS.BLOCKED_BY_INVARIANT);
  assert.ok(report.blockedBy.some((b) => b.rule === "formal.placeholder-in-chain"));
});

test("an exception against an invariant is rejected rather than honoured", () => {
  const report = validateJson("sorry-certified");
  const rejected = report.results.filter((r) => r.disposition === "rejected-exception");
  assert.ok(rejected.length > 0, "the fixture's waiver must be refused");
  assert.equal(report.status, STATUS.BLOCKED_BY_INVARIANT, "a waiver cannot downgrade the verdict");
});

test("prose asserting a status above the ledger fires; equal, lower, bare, and fenced do not", () => {
  const report = auditJson("silent-promotion");
  const promotion = report.findings.filter((f) => f.rule === "claims.silent-promotion");
  assert.equal(promotion.length, 1);
  const evidence = promotion[0].evidence.join("\n");
  assert.match(evidence, /asserts THEOREM, ledger says CONJECTURE/);
  assert.equal(promotion[0].evidence.length, 1, "only the promotion, not the four honest references");

  const unknown = report.findings.find((f) => f.rule === "claims.inline-label-consistency");
  assert.ok(unknown.evidence.some((e) => e.includes("CLM-0099")));
});

test("numerics presented as proof fire; the honest restatement does not", () => {
  const report = auditJson("numerics-as-proof");
  const asProof = report.findings.find((f) => f.rule === "computation.evidence-as-proof");
  assert.ok(asProof, "a THEOREM whose only evidence is computational must be reported");
  assert.ok(asProof.evidence.every((e) => e.includes("CLM-0020")), "CLM-0021 states the same result honestly");

  const finite = report.findings.find((f) => f.rule === "computation.finite-case-generalization");
  assert.ok(finite && finite.evidence.every((e) => e.includes("CLM-0020")));
});

test("a recorded literature search does not satisfy the proof test", async () => {
  // Regression. When `citation` covered both citing a result and recording a search, adding a
  // MathSciNet note to a computationally-supported THEOREM silenced computation.evidence-as-proof.
  const ledger = await readFile(path.join(fixture("numerics-as-proof"), "artifacts/claims-ledger.md"), "utf8");
  assert.match(ledger, /literature-search — Searched MathSciNet/);
  assert.ok(rulesFired("numerics-as-proof").has("computation.evidence-as-proof"));
});

test("a dependency cycle is reported with the whole route", () => {
  const cycle = auditJson("circular").findings.find((f) => f.rule === "proof.circular-dependency");
  assert.ok(cycle);
  const route = cycle.evidence[0];
  for (const id of ["CLM-0030", "CLM-0031", "CLM-0032"]) assert.ok(route.includes(id));
});

test("an open-problem record with an unanswered section is reported", () => {
  const fired = rulesFired("open-problem-gaps");
  assert.ok(fired.has("problems.proved-vs-conjectural"), "an empty section is a finding");
  assert.ok(fired.has("problems.barriers-recorded"), "a missing section is a finding");
  assert.ok(fired.has("lifecycle.reopening-evidence"), "a terminated approach needs a reopening condition");
  assert.ok(!fired.has("lifecycle.stopping-criteria"), "the section that IS answered must not fire");
  assert.ok(!fired.has("problems.difficulty-location"), "the section that IS answered must not fire");
});

// ---------------------------------------------------------------------------
// This repository, audited by itself
// ---------------------------------------------------------------------------

test("this repository has no unanswered error-severity findings", async () => {
  // Stated carefully, because audit and validate are different questions and the difference is the
  // point of having both. `audit` runs with no policy: it reports that this repository has no claims
  // ledger, which is true and is exactly what an evidence survey should say. `validate` applies the
  // policy, where that finding is answered by a not-applicable declaration with a revisit condition.
  //
  // So the property worth asserting is not "audit is silent" — that would be satisfied by a policy
  // nobody wrote — but "every error the survey raises has been answered in the policy, deliberately
  // and with an end condition."
  const { parseYaml } = await import("../scripts/yaml.mjs");
  const policy = parseYaml(await readFile(path.join(HOME, "project-policy.yml"), "utf8"));
  const answered = new Set(
    Object.entries(policy.applicability ?? {})
      .filter(([, d]) => d.status === "not-applicable")
      .map(([id]) => id),
  );

  const errors = JSON.parse(run(["audit", `--dir=${HOME}`, "--json"]).stdout).findings.filter(
    (f) => f.severity === "error" && !answered.has(f.rule),
  );
  assert.deepEqual(errors.map((f) => `${f.rule}: ${f.message}`), []);

  // And the verdict itself carries no failure at all.
  const verdict = JSON.parse(run(["validate", `--dir=${HOME}`, "--json"]).stdout);
  assert.deepEqual(verdict.results.filter((r) => r.status === "failed").map((r) => r.ruleId), []);
  assert.deepEqual(verdict.blockedBy, []);
});

test("this repository validates, and its own policy is honest about what was not evaluated", () => {
  const report = JSON.parse(run(["validate", `--dir=${HOME}`, "--json"]).stdout);
  assert.ok([STATUS.COMPLIANT, STATUS.COMPLIANT_WITH_EXCEPTIONS].includes(report.status), report.status);
  // The integrity invariant is manual-review and deliberately unattested: an attestation by the
  // authors that the authors did not weaken a standard establishes nothing.
  const integrity = report.results.find((r) => r.ruleId === "integrity.no-self-serving-modification");
  assert.equal(integrity.disposition, "not-evaluated");
  assert.equal(integrity.status, "skipped");
});

test("every not-applicable declaration in this repository names what would end it", async () => {
  const { parseYaml } = await import("../scripts/yaml.mjs");
  const policy = parseYaml(await readFile(path.join(HOME, "project-policy.yml"), "utf8"));
  for (const [id, declaration] of Object.entries(policy.applicability ?? {})) {
    assert.equal(declaration.status, "not-applicable");
    assert.ok(declaration.reason?.trim(), `${id} has no reason`);
    assert.ok(declaration.revisitWhen?.trim(), `${id} has no revisitWhen`);
  }
});

test("framework coverage travels beside the verdict and never inside it", () => {
  const report = JSON.parse(run(["validate", `--dir=${HOME}`, "--json"]).stdout);
  assert.ok(report.frameworkCoverage);
  assert.equal(report.frameworkCoverage.cataloguedRules, catalog.rules.size);
  assert.equal(report.frameworkCoverage.evaluatedRules, EVALUATED_RULES.length);
  assert.ok(report.frameworkCoverage.evaluatedRules < report.frameworkCoverage.cataloguedRules);
  // The score is computed over evaluated required rules only; coverage is not folded into it.
  assert.notEqual(report.score, report.frameworkCoverage.evaluatedRules);
});

// ---------------------------------------------------------------------------
// The CLI contract
// ---------------------------------------------------------------------------

test("exit codes distinguish a clean run, findings, and a broken invocation", () => {
  assert.equal(run(["audit", `--dir=${fixture("math-compliant")}`]).code, 0);
  assert.equal(run(["validate", `--dir=${fixture("sorry-certified")}`]).code, 1, "a blocked verdict exits 1");
  assert.equal(run(["audit", "--dir=./definitely-not-here"]).code, 2, "a bad invocation exits 2, not 1");
  assert.equal(run(["nonsense"]).code, 2);
});

test("validate without a policy is NOT_EVALUATED and exit 2, never a compliance failure", () => {
  const result = run(["validate", `--dir=${fixture("circular")}`]);
  assert.equal(result.code, 2, "a configuration problem is not a false red for the project");
  assert.match(result.stdout, /NOT_EVALUATED/);
});

test("check is an alias of validate", () => {
  const a = run(["validate", `--dir=${fixture("math-compliant")}`, "--json"]).stdout;
  const b = run(["check", `--dir=${fixture("math-compliant")}`, "--json"]).stdout;
  const strip = (s) => JSON.parse(s).results.map((r) => `${r.ruleId}:${r.status}`);
  assert.deepEqual(strip(a), strip(b));
});

test("explain answers why a rule applies here and what the check does not establish", () => {
  const out = run(["explain", "formal.placeholder-in-chain", `--dir=${fixture("sorry-certified")}`]).stdout;
  assert.match(out, /INVARIANT/);
  assert.match(out, /What the check does NOT establish/);
  assert.match(out, /Standard 16/);
  assert.match(out, /Evaluated by a detector: yes/);

  const manual = run(["explain", "rigor.hidden-assumption"]).stdout;
  assert.match(manual, /Evaluated by a detector: no — this rule reports not-evaluated, never passed/);

  assert.equal(run(["explain", "no.such-rule"]).code, 2);
});

test("explain accepts a standard number", () => {
  const out = run(["explain", "16"]).stdout;
  assert.match(out, /standards\/16-formal-theorem-proving\.md/);
  assert.match(out, /formal\.placeholder-in-chain/);
});

test("status prints a one-screen summary including any block", () => {
  const blocked = run(["status", `--dir=${fixture("sorry-certified")}`]).stdout;
  assert.match(blocked, /BLOCKED/);
  const clean = run(["status", `--dir=${fixture("math-compliant")}`]).stdout;
  assert.match(clean, /COMPLIANT/);
  assert.ok(clean.split("\n").filter(Boolean).length <= 8, "status is a summary, not a report");
});

test("the audit output contract is stable", () => {
  const report = auditJson("sorry-certified");
  assert.equal(report.schemaVersion, "1.0.0");
  assert.ok(Array.isArray(report.findings));
  for (const finding of report.findings) {
    for (const key of ["id", "category", "severity", "label", "evidence", "message", "standardRef", "rule"]) {
      assert.ok(key in finding, `finding is missing ${key}`);
    }
  }
});

// ---------------------------------------------------------------------------
// The gates themselves
// ---------------------------------------------------------------------------

test("the inventory agrees with the source spec", () => {
  const out = execFileSync(process.execPath, [path.join(HOME, "scripts/inventory.mjs"), "--json"], { encoding: "utf8" });
  assert.equal(JSON.parse(out).ok, true);
});

test("every block claimed as verbatim source appears in the source", () => {
  const out = execFileSync(process.execPath, [path.join(HOME, "scripts/fidelity.mjs"), "--json"], { encoding: "utf8" });
  const result = JSON.parse(out);
  assert.equal(result.ok, true);
  assert.ok(result.claims > 20, "the standards do quote the source, and the check is reaching them");
});

test("the provenance digests match the source documents", () => {
  const findings = JSON.parse(run(["audit", `--dir=${HOME}`, "--json"]).stdout).findings;
  assert.ok(!findings.some((f) => f.rule === "integrity.provenance-digest"));
});

test("the assurance report is current", () => {
  const result = run([]);
  void result;
  const check = (() => {
    try {
      execFileSync(process.execPath, [path.join(HOME, "scripts/assurance.mjs"), "--check"], { encoding: "utf8" });
      return 0;
    } catch (error) {
      return error.status ?? 1;
    }
  })();
  assert.equal(check, 0, "docs/assurance-report.md is stale — run `npm run assurance`");
});

test("every standards document has the canonical sections", async () => {
  const files = (await readdir(path.join(HOME, "standards"))).filter((f) => /^\d\d-.*\.md$/.test(f));
  assert.equal(files.length, 22);
  for (const file of files) {
    const text = await readFile(path.join(HOME, "standards", file), "utf8");
    for (const heading of ["## Scope", "## Requirements", "## Additions this standard makes beyond the source", "## Relationship to other standards", "## Implementation"]) {
      assert.ok(text.includes(heading), `${file} has no ${heading}`);
    }
    assert.match(text, /^Source: item \d+ of/m, `${file} does not name its source item`);
    assert.match(text, /^### R1 — /m, `${file} has no numbered requirements`);
    assert.ok(!text.startsWith("---"), `${file} has frontmatter`);
  }
});
