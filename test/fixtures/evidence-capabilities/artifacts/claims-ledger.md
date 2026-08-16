# Claims ledger

§0d. Two universal claims at proved rank, differing only in the type of the single evidence entry
that supports them. The pair is the whole fixture, because the defect is not about either claim
alone: it is that two rules read the same declared type and assign it incompatible capabilities.

At v1.2.0, `claims.mjs` declares `PROOF_EVIDENCE = {proof, formal, citation}` — a citation carries a
claim to proved rank — while `detectCounterexampleSearch` re-decides the question with an inline
`["counterexample-search", "proof", "formal", "computational"]`, from which `citation` is absent.
So CLM-0001 is simultaneously adequately proved and required to go looking for counterexamples.
RiemannHypothesis's recorded case: a theorem published in 2005 asked to search for counterexamples.

The disagreement runs both ways. `computational` appears in the second list and not the first. That
one is correct — a scan answers the search question without proving anything — but at v1.2.0 it is
correct by accident, in a list that does not know the other list exists.

## CLM-0001 — A published theorem, supported by its citation

- **Status:** THEOREM
- **Statement:** For all n >= 1, the partition function satisfies the stated congruence.
- **Domain:** n in N, n >= 1
- **Quantifiers:** universal over n
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - citation — `external:published-2005`
- **Formal:** none
- **History:**
  - 2026-05-01 → THEOREM (registered against the published proof, `external:published-2005`)

## CLM-0002 — The same shape, supported only by numbers

The true positive that keeps C3 from being satisfiable by removing the rule. Numerical evidence does
not answer the counterexample question for a universal claim, and this must still be reported.

- **Status:** THEOREM
- **Statement:** For all n >= 1, the sequence remains positive.
- **Domain:** n in N, n >= 1
- **Quantifiers:** universal over n
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - numerical — checked exhaustively up to 10^7 in exact integer arithmetic, `notes/scan.md`
- **Formal:** none
- **History:**
  - 2026-05-01 → THEOREM (registered, `notes/scan.md`)

## References

- `external:published-2005` — the published proof, 2005.
