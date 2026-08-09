# Agent instructions

This project follows the Mathematics Standards. Read this before doing anything, every session.

## Load order

1. `PROJECT.md` — what this project is trying to prove.
2. `project-policy.yml` — which rules apply here, and the `standardVersion` they are evaluated at.
3. `artifacts/claims-ledger.md` — every claim, its status, and what it rests on. **This is the record
   of what is known. Your memory of the conversation is not.**
4. `artifacts/open-problems/*/problem.md` — where one exists, the honest position on the target.
5. `artifacts/adr/` — decisions already made. Do not relitigate them without new information.

Chat history is transient working context. A decision, a claim, or a reason that exists only in a
conversation is not preserved: the next session — human or machine — begins without it. If it
matters, it goes in a file.

## The one rule that matters most

**Never move a claim up the hierarchy without recording why.** The fifteen statuses run DEFINITION,
OBSERVATION, NUMERICAL_OBSERVATION, HEURISTIC, HYPOTHESIS, CONJECTURE, LEMMA, PROPOSITION, THEOREM,
CONDITIONAL_THEOREM, EQUIVALENT_REFORMULATION, COMPUTATIONAL_VERIFICATION, FORMALIZED_THEOREM,
MACHINE_CHECKED_PROOF, UNRESOLVED_CLAIM.

Every status change gets a History entry with the date, the previous status, the new status, the
reason, and the evidence. Reaching LEMMA or above requires evidence of type `proof`, `formal`, or
`citation` — a computation, however large, is not one.

If you cannot prove something, record it at the status the evidence supports. That is not a failure.

## Your workflow

| Step | Command |
| --- | --- |
| See what applies here and why | `math-standards explain <rule-id>` |
| Gather evidence | Fill the ledger's Evidence field; cite artifacts that exist |
| Evaluate | `math-standards validate .` |
| One-screen summary | `math-standards status .` |
| Understand a finding | The finding carries its rule, standard, evidence, and remediation |

## The five conclusions you may reach

| Conclusion | What it means for the work |
| --- | --- |
| **compliant** | Proceed |
| **non-compliant** | Remediate; proceeding may be reasonable with the failure recorded |
| **not applicable** | The rule has no subject here; its `revisitWhen` condition is live |
| **insufficient evidence / not evaluated** | **Nobody looked.** Not a pass. Gather evidence or request an attestation |
| **blocked by invariant** | **Stop** |

You must never be forced into a positive one. "This is not proved", "the evidence is insufficient",
and "I cannot establish this" are complete, correct answers.

## On BLOCKED_BY_INVARIANT: stop

An invariant violation means something in the record is untrue in a way that invalidates the work
resting on it. You may do exactly two things: fix the underlying condition, or stop and report the
rule ids in `blockedBy`.

You may **not**:

- edit the ledger, the policy, the catalog, or a detector so that the block clears;
- reclassify the offending rule as not applicable;
- write an exception or an attestation against it;
- proceed on the grounds that the blocked item is peripheral to your task.

Each of those is also a violation of the standards-integrity invariant: never bypass, weaken, remove,
reclassify, reinterpret, falsify evidence for, or manipulate a standard, test, applicability
determination, evidence requirement, or verification mechanism **solely because it prevents the
desired conclusion**. The test is counterfactual: would this change be correct if the rule were
currently passing?

## Before you say a proof is complete

- Every obligation in the claim's `Obligations` field is discharged and points at where.
- Every assumption the argument uses is in `Assumptions` — including the ones introduced mid-proof.
- The domain and quantifiers in the ledger are the ones the proof actually establishes.
- Nothing in the dependency closure is below proved rank. If something is, the honest status is
  `CONDITIONAL_THEOREM` and the condition belongs in the statement.
- If a proof assistant is involved: the cited declaration is the target, not a helper; the file
  contains no `sorry`, `admit`, `Admitted`, or `oops`; and the axiom list is recorded.

Then run `math-standards validate .` — and read the `not-evaluated` count, not just the status.
