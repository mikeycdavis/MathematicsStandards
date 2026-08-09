# Standard 19 — Evidence Requirements

Every other standard eventually reduces to the same question: what would establish this, and did
anyone produce it? This standard defines what an evidence entry is, what kinds there are, what each
kind can support, and the rule that governs the whole system — that the absence of evidence is
reported as absence, never as satisfaction.

Source: item 19 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every evidence entry in the ledger and to every finding the audit command produces.

## Requirements

### R1 — The deliverables this standard belongs to

From the source, implement:

- mathematical standards
- mathematical must-never standards
- evidence requirements
- applicability
- verification where possible
- tests
- documentation
- examples

The phrase *verification where possible* is the one that shapes this standard. It concedes in advance
that some requirements cannot be machine-verified, and the honest consequence is that the system must
be able to say so — which is R4.

### R2 — Evidence types

Every evidence entry declares a type from a closed vocabulary, and each type has a ceiling: the
highest claim rank it can support on its own.

| Type | What it is | Supports up to |
| --- | --- | --- |
| `proof` | A written proof artifact | `THEOREM` |
| `proof-sketch` | An argument with gaps acknowledged | `CONJECTURE` |
| `formal` | A proof-assistant declaration | `MACHINE_CHECKED_PROOF`, subject to [Standard 16](16-formal-theorem-proving.md) |
| `computational` | A systematic check of a stated range | `COMPUTATIONAL_VERIFICATION` |
| `numerical` | Values, samples, floating-point results | `NUMERICAL_OBSERVATION` |
| `counterexample-search` | A search that found nothing, with its scope | `CONJECTURE` |
| `symbolic` | A CAS derivation | `HEURISTIC` until conditions are checked |
| `heuristic` | A probabilistic or analogical argument | `HEURISTIC` |
| `citation` | A result taken from the literature, which is why this claim holds | The status the source establishes |
| `literature-search` | A record of looking for prior work, and what was found | `CONJECTURE` |

A claim's status may not exceed the ceiling of its strongest evidence type. This single table is what
`computation.evidence-as-proof` mechanises, and it is why the evidence vocabulary is closed: an
open-ended type field would let "verification" or "validation" carry whatever ceiling the writer
intended.

The last two rows are separate types for a reason discovered by testing rather than by design. An
earlier version of this catalog had one `citation` type covering both, and a fixture exposed what
that allows: a `THEOREM` supported only by a computation stopped being reported the moment its author
added a note that they had searched MathSciNet, because the search record satisfied the
proof-evidence test. Saying *this theorem is proved in the literature* and saying *I looked for prior
work* are different claims, and only the first carries a proof.

### R3 — Evidence points at something that exists

An evidence entry MUST name an artifact — a path in the repository, a proof-assistant declaration, or
a citation — and a path-shaped reference MUST resolve. Evidence that points at nothing is an
assertion, and the distinction between evidence and assertion is the one this standard exists to
maintain: the practical test is whether someone else could reach the same conclusion without trusting
the claimant.

Citations satisfy the field but are flagged as unverifiable by the tooling, which is accurate — an
offline checker can confirm a DOI is well-formed and nothing more
([Standard 14](14-literature-and-novelty.md)).

### R4 — Unknown is not a pass

A rule that nothing evaluated is reported `skipped` with disposition `not-evaluated`. It MUST NEVER be
reported as passing, and it MUST NEVER count toward a compliance score.

Two consequences follow that are easy to get wrong:

- A `manual-review` rule is `not-evaluated` even when the automated run examined everything and found
  nothing. "No automated finding" is not evidence for a requirement whose evaluator is a human. The
  only thing that moves such a rule off `not-evaluated` is an attestation under R5.
- The compliance score's denominator is the rules actually evaluated, and the framework-coverage
  figure ships beside it. A score computed over everything would climb every time a rule was added
  without a detector, which is precisely backwards.

A clean audit run means *everything that was checked, passed*. It does not mean everything was
checked, and the report is required to make that difference impossible to overlook.

### R5 — Findings are labelled by how they were obtained

Every finding carries one of four labels, reused unchanged from the general framework vocabulary:

| Label | Means |
| --- | --- |
| `OBSERVED` | Read directly from a file or a ledger row |
| `INFERRED` | Produced by a heuristic — a phrase match, a naming pattern, a guess at a quantifier |
| `CONFIRMED_BY_OWNER` | Established by a human attestation |
| `UNKNOWN` | Not established |

A heuristic detection reported as `OBSERVED` is the tool fabricating certainty about its own output,
and it is the same error as presenting numerical evidence as proof — committed by the checker instead
of the mathematician. Every phrase-matching arm of every detector in this framework reports
`INFERRED`.

### R6 — Expert judgement is recorded, not asserted

Where a requirement cannot be machine-verified, it is satisfied by an attestation: a record naming who
reviewed it, when, against which files, and what they found. An attestation is evidence, not a waiver,
and three properties enforce that:

- It cannot override an automated finding. Where a check observed a violation, an attestation saying
  otherwise fails as *contradicted* — evidence outranks assertion, and this is also why an attestation
  cannot reach a non-exemptible rule.
- It records the digest of what was reviewed, and goes stale — back to `not-evaluated`, not to
  failure — when those files change. A review of a proof that has since been rewritten establishes
  nothing about the current proof.
- It can record a *rejection*. "I reviewed this and it is not met" is a first-class outcome, and a
  system that only lets a human record approval is a system that has decided what the human will say.

## Additions this standard makes beyond the source

- The whole of R2, including the type vocabulary and the ceiling column.
- R3's resolvability requirement and the evidence-versus-assertion test.
- R4's two consequences, particularly the treatment of `manual-review` rules, which is the most
  frequently mis-implemented part of any compliance system.
- R5's insistence that heuristics are labelled `INFERRED`.
- R6's three properties of attestations, including rejection as a first-class outcome.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) R4 states the promotion requirements R2's ceilings implement.
[Standard 1](01-applicability-and-scope.md) R3 distinguishes the outcomes R4 depends on.
[Standard 10](10-computational-and-numerical-evidence.md) governs the two computational types.
[Standard 16](16-formal-theorem-proving.md) governs the `formal` type.
[Standard 21](21-standards-integrity.md) prohibits falsifying evidence or manipulating an evidence
requirement, which is this standard's contents treated as an attack surface.
[Standard 22](22-ai-agent-operation.md) requires an agent to be able to conclude *insufficient
evidence*, which is R4 from the agent's side.

## Implementation

Detectors: `evidence.type-vocabulary` and `evidence.artifact-linked` (both `full` assurance — they are
exact over what the ledger says), `evidence.equivalence-direction-proved`, `evidence.labels`, and
`evidence.skipped-never-passed`, which is unusual in that it is a check on the tooling rather than on
the project: it asserts that no result in the envelope carries `passed` with disposition
`not-evaluated`.

`scripts/compliance.mjs` implements R4 and R6 directly, and `scripts/assurance.mjs` renders the
consequence as `docs/assurance-report.md`, partitioning every rule by what its automation actually
establishes. That report is the answer to the source's closing requirement, and it is generated from
the same JSON the validator consumes so the two cannot drift.

The honest summary of this standard's own limits: it governs the *shape* of evidence, not its
sufficiency. `evidence.artifact-linked` confirms that a file exists at the path a `THEOREM` cites. What
is in that file, and whether it proves the statement, is outside the reach of every check here.
