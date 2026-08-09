# Claims ledger

Every claim this project makes, its current status, what it rests on, and what supports it. The
format is specified in [Standard 3](https://github.com/mikeycdavis/MathematicsStandards/blob/main/standards/03-claims-ledger.md);
the fifteen statuses are [Standard 2](https://github.com/mikeycdavis/MathematicsStandards/blob/main/standards/02-claim-hierarchy.md) R1.

Three things to know before editing it:

1. **A field with nothing in it is written `none`, never omitted.** An absent field and an empty one
   are different, and only one of them shows that you considered the question.
2. **Every status change gets a History entry** with the date, the previous status, the new status,
   the reason, and the evidence. A status that disagrees with its own history is what a silent
   promotion looks like from the outside.
3. **Referring to a claim by identifier in your writing asserts nothing.** Putting a status word next
   to it — `Theorem (CLM-0001)` — asserts that status, and the audit compares it against this file.

Delete the example below once you have a real claim. Identifiers are never reused, including after a
claim is withdrawn.

## CLM-0001 — Squares are nonnegative over the reals

- **Status:** THEOREM
- **Statement:** For all x in R, x^2 >= 0.
- **Domain:** x in R
- **Quantifiers:** universal over x
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - proof — `proofs/clm-0001.md`
- **Formal:** none
- **History:**
  - 2026-01-01 → OBSERVATION (noticed while checking small cases, `notes/2026-01-01.md`)
  - 2026-01-03 OBSERVATION → THEOREM (proof written, `proofs/clm-0001.md`)

<!--
A second example, showing the fields that only appear at higher ranks. Uncomment and adapt.

## CLM-0002 — Gap bound for shifted primes

- **Status:** CONDITIONAL_THEOREM
- **Statement:** Assuming CLM-0003, for all n in N with n > 2, G(n) <= C log n for an absolute C.
- **Domain:** n in N, n > 2
- **Quantifiers:** universal over n; the constant C is absolute and uniform in n
- **Assumptions:** CLM-0003
- **Depends:** CLM-0001, external:dirichlet-1837
- **Obligations:**
  - OB-1 base case n = 3 — discharged (`proofs/clm-0002.md#base`)
  - OB-2 uniformity of C in n — discharged (`proofs/clm-0002.md#uniformity`)
- **Equivalences:** none
- **Evidence:**
  - proof — `proofs/clm-0002.md`
  - computational — exhaustive for 2 < n <= 10^7, exact integer arithmetic, `computations/gap-scan/run.py`, log at `computations/gap-scan/log.txt`
- **Formal:** none
- **History:**
  - 2026-01-10 → CONJECTURE (heuristic argument, `notes/heuristic.md`)
  - 2026-02-02 CONJECTURE → CONDITIONAL_THEOREM (proof modulo CLM-0003, `proofs/clm-0002.md`)

## CLM-0004 — Nonnegativity, formalised

- **Status:** MACHINE_CHECKED_PROOF
- **Statement:** For all x in R, x^2 >= 0.
- **Domain:** x in R
- **Quantifiers:** universal over x
- **Assumptions:** none
- **Depends:** CLM-0001
- **Obligations:** none
- **Equivalences:** CLM-0001 (iff, proved by CLM-0001)
- **Evidence:**
  - formal — `formal/Squares.lean`
- **Formal:**
  - assistant: lean4 4.9.0
  - file: `formal/Squares.lean`
  - declaration: `sq_nonneg'`
  - axioms: propext, Classical.choice, Quot.sound
  - dependencies: mathlib @ 3f7a1c2
  - checked: 2026-02-10, `lake build` clean, `#print axioms sq_nonneg'` output at `formal/axioms.txt`
- **History:**
  - 2026-02-10 THEOREM → MACHINE_CHECKED_PROOF (formalised and checked, `formal/axioms.txt`)
-->

## References

External results this project depends on. Each entry carries enough to find the work; a reference
that cannot be resolved to a real document must not be cited
([Standard 14](https://github.com/mikeycdavis/MathematicsStandards/blob/main/standards/14-literature-and-novelty.md) R2).

<!--
- external:dirichlet-1837 — Dirichlet, "Beweis des Satzes, dass jede unbegrenzte arithmetische Progression...", Abhandlungen der Königlich Preussischen Akademie der Wissenschaften, 1837.
-->
