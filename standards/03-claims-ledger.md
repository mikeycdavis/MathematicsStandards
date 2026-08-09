# Standard 3 — Claims Ledger

[Standard 2](02-claim-hierarchy.md) is unenforceable while every claim's status lives in prose. Prose
is where promotion hides: the same result is a conjecture in section 2, "our lemma" in section 4, and
"the theorem" in the abstract, and no diff shows the moment it changed. The ledger is a single file
that says what every claim currently is, what it rests on, and what evidence supports it — one place
to read, one place to change, and a change that shows up in review.

Source: item 3 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to any project with claims that are not yet settled — which is any research project. A
project whose mathematics is entirely quoted from the literature, with no claims of its own, may
declare the `claims.*` rules not applicable under [Standard 1](01-applicability-and-scope.md) R2.

## Requirements

### R1 — What the ledger tracks

The open-problem section of the source states what a system must explicitly track.

Reproduced verbatim from the source:

- what is actually proved
- what remains conjectural
- whether a result is known
- whether a result is equivalent to the target
- whether the central difficulty has merely moved
- known barriers encountered
- terminated approaches
- evidence required to reopen an approach

The first four are per-claim and live in the ledger. The last four are per-approach and live in the
open-problem file of [Standard 17](17-open-problems.md), which the ledger links to. The split is
practical rather than principled: a claim outlives the approach that produced it.

### R2 — Location and format

The ledger lives at `artifacts/claims-ledger.md` unless `project-policy.yml` names another path in
`mathematics.claimsLedger`. It is Markdown, because it is read by people far more often than by the
audit command, and it is parsed by a small deterministic parser rather than a Markdown engine.

Each claim is a level-two heading followed by a field list:

```markdown
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
  - 2026-08-01 → OBSERVATION (noticed while checking cases, `notes/2026-08-01.md`)
  - 2026-08-05 OBSERVATION → THEOREM (proof written, `proofs/clm-0001.md`)
```

Identifiers match `^CLM-\d{4}$` and are never reused, including after a claim is abandoned — a
retired claim keeps its id and gains the status `UNRESOLVED_CLAIM` or a final history entry saying it
was withdrawn. Reusing an id silently rewrites the history of everything that cited it.

References to results the project does not own take the form `external:<slug>` and resolve in a
`## References` section at the end of the ledger, which carries the citation and, where one exists, a
DOI or arXiv identifier ([Standard 14](14-literature-and-novelty.md)).

`Status`, `Statement`, and `History` are mandatory on every entry. `Domain` and `Quantifiers` become
mandatory at rank 3 and above ([Standard 5](05-domains-and-quantifiers.md)); `Obligations` at rank 6
and above ([Standard 7](07-proof-obligations.md)); `Formal` at rank 9 and above
([Standard 16](16-formal-theorem-proving.md)). A field with nothing in it is written `none`, never
omitted — an absent field and an empty field are different, and only one of them shows that the
author considered the question.

### R3 — The inline reference convention

Research prose refers to claims by id. When a status word sits adjacent to the id, the prose is
asserting that status:

```markdown
**Theorem** (CLM-0007) states that ...        asserts THEOREM
Theorem (CLM-0007)                            asserts THEOREM
CLM-0007 (CONJECTURE)                         asserts CONJECTURE
### Lemma (CLM-0011)                          asserts LEMMA
by CLM-0007                                   asserts nothing
as shown in CLM-0007                          asserts nothing
```

A bare id asserts nothing. This is deliberate and it is the convention's most important property:
citing a claim is not promoting it, and a rule that fired on every mention would be so noisy that
projects would turn it off — at which point it would catch nothing at all.

Prose MUST NEVER assert a status higher than the ledger's, and MUST NEVER reference an id the ledger
does not define. Asserting a *lower* status than the ledger is permitted without comment.

### R4 — The ledger and the prose may not disagree

Where the ledger and a document conflict, the ledger is not automatically right — one of them is
wrong and the disagreement is the finding. What is prohibited is leaving them in conflict. In
practice this means the ledger is updated in the same commit as the writing that changes a claim's
standing, and the audit command is what makes that habit mechanical rather than aspirational.

## Additions this standard makes beyond the source

- The entire format: the file location, the `CLM-NNNN` identifier scheme, the field list, the
  `none`-not-omitted rule, and the `external:` reference form. The source requires that certain
  things be tracked and says nothing about how.
- R3's adjacency convention, including the decision that a bare id asserts nothing. This is the
  false-positive control for `claims.silent-promotion`, and it is authored.
- The split in R1 between per-claim tracking here and per-approach tracking in
  [Standard 17](17-open-problems.md).

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) defines the statuses this file records.
[Standards 5](05-domains-and-quantifiers.md), [6](06-assumptions-and-hidden-conjectures.md),
[7](07-proof-obligations.md), [8](08-dependency-traceability.md),
[15](15-equivalent-reformulations.md), [16](16-formal-theorem-proving.md), and
[19](19-evidence-requirements.md) each govern one of its fields.
[Standard 17](17-open-problems.md) holds the per-approach half of R1.

## Implementation

`scripts/claims.mjs` parses the format: `parseLedger` returns the entries and the malformed ones
separately, `findReferences` implements R3's adjacency convention over any Markdown file, and
`dependencyClosure` walks the `Depends` and `Assumptions` fields for
[Standard 8](08-dependency-traceability.md).

Detectors: `claims.ledger-exists`, `claims.ledger-parse-valid`, `claims.inline-label-consistency`.
`templates/claims-ledger.md` is the scaffold `math-standards init` writes.

What the parser does not establish: that the ledger describes the project's actual mathematics. A
claim that exists only in someone's head is invisible to a file-based check, and a `Statement` field
that does not match the theorem as written in the paper is a discrepancy no regex finds. The ledger
makes claims auditable; it does not make them true.
