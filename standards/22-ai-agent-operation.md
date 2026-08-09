# Standard 22 — AI Agent Operation

These standards will be applied more often by agents than by people, which changes what they have to
provide. A human reviewer can hold "this looks like progress but I am not sure" as a state; an agent
asked to produce a conclusion will produce one. This standard defines the workflow an agent follows,
the conclusions it is permitted to reach — including the ones that mean *no* — and the duty to stop.

Source: item 22 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to any AI agent operating on a project that has adopted these standards, and to the CLI
surface that has to make such operation possible.

## Requirements

### R1 — The capabilities the system must provide

The system must be designed so an AI can do the following.

Reproduced verbatim from the source:

- initialize the standards against a target project
- determine applicable standards
- explain why standards apply
- gather or request evidence
- evaluate compliance
- identify violations
- identify prohibitions
- refuse or stop work that would violate an invariant
- recommend remediation
- update evaluations when relevant project state changes

Each maps to something concrete:

| Capability | How |
| --- | --- |
| initialize | `math-standards init <dir>`, with a dry run that enumerates exactly what the apply writes |
| determine applicable standards | `validate` reads `project-policy.yml`; every result carries its disposition |
| explain why | `math-standards explain <rule-id>` — the rule's metadata, its standard, its assurance note, and its disposition under the current policy |
| gather or request evidence | The `Evidence` field of the ledger, and the attestation mechanism where a human must supply it |
| evaluate compliance | `validate`, producing the envelope |
| identify violations | Findings, each with a rule id, a `standardRef`, an evidence label, and a message |
| identify prohibitions | `level: "forbidden"` in the catalog; `blockedBy` in the envelope |
| refuse or stop | R4 |
| recommend remediation | Every catalog rule carries a `remediation` string, returned with the finding |
| update on state change | Re-run; and attestation digests go stale automatically when reviewed files change |

### R2 — The permitted conclusions

The AI must be able to conclude the following.

Reproduced verbatim from the source:

- compliant
- non-compliant
- not applicable
- insufficient evidence / not evaluated
- blocked by invariant

These map onto the machinery exactly, and an agent MUST use the one that fits rather than the one that
is easiest to act on:

| Conclusion | Where it comes from | What it means for the work |
| --- | --- | --- |
| compliant | `COMPLIANT` / `COMPLIANT_WITH_EXCEPTIONS` | Proceed |
| non-compliant | `NON_COMPLIANT` | Remediate; proceeding may be reasonable with the failure recorded |
| not applicable | Result disposition `not-applicable` | The rule has no subject here; the `revisitWhen` condition is live |
| insufficient evidence / not evaluated | Result disposition `not-evaluated` | **Nobody looked.** Not a pass. Gather the evidence or request the attestation |
| blocked by invariant | `BLOCKED_BY_INVARIANT` | Stop |

### R3 — Never forced to a positive recommendation

From the source:

It must never be forced to produce a positive recommendation.

An agent MUST be able to end its work with "this is not proved", "the evidence is insufficient", "this
approach is terminated and the reopening condition is not met", or "I cannot establish this". None of
these is a failure of the agent, and a workflow that treats them as one has selected for an agent that
overstates.

The same duty applies inside the mathematics. An agent that cannot prove a claim records it at the
rank the evidence supports. Promoting a `CONJECTURE` to `THEOREM` because a summary needs a result is
[Standard 2](02-claim-hierarchy.md) R2's prohibition, and doing it because the task said "prove X" is
[Standard 21](21-standards-integrity.md) R1's: it is manipulating the record because the honest answer
prevents the desired conclusion.

### R4 — The duty to stop

On `BLOCKED_BY_INVARIANT`, an agent MUST stop and report. It MUST NOT:

- edit the ledger, the policy, the catalog, or a detector so that the block clears;
- reclassify the offending rule as not applicable;
- write an exception or an attestation against it;
- proceed on the grounds that the blocked item is peripheral to the current task.

The permitted responses are exactly two: fix the underlying condition — remove the `sorry`, demote the
claim, discharge the obligation — or stop and report what is blocking, citing the rule ids in
`blockedBy`.

This is why the verdict is separate from `NON_COMPLIANT`. Non-compliance is a state a project can
knowingly occupy while work continues; an invariant violation means a claim in the record is untrue in
a way that invalidates the work resting on it, and continuing produces more work resting on it.

### R5 — Explaining, not just reporting

When an agent reports a finding it MUST be able to say why the rule applies here, which is what
`explain` is for. "Rule `formal.placeholder-in-chain` failed" is a report; "CLM-0009 claims
`MACHINE_CHECKED_PROOF` and cites `formal/Main.lean#gap_theorem`, which contains `sorry` at line 88, so
the claim is not machine-certified — either remove the placeholder or demote the claim to
`FORMALIZED_THEOREM`" is an explanation. Every finding carries the rule id, the standard reference, the
evidence, and the remediation string that make the second form possible; producing it is the agent's
obligation.

### R6 — Re-evaluate when state changes

An evaluation is a statement about a repository at a moment. An agent MUST re-run rather than reuse a
prior verdict after changing any file the verdict depended on, and MUST treat a stale attestation as
`not-evaluated` rather than as its last recorded value — which the compliance engine does
automatically, by comparing digests.

## Additions this standard makes beyond the source

- R1's capability-to-mechanism table, including the decision that `explain` is a first-class command
  rather than something an agent reconstructs from the catalog by itself.
- R2's mapping of the five conclusions onto verdicts and dispositions, and the "what it means for the
  work" column.
- R4 in full: the enumerated prohibited responses and the two permitted ones. The charter requires an
  agent to be *able* to refuse; the duty to refuse, and the list of the specific evasions available to
  a capable agent, are authored.
- R5 and R6.

## Relationship to other standards

[Standard 1](01-applicability-and-scope.md) R3 defines the outcome vocabulary R2 uses.
[Standard 19](19-evidence-requirements.md) R4 is the *not evaluated* conclusion.
[Standard 20](20-must-never-rules.md) R4 defines what makes a rule blocking.
[Standard 21](21-standards-integrity.md) is what R3 and R4 protect: nearly every evasion in R4's list
is a self-serving modification.

## Implementation

`scripts/compliance.mjs` produces the five verdicts and the `blockedBy` array. Every finding carries
`rule`, `standardRef`, `evidence`, and the catalog's `remediation`; `agent.explainable-findings` is the
rule asserting that, and it is checked by the output-contract test — one of the few rules here with
`full` assurance, because it is a property of this tool's own output rather than of anyone's
mathematics.

`templates/AGENTS.md`, written into an adopting project by `init`, carries R2's conclusion vocabulary
and R4's duty in the form an agent reads at the start of a session.

`agent.refusal-on-invariant` is `manual-review` with assurance `none`. Nothing in a repository records
whether an agent stopped when it should have — the evidence of compliance is an absence of work, and
absences are not observable. What the framework provides is the unambiguous signal to stop, the
enumerated list of evasions so that taking one is a named violation rather than an improvisation, and
a verdict that cannot be cleared by any of them.
