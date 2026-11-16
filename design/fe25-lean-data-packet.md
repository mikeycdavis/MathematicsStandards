# FE-25 Lean data packet: what the owner must supply

**Status: DRAFT, awaiting owner input.** This packet specifies data. It contains none. Companion to `design/fe25-split-subject-applicability.md`.

## Why this exists

The approved C2 for #56 names the four Lean cases (`proof.edge-cases-addressed`, `proof.unjustified-triviality`, `proof.induction-gaps`, `rigor.symbolic-validity-conditions`) as the initial fixture, reporting applicable portions instead of a blanket `not-applicable`. A stand-in does not satisfy that criterion. The fixture `test/fixtures/split-subject-lean/` stays BLOCKED until this packet is filled.

The repository records only the shape of the case (`design/v1.1-candidates.md` section 0k, `artifacts/adoption/two-adopters.md` N4): PvsNP classified 29 manual rules as applicable 24, not-applicable 1, unclear 4; the four split because the failure mode is impossible inside the formal development and possible in the prose around it. Real PvsNP data is unavailable under the current repository-scope rule: the PvsNP policy, its layout, its paths and its per-rule reasoning are not in this repository, and nothing here invents them.

## Where the owner puts it

`F:\GitHub Evidence\MathematicsStandards\evidence-56\lean-data\lean-data.md`, filled from the template below. (The folder already holds `README.md`, `ac-gap-check\`, `decisions\`, `issue-body.snapshot.md` and `manifest.json`; `lean-data\` is new.) If the owner prefers a different file name, only the path in this packet changes.

## Template to fill

```markdown
# Lean data for #56

Source of the data: <the adopter repository and the commit it was read at>
Supplied by: <name>   Date: <YYYY-MM-DD>

## Portions
| id (kebab-case) | what it is | where it lives (repository-relative path) |
|---|---|---|
| <e.g. the formal development> | <one line> | <path or directory> |
| <e.g. the prose record> | <one line> | <path or directory> |

## Rules
For each of the four rules, one block.

### proof.edge-cases-addressed
declaredSubject: <portion ids, one per line>
appliesTo:
- subject: <portion id>
  statement: <why the failure mode can occur here>
  reference: <optional path, URL or commit>
structurallyImpossibleFor:
- subject: <portion id>
  statement: <why the failure mode cannot occur here>
  reference: <optional path, URL or commit>
revisitWhen: <the event that would change this classification>

### proof.unjustified-triviality
(same fields)

### proof.induction-gaps
(same fields)

### rigor.symbolic-validity-conditions
(same fields)

## Material to build the fixture from
- A small formal file that is genuinely in the formal portion: <path or the owner's permission to write a minimal one>
- A small prose file that is genuinely in the prose portion: <path or the owner's permission to write a minimal one>
- Whether real adopter files may be copied into the repository, or only minimal stand-ins: <copy | stand-in>
```

## What each item feeds

| Item | Feeds |
|---|---|
| Portion ids and paths | `declaredSubject` and every `subject` in each of the four rules in `split-subject-lean/project-policy.yml`; the file layout of the fixture |
| Per rule `appliesTo` statement and reference | the `basis` of each `appliesTo` entry for that rule, so the report shows the adopter's own reasoning |
| Per rule `structurallyImpossibleFor` statement and reference | the `basis` of each `structurallyImpossibleFor` entry for that rule |
| `revisitWhen` per rule | the required `revisitWhen` on that rule's declaration (a split without one is invalid) |
| Formal and prose material | the files the `reference` fields point at, so `reference-unresolved` does not fire, and the content the report is run against |
| Copy or stand-in answer | whether the fixture reproduces adopter files or minimal equivalents; the fixture's header comment says which |
| Source commit | the provenance line in the fixture and in test T19 |

Per-fixture use:

- `split-subject-lean` (the C2 fixture) takes all of it.
- Test T19, the only test that exercises C2, reads `split-subject-lean` and asserts that each of the four rules reports its evaluated and structurally impossible portions and none is `not-applicable`.
- The mechanism stand-ins `split-subject-standin` and `split-subject-standin-attested` need none of it and stay labelled mechanism-only.
- The negative fixtures need none of it.

## What the owner is not asked for

No mathematics, no assessment of whether any rule is met, and no attestation. Only the classification of portions that the adopter has already made, with its stated reasons.

## Not done here

Nothing in this packet is filled. No portion name, path, statement or reference was taken from outside the repository or guessed.
