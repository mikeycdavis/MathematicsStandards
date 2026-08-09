# Claims ledger

Planted defect: CLM-0010 claims MACHINE_CHECKED_PROOF over a Lean file that contains `sorry`, and
the development declares an axiom that no Formal block lists.

## CLM-0010 — Main gap theorem

- **Status:** MACHINE_CHECKED_PROOF
- **Statement:** For all n in N with n > 1, G(n) <= 2 log n.
- **Domain:** n in N, n > 1
- **Quantifiers:** universal over n
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - formal — `formal/Main.lean`
  - literature-search — Searched MathSciNet 2026-03-01; no prior statement found.
- **Formal:**
  - assistant: lean4 4.9.0
  - file: `formal/Main.lean`
  - declaration: `main_result`
  - axioms: propext, Classical.choice
  - dependencies: mathlib @ 3f7a1c2
- **History:**
  - 2026-03-01 → MACHINE_CHECKED_PROOF (formalised, `formal/Main.lean`)
