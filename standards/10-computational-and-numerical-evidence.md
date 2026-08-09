# Standard 10 — Computational and Numerical Evidence

Computation is the best source of mathematical intuition ever built and it proves almost nothing. A
scan to 10⁹ that finds no counterexample is a real result about the first 10⁹ cases; it becomes a
falsehood the moment it is written as though it were a result about all cases. This standard governs
what a computation must record, and — the harder half — what status a claim may hold when computation
is all the evidence there is.

Source: item 10 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every project in the computational regime of
[Standard 1](01-applicability-and-scope.md), and to any computational evidence entry in any project.

## Requirements

### R1 — Computational verification records its scope

From the source, the standards must cover:

- computational verification

An evidence entry of type `computational` or `numerical` MUST record enough for someone else to run
the same thing and get the same answer:

| Recorded | Why |
| --- | --- |
| What was checked | The predicate actually evaluated, which is often weaker than the claim |
| The range or sample | Bounds, or the sampling scheme and its size |
| The arithmetic | Exact integer, exact rational, interval, or floating point — see R4 |
| The program | A committed script, not a description of one |
| The environment | Language, version, and any library whose arithmetic matters |
| The seed | Where anything is randomised |
| The outcome | Including how many cases were examined and how long it took |

The requirement is deliberately mundane. Almost every dispute about a computational result turns out
to be a dispute about one of these seven lines, and none of them requires mathematical judgement to
record.

### R2 — Numerical evidence is evidence, at its own rank

From the source, the standards must cover:

- numerical evidence

Computation supports two statuses and no others: `NUMERICAL_OBSERVATION` (rank 1) for a pattern
noticed, and `COMPUTATIONAL_VERIFICATION` (rank 5) for a systematic check of a stated range. Neither
is at proved rank, and the gap between rank 5 and rank 6 is the line this entire framework is built
around.

A claim whose only evidence is computational MUST NEVER hold a status at proved rank. The source
prohibits presenting numerical evidence as deductive proof, and the mechanised form of that
prohibition is exactly this: the ledger entry's evidence types are read, and if none of them is
`proof`, `formal`, or `citation`, a `THEOREM` status is a finding.

The honest formulations are available and cost nothing:

```text
No.  Theorem. Every n > 2 satisfies P(n).                    evidence: a scan to 10^9
Yes. Conjecture. Every n > 2 satisfies P(n).                 evidence: a scan to 10^9
Yes. Theorem. Every n with 2 < n <= 10^9 satisfies P(n).     evidence: a scan to 10^9,
     exhaustive, exact arithmetic
```

The third is a genuine theorem with a genuine proof — the proof is the exhaustive computation, and
its domain is the range the computation covered. Nothing is lost by stating it that way except the
appearance of having settled the general case.

### R3 — Cherry-picking is prohibited

The evidence entry MUST describe the full search, not the successful part of it. Reporting the
parameter range where the pattern holds while omitting the range where it was tested and failed is
prohibited, and it is a different failure from hiding a counterexample: no single case is being
concealed, only the shape of the search. [Standard 18](18-research-lifecycle.md) requires the failed
runs to remain in the repository, which is what makes selective reporting detectable by a human even
though it is invisible to a checker.

### R4 — Floating point is not exact mathematics

Floating-point output MUST NEVER be treated as exact. A computation reporting that two quantities are
equal to fifteen decimal places has established that they are close, which is a statement about the
computation and not about the quantities. Where exactness matters, one of these is required: exact
integer or rational arithmetic, interval arithmetic with the interval reported, or an error analysis
under [Standard 12](12-approximation-and-error-bounds.md) bounding the gap between what was computed
and what was meant.

The specific traps are worth naming because they are cheap to check for and expensive to discover
late: accumulated round-off in long sums, catastrophic cancellation in differences of near-equal
quantities, comparison against a tolerance chosen after seeing the data, and any conclusion drawn
from the last few digits of a floating-point result.

### R5 — A computation is a claim

The program is part of the mathematics. A verification script may be buggy, may test a subtly
different predicate than the claim states, may silently skip cases on an exception, or may not have
run over the range it reports. None of that is visible in its output. The script is therefore
committed and cited, and where the computation carries real weight it deserves the scrutiny a proof
would get — which in the strongest case means the computation itself is formalised
([Standard 16](16-formal-theorem-proving.md)).

## Additions this standard makes beyond the source

- R1's seven-line record.
- R2's mapping from evidence type to the two admissible statuses, and the three-way illustration of
  how to state a computational result honestly.
- R4's list of specific floating-point traps.
- R5 in full — the argument that the verification program is itself a claim requiring scrutiny. The
  source prohibits treating floating-point output as exact mathematics; the observation that a
  correct-looking script can test the wrong predicate is authored.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) R4 defines the evidence a promotion requires.
[Standard 9](09-edge-cases-and-counterexamples.md) governs counterexample searches, which are
computations of a particular kind. [Standard 11](11-finite-and-infinite-reasoning.md) governs the
inference R2 forbids. [Standard 12](12-approximation-and-error-bounds.md) supplies R4's error
analysis. [Standard 18](18-research-lifecycle.md) keeps the runs R3 refers to.
[Standard 20](20-must-never-rules.md) holds all four prohibitions.

## Implementation

Detectors: `computation.scope-declared` (R1), `computation.reproducible-runs` (the cited script
exists), `computation.evidence-as-proof` (R2 — read off the ledger's evidence types, which makes it
one of the more reliable checks here), and `computation.float-as-exact` (R4 — a heuristic scan of the
cited script for floating-point constructs where the evidence entry claims exact arithmetic).

`computation.evidence-as-proof` also has a prose arm that flags phrasings like "proved numerically" in
research documents. That arm is reported `INFERRED`, never `OBSERVED`, because a phrase match is not
an observation of the underlying fact — reporting a heuristic as observed would be this repository
committing the error it exists to prevent.

`computation.cherry-picking` has no detector and cannot have one: selective reporting is a property of
what was omitted, and omissions leave no artifact. It is `manual-review` with assurance `none`, and
its remediation names the only thing that works — a reviewer comparing the reported runs against the
runs the repository still contains.
