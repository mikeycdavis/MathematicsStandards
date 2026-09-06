# Claims ledger

An honest small project. Every claim holds the status its evidence supports, and the one result that
rests on a conjecture says so by being CONDITIONAL_THEOREM rather than THEOREM.

## CLM-0001 — Definition of a gap-regular sequence

- **Status:** DEFINITION
- **Statement:** A sequence (a_n) is gap-regular when a_{n+1} - a_n <= log n for all n >= 2.
- **Domain:** sequences of positive integers
- **Quantifiers:** universal over n >= 2
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - literature-search — Standard usage; stated here for this project. Searched MathSciNet 2026-01-02, no conflicting definition found.
- **Formal:** none
- **History:**
  - 2026-01-02 → DEFINITION (stipulated at the start of the project, `notes/setup.md`)

## CLM-0002 — Gap-regular sequences are unbounded

- **Status:** LEMMA
- **Statement:** For every gap-regular sequence (a_n) of positive integers, a_n tends to infinity.
- **Domain:** gap-regular sequences of positive integers
- **Quantifiers:** universal over sequences; universal over n
- **Assumptions:** none
- **Depends:** CLM-0001
- **Obligations:**
  - OB-1 strict monotonicity from the definition — discharged (`proofs/clm-0002.md`)
- **Equivalences:** none
- **Evidence:**
  - proof — `proofs/clm-0002.md`
  - literature-search — Searched MathSciNet and zbMATH 2026-01-05 for prior statements; none found.
- **Formal:** none
- **History:**
  - 2026-01-04 → CONJECTURE (suspected while reading the definition, `notes/setup.md`)
  - 2026-01-05 CONJECTURE → LEMMA (proof written, `proofs/clm-0002.md`)

## CLM-0003 — Density conjecture

- **Status:** CONJECTURE
- **Statement:** For every gap-regular sequence, the counting function A(x) satisfies A(x) >> x / log x.
- **Domain:** gap-regular sequences of positive integers
- **Quantifiers:** universal over sequences; asymptotic as x tends to infinity
- **Assumptions:** none
- **Depends:** CLM-0001
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - counterexample-search — exhaustive over all gap-regular sequences with a_1 <= 50 and n <= 10^6, exact integer arithmetic, `computations/density/search.py#scan`, no counterexample found
  - heuristic — a probabilistic model suggests the bound, `notes/heuristic.md`
- **Formal:** none
- **History:**
  - 2026-01-08 → NUMERICAL_OBSERVATION (pattern in the search output, `computations/density/search.py`)
  - 2026-01-09 NUMERICAL_OBSERVATION → CONJECTURE (heuristic model recorded, `notes/heuristic.md`)

## CLM-0004 — Conditional counting bound

- **Status:** CONDITIONAL_THEOREM
- **Statement:** Assuming CLM-0003, every gap-regular sequence has A(x) >> x / (log x)^2 for x >= 3.
- **Domain:** gap-regular sequences; x real, x >= 3
- **Quantifiers:** universal over sequences; universal over x >= 3
- **Assumptions:** CLM-0003
- **Depends:** CLM-0002
- **Obligations:**
  - OB-1 the base range 3 <= x <= 100 — discharged (`proofs/clm-0004.md`)
- **Equivalences:** none
- **Evidence:**
  - proof — `proofs/clm-0004.md`
  - literature-search — Searched MathSciNet 2026-01-12 for conditional counting bounds of this shape; none found.
- **Formal:** none
- **History:**
  - 2026-01-12 → CONDITIONAL_THEOREM (proof modulo CLM-0003, `proofs/clm-0004.md`)

## References

- external:hardy-wright-1979 — Hardy and Wright, An Introduction to the Theory of Numbers, 5th edition, Oxford, 1979.
