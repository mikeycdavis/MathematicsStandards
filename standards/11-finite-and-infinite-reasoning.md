# Standard 11 — Finite and Infinite Reasoning

The step from "true for every case we checked" to "true for every case" is not a small one. It is the
whole of the difference between evidence and proof, and mathematics has a long record of conjectures
that survived enormous computation and were false anyway. This standard exists because that step is
the single most tempting move available to an automated research process: the evidence is
overwhelming, the pattern is clean, and nothing in the data says stop.

Source: item 11 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim whose domain is infinite and whose evidence is finite. In practice this means
any universally quantified claim over ℕ, ℝ, or any infinite family, supported by computation.

## Requirements

### R1 — Finite verification does not establish an infinite claim

From the source, the standards must cover:

- finite-vs-infinite reasoning

The prohibition is stated in the source as:

> infer a universal/infinite theorem solely from finitely many checked cases

A claim quantified over an infinite domain MUST NOT hold a status at proved rank on the strength of a
finite check, however large. The word *solely* matters: a finite check plus an argument reducing the
infinite case to the finite one is a proof, and a common and excellent one. What is prohibited is the
bare inference, where the reduction does not exist and the size of the search is doing the work an
argument should do.

### R2 — The historical record is the argument

This is not a hypothetical caution, and a project tempted to treat it as pedantry should have the
counter-examples to hand:

- **The Mertens conjecture** held for every value anyone could compute and was disproved in 1985. The
  smallest known counterexample is beyond 10¹⁶, and the disproof was non-constructive.
- **Pólya's conjecture** was verified into the hundreds of millions and fails first at 906,150,257.
- **The Skewes bound**: π(x) < li(x) holds for every x anyone has ever checked, and it is a theorem
  that the inequality reverses infinitely often — the first crossing is simply too large to see.

Each of these had more computational support than most conjectures ever accumulate. The lesson is not
that computation is untrustworthy; it is that the size of a finite search carries no information
about what happens past its bound, and that the human sense of "surely by now" is calibrated on
nothing.

### R3 — The honest restatement

Where a finite check is the evidence, the claim MUST be restated to the domain the check covers, or
its status lowered to `CONJECTURE` with the computation recorded as supporting evidence. Both are
available, both are honest, and choosing between them is a matter of what the project wants to assert:

```text
Theorem.     For all n with 2 <= n <= 10^9, P(n).       proved, by exhaustive computation
Conjecture.  For all n >= 2, P(n).                      supported by that computation
```

Stating both, with the second citing the first, is usually the right answer and loses nothing.

### R4 — Reductions to a finite check must be complete

A proof that reduces an infinite problem to a finite verification is only as good as the reduction,
and the reduction is itself a claim with its own obligations
([Standard 7](07-proof-obligations.md)). Two conditions in particular MUST be discharged: the bound
is proved rather than estimated, and the finite check actually covered every case up to it, including
the cases the program's optimisations skipped. A reduction to "all n below N" combined with a program
that quietly skipped n satisfying some condition has verified something other than what the reduction
required.

### R5 — Related quantifier inflations

Three neighbouring moves are prohibited under the same reasoning, and they are easier to miss than
the plain finite-to-infinite step because in each case a real theorem is being misreported rather than
an absent one being invented:

- **Almost-all as all.** A density-one or almost-everywhere result is not a universal one; the
  exceptional set is exactly what the theorem declined to control (`rigor.almost-all-as-all`).
- **Asymptotic as universal.** "For sufficiently large n" says nothing about any particular n, and in
  many cases the threshold is not effective — it cannot even in principle be computed from the proof.
- **Generic as every.** A property holding on a dense open set, or with probability one, does not hold
  at the point of interest merely because that point was not excluded by name.

## Additions this standard makes beyond the source

- R2 in full. The source states the prohibition; the historical cases are supplied here because a
  prohibition with a reason attached survives contact with a deadline and a bare one does not.
- R3's restatement pattern.
- R4's two conditions on reductions.
- R5's three neighbouring inflations, of which `rigor.almost-all-as-all` is one of the additional
  anti-patterns the source invites.

## Relationship to other standards

[Standard 5](05-domains-and-quantifiers.md) supplies the quantifier structure this standard reads.
[Standard 10](10-computational-and-numerical-evidence.md) governs the evidence.
[Standard 2](02-claim-hierarchy.md) R3 places `COMPUTATIONAL_VERIFICATION` at rank 5, below proved
rank, which is this standard expressed as a number.
[Standard 20](20-must-never-rules.md) holds the prohibition.

## Implementation

The detector `computation.finite-case-generalization` fires when a ledger entry at proved rank has a
statement matching a universal quantifier over an unbounded domain and evidence describing a bounded
range, with no proof or formal artifact cited. Both halves are pattern matches over informal text, so
the finding is reported `INFERRED` and the rule's assurance is `partial`.

Its limits are worth being precise about, because this is the rule a project is most likely to trust
too far. It reads the `Quantifiers` and `Evidence` fields, not the mathematics. A claim whose
universal quantification is implicit in prose and absent from the field is not caught. A reduction
argument that is subtly incomplete under R4 is not caught — the ledger will show a `proof` evidence
entry and the rule will stay quiet. What the rule reliably catches is the unguarded case: a big
computation, a universal statement, and nothing in between. That case is common enough, and damaging
enough, to be worth a detector even though the sophisticated versions get past it.
