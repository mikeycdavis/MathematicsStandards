/**
 * FE-29 (#60) — a barrier is a profile, not a verdict.
 *
 * Design: design/fe60-barrier-profiles.md (frozen 2026-11-17). Written before the module, the rule
 * and the rewording. Every test here fails against main for the right reason: the module
 * scripts/barriers.mjs does not exist, so the file does not load, and the CLI tests assert the new
 * rule id, the new report line or the new JSON key, never only an exit code.
 *
 *   C0  A structured barrier profile is adopted.
 *   C1  It records identity/statement, scope, what it rules out, what it does not rule out, and
 *       evidence or a reference.
 *   C2  The NEXP-not-in-ACC0 counterexample is representable.
 *   C3  A barrier profile is descriptive evidence and never a prohibition verdict.
 *
 * Guards that pass on main today (G1 to G5) are in test/fe60-barrier-guards.test.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import * as barriers from "../scripts/barriers.mjs";
import { BARRIERS_HEADING, FIELD_KEYS, parseBarriers } from "../scripts/barriers.mjs";
import { loadCatalog } from "../scripts/catalog.mjs";
import { EVALUATED_RULES } from "../scripts/evaluated.mjs";
import { RULE_SURFACES } from "../scripts/surfaces.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const RULE = "problems.barrier-profiles-valid";
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const read = (rel) => readFileSync(path.join(HOME, rel), "utf8");
const auditJson = (name) => JSON.parse(run(["audit", `--dir=${fixture(name)}`, "--json"]).out);
const findingsFor = (name) => auditJson(name).findings.filter((f) => f.rule === RULE);
const validateJson = (name) => JSON.parse(run(["validate", `--dir=${fixture(name)}`, "--json"]).out);

/** A problem record whose only interesting section is Known Barriers. */
const record = (body) =>
  `# P\n\n## Target Statement\n\nT.\n\n## Known Barriers\n\n${body}\n\n## Current Blocker\n\n- A.\n`;
const parse = (body) => parseBarriers(record(body));

/** Profile G of the design, line by line. */
const G_LINES = ["### B", "Statement: S.", "Scope: C.", "Rules out: R.", "Does not rule out: N.", "Evidence: notes/b.md"];
const G = G_LINES.join("\n");
const without = (label) => G_LINES.filter((l) => !l.startsWith(label)).join("\n");
const replacing = (label, line) => G_LINES.map((l) => (l.startsWith(label) ? line : l)).join("\n");
const after = (label, ...extra) => G_LINES.flatMap((l) => (l.startsWith(label) ? [l, ...extra] : [l])).join("\n");

const NEVER = /never a prohibition verdict/;

// ---------------------------------------------------------------------------
// T1 — C1: the five fields, in any order, in any of the three value forms
// ---------------------------------------------------------------------------

test("T1 · G parses with all five fields", () => {
  const result = parse(G);
  assert.equal(result.status, "profiles");
  assert.deepEqual(result.problems, []);
  assert.equal(result.profiles.length, 1);
  const [p] = result.profiles;
  assert.equal(p.name, "B");
  assert.equal(p.statement, "S.");
  assert.equal(p.scope, "C.");
  assert.deepEqual(p.rulesOut, ["R."]);
  assert.deepEqual(p.doesNotRuleOut, ["N."]);
  assert.equal(p.evidence, "notes/b.md");
  assert.deepEqual(p.problems, []);
});

test("T1 · the order of the fields carries no meaning", () => {
  const reversed = [G_LINES[0], ...G_LINES.slice(1).reverse()].join("\n");
  const a = parse(G);
  const b = parse(reversed);
  assert.deepEqual(b.problems, []);
  assert.deepEqual(b.profiles, a.profiles);
});

test("T1 · inline, list and indented-continuation forms give the same fields", () => {
  const inline = parse(G).profiles[0];
  const list = parse(
    ["### B", "Statement: S.", "Scope: C.", "Rules out:", "- R.", "Does not rule out:", "- N.", "Evidence: notes/b.md"].join("\n"),
  );
  assert.deepEqual(list.problems, []);
  assert.deepEqual(list.profiles[0], inline);
  const continued = parse(replacing("Scope:", "Scope: C,\n  continued here."));
  assert.deepEqual(continued.problems, []);
  assert.equal(continued.profiles[0].scope.replace(/\s+/g, " "), "C, continued here.");
});

test("T1 · list items under an exclusion field are its items, in the order written", () => {
  const result = parse(replacing("Rules out:", "Rules out:\n- one\n- two\n- three"));
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.profiles[0].rulesOut, ["one", "two", "three"]);
});

test("T1 · the field labels are exactly the five, matched case-insensitively", () => {
  assert.deepEqual([...FIELD_KEYS].sort(), ["does not rule out", "evidence", "rules out", "scope", "statement"]);
  const shouted = G_LINES.map((l, i) => (i === 0 ? l : l.replace(/^[^:]+/, (m) => m.toUpperCase()))).join("\n");
  assert.deepEqual(parse(shouted).problems, []);
});

// ---------------------------------------------------------------------------
// T2 — C1: a missing or empty field is a problem naming the field
// ---------------------------------------------------------------------------

for (const label of ["Statement", "Scope", "Rules out", "Does not rule out", "Evidence"]) {
  test(`T2 · missing ${label}: is one problem naming it`, () => {
    const result = parse(without(`${label}:`));
    assert.equal(result.problems.length, 1, JSON.stringify(result.problems));
    assert.match(result.problems[0], new RegExp(`missing field '${label.toLowerCase()}:'`));
  });
}

test("T2 · an empty Scope: is a missing field", () => {
  const result = parse(replacing("Scope:", "Scope:"));
  assert.equal(result.problems.length, 1, JSON.stringify(result.problems));
  assert.match(result.problems[0], /missing field 'scope:'/);
});

// ---------------------------------------------------------------------------
// T3 — C1: none is an answer for the two exclusion fields only
// ---------------------------------------------------------------------------

test("T3 · none is a valid Rules out: and Does not rule out:", () => {
  for (const line of ["Rules out: none", "Rules out: None."]) {
    assert.deepEqual(parse(replacing("Rules out:", line)).problems, [], line);
  }
  for (const line of ["Does not rule out: none", "Does not rule out: None."]) {
    assert.deepEqual(parse(replacing("Does not rule out:", line)).problems, [], line);
  }
  assert.deepEqual(parse(replacing("Rules out:", "Rules out: none")).profiles[0].rulesOut, []);
});

test("T3 · none is rejected for Statement: and Scope:", () => {
  for (const label of ["Statement", "Scope"]) {
    const result = parse(replacing(`${label}:`, `${label}: none`));
    assert.equal(result.problems.length, 1, JSON.stringify(result.problems));
    assert.match(result.problems[0], new RegExp(`'${label.toLowerCase()}:'.*cannot be none`));
  }
});

test("T3 · none followed by list items, in either exclusion field, is one problem (choice 14)", () => {
  for (const label of ["Rules out", "Does not rule out"]) {
    const result = parse(replacing(`${label}:`, `${label}: none\n- foo`));
    assert.equal(result.problems.length, 1, `${label}: ${JSON.stringify(result.problems)}`);
    assert.match(result.problems[0], /none contradicts the items that follow/);
  }
});

// ---------------------------------------------------------------------------
// T4 — C1: Evidence is a stated reference, and nothing is resolved
// ---------------------------------------------------------------------------

test("T4 · a bare citation, and none, are not a reference", () => {
  for (const value of ["Baker 1975", "Baker, Gill and Solovay, 1975", "none"]) {
    const result = parse(replacing("Evidence:", `Evidence: ${value}`));
    assert.equal(result.problems.length, 1, `${value}: ${JSON.stringify(result.problems)}`);
    assert.match(result.problems[0], /evidence states no reference/);
  }
});

test("T4 · a URL, a path and 'commit <sha>' are references; nothing is resolved", () => {
  for (const value of [
    "https://example.org/b",
    "commit 3475ec4",
    "notes/does-not-exist-anywhere.md",
    "notes/b.md (Baker, Gill and Solovay, 1975)",
  ]) {
    assert.deepEqual(parse(replacing("Evidence:", `Evidence: ${value}`)).problems, [], value);
  }
});

test("T4 · documents the shared predicate's false accepts, so tightening it is a visible change", () => {
  // KNOWN WEAKNESS of hasReference (scripts/attempts.mjs), shared with FE-28 and not changed here:
  // any token containing a slash counts as path-shaped. If hasReference is tightened these four
  // flip to problems and this test must change on purpose.
  for (const value of ["Razborov/Rudich 1997", "see BARRIERS.md", "TBD/unknown", "n/a"]) {
    assert.deepEqual(parse(replacing("Evidence:", `Evidence: ${value}`)).problems, [], value);
  }
});

// ---------------------------------------------------------------------------
// T5 — C1: the forms a section can take
// ---------------------------------------------------------------------------

test("T5 · profiles, none and none recorded are valid section forms", () => {
  assert.equal(parse(G).status, "profiles");
  for (const body of ["none", "None.", "None recorded.", "NONE RECORDED", "none recorded"]) {
    const result = parse(body);
    assert.equal(result.status, "none", body);
    assert.deepEqual(result.problems, [], body);
    assert.deepEqual(result.profiles, [], body);
  }
});

test("T5 · prose, an explained none, an empty section and an absent section are reported by the parser", () => {
  const prose = parse("Some prose.");
  assert.equal(prose.status, "prose");
  assert.equal(prose.problems.length, 1);
  assert.match(prose.problems[0], /prose with no '### <barrier>' profile and not an explicit 'none'/);

  const explained = parse("None - nothing known.");
  assert.equal(explained.status, "prose");
  assert.equal(explained.problems.length, 1);

  const empty = parse("");
  assert.equal(empty.status, "empty");
  assert.equal(empty.problems.length, 1);

  const absent = parseBarriers("# P\n\n## Target Statement\n\nT.\n");
  assert.equal(absent.status, "absent");
  assert.equal(absent.problems.length, 1);
});

test("T5 · the section is read under its exact heading", () => {
  assert.equal(BARRIERS_HEADING, "## Known Barriers");
});

test("T5 · B5 through the CLI gives the new rule, and the existing rule stays quiet", () => {
  const found = findingsFor("barrier-profile-prose-only");
  assert.equal(found.length, 1, JSON.stringify(found));
  assert.ok(found[0].evidence.some((e) => /prose with no '### <barrier>' profile/.test(e)), JSON.stringify(found[0].evidence));
  assert.equal(found[0].label, "OBSERVED");
  assert.equal(found[0].severity, "warning");
  const existing = auditJson("barrier-profile-prose-only").findings.filter((f) => f.rule === "problems.barriers-recorded");
  assert.deepEqual(existing, []);
});

test("T5 · B2 (none recorded) has no barrier finding and reports status none", () => {
  const audit = auditJson("barrier-profile-none");
  assert.deepEqual(audit.findings.filter((f) => f.rule === RULE), []);
  assert.equal(audit.barrierProfiles.length, 1);
  assert.equal(audit.barrierProfiles[0].barriers.status, "none");
});

// ---------------------------------------------------------------------------
// T5b — C1, C3: text before the first profile, and labels that hide by indentation
// ---------------------------------------------------------------------------

test("T5b · text before the first profile is reported", () => {
  for (const [name, body] of [
    ["none-then-profile", `None.\n\n${G}`],
    ["verdict-before-profile", `Verdict: prohibited\n\n${G}`],
    ["prose-before-profile", `Some intro.\n\n${G}`],
  ]) {
    const result = parse(body);
    assert.equal(result.status, "profiles", name);
    assert.equal(result.problems.length, 1, `${name}: ${JSON.stringify(result.problems)}`);
    assert.match(result.problems[0], /before the first profile/, name);
  }
});

test("T5b · an indented or bulleted refused or field label is reported", () => {
  for (const [name, body] of [
    ["indented-verdict", after("Scope:", "  Verdict: prohibited")],
    ["bulleted-verdict", after("Scope:", "- Verdict: prohibited")],
    ["indented-known-label", after("Scope:", "  Evidence: x")],
  ]) {
    const result = parse(body);
    assert.equal(result.problems.length, 1, `${name}: ${JSON.stringify(result.problems)}`);
    assert.match(result.problems[0], /a field label must start at column 0/, name);
  }
});

test("T5b · a none with anything after it, on the same line or the next, is prose", () => {
  for (const body of ["None recorded. Relativization forbids diagonalization.", "None.\nRelativization forbids diagonalization."]) {
    const result = parse(body);
    assert.equal(result.status, "prose", body);
    assert.equal(result.problems.length, 1, body);
  }
});

// ---------------------------------------------------------------------------
// T6 — C1: duplicates, repeats, unknown fields, stray text
// ---------------------------------------------------------------------------

test("T6 · duplicate names are reported, one problem per profile, case-folded", () => {
  const same = parse(`${G}\n\n${G}`);
  assert.equal(same.profiles.length, 2);
  assert.equal(same.problems.length, 2, JSON.stringify(same.problems));
  const folded = parse(`${G}\n\n${G.replace("### B", "### b")}`);
  assert.equal(folded.problems.length, 2, JSON.stringify(folded.problems));
  assert.ok(folded.problems.every((p) => /duplicate/i.test(p)), JSON.stringify(folded.problems));
});

test("T6 · a repeated field, an unknown field and stray text are each one problem", () => {
  const repeated = parse(`${G}\nScope: again`);
  assert.equal(repeated.problems.length, 1, JSON.stringify(repeated.problems));
  assert.match(repeated.problems[0], /repeats the field 'scope:'/);

  const unknown = parse(`${G}\nSeverity: high`);
  assert.equal(unknown.problems.length, 1, JSON.stringify(unknown.problems));
  assert.match(unknown.problems[0], /unknown field 'severity:'/);

  const stray = parse(`${G}\nThis barrier is serious.`);
  assert.equal(stray.problems.length, 1, JSON.stringify(stray.problems));
  assert.match(stray.problems[0], /text outside any field/);
});

// ---------------------------------------------------------------------------
// T7a, T7b — C1, C2: the NEXP-not-in-ACC0 fixture
// ---------------------------------------------------------------------------

test("T7a · B1 has no barrier finding and lists two named profiles, each with five non-empty fields", () => {
  const audit = auditJson("barrier-profile-nexp-acc0");
  assert.deepEqual(audit.findings.filter((f) => f.rule === RULE), []);
  assert.deepEqual(audit.findings.map((f) => f.rule), ["claims.ledger-exists"]);
  assert.equal(audit.barrierProfiles.length, 1);
  const { barriers: section } = audit.barrierProfiles[0];
  assert.equal(section.status, "profiles");
  assert.deepEqual(section.profiles.map((p) => p.name), ["Natural proofs", "Relativization"]);
  for (const p of section.profiles) {
    assert.ok(p.statement && p.scope && p.evidence, p.name);
    assert.ok(p.rulesOut.length > 0 && p.doesNotRuleOut.length > 0, p.name);
    assert.deepEqual(p.problems, [], p.name);
  }
});

test("T7a · the text output lists both profiles", () => {
  const out = run(["audit", `--dir=${fixture("barrier-profile-nexp-acc0")}`]).out;
  assert.match(out, /Natural proofs: rules out 1, does not rule out 2, evidence stated/);
  assert.match(out, /Relativization: rules out 1, does not rule out 1, evidence stated/);
  assert.match(out, /p-vs-np\/problem\.md: 2 profile\(s\)/);
});

test("T7b · the NEXP item is under Does not rule out, never under Rules out", () => {
  const section = auditJson("barrier-profile-nexp-acc0").barrierProfiles[0].barriers;
  const natural = section.profiles.find((p) => p.name === "Natural proofs");
  assert.ok(natural.doesNotRuleOut.some((i) => /NEXP not in ACC0/.test(i)), JSON.stringify(natural.doesNotRuleOut));
  assert.ok(!natural.rulesOut.some((i) => /NEXP|ACC0/.test(i)), JSON.stringify(natural.rulesOut));
  assert.match(natural.evidence, /CCC 2011 \/ J\. ACM 2014/);
});

// ---------------------------------------------------------------------------
// T8 — C2: nothing is special-cased
// ---------------------------------------------------------------------------

test("T8 · an arbitrary token in place of NEXP not in ACC0 gives the same result", () => {
  const text = read("test/fixtures/barrier-profile-nexp-acc0/artifacts/open-problems/p-vs-np/problem.md");
  assert.match(text, /NEXP not in ACC0/);
  const swapped = text.replaceAll("NEXP not in ACC0", "zeta-quux");
  const a = parseBarriers(text);
  const b = parseBarriers(swapped);
  assert.deepEqual(b.problems, a.problems);
  assert.deepEqual(b.profiles.map((p) => [p.name, p.rulesOut.length, p.doesNotRuleOut.length]),
    a.profiles.map((p) => [p.name, p.rulesOut.length, p.doesNotRuleOut.length]));
});

test("T8 · scripts/barriers.mjs names neither NEXP nor ACC as a word", () => {
  const source = read("scripts/barriers.mjs");
  assert.doesNotMatch(source, /\bNEXP\b/i);
  assert.doesNotMatch(source, /\bACC\d*\b/i);
});

// ---------------------------------------------------------------------------
// T9 — C3: the seven verdict labels are refused by name
// ---------------------------------------------------------------------------

test("T9 · each of the seven labels is one problem carrying the never-a-prohibition-verdict message", () => {
  for (const label of ["Verdict", "Prohibition", "Prohibited", "Forbidden", "Banned", "Status", "Decision"]) {
    const result = parse(`${G}\n${label}: x`);
    assert.equal(result.problems.length, 1, `${label}: ${JSON.stringify(result.problems)}`);
    assert.match(result.problems[0], NEVER, label);
    assert.match(result.problems[0], new RegExp(`'${label}:'`, "i"), label);
  }
  assert.equal(parse(`${G}\nVERDICT: x`).problems.length, 1, "case-insensitive");
});

test("T9 · B6 through the CLI gives exactly one warning, the verdict-label message", () => {
  const found = findingsFor("barrier-profile-verdict-label");
  assert.equal(found.length, 1, JSON.stringify(found));
  assert.equal(found[0].evidence.length, 1, JSON.stringify(found[0].evidence));
  assert.match(found[0].evidence[0], /barrier 'Relativization' 'Verdict:' is a verdict label/);
  assert.match(found[0].evidence[0], NEVER);
});

test("T9 · B7 (missing scope) and B8 (free-text evidence) each give one warning", () => {
  const missing = findingsFor("barrier-profile-missing-scope");
  assert.equal(missing.length, 1);
  assert.equal(missing[0].evidence.length, 1);
  assert.match(missing[0].evidence[0], /missing field 'scope:'/);
  const free = findingsFor("barrier-profile-evidence-free-text");
  assert.equal(free.length, 1);
  assert.equal(free[0].evidence.length, 1);
  assert.match(free[0].evidence[0], /evidence states no reference/);
});

// ---------------------------------------------------------------------------
// T10 — C3: no path from a profile to a verdict, by source scan
// ---------------------------------------------------------------------------

/** The text of `function <name>(...) { ... }`, by brace matching. Null when absent. */
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) return null;
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open, i + 1);
  }
  return null;
}

// Deliberately brittle: a new consumer of profile data is how a barrier would acquire a verdict, so
// adding one must change this test, which makes it a visible decision. It cannot see a path that
// re-parses problem.md on its own; T11 and T12 cover the output side.
test("T10 · scripts/barriers.mjs is imported only by scripts/standards.mjs", () => {
  const importers = readdirSync(path.join(HOME, "scripts"))
    .filter((f) => f.endsWith(".mjs") && f !== "barriers.mjs")
    .filter((f) => /from\s+["']\.\/barriers\.mjs["']|import\(\s*["']\.\/barriers\.mjs["']/.test(read(`scripts/${f}`)));
  assert.deepEqual(importers, ["standards.mjs"]);
});

test("T10 · parseBarriers is called once, in barrierReport; barrierReport is called from exactly three places", () => {
  const source = read("scripts/standards.mjs");
  assert.equal((source.match(/\bparseBarriers\(/g) ?? []).length, 1, "parseBarriers( occurs once");
  const report = functionBody(source, "barrierReport");
  assert.ok(report, "barrierReport is defined");
  assert.match(report, /\bparseBarriers\(/);

  const calls = source.split("\n").filter((l) => /\bbarrierReport\(/.test(l) && !/function barrierReport\(/.test(l));
  assert.equal(calls.length, 3, JSON.stringify(calls));
  const detector = functionBody(source, "detectBarrierProfiles");
  const renderer = functionBody(source, "renderHuman");
  assert.ok(detector && renderer, "detectBarrierProfiles and renderHuman are defined");
  assert.match(detector, /\bbarrierReport\(/);
  assert.match(renderer, /\bbarrierReport\(/);
  assert.ok(calls.some((l) => /barrierProfiles:\s*barrierReport\(\)/.test(l)), "the JSON assembly");
});

test("T10 · detectBarrierProfiles makes exactly one report() call, for the new rule", () => {
  const detector = functionBody(read("scripts/standards.mjs"), "detectBarrierProfiles");
  assert.ok(detector);
  const sites = detector.match(/\breport\(/g) ?? [];
  assert.equal(sites.length, 1);
  assert.match(detector, /report\(\s*"problems\.barrier-profiles-valid"/);
});

// ---------------------------------------------------------------------------
// T11 — C3: the closed key set
// ---------------------------------------------------------------------------

test("T11 · the module exports exactly BARRIERS_HEADING, FIELD_KEYS and parseBarriers", () => {
  assert.deepEqual(Object.keys(barriers).sort(), ["BARRIERS_HEADING", "FIELD_KEYS", "parseBarriers"]);
});

test("T11 · a parsed profile has exactly the keys name, statement, scope, rulesOut, doesNotRuleOut, evidence, problems", () => {
  const [profile] = parse(G).profiles;
  assert.deepEqual(Object.keys(profile).sort(), ["doesNotRuleOut", "evidence", "name", "problems", "rulesOut", "scope", "statement"]);
  assert.deepEqual(Object.keys(parse(G)).sort(), ["problems", "profiles", "status"]);
});

test("T11 · the barrierProfiles JSON carries no verdict, prohibition, forbid or score key", () => {
  const entries = auditJson("barrier-profile-nexp-acc0").barrierProfiles;
  assert.ok(Array.isArray(entries) && entries.length === 1);
  assert.deepEqual(Object.keys(entries[0]).sort(), ["barriers", "path"]);
  assert.deepEqual(Object.keys(entries[0].barriers).sort(), ["problems", "profiles", "status"]);
  const keys = [];
  (function walk(value) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) (keys.push(k), walk(v));
  })(entries);
  const offending = keys.filter((k) => /verdict|prohibit|forbid|score/i.test(k));
  assert.deepEqual(offending, []);
});

// ---------------------------------------------------------------------------
// T12 — C3: the catalog
// ---------------------------------------------------------------------------

const BANNED = [
  "approaches it rules out",
  "approaches they rule out",
  "approaches it excludes",
  "already excludes",
  "not a research direction",
];

test("T12 · the new rule is catalogued, recommended, evaluated and declares its surface", async () => {
  const catalog = await loadCatalog(path.join(HOME, "rules"));
  const rule = catalog.rules.get(RULE);
  assert.ok(rule, `${RULE} is not in the catalog`);
  assert.equal(rule.level, "recommended");
  assert.equal(rule.severity, "warning");
  assert.equal(rule.validationType, "structural");
  assert.equal(rule.assurance, "partial");
  assert.equal(rule.standard, 17);
  assert.equal(rule.nonExemptible, false);
  assert.equal(rule.introducedIn, "3.2.0");
  assert.match(rule.description, NEVER);
  assert.ok(EVALUATED_RULES.includes(RULE));
  assert.deepEqual(RULE_SURFACES.get(RULE)?.surfaces, ["open-problems"]);
});

test("T12 · neither barrier rule words a barrier as excluding approaches", async () => {
  const catalog = await loadCatalog(path.join(HOME, "rules"));
  for (const id of ["problems.barriers-recorded", RULE]) {
    const rule = catalog.rules.get(id);
    assert.ok(rule, id);
    for (const field of ["description", "rationale", "remediation", "$assuranceNote"]) {
      const text = String(rule[field] ?? "").toLowerCase();
      for (const phrase of BANNED) assert.ok(!text.includes(phrase), `${id}.${field} contains "${phrase}"`);
    }
  }
});

test("T12 · problems.barriers-recorded keeps its level, severity and behaviour", async () => {
  const rule = (await loadCatalog(path.join(HOME, "rules"))).rules.get("problems.barriers-recorded");
  assert.equal(rule.level, "required");
  assert.equal(rule.severity, "warning");
  assert.equal(rule.validationType, "document");
  assert.equal(rule.assurance, "partial");
  assert.equal(rule.introducedIn, "1.0.0");
  assert.equal(
    rule.description,
    "The Known Barriers section records each barrier encountered: what it states, its scope, what it rules out, what it does not rule out, and a reference.",
  );
});

// ---------------------------------------------------------------------------
// T13 — C0, C3: the six wording locations
// ---------------------------------------------------------------------------

test("T13 · the prohibition reading is gone from Standard 17, the template and the assurance report", () => {
  const banned = [...BANNED, "statements about approaches"];
  for (const rel of ["standards/17-open-problems.md", "templates/open-problem.md", "docs/assurance-report.md"]) {
    const text = read(rel).toLowerCase().replace(/\s+/g, " ");
    for (const phrase of banned) assert.ok(!text.includes(phrase), `${rel} contains "${phrase}"`);
  }
});

test("T13 · R5 keeps its MUST, now for the profile", () => {
  const standard = read("standards/17-open-problems.md").replace(/\s+/g, " ");
  assert.match(standard, /`## Known Barriers` MUST record each barrier encountered as a profile/);
  assert.match(standard, /A barrier is descriptive evidence\. It never decides whether an approach may be pursued/);
  assert.match(standard, /barrier profiles: scope, what each rules out and does not, evidence/);
  assert.match(standard, /R5's treatment of barriers as profiles: scope, what each rules out and does not, and evidence/);
});

test("T13 · the template carries the profile form, and its example parses once its placeholders are filled", () => {
  const template = read("templates/open-problem.md");
  const start = template.indexOf("## Known Barriers");
  assert.notEqual(start, -1);
  const next = template.indexOf("\n## ", start + 1);
  const section = template.slice(start, next === -1 ? undefined : next);
  assert.match(section, /never a\s+verdict on whether an approach may be pursued/);
  for (const label of ["Statement:", "Scope:", "Rules out:", "Does not rule out:", "Evidence:"]) {
    assert.ok(section.includes(label), label);
  }
  // The template's placeholders are not content. Fill each `<...>` with text and the evidence
  // placeholder with a path, then the profile example must parse with zero problems.
  const example = section.slice(section.indexOf("### <Barrier name>"));
  const filled = example
    .replace(/^Evidence:.*$/m, "Evidence: notes/example.md")
    .replace(/<[^\n]*?>/g, "x");
  const result = parse(filled);
  assert.equal(result.status, "profiles");
  assert.deepEqual(result.problems, []);
});

test("T13 · R7 and the other stopping-criteria texts stay outside this change (choice 13)", () => {
  assert.match(read("standards/17-open-problems.md").replace(/\s+/g, " "), /a barrier that would rule the whole strategy out/);
});

// ---------------------------------------------------------------------------
// T14 — C1, C3: the report
// ---------------------------------------------------------------------------

test("T14 · the text output has the barrier-profile block", () => {
  const out = run(["audit", `--dir=${fixture("barrier-profile-nexp-acc0")}`]).out;
  assert.match(out, /Barrier profiles \(descriptive evidence; never a prohibition verdict\):/);
});

test("T14 · a record with no profiles reports the status the reader assigned", () => {
  const out = run(["audit", `--dir=${fixture("barrier-profile-prose-only")}`]).out;
  assert.match(out, /p-vs-np\/problem\.md: prose/);
  assert.match(run(["audit", `--dir=${fixture("barrier-profile-none")}`]).out, /p-vs-np\/problem\.md: none/);
  assert.match(run(["audit", `--dir=${fixture("barrier-profile-absent")}`]).out, /p-vs-np\/problem\.md: absent/);
});

test("T14 · audit --json has the barrierProfiles key", () => {
  const audit = auditJson("barrier-profile-nexp-acc0");
  assert.ok(Array.isArray(audit.barrierProfiles));
  assert.equal(audit.barrierProfiles[0].path, "artifacts/open-problems/p-vs-np/problem.md");
});

test("T14 · the finding names the rule, the OBSERVED label and the descriptive-evidence message", () => {
  const [finding] = findingsFor("barrier-profile-verdict-label");
  assert.equal(finding.label, "OBSERVED");
  assert.match(finding.message, /A barrier profile is descriptive evidence/);
  assert.match(finding.message, NEVER);
});

// ---------------------------------------------------------------------------
// T15 — C1: no subject, no verdict
// ---------------------------------------------------------------------------

test("T15 · with no open-problem record the rule is not-evaluated, never passed", () => {
  const verdict = validateJson("math-compliant");
  const result = verdict.results.find((r) => r.ruleId === RULE);
  assert.ok(result, "the rule has no result at all");
  assert.notEqual(result.status, "passed");
  assert.match(JSON.stringify(result), /not-evaluated|skipped|no-subject/);
});
