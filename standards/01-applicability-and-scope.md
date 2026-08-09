# Standard 1 — Applicability and Scope

A standard that applies to everything applies to nothing. Mathematical work comes in regimes that
fail differently: an informal argument fails by hand-waving, a computation fails by exhausting a
finite range and calling it a proof, a formalization fails by compiling around a `sorry`. This
standard says which regimes a project is in, so the rest of the standards know what they are looking
at — and so the difference between *this rule does not apply here* and *nobody checked this rule*
stays visible.

Source: item 1 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every project that adopts these standards, before any other standard is evaluated.

## Requirements

### R1 — The regimes

Reproduced verbatim from the source:

- informal mathematics
- computational mathematics
- formal mathematics
- theorem-proving projects
- research toward open problems

A project MUST declare which of these describe it. The declaration lives in `project-policy.yml`
under `mathematics.regimes`, and it is a claim about the project, not about the standards: it stops
being true the moment the project acquires the capability it disclaimed.

The regimes are not exclusive and most real projects hold more than one. A paper with a Lean
formalization of its main lemma and a Python search over the first 10⁹ cases is informal,
computational, and formal at once, and each regime's rules apply to the part of the work it governs.

### R2 — Not-applicable is a claim about the project

A rule may be declared not applicable in `project-policy.yml`, with a reason and a `revisitWhen`
condition. The condition is the point. "This project has no proof assistant" is true until someone
adds a `.lean` file, and the classification MUST name the event that ends it:

```yaml
applicability:
  formal.trusted-chain-tracked:
    status: not-applicable
    reason: This project contains no proof-assistant sources.
    revisitWhen: A .lean, .v, or .thy file is added to the repository.
```

A not-applicable classification with no `revisitWhen` is a permanent exemption wearing a temporary
label, and `math-standards policy` rejects it (`policy.missing-revisit-condition`). The check lives
there rather than in the schema because the requirement is conditional on `status`, and the schema
evaluator implements no conditional keywords — a deliberate limit, since a validator that silently
ignored a keyword it did not understand would be worse than one that refuses it.

### R3 — Not applicable and not evaluated are different answers

Four outcomes are distinguishable, and collapsing any two of them is how a report becomes a lie:

| Outcome | Means |
| --- | --- |
| compliant | The rule was evaluated and nothing violated it |
| non-compliant | The rule was evaluated and something violated it |
| not applicable | The rule's subject does not exist in this project |
| not evaluated | Nobody looked, or the looking cannot be done by a machine |

A rule that nothing evaluated is reported `skipped` with disposition `not-evaluated`. It MUST NEVER
be reported as passing. A clean audit run says *everything that was checked, passed* — it does not
say *everything was checked*, and the `frameworkCoverage` figure that ships beside every verdict
exists so the two cannot be confused.

There is a fifth outcome, `blocked by invariant`, which belongs to
[Standard 21](21-standards-integrity.md) and [Standard 22](22-ai-agent-operation.md) rather than
here.

### R4 — Applicability is evaluated per rule, not per standard

A standard is prose; a rule is the machine-checkable unit. [Standard 10](10-computational-and-numerical-evidence.md)
applies to a project the moment it has any computational evidence, but its individual rules can be
classified separately — a project may genuinely have no floating-point arithmetic while having
plenty of exact integer computation. Applicability therefore attaches to rule ids, never to standard
numbers.

## Additions this standard makes beyond the source

- The whole of R2. The source lists the regimes; it does not say how a project declares which apply,
  and says nothing about revisit conditions. The `revisitWhen` requirement is authored, and comes
  from the observation that an untimed exemption never expires on its own.
- R3's four-outcome table and the rule that not-evaluated never reads as passed. The source's
  closing requirement — report what can be prevented and what still requires expert judgment —
  presupposes this distinction without stating it.
- R4's per-rule granularity.

## Relationship to other standards

[Standard 19](19-evidence-requirements.md) defines what evidence an evaluated rule needs.
[Standard 21](21-standards-integrity.md) prohibits reclassifying a rule as not-applicable in order to
escape it — the mechanism in R2 is exactly the mechanism that standard guards.
[Standard 22](22-ai-agent-operation.md) requires an agent to be able to conclude *not applicable* and
*not evaluated* as first-class answers, which is why they are distinguished here.

## Implementation

`project-policy.yml` carries the `mathematics.regimes` declaration and the `applicability` block;
`schemas/project-policy.schema.json` enforces their shape, including the presence of `reason` and
`revisitWhen`. `scripts/compliance.mjs` implements R3: a rule absent from the evaluator's examined
set lands on `skipped`/`not-evaluated`, and a `manual-review` rule lands there even when the
evaluator examined it, because no automated run establishes a requirement whose evaluator is a human.

The rule `evidence.applicability-declared` observes whether the declaration exists. It cannot observe
whether it is honest — a project that declares no formal regime while carrying Lean files is caught
by `formal.status-declared`, but a project that simply describes itself wrongly is not.
