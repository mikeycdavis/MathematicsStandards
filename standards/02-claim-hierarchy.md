# Standard 2 — Claim Hierarchy

The failure this whole framework exists to prevent is a claim quietly becoming stronger than the
evidence for it. It rarely happens in one step. A numerical scan becomes an observation, the
observation becomes a conjecture, the conjecture acquires a proof sketch and starts being called a
lemma, and by the time the abstract is written the lemma has become a theorem — with no single moment
at which anyone lied. This standard names the levels so the movement between them has to be written
down.

Source: item 2 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim in every regime. A project in any of the regimes of
[Standard 1](01-applicability-and-scope.md) has claims, and every one of them has exactly one status
from R1 at any moment.

## Requirements

### R1 — The claim kinds

The standard establishes explicit distinctions between the following.

Reproduced verbatim from the source:

- definition
- observation
- numerical observation
- heuristic
- hypothesis
- conjecture
- lemma
- proposition
- theorem
- conditional theorem
- equivalent reformulation
- computational verification
- formalized theorem
- machine-checked proof
- unresolved claim

Each has a canonical token, used in the claims ledger of [Standard 3](03-claims-ledger.md), in inline
labels, and in every rule id that refers to a status:

```text
DEFINITION                 OBSERVATION              NUMERICAL_OBSERVATION
HEURISTIC                  HYPOTHESIS               CONJECTURE
LEMMA                      PROPOSITION              THEOREM
CONDITIONAL_THEOREM        EQUIVALENT_REFORMULATION COMPUTATIONAL_VERIFICATION
FORMALIZED_THEOREM         MACHINE_CHECKED_PROOF    UNRESOLVED_CLAIM
```

The vocabulary is closed. A status outside these fifteen tokens is a parse failure, not a new kind of
claim — the point of a fixed vocabulary is that "strongly suggested" and "essentially proved" cannot
be introduced as intermediate levels when the honest token is uncomfortable.

### R2 — No silent promotion

Reproduced verbatim from the source:

> A claim must never silently move upward in this hierarchy.

*Silently* is the operative word. Claims are supposed to get stronger; that is what research is. What
is prohibited is the strengthening that leaves no record. Every status change MUST be recorded as a
history entry in the claims ledger carrying the date, the previous status, the new status, the reason,
and a pointer to the evidence that justified it. A claim whose current status does not match the
endpoint of its recorded history has been promoted silently, whatever the intent.

The corresponding rules are `claims.silent-promotion` and `claims.history-complete`.

### R3 — The epistemic rank

R1's list is the source's order, and it is preserved. It is not, however, an ordering by strength,
and detectors need one. The three tail entries are not rungs on the ladder at all:
`EQUIVALENT_REFORMULATION` is lateral movement, `COMPUTATIONAL_VERIFICATION` is an evidence state,
and `UNRESOLVED_CLAIM` is the explicit admission that something is open. `CONDITIONAL_THEOREM` is
listed after `THEOREM` but is weaker than it, because it carries hypotheses that are not discharged.

The rank map used by every detector is therefore:

| Rank | Statuses |
| --- | --- |
| −1 | `UNRESOLVED_CLAIM` (outside the ladder: any proof-status reference to it is a promotion) |
| 0 | `DEFINITION` |
| 1 | `OBSERVATION`, `NUMERICAL_OBSERVATION` |
| 2 | `HEURISTIC` |
| 3 | `HYPOTHESIS` |
| 4 | `CONJECTURE`, `EQUIVALENT_REFORMULATION` |
| 5 | `COMPUTATIONAL_VERIFICATION` |
| 6 | `LEMMA`, `PROPOSITION` |
| 7 | `CONDITIONAL_THEOREM` |
| 8 | `THEOREM` |
| 9 | `FORMALIZED_THEOREM` |
| 10 | `MACHINE_CHECKED_PROOF` |

Rank 6 and above is *proved rank*: the claim asserts that a proof exists. Everything below it asserts
something weaker, and the difference between rank 5 and rank 6 is the single most consequential line
in these standards — it is the line between *we checked a lot of cases* and *we proved it*.

`DEFINITION` at rank 0 is not a weak claim; it is a different kind of thing. A definition is
stipulated, not proved, and it cannot be promoted at all. A definition that turns out to require
proof — that the defined object exists, or is unique, or is well-defined — has a proof obligation
under [Standard 7](07-proof-obligations.md), and that obligation is a separate claim.

### R4 — What a promotion requires

Reaching proved rank requires evidence of a specific kind, not merely a history entry saying so:

| Target status | Required evidence |
| --- | --- |
| `LEMMA`, `PROPOSITION`, `THEOREM` | An evidence entry of type `proof` naming an artifact that exists |
| `CONDITIONAL_THEOREM` | An evidence entry of type `proof`, plus every undischarged hypothesis declared in `Assumptions` |
| `FORMALIZED_THEOREM` | A `Formal` block naming the assistant, the file, and the declaration |
| `MACHINE_CHECKED_PROOF` | A `Formal` block as above, with no placeholder in the cited artifact and the axiom set disclosed ([Standard 16](16-formal-theorem-proving.md)) |
| `COMPUTATIONAL_VERIFICATION` | An evidence entry of type `computational` or `numerical` declaring the range checked and the arithmetic used |

A claim MUST NEVER hold a status whose evidence requirement is unmet. Nor may it hold a status its
dependencies cannot support: if anything in a claim's dependency closure sits below rank 6, the
honest ceiling is `CONDITIONAL_THEOREM`, and asserting `THEOREM` instead is the prohibition
[Standard 20](20-must-never-rules.md) records as calling a conditional theorem unconditional.

### R5 — Demotion is honest and must also be recorded

A claim whose proof is found wanting moves down. This is not a failure of the process, it is the
process working, and it MUST be recorded exactly as a promotion is — same history entry, same
required reason. The rules that fire on rank increases deliberately do not fire on decreases, and
referring to a `THEOREM` as "the lemma we use here" is never a violation. Only movement upward
without a record is.

## Additions this standard makes beyond the source

- The canonical tokens in R1. The source gives fifteen English phrases; the uppercase tokens are
  authored, and are what make the hierarchy machine-checkable.
- The whole of R3. The source lists the kinds in an order and does not claim that order is a
  strength ordering; the rank map is an interpretation, and it deliberately departs from the listed
  order for the four entries named there. The source order is preserved in R1 rather than being
  silently re-sorted, because reordering a source list and then quoting it as the source is the sort
  of quiet edit [Standard 21](21-standards-integrity.md) exists to stop.
- R4's evidence table in full.
- R5. The source prohibits upward movement and says nothing about downward movement; stating that
  demotion is legitimate matters, because a standard that punished it would create an incentive to
  leave a broken claim standing.

## Relationship to other standards

[Standard 3](03-claims-ledger.md) is where these statuses are recorded and is what makes R2
enforceable. [Standard 8](08-dependency-traceability.md) supplies the dependency closure R4 needs.
[Standard 10](10-computational-and-numerical-evidence.md) governs the rank-1 and rank-5 statuses,
[Standard 16](16-formal-theorem-proving.md) the rank-9 and rank-10 ones.
[Standard 20](20-must-never-rules.md) collects the prohibitions that R2 and R4 imply.

## Implementation

`scripts/claims.mjs` exports `STATUS_RANK` — the single definition of R3, so no detector can hold a
private copy — along with the prose alias table used to recognise status words in research writing.

Detectors: `claims.status-vocabulary` (R1), `claims.silent-promotion` and `claims.history-complete`
(R2), `claims.status-exceeds-support` and `claims.conditional-as-unconditional` (R4).

What none of them establish: whether the proof artifact a `THEOREM` cites actually proves the
statement. The rank of a claim is checked against its declared evidence and its declared
dependencies. A ledger that is internally consistent and mathematically wrong passes every check in
this standard, which is why the assurance level of every rule here is `partial` and why
`docs/assurance-report.md` lists proof correctness first among the things that require a
mathematician.
