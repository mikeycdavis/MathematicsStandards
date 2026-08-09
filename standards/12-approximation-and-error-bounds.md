# Standard 12 — Approximation and Error Bounds

An approximation without an error bound is a number with no claim attached. It might be accurate to
twenty digits or to none, and the notation gives no way to tell: "≈" is used identically for a
rigorous bound, a heuristic estimate, and a value someone read off a plot. This standard requires the
bound to travel with the approximation, and requires it to be proved rather than assumed.

Source: item 12 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies wherever a claim states an approximate value, an asymptotic relation, a truncation, or a
numerical estimate — which in a computational project is most quantitative claims.

## Requirements

### R1 — Every approximation carries an explicit bound

From the source, the standards must cover:

- approximation/error bounds

An approximate claim MUST state the error bound and the sense in which it holds. The unacceptable and
acceptable forms differ by one clause:

```text
No.   The constant is approximately 1.30357.
Yes.  The constant lies in [1.303577, 1.303578], by interval arithmetic over the
      truncated series with the tail bounded by Lemma CLM-0014.
```

The bound states three things: its magnitude, whether it is rigorous or estimated, and what
establishes it. An estimated bound is legitimate evidence at `NUMERICAL_OBSERVATION` rank; it is not
a bound that another result may be proved on top of.

### R2 — Asymptotic notation carries its regime

`O`, `o`, `Θ`, `Ω`, and `~` are statements about a limit, and each is incomplete without the variable
and the limit it refers to. Three properties MUST be explicit where they matter:

- **The variable and the limit.** `O(f(x))` as x → ∞ and as x → 0 are unrelated claims.
- **Uniformity.** Whether the implied constant is uniform in the other parameters, and in which ones.
  Non-uniformity discovered late invalidates every result that summed over the parameter.
- **Effectivity.** Whether the implied constant is computable from the proof. An ineffective bound
  cannot be used to certify any particular case, which is precisely what such bounds are most often
  used for.

An asymptotic statement is not a statement about any specific value of the variable, and MUST NEVER be
used to justify a numerical claim at a specific point without an effective constant.

### R3 — Truncation and discretisation are approximations

A truncated series, a finite-difference derivative, a quadrature rule, a fixed-precision constant, and
an iteration stopped at a tolerance are all approximations, and each MUST carry its own bound:
respectively, a tail bound, a step-size error, a quadrature error, a rounding bound, and a convergence
argument. The tail bound is the one most often skipped, because the terms are visibly getting small —
which is not a bound, and is not always even true of the sum.

### R4 — Bounds compose, and the composition must be tracked

Chained approximations accumulate error, and the accumulation is rarely the sum of the parts:
multiplication scales relative errors, subtraction of near-equal quantities amplifies them without
limit, and iteration can compound them geometrically. Where a claim depends on several approximate
inputs, the final bound MUST be derived rather than inherited from the worst input, and the derivation
is a proof obligation under [Standard 7](07-proof-obligations.md).

### R5 — The bound is part of the claim's statement

The bound belongs in the `Statement` field of the ledger entry, not only in the computation that
produced it. A claim recorded as "the constant is 1.30357" with the interval living in a script's
output has already lost the information, and every downstream use will treat the value as exact.

## Additions this standard makes beyond the source

- Essentially all of the detail. The source supplies one bullet. R1's three-part bound, R2's three
  properties of asymptotic notation, R3's enumeration of approximation sources, R4's composition rule,
  and R5's placement requirement are authored, and each corresponds to a specific way an unbounded
  approximation propagates into a claim that reads as exact.

## Relationship to other standards

[Standard 10](10-computational-and-numerical-evidence.md) R4 requires an error analysis wherever
floating point is used, and this standard is that analysis.
[Standard 13](13-symbolic-manipulation.md) governs the symbolic steps R3's bounds are derived by.
[Standard 5](05-domains-and-quantifiers.md) governs the regime R2 requires.
[Standard 7](07-proof-obligations.md) is where R4's derivation is recorded.

## Implementation

The detector `computation.error-bounds-stated` fires when a ledger entry's statement or evidence
contains approximation markers — `≈`, `approximately`, `about`, asymptotic notation, a truncation — and
no bound is stated alongside. It is a pattern match over informal mathematical prose, and it is
imperfect in both directions: it will miss an unbounded approximation written without a marker, and it
will occasionally flag a claim whose bound is expressed in a form it does not recognise. The finding
is `INFERRED` and the rule's severity reflects that it is a prompt to check rather than a
determination.

Everything substantive in this standard is beyond automation. Whether a stated bound is correct,
whether an implied constant is uniform, whether a tail bound was proved or eyeballed, and whether
composed errors were analysed rather than assumed are all mathematical questions. They are recorded as
proof obligations so that a reviewer has an enumerated list to work through, and that list — not the
detector — is what this standard actually contributes.
