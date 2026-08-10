# Two independent adopters

**What this document is.** MathematicsStandards v1.0.0 has now been adopted twice, by two agents
working from the same frozen framework and the same published `INSTRUCTIONS.md` limitations table,
against two different research repositories, without either seeing the other's record.

- **RiemannHypothesis** — branch `standards-adoption` at `ec543d2`, measured across seven phases in
  this directory (`rh-*.md`).
- **PvsNP** — branch `standards-adoption` at `2185937`, measured in that repository's own
  `docs/standards-adoption/`, six commits, 2026-08-10.

Neither record cites the other. PvsNP's findings enumerate "the first adopter's known limitations"
by number, and those numbers are `INSTRUCTIONS.md`'s published limitations table, not RH's findings.
The independence is real, and it is what makes the agreements below evidence rather than echo.

**Nothing in either specimen or in the framework was modified to produce this document.** It is a
comparison of two preserved records.

```text
                            RiemannHypothesis        PvsNP
declarations                 987                      3,489
registered claims            11 (slice; ~60 est.)     24 (complete)
share of declarations        ~5% projected            0.69%
attestations                 14 (12 ✓ · 2 ✗)          0, deliberately
verdict                      BLOCKED_BY_INVARIANT     BLOCKED_BY_INVARIANT
blocking rules               3                        1
score / denominator          89% over 53              97% over 39
real defects found in the
  project by the framework   1 (formal.statement-     1 (proof.complete-with-
                                overclaim)               open-obligations)
```

Both reached a terminal blocked verdict. Both left it blocked. Neither edited honest prose to clear
a finding. That convergence is the single most important line in the table.

---

## 1. The six hypotheses

### H1 · Ledger unit — **replicated, and sharpened**

Both adopters independently rejected the declaration inventory and independently arrived at the same
unit: *a claim is a place where a reader asks "how do you know?" and the answer is not "read the next
line of Lean". A declaration is normally evidence for a claim, not a claim.*

PvsNP wrote that criterion into the ledger's own preamble **and** into `AGENTS.md`, with a reason RH
did not state: *"the pressure to inventory is structural — the tool counts claims, and a project that
wants a bigger number can always produce one."*

The sharpening is in the ratio. It did not hold; it **fell** with scale.

```text
RH     ~50-60 of   987 declarations   ~5%
PvsNP      24 of 3,489 declarations   0.69%
```

A proportional unit would have given PvsNP ~175 claims. It gave 24. So the unit is **absolute, not
proportional**: the number of places a project's epistemic weight actually rests is a property of the
research programme, not of how much of it has been formalised. This is now measured twice and is the
strongest structural result the two adoptions produced jointly.

It also retires the ~5% figure permanently as anything resembling a target — a use the RH record had
already forbidden, now with a second data point that contradicts it outright.

### H2 · First unproved bridge — **NOT replicated. Do not mandate it.**

This is the hypothesis that failed, and its failure is the most valuable single result of the second
adoption.

RH's contracts C1–C8 are linear chains, and each carries an explicit *first unproved bridge* — the
earliest link not yet established. PvsNP has **no equivalent concept, and reasoned its way out of one
on the record.** `docs/ITERATIONS.md` says, verbatim:

> This file previously said Phase 1 begins only after Phase 0 — the foundation through Cook–Levin —
> is complete. **That rule was wrong and has been dropped.**

The reason it gives is structural: the lower-bound tracks import only the clause and counting layers
and use no Turing machine, so serialising them behind Cook–Levin "would have bought nothing and cost
the two closures that came out of running them." What PvsNP has instead is `NEXT_STEPS.md`'s *what
remains* table — a **frontier set**, one "needs X" per independent track, with no first element and
no ordering among them.

RH's frontier is a point because RH's dependency structure is a chain. PvsNP's is an antichain.
**"First unproved bridge" is a property of chain-shaped research programmes, not of mathematical
research.** Had v1.1 mandated it universally, PvsNP would have had to invent a serialisation its own
record documents as a mistake it already made and corrected — which is precisely the "more
machine-legible at the expense of the actual research model" failure the whole experiment exists to
detect. The framework would have pushed a project back toward an error it had escaped.

The generalisable abstraction underneath is weaker and survives both: **a research programme should
be able to name what it is currently blocked on, and the representation must not assume there is
exactly one.**

### H3 · Process state orthogonal to claim status — **replicated in role, not in content**

RH has gates G1–G5 ("no skipping forward"), run over an approach before it advances. PvsNP has, in
`ITERATIONS.md`, a mandatory per-iteration **Barrier Check** — Relativization / Natural Proof /
Algebrization / Literature, each PASS/FAIL with recorded reasoning — run *before* the theorem is
attempted, plus a standing rule to grep `FAILED_ATTEMPTS.md` first.

Same role, entirely different content, invented independently: **a gate on the attempt, evaluated
before the work, recorded, and orthogonal to any claim's epistemic status.** Neither project's gate
state has anywhere to live in v1.0 — `Status` is about the claim, and there is no field about the
attempt.

What does *not* generalise is G1–G5 itself. What generalises is that both projects needed a place to
record *what was checked before we started*, and neither got one.

Both also independently built a **pre-screen that is deliberately not a verdict**: RH's barriers
B12–B24 screen routes; PvsNP's `BARRIERS.md` says so in its own text, and carries Williams's
`NEXP ⊄ ACC⁰` as the counterexample to reading a barrier as a prohibition. v1.0's
`problems.barriers-recorded` wants a list of barriers and cannot hold the distinction.

### H4 · Relevance orthogonal to strength — **replicated, in nearly identical words**

RH encodes it as a category key 0/1/2/3, orthogonal to the 15-status ladder. PvsNP's ledger preamble,
written independently, says:

> **Epistemic status and relevance to P vs NP are separate axes.** CLM-0011 is a
> `MACHINE_CHECKED_PROOF` and, by the project's own barrier audit (CLM-0022), constrains nothing
> about `P/poly`. Both facts are true at once and neither adjusts the other. Nothing in this ledger
> is demoted for being off-target.

Two adopters, two problem domains, the same distinction, both unrepresentable in v1.0's single
`Status` field.

PvsNP reached it under a **different pressure**, which is what makes the replication informative. RH
hit it registering a category-2 result. PvsNP hit it on `EQUIVALENT_REFORMULATION`, which Standard 2
ranks at 4 — below `LEMMA` — because a reformulation is lateral movement. CLM-0004 is a
reformulation *and* a kernel-checked biconditional. Filing it at rank 4 to record the first fact
would have **lowered the recorded status of a machine-checked result**. The field collapses *kind*
and *strength*, and forces a choice between them.

So the axis problem has two independent instances and two different shapes: status-vs-relevance, and
status-vs-kind. Both are one field doing two jobs.

### H5 · Indexing over duplication — **replicated, including the same detector defeating it**

Both held the index property, and both were forced into duplication at the same place.

| | RH | PvsNP |
| --- | --- | --- |
| Referenced, not copied | 8 document families | 10 document families |
| Forced duplication | 4 terminated-approach blocks | ~30 items (24 `Statement` fields, 4 terminated approaches, 1 barrier summary, 1 build table) |
| New hand-authored fields | 5 per claim × 11 claims | ~350 values |

The forced duplication has the **same cause in both**: `lifecycle.*` detectors read `###` blocks
inside `problem.md` and cannot see the project's own failure log.

And `lifecycle.failed-routes-preserved` is now confirmed broken twice over, by two differently-named
files:

```text
ABANDONED = /(^|\/)(abandoned|failed|dead-ends?|attempts?)(\/|$)/i   requires a whole path segment

RH     Research/FAILED_APPROACHES.md    no match
PvsNP  docs/FAILED_ATTEMPTS.md          no match — 1,283 lines, append-only,
                                        written at the moment of abandonment
```

PvsNP states the consequence exactly: the rule **passes**, because `problem.md` has a `###` heading.
*"The single best artifact in this repository for that rule is invisible to the rule."* The rule is
satisfied by the framework's own thin representation while ignoring the strong native one — the
adoption-cost failure mode in its purest form.

### H6 · Manual-review value — **the adopters disagree, and the disagreement is the finding**

This is the only hypothesis where the two records diverge, and they diverge on the mechanism's
central question.

| | RH | PvsNP |
| --- | --- | --- |
| Attestations written | 14 | **0** |
| Rejections | 2 | — |
| Reasoning | an AI review is worth recording if it says so in the header | an AI review is not a human's warrant and must not be recorded as one |

RH wrote 14 attestations with a policy header stating every one was authored by an AI agent and is
not independent human expert review — and two of them were *rejections*, one of which found a real
overclaim (`galerkin_antitone`) that nothing else in that project would have caught.

PvsNP declined all 29 and quoted `INSTRUCTIONS.md` back: *"Do not attest to something you did not
check."* It ran two mechanical checks that a machine can settle completely — every cited declaration
exists as a `theorem` at its cited path; neither Python program uses floating point — and recorded
them as **findings, not attestations**, because the framework offers no third state.

**Both are defensible, and v1.0 cannot tell them apart.** The schema has fields for who, when, what
was examined, and what it was reviewed against — and none for *what kind of reviewer* or *how
independent*. RH's disclosure lives in a YAML comment no tool reads. PvsNP's abstention is
indistinguishable in the output from a project that never looked.

The measured consequence:

```text
RH     29 manual rules   2 n/a · 14 reviewed · 13 not-evaluated
PvsNP  29 manual rules   1 n/a ·  0 reviewed · 24 applicable + 4 unclear
```

RH's run demonstrates the mechanism has real assurance value. PvsNP's demonstrates that a careful
adopter may rationally refuse to use it. Both conclusions are correct under v1.0, which means **v1.0
underdetermines what an attestation means.** That elevates reviewer kind from the RH record's
"observed gap" to a confirmed structural defect with divergent adopter behaviour — while leaving
open, correctly, whether *independence* should be modelled at all.

---

## 2. Defects: confirmed by two producers, and new from the second

### Confirmed independently

| v1.1 | Defect | RH instance | PvsNP instance |
| --- | --- | --- | --- |
| **§0b** | a lexical proximity heuristic reaches an unclearable verdict | `computation.evidence-as-proof` prose arm, 5 matches, all false | `claims.silent-promotion`, 48-char adjacency, on *"**The Cook–Levin theorem** (CLM-0009) — proved in the literature … not here"* |
| **§0c** | a recognised representation of the evidence read as its absence | `O(` marks a statement approximate; the `O` **is** the bound | `\babout\b` matched the English preposition; `\bbound\b` missed `bounds` |
| **§0a** | mutating commands accept unknown arguments | `init --help` applied against the framework's own repo | `init <dir> --dryrun` — one character off — wrote all seven paths, exit 0 |
| **§0g** | the YAML reader rejects block scalars | 14 attestations folded onto single lines, quotes stripped | the whole policy rejected, exit 2; every value now one long quoted line |
| **§0** | vacuous passes indistinguishable from evaluated ones | narrowed to a handful after the slice | `literature.resolvable-identifiers` — 16 references, none with a DOI or arXiv id, so nothing examined, reported identically to a real check |

Five defects, two independent producers each. None is an artifact of one project's conventions.

**§0b gains a sharper form from PvsNP.** RH's instance is labelled `INFERRED`. PvsNP's is labelled
**`OBSERVED`** — while `computation.error-bounds-stated` in the same run is correctly `INFERRED`. A
heuristic asserting certainty about its own output is the failure `evidence.labels` exists to name,
occurring inside the tool. And the subject matter makes it structural rather than incidental: *a
project about named theorems will hit a rule that cannot distinguish naming a theorem from claiming
one, constantly.*

**§0c's second instance is worse than the first.** Both are the same inversion — the heuristics get
noisier as the prose gets more rigorous, because rigorous mathematical English uses "about", "bound",
"almost", "trivially" and "clearly" as ordinary words far more often than loose prose does. That is
now the **fourth** independent instance of rigour-inversion, and the first found by a second adopter
on a rule the first adopter had already flagged.

### New, from PvsNP only

**N1 · The framework audits itself inside the adopter's score.** `integrity.provenance-digest` reads
`artifacts/provenance-digests.json` from the *framework's* home directory, not the adopter's. It
passes on every adopter run, and what it certifies is that MathematicsStandards' own source documents
are unmodified. Same for `integrity.rule-lifecycle-honest`, `agent.explainable-findings`,
`evidence.skipped-never-passed`. **Four rules about the framework are counted in the adopter's
compliance score.** This is a third category the RH record never separated: not "evaluated and clean",
not "nothing to examine", but *not about this project at all*.

**N2 · Ledger grammar is positional, undocumented, and converts careful prose into invariant
violations.** Two instances, both hit during authoring:

```text
- **Obligations:** none
    → no obligations.

- **Obligations:** none — the claim is an implication and the implication is complete
    → ONE OBLIGATION, named "none — the claim is…", in the OPEN state,
      because isNone requires the trimmed value to be exactly `none`
      and parseObligation defaults unrecognised text to `open`.
    → on a proved-rank claim that is proof.complete-with-open-obligations — an invariant.
```

`parseHistory` has the same shape: it takes everything after the **first comma** inside the trailing
parentheses as the evidence, so a history line whose reason contains no comma records *no evidence*
and trips `claims.silent-promotion` — again an invariant.

Neither is a false positive; in both cases the tool reported something true about its own parse. But
**in both cases a careful author writing a careful explanation produced an invariant violation, and
the remedy was to write less.** That is §0b's general property — *a verdict clearable only by an act
the standards themselves discourage* — arriving through the parser instead of a regex.

**N3 · There is no state for "a machine established this part; the judgement is outstanding."** Two
checks PvsNP ran are fully machine-settleable and bear directly on `formal.helper-as-target` and
`computation.float-as-exact`. One has a detector and was credited. The other has only `attestation`,
whose semantics are *a human established this*. The result is a standing pressure toward attestations
that overstate their basis. PvsNP declined, and the cost is that the checks exist only in prose.

This is the same hole as H6 seen from the other side: v1.0 has one slot for non-automated evidence
and at least three things need to go in it — human expert review, agent mechanical check, and
agent judgement.

**N4 · Applicability is two-valued and needs a third.** 4 of 29 manual rules are genuinely neither
applicable nor not-applicable in a Lean project, for one specific and recurring reason: **the rule's
failure mode is impossible inside the formal development and entirely possible in the prose around
it.** An induction in Lean cannot omit its base case; an induction sketched in `BARRIERS.md` can.
`proof.edge-cases-addressed`, `proof.unjustified-triviality`, `proof.induction-gaps`,
`rigor.symbolic-validity-conditions` — all four split the same way. Calling them applicable overstates
the risk in the 62,958 lines that matter most; calling them not-applicable is false.

**N5 · `rigor.unjustified-division` is *more* relevant in Lean, not less.** `x / 0 = 0` is total, and
`ℕ` subtraction truncates. A division by a possibly-zero quantity produces no error and no goal — it
silently produces the wrong number. A framework designed around informal mathematics would assume
formalisation retires this rule. It sharpens it.

---

## 3. What both adopters agree the framework does not reach

Stated because it is the same list from two directions, and neither adopter could close it.

1. **No mathematics is read.** Both records say it first and plainly.
2. **The strongest assurance mechanism in the repository is invisible to the framework.** PvsNP's
   `AuditManifest.lean` — 2,450 kernel-enforced axiom assertions, plus a build gate self-tested
   against a planted `sorry` — cannot be run, read, or represented. `Formal.axioms` is *a list a
   human typed*. RH's equivalent is its contract-closure protocol.
3. **The Lean-statement-to-English-claim translation is checked by nothing automated.** Both adopters
   named this as the largest genuine epistemic gap — and RH's one manual review that broke through it
   is the strongest result either adoption produced. PvsNP: *"the repository had no mechanism aimed
   at it either."*
4. **Curation is unverifiable.** Nothing checks the 24 are the right 24, or the 11 the right 11. A
   project that omitted its most embarrassing open question would pass exactly as these do.
5. **Suppression leaves no artifact.** A counterexample found and never committed is undetectable.
   Both projects' mitigations — `FAILED_ATTEMPTS.md`, the retraction index — are social mechanisms.

---

## 4. The question the experiment exists to answer

> *Does MathematicsStandards add assurance to an already rigorous mathematical project without
> incentivising that project to become less truthful, more duplicative, or more machine-legible at
> the expense of its actual research model?*

**Less truthful: no, in both.** Neither adopter weakened a claim, reclassified a rule, manufactured an
exception, tuned a detector, or rewrote honest prose to clear a finding. Both ended
`BLOCKED_BY_INVARIANT` on findings they judged wrong, and left them standing. PvsNP states the
principle the sharper way: *"A framework that had made it easy to clear would have been the worse
framework."*

**More duplicative: yes, measurably, and bounded.** ~30 drift-capable items in PvsNP, ~350
hand-authored field values; 4 forced blocks in RH's eleven-claim slice. The index property held in
both. The duplication that was forced was forced by identifiable detector defects, not by the design.

**More machine-legible at the expense of the research model: nearly, once — and the second adopter is
what prevented it.** Six of RH's abstractions were candidates for v1.1. Five survive contact with an
independent programme. *First unproved bridge* does not: mandating it would have pushed PvsNP back
toward a serialisation its own record documents as a corrected mistake. That is the failure mode
named in the question, caught before it entered the framework, by exactly the independence test this
phase was run to perform.

**Assurance added: yes, once each, and both times through a manual rule.** RH found a formal artifact
described as certifying more than it proves. PvsNP found a claim listing the converse of an
implication as an open obligation *of that implication*, and was forced by
`evidence.equivalence-direction-proved` to decide — correctly — that the Cook–Reckhow / NP-vs-coNP
relationship is an implication and not an equivalence. Both are real corrections to careful projects.
Neither came from a detector.

**PvsNP's recommendation, unprompted and matching RH's posture:** keep it, additively, and *do not
adopt it as a gate*. Its existing gate is `scripts/check.ps1`; adding a second gate that can be
blocked by the word "about" would degrade the first.

---

## 5. State

Both specimens preserved at their experimental endpoints. `RiemannHypothesis` at `ec543d2` with
CLM-0008's overclaim uncorrected and its rejected attestation standing; `PvsNP` at `2185937` with
both false positives standing and zero attestations. The framework is byte-identical to `v1.0.0`: no
detector changed, no regex tuned, no rule reclassified, no fixture added.

**Two independent producers now exist.** No v1.1 change has been designed or made.
