# Standard 5 — Domains and Quantifiers

"For all n, P(n)" and "for all sufficiently large n, P(n)" are different theorems, and only one of
them is refuted by a small counterexample. Most overstatement in mathematical writing is not a claim
about the wrong property; it is the right property with the quantifier or the domain quietly widened.
This standard requires both to be written down, in the ledger, next to the claim.

Source: item 5 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim at rank 3 (`HYPOTHESIS`) and above in
[Standard 2](02-claim-hierarchy.md) R3. Observations and heuristics are exempt because they are
already labelled as not being assertions about a whole domain.

## Requirements

### R1 — Explicit domain

From the source, the standards must cover:

- explicit domains

Every claim MUST state, in its `Domain` field, the set each free variable ranges over. `x in R`,
`n in N with n >= 2`, `f continuous on [0,1]`, `G a finite abelian group`. The field is not prose
about the subject area; it is the answer to "for which objects is this asserted?"

Domain restrictions carried by the statement are part of the domain, not decoration. A claim proved
only for squarefree n has domain `n in N squarefree`, and stating it with domain `n in N` is the
prohibition [Standard 20](20-must-never-rules.md) records as ignoring domain restrictions —
regardless of whether the proof is correct on its actual domain.

### R2 — Explicit quantifiers

From the source, the standards must cover:

- explicit quantifiers

Every claim MUST state its quantifier structure in the `Quantifiers` field, including the order of
alternating quantifiers, which is where the real errors live. These are four different claims:

```text
for all e > 0 there exists N such that for all n > N: |a_n - L| < e     convergence
there exists N such that for all e > 0 and all n > N: |a_n - L| < e     a_n is eventually L
for all n there exists e > 0 such that |a_n - L| < e                    vacuous
for all e > 0 there exists n such that |a_n - L| < e                    L is a limit point
```

Where a claim is uniform in a parameter, the `Quantifiers` field says so; uniformity that is used in
a proof and not stated in the claim is a hidden strengthening.

### R3 — Sufficiency qualifiers are part of the claim

"For sufficiently large n", "for almost all n", "for a density-one set of n", "generically", and "for
all but finitely many n" each weaken a universal claim in a specific way, and each MUST appear in the
`Quantifiers` field rather than being dropped when the result is restated. Treating an
almost-everywhere or density-one result as universal is prohibited as `rigor.almost-all-as-all`; the
distinguishing feature of this error is that the underlying theorem is entirely correct, which is why
it survives review so often.

### R4 — Weakening hypotheses is a claim change

Dropping a hypothesis strengthens a theorem; adding one weakens it. Both change what has been proved,
and both MUST be recorded as a status history entry with the new statement, never as an edit to the
`Statement` field in place. Editing the statement while leaving the status and history untouched is
what [Standard 20](20-must-never-rules.md) prohibits as silently strengthening a theorem, or
silently weakening hypotheses, depending on which direction the edit went.

## Additions this standard makes beyond the source

- R2's requirement that quantifier *order* be recorded, and the four-line illustration of what
  reordering does. The source asks for explicit quantifiers without saying that the ordering is the
  part that goes wrong.
- R3 in full — the treatment of sufficiency qualifiers as part of the quantifier structure, and the
  `rigor.almost-all-as-all` prohibition, which is one of the additional anti-patterns the source
  invites.
- R4's rule that a statement change is a history event rather than an edit.

## Relationship to other standards

[Standard 3](03-claims-ledger.md) defines the `Domain` and `Quantifiers` fields.
[Standard 6](06-assumptions-and-hidden-conjectures.md) governs hypotheses that are not part of the
quantifier structure. [Standard 11](11-finite-and-infinite-reasoning.md) is what R2's universal
quantifiers collide with when the evidence is a finite check.
[Standard 20](20-must-never-rules.md) holds the prohibitions in R1, R3, and R4.

## Implementation

Detectors: `rigor.explicit-domain` and `rigor.explicit-quantifiers` check that the fields are present
and non-empty on claims at rank 3 and above. `computation.finite-case-generalization` reads the
`Quantifiers` field to decide whether a claim is universal over an infinite domain, which is the one
place a detector acts on the field's content rather than its presence.

What no detector establishes: whether the stated domain is the domain the proof actually covers, or
whether the stated quantifier order is the one the argument uses. Both require reading the proof.
`rigor.domain-restrictions-ignored` and `rigor.almost-all-as-all` are therefore `manual-review` with
assurance `none` — they exist to give a reviewer a named thing to check and a claimant a named thing
to attest, not to be caught by a regex.
