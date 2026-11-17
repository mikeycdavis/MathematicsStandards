# Claims ledger

CLM-0001 checks one parameter value and declares scope: point; computation.scope-declared must NOT report it. CLM-0002 is an ordinary range claim and must also not be reported. CLM-0003 declares scope: point while its Quantifiers prose says otherwise; Quantifiers is never read, so it is not reported either. CLM-0004 is a negative control for the contradiction check: its bare `all` and its tolerance `10^-9` look like range language but are not contradictions, so it must not be reported. CLM-0005 is the backtick case: the only range-looking words are inside the cited program path, which is stripped before scanning, so it must not be reported.

## CLM-0001 — Certified bound at one parameter value

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point, deliberately
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0002 — An ordinary range result

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** For all n with 1 <= n <= 10^9, G(n) < n.
- **Domain:** n in N, 1 <= n <= 10^9
- **Quantifiers:** universal over n in the stated range
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — exhaustive for all n <= 10^9, exact integer arithmetic, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0003 — Declared point, Quantifiers prose says otherwise

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** The interval-arithmetic bound B(s0) < 1 holds at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** universal over n in the stated range
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; certified interval arithmetic at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0004 — Declared point, no contradiction (negative control)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; all arithmetic is exact rational, tolerance 10^-9, certified at s0 = 1/2, `computations/check.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/check.py`)

## CLM-0005 — Declared point, range-looking words only inside the program path (backtick case)

- **Status:** COMPUTATIONAL_VERIFICATION
- **Statement:** B(s0) < 1 at s0 = 1/2.
- **Domain:** s = s0 = 1/2
- **Quantifiers:** single point
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — scope: point; exact interval arithmetic at s0 = 1/2, `computations/exhaustive-all.py`
- **Formal:** none
- **History:**
  - 2026-11-01 → COMPUTATIONAL_VERIFICATION (the computation ran, `computations/exhaustive-all.py`)
