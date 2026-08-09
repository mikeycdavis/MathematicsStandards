import { test } from "node:test";
import assert from "node:assert/strict";

import {
  STATUS_RANK,
  EVIDENCE_CEILING,
  PROOF_EVIDENCE,
  LITERATURE_EVIDENCE,
  PROVED_RANK,
  rankOf,
  isProvedRank,
  capsSupport,
  parseLedger,
  dependencyClosure,
  findCycles,
  danglingEdges,
  findReferences,
  looksUniversal,
  looksBounded,
  isPathShaped,
} from "../scripts/claims.mjs";

const entry = (body) => parseLedger(body).entries;

// ---------------------------------------------------------------------------
// The status vocabulary and the rank map
// ---------------------------------------------------------------------------

test("the vocabulary is exactly the fifteen tokens of the source hierarchy", () => {
  assert.equal(STATUS_RANK.size, 15);
  for (const token of [
    "DEFINITION", "OBSERVATION", "NUMERICAL_OBSERVATION", "HEURISTIC", "HYPOTHESIS",
    "CONJECTURE", "LEMMA", "PROPOSITION", "THEOREM", "CONDITIONAL_THEOREM",
    "EQUIVALENT_REFORMULATION", "COMPUTATIONAL_VERIFICATION", "FORMALIZED_THEOREM",
    "MACHINE_CHECKED_PROOF", "UNRESOLVED_CLAIM",
  ]) {
    assert.ok(STATUS_RANK.has(token), `${token} is missing from the vocabulary`);
  }
});

test("the rank map departs from the source order exactly where Standard 2 R3 says it does", () => {
  // Lateral and terminal states do not sit above CONJECTURE despite being listed after THEOREM.
  assert.equal(rankOf("EQUIVALENT_REFORMULATION"), rankOf("CONJECTURE"));
  assert.ok(rankOf("COMPUTATIONAL_VERIFICATION") < PROVED_RANK);
  assert.equal(rankOf("UNRESOLVED_CLAIM"), -1);
  // A conditional theorem is weaker than a theorem, whatever the listing order suggests.
  assert.ok(rankOf("CONDITIONAL_THEOREM") < rankOf("THEOREM"));
  // The line the framework is built around.
  assert.equal(isProvedRank("COMPUTATIONAL_VERIFICATION"), false);
  assert.equal(isProvedRank("LEMMA"), true);
});

test("a definition caps what depends on it only when it carries an open obligation", () => {
  const clean = entry(`## CLM-0001 — D
- **Status:** DEFINITION
- **Statement:** x is nice when P(x).
- **Obligations:** none
- **History:**
  - 2026-01-01 → DEFINITION (stipulated, notes.md)
`).get("CLM-0001");
  assert.equal(capsSupport(clean), false, "a plain definition is stipulated, not unproved");

  const owing = entry(`## CLM-0002 — D
- **Status:** DEFINITION
- **Statement:** Let f be THE minimiser.
- **Obligations:**
  - OB-1 the minimiser exists and is unique — open
- **History:**
  - 2026-01-01 → DEFINITION (stipulated, notes.md)
`).get("CLM-0002");
  assert.equal(capsSupport(owing), true, "an undischarged existence obligation propagates");
});

test("the evidence vocabulary keeps citation and literature-search apart", () => {
  assert.ok(PROOF_EVIDENCE.has("citation"));
  assert.equal(PROOF_EVIDENCE.has("literature-search"), false, "a search record must never satisfy the proof test");
  assert.ok(LITERATURE_EVIDENCE.has("citation") && LITERATURE_EVIDENCE.has("literature-search"));
  assert.ok(EVIDENCE_CEILING.get("literature-search") < PROVED_RANK);
  assert.ok(EVIDENCE_CEILING.get("numerical") < PROVED_RANK);
  assert.ok(EVIDENCE_CEILING.get("computational") < PROVED_RANK);
});

// ---------------------------------------------------------------------------
// parseLedger
// ---------------------------------------------------------------------------

const SAMPLE = `# Ledger

## CLM-0001 — Squares are nonnegative
- **Status:** THEOREM
- **Statement:** For all x in R, x^2 >= 0.
- **Domain:** x in R
- **Quantifiers:** universal over x
- **Assumptions:** none
- **Depends:** CLM-0002, external:rudin-1976
- **Obligations:**
  - OB-1 base case — discharged (\`proofs/a.md#base\`)
  - OB-2 the degenerate case — open
- **Equivalences:**
  - CLM-0003 (iff, proved by CLM-0004)
- **Evidence:**
  - proof — \`proofs/a.md\`
  - numerical — checked for n <= 10^6
- **Formal:**
  - assistant: lean4 4.9.0
  - file: \`formal/A.lean\`
  - declaration: sq_nonneg
  - axioms: propext, Classical.choice
- **History:**
  - 2026-01-01 → OBSERVATION (spotted, notes.md)
  - 2026-01-05 OBSERVATION → THEOREM (proof written, proofs/a.md)

## References

- external:rudin-1976 — Rudin, Principles of Mathematical Analysis, 3rd edition, 1976.
`;

test("parseLedger reads every field of a well-formed entry", () => {
  const { entries, references, malformed } = parseLedger(SAMPLE);
  assert.equal(malformed.length, 0);
  const e = entries.get("CLM-0001");
  assert.equal(e.status, "THEOREM");
  assert.equal(e.domain, "x in R");
  assert.deepEqual(e.depends, ["CLM-0002", "external:rudin-1976"]);
  assert.equal(e.obligations.length, 2);
  assert.equal(e.obligations[0].state, "discharged");
  assert.equal(e.obligations[1].state, "open");
  assert.equal(e.equivalences[0].direction, "iff");
  assert.equal(e.equivalences[0].provedBy, "CLM-0004");
  assert.deepEqual(e.evidence.map((x) => x.type), ["proof", "numerical"]);
  assert.deepEqual(e.evidence[0].artifacts, ["proofs/a.md"]);
  assert.equal(e.formal.declaration, "sq_nonneg");
  assert.equal(e.history.length, 2);
  assert.equal(e.history[1].from, "OBSERVATION");
  assert.equal(e.history[1].to, "THEOREM");
  assert.equal(references.get("external:rudin-1976").startsWith("Rudin"), true);
});

test("a commented-out example is not a claim", () => {
  // Regression. The shipped template shows higher-rank fields inside an HTML comment; parsing them
  // registered claims the project never made, and the audit then reported findings about
  // mathematics that did not exist. Found by auditing a freshly scaffolded project.
  const { entries } = parseLedger(`# Ledger

## CLM-0001 — Real
- **Status:** DEFINITION
- **Statement:** A real one.
- **History:**
  - 2026-01-01 → DEFINITION (stipulated, notes.md)

<!--
## CLM-0002 — Example only
- **Status:** MACHINE_CHECKED_PROOF
- **Statement:** Not a claim this project makes.
- **History:**
  - 2026-01-01 → MACHINE_CHECKED_PROOF (example, none)
-->
`);
  assert.deepEqual([...entries.keys()], ["CLM-0001"]);
});

test("malformed entries are reported rather than silently dropped", () => {
  const { entries, malformed } = parseLedger(`## CLM-0001 — No status
- **Statement:** Something.

## CLM-0002 — Fine
- **Status:** CONJECTURE
- **Statement:** Something else.
- **History:**
  - 2026-01-01 → CONJECTURE (noted, notes.md)

## CLM-0002 — Duplicate identifier
- **Status:** THEOREM
- **Statement:** A different thing under a used id.
- **History:**
  - 2026-01-01 → THEOREM (noted, notes.md)
`);
  const reasons = malformed.map((m) => m.reason);
  assert.ok(reasons.includes("no Status field"));
  assert.ok(reasons.includes("duplicate claim identifier"));
  assert.ok(entries.has("CLM-0001"), "a broken entry still appears, so it cannot escape scrutiny");
});

test("a status outside the vocabulary survives parsing so the detector can report the real value", () => {
  const { entries } = parseLedger(`## CLM-0001 — X
- **Status:** ESSENTIALLY_PROVED
- **Statement:** Something.
- **History:**
  - 2026-01-01 → ESSENTIALLY_PROVED (noted, notes.md)
`);
  assert.equal(entries.get("CLM-0001").status, "ESSENTIALLY_PROVED");
  assert.equal(STATUS_RANK.has("ESSENTIALLY_PROVED"), false);
});

// ---------------------------------------------------------------------------
// findReferences — the adjacency convention (Standard 3 R3)
// ---------------------------------------------------------------------------

test("a status word adjacent to an identifier asserts that status", () => {
  const refs = findReferences(`
**Theorem** (CLM-0002) settles it.
Theorem (CLM-0003) also.
CLM-0004 (CONJECTURE) remains.
### Lemma (CLM-0005)
`);
  const asserted = Object.fromEntries(refs.map((r) => [r.id, r.assertedStatus]));
  assert.equal(asserted["CLM-0002"], "THEOREM");
  assert.equal(asserted["CLM-0003"], "THEOREM");
  assert.equal(asserted["CLM-0004"], "CONJECTURE");
  assert.equal(asserted["CLM-0005"], "LEMMA");
});

test("a bare identifier asserts nothing", () => {
  // The whole false-positive control. Citing a claim is not promoting it, and a rule that fired on
  // every mention would be switched off within a week, at which point it catches nothing at all.
  const refs = findReferences(`
The estimate follows by CLM-0007 and partial summation.
As shown in CLM-0008, the bound is sharp.
We combine CLM-0009 with the previous step.
`);
  assert.equal(refs.length, 3);
  for (const ref of refs) assert.equal(ref.assertedStatus, null, `${ref.id} should assert nothing`);
});

test("references inside a fenced block are mentions, not assertions", () => {
  const refs = findReferences("```markdown\nTheorem (CLM-0010) would follow.\n```\n");
  assert.equal(refs.length, 0);
});

test("references inside an HTML comment are not references", () => {
  const refs = findReferences("<!--\nTheorem (CLM-0011) would follow.\n-->\n");
  assert.equal(refs.length, 0);
});

// ---------------------------------------------------------------------------
// The dependency graph
// ---------------------------------------------------------------------------

const GRAPH = `## CLM-0001 — A
- **Status:** THEOREM
- **Statement:** A.
- **Depends:** CLM-0002
- **History:**
  - 2026-01-01 → THEOREM (x, y)

## CLM-0002 — B
- **Status:** LEMMA
- **Statement:** B.
- **Depends:** CLM-0003
- **Assumptions:** CLM-0004
- **History:**
  - 2026-01-01 → LEMMA (x, y)

## CLM-0003 — C
- **Status:** LEMMA
- **Statement:** C.
- **Depends:** CLM-0001
- **History:**
  - 2026-01-01 → LEMMA (x, y)

## CLM-0004 — D
- **Status:** CONJECTURE
- **Statement:** D.
- **Depends:** none
- **History:**
  - 2026-01-01 → CONJECTURE (x, y)
`;

test("the closure follows both Depends and Assumptions", () => {
  const { entries } = parseLedger(GRAPH);
  const closure = dependencyClosure(entries, "CLM-0001");
  assert.ok(closure.has("CLM-0002"));
  assert.ok(closure.has("CLM-0003"));
  assert.ok(closure.has("CLM-0004"), "an assumption two steps up still transmits");
});

test("a cycle is reported as the whole path that closes it", () => {
  const { entries } = parseLedger(GRAPH);
  const cycles = findCycles(entries);
  assert.equal(cycles.length, 1, "one cycle, reported once rather than once per member");
  const cycle = cycles[0];
  assert.equal(cycle[0], cycle[cycle.length - 1], "the path closes");
  for (const id of ["CLM-0001", "CLM-0002", "CLM-0003"]) {
    assert.ok(cycle.includes(id), `${id} is part of the reported route`);
  }
});

test("an acyclic graph reports no cycles", () => {
  const { entries } = parseLedger(`## CLM-0001 — A
- **Status:** LEMMA
- **Statement:** A.
- **Depends:** CLM-0002
- **History:**
  - 2026-01-01 → LEMMA (x, y)

## CLM-0002 — B
- **Status:** DEFINITION
- **Statement:** B.
- **Depends:** none
- **History:**
  - 2026-01-01 → DEFINITION (x, y)
`);
  assert.deepEqual(findCycles(entries), []);
});

test("an unresolvable identifier is reported, and a defined external reference is not", () => {
  const { entries, references } = parseLedger(`## CLM-0001 — A
- **Status:** LEMMA
- **Statement:** A.
- **Depends:** CLM-0099, external:known-1930, external:missing
- **History:**
  - 2026-01-01 → LEMMA (x, y)

## References

- external:known-1930 — A real reference.
`);
  const dangling = danglingEdges(entries, references).map((d) => d.edge);
  assert.deepEqual(dangling.sort(), ["CLM-0099", "external:missing"]);
});

// ---------------------------------------------------------------------------
// Text heuristics — deliberately approximate, and labelled INFERRED where used
// ---------------------------------------------------------------------------

test("universal quantification is recognised in the forms informal writing uses", () => {
  for (const text of ["For all n >= 2, P(n).", "for every x in R", "∀ x, P(x)", "infinitely many primes"]) {
    assert.equal(looksUniversal({ statement: text, quantifiers: "" }), true, text);
  }
  assert.equal(looksUniversal({ statement: "The constant is 1.303.", quantifiers: "" }), false);
});

test("a bounded check is recognised, and an unbounded claim is not", () => {
  assert.equal(looksBounded("verified for all n <= 10^9"), true);
  assert.equal(looksBounded("exhaustive up to 500000"), true);
  assert.equal(looksBounded("the first 200 primes"), true);
  assert.equal(looksBounded("a complete proof by induction"), false);
});

test("path-shaped tokens are distinguished from citations and expressions", () => {
  assert.equal(isPathShaped("proofs/clm-0001.md"), true);
  assert.equal(isPathShaped("formal/A.lean#thm"), true);
  assert.equal(isPathShaped("Rudin 1976, Thm 1.18"), false);
  assert.equal(isPathShaped("https://example.org/x.pdf"), false);
  assert.equal(isPathShaped("x^2 >= 0"), false);
});
