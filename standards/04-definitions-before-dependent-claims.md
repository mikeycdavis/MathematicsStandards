# Standard 4 — Definitions Before Dependent Claims

An undefined term does not make a claim false. It makes it unevaluable, which is worse, because a
false claim can be refuted and an unevaluable one can be defended indefinitely. "Every sufficiently
regular sequence has the gap property" cannot be checked, proved, or disproved until *regular* and
*gap property* are pinned down, and the temptation is to pin them down afterwards, to whatever makes
the claim come out true.

Source: item 4 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every claim in every regime, and to every term appearing in a claim's `Statement` that is
not standard usage in the field the project writes for.

## Requirements

### R1 — Define before depending

From the source, the standards must cover:

- definitions before dependent claims

Every term a claim's statement relies on MUST be defined before the claim is stated. A term is
defined when one of the following holds:

- it has a `DEFINITION` entry in the claims ledger, and the dependent claim names that entry in its
  `Depends` field;
- it is cited to the literature as an `external:` reference, with the citation naming where the
  definition is given;
- it is standard usage in the project's field, unambiguous, and used with its ordinary meaning.

The third route is the one that gets abused. It exists because a paper on analytic number theory
should not have to define *prime*. It stops applying the moment a term is being used in a way a
reader of the field would not predict — at which point the term needs its own entry, whatever it is
called elsewhere.

### R2 — A definition is stipulated, not proved

Definitions sit at rank 0 in [Standard 2](02-claim-hierarchy.md) R3 and cannot be promoted. They can,
however, carry proof obligations, and frequently do:

- **Existence** — the definition names an object; something must show one exists.
- **Uniqueness** — the definition says *the* object; something must show there is only one.
- **Well-definedness** — the definition is given by a formula, a representative, or a limit; something
  must show the result does not depend on the choice made.
- **Non-vacuity** — the defined class must be shown non-empty where the point of the definition is
  that things are in it.

These are recorded in the definition's `Obligations` field under
[Standard 7](07-proof-obligations.md). An unmet obligation on a definition propagates: every claim
that depends on the definition inherits it, and a `THEOREM` resting on an object not yet shown to
exist is conditional whether or not anyone said so.

### R3 — Definitions do not change under claims that depend on them

Sharpening a definition after results have been stated on it silently changes those results. If a
definition is revised, every claim depending on it MUST be re-examined, and the ledger MUST record
either that the claim survives unchanged or that its status has moved. Revising a definition so that
a claim becomes true, and leaving the claim's status alone, is the prohibition
[Standard 20](20-must-never-rules.md) records as silently strengthening a theorem — carried out from
the other end.

### R4 — One term, one meaning

Within a project, a symbol or term has one meaning. Where a field genuinely overloads notation — `⊂`
for both strict and non-strict inclusion, `n` as both an index and a bound — the project picks one
reading and says so in the definition. Arguments that are individually valid under two different
readings, and invalid under either one consistently, are a real failure mode and a common one in
machine-generated proofs; the prohibition is `rigor.notation-equivocation`.

## Additions this standard makes beyond the source

- Essentially all of it. The source supplies one bullet. R1's three routes to "defined", R2's
  catalogue of definitional proof obligations, R3's revision rule, and R4's one-meaning rule are
  authored, and each comes from a specific way undefined or shifting terms let a claim escape
  scrutiny.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) places definitions at rank 0.
[Standard 5](05-domains-and-quantifiers.md) governs the domain a defined term ranges over.
[Standard 7](07-proof-obligations.md) is where R2's obligations are recorded.
[Standard 14](14-literature-and-novelty.md) governs the citations R1's second route relies on.
[Standard 20](20-must-never-rules.md) holds the prohibitions in R3 and R4.

## Implementation

The detector `claims.definitions-first` checks the mechanical part: that every id in a claim's
`Depends` field resolves, and that any resolved entry with status `DEFINITION` appears in the ledger
before the claims that depend on it. `rigor.notation-equivocation` and the definitional-obligation
requirements of R2 have no detector and are `manual-review`.

This is one of the standards where automation contributes least. Whether a term is genuinely standard
usage, whether a definition quietly changed meaning between drafts, and whether two occurrences of a
symbol mean the same thing are all judgements about mathematical content, and none of them is visible
to a parser. What the tooling supplies is the place to record the answer and the reviewer's prompt to
ask the question.
