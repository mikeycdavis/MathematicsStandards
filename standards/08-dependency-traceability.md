# Standard 8 — Dependency Traceability

Every result rests on other results. When the graph of what-rests-on-what is written down, three
questions become answerable that are otherwise matters of recollection: what breaks if this lemma is
wrong, is anything in here circular, and is this theorem really unconditional. When the graph is not
written down, the answers are whatever the author remembers, and the author remembers the paper as
they intended it.

Source: item 8 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim in the ledger of [Standard 3](03-claims-ledger.md), in every regime.

## Requirements

### R1 — Declare the dependencies

From the source, the standards must cover:

- dependency traceability
- theorem dependencies

Every claim MUST declare, in its `Depends` field, every result its proof uses. Entries are claim ids
within the project, or `external:` references to results the project takes from the literature. A
claim that uses nothing beyond the definitions in its statement writes `none`.

External dependencies are declared with the same seriousness as internal ones. A theorem resting on a
result from a preprint that has not been refereed is in a different position from one resting on a
textbook theorem, and the only way that difference can be visible is if both are written down.
[Standard 14](14-literature-and-novelty.md) governs what the reference must carry.

### R2 — Dependencies and assumptions are different edges

`Depends` names things believed proved. `Assumptions`
([Standard 6](06-assumptions-and-hidden-conjectures.md) R1) names things taken as hypotheses. They
are separate fields because they say different things about the result, and they are walked together
because the dependency closure has to include both — a proved lemma that itself assumes a conjecture
transmits that conjecture upward.

The closure of a claim is the transitive union of `Depends` and `Assumptions`, following both fields
at every step. The rank of the weakest member of that closure is what caps the claim
([Standard 2](02-claim-hierarchy.md) R4).

### R3 — The graph is acyclic

From the source, the standards must cover:

- circular reasoning

No claim may appear in its own dependency closure. The prohibition the source states is:

> use the target theorem as an intermediate assumption in its own proof

Direct self-reference is rare and easy to spot. What the closure catches is the version that is not:
A depends on B, B depends on C, C depends on A, with a dozen pages between each step and no single
place where the loop is visible. The check is a depth-first search and it is exact over the declared
graph — which is also the whole of its limit. A circular argument routed through a dependency nobody
declared is invisible to it, and that is not a bug in the search but the reason R1 exists.

The closely related failure is [Standard 7](07-proof-obligations.md) R4's difficulty displacement,
where the loop is not quite closed: the main theorem depends on a new lemma that is not literally the
main theorem but is equivalent to it. The cycle check does not fire, because there is no cycle. What
catches the structural half is the rank cap; what catches the rest is a mathematician
([Standard 15](15-equivalent-reformulations.md)).

### R4 — Every declared dependency resolves

An id in `Depends` or `Assumptions` MUST resolve — to a ledger entry, or to an `external:` reference
defined in the ledger's `## References` section. A dangling id is not a small bookkeeping error: it
means the claim rests on something the project cannot now identify, which makes the claim
unevaluable in the sense of [Standard 4](04-definitions-before-dependent-claims.md).

### R5 — Changing a claim propagates

When a claim's status falls, or its statement changes, every claim whose closure contains it MUST be
re-examined and the outcome recorded. A lemma demoted from `LEMMA` to `CONJECTURE` caps everything
above it at `CONDITIONAL_THEOREM` whether or not anyone revisits those entries — the detector will
say so — and the right response is to fix the ledger rather than to fix the detector.

## Additions this standard makes beyond the source

- R2's separation of dependency edges from assumption edges, and the definition of the closure as
  their transitive union. The source names both concepts without relating them.
- R4's resolvability requirement.
- R5 in full.
- The analysis in R3 of what the cycle check does and does not reach, including its relationship to
  difficulty displacement. The source prohibits circular reasoning; the observation that the
  interesting cases are non-adjacent and that the equivalent-lemma case produces no cycle at all is
  authored.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) R4 consumes the closure this standard builds.
[Standard 6](06-assumptions-and-hidden-conjectures.md) owns the other half of the edge set.
[Standard 7](07-proof-obligations.md) R4 is the near-miss case R3 does not catch.
[Standard 14](14-literature-and-novelty.md) governs external dependencies.
[Standard 16](16-formal-theorem-proving.md) applies the same idea to the trusted dependency chain of
a proof assistant, where the graph is real and machine-readable and this one is not.
[Standard 20](20-must-never-rules.md) holds the circularity prohibition.

## Implementation

`scripts/claims.mjs` exports `dependencyClosure`, walking both fields. Detectors:
`proof.dependency-traceability` (R1 and R4 — the field exists and every id resolves),
`proof.circular-dependency` (R3 — depth-first cycle detection, reporting the full cycle rather than
just the claim it noticed), and `claims.status-exceeds-support` (R2 and R5's cap).

The assurance note on every one of them says the same thing, because it is the same limit: these
checks are exact over the *declared* graph and blind to everything outside it. An undeclared
dependency, an unregistered claim, or a proof that quietly uses a result it never cites is not
observed. What this standard buys is that the graph exists at all — and a graph that is written down
can be argued with, which an unwritten one cannot.
