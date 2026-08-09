# Standard 17 — Open Problems

Work on a famous open problem is where every failure mode in these standards arrives at once, amplified
by the stakes. The problem has resisted the field for decades, so the prior probability that any given
approach works is very low and the probability that it has already been tried is very high. Meanwhile
the incentive to read partial progress generously is at its maximum — and for an AI agent asked to make
progress on the Riemann Hypothesis, "produce something that looks like progress" is a much easier
target than "make progress".

Source: item 17 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies when a project declares the open-problem regime in
[Standard 1](01-applicability-and-scope.md), which it MUST do when it is working toward a major
unsolved problem. The source's instruction is:

> For major open problems, require an especially high bar.

Everything below is that bar.

## Requirements

### R1 — The tracking record

The system should explicitly track the following.

Reproduced verbatim from the source:

- what is actually proved
- what remains conjectural
- whether a result is known
- whether a result is equivalent to the target
- whether the central difficulty has merely moved
- known barriers encountered
- terminated approaches
- evidence required to reopen an approach

Each problem gets a directory, `artifacts/open-problems/<slug>/`, containing `problem.md` with these
sections, in this order, none omitted and none empty:

```markdown
## Target Statement          the problem, stated precisely, with its source
## What Is Proved            claims at proved rank, with ids. Often empty of anything
                             about the target itself — say so explicitly
## What Remains Conjectural  the gap between the above and the target
## Known Results             what the literature already establishes
## Equivalences              relationships to the target, with direction and proof status
## Where the Difficulty Lives  the honest answer to "what is the hard part now?"
## Known Barriers            barriers encountered, and which approaches they rule out
## Terminated Approaches     one H3 per approach, each with Status: and
                             Evidence required to reopen:
## Stopping Criteria         what would make this effort stop
```

An empty section is a finding. "None" written deliberately is an answer; a blank is an unanswered
question wearing the appearance of one.

### R2 — What is proved, stated separately from what is hoped

`## What Is Proved` lists only claims at proved rank in the ledger whose dependency closure is clean.
On a serious open problem this section will frequently contain no claim about the target at all — only
lemmas, special cases, and conditional results — and writing that plainly is the single most valuable
line in the document. A project that cannot state, in one sentence, what it has actually proved about
the target has learned something important about its own position.

Conditional results belong in this section with their conditions attached. "Under RH, X" is a real
result and stating it as X is [Standard 6](06-assumptions-and-hidden-conjectures.md) R3's prohibition
at its most consequential.

### R3 — Whether the result is known, and whether it is equivalent

Two determinations the source requires, and both are load-bearing on a famous problem:

- **Known.** The literature comparison of [Standard 14](14-literature-and-novelty.md), at a higher
  bar: for a major problem, an approach that appears new to the project has usually been tried, and
  the search MUST look specifically for prior attempts and for the reasons they stopped.
- **Equivalent to the target.** Recorded per [Standard 15](15-equivalent-reformulations.md) with
  direction and proof status. A statement equivalent to the target is exactly as unproved as the
  target, whatever it looks like.

### R4 — Whether the central difficulty has merely moved

The section `## Where the Difficulty Lives` MUST name, in plain language, what the hard part currently
is — and, when it has changed since the last revision, say what moved it and why that is a reduction
rather than a relabelling.

This is where the source's most sophisticated prohibitions apply, and both are prohibited outright:

> describe a restatement of the central conjecture as a solution

> move the unresolved difficulty into a newly defined lemma and then claim progress because the main theorem follows from that lemma

The structural half is mechanical: after any such move, the target's dependency closure contains
something below proved rank, so the target's status is capped at `CONDITIONAL_THEOREM` and the checker
says so. The judgement half is not mechanical at all. Whether `Lemma A` is a tractable sub-problem or
the original difficulty with a new name is a mathematical question, and the honest engineering answer
is to name it, require it to be written about in this section, and record who reviewed it.

### R5 — Known barriers

Barriers — relativisation, natural proofs, algebrisation in complexity; the parity problem in sieve
theory; obstructions specific to the problem at hand — are results about which *approaches* cannot
work. Where an approach falls to a known barrier, `## Known Barriers` MUST record the barrier, the
citation, and which approaches it rules out. An approach that a barrier already excludes is not a
research direction; pursuing it after the barrier is documented is the clearest available signal that
the record is not being read.

### R6 — Terminated approaches and reopening evidence

Each terminated approach is an H3 under `## Terminated Approaches` carrying:

```markdown
### Contour-shifting via the explicit formula
Status: terminated 2026-07-14
Why: the error term is not uniform in the parameter; see CLM-0032 and notes/2026-07-14.md
Evidence required to reopen: a uniform bound for E(x,q) valid for q up to x^{1/2},
or a version of CLM-0032 that does not require uniformity
```

The reopening line is the requirement that makes termination a decision rather than a mood. Without
it, a project revisits abandoned approaches on the strength of renewed optimism, which on a hard
problem is unlimited.

### R7 — Stopping criteria

`## Stopping Criteria` states, in advance, what would end the effort: a barrier that would rule the
whole strategy out, a resource bound, a date, a result in the literature that would settle it. Written
at the start, this is a research plan. Written at the end, it is a rationalisation, which is why
[Standard 18](18-research-lifecycle.md) requires it before the work begins.

## Additions this standard makes beyond the source

- The whole file format in R1, including the nine sections and the rule that an empty section is a
  finding.
- R2's requirement that the proved section be honest about containing nothing about the target, which
  is the most common true state of a serious effort.
- R3's higher literature bar, R5's treatment of barriers as statements about approaches, and R6's
  H3 format with an explicit reopening line.
- R4's split of the difficulty-displacement question into a mechanical structural half and a
  judgement half that is named rather than pretended away.

## Relationship to other standards

[Standard 3](03-claims-ledger.md) holds the per-claim half of R1's tracking.
[Standard 7](07-proof-obligations.md) R4 and [Standard 15](15-equivalent-reformulations.md) are the
general forms of R4. [Standard 14](14-literature-and-novelty.md) is R3's first determination.
[Standard 18](18-research-lifecycle.md) generalises R6 and R7 to all research.
[Standard 20](20-must-never-rules.md) holds R4's prohibitions.

## Implementation

Detectors: `problems.tracking-file` (the directory and file exist with all nine headings, when the
policy declares `openProblemMode`), `problems.proved-vs-conjectural` (the two central sections are
non-empty), and the `lifecycle.*` rules that check each terminated approach carries `Status:` and
`Evidence required to reopen:`. All are structural: they establish that the question was asked, never
that the answer is true.

`problems.restatement-as-solution` and `proof.difficulty-displacement` are `manual-review` with
assurance `none`, and this standard is where that limit costs the most. A project can complete every
section, satisfy every structural check, and still be a document describing a restatement of the
target as though it were a breakthrough. What the framework can do is make the position legible — the
target's status is capped by its dependency closure, the equivalences are recorded with direction, the
difficulty section exists and has to say something — so that a reader can see the shape of the claim
in one place. Deciding whether it is progress remains a mathematician's job, and any tool claiming
otherwise would be committing this standard's own prohibition.
