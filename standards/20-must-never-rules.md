# Standard 20 — Must-Never Rules

A prohibition buried in a paragraph is advice. This standard is the consolidated home of every
must-never rule in the framework: each one has a catalog entry, a rule id, a severity, and a place in
the verdict, so that violating one is a machine-visible event rather than a matter of interpretation.
Every rule here is `forbidden` and `nonExemptible` — the policy engine rejects any waiver written
against one, and an observed violation produces `BLOCKED_BY_INVARIANT` rather than ordinary
non-compliance.

Source: item 20 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every project in every regime. Prohibitions are not subject to applicability tailoring in
the way requirements are: a project may declare that it has no proof-assistant sources and therefore
that `formal.trusted-chain-tracked` does not apply, but no project declares itself exempt from *not
overstating what it has proved*.

## Requirements

### R1 — The prohibitions

Never do the following.

Reproduced verbatim from the source:

- present numerical evidence as deductive proof
- infer a universal/infinite theorem solely from finitely many checked cases
- hide an unproved assumption
- use the target theorem as an intermediate assumption in its own proof
- present an equivalent reformulation as progress merely because it looks different
- call a conditional theorem unconditional
- silently strengthen a theorem
- silently weaken hypotheses
- ignore domain restrictions
- divide by a quantity without establishing the required nonzero condition
- interchange limits, sums, derivatives, or integrals without required justification
- claim machine verification when unproved placeholders remain in the relevant dependency chain
- claim a formal theorem proves more than its actual statement
- treat floating-point output as exact mathematics
- fabricate citations or known results
- claim novelty without checking prior work when novelty matters
- hide counterexamples
- discard failed experiments that undermine a hypothesis
- cherry-pick computational results
- describe a restatement of the central conjecture as a solution
- call a proof complete when unresolved obligations remain
- move the unresolved difficulty into a newly defined lemma and then claim progress because the main theorem follows from that lemma

### R2 — Each prohibition has exactly one rule

| # | Prohibition | Rule id | Governing standard | Detected |
| --- | --- | --- | --- | --- |
| 1 | numerical evidence as deductive proof | `computation.evidence-as-proof` | [10](10-computational-and-numerical-evidence.md) | partial |
| 2 | universal theorem from finitely many cases | `computation.finite-case-generalization` | [11](11-finite-and-infinite-reasoning.md) | partial |
| 3 | hide an unproved assumption | `rigor.hidden-assumption` | [6](06-assumptions-and-hidden-conjectures.md) | no |
| 4 | target theorem as its own assumption | `proof.circular-dependency` | [8](08-dependency-traceability.md) | partial |
| 5 | reformulation presented as progress | `claims.reformulation-as-progress` | [15](15-equivalent-reformulations.md) | no |
| 6 | conditional theorem called unconditional | `claims.conditional-as-unconditional` | [2](02-claim-hierarchy.md) | partial |
| 7 | silently strengthen a theorem | `claims.silent-strengthening` | [5](05-domains-and-quantifiers.md) | no |
| 8 | silently weaken hypotheses | `claims.silent-weakening` | [5](05-domains-and-quantifiers.md) | no |
| 9 | ignore domain restrictions | `rigor.domain-restrictions-ignored` | [5](05-domains-and-quantifiers.md) | no |
| 10 | divide without the nonzero condition | `rigor.unjustified-division` | [13](13-symbolic-manipulation.md) | no |
| 11 | unjustified interchange | `rigor.unjustified-interchange` | [13](13-symbolic-manipulation.md) | no |
| 12 | machine verification with placeholders in the chain | `formal.placeholder-in-chain` | [16](16-formal-theorem-proving.md) | partial |
| 13 | formal theorem claimed to prove more than it states | `formal.statement-overclaim` | [16](16-formal-theorem-proving.md) | no |
| 14 | floating point as exact mathematics | `computation.float-as-exact` | [10](10-computational-and-numerical-evidence.md) | partial |
| 15 | fabricate citations or known results | `literature.fabricated-citation` | [14](14-literature-and-novelty.md) | no |
| 16 | novelty without checking prior work | `literature.unchecked-novelty` | [14](14-literature-and-novelty.md) | partial |
| 17 | hide counterexamples | `evidence.hidden-counterexample` | [9](09-edge-cases-and-counterexamples.md) | no |
| 18 | discard failed experiments | `evidence.discarded-failures` | [18](18-research-lifecycle.md) | no |
| 19 | cherry-pick computational results | `computation.cherry-picking` | [10](10-computational-and-numerical-evidence.md) | no |
| 20 | restatement described as a solution | `problems.restatement-as-solution` | [17](17-open-problems.md) | no |
| 21 | proof called complete with open obligations | `proof.complete-with-open-obligations` | [7](07-proof-obligations.md) | partial |
| 22 | difficulty moved into a new lemma, called progress | `proof.difficulty-displacement` | [7](07-proof-obligations.md) | no |

Two further prohibitions come from the claim hierarchy rather than this list. "A claim must never
silently move upward in this hierarchy" ([Standard 2](02-claim-hierarchy.md) R2) is
`claims.silent-promotion` and `claims.status-exceeds-support`. The four never-equate rules of
[Standard 16](16-formal-theorem-proving.md) R1 are `formal.parse-as-proof`, `formal.compile-as-proof`,
`formal.helper-as-target`, and `formal.placeholder-in-chain`.

The `Detected` column says whether automation contributes at all, and it is deliberately blunt:
fourteen of the twenty-two are `no`. That is not a gap to be closed by better engineering. Whether a
division needed a non-zero condition, whether a citation says what it is cited for, whether a
counterexample was suppressed, and whether a difficulty merely moved are mathematical judgements, and
a checker claiming to make them would itself be overstating what it had established.

### R3 — Additional anti-patterns

The source instructs:

> Add additional mathematical anti-patterns where appropriate.

Eight are added. Each is `forbidden` and each earns its place by being a distinct failure rather than
a restatement of one above.

| Anti-pattern | Rule id | Why it is separate |
| --- | --- | --- |
| WLOG that loses generality | `rigor.wlog-abuse` | The idiom launders an unproved symmetry past reviewers; the dropped case is not equivalent to the kept one |
| Almost-all treated as all | `rigor.almost-all-as-all` | The underlying theorem is entirely correct — the exceptional set is exactly what it declined to control |
| One symbol, two meanings | `rigor.notation-equivocation` | Each step is valid under some reading and no single reading validates all of them; endemic in machine-generated proofs |
| "Clearly" concealing an obligation | `proof.unjustified-triviality` | The prose dual of hiding an assumption: nothing false is stated, and a real obligation is skipped |
| Existence presented as construction | `proof.existence-as-construction` | A nonconstructive proof does not exhibit the object, and downstream work often needs the object |
| Induction with a missing base or non-uniform step | `proof.induction-gaps` | The "all horses are the same colour" shape: the step fails at small n and nowhere else |
| CAS output trusted without conditions | `computation.cas-output-trust` | Simplification assumes genericity, chooses branches, and discards measure-zero cases without reporting any of it |
| Citing a real paper for a stronger statement | `literature.citation-statement-drift` | More dangerous than fabrication because every mechanical check passes |

### R4 — What being a prohibition means mechanically

Three properties, each enforced in code rather than by convention:

- **No exception.** An exception written against a rule that is `forbidden` and `nonExemptible` is
  *rejected* rather than applied, and the rejection is itself a failure. A prohibition a policy could
  waive is not a prohibition.
- **No attestation override.** A human attestation that contradicts an observed violation fails as
  contradicted. Evidence outranks assertion.
- **A distinct verdict.** An observed violation produces `BLOCKED_BY_INVARIANT`, which outranks
  `NON_COMPLIANT` and carries the blocking rule ids in the envelope. The distinction is meaningful in
  this domain: a missing counterexample search makes a project non-compliant and work may reasonably
  continue, while claiming a theorem is machine-checked when its dependency chain contains a `sorry`
  is an integrity failure that must stop the work ([Standard 22](22-ai-agent-operation.md) R4).

### R5 — Undetected does not mean unenforced

A prohibition with no detector is not decoration. It has a rule id, so it can be cited in review, in an
attestation, and in a refusal; it appears in `docs/assurance-report.md` under what requires expert
judgement; and it is `not-evaluated` in every run rather than silently passing. The difference between
a prohibition nobody can check and a prohibition nobody has written down is the difference between a
known limit and an unknown one.

## Additions this standard makes beyond the source

- R2's mapping table, which is the artifact that makes the source's list auditable one-to-one rather
  than a prose passage somebody has to compare by hand.
- All eight anti-patterns in R3, which the source explicitly invites, together with the justification
  for each being separate rather than a special case of an existing prohibition.
- R4's three mechanical properties and the `BLOCKED_BY_INVARIANT` verdict.
- R5.

## Relationship to other standards

Every prohibition's governing standard is named in R2. [Standard 19](19-evidence-requirements.md)
supplies the attestation mechanism R4 constrains. [Standard 21](21-standards-integrity.md) prohibits
weakening or reclassifying anything in this standard, which is what makes R4's guarantees stable.
[Standard 22](22-ai-agent-operation.md) R4 defines what an agent must do when one of these fires.

## Implementation

The rules live across `rules/claims.json`, `rules/rigor.json`, `rules/proof.json`,
`rules/computation.json`, `rules/literature.json`, `rules/formal.json`, `rules/problems.json`, and
`rules/evidence.json` — grouped by subject rather than by prohibition, so that a reader of
[Standard 10](10-computational-and-numerical-evidence.md) finds `computation.evidence-as-proof` where
they would look for it. This standard is the index, not the storage.

`isInvariant(rule)` in `scripts/compliance.mjs` is the single definition of "prohibition": `forbidden`
and `nonExemptible` together. Keeping it in one function is what stops the catalog, the verdict, and
this document from drifting into three different answers.
