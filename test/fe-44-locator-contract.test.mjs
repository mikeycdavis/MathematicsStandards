/**
 * FE-44 · what a published evidence locator promises.
 *
 * WHY THIS FILE EXISTS. `evidence.artifact-linked` has promised containing-file resolution "with any
 * anchor suffix removed before resolution" since the commit that created the catalog, and
 * `scripts/pointers.mjs` refuses that widening for the pointers it handles on the ground that "a rule
 * told to inspect one section of a document and handed the whole document has not inspected what it
 * was pointed at". Both statements are published. FE-44 filed the disagreement; the design record at
 * design/fe-44-locator-contract.md measured it and recommended a disposition; this file is that
 * record's falsifier table made executable.
 *
 * THE MEASUREMENT THAT SHAPES IT. On `bfe7215` an anchored locator whose fragment exists and one
 * whose fragment does not were not merely scored alike — they were byte-identical in the envelope.
 * The false statement therefore lived in what the envelope claimed was INSPECTED, not in `status`.
 * D1 and D6 are about that record; D2, D3, D4 and D7 hold the surrounding contract still while it is
 * repaired; D5 is the non-vacuity guard.
 *
 * WHAT EACH ONE FAILS UNDER. Every assertion here is stated so that it goes red under a named
 * alternative model, and the file is worth no more than that property:
 *
 *   D1  envelopes differ for a resolvable and an unresolvable anchor   — Model 1 alone; Model 6 partly
 *   D2  an unresolvable anchor still passes the required rule          — Model 2 (named location must resolve)
 *   D3  a genuinely missing file still fails, anchor trouble or not    — Model 3 (not-evaluated), outright
 *   D4  the closed result vocabulary and schemaVersion 2.0 survive     — Model 4 (a new state token)
 *   D5  an unanchored ledger gives the new rule no subject             — any model that fires on unanchored evidence
 *   D6  the inspected record names the locator the adopter wrote       — Models 1, 3, 5 alone
 *   D7  no `#` leaks into `cited-artifacts.paths`                      — the MINOR classification itself
 *
 * D7 is the release boundary rather than a correctness property: if the declared locator ever
 * REPLACES the bare containing file in `paths`, a consumer reading that field breaks, and the change
 * is MAJOR rather than the MINOR the design record classifies it as. It fails immediately in that
 * case, which is the point.
 *
 * Every lookup goes through `ruleOf`, which throws rather than returning undefined, for the reason
 * design/testing-principles.md §4 gives: a test that passes because its rule was absent from the
 * results measured nothing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";

import { HOME, run } from "./helpers/cli.mjs";
import { resolveEvidencePointer, POINTER } from "../scripts/pointers.mjs";

/** The rule the design record recommends adding. Named once; every assertion below reads it. */
const FRAGMENT_RULE = "evidence.locator-fragment-resolves";
const REQUIRED_RULE = "evidence.artifact-linked";

/** The closed result vocabulary of Standard 25. D4 holds it closed. */
const RESULT_TOKENS = new Set(["passed", "failed", "warning", "skipped"]);

const fixture = (name) => path.join(HOME, "test/fixtures", name);
const ledgerOf = (name) => readFileSync(path.join(fixture(name), "artifacts/claims-ledger.md"), "utf8");

function envelopeFor(name) {
  const { out } = run(["validate", `--dir=${fixture(name)}`, "--json"]);
  try {
    return JSON.parse(out);
  } catch {
    assert.fail(`no JSON envelope from validate ${name}: ${out.slice(0, 400)}`);
  }
}

function ruleOf(envelope, ruleId) {
  const found = (envelope.results ?? []).find((r) => r.ruleId === ruleId);
  assert.ok(found, `${ruleId} is absent from results — the lookup is vacuous, not passing`);
  return found;
}

/** The `cited-artifacts` surface of the required rule: the inspection record under repair. */
function citedArtifacts(envelope) {
  const surfaces = ruleOf(envelope, REQUIRED_RULE).inspected?.surfaces ?? [];
  const cited = surfaces.find((s) => s.surface === "cited-artifacts");
  assert.ok(cited, "the cited-artifacts surface is absent — nothing below would be measuring it");
  return cited;
}

function findingFor(envelope, ruleId) {
  const found = (envelope.findings ?? []).find((f) => f.rule === ruleId);
  assert.ok(found, `no finding reported for ${ruleId} — this assertion has nothing to read`);
  return found;
}

// ---------------------------------------------------------------------------
// The fixtures are only worth what their differences are. Asserted, not assumed.
// ---------------------------------------------------------------------------

test("fixtures · the anchored pair differs in the anchor and in nothing else", () => {
  // If these two ever diverge for a second reason, D1 stops being a measurement of the anchor and
  // becomes a measurement of whatever else changed — while still passing.
  const present = ledgerOf("locator-anchor-present").split("\n");
  const absent = ledgerOf("locator-anchor-absent").split("\n");
  assert.equal(present.length, absent.length, "the two ledgers no longer have the same shape");
  const differing = present.map((line, i) => [i, line, absent[i]]).filter(([, a, b]) => a !== b);
  assert.equal(differing.length, 1, `expected exactly one differing line, got ${differing.length}`);
  assert.match(differing[0][1], /#proof-of-clm-0002`$/, "the present-anchor fixture must name a real section");
  assert.match(differing[0][2], /#no-such-section`$/, "the absent-anchor fixture must name a section that is not there");
});

test("fixtures · the anchor said to be present really is a heading in the cited file", () => {
  // Non-vacuity for D1 and for the new rule alike: if `proofs/clm-0002.md` lost that heading, the
  // 'resolvable' half of every comparison below would silently become a second unresolvable case.
  const proof = readFileSync(path.join(fixture("locator-anchor-present"), "proofs/clm-0002.md"), "utf8");
  assert.match(proof, /^#\s+Proof of CLM-0002\s*$/m, "the heading the present-anchor fixture points at is gone");
});

test("fixtures · the missing-file fixture keeps both defects, not one", () => {
  const ledger = ledgerOf("locator-anchor-and-missing-file");
  assert.match(ledger, /proofs\/clm-0002\.md#no-such-section/, "the unresolvable anchor is gone");
  assert.match(ledger, /proofs\/no-such-file\.md/, "the genuinely missing file is gone; D3 would be vacuous");
});

// ---------------------------------------------------------------------------
// D1 · a resolvable and an unresolvable anchor must be distinguishable.
//
// Measured identical on bfe7215 — the finding that reframed FE-44.
// ---------------------------------------------------------------------------

test("D1 · the inspection record differs between a resolvable and an unresolvable anchor", () => {
  const present = citedArtifacts(envelopeFor("locator-anchor-present"));
  const absent = citedArtifacts(envelopeFor("locator-anchor-absent"));
  assert.notDeepEqual(
    present,
    absent,
    "the two anchored declarations produce byte-identical inspection records: the envelope is " +
      "erasing the difference between a section pointer that resolves and one that does not",
  );
});

test("D1 · and the difference is visible somewhere a reader of the envelope would find it", () => {
  // Distinguishable in principle is not the property. The pair must differ in the report a person
  // or a consumer actually reads, which is why this compares the whole envelope rather than one key.
  //
  // `auditedAt` is normalised out first, and that is not a detail: without it this assertion passes
  // on a wall-clock difference of a quarter of a second, which is how a test comes out green while
  // measuring nothing. Every other volatile field would have to be added here too — none exists
  // today, and one appearing would show up as this test passing before the repair rather than after.
  const stable = (name) => JSON.stringify({ ...envelopeFor(name), auditedAt: "<normalised>" });
  assert.notEqual(
    stable("locator-anchor-present"),
    stable("locator-anchor-absent"),
    "the whole envelope, timestamp aside, is identical for the resolvable and the unresolvable anchor",
  );
});

// ---------------------------------------------------------------------------
// D2 · the published contract is preserved.
//
// Fails under Model 2. This is the assertion that keeps the recommendation the WEAKEST change that
// makes the report truthful, rather than the one that makes the framework strictest.
// ---------------------------------------------------------------------------

test("D2 · an unresolvable anchor leaves the required rule passing and the verdict COMPLIANT", () => {
  const e = envelopeFor("locator-anchor-absent");
  assert.equal(ruleOf(e, REQUIRED_RULE).status, "passed", "containing-file resolution is the published contract");
  assert.equal(e.status, "COMPLIANT", "an unresolvable fragment must not move the verdict");
});

test("D2 · the required rule's published metadata is untouched", () => {
  const rule = ruleOf(envelopeFor("locator-anchor-absent"), REQUIRED_RULE);
  assert.equal(rule.level, "required");
  assert.equal(rule.severity, "error");
  const catalog = JSON.parse(readFileSync(path.join(HOME, "rules/evidence.json"), "utf8"));
  const published = catalog.rules.find((r) => r.id === REQUIRED_RULE);
  assert.ok(published, "evidence.artifact-linked is no longer in the catalog");
  assert.equal(
    published.description,
    "Every path-shaped evidence reference resolves to a file in the repository, with any anchor suffix removed before resolution.",
    "the published description changed — that is a MAJOR act and needs a new decision, not this change",
  );
  assert.equal(published.deprecatedIn, null);
  assert.equal(published.supersededBy, null);
});

// ---------------------------------------------------------------------------
// D3 · the anti-contagion test. Kills Model 3 outright.
// ---------------------------------------------------------------------------

test("D3 · a genuinely missing file still fails, even beside an unresolvable anchor", () => {
  const e = envelopeFor("locator-anchor-and-missing-file");
  assert.equal(
    ruleOf(e, REQUIRED_RULE).status,
    "failed",
    "withdrawing the rule over a fragment would take the missing-file finding with it",
  );
  const evidence = findingFor(e, REQUIRED_RULE).evidence.join("\n");
  assert.match(evidence, /proofs\/no-such-file\.md/, "the finding must still name the file that is not there");
  assert.equal(e.status, "NON_COMPLIANT", "a missing artifact is a project failure and must stay one");
});

// ---------------------------------------------------------------------------
// D4 · the envelope contract. Fails under Model 4.
// ---------------------------------------------------------------------------

test("D4 · every result status stays inside the closed four-token set", () => {
  for (const name of [
    "math-compliant",
    "locator-anchor-present",
    "locator-anchor-absent",
    "locator-anchor-and-missing-file",
    "locator-fragment-unsupported",
  ]) {
    const e = envelopeFor(name);
    for (const r of e.results ?? []) {
      assert.ok(RESULT_TOKENS.has(r.status), `${name}: ${r.ruleId} reports status '${r.status}'`);
    }
    assert.equal(e.schemaVersion, "2.0", `${name}: the envelope format version moved`);
  }
});

// ---------------------------------------------------------------------------
// D5 · the non-vacuity guard.
//
// Both frozen adopters are this case: neither RiemannHypothesis nor PvsNP carries a single anchored
// evidence locator. A rule that fired on every evidence entry would satisfy D1 and D6 while
// measuring nothing about anchors.
// ---------------------------------------------------------------------------

test("D5 · a ledger with no anchored locator gives the new rule no subject, not a pass", () => {
  const e = envelopeFor("math-compliant");
  const rule = ruleOf(e, FRAGMENT_RULE);
  assert.equal(rule.status, "skipped", "a rule with nothing of its kind to read must not pass");
  assert.equal(rule.disposition, "not-evaluated");
  assert.equal(rule.notEvaluatedBecause, "no-subject");
  assert.equal(
    (e.findings ?? []).filter((f) => f.rule === FRAGMENT_RULE).length,
    0,
    "the new rule reported a finding about a project that declared no fragment at all",
  );
});

test("D5 · that fixture really does declare no anchored locator", () => {
  const ledger = ledgerOf("math-compliant");
  const anchored = [...ledger.matchAll(/`([^`\s]+\.[A-Za-z0-9]{1,6}#[^`\s]*)`/g)].map((m) => m[1]);
  assert.deepEqual(anchored, [], `the unanchored fixture acquired an anchor: ${JSON.stringify(anchored)}`);
});

test("D5 · and the new rule does fire where there IS a subject, or D5 measures nothing", () => {
  // The other half of the guard. `no-subject` on an unanchored ledger is only meaningful if an
  // anchored one reaches a different answer.
  const e = envelopeFor("locator-anchor-absent");
  const rule = ruleOf(e, FRAGMENT_RULE);
  assert.notEqual(rule.notEvaluatedBecause, "no-subject", "an anchored ledger is a subject for this rule");
  assert.equal(rule.status, "warning", "an unresolvable fragment is the case this rule exists to report");
  assert.equal(rule.level, "recommended", "a required rule here would be Model 2 by another route");
  assert.equal(rule.severity, "warning");
  const finding = findingFor(e, FRAGMENT_RULE);
  assert.match(finding.evidence.join("\n"), /#no-such-section/, "the finding must name the fragment it could not find");
  assert.equal(finding.label, "OBSERVED", "the file was read and searched; that is an observation");
});

test("D5 · a resolvable fragment is not reported as a problem", () => {
  const e = envelopeFor("locator-anchor-present");
  assert.equal(ruleOf(e, FRAGMENT_RULE).status, "passed", "a fragment that resolves must not warn");
  assert.equal(e.status, "COMPLIANT");
});

test("D5 · parser incapability is not turned into an adopter failure", () => {
  // The distinction the design record insists on: a fragment in a kind whose fragments this
  // framework cannot resolve is the framework's limitation. Reporting it as a project warning would
  // be the framework blaming a project for a check it never performed.
  const e = envelopeFor("locator-fragment-unsupported");
  const rule = ruleOf(e, FRAGMENT_RULE);
  assert.equal(rule.status, "skipped", "an unsupported fragment kind must not produce a project finding");
  assert.equal(rule.disposition, "not-evaluated");
  assert.equal(
    rule.notEvaluatedBecause,
    "unresolved-evidence",
    "and it must not be reported as having had nothing to look at, either",
  );
  assert.equal((e.findings ?? []).filter((f) => f.rule === FRAGMENT_RULE).length, 0);
  assert.equal(e.status, "COMPLIANT", "the framework's own limitation must not move the verdict");
});

// ---------------------------------------------------------------------------
// D6 · the inspected record names what the adopter wrote.
// ---------------------------------------------------------------------------

test("D6 · the cited-artifacts record carries the declared locator verbatim", () => {
  const cited = citedArtifacts(envelopeFor("locator-anchor-absent"));
  assert.ok(Array.isArray(cited.locators), "the surface records no declared locators at all");
  assert.ok(
    cited.locators.includes("proofs/clm-0002.md#no-such-section"),
    `the declared locator is absent from the inspection record: ${JSON.stringify(cited.locators)}`,
  );
});

test("D6 · and it is the spelling the adopter used, not a normalised one", () => {
  const present = citedArtifacts(envelopeFor("locator-anchor-present"));
  assert.ok(
    present.locators.includes("proofs/clm-0002.md#proof-of-clm-0002"),
    `the resolvable anchor was normalised away: ${JSON.stringify(present.locators)}`,
  );
});

// ---------------------------------------------------------------------------
// D7 · the release boundary.
//
// Not a correctness property. If the declared locator replaces the bare containing file in `paths`,
// a consumer joining on that field breaks and the change is MAJOR rather than MINOR.
// ---------------------------------------------------------------------------

test("D7 · no anchor leaks into cited-artifacts.paths", () => {
  for (const name of ["locator-anchor-present", "locator-anchor-absent", "locator-anchor-and-missing-file"]) {
    const cited = citedArtifacts(envelopeFor(name));
    assert.ok(Array.isArray(cited.paths), `${name}: paths is no longer an array`);
    assert.ok(
      cited.paths.every((p) => !p.includes("#")),
      `${name}: an anchor reached the paths array — ${JSON.stringify(cited.paths)}. The declared ` +
        `locator must ACCOMPANY the containing file, never replace it; replacing it is MAJOR.`,
    );
  }
});

test("D7 · the containing file is still there to be joined on", () => {
  // The other half: `paths` staying free of anchors would also be satisfied by an empty array.
  const cited = citedArtifacts(envelopeFor("locator-anchor-absent"));
  assert.ok(cited.paths.includes("proofs/clm-0002.md"), `the containing file left the record: ${JSON.stringify(cited.paths)}`);
  assert.equal(cited.state, "resolved-nonempty");
});

// ---------------------------------------------------------------------------
// R1, R2 · the two review findings on this branch, and the design record's answer to each.
//
// Both arrived as automated review comments on the pull request for this change. Neither is a
// regression against `main` — the rule they concern did not exist there — and neither was decided by
// the reviewer: design/fe-44-locator-contract.md already settles both, in opposite directions.
//
//   R1  the declared fragment was slugged before matching, so `#a.b` resolved against a heading
//       `A.B` whose only anchor is `ab`. Fixed: the locator is compared as written. A rule whose
//       whole subject is "the named place is not there" must not manufacture a match for it.
//   R2  a ledger mixing a followable locator with an unfollowable one reports on the followable one
//       and names the rest in `reason`. NOT changed. Withdrawing the rule because one locator was
//       unreachable is §4 Model 3's granularity error — "one unresolvable anchor would withdraw the
//       rule entirely, discarding the existence checks" — which the design record rejects outright.
//       The wording that read as a per-locator promise was corrected instead.
// ---------------------------------------------------------------------------

test("R1 · a punctuated locator does not match a heading the document does not offer", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mathstd-fe44-frag-"));
  try {
    writeFileSync(path.join(dir, "doc.md"), "# A.B\n\ntext\n");
    const offered = resolveEvidencePointer(dir, "doc.md#ab", { fragments: true });
    const notOffered = resolveEvidencePointer(dir, "doc.md#a.b", { fragments: true });

    // The document's heading `A.B` contributes exactly one anchor, `ab`. A locator spelling that
    // anchor resolves; a locator spelling the heading's punctuation does not, because no such
    // anchor exists to link to. Slugging the declared side collapses the two.
    assert.equal(offered.status, POINTER.resolved, "the anchor the document does offer stopped resolving");
    assert.equal(
      notOffered.status,
      POINTER.missing,
      "'#a.b' was reported resolved against a document offering only '#ab' — the declared fragment " +
        "is being slugged before comparison, which lets this rule manufacture the match it exists to deny",
    );
    assert.equal(notOffered.kind, "fragment", "the absent fragment lost the evidence that it was searched for");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("R1 · and the ways a document can legitimately offer an anchor still work", () => {
  // The other half: reporting everything absent would also satisfy the assertion above.
  const dir = mkdtempSync(path.join(os.tmpdir(), "mathstd-fe44-frag-"));
  try {
    writeFileSync(path.join(dir, "doc.md"), '# Proof of CLM-0002\n\n## Base case {#base}\n\n<a id="uniformity"></a>\n');
    for (const fragment of ["proof-of-clm-0002", "base", "uniformity"]) {
      assert.equal(
        resolveEvidencePointer(dir, `doc.md#${fragment}`, { fragments: true }).status,
        POINTER.resolved,
        `'#${fragment}' is offered by the document and was reported absent`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("R2 · an unfollowable locator sets itself aside; it does not withdraw the rule", () => {
  // A ledger declaring BOTH a Markdown fragment this framework can look for and a `.py` fragment it
  // cannot. Model 3's granularity error would report the whole rule not-evaluated here, discarding a
  // check that was actually performed. Built outside the repository so no committed fixture teaches
  // a shape the design record rejects.
  const dir = mkdtempSync(path.join(os.tmpdir(), "mathstd-fe44-mixed-"));
  try {
    cpSync(path.join(HOME, "test/fixtures/locator-anchor-present"), dir, { recursive: true });
    const ledger = path.join(dir, "artifacts/claims-ledger.md");
    const followable = "  - proof — `proofs/clm-0002.md#proof-of-clm-0002`";
    const text = readFileSync(ledger, "utf8");
    assert.equal(text.split(followable).length - 1, 1, "the fixture's resolvable locator moved; this test needs it");
    writeFileSync(ledger, text.replace(followable, `${followable}\n  - computational — \`computations/density/search.py#scan\``));

    const { out } = run(["validate", `--dir=${dir}`, "--json"]);
    const result = JSON.parse(out).results.find((r) => r.ruleId === FRAGMENT_RULE);
    assert.ok(result, `${FRAGMENT_RULE} is absent from the results entirely`);

    assert.equal(
      result.status,
      "passed",
      `one unfollowable locator withdrew the whole rule (status ${result.status}, because ` +
        `${result.notEvaluatedBecause}). That discards the Markdown fragment that WAS checked and ` +
        `found, which is the granularity the design record rejects in Model 3.`,
    );

    const surface = result.inspected.surfaces.find((s) => s.surface === "declared-locator-fragments");
    assert.deepEqual(
      surface.paths,
      ["proofs/clm-0002.md#proof-of-clm-0002"],
      "the rule's subject is the locators it could follow, and nothing else",
    );
    assert.match(
      surface.reason ?? "",
      /computations\/density\/search\.py#scan/,
      `the locator set aside is not named in the record: ${JSON.stringify(surface.reason)}. Excluding it ` +
        `silently would be the FE-44 defect itself, one layer down.`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
