/**
 * FE-29 (#60) — guards. These pass on main today, or on main plus the new fixtures, and must keep
 * passing once the rule lands. They are not red-first tests; the red-first tests are in
 * test/fe60-barrier-profiles.test.mjs.
 *
 * Design: design/fe60-barrier-profiles.md, "Guard file". This file deliberately does not import
 * scripts/barriers.mjs: it uses the CLI, the catalog and the file system only, so it can run on main.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const NEW_RULE = "problems.barrier-profiles-valid";
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const auditJson = (name) => JSON.parse(run(["audit", `--dir=${fixture(name)}`, "--json"]).out);
const validateJson = (name) => JSON.parse(run(["validate", `--dir=${fixture(name)}`, "--json"]).out);

const catalog = await loadCatalog(path.join(HOME, "rules"));
const ruleExists = catalog.rules.has(NEW_RULE);

test("G1 · a record with no Known Barriers section has exactly one barrier finding, from the existing rule", () => {
  const barrierFindings = auditJson("barrier-profile-absent").findings.filter((f) => /^problems\.barrier/.test(f.rule ?? ""));
  assert.equal(barrierFindings.length, 1, JSON.stringify(barrierFindings));
  assert.equal(barrierFindings[0].rule, "problems.barriers-recorded");
  assert.ok(barrierFindings[0].evidence.some((e) => /missing ## Known Barriers/.test(e)));
});

test("G1 · once the rule exists it does not repeat the missing-section finding", { skip: !ruleExists }, () => {
  const found = auditJson("barrier-profile-absent").findings.filter((f) => f.rule === NEW_RULE);
  assert.deepEqual(found, []);
});

test("G2 · a profile changes no other result: B3 and B4 validate identically but for project and auditedAt", () => {
  const strip = (j) => {
    const copy = JSON.parse(JSON.stringify(j));
    delete copy.project;
    delete copy.auditedAt;
    return JSON.stringify(copy).replaceAll("barrier-profile-pursued-anyway", "X").replaceAll("barrier-profile-pursued-control", "X");
  };
  const anyway = validateJson("barrier-profile-pursued-anyway");
  const control = validateJson("barrier-profile-pursued-control");
  assert.equal(strip(anyway), strip(control));
  assert.equal(anyway.status, control.status);
  assert.equal(anyway.score, control.score);
});

test("G3 · no forbidden rule, and no required rule but two named exemptions, mentions a barrier", () => {
  const EXEMPT = new Set(["problems.barriers-recorded", "lifecycle.stopping-criteria"]);
  const offenders = [];
  for (const rule of catalog.rules.values()) {
    if (rule.level !== "required" && rule.level !== "forbidden") continue;
    if (!/barrier/i.test(`${rule.description} ${rule.rationale}`)) continue;
    if (rule.level === "required" && EXEMPT.has(rule.id)) continue;
    offenders.push(rule.id);
  }
  assert.deepEqual(offenders, []);
});

test("G4 · open-problem-gaps still reports problems.barriers-recorded for a missing section", () => {
  const found = auditJson("open-problem-gaps").findings.filter((f) => f.rule === "problems.barriers-recorded");
  assert.equal(found.length, 1);
  assert.ok(found[0].evidence.some((e) => /missing ## Known Barriers/.test(e)));
});

// The findings these three fixtures carry on main (measured at 05f85d0), and the scores they pin.
const BLAST_RADIUS = [
  { name: "blocker-absent", rules: ["claims.ledger-exists", "problems.blocker-named"], status: "NON_COMPLIANT", score: 92 },
  { name: "escape-hatch-declared", rules: ["problems.blocker-named"], status: "NON_COMPLIANT", score: 97 },
  { name: "escape-hatch-undeclared", rules: ["lifecycle.failed-routes-preserved", "problems.blocker-named"], status: "NON_COMPLIANT", score: 97 },
];

for (const { name, rules, status, score } of BLAST_RADIUS) {
  test(`G5 · ${name} keeps every finding it has; the only addition is the new warning, by id`, () => {
    const verdict = validateJson(name);
    const have = verdict.findings.map((f) => f.rule).sort();
    const expected = [...rules, ...(ruleExists ? [NEW_RULE] : [])].sort();
    assert.deepEqual(have, expected);
    assert.equal(verdict.status, status);
    assert.equal(verdict.score, score, "the new warning is not scored");
  });
}
