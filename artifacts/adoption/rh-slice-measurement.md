# Measurement — eleven real claims, an honest problem record, zero attestations

**The first evaluation since integration.** Specimen at `65c744b` on `standards-adoption`. Raw output
preserved in [`rh-slice-validate.json`](rh-slice-validate.json). No attestation exists; no policy
field was edited; the framework is unchanged.

```text
                 baseline      post-init     slice
status           NOT_EVALUATED BLOCKED       BLOCKED_BY_INVARIANT
score            95            92            90
passed           51            49            48
failed           2             4             5
skipped          29            29            29
```

---

## 1. The headline

**Twenty-four invariants are unevaluated, and the one that fired is a false positive.**

All 29 not-evaluated rules are `manual-review`, and **24 of them are `forbidden` + non-exemptible** —
invariants. So the framework's strongest guarantees are, in this state, entirely unexercised, while
the single rule producing `BLOCKED_BY_INVARIANT` is the prose regex already characterized as
misfiring on all five of its matches.

```text
invariants that could stop the work        25
  evaluated by a detector                   1   ← and it is wrong
  awaiting a human that has not looked     24
```

That is what "no attestations yet" costs, stated as a number rather than a worry. The 29-manual-rule
figure was known from the catalog; what adoption adds is that **24 of them are the non-negotiable
ones**, and that a project can reach a terminal verdict without any of them being examined.

Among the 24 is `problems.restatement-as-solution`. This project's entire Phase I conclusion is that
every live bridge turned out to be RH restated — it found that itself, by contract screening, and the
rule that exists to catch it never ran. Likewise `proof.difficulty-displacement`, which is the
question C2b and C7 exist to answer.

## 2. What changed, and whether each is real

Five rules moved since post-init.

| Rule | Move | Verdict |
| --- | --- | --- |
| `evidence.artifact-linked` | failed → **passed** | **Real.** The synthetic `CLM-0001` is gone; every cited path now exists |
| `formal.status-declared` | failed → **passed** | **Real.** Five claims now declare formal status against the Lean development. This is the rule doing exactly its job |
| `literature.known-result-comparison` | failed → failed, **different subjects** | **True positive.** Now CLM-0003 and CLM-0008, both at proved rank with only `formal` evidence. I recorded a literature comparison where I could point at one and omitted it where I could not; the rule caught the two omissions |
| `computation.scope-declared` | passed → **failed** | **Mixed** — §3 |
| `computation.error-bounds-stated` | passed → **failed** | **False positive**, and mathematically interesting — §3 |
| `proof.counterexample-search-recorded` | passed → **failed** | **False positive**, new class — §3 |

Two genuine fixes, one true positive, three new findings of which two are wrong. The prose arm is
unchanged and remains the only invariant block, exactly as before.

## 3. Three new findings, characterized

### `computation.error-bounds-stated` — big-O read as an unbounded approximation

Fires on CLM-0004 and CLM-0005, both of which state `c_n = O(n^{-3/4+ε})`.

[`standards.mjs:915`](../../scripts/standards.mjs):

```js
const approximate = /≈|~=|\bapproximately\b|\babout\b|\bO\(|\bo\(|\bΘ\(|\bΩ\(|\btruncat/i.test(entry.statement);
const bounded     = /\berror\b|\bbound\b|\binterval\b|\bwithin\b|\bat most\b|\bprecision\b/i.test(...);
```

`O(` marks the statement approximate; the absence of the word "bound" marks it unbounded. **But a
big-O statement is not an approximation lacking an error bound — the `O` is the error bound.**
Asymptotic notation is a rigorous universally-quantified inequality with an implied constant, which
is precisely the thing the rule wants to see stated. The detector has inverted the mathematics: it
treats the presence of rigorous asymptotic notation as evidence that rigour is missing.

This is the same shape as the prose arm — a lexical proxy standing in for a semantic relation — and
the same inversion under rigour. A project that writes `c_n = O(n^{-3/4+ε})` is being more precise
than one that writes "`c_n` decays fast", and only the first is flagged.

### `proof.counterexample-search-recorded` — a published theorem asked to search for counterexamples

Fires on CLM-0005, Báez-Duarte's criterion: a `THEOREM` whose evidence is `citation` plus
`literature-search`. The skip list is `{counterexample-search, proof, formal, computational}` —
`citation` is absent.

Two rules in the same catalog disagree about what `citation` means. `computation.evidence-as-proof`
uses `PROOF_EVIDENCE = {proof, formal, citation}` and treats a citation as adequate support for a
proved-rank claim. This rule does not, and so demands a counterexample search of a result published
in 2005 and relied on as literature. **An internal inconsistency between two rules' evidence sets**,
not a judgement call.

### `computation.scope-declared` — half true positive, half a gap in the model

Two hits, and they are different.

**CLM-0011 is a true positive.** Its numerical evidence names no arithmetic. The underlying zoo record
may, but the ledger entry does not, and that is what the rule asks about.

**CLM-0010 is a gap in the rule.** Its evidence reads *interval arithmetic with a certified tail
bound, N = 240, p = 5*. The arithmetic test passes; the range test fails, because
`looksBounded` wants `n ≤ …`, "up to …", "first N …". **The claim has no range — it is a certified
bound at a single parameter value, `c = 5`, deliberately.** The entry says so in `Quantifiers:`
("none — a single certified numerical bound at one parameter value, not a statement over a range"),
which the detector does not read.

So the rule cannot express *scope: one point, on purpose*. It assumes computational evidence always
covers a range, and a single certified value — the most careful kind of computational claim — has
nowhere to declare itself.

## 4. Were the passes vacuous?

Mostly no, and that is the clearest improvement in the run. Eleven claims with real fields,
real dependency edges, real evidence paths and real `iff` equivalences gave the ledger-gated
detectors genuine subjects for the first time:

- `proof.circular-dependency` ran a DFS over an actual edge (CLM-0010 → CLM-0008)
- `claims.silent-promotion` checked five proved-rank claims for evidence on their promoting history
- `evidence.equivalence-direction-proved` resolved three `iff` assertions to their proving claims
- `claims.inline-label-consistency` had prose to read — `problem.md` cites nine claim ids — and
  correctly found no mismatch
- `formal.placeholder-in-chain` scanned 152 Lean files against five formal claims

**A few passes remain vacuous**, and they are the ones with no subject in this slice rather than none
in the project: `claims.definitions-first` (no `DEFINITION` entries registered),
`literature.resolvable-identifiers` (the one citation carries no DOI or arXiv id),
`computation.float-as-exact` (no evidence claims exact arithmetic from a script).

The v1.1 §0 defect is therefore **narrowed, not resolved**. It no longer affects twenty-three rules;
it affects a handful, and the JSON still cannot distinguish those from evaluated passes.

## 5. Duplication actually required

| | |
| --- | --- |
| RH records translated | 11 claims from ~63 source items; `problem.md` from 6 documents |
| Content duplicated | the target statement (once, deliberately); the difficulty answer (one paragraph, newly written); four terminated-approach summaries with `Status:` / `Evidence required to reopen:` lines |
| Content referenced | `CONTRACTS.md`, `CLOSURE_MAP.md`, `ATTACK_SURVEY.md`, `PROMOTION.md`, `MODEL_ZOO.md`, `FAILED_APPROACHES.md`, `ExistingResults.lean`, `Definitions.lean` |
| Fields RH did not previously maintain | 5 per claim — `Status`, `Domain`, `Quantifiers`, `Obligations`, dated `History` |
| RH information with nowhere to go | 6, unchanged, plus live-contract state |
| Framework fields adding nothing | 3, unchanged |

The four terminated-approach blocks are the only forced duplication, and they exist because
`lifecycle.terminated-approaches` and `lifecycle.reopening-evidence` read `###` blocks inside
`problem.md` and cannot see `CLOSURE_MAP.md`. Each block is a two-sentence summary of a closure-map
row. **This is the failed-routes observation from the previous phase, now costing real duplication
rather than being hypothetical.**

Everything else was referenced. The index-not-mirror property held.

## 6. Can a reader move between the two records without contradiction?

Yes, in both directions, for all eleven claims. The ledger says less than `CONTRACTS.md` — it drops
gate state, outcome, the frontier property, and the category — but it says nothing `CONTRACTS.md`
contradicts, and every entry names the document that holds the rest. Where the loss is material the
entry says so in prose rather than papering over it: CLM-0004 records that the bridge's frontier
property is not expressible, CLM-0007 that the ledger is silent about what B18 decided, CLM-0009 that
category 2 is not encoded, CLM-0010 that the scope manifest is not.

**No claim required distorting RH state to fit.** The one place where the fit was genuinely bad — five
live contracts with no section — was recorded as a gap rather than resolved by inventing a tenth
section. On the evidence of this slice the ledger is behaving as an index.

## 7. Summary of the requested capture

| Question | Answer |
| --- | --- |
| Rules genuinely evaluated | 53 have detectors; the ledger-gated ones now have real subjects for the first time |
| Still `not-evaluated` | 29, **all manual-review, 24 of them invariants** |
| New false positives | 2 — `error-bounds-stated` on big-O; `counterexample-search-recorded` on a citation |
| Genuine violations | 1 — `literature.known-result-comparison` on CLM-0003, CLM-0008; plus half of `scope-declared` (CLM-0011) |
| Vacuous passes remaining | a handful, named in §4; down from 23 |
| Invariant block | unchanged — the same five prose false positives, still the only one |
| Manual rules with a real subject in this slice | roughly 10–12 of 29, including `difficulty-displacement`, `restatement-as-solution`, `citation-statement-drift`, `hidden-assumption`, `cherry-picking`, `discarded-failures` |
| Duplication necessary | four terminated-approach blocks; the target statement; one paragraph of new prose |

## 8. Not done

No detector was changed, no regex tuned, no fixture added, no rule reclassified. The two new false
positives are recorded here and not yet filed as v1.1 candidates — they want the second adopter to
say whether they generalize. **The migration to the remaining ~50 claims has not started**, which was
the point of stopping at eleven: `error-bounds-stated` would have fired on every asymptotic statement
in the project, and finding that at eleven entries costs nothing to characterize.

`RiemannHypothesis` at `65c744b`. Framework unchanged, gates green.
