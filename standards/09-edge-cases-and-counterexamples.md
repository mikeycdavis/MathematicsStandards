# Standard 9 — Edge Cases and Counterexamples

Most false conjectures are false somewhere boring. Not at scale, not at some deep structural
obstruction, but at n = 0, or the empty set, or the constant function, or the one degenerate
configuration the argument implicitly assumed away. A search that never looked for a counterexample
is not evidence that none exists — it is evidence that nobody looked, and those are different facts
that get reported the same way.

Source: item 9 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim at rank 4 (`CONJECTURE`) and above, and to any claim a project intends to
promote.

## Requirements

### R1 — Edge cases are addressed explicitly

From the source, the standards must cover:

- edge cases

Boundary, degenerate, and extremal cases MUST be addressed rather than left implicit. The recurring
ones are worth naming, because "consider edge cases" is advice nobody acts on and a list is
something a reviewer can walk:

- The empty case: the empty set, the empty sum, the empty product, the empty graph.
- The smallest cases: n = 0, n = 1, and — very often the real culprit — n = 2.
- The trivial object: the zero vector, the constant function, the identity map, the trivial group.
- The boundary of the domain, and whether it is included.
- Equality in a strict inequality; coincidence where distinctness was assumed.
- The extremes: unbounded, infinite, zero-measure, zero-probability.

Where a case is excluded, the exclusion belongs in the `Domain` field of
[Standard 5](05-domains-and-quantifiers.md), not in a parenthesis in the proof. Where it is included,
it is an obligation under [Standard 7](07-proof-obligations.md).

### R2 — Counterexample search is performed and recorded

From the source, the standards must cover:

- counterexample search

Before a claim rises above `CONJECTURE`, a counterexample search MUST have been performed and its
result recorded as an evidence entry of type `counterexample-search`. The record states what was
searched, not merely that searching happened:

```markdown
- **Evidence:**
  - counterexample-search — `computations/clm-0007-search/` — all n with 2 <= n <= 10^7,
    exact integer arithmetic, no counterexample found; script and log committed
```

A negative result is a finding and MUST be recorded as one. This is the point of the requirement:
"we looked here, this far, this way, and found nothing" is a genuine piece of evidence with genuine
limits, whereas silence is indistinguishable from not having looked.

### R3 — A counterexample is never hidden

A discovered counterexample MUST be recorded, and the claim it refutes MUST be demoted in the same
change. The source states the prohibition plainly, and it is the one that most clearly separates
research from advocacy: hiding a counterexample does not make a claim true, it makes the record
false.

There is a legitimate move that is easily confused with the prohibited one. Finding a counterexample
to a claim as stated, and then narrowing the domain so the claim is true on the smaller domain, is
ordinary mathematics — provided the counterexample is recorded, the domain change is a history entry,
and the narrowed claim is not presented as though it were the original. The difference between
refining a result and quietly deleting an inconvenience is entirely in what the record says.

### R4 — Search scope is part of the evidence

An exhaustive search over a finite range establishes something about that range and nothing beyond
it. The scope MUST be stated — the bound, the arithmetic used, the parameters held fixed — because a
search reported without its scope will be read as more general than it is, and because
[Standard 11](11-finite-and-infinite-reasoning.md) depends on knowing where the search stopped.

## Additions this standard makes beyond the source

- R1's list of recurring edge cases.
- R2's requirement that the search record state its scope, and the argument that a recorded negative
  result is evidence while silence is not.
- R3's distinction between refining a claim after a counterexample and suppressing one. The source
  prohibits hiding counterexamples; the observation that the legitimate neighbouring move looks
  almost identical in the finished document is authored.
- R4.

## Relationship to other standards

[Standard 5](05-domains-and-quantifiers.md) is where an excluded case is recorded.
[Standard 7](07-proof-obligations.md) is where an included one becomes an obligation.
[Standard 10](10-computational-and-numerical-evidence.md) governs how the search itself is recorded,
and [Standard 11](11-finite-and-infinite-reasoning.md) governs what may be concluded from its
negative result. [Standard 18](18-research-lifecycle.md) requires the failed searches to be kept.
[Standard 20](20-must-never-rules.md) holds the prohibition in R3.

## Implementation

The detector `proof.counterexample-search-recorded` fires when a claim above `CONJECTURE` has a
universally quantified statement and no evidence entry of type `counterexample-search` or `proof`. It
is a warning rather than an error, because a claim with a complete proof does not need a search — the
proof settles the question — and the rule exists for the case where the proof is not there yet.

`proof.edge-cases-addressed` and `evidence.hidden-counterexample` have no detector. The first is
unmechanisable in principle: knowing which cases are degenerate for a given claim is knowing the
mathematics. The second is unmechanisable in practice for a reason worth stating plainly — a
suppressed counterexample leaves no trace in the repository, so there is nothing for a check to find.
The defence against it is not tooling. It is that [Standard 18](18-research-lifecycle.md) requires
failed routes to be preserved, so that deleting one is a visible act rather than an absence.
