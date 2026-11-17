/**
 * FE-33 (#64) — an explicit structured `scope: point` for computation.scope-declared.
 *
 * Design: design/fe64-explicit-point-scope.md (frozen, owner decisions 1-13b). Written before the
 * change. Each test names the criterion it answers:
 *
 *   C1  computation.scope-declared accepts an explicit structured `scope: point`.
 *   C2  The free-text Quantifiers field is never parsed for point scope.
 *   C3  Missing scope remains a refusal condition.
 *   C7  A scope-contradiction check on the declaration (owner Choice 7 / 13b); consistency checking,
 *       never inference of point scope.
 *
 * Labels follow the design: RED-FIRST tests fail on main before the change; PASS-TODAY tests are
 * characterization pins that pass before and after; the C2.5 mutation guard lives in
 * scripts/mutation-check.mjs and runs this file as its gate.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import * as claims from "../scripts/claims.mjs";
import { HOME, run, scratch } from "./helpers/cli.mjs";

const { parseLedger } = claims;
const RULE = "computation.scope-declared";
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const audit = (name, ...extra) => run(["audit", `--dir=${fixture(name)}`, "--json", ...extra]);
const auditJson = (name) => JSON.parse(audit(name).out);
const ruleFindings = (name) => auditJson(name).findings.filter((f) => f.rule === RULE);
const evidenceLines = (name) => ruleFindings(name).flatMap((f) => f.evidence);
/** The text of the one evidence line for `id`, with the `<ledger>:<line> ` prefix removed; null if none. */
const lineFor = (name, id) => {
  const hits = evidenceLines(name).filter((l) => l.includes(` ${id} — `));
  assert.ok(hits.length <= 1, `${id}: more than one line: ${JSON.stringify(hits)}`);
  return hits.length === 0 ? null : hits[0].replace(/^\S+:\d+ /, "");
};
const validateRule = (name) => {
  const out = JSON.parse(run(["validate", `--dir=${fixture(name)}`, "--json"]).out);
  return { out, result: out.results.find((r) => r.ruleId === RULE) };
};
const ledgerEvidence = (name, id) =>
  parseLedger(readFileSync(path.join(fixture(name), "artifacts/claims-ledger.md"), "utf8")).entries.get(id).evidence;

const NO_RANGE = "computational evidence states no range";
const NO_ARITH = "computational evidence states no arithmetic";
const unrecognised = (value) =>
  `computational evidence declares scope "${value}"; the only structured scope value is "point"`;
const MALFORMED =
  'computational evidence begins with "scope:" but is not a valid scope declaration; the key is written "scope: point;" or "scope: point," as the first words, followed by the rest of the description';
const contradiction = (quoted) =>
  `computational evidence declares scope: point but also states "${quoted}"; a point declaration cannot be combined with a range, exhaustive or universal claim (scope-contradiction)`;

// ---------------------------------------------------------------------------
// C1 — scope: point is accepted
// ---------------------------------------------------------------------------

test("C1.1 · parseLedger reads scope: point from an evidence item [RED-FIRST]", () => {
  const [item] = ledgerEvidence("scope-point-declared", "CLM-0001");
  assert.equal(item.scope.kind, "point");
  assert.equal(item.scope.value, "point");
});

test("C1.2 · audit reports nothing for the declared-point fixture [RED-FIRST]", () => {
  assert.deepEqual(auditJson("scope-point-declared").findings, []);
  for (const id of ["CLM-0001", "CLM-0002", "CLM-0003", "CLM-0004", "CLM-0005"]) {
    assert.equal(lineFor("scope-point-declared", id), null, id);
  }
});

test("C1.3 · validate passes computation.scope-declared on the declared-point fixture [RED-FIRST]", () => {
  assert.equal(validateRule("scope-point-declared").result.status, "passed");
});

test("C1.4a · a point declaration with no arithmetic word is reported [PASS-TODAY]", () => {
  assert.notEqual(lineFor("scope-point-malformed", "CLM-0020"), null);
});

test("C1.4b · that line is exactly the preserved `states no arithmetic` wording [RED-FIRST]", () => {
  assert.equal(lineFor("scope-point-malformed", "CLM-0020"), `CLM-0020 — ${NO_ARITH}`);
});

test("C1.5a · an ordinary range claim is still accepted [PASS-TODAY]", () => {
  assert.equal(lineFor("scope-point-declared", "CLM-0002"), null);
});

test("C1.5b · an evidence item with no scope: key has scope.kind none [RED-FIRST]", () => {
  const [item] = ledgerEvidence("scope-point-declared", "CLM-0002");
  assert.equal(item.scope.kind, "none");
});

test("C1.5c · `scope:point;` and `scope: point,` parse as kind point [RED-FIRST]", () => {
  for (const detail of ["scope:point; x", "scope: point, x"]) {
    const text = `# L\n\n## CLM-0001 — t\n\n- **Status:** COMPUTATIONAL_VERIFICATION\n- **Evidence:**\n  - computational — ${detail}\n`;
    const [item] = parseLedger(text).entries.get("CLM-0001").evidence;
    assert.equal(item.scope.kind, "point", detail);
  }
});

test("C1.6 · a non-computational item with scope: point adds no finding and exempts nothing [PASS-TODAY]", () => {
  const dir = scratch();
  try {
    mkdirSync(path.join(dir, "artifacts"), { recursive: true });
    writeFileSync(
      path.join(dir, "artifacts/claims-ledger.md"),
      [
        "# Claims ledger",
        "",
        "## CLM-0001 — Mixed evidence",
        "",
        "- **Status:** COMPUTATIONAL_VERIFICATION",
        "- **Statement:** B < 1.",
        "- **Domain:** x",
        "- **Quantifiers:** none",
        "- **Assumptions:** none",
        "- **Depends:** none",
        "- **Obligations:** none",
        "- **Equivalences:** none",
        "- **Evidence:**",
        "  - proof — scope: point; exact interval arithmetic, `proofs/a.md`",
        "  - computational — certified interval arithmetic at s0 = 1/2",
        "- **Formal:** none",
        "- **History:**",
        "  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (ran)",
        "",
      ].join("\n"),
    );
    const out = JSON.parse(run(["audit", `--dir=${dir}`, "--json"]).out);
    const lines = out.findings.filter((f) => f.rule === RULE).flatMap((f) => f.evidence);
    assert.equal(lines.length, 1, JSON.stringify(lines));
    assert.match(lines[0], /CLM-0001 — computational evidence states no range$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("C1.7 · the classifier over every probed boundary case [RED-FIRST]", () => {
  const NBSP = " ";
  const table = [
    ["scope: point;", "point"],
    ["scope:point;", "point"],
    ["scope: point,", "point"],
    ["scope: point", "point"],
    ["scope: point ; x", "point"],
    ["scope: point\t; x", "point"],
    ["scope: point;;", "point"],
    ["scope: point.", "unrecognised", "point."],
    ["scope: point.; x", "unrecognised", "point."],
    ["scope: point:x", "unrecognised", "point:x"],
    ["scope: point/x", "unrecognised", "point/x"],
    ["scope: point. exact interval", "malformed"],
    ["scope: point at s0 = 1/2; x", "malformed"],
    [`scope: point${NBSP}; x`, "malformed"],
    ["scope: ; x", "unrecognised", ""],
    ["scope:", "unrecognised", ""],
    ["scope: Point;", "unrecognised", "Point"],
    ["scope: points; x", "unrecognised", "points"],
    ["scope: range; x", "unrecognised", "range"],
    ["Scope: point;", "none"],
    ["x scope: point;", "none"],
    ["scope : point;", "none"],
    ["exact interval arithmetic", "none"],
  ];
  for (const [detail, kind, value] of table) {
    const got = claims.classifyScope(detail);
    assert.equal(got.kind, kind, JSON.stringify(detail));
    if (kind === "unrecognised") assert.equal(got.value, value, JSON.stringify(detail));
    if (kind === "point") assert.equal(got.value, "point", JSON.stringify(detail));
  }
  assert.equal(claims.classifyScope("scope: point; rest here").rest, "rest here");
});

// ---------------------------------------------------------------------------
// C2 — Quantifiers is never read for scope
// ---------------------------------------------------------------------------

test("C2.1 · `Quantifiers: single point` with no structured scope is reported [PASS-TODAY]", () => {
  assert.equal(lineFor("scope-point-missing", "CLM-0010"), `CLM-0010 — ${NO_RANGE}`);
});

test("C2.2 · `Quantifiers: scope: point` (wrong field) is reported [PASS-TODAY]", () => {
  assert.equal(lineFor("scope-point-missing", "CLM-0011"), `CLM-0011 — ${NO_RANGE}`);
});

test("C2.3 · a point stated only in Statement and Domain is reported [PASS-TODAY]", () => {
  assert.equal(lineFor("scope-point-missing", "CLM-0012"), `CLM-0012 — ${NO_RANGE}`);
});

test("C2.4 · structured scope: point with universal Quantifiers prose is accepted [RED-FIRST]", () => {
  assert.equal(lineFor("scope-point-declared", "CLM-0003"), null);
  const entry = parseLedger(readFileSync(path.join(fixture("scope-point-declared"), "artifacts/claims-ledger.md"), "utf8")).entries.get("CLM-0003");
  assert.match(entry.quantifiers, /universal/);
});

test("C2.6 · a mis-cased or mid-text key is class none, not scope-malformed [PASS-TODAY]", () => {
  assert.equal(lineFor("scope-point-malformed", "CLM-0022"), `CLM-0022 — ${NO_RANGE}`);
  assert.equal(lineFor("scope-point-malformed", "CLM-0023"), `CLM-0023 — ${NO_RANGE}`);
});

// ---------------------------------------------------------------------------
// C3 — missing or invalid scope stays a refusal
// ---------------------------------------------------------------------------

test("C3.1 · the scope-less fixture yields exactly three error/INFERRED lines [PASS-TODAY]", () => {
  const findings = ruleFindings("scope-point-missing");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.equal(findings[0].label, "INFERRED");
  assert.equal(findings[0].evidence.length, 3);
  for (const id of ["CLM-0010", "CLM-0011", "CLM-0012"]) assert.notEqual(lineFor("scope-point-missing", id), null, id);
});

test("C3.2 · validate reports the rule failed / error / required on the scope-less fixture [PASS-TODAY]", () => {
  const { result } = validateRule("scope-point-missing");
  assert.equal(result.status, "failed");
  assert.equal(result.severity, "error");
  assert.equal(result.level, "required");
});

test("C3.3 · the malformed fixture reports one line per claim and accepts none [RED-FIRST]", () => {
  const expected = {
    "CLM-0020": NO_ARITH,
    "CLM-0021": unrecognised("points"),
    "CLM-0022": NO_RANGE,
    "CLM-0023": NO_RANGE,
    "CLM-0024": unrecognised("range"),
    "CLM-0025": unrecognised(""),
    "CLM-0026": MALFORMED,
    "CLM-0027": MALFORMED,
    "CLM-0028": unrecognised("Point"),
  };
  assert.equal(evidenceLines("scope-point-malformed").length, Object.keys(expected).length);
  for (const [id, text] of Object.entries(expected)) {
    assert.equal(lineFor("scope-point-malformed", id), `${id} — ${text}`, id);
  }
});

test("C3.4 · no fallback to unrelated range wording (Choice 3) [RED-FIRST]", () => {
  assert.equal(lineFor("scope-point-malformed", "CLM-0024"), `CLM-0024 — ${unrecognised("range")}`);
  assert.equal(lineFor("scope-point-malformed", "CLM-0027"), `CLM-0027 — ${MALFORMED}`);
});

test("C3.5 · a malformed key never collapses into `states no range` (Choice 12) [RED-FIRST]", () => {
  for (const id of ["CLM-0026", "CLM-0027"]) {
    const line = lineFor("scope-point-malformed", id);
    assert.ok(line.endsWith(MALFORMED), id);
    assert.doesNotMatch(line, /states no range/);
  }
});

test("C3.6 · the catalog entry keeps level, severity, type, assurance, introducedIn [PASS-TODAY]", async () => {
  const rule = (await loadCatalog(path.join(HOME, "rules"))).rules.get(RULE);
  assert.equal(rule.level, "required");
  assert.equal(rule.severity, "error");
  assert.equal(rule.validationType, "document");
  assert.equal(rule.nonExemptible, false);
  assert.equal(rule.assurance, "partial");
  assert.equal(rule.introducedIn, "1.0.0");
});

for (const [label, name] of [
  ["C3.7a", "scope-point-missing"],
  ["C3.7b", "scope-point-malformed"],
  ["C3.7c", "scope-point-contradictory"],
]) {
  test(`${label} · ${name}: failed/error, no BLOCKED, audit exits 0 and --strict exits 1 [PASS-TODAY]`, () => {
    const { out, result } = validateRule(name);
    assert.equal(result.status, "failed");
    assert.equal(result.severity, "error");
    assert.equal(result.level, "required");
    assert.doesNotMatch(JSON.stringify(out), /BLOCKED/);
    assert.equal(audit(name).code, 0);
    assert.equal(audit(name, "--strict").code, 1);
  });
}

// ---------------------------------------------------------------------------
// C7 — scope-contradiction
// ---------------------------------------------------------------------------

test("C7.1 · each contradiction is one scope-contradiction line quoting the matched text [RED-FIRST]", () => {
  const quoted = {
    "CLM-0030": "exhaustive",
    "CLM-0031": "for all",
    "CLM-0032": "n <= 1000",
    "CLM-0033": "universally",
    "CLM-0035": "all values",
  };
  for (const [id, q] of Object.entries(quoted)) {
    assert.equal(lineFor("scope-point-contradictory", id), `${id} — ${contradiction(q)}`, id);
  }
});

test("C7.2 · a contradiction and a missing arithmetic word yield only the contradiction [RED-FIRST]", () => {
  assert.equal(lineFor("scope-point-contradictory", "CLM-0034"), `CLM-0034 — ${contradiction("exhaustive")}`);
});

test("C7.3 · none of CLM-0030..0035 is accepted as a point [RED-FIRST]", () => {
  assert.equal(evidenceLines("scope-point-contradictory").length, 6);
  for (const id of ["CLM-0030", "CLM-0031", "CLM-0032", "CLM-0033", "CLM-0034", "CLM-0035"]) {
    assert.notEqual(lineFor("scope-point-contradictory", id), null, id);
  }
});

test("C7.4 · a bare `all` and a tolerance 10^-9 are not contradictions [PASS-TODAY]", () => {
  assert.equal(lineFor("scope-point-declared", "CLM-0004"), null);
});

test("C7.4b · range-looking words inside backticks (the program path) are not read [PASS-TODAY]", () => {
  assert.equal(lineFor("scope-point-declared", "CLM-0005"), null);
});

const matches = (s) => claims.findScopeContradiction(s)?.text ?? null;

test("C7.5 · the pattern table matches and quotes exactly as specified [RED-FIRST]", () => {
  const match = [
    ["exhaustive check", "exhaustive"],
    ["exhaustively", "exhaustively"],
    ["for all n", "for all"],
    ["for every", "for every"],
    ["∀ s", "∀"],
    ["universally valid", "universally"],
    ["all values", "all values"],
    ["all integers", "all integers"],
    ["all sufficiently large n", "all sufficiently large"],
    ["n <= 100", "n <= 100"],
    ["n <= 10^9", "n <= 10^9"],
    ["n <= 1000", "n <= 1000"],
    ["up to 100", "up to 100"],
    ["up to 50 digits of precision", "up to 50"],
    ["first 1000 primes", "first 1000 primes"],
    ["10^9", "10^9"],
    ["10**9", "10**9"],
    ["exhaustive up to 10^9", "exhaustive"],
  ];
  for (const [text, quoted] of match) assert.equal(matches(text), quoted, text);
  const none = [
    "all arithmetic is exact",
    "all endpoints are exact",
    "every interval is certified",
    "random seed 7",
    "sample point",
    "tolerance 10^-9",
    "`computations/exhaustive-all.py`",
    "up to",
  ];
  for (const text of none) assert.equal(matches(text), null, text);
  const falsePositives = [
    "all values are exact rationals",
    "all inputs are exact rationals",
    "up to 50 digits of precision",
    "exhaustive subdivision of the interval",
    "for each endpoint",
    "every point is exact",
    "certified across the interval endpoints at s0",
  ];
  for (const text of falsePositives) assert.notEqual(matches(text), null, `accepted false positive: ${text}`);
});

test("C7.5 · a backtick code span is stripped before scanning [RED-FIRST]", () => {
  assert.equal(matches("exact `computations/exhaustive-all.py` arithmetic"), null);
});

test("C7.5b · the Choice 13b vocabulary, with no carve-outs [RED-FIRST]", () => {
  const match = [
    ["all points in [0,1] checked", "all points"],
    ["all intervals tested", "all intervals"],
    ["all of the subintervals", "all of the subintervals"],
    ["every s in [0,1]", "every s"],
    ["for arbitrary n", "for arbitrary"],
    ["infinitely many", "infinitely many"],
    ["across the full range", "across the full range"],
    ["entire interval", "entire interval"],
    ["random sample", "random sample"],
    ["sampled on a grid", "sampled on"],
    ["exhaustive search", "exhaustive"],
    ["for each n", "for each"],
    ["for any parameter value", "for any"],
    ["all values checked", "all values"],
  ];
  for (const [text, quoted] of match) assert.equal(matches(text), quoted, text);
  for (const text of ["every interval is certified", "random seed 7", "sample point", "all endpoints are exact"]) {
    assert.equal(matches(text), null, text);
  }
});

test("C7.5c · the quoted text is cut to 40 characters, no ellipsis [RED-FIRST]", () => {
  const got = matches("first 1000 primes" + "x".repeat(60));
  assert.equal(got.length, 40);
});

test("C7.6 · the check runs only for class point [PASS-TODAY / RED-FIRST for CLM-0027]", () => {
  assert.equal(lineFor("scope-point-declared", "CLM-0002"), null);
  assert.equal(lineFor("scope-point-malformed", "CLM-0027"), `CLM-0027 — ${MALFORMED}`);
});

test("C7.7 · the check reads only the item's own detail, not Quantifiers/Statement/Domain [RED-FIRST]", () => {
  assert.equal(lineFor("scope-point-declared", "CLM-0003"), null);
});
