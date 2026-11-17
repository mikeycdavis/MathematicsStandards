# Claims ledger

Each claim attempts a structured scope and gets it wrong in one way, or (CLM-0022, CLM-0023) does not attempt the key at all. computation.scope-declared must report every one, with one line each. None may be treated as a declared point scope.

## CLM-0020 — Point declared, arithmetic not stated

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; checked at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0021 — Unrecognised scope value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: points; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0022 — Scope key in the wrong case

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — Scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0023 — Scope mentioned in prose, not declared

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — certified interval arithmetic at s0 = 1/2 (this is scope: point), `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0024 — Scope value that is not a point, with range wording present (no fallback)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: range; exhaustive up to 10^9, exact integer arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0025 — Empty scope value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: ; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0026 — Key begins with scope: but fails the grammar (words after the value)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point at s0 = 1/2; certified interval arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0027 — Malformed key with range wording present (no fallback)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point exact interval, exhaustive up to 10^9, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0028 — Right key, wrong case of the value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: Point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)
