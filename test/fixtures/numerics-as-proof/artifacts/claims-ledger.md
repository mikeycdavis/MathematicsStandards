# Claims ledger

Planted defect: CLM-0020 is a THEOREM whose only evidence is a bounded computation. CLM-0021 states
the same thing honestly and must NOT be reported.

## CLM-0020 — Universal gap bound

- **Status:** THEOREM
- **Statement:** For all n >= 1, G(n) < n.
- **Domain:** n in N, n >= 1
- **Quantifiers:** universal over n
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - computational — verified for all n <= 10^9, exact integer arithmetic, `computations/check.py`
  - literature-search — Searched MathSciNet 2026-05-01; no prior statement of this bound found.
- **Formal:** none
- **History:**
  - 2026-05-01 → THEOREM (the scan finished, `computations/check.py`)

## CLM-0021 — The same result, stated honestly

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
  - 2026-05-01 → COMPUTATIONAL_VERIFICATION (the scan finished, `computations/check.py`)
