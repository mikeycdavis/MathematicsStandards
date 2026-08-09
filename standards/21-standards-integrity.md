# Standard 21 — Standards Integrity

Every other standard in this repository can be satisfied by changing the standard. A rule that fails
can be reclassified as not applicable; a check that fires can be deleted; a test that fails can be
relaxed; a prompt that a document contradicts can be edited so it no longer does. None of these
require dishonesty in the ordinary sense — each looks locally like a reasonable engineering decision
made under pressure, and each converts the whole system into a machine for producing green.

Source: item 21 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies to every human and every AI agent operating on a project that has adopted these standards,
and to this repository itself. It is the only standard that governs the standards.

## Requirements

### R1 — The invariant

From the charter:

> A human or AI must never bypass, weaken, remove, reclassify, reinterpret, falsify evidence for, or manipulate a standard, test, applicability determination, evidence requirement, or verification mechanism solely because it prevents the desired implementation or conclusion.

The word carrying the weight is **solely**. Standards are revised, rules are deprecated, tests are
rewritten, and applicability determinations change as projects change — all of that is normal and
none of it is prohibited. What is prohibited is doing any of it *because the standard is in the way of
a conclusion someone wants*. The test is counterfactual and a person can apply it honestly to
themselves: would this change be correct if the rule were currently passing?

The rule id is `integrity.no-self-serving-modification`. It is `forbidden` and `nonExemptible`, so a
violation blocks rather than merely fails.

### R2 — Prohibitions are first-class

From the charter:

"Must never be done" rules are first-class standards.

They must not be buried in documentation.

Where a behavior would invalidate the work, create a dangerous condition, corrupt evidence, produce misleading conclusions, or bypass the integrity of the standards system, represent it explicitly as a prohibition or invariant.

This is discharged by [Standard 20](20-must-never-rules.md): every prohibition has a catalog entry
with an id, a severity, and a governing standard, and none exists only as prose. R2 is what makes R1
enforceable — an invariant that lived in a paragraph could be weakened by editing the paragraph.

### R3 — Do not weaken the work to complete it

From the charter, on this repository:

Do not weaken tests or standards merely to complete implementation.

Stated for the general case: when a check fails during implementation, the permitted responses are to
fix the code, to fix the check if the check is wrong on its own terms, or to stop and report. Deleting
the check, narrowing it until it passes, marking the rule not-applicable, or lowering its level to get
a green run are all R1 violations, and they are the specific form R1 takes during a build.

Reporting a partial result honestly is always permitted and never a violation. "Sixteen standards
written, six remaining, the suite is red on the six" is a legitimate state to be in and to report;
"complete" while any of that is true is not.

### R4 — How this invariant is protected

An invariant that only exists as a sentence is a hope. These are the mechanisms that make violating it
expensive, listed with what each one actually reaches:

| Arm | Protects against | Reach |
| --- | --- | --- |
| `artifacts/provenance-digests.json` + `integrity.provenance-digest` | Editing a source prompt so a standard becomes true | Complete for the two source documents. Any byte change fails CI |
| `artifacts/standards-source-inventory.json` + `scripts/inventory.mjs` | Quietly dropping, adding, or renumbering a standard | Complete. The inventory is committed and never regenerated, so a change must be made deliberately and shows in review |
| `scripts/fidelity.mjs` | Editing a quotation so it supports a claim the source does not | Complete for blocks claimed verbatim. A quotation that no longer appears in the source fails |
| `nonExemptible` + `scripts/policy.mjs` | Waiving a prohibition | Complete. The exception is rejected, and the rejection is itself a failure |
| Contradiction check in `scripts/compliance.mjs` | Attesting past an observed violation | Complete. Evidence outranks assertion; the attestation fails as contradicted |
| Lifecycle fields + `CHANGELOG.md` + SemVer | Removing a rule silently | Partial. A rule leaves only via `deprecatedIn`/`supersededBy`/`removedIn`, a changelog entry, and a MAJOR bump — enforced by review, not by code |
| Mutation checks | A check that cannot actually fail | Partial, and periodic. Each gate is attacked with the defect it exists to catch, and must fail |
| `docs/assurance-report.md` | Overstating what the tooling establishes | Complete for what it covers: the report is generated from the catalog, so it cannot claim coverage the rules do not declare |

### R5 — What is not protected

Every arm above is defeated by someone with commit rights who is willing to change several files at
once. Editing a source prompt and its recorded digest in the same commit passes CI. Removing a rule,
its detector, its test, and its inventory row together passes CI. This standard does not pretend
otherwise, and saying so is itself required: a security claim that overstates its own coverage is the
same error as a mathematical claim that overstates its evidence.

What the mechanisms actually buy is that every such change is **loud** — it touches files that exist
only to be hard to change quietly, and it produces a diff whose purpose is legible to a reviewer. The
residual protection is review, and the residual risk is a determined author with no reviewer. That is
the honest boundary.

### R6 — Recording an integrity concern

An agent or reviewer who believes a change was made to escape a standard MUST record it rather than
resolve it unilaterally: a note in the repository naming the change, the standard it appears to
escape, and why. This is not an accusation mechanism. Most such changes are legitimate and the note is
how that gets established — the alternative, where the concern is felt and not written, leaves nothing
for anyone to check.

## Additions this standard makes beyond the source

- R1's counterfactual test — *would this change be correct if the rule were passing?* The charter
  states the invariant; the operational test for applying it is authored.
- R3's enumeration of permitted responses to a failing check.
- The whole of R4, including the reach column. The charter asks how the invariant can be protected and
  tested; this is the answer, with each arm's limits stated.
- R5 in full. Nothing in the charter requires an admission of what is unprotected; it is here because
  a standard about not overstating things cannot overstate itself.
- R6.

## Relationship to other standards

[Standard 20](20-must-never-rules.md) is what R2 discharges into.
[Standard 19](19-evidence-requirements.md) R6 supplies the attestation properties R4 relies on.
[Standard 1](01-applicability-and-scope.md) R2 defines the applicability mechanism R1 prohibits
abusing. [Standard 22](22-ai-agent-operation.md) R4 defines what an agent does when it encounters a
violation of this standard: it stops.

## Implementation

`integrity.provenance-digest` recomputes the SHA-256 of both source prompts, normalising line endings
first so a Windows checkout and a Linux checkout agree, and compares against the recorded digests.
Assurance `full`, within its scope.

`integrity.rule-lifecycle-honest` has no detector: whether a rule removal was justified is a question
about intent, and the lifecycle fields plus the changelog are what make the removal visible for a
human to judge.

`integrity.no-self-serving-modification` itself is `manual-review` with assurance `none`, and this is
the most important `$assuranceNote` in the catalog. The mechanisms of R4 make specific manipulations
fail; none of them observes motive, and motive is what R1 is about. The rule exists so that the
prohibition has an id — so it can be cited in a refusal, attested against, and counted among the
things automation does not establish rather than quietly assumed to be satisfied.
