# Claims ledger

Planted defect: the difficulty was moved into a new lemma, and the new lemma depends on the theorem
it was extracted from. Nowhere is the loop visible in one place — which is the point.

## CLM-0030 — Main theorem

- **Status:** THEOREM
- **Statement:** Every gap-regular sequence satisfies the density bound.
- **Domain:** gap-regular sequences
- **Quantifiers:** universal over sequences
- **Assumptions:** none
- **Depends:** CLM-0031
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - proof — `proofs/clm-0030.md`
  - literature-search — Searched MathSciNet 2026-06-01; none found.
- **Formal:** none
- **History:**
  - 2026-06-01 → THEOREM (follows from CLM-0031, `proofs/clm-0030.md`)

## CLM-0031 — Key lemma

- **Status:** LEMMA
- **Statement:** The counting function is eventually monotone.
- **Domain:** gap-regular sequences
- **Quantifiers:** universal over sequences
- **Assumptions:** none
- **Depends:** CLM-0032
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - proof — `proofs/clm-0031.md`
  - literature-search — Searched MathSciNet 2026-06-01; none found.
- **Formal:** none
- **History:**
  - 2026-06-01 → LEMMA (extracted from the main argument, `proofs/clm-0031.md`)

## CLM-0032 — Auxiliary bound

- **Status:** LEMMA
- **Statement:** The partial sums are bounded below.
- **Domain:** gap-regular sequences
- **Quantifiers:** universal over sequences
- **Assumptions:** none
- **Depends:** CLM-0030
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - proof — `proofs/clm-0032.md`
  - literature-search — Searched MathSciNet 2026-06-01; none found.
- **Formal:** none
- **History:**
  - 2026-06-01 → LEMMA (follows from the main theorem, `proofs/clm-0032.md`)
