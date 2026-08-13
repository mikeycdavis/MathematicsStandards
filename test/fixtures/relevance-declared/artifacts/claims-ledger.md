# Claims ledger

A1. Two claims at the same rank with opposite relevance to the project's target.

This is the shape both frozen adopters recorded in prose because no field took it: RiemannHypothesis's
`CLM-0009`, a `MACHINE_CHECKED_PROOF` at category 2 — "correct, unconditional, irrelevant to RH" —
and PvsNP's `CLM-0011`, a `MACHINE_CHECKED_PROOF` that "constrains nothing about `P/poly`". Reduced
here to `THEOREM`, which is high enough on the ladder to make the point and needs no formal block:
the property under test is that a claim can be as strong as the evidence gets and bear on nothing.

Its pair is `relevance-shifted`, which is this file with the two relevance values exchanged and
nothing else altered. Neither run may differ from the other in any status, rank, verdict or score.

**Both entries deliberately fail a rule**, and that is what makes the pair sensitive. Each is a
THEOREM supported only by a bounded numerical check, so each is reported as owing a counterexample
search. An earlier draft gave them proof evidence and nothing fired at all — which meant a coupling
that made relevance change a per-claim outcome had no outcome to change, and the mutation written to
break the independence guard passed it instead. A pair where nothing happens cannot detect a
difference in what happens.


## CLM-0001 — The target statement

- **Status:** THEOREM
- **Statement:** For all n >= 1, the target inequality holds.
- **Domain:** n in N, n >= 1
- **Quantifiers:** universal over n
- **Relevance:** target
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - numerical — checked up to 10^6 in exact integer arithmetic, `proofs/target.md`
- **Formal:** none
- **History:**
  - 2026-05-01 → THEOREM (proved, `proofs/target.md`)

## CLM-0002 — Correct, and about something else

- **Status:** THEOREM
- **Statement:** For all n >= 1, the auxiliary identity holds.
- **Domain:** n in N, n >= 1
- **Quantifiers:** universal over n
- **Relevance:** off-target
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - numerical — checked up to 10^6 in exact integer arithmetic, `proofs/auxiliary.md`
- **Formal:** none
- **History:**
  - 2026-05-01 → THEOREM (proved, `proofs/auxiliary.md`)
