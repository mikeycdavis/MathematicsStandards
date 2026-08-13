# Claims ledger

A1. `relevance-declared` with the two relevance values exchanged and nothing else altered.

The pair is the experiment. One ledger proves the field can be recorded; only the pair proves the
axis is independent, because a single ledger cannot distinguish "relevance changes nothing" from
"relevance is ignored". Every status, rank, verdict and score must be identical across the two runs.

## CLM-0001 — The target statement

- **Status:** THEOREM
- **Statement:** For all n >= 1, the target inequality holds.
- **Domain:** n in N, n >= 1
- **Quantifiers:** universal over n
- **Relevance:** off-target
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - numerical — checked up to 10^6 in exact integer arithmetic, `proofs/target.md`
- **Formal:** none
- **History:**
  - 2026-05-01 → THEOREM (proved, `proofs/target.md`)

## CLM-0002 — Correct, and about something else

- **Status:** THEOREM
- **Statement:** For all n >= 1, the auxiliary identity holds.
- **Domain:** n in N, n >= 1
- **Quantifiers:** universal over n
- **Relevance:** target
- **Assumptions:** none
- **Depends:** none
- **Obligations:** none
- **Equivalences:** none
- **Evidence:**
  - numerical — checked up to 10^6 in exact integer arithmetic, `proofs/auxiliary.md`
- **Formal:** none
- **History:**
  - 2026-05-01 → THEOREM (proved, `proofs/auxiliary.md`)
