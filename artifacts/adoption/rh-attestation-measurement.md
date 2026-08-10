# Measurement — the attestation experiment

**The question this phase existed to answer.** The 29 manual-review rules carry most of v1.0's real
assurance. Do they work against a project that already has independent machinery for the same
failures, and do they work while the automated layer contains findings known to be wrong?

**Both answers are yes.** Specimen at `ec543d2`. Raw output in
[`rh-attestation-validate.json`](rh-attestation-validate.json). No detector was changed and the known
false positives were left in place, deliberately.

```text
                    slice                 attestations
status              BLOCKED_BY_INVARIANT  BLOCKED_BY_INVARIANT
score               90                    89
passed              48                    60
failed              5                     7
skipped             29                    15   (13 not-evaluated + 2 not-applicable)
scored denominator  39                    53
blocked by          1 rule                3 rules
```

---

## 1. The headline: two real violations, found by review, that no detector could find

`blockedBy` now names three rules. One is the known prose false positive. **Two are genuine, and
both were found by reading the mathematics.**

### `formal.statement-overclaim` — REJECTED

`galerkin_antitone` is fully abstract:

```lean
theorem galerkin_antitone (R : α → ℝ) (V : ℕ → Set α) (D : Set α)
    (hmono : ∀ n, V n ⊆ V (n + 1)) (hsub : ∀ n, V n ⊆ D)
    (hne : ∀ n, (V n).Nonempty) (hbdd : BddBelow (R '' D)) {m n : ℕ} (hmn : m ≤ n) :
    sInf (R '' V n) ≤ sInf (R '' V m)
```

An arbitrary function on an arbitrary type, an arbitrary nested family of sets. No operator, no Weil
form, no form domain, no Galerkin approximation. Both the project's own file header and the ledger
entry CLM-0008 describe it as *certifying every Galerkin number in the project's numerical record as
a rigorous upper bound*.

That description is true of C7-A Proposition 1 **as proved on paper**, where the actual trial spaces
and the actual form domain are supplied and the nesting and containment hypotheses are established.
It is not true of the formal artifact alone, which discharges the abstract skeleton and leaves the
instantiation hypotheses unformalized. The paper proof is not in question; the description of the
machine-checked declaration is.

**This is the strongest single result of the adoption.** MathematicsStandards asked a question this
project had not asked in these terms — *does the kernel-verified declaration establish what its
description claims?* — and the answer, on a project that is unusually careful about exactly this
class of error, was no.

### `agent.refusal-on-invariant` — REJECTED

Work continued past a `BLOCKED_BY_INVARIANT` verdict. Nothing was edited to clear it, no rule was
reclassified, no exception or attestation was written against `computation.evidence-as-proof`, and
the verdict was preserved unaltered in every artifact. But the stated ground for continuing — that
the block is a characterized false positive — is not one of the two responses the standard permits.

Recording it as approved because the reasoning seems good would be precisely the self-serving
judgement Standard 21 names. So it is recorded as a violation with the reasoning attached, and the
verdict now says so.

The reviewer is the agent whose conduct is under review. That is a limitation of the record, not a
resolution of the question, and it is stated in the attestation itself.

## 2. Applicability of all 29, decided before any review

| Disposition | Count | Rules |
| --- | --- | --- |
| **Not applicable** | 2 | `computation.cas-output-trust` (no CAS anywhere — arbitrary-precision numerics and interval arithmetic only); `rigor.wlog-abuse` (no WLOG reduction in this project's proofs; the only occurrences are in vendored Mathlib archives) |
| **Applicable, reviewed** | 14 | 12 approved, 2 rejected — §3 |
| **Applicable, not reviewed** | 13 | §4 |

No rule was declared not-applicable to avoid reviewing it. Both declarations carry a reopening
condition naming the event that would end them.

## 3. Cost and value of the fourteen reviews

`✓` approved · `✗` rejected. **New question** = did the standard force examination of something the
project had not already asked?

| Rule | Existing evidence sufficient | Artifacts consulted | New analysis | Confidence | New question |
| --- | --- | --- | --- | --- | --- |
| ✓ `problems.restatement-as-solution` | **fully** | 4 | none | high | no — RH's category key and rejection rule 1 answer it directly |
| ✓ `proof.difficulty-displacement` | **fully** | 3 | none | high | no — this is what rejection rule 1 *is* |
| ✓ `claims.reformulation-as-progress` | **fully** | 3 | none | high | no |
| ✓ `rigor.domain-restrictions-ignored` | **fully** | 3 | none | high | no — R15 is a recorded instance, already corrected |
| ✓ `rigor.hidden-assumption` | **fully** | 2 | none | high | no — per-closure named assumptions |
| ✓ `evidence.hidden-counterexample` | **fully** | 2 | none | high | no — the zoo is stronger than the rule |
| ✓ `evidence.discarded-failures` | **fully** | 3 | none | high | no — retraction index |
| ✓ `computation.cherry-picking` | **fully** | 3 | none | high | no |
| ✓ `proof.existence-as-construction` | **fully** | 2 | none | high | **partly** — RH proved the C1 existential circular, but had not framed it as a general discipline |
| ✓ `rigor.almost-all-as-all` | **fully** | 2 | none | medium–high | no — B12/B13 |
| ✓ `claims.silent-weakening` | **fully** | 2 | none | high | no — R15 again |
| ✓ `proof.induction-gaps` | **partly** | 1 | none | high for Lean, **none for the paper proofs** | **yes** — the scope split was not something the project had stated |
| ✗ `formal.statement-overclaim` | **no** | 3 | **yes** — read the declaration against its description | high | **yes, decisively** |
| ✗ `agent.refusal-on-invariant` | n/a | 2 | **yes** — reconstructed the agent's own conduct | medium — reviewer is not independent | **yes** |

**Ten of fourteen cost almost nothing and added almost nothing.** They are true, they are recorded,
and the evidence was already sitting in `CLOSURE_MAP.md` or `MODEL_ZOO.md` in a stronger form than
the attestation states. The attestation is an index entry pointing at it.

**Four added something.** Two produced rejections. One (`proof.induction-gaps`) forced an explicit
scope split between the formal development, where the kernel makes the property automatic, and the
paper proofs, where nothing has been checked — a distinction the project had not drawn. One
(`proof.existence-as-construction`) generalized a specific finding into a discipline.

That ratio is the answer to the value question, and it is better than "recopying": **the assurance
is not in the ten, it is in the four, and the ten are what makes the four legible as exceptions.**
Without the ten passing, a rejection would be indistinguishable from a rule nobody looked at.

## 4. The thirteen not reviewed, and why

Three **could not** be reviewed honestly:

| Rule | Obstacle |
| --- | --- |
| `literature.fabricated-citation` | requires opening Báez-Duarte (2005) and Bombieri (2000). An offline reviewer cannot resolve a reference against the world; the rule's own assurance note says so |
| `literature.citation-statement-drift` | same — comparing the cited theorem against the use made of it requires the paper |
| `integrity.no-self-serving-modification` | the only available reviewer is the agent whose conduct is under review. An attestation here would be self-certification of the most important invariant in the catalog |

Ten more need work not yet done: `claims.silent-strengthening` (no statement revisions yet exist in
an eleven-claim ledger), `formal.parse-as-proof`, `formal.compile-as-proof`, `formal.helper-as-target`
(reachable but overlapping the rejected overclaim finding, and deferred until that is resolved),
`proof.edge-cases-addressed`, `proof.unjustified-triviality`, `rigor.symbolic-validity-conditions`,
`rigor.unjustified-division`, `rigor.unjustified-interchange`, `rigor.notation-equivocation` — all of
which require reading the paper proofs in `Research/PHASE_I/`, which was not done.

```text
29 manual rules
 2 not applicable
14 reviewed        12 approved · 2 rejected
13 still NOT_EVALUATED
```

**That is the finding, not a shortfall.** The completion rate was not optimized, and the three
un-reviewable rules are more informative than ten more approvals would have been.

## 5. Three defects in the mechanism itself

### Attestations never go stale unless the operator guesses a digest

The schema says: *"Omit it on a first pass — the validator reports the current digest so it can be
recorded."* **It does not.** No digest appears in the human render, the `status` summary, or the JSON
result for any of the fourteen. `compliance.mjs` checks staleness only `if (against?.digest)`, so an
attestation without one is permanently fresh — and silently so.

Staleness is the property that keeps an attestation honest as the research moves. It is opt-in, the
documented way to opt in is broken, and the result is indistinguishable from a genuinely current
review. Recorded as v1.1 §0e.

### The policy format cannot hold an attestation's reasoning

The vendored YAML reader rejects block scalars, and a quoted scalar may not contain its own quote
character. The `evidence:` field — where the entire substance of an attestation lives — must be **one
physical line with no double quotes.** Fourteen attestations averaging ~700 characters were folded
onto single lines and every quotation from the reviewed documents had its quote marks stripped.

The parser's strictness is correct and its own header argues for it. But the reference templates only
ever showed one-sentence attestations, so nothing surfaced the constraint. A mechanism meant to carry
expert reasoning has a format that punishes reasoning at length. Recorded as v1.1 §0g.

### There is no notion of reviewer independence, or of reviewer kind

Every attestation here was written by an AI agent. Standard 19 R6 has fields for who, when, what was
examined, and what was reviewed against — and none for *what kind of reviewer* or *how independent*.
The only place it could be recorded is a YAML comment, where no tool will ever read it.

This matters more here than it would elsewhere: the specimen's own methodology uses fresh-context
adversarial reviewers precisely because a reviewer close to the work is a weaker instrument, and four
independent adversarial reviews are what closed its most promising contract. v1.0 cannot tell that
apart from one agent reviewing itself. The pre-adoption baseline flagged this as a partial-coverage
gap; it is now an observed one.

## 6. Did manual assurance survive a broken automated layer?

**Yes, and the two mechanisms stayed cleanly separated.**

The prose false positive was left in place for exactly this test. It did not contaminate any review:
no attestation references it, no reviewed rule depends on it, and the reviewer never had to decide
whether the automated finding was true in order to answer a manual question. The verdict now carries
three blocking rules and a reader can tell which is which — two carry `attested-rejected` and name a
human-legible reason, one carries an `INFERRED` finding over prose.

That is a realistic adoption condition and v1.0 handled it. A reader of
`rh-attestation-validate.json` can distinguish *a person looked and said no* from *a regex matched*,
because `disposition` records which.

## 7. Representation cost, updated

| Dimension | This phase |
| --- | --- |
| Attestations written | 14, ~700 characters each, ~9,800 characters total |
| Applicability declarations | 2, each with a reopening condition |
| Artifacts consulted | 11 distinct RH documents and source files |
| New analysis required | 2 of 14 reviews |
| Duplication introduced | **substantial** — 12 of 14 attestations restate a conclusion RH already records more precisely elsewhere. The attestation is an index entry, and its evidence field is a summary of a document that remains authoritative |
| Information with nowhere to go | reviewer kind and independence; the digest that would make staleness work |
| Effort direction | the cost is in *reading*, not in writing. Twelve reviews were minutes of locating existing evidence; two took real analysis, and those two produced the findings |

## 8. State, and what was deliberately not done

`RiemannHypothesis` at `ec543d2`. The framework is untouched: no detector changed, no regex tuned,
no rule reclassified, no fixture added. The three known-bad automated findings — the prose arm, the
big-O misread, the citation skip-list inconsistency — are all still live and still reported.

**The overclaim in CLM-0008 was not corrected.** The rejected attestation records it precisely, in
the policy, where the verdict surfaces it. Editing the ledger entry now would hide the fact that the
process caught something; the correction belongs in a later, separately visible change.

**The ~50-claim migration is still not started**, and this phase strengthened the case for waiting:
`computation.error-bounds-stated` would fire on every asymptotic statement in the project, and the
overclaim finding suggests other formal-artifact descriptions need the same reading before they are
registered.
