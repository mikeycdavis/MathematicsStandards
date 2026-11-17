# Claims ledger

Every claim here is a point in fact and says so in prose. None declares a structured scope and none states a range, so computation.scope-declared must report each. Pins C2 (free-text Quantifiers is never read) and C3 (missing scope is still refused).

## CLM-0010 — Point stated only in Quantifiers

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0011 — Quantifiers imitates the structured form

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** scope: point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0012 — Point stated only in the statement and domain

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** At the single point s0 = 1/2, B(s0) < 1.
- **Domain:** the single point s = 1/2
- **Quantifiers:** none
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)
