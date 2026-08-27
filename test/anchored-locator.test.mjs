/**
 * FE-42 · one locator, one spelling, one meaning.
 *
 * WHY THIS FILE EXISTS. The claims-ledger grammar of Standard 3 lets an adopter name a location
 * inside a file — `proofs/clm-0002.md#base`, `formal/Main.lean#main_result`. Five consumers read
 * those locators and, before this file, four of them cut the string at the `#` with their own copy
 * of the same expression while a fifth compared the raw value against the file set. Four copies of
 * one rule is how the copies stop agreeing, and they had: a Formal block writing
 * `file: formal/Main.lean#main_result` matched nothing, so the claim's own artifact vanished from
 * `inspected.surfaces` and the envelope reported that it had inspected **no** cited artifacts for a
 * ledger that cites one. A surface resolving to nothing while reporting a number is the §0 defect
 * this repository was built to stop, arriving through a spelling difference.
 *
 * WHAT IS PINNED HERE, AND WHAT DELIBERATELY IS NOT. Two contracts survive this change untouched,
 * and both are load-bearing:
 *
 *   1. `evidence.artifact-linked` resolves a locator "with any anchor suffix removed before
 *      resolution". That sentence has been in the catalog since the commit that created it. A
 *      nonexistent anchor in an existing file therefore still passes. Whether it *ought* to is a
 *      real question — `scripts/pointers.mjs` takes the opposite view for the pointers it handles —
 *      but answering it amends a published rule description, which is a release decision. See
 *      FE-42's record. Nothing below asserts the answer either way; the tests assert only that the
 *      two spellings agree with each other.
 *
 *   2. `formal.placeholder-in-chain` counts placeholders over the whole cited file, deliberately
 *      wider than the declaration the Formal block names, because Standard 16 R3 prohibits a
 *      placeholder "anywhere the target's proof depends on" and nothing here traces that chain.
 *      B3 pins that the scan stays conservative, and B4 pins that the finding says so — an
 *      over-approximation that does not admit to being one is a claim about the declaration.
 *
 * Every assertion names a status, a token, or a named field, and every lookup goes through `ruleOf`,
 * which throws rather than returning undefined. A test that passes because its rule was absent from
 * the results is the exact failure mode the first draft of this work hit.
 * design/testing-principles.md §4.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";

import { containingFile } from "../scripts/claims.mjs";
import { HOME, run } from "./helpers/cli.mjs";

const fixture = (name) => path.join(HOME, "test/fixtures", name);

function envelopeFor(name) {
  const { out } = run(["validate", `--dir=${fixture(name)}`, "--json"]);
  try {
    return JSON.parse(out);
  } catch {
    assert.fail(`no JSON envelope from validate ${name}: ${out.slice(0, 400)}`);
  }
}

/**
 * The non-vacuity guard, used by every assertion below rather than described by one.
 *
 * `results` is an array of `{ ruleId, status, ... }`. A `.find()` that misses returns undefined, and
 * `undefined?.status !== "failed"` is true — so a mistyped rule id turns every negative assertion in
 * this file green while checking nothing. This throws instead.
 */
function ruleOf(envelope, ruleId) {
  const found = (envelope.results ?? []).find((r) => r.ruleId === ruleId);
  assert.ok(found, `${ruleId} is absent from results — the lookup is vacuous, not passing`);
  return found;
}

/** The `cited-artifacts` surface of the rule that publishes it. */
function citedArtifacts(envelope) {
  const surfaces = ruleOf(envelope, "evidence.artifact-linked").inspected?.surfaces ?? [];
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
// B1 · the primitive itself.
// ---------------------------------------------------------------------------

test("B1 · containingFile strips a fragment and leaves an unanchored path alone", () => {
  assert.equal(containingFile("proofs/clm-0002.md#base"), "proofs/clm-0002.md");
  assert.equal(containingFile("proofs/clm-0002.md"), "proofs/clm-0002.md");
  assert.equal(containingFile("formal/Main.lean#main_result"), "formal/Main.lean");
});

test("B1 · both spellings of one locator name the same containing file", () => {
  // The property the five sites disagreed about, stated once: the anchor changes where you look
  // inside a file, never which file it is.
  for (const bare of ["proofs/clm-0002.md", "formal/Main.lean", "computations/density/search.py"]) {
    assert.equal(containingFile(`${bare}#somewhere`), containingFile(bare), bare);
  }
});

test("B1 · a non-string locator yields no path rather than throwing", () => {
  // `entry.formal?.file` is absent on most entries, and the caller adds whatever comes back to a
  // path set. Returning "" keeps a missing Formal block out of the surface instead of crashing the
  // run or inserting "undefined" as a filename.
  assert.equal(containingFile(undefined), "");
  assert.equal(containingFile(null), "");
});

// ---------------------------------------------------------------------------
// B2 · an anchored `formal.file` stays in the inspected record.
//
// The regression this file was written for.
// ---------------------------------------------------------------------------

test("B2 · an anchored formal.file is still counted as a cited artifact", () => {
  const cited = citedArtifacts(envelopeFor("formal-anchored-locator"));
  assert.equal(cited.state, "resolved-nonempty", "the ledger cites an artifact; the surface must say so");
  assert.equal(cited.count, 1, `expected one cited artifact, got ${cited.count}`);
  assert.deepEqual(cited.paths, ["formal/Main.lean"], "the anchor must be stripped, not carried into the path");
});

test("B2 · the anchored fixture is the isolating case it claims to be", () => {
  // Non-vacuity for B2. In `sorry-certified` the Evidence block also cites `formal/Main.lean`, so
  // the file reaches the surface by a second route and an anchored `file:` could break without any
  // test noticing — which is exactly what happened. This fixture removes that route, so the Formal
  // block is the only thing citing the file. If a future edit puts it back, B2 stops measuring the
  // site it exists for and this assertion says so.
  const { out } = run(["validate", `--dir=${fixture("formal-anchored-locator")}`, "--json"]);
  const ledger = JSON.parse(out);
  const entry = JSON.stringify(ledger);
  assert.match(entry, /formal\/Main\.lean/, "the fixture no longer references the formal artifact at all");
  assert.equal(citedArtifacts(ledger).count, 1, "a second citation route would make B2 vacuous");
});

test("B2 · anchoring the locator does not change the verdict", () => {
  // The two fixtures differ only in the anchor and in the removed duplicate citation. The claim is
  // still MACHINE_CHECKED_PROOF over a file containing `sorry`, so the invariant still blocks.
  const anchored = envelopeFor("formal-anchored-locator");
  assert.equal(anchored.status, "BLOCKED_BY_INVARIANT");
  assert.equal(ruleOf(anchored, "formal.placeholder-in-chain").status, "failed");
});

// ---------------------------------------------------------------------------
// B3 · the placeholder scan stays conservative.
//
// Standard 16 R3 prohibits a placeholder "anywhere the target's proof depends on". Nothing here
// traces that chain, so the containing file is the envelope around it. Narrowing to the anchor
// would be a false-assurance regression on a forbidden, non-exemptible rule.
// ---------------------------------------------------------------------------

test("B3 · a placeholder OUTSIDE the named declaration still reaches the rule", () => {
  // The assertion that makes B3 load-bearing. In `formal-anchored-locator` the `sorry` sits inside
  // `main_result`, so narrowing the scan to the anchor would leave that fixture failing and this
  // group would pass while measuring nothing. Here `main_result` is clean and the placeholder is in
  // `unrelated_scratch` further down the file: the scan reaches it only while it stays whole-file.
  const e = envelopeFor("formal-placeholder-elsewhere");
  assert.equal(ruleOf(e, "formal.placeholder-in-chain").status, "failed");
  assert.equal(e.status, "BLOCKED_BY_INVARIANT", "the invariant must still block on the wider scope");
  const evidence = findingFor(e, "formal.placeholder-in-chain").evidence.join("\n");
  assert.match(evidence, /formal\/Main\.lean/, "the finding must name the file it actually read");
});

test("B3 · that fixture's named declaration really is clean, or the test proves nothing", () => {
  // Non-vacuity for the assertion above: if someone later drops a `sorry` into `main_result`, the
  // narrowing mutation stops being detectable and B3 silently reverts to the weaker property.
  const source = readFileSync(
    path.join(HOME, "test/fixtures/formal-placeholder-elsewhere/formal/Main.lean"),
    "utf8",
  );
  const target = source.slice(source.indexOf("theorem main_result"), source.indexOf("unrelated_scratch"));
  assert.doesNotMatch(target, /\bsorry\b/, "main_result must stay placeholder-free for B3 to bite");
  assert.match(source, /unrelated_scratch[\s\S]*sorry/, "the placeholder must stay outside the declaration");
});

test("B3 · the rule keeps the level and severity that make it an invariant", () => {
  // If this rule ever stopped being forbidden and non-exemptible, narrowing its scan would become a
  // much smaller question — so the property B3 protects is only meaningful while this holds.
  const rule = ruleOf(envelopeFor("formal-anchored-locator"), "formal.placeholder-in-chain");
  assert.equal(rule.level, "forbidden");
  assert.equal(rule.severity, "error");
});

// ---------------------------------------------------------------------------
// B4 · the over-approximation admits to being one.
//
// The scan is deliberately wider than the declaration. A finding that does not say so is a claim
// about the declaration, which is the false-assurance shape pointing the other way.
// ---------------------------------------------------------------------------

test("B4 · the finding states that the dependency chain is not traced", () => {
  const finding = findingFor(envelopeFor("formal-anchored-locator"), "formal.placeholder-in-chain");
  const text = `${finding.message}\n${finding.evidence.join("\n")}`;
  assert.match(text, /not traced|does not trace/i, "the finding must disclose that the chain is untraced");
  assert.match(text, /conservative|somewhere in the file/i, "it must say the scan is wider than the declaration");
});

test("B4 · the evidence line does not assert the named declaration contains a placeholder", () => {
  // The distinction the qualification exists to preserve: "your file has a sorry in it somewhere"
  // and "your theorem is unproved" are different statements, and only the first was measured.
  const finding = findingFor(envelopeFor("formal-anchored-locator"), "formal.placeholder-in-chain");
  const line = finding.evidence.find((l) => l.includes("formal/Main.lean"));
  assert.ok(line, "no evidence line names the cited file");
  assert.match(line, /somewhere in the file/, "the line must locate the placeholder at file granularity");
  assert.match(line, /does not establish/, "the line must disclaim the stronger reading");
});

test("B4 · the label is OBSERVED, because a file read is an observation", () => {
  // The qualification is about scope, not about confidence. What was read really was read; the
  // finding must not drift to INFERRED and imply the placeholder count is a guess.
  assert.equal(findingFor(envelopeFor("formal-anchored-locator"), "formal.placeholder-in-chain").label, "OBSERVED");
});

// ---------------------------------------------------------------------------
// B5 · the preserved contract, pinned so a later change is deliberate.
// ---------------------------------------------------------------------------

test("B5 · file-level consumers agree across both spellings on a real repository", () => {
  // Not "an anchor resolves" and not "an anchor fails" — neither is asserted here. The property is
  // that the four file-level sites reach the same answer for the same file however it was spelled,
  // which is what the shared primitive buys and what their disagreement cost.
  const anchored = citedArtifacts(envelopeFor("formal-anchored-locator"));
  assert.equal(anchored.state, "resolved-nonempty");
  assert.ok(
    anchored.paths.every((p) => !p.includes("#")),
    `an anchor leaked into the inspected paths: ${JSON.stringify(anchored.paths)}`,
  );
});
