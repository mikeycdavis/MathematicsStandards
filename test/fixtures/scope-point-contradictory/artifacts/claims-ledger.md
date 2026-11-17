# Claims ledger

Each claim has a well-formed `scope: point;` key and also says something in the same evidence entry that contradicts it. computation.scope-declared must report each with exactly one scope-contradiction line and must not accept any as a declared point. Quantifiers, Statement and Domain are never read by the check.

## CLM-0030 — Point and exhaustive

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exhaustive check, exact rational arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0031 — Point and for all

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; for all n, certified exact interval arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0032 — Point and an explicit range

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exact integer arithmetic, n <= 1000, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0033 — Point and universal

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exact interval arithmetic, universally valid, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0034 — Contradiction and no arithmetic (one line, the contradiction)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exhaustive check at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0035 — Point and all over a domain word

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; all values checked, exact rational arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)
