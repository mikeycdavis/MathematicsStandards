# Standard 6 — Assumptions and Hidden Conjectures

The most damaging unproved statement in a piece of research is the one nobody wrote down. It is
usually not a grand conjecture; it is a step that felt obvious — a series that converges, a limit
that exists, a set that is non-empty, a "clearly" that was carrying a real obligation. This standard
requires every assumption to become a visible object with a status, so that the honest question
"what is this resting on?" has a place to be answered.

Source: item 6 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim at rank 3 and above, and to every proof artifact those claims cite.

## Requirements

### R1 — Explicit assumptions

From the source, the standards must cover:

- explicit assumptions

Every claim MUST declare, in its `Assumptions` field, every statement it relies on that it does not
itself establish. Each declared assumption is either a claim id in this project or an `external:`
reference. A claim with no assumptions writes `none`, which is an assertion, not an omission.

Assumptions differ from dependencies ([Standard 8](08-dependency-traceability.md)) in what they say
about the result. A dependency is a proved input; an assumption is a hypothesis the result is
conditional on. In the ledger both are ids, and a detector cannot tell them apart on shape — which is
why they are separate fields and both are walked when the dependency closure is computed.

### R2 — Hidden conjectures

From the source, the standards must cover:

- hidden conjectures

An unproved statement that a result relies on MUST be registered in the ledger with status
`CONJECTURE`, `HYPOTHESIS`, or `UNRESOLVED_CLAIM`, and named in the relying claim's `Assumptions`
field. It MUST NEVER be absorbed into prose as though it were established.

The three registered statuses are distinguished by what is being asserted about them:

| Status | Means |
| --- | --- |
| `HYPOTHESIS` | A statement adopted for the sake of argument, with no claim it is true |
| `CONJECTURE` | A statement believed true, with reasons that fall short of proof |
| `UNRESOLVED_CLAIM` | A statement the project needs and has explicitly failed to settle |

The third exists because "we could not prove this" is information, and a project that has no way to
say it will say something else instead.

### R3 — Assuming a conjecture caps the result

A claim whose assumption closure contains anything below proved rank is conditional. Its honest
maximum status is `CONDITIONAL_THEOREM`, and its statement SHOULD name what it is conditional on
("assuming the Riemann Hypothesis, ..."), rather than relegating the condition to a footnote.
Asserting `THEOREM` instead is prohibited as `claims.conditional-as-unconditional`, and it is the
error that most often survives peer review, because the paper does state the hypothesis somewhere —
just not in the theorem.

### R4 — Assumptions used in a proof but not in its statement still count

An assumption introduced midway through an argument — a convergence taken for granted, a case
silently excluded, an object assumed non-zero — is an assumption of the result, and belongs in the
`Assumptions` field even though it does not appear in the theorem as written. Two specific instances
are prohibited by name in [Standard 20](20-must-never-rules.md): dividing by a quantity without
establishing that it is non-zero, and interchanging limits, sums, derivatives, or integrals without
the justification that makes the interchange valid. Both are places where an assumption is used and
not declared.

### R5 — The obvious step is where to look

Prose markers — "clearly", "obviously", "it is well known that", "trivially", "one easily sees" —
are where undeclared assumptions concentrate. This standard does not prohibit the words. It requires
that whatever they cover be a discharged proof obligation
([Standard 7](07-proof-obligations.md)) or a declared assumption, so that "clearly" abbreviates an
argument rather than replacing one. The prohibition is `proof.unjustified-triviality`.

## Additions this standard makes beyond the source

- R2's three-way distinction between `HYPOTHESIS`, `CONJECTURE`, and `UNRESOLVED_CLAIM`. The source
  supplies the tokens in its hierarchy but does not say what separates them.
- R3's cap and the requirement that the conditionality appear in the statement.
- R4's rule that mid-proof assumptions belong in the field, and R5's treatment of triviality markers.
  Both are authored; `proof.unjustified-triviality` is one of the additional anti-patterns the source
  invites.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) R4 sets the rank cap R3 enforces.
[Standard 7](07-proof-obligations.md) is where the obligations R5 refers to are recorded.
[Standard 8](08-dependency-traceability.md) walks the same closure from the dependency side.
[Standard 13](13-symbolic-manipulation.md) covers the validity conditions R4's two named cases belong
to. [Standard 20](20-must-never-rules.md) holds the prohibitions.

## Implementation

Detectors: `rigor.explicit-assumptions` (the field is present), `claims.conditional-as-unconditional`
and `claims.status-exceeds-support` (R3's cap, computed over the declared closure).

The assurance boundary here is unusually sharp and worth stating plainly. Every mechanical check in
this standard operates on assumptions that were *declared*. An assumption nobody wrote down is
invisible to all of them — which is precisely what "hidden conjecture" means. `rigor.hidden-assumption`
is therefore `manual-review` with assurance `none`, and its remediation is the only one available: a
mathematician reads the proof and asks what it is using. The value of R1 is not that the tooling
finds hidden assumptions; it is that declaring assumptions is cheap, so the ones that stay hidden are
the ones the author did not notice rather than the ones the author did not bother to write.
