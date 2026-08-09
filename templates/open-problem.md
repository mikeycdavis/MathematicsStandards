# <Problem name>

The tracking record for one major open problem. Every section below is required and none may be left
blank — `none` written deliberately is an answer, a blank is an unanswered question wearing the
appearance of one. The format is
[Standard 17](https://github.com/mikeycdavis/MathematicsStandards/blob/main/standards/17-open-problems.md) R1.

## Target Statement

The problem, stated precisely, with its source. Not a paraphrase: the statement you would have to
prove, with its quantifiers and its domain.

## What Is Proved

Claims at proved rank in the ledger, by identifier, whose dependency closure is clean.

On a serious open problem this section frequently contains nothing about the target itself — only
lemmas, special cases, and conditional results. Write that plainly if it is true. Conditional results
belong here with their conditions attached: "under CLM-0007, X" is a real result, and stating it as X
is the error this whole record exists to prevent.

## What Remains Conjectural

The gap between the section above and the target. Be specific about which steps are unproved and
what each would take.

## Known Results

What the literature already establishes, and — at a higher bar than ordinary work — what prior
attempts on this approach exist and why they stopped. For a major problem, an approach that appears
new has usually been tried.

## Equivalences

Statements related to the target, each with its direction (implies / implied-by / iff) and the proof
status of the relationship itself. A statement equivalent to the target is exactly as unproved as the
target, whatever it looks like.

## Where the Difficulty Lives

In plain language: what is the hard part right now? If it has moved since the last revision, say what
moved it and why that is a reduction rather than a relabelling.

This is the section that resists a generous reading of partial progress. Writing it honestly is most
of the value of this file.

## Known Barriers

Barriers encountered, each with its citation and the approaches it rules out. An approach a barrier
already excludes is not a research direction.

## Terminated Approaches

One `###` heading per approach. Each carries a `Status:` line and an `Evidence required to reopen:`
line — the second is what turns "we gave up" into a falsifiable condition.

### <Approach name>

Status: terminated <YYYY-MM-DD>
Why: <what stopped it, referencing the claims or notes that establish it>
Evidence required to reopen: <the specific result, bound, or technique whose appearance would justify revisiting this>

## Stopping Criteria

What would end this effort, written before it begins: a barrier that would rule the strategy out, a
resource bound, a date, a literature result that would settle it, or a negative result the effort
itself would produce.

Criteria written at the start are a research plan. Criteria written at the end are a description of
what happened, and they exert no discipline on the work at all.
