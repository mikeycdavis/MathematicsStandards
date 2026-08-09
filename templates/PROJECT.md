# <Project name>

## What this project is trying to establish

One paragraph. The mathematical goal, stated as a claim someone could disagree with — not a topic.

## Current position

The two lines that matter most, and the ones most easily left vague:

- **Highest honestly-held status:** <the strongest status any claim about the target currently holds
  in the ledger, and which claim holds it>
- **What is actually proved about the target:** <plainly. Often "nothing yet — the proved results are
  lemmas and special cases", and saying so is more useful than a summary that implies otherwise>

## Regimes

Which of the five this project is in, and what that means here: informal mathematics, computational
mathematics, formal mathematics, theorem proving, research toward an open problem. This must agree
with `mathematics.regimes` in `project-policy.yml`.

## Where things live

| Artifact | Path |
| --- | --- |
| Claims ledger | `artifacts/claims-ledger.md` |
| Proofs | `proofs/` |
| Computations | `computations/` |
| Formal development | `formal/` |
| Open-problem records | `artifacts/open-problems/` |
| Decisions | `artifacts/adr/` |
| Abandoned routes | `research/abandoned/` |

## Stopping criteria

What would end this effort: a barrier that would rule the approach out, a resource bound, a date, or
a result in the literature that would settle the question. Written now, before the work, because
criteria written afterwards describe what happened rather than disciplining what happens.

## How to check it

```bash
npx math-standards validate .
```

Read the `not-evaluated` count as carefully as the status. A clean run means everything that was
checked passed — not that everything was checked.
