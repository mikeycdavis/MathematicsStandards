# Standard 7 — Proof Obligations

A proof is complete when there is nothing left to prove. That sounds tautological, and it is exactly
the sentence that gets skipped: the main argument works, three side conditions were going to be
"routine", and the paper says the theorem is proved. This standard requires the side conditions to be
enumerated as objects with their own state, so that "complete" becomes a checkable claim about a list
rather than a feeling about an argument.

Source: item 7 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim at rank 6 (`LEMMA`) and above in
[Standard 2](02-claim-hierarchy.md) R3, and to definitions carrying the obligations
[Standard 4](04-definitions-before-dependent-claims.md) R2 describes.

## Requirements

### R1 — Enumerate the obligations

From the source, the standards must cover:

- proof obligation identification

Every claim at proved rank MUST carry an `Obligations` field listing what its proof requires. Each
obligation has an identifier, a statement of what must be shown, a state of `open` or `discharged`,
and — when discharged — a pointer to where:

```markdown
- **Obligations:**
  - OB-1 base case n = 2 — discharged (`proofs/clm-0007.md#base`)
  - OB-2 inductive step, uniform in k — discharged (`proofs/clm-0007.md#step`)
  - OB-3 the series converges for s > 1 — discharged (CLM-0004)
  - OB-4 the degenerate case f identically zero — open
```

A claim with genuinely nothing to enumerate writes `none`, which asserts that the author looked.

### R2 — What counts as an obligation

An obligation is anything the argument needs that the argument does not itself supply. In practice
they come from a small number of recurring places, and listing them is more useful than defining them
abstractly:

- Base cases and the uniformity of an inductive step over the whole domain.
- Side conditions: convergence, measurability, integrability, finiteness, non-emptiness.
- Non-degeneracy: a denominator is non-zero, a matrix is invertible, a set is non-empty, a limit
  exists.
- Case exhaustiveness: the cases considered cover the domain of
  [Standard 5](05-domains-and-quantifiers.md) R1.
- Well-definedness of anything defined by a choice, a representative, or a limit.
- The validity conditions of every symbolic step
  ([Standard 13](13-symbolic-manipulation.md)).
- Everything a triviality marker is standing in for
  ([Standard 6](06-assumptions-and-hidden-conjectures.md) R5).

### R3 — Complete means every obligation is discharged

A claim MUST NEVER be described as proved, or hold a status at proved rank, while any obligation on it
is `open`. This is one of the source's prohibitions, and it is the one with the cleanest mechanical
check in the whole framework: it compares two fields of the same ledger entry, and it is not a
judgement about mathematics at all.

An obligation is discharged by pointing at something. A discharge that points at nothing is an
assertion that the obligation is easy, which is what the obligation list existed to prevent.

### R4 — Moving an obligation is not discharging it

An open obligation can be turned into a new claim, and often should be — that is how a proof gets
factored into lemmas. What changes is where the obligation lives, not whether it is met. The parent
claim now `Depends` on the new claim, and if the new claim is a `CONJECTURE`, the parent is capped at
`CONDITIONAL_THEOREM` by [Standard 2](02-claim-hierarchy.md) R4 exactly as if the obligation were
still open.

This matters because the alternative is the most sophisticated failure the source names:

> move the unresolved difficulty into a newly defined lemma and then claim progress because the main theorem follows from that lemma

The manoeuvre is not fraud and is usually not even conscious. The main theorem genuinely does follow
from the lemma; the derivation may be elegant; the paper is not wrong about anything it states. What
has happened is that the hard part acquired a name and a number, and naming a difficulty is not
solving it. The structural half of this — the parent's status cannot exceed what the new lemma
supports — is checkable. The judgement half — whether the new lemma *is* the original difficulty
wearing a hat, or a genuine decomposition into tractable pieces — is `proof.difficulty-displacement`,
and it needs a mathematician.

## Additions this standard makes beyond the source

- The obligation record format in R1, including the `open`/`discharged` state and the requirement
  that a discharge point at an artifact. The source asks for obligations to be identified and does
  not say what identifying one produces.
- R2's catalogue of where obligations come from.
- R4 in full. The source prohibits the difficulty-displacement manoeuvre in its must-never list; the
  analysis of why it works, and the split between the checkable structural half and the
  judgement-dependent half, is authored.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) R4 makes discharged obligations a precondition of proved rank.
[Standard 4](04-definitions-before-dependent-claims.md) R2 supplies the obligations definitions carry.
[Standard 8](08-dependency-traceability.md) governs the `Depends` edges R4 creates.
[Standard 13](13-symbolic-manipulation.md) supplies the validity conditions R2 refers to.
[Standard 17](17-open-problems.md) applies R4 with a much higher bar, because displacement is the
characteristic failure of open-problem work.
[Standard 20](20-must-never-rules.md) holds both prohibitions.

## Implementation

Detectors: `proof.obligations-enumerated` (the field exists at proved rank) and
`proof.complete-with-open-obligations` (no claim at proved rank has an open obligation — the direct
mechanisation of R3). `claims.status-exceeds-support` covers the structural half of R4 by way of the
dependency closure.

What is not established: whether the enumerated list is the complete list. A proof with four
obligations and three of them written down passes every check here, and nothing in a text file can
know about the fourth. That is why R1 requires `none` to be written explicitly rather than left
blank — the cheapest available signal that somebody considered the question is worth more than a
detector that cannot ask it.
