# Standard 13 — Symbolic Manipulation

Algebra is where proofs fail quietly. Not in the ideas, which get scrutinised, but in a line of
rearrangement that everyone skims — a division that assumed a non-zero denominator, a limit moved
inside an integral, a square root that picked a branch. Each step is locally correct under a condition
that was never stated, and the resulting proof is wrong in a way that survives many readings.

Source: item 13 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every proof artifact and to every use of a computer algebra system in any regime.

## Requirements

### R1 — Nontrivial steps state their validity conditions

From the source, the standards must cover:

- symbolic manipulation

A manipulation whose validity depends on a condition MUST state that condition, and the condition MUST
become either a discharged obligation ([Standard 7](07-proof-obligations.md)) or a declared assumption
([Standard 6](06-assumptions-and-hidden-conjectures.md)). The recurring conditions:

| Step | Condition |
| --- | --- |
| Dividing by an expression | The expression is non-zero on the whole domain |
| Cancelling a common factor | Same, and the cancellation preserves the solution set |
| Multiplying an inequality | The multiplier's sign, on the whole domain |
| Taking a root, log, or inverse | Domain membership, and which branch |
| Squaring both sides | The extraneous solutions introduced are excluded afterwards |
| Rearranging an infinite sum | Absolute convergence, or a summability argument |
| Interchanging two limits | A uniformity or dominated-convergence hypothesis |
| Differentiating under an integral | Dominating function and continuity hypotheses |
| Summing an asymptotic estimate | Uniformity of the implied constant in the summed variable |
| Matrix inversion, cancellation | Invertibility; non-commutativity where it matters |

### R2 — Division and interchange are named prohibitions

Two of these are prohibited by name in the source, because they account for a disproportionate share
of real errors:

> divide by a quantity without establishing the required nonzero condition

> interchange limits, sums, derivatives, or integrals without required justification

The first fails at exactly the degenerate cases [Standard 9](09-edge-cases-and-counterexamples.md) is
about — the argument is fine for generic values and the theorem claims all values. The second fails
where the convergence is not uniform, which is typically nowhere visible in the formulas and requires
knowing something about the functions involved.

### R3 — Computer algebra output is a claim

A CAS result MUST be treated as a claim with the same validity conditions as a hand computation, not
as an oracle. Systems simplify under assumptions they do not report: they choose principal branches,
assume variables are generic, discard solutions on measure-zero sets, cancel factors without recording
the excluded values, and return closed forms that are correct only away from singularities. `Simplify`
is a function whose contract is "return something equal under conditions I will not tell you".

A CAS result therefore enters the ledger at `HEURISTIC` rank until its conditions are checked, and the
evidence entry names the system and version. Where the result matters, it is reproduced by an
independent route or verified by substitution.

### R4 — Notation means one thing

A symbol has one meaning throughout an argument. The prohibited failure is subtle: an argument in
which each step is valid under some reading, but no single consistent reading validates all of them.
It arises from index shadowing, from a bound variable reused outside its scope, from `⊂` read as
strict in one line and non-strict in another, and from a norm or an inner product silently changing
space. It is `rigor.notation-equivocation`, and it is notably common in machine-generated proofs,
which have no persistent sense of what a symbol was introduced to mean.

### R5 — Formalisation is the strongest available answer

Where a chain of manipulation is long, load-bearing, and hard to check by eye, the honest response is
often to formalise it ([Standard 16](16-formal-theorem-proving.md)). A proof assistant checks exactly
the conditions this standard is about, because it cannot proceed without them — which is precisely why
`sorry`-free formalisation is at the top of the rank map, and why a formalisation containing
placeholders establishes nothing about the steps the placeholders cover.

## Additions this standard makes beyond the source

- R1's table of steps and conditions.
- R3 in full — the treatment of CAS output as a `HEURISTIC`-rank claim, and the enumeration of what
  simplification silently assumes. `computation.cas-output-trust` is one of the additional
  anti-patterns the source invites.
- R4, `rigor.notation-equivocation`, likewise authored, together with the observation about
  machine-generated proofs.
- R5's argument that formalisation is the natural escalation for this class of error.

## Relationship to other standards

[Standard 6](06-assumptions-and-hidden-conjectures.md) R4 covers the assumptions these steps
introduce. [Standard 7](07-proof-obligations.md) is where the conditions are recorded.
[Standard 9](09-edge-cases-and-counterexamples.md) is where the degenerate cases R2 refers to are
addressed. [Standard 12](12-approximation-and-error-bounds.md) governs the bounds that rearrangement
of estimates depends on. [Standard 16](16-formal-theorem-proving.md) is R5's escalation.
[Standard 20](20-must-never-rules.md) holds the prohibitions.

## Implementation

There are no detectors for this standard, and the absence is deliberate rather than a gap to be filled
later. Deciding whether a division needed a non-zero condition requires knowing whether the
denominator can vanish on the domain — that is the mathematics, not a property of the text. A regex
that flagged every `/` would produce noise a project would immediately suppress, and a rule that is
always suppressed is worse than no rule, because it appears in the coverage figure.

`rigor.symbolic-validity-conditions`, `rigor.unjustified-division`, `rigor.unjustified-interchange`,
`rigor.notation-equivocation`, and `computation.cas-output-trust` are therefore all `manual-review`
with assurance `none`. Their `$assuranceNote` says who does establish them: a mathematician reading the
proof, or a proof assistant that refuses to accept the step. What the framework contributes here is the
obligation list of R1 — a named, enumerable set of questions a reviewer or an attesting expert can
work through, and a place to record that they did.
