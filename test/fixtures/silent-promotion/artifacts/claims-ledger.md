# Claims ledger

Planted defect: the prose in `notes/breakthrough.md` calls CLM-0002 a theorem. The ledger does not.

## CLM-0002 — Gap density conjecture

- **Status:** CONJECTURE
- **Statement:** For all n > 2, the gap density exceeds 1/2.
- **Domain:** n in N, n > 2
- **Quantifiers:** universal over n
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - counterexample-search — exhaustive for 2 < n <= 10^6, exact integer arithmetic, `computations/scan.py`, none found
- **Formal:** none
- **History:**
  - 2026-04-01 → CONJECTURE (heuristic plus a search, `computations/scan.py`)

## CLM-0005 — The uniformity step

- **Status:** UNRESOLVED_CLAIM
- **Statement:** The implied constant is uniform in q.
- **Domain:** q in N
- **Quantifiers:** universal over q
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - heuristic — plausible but repeatedly resisted proof, `notes/breakthrough.md`
- **Formal:** none
- **History:**
  - 2026-04-02 → UNRESOLVED_CLAIM (three attempts failed, `notes/breakthrough.md`)
