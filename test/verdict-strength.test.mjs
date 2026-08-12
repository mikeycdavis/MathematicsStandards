/**
 * Tier 1 · §0b + §0i — a finding's evidence strength constrains the verdict it can produce.
 *
 * Design: design/v1.1-tier1-verdict-strength.md. These are the four mutations named there, written
 * before the implementation so that what they defeat is fixed in advance and cannot be adjusted to
 * whatever the implementation turns out to do.
 *
 * The acceptance rule the whole milestone answers to:
 *
 *     No finding acquires evidentiary certainty through a default.
 *
 * Each test states the mutation it defeats. A test whose failure message does not distinguish
 * "the ceiling is broken" from "some detector changed" is too wide, so M1 works at the
 * verdict-composition boundary and never goes through a detector.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { loadCatalog } from "../scripts/catalog.mjs";
import { evaluate, isInvariant, STATUS } from "../scripts/compliance.mjs";
import { parseLedger } from "../scripts/claims.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const catalog = await loadCatalog(path.join(HOME, "rules"));
const TODAY = "2026-08-10";
const policyDoc = { standardVersion: "1.0.0", project: "t" };

const invariantRule = [...catalog.rules.values()].find(isInvariant);
const LABELS = ["OBSERVED", "INFERRED", "CONFIRMED_BY_OWNER", "UNKNOWN"];
const fixture = (name) => path.join(HOME, "test/fixtures", name);
const auditJson = (name) => JSON.parse(run(["audit", `--dir=${fixture(name)}`, "--json"]).out || "{}");

// ---------------------------------------------------------------------------
// M1 · the ceiling. One finding, two labels, nothing else different.
//
// Defeats: an engine that ignores the label, and an engine that "fixes" the block by dropping the
// finding. Both assertions carry the retention clause for that reason.
// ---------------------------------------------------------------------------

function verdictFor(label) {
  return evaluate({
    catalog,
    policy: policyDoc,
    findings: [{ rule: invariantRule.id, message: "planted", evidence: ["x"], label }],
    evaluated: [invariantRule.id],
    today: TODAY,
  });
}

const failedFor = (verdict, ruleId) =>
  verdict.results.find((r) => r.ruleId === ruleId && r.status === "failed");

test("M1 · an INFERRED finding against an invariant is capped at NON_COMPLIANT", () => {
  const verdict = verdictFor("INFERRED");
  assert.equal(verdict.status, STATUS.NON_COMPLIANT, "a heuristic must not reach the terminal verdict");
  assert.deepEqual(verdict.blockedBy, [], "nothing may be reported as blocking");
  assert.ok(failedFor(verdict, invariantRule.id), "the finding must still be present and failing");
});

test("M1 · an OBSERVED finding against the same invariant still blocks", () => {
  const verdict = verdictFor("OBSERVED");
  assert.equal(verdict.status, STATUS.BLOCKED_BY_INVARIANT);
  assert.deepEqual(verdict.blockedBy.map((b) => b.rule), [invariantRule.id]);
  assert.ok(failedFor(verdict, invariantRule.id), "the finding must still be present and failing");
});

test("M1 · the capped result records why it was capped", () => {
  const capped = failedFor(verdictFor("INFERRED"), invariantRule.id);
  assert.equal(capped.label, "INFERRED", "the label must survive into the result");
  assert.equal(capped.cappedFrom, STATUS.BLOCKED_BY_INVARIANT, "the verdict it would have produced");
});

test("M1 · a capped finding still fails the run", () => {
  const verdict = verdictFor("INFERRED");
  assert.notEqual(verdict.status, STATUS.COMPLIANT);
  assert.notEqual(verdict.status, STATUS.COMPLIANT_WITH_EXCEPTIONS);
});

test("M1 · neither unused label elevates", () => {
  for (const label of ["CONFIRMED_BY_OWNER", "UNKNOWN"]) {
    const verdict = verdictFor(label);
    assert.notEqual(
      verdict.status,
      STATUS.BLOCKED_BY_INVARIANT,
      `${label} must not carry blocking power before anything emits it`,
    );
  }
});

test("M1 · a finding with no label at all cannot elevate", () => {
  const verdict = evaluate({
    catalog,
    policy: policyDoc,
    findings: [{ rule: invariantRule.id, message: "planted", evidence: ["x"] }],
    evaluated: [invariantRule.id],
    today: TODAY,
  });
  assert.notEqual(verdict.status, STATUS.BLOCKED_BY_INVARIANT, "absence of a label is not certainty");
});

test("M1 · a rejected attestation on an invariant still blocks, and is not capped", () => {
  // The row Tier 1 must not touch. A rejected attestation produces a failing invariant result whose
  // label is null, because it is not a detector finding and has no evidentiary classification to
  // carry. The obvious wrong implementation writes the cap as `label !== "OBSERVED"`, which is true
  // of null, and silently downgrades every human reviewer's recorded rejection to the same standing
  // as a regex over prose. It is the wrong direction twice over: the review is stronger evidence
  // than the heuristic, and the framework would be weakening a conclusion a person reached.
  //
  // Two of RiemannHypothesis's three blockers arrive this way, so this is a live path, not a
  // hypothetical.
  const rule = [...catalog.rules.values()].find((r) => r.attestable && isInvariant(r));
  assert.ok(rule, "the catalog must contain an attestable invariant");

  const verdict = evaluate({
    catalog,
    policy: {
      ...policyDoc,
      attestations: {
        [rule.id]: { status: "rejected", reviewedBy: "a reviewer", reviewedAt: TODAY, evidence: "reviewed, unmet" },
      },
    },
    findings: [],
    evaluated: [],
    today: TODAY,
  });

  const result = failedFor(verdict, rule.id);
  assert.ok(result, "the rejected attestation must still produce a failing result");
  assert.equal(result.label, null, "it is not a detector finding and must carry no evidence label");
  assert.ok(!("cappedFrom" in result), "Tier 1 must not reach a result path it did not create");
  assert.equal(verdict.status, STATUS.BLOCKED_BY_INVARIANT, "a recorded human rejection still blocks");
  assert.deepEqual(verdict.blockedBy.map((b) => b.rule), [rule.id]);
});

// ---------------------------------------------------------------------------
// Envelope contract. Two additive fields, and exactly one meaningful cap transition.
//
//   label       evidentiary classification supplied by the detector
//   status      consequence actually assigned to this finding
//   cappedFrom  the stronger consequence the rule's semantics would otherwise have assigned,
//               prevented SOLELY by the evidence-strength ceiling
//
// cappedFrom is not a generic previous-status field, and it is absent when nothing was prevented.
// Given the four-row table there is exactly one transition it can record, and that narrow truth is
// what is encoded here rather than a status-transition system.
// ---------------------------------------------------------------------------

const NON_ELEVATING = ["INFERRED", "CONFIRMED_BY_OWNER", "UNKNOWN"];

test("contract · every result carries a label key, valid or null", () => {
  const verdict = verdictFor("INFERRED");
  for (const r of verdict.results) {
    assert.ok("label" in r, `${r.ruleId} has no label key`);
    assert.ok(
      r.label === null || LABELS.includes(r.label),
      `${r.ruleId} has label ${JSON.stringify(r.label)}`,
    );
  }
});

test("contract · results built outside base() carry the label key too", () => {
  // `base` is not the only constructor of a result: the attestation verdicts and the two exception
  // dispositions are hand-built object literals, and they omitted the key entirely. A consumer
  // reading `result.label` got `undefined` from those paths and `null` from every other, which is
  // the shape of bug that turns into a truthiness test somewhere downstream.
  //
  // Found by auditing a real adopter rather than a fixture: two of RiemannHypothesis's blocking
  // results come from rejected attestations and had no label key at all.
  const attestable = [...catalog.rules.values()].find((r) => r.attestable && isInvariant(r));
  assert.ok(attestable, "the catalog must contain an attestable invariant for this to mean anything");

  const exemptible = [...catalog.rules.values()].find((r) => !r.nonExemptible && r.level === "required");
  const verdict = evaluate({
    catalog,
    policy: {
      ...policyDoc,
      attestations: {
        [attestable.id]: { status: "rejected", reviewedBy: "a reviewer", reviewedAt: TODAY, evidence: "e" },
      },
      exceptions: [
        { rule: attestable.id, reason: "r", approvedBy: "a", approvedAt: TODAY },
        { rule: exemptible.id, reason: "r", approvedBy: "a", approvedAt: TODAY, expires: "2020-01-01" },
      ],
    },
    findings: [],
    evaluated: [],
    today: TODAY,
  });

  const dispositions = new Set(verdict.results.map((r) => r.disposition));
  for (const expected of ["attested-rejected", "rejected-exception", "expired-exception"]) {
    assert.ok(dispositions.has(expected), `the run must exercise the ${expected} path`);
  }
  for (const r of verdict.results) {
    assert.ok("label" in r, `${r.ruleId} (${r.disposition}) has no label key`);
    assert.ok(r.label === null || LABELS.includes(r.label), `${r.ruleId} has label ${JSON.stringify(r.label)}`);
  }
});

test("contract · a result derived from a finding has a non-null label", () => {
  const capped = failedFor(verdictFor("INFERRED"), invariantRule.id);
  assert.equal(capped.label, "INFERRED");
});

test("contract · a result not derived from a finding has label null", () => {
  const verdict = verdictFor("INFERRED");
  const untouched = verdict.results.filter((r) => r.ruleId !== invariantRule.id);
  assert.ok(untouched.length > 0, "the run must contain results other than the planted one");
  for (const r of untouched) {
    assert.equal(r.label, null, `${r.ruleId} was not derived from a finding and must not be labelled`);
  }
});

test("contract · cappedFrom is absent unless a ceiling was applied", () => {
  const verdict = verdictFor("OBSERVED");
  for (const r of verdict.results) {
    assert.ok(!("cappedFrom" in r), `${r.ruleId} carries cappedFrom with nothing prevented`);
  }
});

test("contract · when cappedFrom exists it records the one transition that can occur", () => {
  for (const label of NON_ELEVATING) {
    for (const r of verdictFor(label).results) {
      if (!("cappedFrom" in r)) continue;
      assert.equal(r.cappedFrom, STATUS.BLOCKED_BY_INVARIANT, "the only consequence a ceiling prevents");
      assert.equal(r.status, "failed", "a capped result still fails");
      assert.equal(r.invariant, true, "only an invariant rule can be capped from blocking");
      assert.ok(NON_ELEVATING.includes(r.label), "a capped result's label must be non-elevating");
      assert.notEqual(r.cappedFrom, r.status, "cappedFrom is what was prevented, not what happened");
    }
  }
});

test("contract · a capped run is NON_COMPLIANT everywhere a consumer can look", () => {
  // cappedFrom is explanatory metadata, not an alternate active status. Nothing downstream may see
  // it and conclude the run is blocked after all, and nothing may see `invariant: true` on a capped
  // result and conclude the same. The three places a consumer actually looks are the status string,
  // the blockedBy array, and the process exit code.
  const verdict = verdictFor("INFERRED");
  assert.equal(verdict.status, STATUS.NON_COMPLIANT);
  assert.deepEqual(verdict.blockedBy, [], "a capped result is not a block, and must not be listed as one");
  assert.equal(
    verdict.results.filter((r) => r.cappedFrom).length,
    1,
    "exactly the planted finding was capped",
  );

  const rendered = run(["validate", `--dir=${fixture("silent-promotion")}`]);
  assert.equal(rendered.code, 1, "a capped run still fails the exit contract");
  assert.doesNotMatch(rendered.out, /BLOCKED BY INVARIANT/, "the human output must not say blocked");

  // And the opposite failure, which is the one the renderer actually had: the capped finding was
  // filtered out of the failing list as an invariant, and out of the blocked list as capped, so it
  // appeared nowhere. A cap that hides the finding is worse than the false block it replaced.
  assert.match(rendered.out, /claims\.silent-promotion/, "the capped finding must still be shown");
});

// ---------------------------------------------------------------------------
// M2 · detector basis. The two arms of one rule must declare different bases.
//
// Defeats: labelling the whole of claims.silent-promotion INFERRED to make PvsNP pass. That would
// also stop a genuine unevidenced promotion from blocking — trading a false positive for a false
// negative inside the same rule.
// ---------------------------------------------------------------------------

const promotionFindings = (name) =>
  (auditJson(name).findings ?? []).filter((f) => f.rule === "claims.silent-promotion");

test("M2 · the prose arm is INFERRED", () => {
  const found = promotionFindings("silent-promotion");
  assert.equal(found.length, 1, "the prose fixture must fire exactly the prose arm");
  assert.equal(found[0].label, "INFERRED", "a 48-character window over running text is an inference");
});

test("M2 · the ledger arm is OBSERVED", () => {
  const found = promotionFindings("unevidenced-promotion");
  assert.equal(found.length, 1, "the ledger fixture must fire exactly the ledger arm");
  assert.equal(found[0].label, "OBSERVED", "a parsed History field with no evidence is observed");
});

test("M2 · the two arms are the same rule with different bases", () => {
  const prose = promotionFindings("silent-promotion")[0];
  const ledger = promotionFindings("unevidenced-promotion")[0];
  assert.equal(prose.rule, ledger.rule, "same rule, or this test is about nothing");
  assert.notEqual(prose.label, ledger.label, "one rule, two bases — this is the point");
});

test("M2 · the genuine promotion still blocks and the prose one does not", () => {
  const ledger = JSON.parse(run(["validate", `--dir=${fixture("unevidenced-promotion")}`, "--json"]).out || "{}");
  const prose = JSON.parse(run(["validate", `--dir=${fixture("silent-promotion")}`, "--json"]).out || "{}");

  // Named exactly, not merely counted. `status === BLOCKED_BY_INVARIANT` would also be satisfied by
  // some other invariant firing in the fixture, which would make this test pass while the arm it is
  // about had stopped working.
  assert.equal(ledger.status, STATUS.BLOCKED_BY_INVARIANT, "an unevidenced promotion is a real violation");
  assert.deepEqual(ledger.blockedBy.map((b) => b.rule), ["claims.silent-promotion"]);

  assert.notEqual(prose.status, STATUS.BLOCKED_BY_INVARIANT, "a prose match must not be terminal");
  assert.deepEqual(prose.blockedBy, [], "and it must not be listed as blocking either");
  assert.ok(
    (prose.findings ?? []).some((f) => f.rule === "claims.silent-promotion"),
    "and the prose finding must still be reported",
  );

  // The consequence moved; the detection did not. This is the distinction the whole milestone rests
  // on, so it is asserted rather than left to be inferred from the status.
  const proseResult = prose.results.find((r) => r.ruleId === "claims.silent-promotion");
  assert.equal(proseResult.status, "failed", "the run still fails on it");
  assert.equal(proseResult.invariant, true, "the rule is still an invariant; the cap is not a reclassification");
  assert.equal(proseResult.cappedFrom, STATUS.BLOCKED_BY_INVARIANT);

  const ledgerResult = ledger.results.find((r) => r.ruleId === "claims.silent-promotion");
  assert.ok(!("cappedFrom" in ledgerResult), "an observed violation is not capped");
});

// ---------------------------------------------------------------------------
// M3 · parser uncertainty. Unrecognised obligation text cannot become observed fact.
//
// Defeats: extending the grammar to accept `none — <explanation>` and leaving the next unrecognised
// spelling to be manufactured into an open obligation.
// ---------------------------------------------------------------------------

const LEDGER_WITH_UNPARSEABLE_OBLIGATION = `# Claims ledger

## CLM-0001 — A proved thing

- **Status:** THEOREM
- **Statement:** Something true.
- **Domain:** N
- **Quantifiers:** universal
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none — the claim is an implication and the implication is complete
- **Equivalences:** none
- **Evidence:**
  - proof — \`notes/argument.md\`
- **Formal:** none
- **History:**
  - 2026-04-01 → THEOREM (registered, \`notes/argument.md\`)
`;

test("M3 · an unrecognised obligation is marked unrecognised, not defaulted to open", () => {
  const ledger = parseLedger(LEDGER_WITH_UNPARSEABLE_OBLIGATION);
  const entry = ledger.entries.get("CLM-0001");
  assert.ok(entry, "the fixture must parse into an entry");
  const [obligation] = entry.obligations;
  if (obligation === undefined) return; // treating it as no obligation is also acceptable
  assert.notEqual(
    obligation.state,
    "open",
    "a defaulting branch is a guess and must not be reported as an open obligation",
  );
  assert.equal(obligation.state, "unrecognised", "say what happened rather than picking a state");
});

test("M3 · nothing resting on an unrecognised parse is OBSERVED", () => {
  const ledger = parseLedger(LEDGER_WITH_UNPARSEABLE_OBLIGATION);
  const entry = ledger.entries.get("CLM-0001");
  const [obligation] = entry.obligations;
  if (obligation === undefined) return;
  assert.notEqual(
    obligation.label ?? "INFERRED",
    "OBSERVED",
    "the parser must not hand a detector grounds to claim certainty",
  );
});

// ---------------------------------------------------------------------------
// M4 · the default guard, structural.
//
// Defeats the easiest wrong implementation: flipping report()'s default label to INFERRED. That
// makes both frozen specimens go green in one edit and moves the hidden assumption rather than
// removing it.
//
//     Every report() invocation supplies an explicit valid label.
// ---------------------------------------------------------------------------


const detectorSource = readFileSync(path.join(HOME, "scripts/standards.mjs"), "utf8");

test("M4 · report() has no default label", () => {
  assert.doesNotMatch(
    detectorSource,
    /function report\([^)]*label\s*=/s,
    "a default label is forbidden in either direction — the point is that there is no default",
  );
});

test("M4 · every report() invocation supplies an explicit valid label", () => {
  // Each call is `report(<rule>, { ... })`; take the object literal by brace matching so a nested
  // object inside the options cannot truncate the scan.
  const calls = [];
  const re = /\breport\(\s*("[^"]+"|'[^']+')\s*,\s*\{/g;
  let m;
  while ((m = re.exec(detectorSource)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < detectorSource.length && depth > 0) {
      if (detectorSource[i] === "{") depth++;
      else if (detectorSource[i] === "}") depth--;
      i++;
    }
    calls.push({ rule: m[1].slice(1, -1), body: detectorSource.slice(re.lastIndex, i - 1) });
  }

  assert.ok(calls.length > 20, `expected the detector file to contain many report() calls, saw ${calls.length}`);

  const unlabelled = calls.filter((c) => !/\blabel\s*:/.test(c.body));
  assert.deepEqual(
    unlabelled.map((c) => c.rule),
    [],
    "these report() calls do not state what their finding rests on",
  );

  const invalid = calls
    .map((c) => ({ rule: c.rule, label: /\blabel\s*:\s*"([A-Z_]+)"/.exec(c.body)?.[1] }))
    .filter((c) => c.label !== undefined && !LABELS.includes(c.label));
  assert.deepEqual(invalid, [], "a label outside the validated set");
});

test("M4 · the classification table and the detector file agree, site for site", () => {
  // The scan above keys on a string-literal rule id, and two call sites report against a variable
  // because they loop over several rules. Those are exactly the sites a rule-keyed scan cannot see,
  // so this check is line-keyed instead and covers every one.
  //
  // It is bidirectional on purpose. A new detector cannot be added without classifying it, and a
  // classification cannot be left behind when its detector is deleted — a stale row asserting that
  // some finding is OBSERVED, for a finding that no longer exists, is documentation that outlives
  // its subject and gets believed.
  const table = JSON.parse(
    readFileSync(path.join(HOME, "test/fixtures/evidence-classification.json"), "utf8"),
  );
  const lines = detectorSource.split("\n");

  // Keyed by `<rule expression as written>#<nth occurrence>`, not by line, because line numbers move
  // whenever anything above them changes and a key that rots is a key that gets deleted. This one
  // only changes when a detector is added or removed — which is exactly when the table should be
  // revisited.
  const inSource = new Map();
  const lineOf = new Map();
  const seen = new Map();
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*report\(/.test(lines[i])) continue;
    const expr = /^\s*report\(\s*("[^"]+"|[A-Za-z_$][\w$]*)\s*,/.exec(lines[i])?.[1];
    assert.ok(expr, `report() at standards.mjs:${i + 1} is not in the form this scan understands`);
    const key = `${expr.replace(/"/g, "")}#${(seen.get(expr) ?? 0) + 1}`;
    seen.set(expr, (seen.get(expr) ?? 0) + 1);

    let depth = 0;
    let label = null;
    scan: for (let j = i; j < lines.length; j++) {
      const found = /^\s*label:\s*"([A-Z_]+)"/.exec(lines[j]);
      if (found && depth > 0) label = found[1];
      for (const ch of lines[j]) {
        if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) break scan;
      }
    }
    inSource.set(key, label);
    lineOf.set(key, i + 1);
  }

  const inTable = new Map();
  for (const site of table.sites) {
    const prior = inTable.get(site.site);
    assert.ok(
      prior === undefined || prior === site.label,
      `the table gives ${site.site} two labels; one call site emits one label`,
    );
    inTable.set(site.site, site.label);
  }

  assert.deepEqual(
    [...inSource.keys()].sort(),
    [...inTable.keys()].sort(),
    "every report() call site must appear in test/fixtures/evidence-classification.json and vice versa",
  );
  for (const [key, label] of inSource) {
    assert.equal(label, inTable.get(key), `the label at ${key} (standards.mjs:${lineOf.get(key)}) contradicts the table`);
  }

  // The recorded line is for a human opening the file, so it is checked but reported as its own
  // failure — a stale line number is a documentation bug, not a classification bug.
  for (const site of table.sites) {
    assert.equal(
      lineOf.get(site.site),
      site.line,
      `${site.site} is recorded at line ${site.line} and is actually at ${lineOf.get(site.site)}`,
    );
  }

  // Non-vacuity, and a guard against a table that classifies everything the same way. A pass whose
  // every row read OBSERVED would satisfy the checks above and mean nothing.
  const labels = new Set(inTable.values());
  assert.ok(labels.has("OBSERVED") && labels.has("INFERRED"), "the classification must discriminate");
  for (const site of table.sites) {
    assert.ok(site.proposition?.length > 20, `${site.rule} states no proposition`);
    assert.ok(site.basis?.length > 20, `${site.rule} states no basis for its label`);
  }
});

test("M4 · omitting the label fails at runtime too, not only in this test", () => {
  // Defence in depth: the meta-test above is the guard, but a new call site written against a
  // future refactor must not be able to omit the label and merely go unnoticed until CI.
  assert.match(
    detectorSource,
    /throw new Error\([^)]*label/s,
    "report() must reject a missing label when it is called, not only when this file is scanned",
  );
});
