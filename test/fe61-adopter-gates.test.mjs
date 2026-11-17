/**
 * FE-30 (#61) — adopter verification gates. Option A: credit-inert by construction.
 *
 * Design: design/fe61-adopter-verification-gates.md (frozen). Written before the schema key, the
 * module and the rule. Each test names the criterion it answers:
 *
 *   C0  The design is recorded (guard: the rule's note names it and it exists).
 *   C1  An adopter-run gate is referenced by identity and version.
 *   R   Execution provenance and result accompany the reference (the rider).
 *   C2  It is reported `adopter-asserted` unless the framework executed it.
 *   C3  A planted failure flips the REPORTED result (audit level only, owner Choice 16).
 *   C4  An unexecuted or adopter-asserted gate cannot raise the framework verdict, Cover or assurance.
 *
 * RED-FIRST tests fail on main before the change. Rows the design marks "none today" (the C4
 * differentials, which pass vacuously before the rule exists) are kept as regression guards; C4.2
 * proves the differential helper can go red.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { loadCatalog, coverage } from "../scripts/catalog.mjs";
import { EVALUATED_RULES } from "../scripts/evaluated.mjs";
import { RULE_SURFACES, SURFACES, SURFACE_LABELS } from "../scripts/surfaces.mjs";
import { hasReference } from "../scripts/attempts.mjs";
import { parseYaml } from "../scripts/yaml.mjs";
import { HOME, run, scratch } from "./helpers/cli.mjs";

const RULE = "evidence.adopter-gates-recorded";
const DESIGN = "design/fe61-adopter-verification-gates.md";
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const fixtureText = (name) => readFileSync(path.join(fixture(name), "project-policy.yml"), "utf8");
const fixtureGates = (name) => parseYaml(fixtureText(name)).adopterGates;

// scripts/adopter-gates.mjs does not exist on main. Load it lazily so one missing module makes the
// unit tests red individually instead of making the whole file unloadable.
const gates = await import("../scripts/adopter-gates.mjs").catch(() => null);
const needModule = () => assert.ok(gates, "scripts/adopter-gates.mjs must exist and be importable");

const auditJson = (dir) => JSON.parse(run(["audit", `--dir=${dir}`, "--json"]).out);
const auditText = (dir) => run(["audit", `--dir=${dir}`]).out;
const validateRaw = (dir) => run(["validate", `--dir=${dir}`, "--json"]);
const validateJson = (dir) => JSON.parse(validateRaw(dir).out);
const ruleResult = (env) => env.results.find((r) => r.ruleId === RULE);
const reportOf = (dir) => auditJson(dir).adopterGates;
const policyCli = (file) =>
  spawnSync(process.execPath, [path.join(HOME, "scripts/policy.mjs"), file], { encoding: "utf8", cwd: HOME });

const LEGEND =
  "Adopter-asserted means the project recorded it. The framework did not run it and gives it no assurance credit.";

/** A valid executed gate, with overrides applied to the top level, `execution` and `result`. */
function gate({ execution = {}, result = {}, ...top } = {}) {
  return {
    id: "pvsnp-check",
    version: "1.3.0",
    execution: {
      state: "executed",
      by: "adopter-ci",
      at: "2026-11-10",
      subject: "commit 4f3a9c1d2e",
      command: "pwsh ./check.ps1",
      evidence: "artifacts/gate-runs/2026-11-10-check.log",
      ...execution,
    },
    result: { outcome: "passed", evidence: "artifacts/gate-runs/2026-11-10-check.log", ...result },
    ...top,
  };
}
const unrunGate = (over = {}) => ({
  id: "lean-axiom-audit",
  version: "2.4.0",
  execution: { state: "unrun" },
  result: { outcome: "not-recorded" },
  ...over,
});
const classifyOne = (g) => gates.classifyGates([g])[0];

/** The text from the `adopterGates:` line to the end of a fixture, for appending to another policy. */
const gateBlock = (name) => {
  const text = fixtureText(name);
  return text.slice(text.indexOf("adopterGates:"));
};
const creditBlock = () => readFileSync(path.join(fixture("adopter-gates-credit-block.yml")), "utf8");

/** A temporary copy of math-compliant (COMPLIANT, 100%) with `append` added to its policy. */
function variant(append = "") {
  const dir = scratch();
  cpSync(fixture("math-compliant"), dir, { recursive: true });
  const file = path.join(dir, "project-policy.yml");
  writeFileSync(file, readFileSync(file, "utf8").replace(/\s*$/, "\n") + append, "utf8");
  return dir;
}
function withVariant(append, fn) {
  const dir = variant(append);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
/** validate --json of a variant, with the temp root normalised so two copies are comparable. */
const envelopeFor = (append) =>
  withVariant(append, (dir) => {
    const raw = validateRaw(dir).out.split(dir).join("<ROOT>").split(dir.replace(/\\/g, "/")).join("<ROOT>");
    return JSON.parse(raw);
  });

const REQUIRED = `rules:\n  ${RULE}:\n    level: required\n`;

/** Every path at which two values differ. `results` is keyed by ruleId so order cannot matter. */
function diffPaths(a, b, at = "", out = []) {
  if (a === b) return out;
  const isObj = (v) => v !== null && typeof v === "object";
  if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) {
    out.push(at);
    return out;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) diffPaths(a[k], b[k], at === "" ? k : `${at}/${k}`, out);
  return out;
}
const normalise = (env) => {
  const copy = JSON.parse(JSON.stringify(env));
  delete copy.auditedAt;
  copy.results = Object.fromEntries(copy.results.map((r) => [r.ruleId, r]));
  return copy;
};
const REASON_PATH = `results/${RULE}/inspected/surfaces/0/reason`;
const differences = (base, other) => diffPaths(normalise(base), normalise(other));

/** The C4.1 differential: nothing differs except the rule's surface reason. */
function assertCreditInert(base, other, label) {
  const diffs = differences(base, other).filter((p) => p !== REASON_PATH);
  assert.deepEqual(diffs, [], `${label}: a gate moved something other than the surface reason`);
}
function assertRuleSkipped(env, label) {
  const r = ruleResult(env);
  assert.ok(r, `${label}: ${RULE} has a result`);
  assert.equal(r.status, "skipped", label);
  assert.equal(r.disposition, "not-evaluated", label);
  assert.equal(r.notEvaluatedBecause, "no-subject", label);
  assert.equal(r.scored, false, label);
  assert.equal(r.inspected.surfaces[0].state, "resolved-empty", label);
  assert.equal(r.inspected.surfaces[0].count, 0, label);
}
const TOP = ["status", "score", "scoreUnavailable", "summary", "assurance", "denominator", "blockedBy", "foreignFailures"];
function assertTopEqual(base, other, label) {
  for (const k of TOP) assert.deepEqual(other[k], base[k], `${label}: ${k}`);
}

// ---------------------------------------------------------------------------
// C0 — the design is recorded
// ---------------------------------------------------------------------------

test("C0 · the rule's assurance note names the design record and the record exists", async () => {
  const catalog = JSON.parse(readFileSync(path.join(HOME, "rules/evidence.json"), "utf8"));
  const rule = catalog.rules.find((r) => r.id === RULE);
  assert.ok(rule, `${RULE} is in rules/evidence.json`);
  assert.match(rule.$assuranceNote, /design\/fe61-adopter-verification-gates\.md/);
  assert.ok(existsSync(path.join(HOME, DESIGN)));
  assert.equal(rule.standard, 19);
  assert.equal(rule.category, "evidence");
  assert.equal(rule.level, "recommended");
  assert.equal(rule.severity, "warning");
  assert.equal(rule.validationType, "structural");
  assert.equal(rule.nonExemptible, false);
  assert.equal(rule.introducedIn, "3.2.0");
});

// ---------------------------------------------------------------------------
// C1 — reference a gate by identity and version
// ---------------------------------------------------------------------------

test("C1.1 · a gate with id, version, provenance and result validates; policy.mjs reads it [RED-FIRST]", () => {
  const dir = fixture("adopter-gates-passed");
  assert.notEqual(validateRaw(dir).code, 2, validateRaw(dir).out);
  const p = policyCli(path.join(dir, "project-policy.yml"));
  assert.equal(p.status, 0, `${p.stdout}\n${p.stderr}`);
  assert.match(p.stdout, /Valid against schemas\/project-policy\.schema\.json\./);
});

for (const [name, field] of [
  ["adopter-gates-no-version", "adopterGates[0].version"],
  ["adopter-gates-no-id", "adopterGates[0].id"],
  ["adopter-gates-no-result", "adopterGates[0].result"],
  ["adopter-gates-no-provenance", "adopterGates[0].execution"],
]) {
  test(`C1/R · ${name} is rejected with exit 2 naming ${field} [RED-FIRST]`, () => {
    const dir = fixture(name);
    const v = validateRaw(dir);
    assert.equal(v.code, 2, v.out);
    assert.ok(v.out.includes(field), `validate output does not name ${field}:\n${v.out}`);
    assert.match(v.out, /required/);
    const p = policyCli(path.join(dir, "project-policy.yml"));
    assert.equal(p.status, 2, p.stdout);
    assert.ok(p.stdout.includes(field), p.stdout);
  });
}

test("C1.4 · two references with the same id (trimmed, case-folded) are both reported invalid, one finding each [RED-FIRST]", () => {
  const report = reportOf(fixture("adopter-gates-duplicate-id"));
  assert.equal(report.gates.length, 2);
  for (const g of report.gates) {
    assert.equal(g.reported, "invalid");
    assert.equal(g.valid, false);
    assert.equal(g.errors.filter((e) => /\bid\b/.test(e)).length, 1, JSON.stringify(g.errors));
  }
  assert.equal(report.summary.invalid, 2);
});

test("C1.5 · a version that names no version is reported invalid [RED-FIRST]", () => {
  needModule();
  const placeholders = ["latest", "unknown", "none", "n/a", "tbd", "head", "main", "master", "current", "x", "?"];
  for (const p of placeholders) {
    for (const spelling of [p, p.toUpperCase(), `  ${p} `]) {
      const g = classifyOne(unrunGate({ version: spelling }));
      assert.equal(g.reported, "invalid", `version ${JSON.stringify(spelling)}`);
      assert.ok(g.errors.some((e) => /version/.test(e)), JSON.stringify(g.errors));
    }
  }
  assert.equal(classifyOne(unrunGate({ version: "2.4.0" })).valid, true);
  assert.equal(classifyOne(unrunGate({ version: "v1.2" })).valid, true);
  assert.equal(reportOf(fixture("adopter-gates-placeholder-version")).gates[0].reported, "invalid");
});

test("C1.6 · audit --json carries each reference's id and version unchanged [RED-FIRST]", () => {
  const [g] = reportOf(fixture("adopter-gates-passed")).gates;
  assert.equal(g.id, "pvsnp-check");
  assert.equal(g.version, "1.3.0");
  const [dup] = reportOf(fixture("adopter-gates-duplicate-id")).gates.slice(1);
  assert.equal(dup.id, "PvsNP-Check", "the id is reported as written, not folded");
  assert.equal(dup.version, "1.4.0");
});

test("C1.7 · absent, empty and all-unrun are skipped / not-evaluated / no-subject at every level [RED-FIRST]", () => {
  const cases = [
    ["absent", "", /Adopter-run gates: none referenced/],
    ["empty list", "adopterGates: []\n", /Adopter-run gates: none referenced/],
    ["all unrun", gateBlock("adopter-gates-unrun"), /lean-axiom-audit@2\.4\.0: not run \(unexecuted\)/],
  ];
  for (const [label, block, text] of cases) {
    for (const level of ["default", "required"]) {
      const append = block + (level === "required" ? REQUIRED : "");
      withVariant(append, (dir) => {
        const env = validateJson(dir);
        assertRuleSkipped(env, `${label}/${level}`);
        assert.notEqual(ruleResult(env).status, "passed");
        assert.match(auditText(dir), text, label);
      });
    }
  }
});

test("C1.8 · the framework names no gate: scripts/adopter-gates.mjs carries none of the adopters' names [RED-FIRST]", () => {
  const file = path.join(HOME, "scripts/adopter-gates.mjs");
  assert.ok(existsSync(file), "scripts/adopter-gates.mjs exists");
  const source = readFileSync(file, "utf8");
  for (const forbidden of ["pvsnp", "lean-axiom", "check.ps1", "planted", "audit-manifest"]) {
    assert.ok(!source.toLowerCase().includes(forbidden), `scripts/adopter-gates.mjs names a gate: ${forbidden}`);
  }
});

// ---------------------------------------------------------------------------
// Rider — provenance and result accompany the reference
// ---------------------------------------------------------------------------

test("R.3 · an executed gate missing subject, command, evidence or result evidence is invalid, one error per field [RED-FIRST]", () => {
  const g = reportOf(fixture("adopter-gates-thin-provenance")).gates[0];
  assert.equal(g.reported, "invalid");
  assert.equal(g.valid, false);
  assert.equal(g.errors.length, 4, JSON.stringify(g.errors));
  for (const field of [/subject/, /command/, /execution evidence|execution\.evidence/, /result evidence|result\.evidence/]) {
    assert.equal(g.errors.filter((e) => field.test(e)).length, 1, `${field}: ${JSON.stringify(g.errors)}`);
  }
  // No gate with an `executed` state and a missing field is ever read as its declared outcome.
  assert.equal(g.declared.outcome, "passed");
  assert.notEqual(g.reported, "passed");
});

test("R.4 · isGateReference is a stricter wrapper over hasReference, pinned case by case [RED-FIRST]", () => {
  needModule();
  const rejected = [
    "n/a", "n/a.", "and/or", "yes/no", "yes/no/maybe", "TBD/TODO", "TBD / TODO", "pass/fail", "ok/fail", "w/o",
    "either/or", "true/false", "not/applicable", "N/A - see below", "none/", "tbd/", "n/a/", "/", "./", "1/2",
    "it/was/fine", "artifacts/gate-runs/", "ran it, it was fine", "N/A", "none", "tbd", "todo", "unknown", "-",
    "defaced", "e.g", "e.g.", "", "   ",
  ];
  for (const value of rejected) assert.equal(gates.isGateReference(value), false, JSON.stringify(value));
  const accepted = [
    "artifacts/gate-runs/x.log", "https://ci.example.org/run/42", "commit 4f3a9c1", "docs/n/a/notes.md", "check.ps1",
  ];
  for (const value of accepted) assert.equal(gates.isGateReference(value), true, JSON.stringify(value));
  // The stated leak class: shape only, nothing is resolved.
  for (const leak of ["notes.txt", "foo.bar", "n/a.txt", "TBD/TODO.md"]) {
    assert.equal(gates.isGateReference(leak), true, `${leak} is accepted by shape, as the design states`);
  }
  // FE-28's helper is composed with, not changed.
  assert.equal(hasReference("n/a"), true, "hasReference is unchanged (it accepts n/a today)");
  assert.equal(hasReference("it/was/fine"), true, "hasReference is unchanged");
});

test("R.4 · a free-text, placeholder or bare-hex evidence value makes an executed gate invalid [RED-FIRST]", () => {
  needModule();
  for (const evidence of ["ran it, it was fine", "n/a", "N/A", "none", "tbd", "TODO", "unknown", "-", "defaced", "and/or"]) {
    for (const where of ["execution", "result"]) {
      const g = classifyOne(gate(where === "execution" ? { execution: { evidence } } : { result: { evidence } }));
      assert.equal(g.reported, "invalid", `${where}.evidence ${JSON.stringify(evidence)}`);
    }
  }
  assert.equal(classifyOne(gate()).valid, true);
});

test("R.5 · an unrun gate carries nothing else; unrun with a passing result is invalid [RED-FIRST]", () => {
  needModule();
  const g = classifyOne(
    unrunGate({
      execution: { state: "unrun", by: "x", at: "2026-11-10", subject: "commit 4f3a9c1", command: "c", evidence: "a/b.log" },
      result: { outcome: "not-recorded", evidence: "a/b.log" },
    }),
  );
  assert.equal(g.reported, "invalid");
  for (const f of ["by", "at", "subject", "command", "evidence"]) {
    assert.ok(g.errors.some((e) => new RegExp(`\\b${f}\\b`).test(e)), `${f}: ${JSON.stringify(g.errors)}`);
  }
  const withResult = reportOf(fixture("adopter-gates-unrun-with-result")).gates[0];
  assert.equal(withResult.reported, "invalid");
  assert.equal(withResult.label, "unexecuted");
  assert.equal(withResult.declared.outcome, "passed");
  assert.notEqual(withResult.reported, "passed");
});

test("R.6 · no gate is ever printed without its provenance and result [RED-FIRST]", () => {
  for (const name of ["adopter-gates-unrun", "adopter-gates-passed", "adopter-gates-failed", "adopter-gates-thin-provenance"]) {
    const dir = fixture(name);
    for (const g of reportOf(dir).gates) {
      assert.equal(typeof g.execution, "object", name);
      assert.equal(typeof g.result, "object", name);
      assert.ok(g.execution !== null && g.result !== null, name);
    }
  }
  const [unrun] = reportOf(fixture("adopter-gates-unrun")).gates;
  assert.deepEqual(unrun.execution, { state: "unrun" });
  assert.deepEqual(unrun.result, { outcome: "not-recorded" });
  assert.match(auditText(fixture("adopter-gates-passed")), /pvsnp-check@1\.3\.0: passed \(adopter-asserted; ran 2026-11-10 by adopter-ci against commit 4f3a9c1d2e\)/);
});

test("R.7 · `at` must be a real calendar date [RED-FIRST]", () => {
  needModule();
  assert.equal(classifyOne(gate({ execution: { at: "2026-11-31" } })).reported, "invalid");
  assert.equal(classifyOne(gate({ execution: { at: "2026-02-30" } })).reported, "invalid");
  assert.equal(classifyOne(gate({ execution: { at: "2026-11-30" } })).reported, "passed");
});

// ---------------------------------------------------------------------------
// C2 — adopter-asserted unless the framework executed it
// ---------------------------------------------------------------------------

test("C2.1 · executed and passed is reported passed, adopter-asserted [RED-FIRST]", () => {
  const [g] = reportOf(fixture("adopter-gates-passed")).gates;
  assert.equal(g.reported, "passed");
  assert.equal(g.label, "adopter-asserted");
  assert.equal(g.valid, true);
  assert.deepEqual(g.errors, []);
});

test("C2.2 · executed and failed is reported failed, adopter-asserted [RED-FIRST]", () => {
  const [g] = reportOf(fixture("adopter-gates-failed")).gates;
  assert.equal(g.reported, "failed");
  assert.equal(g.label, "adopter-asserted");
  assert.equal(g.valid, true);
});

test("C2.3 · `by: math-standards` is still adopter-asserted [RED-FIRST]", () => {
  const [g] = reportOf(fixture("adopter-gates-self-declared-framework")).gates;
  assert.equal(g.execution.by, "math-standards");
  assert.equal(g.label, "adopter-asserted");
  assert.equal(g.reported, "passed");
});

test("C2.4 · through the CLI nothing produces framework-executed; an invalid executed record is still adopter-asserted [RED-FIRST]", () => {
  const names = [
    "adopter-gates-unrun", "adopter-gates-passed", "adopter-gates-failed", "adopter-gates-thin-provenance",
    "adopter-gates-self-declared-framework", "adopter-gates-unrun-with-result", "adopter-gates-duplicate-id",
    "adopter-gates-placeholder-version",
  ];
  const labels = new Set();
  for (const name of names) {
    const report = reportOf(fixture(name));
    assert.equal(report.executedByFramework, 0, name);
    for (const g of report.gates) labels.add(g.label);
  }
  assert.ok([...labels].every((l) => ["adopter-asserted", "unexecuted"].includes(l)), [...labels].join());
  assert.ok(labels.has("adopter-asserted") && labels.has("unexecuted"), "non-vacuous: both labels occur");
  const thin = reportOf(fixture("adopter-gates-thin-provenance")).gates[0];
  assert.equal(thin.label, "adopter-asserted");
  assert.equal(thin.valid, false);
  assert.equal(thin.reported, "invalid");
});

test("C2.5 · the unless-branch is closed: only a framework run record yields framework-executed [RED-FIRST]", () => {
  needModule();
  const list = fixtureGates("adopter-gates-passed");
  assert.equal(gates.classifyGates(list)[0].label, "adopter-asserted");
  assert.equal(gates.classifyGates(list, new Map())[0].label, "adopter-asserted");
  assert.equal(gates.classifyGates(list, new Map([["other-gate", { ran: true }]]))[0].label, "adopter-asserted");
  const framework = gates.classifyGates(list, new Map([["pvsnp-check", { ran: true }]]));
  assert.equal(framework[0].label, "framework-executed");
  // No production caller passes a second argument.
  const standards = readFileSync(path.join(HOME, "scripts/standards.mjs"), "utf8");
  assert.doesNotMatch(standards, /classifyGates\([^)]*,/, "scripts/standards.mjs must not pass framework runs");
});

test("C2.6 · unrun is unexecuted, never adopter-asserted [RED-FIRST]", () => {
  const [g] = reportOf(fixture("adopter-gates-unrun")).gates;
  assert.equal(g.label, "unexecuted");
  assert.equal(g.reported, "not-recorded");
  assert.equal(g.valid, true);
});

test("C2.7 · the vocabularies are closed: three labels, four reported results, valid a boolean [RED-FIRST]", () => {
  needModule();
  assert.deepEqual([...gates.GATE_LABELS].sort(), ["adopter-asserted", "framework-executed", "unexecuted"]);
  assert.deepEqual([...gates.GATE_RESULTS].sort(), ["failed", "invalid", "not-recorded", "passed"]);
  const inputs = [
    gate(), gate({ result: { outcome: "failed" } }), unrunGate(), unrunGate({ version: "latest" }),
    gate({ execution: { state: "weird" } }), gate({ execution: { evidence: "n/a" } }),
  ];
  for (const g of gates.classifyGates(inputs)) {
    assert.ok(gates.GATE_LABELS.includes(g.label), g.label);
    assert.ok(gates.GATE_RESULTS.includes(g.reported), g.reported);
    assert.equal(typeof g.valid, "boolean");
    assert.equal(g.valid, g.reported !== "invalid");
  }
});

test("C2.8 · the human render carries the legend sentence verbatim [RED-FIRST]", () => {
  const text = auditText(fixture("adopter-gates-passed"));
  assert.ok(text.includes(LEGEND), text);
  assert.match(text, /Adopter-run gates: 1 referenced; the framework executed none of them/);
  assert.ok(!auditText(fixture("math-compliant")).includes(LEGEND), "the legend is printed only when a gate is listed");
});

// ---------------------------------------------------------------------------
// C3 — a planted failure flips the reported result (audit level only; Choice 16)
// ---------------------------------------------------------------------------

test("C3.1 · the twins differ in exactly one line, the outcome line, once comments are stripped [RED-FIRST]", () => {
  const strip = (name) =>
    fixtureText(name).split("\n").filter((l) => !/^\s*#/.test(l));
  const a = strip("adopter-gates-passed");
  const b = strip("adopter-gates-failed");
  assert.equal(a.length, b.length);
  const differing = a.map((l, i) => [l, b[i]]).filter(([x, y]) => x !== y);
  assert.equal(differing.length, 1, JSON.stringify(differing));
  assert.match(differing[0][0], /^\s+outcome: passed$/);
  assert.match(differing[0][1], /^\s+outcome: failed$/);
});

test("C3.2 · the reported result flips in audit --json, the audit render and the validate surface reason; status does not [RED-FIRST]", () => {
  const passed = fixture("adopter-gates-passed");
  const failed = fixture("adopter-gates-failed");
  assert.equal(reportOf(passed).gates[0].reported, "passed");
  assert.equal(reportOf(failed).gates[0].reported, "failed");
  assert.match(auditText(passed), /pvsnp-check@1\.3\.0: passed \(adopter-asserted/);
  assert.match(auditText(failed), /pvsnp-check@1\.3\.0: failed \(adopter-asserted/);
  const vp = ruleResult(validateJson(passed));
  const vf = ruleResult(validateJson(failed));
  assert.match(vf.inspected.surfaces[0].reason, /\(1 failed, 0 invalid/);
  assert.match(vp.inspected.surfaces[0].reason, /\(0 failed, 0 invalid/);
  assert.match(vf.inspected.surfaces[0].reason, /not framework evidence and earn no credit/);
  for (const r of [vp, vf]) {
    assert.equal(r.status, "skipped");
    assert.equal(r.message, "The detector for evidence.adopter-gates-recorded had no evidence surface to inspect.");
  }
  assert.equal(vf.message, vp.message);
});

test("C3.3 · the flip follows the record, not the name [RED-FIRST]", () => {
  const dir = scratch();
  try {
    writeFileSync(
      path.join(dir, "project-policy.yml"),
      fixtureText("adopter-gates-failed").replace("id: pvsnp-check", "id: renamed-gate"),
      "utf8",
    );
    const [g] = reportOf(dir).gates;
    assert.equal(g.id, "renamed-gate");
    assert.equal(g.reported, "failed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("C3.4 · a failed record that is also incomplete is invalid, declared failed, and not hidden [RED-FIRST]", () => {
  needModule();
  const thinFailed = gate({ execution: { command: undefined }, result: { outcome: "failed" } });
  delete thinFailed.execution.command;
  const g = classifyOne(thinFailed);
  assert.equal(g.reported, "invalid");
  assert.equal(g.valid, false);
  assert.equal(g.label, "adopter-asserted");
  assert.equal(g.declared.outcome, "failed");
  assert.notEqual(g.reported, "passed");
  const report = gates.buildGateReport(gates.classifyGates([thinFailed]));
  assert.deepEqual(report.summary, { passed: 0, failed: 0, notRecorded: 0, invalid: 1, declaredFailed: 1 });
  assert.match(gates.renderGateLines(report).join("\n"), /invalid, declared failed/);
});

test("C3.5 · the summary counts flip with the record [RED-FIRST]", () => {
  assert.deepEqual(reportOf(fixture("adopter-gates-passed")).summary, {
    passed: 1, failed: 0, notRecorded: 0, invalid: 0, declaredFailed: 0,
  });
  assert.deepEqual(reportOf(fixture("adopter-gates-failed")).summary, {
    passed: 0, failed: 1, notRecorded: 0, invalid: 0, declaredFailed: 1,
  });
});

test("C3.6 · under Option A the twins give validate the same status, score, summary, assurance and denominator, at default and required [RED-FIRST]", () => {
  for (const extra of ["", REQUIRED]) {
    const p = envelopeFor(gateBlock("adopter-gates-passed") + extra);
    const f = envelopeFor(gateBlock("adopter-gates-failed") + extra);
    assertTopEqual(p, f, `twins${extra ? " (required)" : ""}`);
    assertRuleSkipped(p, "passed twin");
    assertRuleSkipped(f, "failed twin");
    assert.match(ruleResult(f).inspected.surfaces[0].reason, /\(1 failed/);
    assert.match(ruleResult(p).inspected.surfaces[0].reason, /\(0 failed/);
    assert.deepEqual(differences(p, f), [REASON_PATH], "only the surface reason differs");
  }
});

// ---------------------------------------------------------------------------
// C4 — the framework verdict, Cover and assurance cannot be raised by a gate
// ---------------------------------------------------------------------------

const baseline = () => envelopeFor("");

test("C4.0 · the baseline is COMPLIANT at 100% with 22 scored rules, and the rule is catalogued [RED-FIRST]", () => {
  const base = baseline();
  assert.equal(base.status, "COMPLIANT");
  assert.equal(base.score, 100);
  assert.equal(base.denominator.scored, 22);
  assertRuleSkipped(base, "baseline");
  assert.equal(ruleResult(base).inspected.surfaces[0].reason, null, "no gate, no reason");
});

test("C4.1 · differential, strict: valid passed gates move nothing but the surface reason [RED-FIRST for the reason text]", () => {
  const base = baseline();
  const other = envelopeFor(creditBlock());
  assertCreditInert(base, other, "credit block");
  assertTopEqual(base, other, "credit block");
  assertRuleSkipped(other, "credit block");
  assert.match(ruleResult(other).inspected.surfaces[0].reason, /^2 adopter-run gate\(s\) recorded \(0 failed, 0 invalid/);
  assert.deepEqual(other.assurance, base.assurance, "the Cover line does not move");
  assert.deepEqual(other.denominator, base.denominator);
  assert.equal(other.schemaVersion, base.schemaVersion);
});

test("C4.2 · guard the guard: the differential detects a gate that earns credit or a hit [RED-FIRST]", () => {
  const base = baseline();
  const clone = () => JSON.parse(JSON.stringify(base));
  const leaks = [
    ["a passed result", (e) => { e.results = e.results.filter((r) => r.ruleId !== RULE).concat({ ruleId: RULE, status: "passed", scored: false }); }],
    ["assurance.automated +1", (e) => { e.assurance.automated += 1; }],
    ["assurance.notEvaluated -1", (e) => { e.assurance.notEvaluated -= 1; }],
    ["summary.skipped -1, warnings +1", (e) => { e.summary.skipped -= 1; e.summary.warnings += 1; }],
    ["denominator.scored +1", (e) => { e.denominator.scored += 1; }],
    ["a higher score", (e) => { e.score = 101; }],
    ["a scored rule", (e) => { const r = ruleResult(e); if (r) r.scored = true; else e.extra = true; }],
  ];
  for (const [label, mutate] of leaks) {
    const mutated = clone();
    mutate(mutated);
    const diffs = differences(base, mutated).filter((p) => p !== REASON_PATH);
    assert.ok(diffs.length > 0, `the differential did not notice: ${label}`);
  }
  // And it does not cry wolf: a reason-only change is the single allowed difference.
  const reasonOnly = clone();
  if (ruleResult(reasonOnly)) {
    ruleResult(reasonOnly).inspected.surfaces[0].reason = "x";
    assert.deepEqual(differences(base, reasonOnly), [REASON_PATH]);
  }
});

test("C4.3 · every manual-review rule keeps its disposition with the gates present [RED-FIRST for non-vacuity]", () => {
  const base = baseline();
  const other = envelopeFor(creditBlock());
  const manual = (env) =>
    env.results.filter((r) => r.validationType === "manual-review").map((r) => `${r.ruleId}:${r.status}:${r.disposition}`).sort();
  assert.ok(manual(base).length > 5, "non-vacuous: there are manual-review rules");
  assert.deepEqual(manual(other), manual(base));
  assert.ok(manual(other).every((s) => /not-evaluated|failed|invalid/.test(s) || /skipped/.test(s)));
});

test("C4.4 · an unrun gate leaves everything equal except the surface reason [RED-FIRST for the reason text]", () => {
  const base = baseline();
  const other = envelopeFor(gateBlock("adopter-gates-unrun"));
  assertCreditInert(base, other, "unrun");
  assertRuleSkipped(other, "unrun");
  assert.match(ruleResult(other).inspected.surfaces[0].reason, /^1 adopter-run gate\(s\) recorded \(0 failed, 0 invalid/);
});

test("C4.5 · a recorded failure and an invalid record move nothing but the reason; the rule never warns [RED-FIRST for the reason text]", () => {
  const base = baseline();
  for (const [name, expected] of [
    ["adopter-gates-failed", /\(1 failed, 0 invalid/],
    ["adopter-gates-thin-provenance", /\(0 failed, 1 invalid/],
  ]) {
    const other = envelopeFor(gateBlock(name));
    assertCreditInert(base, other, name);
    assertTopEqual(base, other, name);
    assertRuleSkipped(other, name);
    assert.match(ruleResult(other).inspected.surfaces[0].reason, expected, name);
    assert.equal(other.summary.warnings, base.summary.warnings, `${name}: no warning`);
    assert.equal(other.summary.failed, base.summary.failed, `${name}: no failure`);
    assert.equal(other.assurance.automated, base.assurance.automated, `${name}: automated count`);
    assert.equal(other.assurance.notEvaluated, base.assurance.notEvaluated, `${name}: not-evaluated count`);
  }
});

test("C4.6 · the Standard 25 envelope is unchanged: same keys, same schemaVersion, no adopterGates key [RED-FIRST for the reason text]", () => {
  const base = baseline();
  const other = envelopeFor(creditBlock());
  assert.deepEqual(Object.keys(other).sort(), Object.keys(base).sort());
  assert.equal(other.schemaVersion, base.schemaVersion);
  const hasKey = (v) =>
    v !== null && typeof v === "object" && Object.entries(v).some(([k, x]) => k === "adopterGates" || hasKey(x));
  assert.equal(hasKey(other), false, "no adopterGates key anywhere in the validate envelope");
  for (const section of ["summary", "assurance", "denominator", "frameworkCoverage"]) {
    assert.deepEqual(Object.keys(other[section] ?? {}).sort(), Object.keys(base[section] ?? {}).sort(), section);
  }
});

test("C4.7 · source guard: scripts/compliance.mjs does not mention adopterGates or adopter-gates", () => {
  const source = readFileSync(path.join(HOME, "scripts/compliance.mjs"), "utf8");
  assert.doesNotMatch(source, /adopterGates|adopter-gates/);
});

test("C4.8 · the catalog entry is assurance none and says what it cannot establish; assurance:check passes [RED-FIRST]", async () => {
  const catalog = await loadCatalog();
  const rule = catalog.rules.get(RULE);
  assert.ok(rule, `${RULE} is catalogued`);
  assert.equal(rule.assurance, "none");
  assert.match(rule.$assuranceNote ?? rule.assuranceNote ?? "", /cannot establish that the gate was run/);
  const check = spawnSync(process.execPath, [path.join(HOME, "scripts/assurance.mjs"), "--check"], { encoding: "utf8", cwd: HOME });
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
  const report = readFileSync(path.join(HOME, "docs/assurance-report.md"), "utf8");
  assert.ok(report.includes(RULE), "docs/assurance-report.md lists the rule");
});

test("C4.8 · registration: the registers agree, the surface is registered, and the catalog counts are 88 / 59 / 6 [RED-FIRST]", async () => {
  const catalog = await loadCatalog();
  assert.ok(catalog.rules.has(RULE));
  assert.ok(EVALUATED_RULES.includes(RULE));
  assert.deepEqual(RULE_SURFACES.get(RULE), { subject: "project", surfaces: ["adopter-gates"] });
  assert.ok(SURFACES.has("adopter-gates"));
  assert.equal(SURFACE_LABELS["adopter-gates"], "adopter-run gate references");
  const c = coverage(catalog, { evaluated: EVALUATED_RULES });
  // Owner-accepted: Option A takes fullyMachineRepresentedStandards from 7 to 6 (Standard 19 loses it).
  assert.equal(c.cataloguedRules, 88);
  assert.equal(c.evaluatedRules, 59);
  assert.equal(c.fullyMachineRepresentedStandards, 6);
});

test("C4.9 · required-level pin: no input makes the rule score, pass or raise anything [RED-FIRST for existence]", () => {
  const base = baseline();
  const variants = [
    ["key absent", ""],
    ["empty list", "adopterGates: []\n"],
    ["only unrun", gateBlock("adopter-gates-unrun")],
    ["valid passed", gateBlock("adopter-gates-passed")],
  ];
  for (const [label, block] of variants) {
    const env = envelopeFor(block + REQUIRED);
    assertRuleSkipped(env, label);
    assert.equal(ruleResult(env).level, "required", `${label}: the level setting is honoured but inert`);
    assertTopEqual(base, env, label);
    assert.equal(env.score, 100, label);
    assert.equal(env.denominator.scored, 22, label);
  }
});

test("C4.10 · required-level, recorded failure or invalid record: still skipped; a failure cannot lower a score under Option A [RED-FIRST for existence]", () => {
  const base = baseline();
  for (const name of ["adopter-gates-failed", "adopter-gates-thin-provenance", "adopter-gates-duplicate-id"]) {
    const env = envelopeFor(gateBlock(name) + REQUIRED);
    assertRuleSkipped(env, name);
    assertTopEqual(base, env, name);
    assert.equal(env.status, "COMPLIANT", name);
    assert.equal(env.score, 100, name);
    assert.equal(env.denominator.scored, 22, name);
  }
});

test("C4.11 · an attestation against the non-attestable rule is refused: failed / invalid-attestation, downward only [RED-FIRST]", () => {
  const attestation =
    `attestations:\n  ${RULE}:\n    status: approved\n    reviewedBy: "a reviewer"\n    reviewedAt: "2026-01-15"\n` +
    `    evidence: "reviewed the gate records"\n`;
  const without = envelopeFor(gateBlock("adopter-gates-passed"));
  const withAtt = envelopeFor(gateBlock("adopter-gates-passed") + attestation);
  const r = ruleResult(withAtt);
  assert.ok(r, `${RULE} has a result`);
  assert.equal(r.status, "failed");
  assert.equal(r.disposition, "invalid-attestation");
  assert.equal(withAtt.assurance.automated, without.assurance.automated + 1);
  assert.equal(withAtt.assurance.notEvaluated, without.assurance.notEvaluated - 1);
  assert.equal(withAtt.summary.failed, without.summary.failed + 1);
  assert.equal(withAtt.summary.skipped, without.summary.skipped - 1);
  assert.equal(withAtt.denominator.scored, without.denominator.scored + 1);
  assert.equal(withAtt.status, "NON_COMPLIANT");
  assert.ok(withAtt.score < 100, `score ${withAtt.score}`);
});

// ---------------------------------------------------------------------------
// Reporting shape (design, "Report wording")
// ---------------------------------------------------------------------------

test("audit --json: the adopterGates key has the specified shape on every input [RED-FIRST]", () => {
  for (const name of ["math-compliant", "adopter-gates-unrun", "adopter-gates-failed"]) {
    const env = auditJson(fixture(name));
    assert.ok(env.adopterGates, `${name}: adopterGates present`);
    assert.deepEqual(Object.keys(env.adopterGates).sort(), ["executedByFramework", "gates", "summary"]);
    assert.equal(env.adopterGates.executedByFramework, 0);
  }
  assert.deepEqual(reportOf(fixture("math-compliant")).gates, []);
  const [g] = reportOf(fixture("adopter-gates-failed")).gates;
  assert.deepEqual(Object.keys(g).sort(), ["declared", "errors", "execution", "id", "label", "reported", "result", "valid", "version"]);
  assert.deepEqual(g.declared, { state: "executed", outcome: "failed" });
});

test("--provenance prints the surface reason, not 'nothing of this kind was present', when gates are recorded [RED-FIRST]", () => {
  const withGate = run(["validate", `--dir=${fixture("adopter-gates-failed")}`, "--provenance"]).out;
  const section = withGate.slice(withGate.indexOf(RULE));
  const block = section.slice(0, section.indexOf("Result:"));
  assert.match(block, /1 adopter-run gate\(s\) recorded \(1 failed, 0 invalid/);
  assert.doesNotMatch(block, /nothing of this kind was present/);
  assert.doesNotMatch(block, /This is not a failure/);
  assert.match(block, /Adopter-asserted records are listed by `audit`; they are not inspected as evidence\./);
  const without = run(["validate", `--dir=${fixture("math-compliant")}`, "--provenance"]).out;
  assert.match(without.slice(without.indexOf(RULE)).slice(0, 400), /nothing of this kind was present/);
});

test("the default validate render says nothing about gates (surface reasons print only for blocked rows) [RED-FIRST]", () => {
  const text = run(["validate", `--dir=${fixture("adopter-gates-failed")}`]).out;
  assert.doesNotMatch(text, /adopter-run gate\(s\) recorded/);
});

test("template and schema carry the adopterGates definition [RED-FIRST]", () => {
  const schema = JSON.parse(readFileSync(path.join(HOME, "schemas/project-policy.schema.json"), "utf8"));
  assert.ok(schema.properties.adopterGates, "schema property adopterGates");
  assert.ok(schema.$defs.adopterGate, "schema $defs.adopterGate");
  assert.deepEqual(schema.$defs.adopterGate.required.slice().sort(), ["execution", "id", "result", "version"]);
  assert.equal(schema.$defs.adopterGate.additionalProperties, false);
  const template = readFileSync(path.join(HOME, "templates/project-policy.yml"), "utf8");
  assert.match(template, /Adopter verification gates/);
  assert.match(template, /#\s*adopterGates:/);
});
