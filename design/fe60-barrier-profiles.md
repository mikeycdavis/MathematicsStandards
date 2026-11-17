# FE-29 design record: barrier profiles

**Status: DRAFT, awaiting owner freeze (2026-11-16).** Implementation is not authorized until the owner freezes this record. No code, schema, rule, fixture, `VERSION` or `CHANGELOG` file is changed by the pull request that carries it; every fragment, fixture and test below is proposed text.
**Authority:** the owner's finalized criteria for #60 (`finalized-criteria-2026-11-16.md`, C0 to C3), quoted in the criterion map, and the owner's binding decision of 2026-11-16: this is a design-only record for structured barrier profiles, and a barrier records scope, exclusions, non-exclusions and evidence and **never becomes a prohibition verdict**. This record adds no acceptance criterion.
**Evidence base:** the gap-check report for #60 (`evidence-60/ac-gap-check/report.md`, taken at main 14562f6) and the live repository at main 3475ec4 (which adds only design records after 14562f6; the code the report read is unchanged).

## Scope

One issue, #60 (FE-29). It is the A4 row of `design/v1.1-disposition.md` ("A barrier is a profile, not a verdict"), which records the need and says "No design". It shares no schema, file or rule with FE-27 (`problems.blocker-named`) or FE-28 (`lifecycle.attempt-gates-valid`), though it reuses FE-28's evidence-reference predicate (`hasReference`, `scripts/attempts.mjs`). #55 to #57 stay in their own records.

## Binding model

A barrier profile is a record of a result about a class of arguments. It has exactly five parts, from C1:

1. **Identity and statement.** The barrier's name (the `###` heading) and what it says.
2. **Scope.** The class of arguments and the setting the statement is about, with its conditions.
3. **Rules out.** What the barrier excludes, within that scope.
4. **Does not rule out.** What the barrier does not exclude. C2's NEXP-not-in-ACC0 case lives here.
5. **Evidence or reference.** A stated reference to where the barrier is established.

Invariants (this record's, each traceable to C0 to C3 or to the owner decision):

1. A profile is descriptive evidence. Nothing in the framework derives, returns, accepts or stores a verdict from a profile. No field, label, finding or report line says an approach is prohibited, forbidden, closed or allowed because of a barrier (C3).
2. The framework fixes no barrier names, no list of barriers and no mathematics. A barrier is whatever name the project gives it, as with FE-28 gate names. The framework checks structure only.
3. A blank is not an answer (repository convention, `scripts/standards.mjs`). Missing, empty or unstructured content is reported and never read as "none". `none` written deliberately is an answer only where stated below.
4. Fail closed. A profile that cannot be read as a profile is reported. It is never silently treated as valid, and never reported as a pass.
5. A profile does not touch any other rule. Adding a valid profile changes no other finding and no score (test T10).

## Where it lives: the fail-closed choice

**Chosen: a `###` profile per barrier under the existing `## Known Barriers` section of `artifacts/open-problems/<slug>/problem.md`.** Listed as choice 1 for the owner.

Reasons, in order of weight:

- **A barrier is a fact about the problem, not about one attempt.** The problem record is the one place every attempt and every reader looks. An attempt-owned profile (`attempt.md`) would be invisible to a reader of the problem and would exist once per attempt, so the same barrier would be restated, and could disagree, across attempts.
- **The section already exists, is already required, and is already read** (`PROBLEM_SECTIONS`, `problems.barriers-recorded`). Putting profiles there adds no new place for a barrier to be forgotten, which a separate file would.
- **Fail-closed reading is cheap here.** `problem.md` is read by the same `## ` heading convention as every other section, and the `Status:`/`Evidence required to reopen:` line-field style under Terminated Approaches is the precedent for `###` records.
- **Not policy YAML.** The policy reader (`scripts/yaml.mjs`) is for policy only, and every YAML construct outside its subset is a hard error. A barrier's statement and scope are prose; they would need block scalars (`|`), and the policy schema would have to grow a barrier vocabulary. Nothing in the policy schema changes under the chosen design (see "Verification performed").

Alternatives considered and not chosen: a separate `artifacts/barriers/<id>.md` (a new surface, new subject wiring, and a second place a barrier can be missing); the attempt (above); the claims ledger (a barrier is not a claim, and the ledger's status ranks would invite exactly the verdict reading C3 forbids).

## Syntax (exact)

A `## Known Barriers` body is exactly one of:

1. **One or more profiles.** Each profile is a `### <barrier name>` heading followed by field lines. Text before the first `###` is ignored.
2. **An explicit none.** No `###` heading, and the first non-blank line begins with the word `none` (case-insensitive), optionally followed by an explanation. Existing records that say `None recorded.` stay valid.

Everything else is reported by the new rule: prose with no profile and no `none`. An absent or empty section is reported by the existing `problems.barriers-recorded` only; the new rule does not repeat it.

**Fields.** Exactly five, labels matched case-insensitively, each a line starting at column 0 as `Label: value`:

| Label | Content | May be `none`? |
|---|---|---|
| `Statement:` | what the barrier says, with its conditions | no |
| `Scope:` | the class of arguments and the setting it speaks about | no |
| `Rules out:` | what it rules out within that scope | yes, deliberately |
| `Does not rule out:` | what it does not rule out | yes, deliberately |
| `Evidence:` | a stated reference; a citation may accompany it | no |

- **Values.** A value is the text after the colon plus any continuation lines. A continuation line is indented, or is a list item (`-`, `*`, `+`, `1.`, `1)`). Blank lines inside a value are allowed. For `Rules out:` and `Does not rule out:`, list items are the items; with no list, the value is one item. Order of fields, and order of profiles and of items, carries no meaning and is never read.
- **Evidence is a stated reference.** It must satisfy the FE-28 predicate `hasReference` (an `http://` or `https://` URL, a path-shaped token, or `commit <sha>` with 7 to 40 hex digits). A bare citation (`Baker, Gill and Solovay, 1975`) does not count; it may accompany a reference. The reference is **not resolved**.
- **Reported, each as one entry of the rule's evidence list:** a missing or empty field; a repeated field; a field label outside the five; `none` as `Statement:` or `Scope:`; an `Evidence:` with no reference (including `none`); a non-blank line at column 0 that is not a field line (text outside any field); two profiles with the same name after trimming and case-folding.
- **Rejected by name (C3).** A field line labelled `Verdict`, `Prohibition`, `Prohibited`, `Forbidden`, `Banned`, `Status` or `Decision` is reported with a message that says a profile is descriptive evidence and never a prohibition verdict. `Status` is included because Terminated Approaches uses it, and copying it across would turn a profile into a decision record. These seven labels are a closed list in one constant; they exist only to be refused.

## The rule

- **Id and placement.** `problems.barrier-profiles-valid`, Standard 17, category `problems`, `recommended`, `warning`, `structural`, assurance `partial`, `introducedIn` `"3.2.0"` (prepared and not assigned, as the FE-27 and FE-28 rules were). Subject surface `open-problems`; with no problem record it reports `not-evaluated` (verified: `skipped`, `notEvaluatedBecause: no-subject`).
- **`problems.barriers-recorded` is unchanged.** It still establishes that the section exists and is non-empty. A project that keeps a prose section keeps passing it; it additionally receives the new warning (choice 3).
- **Catalog entry (proposed text, `rules/problems.json`):**

```json
{
  "id": "problems.barrier-profiles-valid",
  "title": "Each known barrier is a structured profile",
  "standard": 17,
  "category": "problems",
  "level": "recommended",
  "severity": "warning",
  "validationType": "structural",
  "assurance": "partial",
  "nonExemptible": false,
  "introducedIn": "3.2.0",
  "description": "The Known Barriers section is either one or more barrier profiles or an explicit none. A profile names the barrier and records its statement, its scope, what it rules out, what it does not rule out, and a stated reference. A profile is descriptive evidence and never a prohibition verdict: a line labelled Verdict, Prohibition, Prohibited, Forbidden, Banned, Status or Decision is reported. Prose with no profile is reported.",
  "rationale": "A barrier is a result about which arguments cannot work under stated conditions, and the conditions matter as much as the exclusion: a barrier read as a prohibition is how a project stops looking in places the result never covered. Both measured adopters built a profile and said so, and one carries NEXP not in ACC0 as the counterexample to the prohibition reading. Recording what a barrier does not rule out beside what it does keeps the exclusion from outgrowing its scope.",
  "remediation": "Write one '### <barrier name>' profile per barrier with Statement, Scope, Rules out, Does not rule out and Evidence lines. Evidence names a URL, a path or 'commit <sha>'. Write 'none' deliberately if no barrier applies. Do not label a line Verdict or Prohibited.",
  "aliases": [],
  "deprecatedIn": null,
  "supersededBy": null,
  "removedIn": null,
  "$assuranceNote": "Establishes the shape of each profile and that its evidence is a stated reference. It does not establish that the barrier is real, that the scope is right, that what is listed as ruled out or not ruled out is correct, or that a reference exists. A profile never feeds a verdict about an approach."
}
```

- **Wiring the implementation must do** (each observed failing in the scratch prototype, so each is a known cost and not a surprise): add the rule id to `scripts/evaluated.mjs` and `scripts/surfaces.mjs`; add the new `report()` site to `test/fixtures/evidence-classification.json` (test "the classification table and the detector file agree, site for site"); regenerate `docs/assurance-report.md` (`npm run assurance`; test "the assurance report is current"); and add the `CHANGELOG` entry under Unreleased.

## Report wording

Text (`audit`), a new block after the research-attempt block:

```
  Barrier profiles (descriptive evidence; never a prohibition verdict):
    artifacts/open-problems/p-vs-np/problem.md: 2 profile(s)
      Natural proofs: rules out 1, does not rule out 2, evidence stated
      Relativization: rules out 1, does not rule out 1, evidence stated
```

For a record with no profiles the line reads `<path>: none`, `<path>: prose`, `<path>: absent` or `<path>: empty`, the status the reader assigned. `Rules out`/`does not rule out` counts are item counts and are never summed, compared or scored.

The finding (warning), one evidence entry per problem:

```
[warning] problems.barrier-profiles-valid [OBSERVED]
  1 problem(s) with the barrier profiles of the open-problem record. A barrier profile is descriptive evidence: it records scope, what is ruled out, what is not, and evidence, and is never a prohibition verdict.
    artifacts/open-problems/p-vs-np/problem.md — barrier 'Relativization' 'Verdict:' is a verdict label; a barrier profile is descriptive evidence and never a prohibition verdict. Record what it rules out and what it does not.
```

JSON (`audit --json`): a new top-level key `barrierProfiles`, one entry per problem record: `path`, `barriers` with `status` (`profiles`, `none`, `prose`, `absent`, `empty`), `profiles` (each: `name`, `statement`, `scope`, `rulesOut` and `doesNotRuleOut` as arrays of items, `evidence`, `problems`) and `problems`. There is no `verdict`, `prohibited`, `status`-per-profile or score key, and a test pins the key set (T11).

Standard text and template, proposed replacements (not applied by this record; choice 8):

- `standards/17-open-problems.md` R5, replacing its current last sentence ("An approach that a barrier already excludes is not a research direction; pursuing it after the barrier is documented is the clearest available signal that the record is not being read."):

> A barrier is descriptive evidence. Each `###` profile under `## Known Barriers` records the barrier's statement, its scope, what it rules out, what it does not rule out, and a stated reference. What a barrier rules out is bounded by its scope, and recording what it does not rule out is part of the record, not an afterthought. A barrier never decides whether an approach may be pursued: that decision is recorded under `## Terminated Approaches`, with the evidence required to reopen it.

- `templates/open-problem.md`, replacing the `## Known Barriers` section:

```markdown
## Known Barriers

One `###` heading per barrier, named for the barrier. A barrier is descriptive evidence: it records
what a result shows, under which conditions, and what it does and does not rule out. It is never a
verdict on whether an approach may be pursued; that decision belongs under Terminated Approaches,
with the evidence required to reopen it. Write `none` deliberately if no barrier applies. Prose with
no profile is reported by `problems.barrier-profiles-valid`.

### <Barrier name>
Statement: <what the barrier says, with its conditions>
Scope: <the class of arguments and the setting it speaks about>
Rules out: <what it rules out within that scope, or none>
Does not rule out: <what it does not rule out, or none>
Evidence: <a path, URL or commit <sha>; a citation may accompany it>
```

- `docs/assurance-report.md` is regenerated from the catalog entry above.

## Fixtures (proposed, none committed)

All are self-contained directories under `test/fixtures/`, `standardVersion: "1.0.0"` like the existing ones, with `project-policy.yml` in the block-style YAML the vendored reader accepts and `problem.md` in the Markdown the section reader accepts. The mathematical wording in these fixtures is the fixture's own recorded content; the framework checks its structure and asserts none of it (choice 9 asks the owner to confirm it or supply the adopter's own).

Every fixture's `project-policy.yml` is P with its own `project` name:

```yaml
# FE-29 (#60) fixture: <name>
standardVersion: "1.0.0"
project: "<name>"

mathematics:
  regimes:
    - open-problem
  openProblemMode: true
```

Every `problem.md` is H, then the `## Known Barriers` body shown for the fixture (omitted entirely for `barrier-profile-absent`), then T with the blocker line shown (default `- A lower-bound technique that the profiles above do not describe.`).

H:

```markdown
# P versus NP (fixture)

The mathematical wording in this record is the fixture's own recorded content. The framework checks
its structure and asserts none of it.

## Target Statement

P is not equal to NP.

## What Is Proved

Nothing about the target itself.

## What Remains Conjectural

The whole statement.

## Known Results

See the literature survey.

## Equivalences

None recorded.

## Where the Difficulty Lives

In getting past the known barriers together.
```

T (with the default blocker line):

```markdown
## Current Blocker

- A lower-bound technique that the profiles above do not describe.

## Terminated Approaches

### Direct diagonalization

Status: terminated 2026-01-05
Why: it relativizes; see notes/relativization.md
Evidence required to reopen: a non-relativizing diagonal argument.

## Stopping Criteria

A published proof, or a barrier result covering every remaining route.
```

### B1: `barrier-profile-nexp-acc0` (C1, C2)

PvsNP-shaped, two profiles: the first in list form, the second in single-line form. Besides P and the `problem.md` assembled as above, it carries the three note files the `Evidence:` lines cite, each `# <title>` plus the line `Fixture note, cited by a profile's Evidence line.` at `notes/natural-proofs.md`, `notes/nexp-not-in-acc0.md` and `notes/relativization.md`. Complete `problem.md`:

```markdown
# P versus NP (fixture)

The mathematical wording in this record is the fixture's own recorded content. The framework checks
its structure and asserts none of it.

## Target Statement

P is not equal to NP.

## What Is Proved

Nothing about the target itself.

## What Remains Conjectural

The whole statement.

## Known Results

See the literature survey.

## Equivalences

None recorded.

## Where the Difficulty Lives

In getting past the known barriers together.

## Known Barriers

### Natural proofs
Statement: A natural combinatorial property, one that is constructive and large, cannot prove strong lower bounds against a circuit class that contains strong pseudorandom generators.
Scope: Circuit lower-bound arguments that proceed through a property of the truth table. Conditional on the existence of the pseudorandom generators named in the statement.
Rules out:
- Lower-bound arguments whose key property is both constructive and large, against a class that contains such generators.
Does not rule out:
- Arguments whose key property is not constructive, or not large.
- The algorithmic method behind NEXP not in ACC0, recorded here as an argument the profile does not cover, not as a counterexample to the profile's own statement.
Evidence: notes/natural-proofs.md (Razborov and Rudich, "Natural proofs", 1997); notes/nexp-not-in-acc0.md (Williams, ACC lower bounds, 2011)

### Relativization
Statement: There are oracles relative to which P equals NP and oracles relative to which it does not.
Scope: Proof techniques that hold unchanged relative to every oracle.
Rules out: Diagonalization and simulation arguments that relativize.
Does not rule out: Arguments that use the structure of the computation and not only black-box access to it.
Evidence: notes/relativization.md (Baker, Gill and Solovay, 1975)


## Current Blocker

- A lower-bound technique that the profiles above do not describe.

## Terminated Approaches

### Direct diagonalization

Status: terminated 2026-01-05
Why: it relativizes; see notes/relativization.md
Evidence required to reopen: a non-relativizing diagonal argument.

## Stopping Criteria

A published proof, or a barrier result covering every remaining route.
```

Expected: no `problems.barrier-profiles-valid` finding; `barrierProfiles` lists two profiles; `Natural proofs` has the NEXP item among `doesNotRuleOut` and not among `rulesOut`. The only finding in the whole audit is the existing `claims.ledger-exists` (these fixtures carry no claims ledger, as `blocker-set-pvsnp` does not).

### B2: `barrier-profile-none`

`## Known Barriers` body:

```markdown
None recorded.
```

Expected: no new finding; `barrierProfiles` status `none`.

### B3 and B4: `barrier-profile-pursued-anyway` and `barrier-profile-pursued-control` (C3)

Identical except for the barriers body. Both use this blocker line in T, which names an approach the profile records as ruled out:

```markdown
- A diagonalization argument that relativizes.
```

`barrier-profile-pursued-anyway` body:

```markdown
### Relativization
Statement: There are oracles relative to which P equals NP and oracles relative to which it does not.
Scope: Proof techniques that hold unchanged relative to every oracle.
Rules out: Diagonalization and simulation arguments that relativize.
Does not rule out: Arguments that use the structure of the computation and not only black-box access to it.
Evidence: notes/relativization.md (Baker, Gill and Solovay, 1975)
```

`barrier-profile-pursued-control` body:

```markdown
None recorded.
```

Expected: the two `validate --json` results are deep-equal except `project` and `auditedAt` (measured in the prototype); the profile changes no finding, no score and no other rule.

### B5: `barrier-profile-prose-only`

```markdown
Relativization obstructs diagonalization. See the literature survey.
```

Expected: one `problems.barrier-profiles-valid` warning, "is prose with no '### <barrier>' profile and not an explicit 'none'"; `problems.barriers-recorded` does not fire.

### B6: `barrier-profile-verdict-label` (C3)

Body is the Relativization profile of B1 with one line, `Verdict: prohibited`, inserted before `Evidence:`:

```markdown
### Relativization
Statement: There are oracles relative to which P equals NP and oracles relative to which it does not.
Scope: Proof techniques that hold unchanged relative to every oracle.
Rules out: Diagonalization and simulation arguments that relativize.
Does not rule out: Arguments that use the structure of the computation and not only black-box access to it.
Verdict: prohibited
Evidence: notes/relativization.md (Baker, Gill and Solovay, 1975)
```

Expected: one warning, the verdict-label message.

### B7: `barrier-profile-missing-scope`

The Relativization profile with its `Scope:` line deleted.

```markdown
### Relativization
Statement: There are oracles relative to which P equals NP and oracles relative to which it does not.
Rules out: Diagonalization and simulation arguments that relativize.
Does not rule out: Arguments that use the structure of the computation and not only black-box access to it.
Evidence: notes/relativization.md (Baker, Gill and Solovay, 1975)
```

Expected: one warning, `missing field 'scope:'`.

### B8: `barrier-profile-evidence-free-text`

The Relativization profile with `Evidence: Baker, Gill and Solovay, 1975`.

```markdown
### Relativization
Statement: There are oracles relative to which P equals NP and oracles relative to which it does not.
Scope: Proof techniques that hold unchanged relative to every oracle.
Rules out: Diagonalization and simulation arguments that relativize.
Does not rule out: Arguments that use the structure of the computation and not only black-box access to it.
Evidence: Baker, Gill and Solovay, 1975
```

Expected: one warning, the evidence states no reference.

### B9: `barrier-profile-absent`

`problem.md` has no `## Known Barriers` section at all. Expected: exactly one barrier finding, `problems.barriers-recorded` ("missing ## Known Barriers"); `problems.barrier-profiles-valid` does not repeat it.

### Unit-level cases (parser, no fixture directory)

Each is a record whose `## Known Barriers` body is the profile G below with the stated change, parsed in the test file as a string, as `test/fe27-blocker.test.mjs` does.

G:

```markdown
### B
Statement: S.
Scope: C.
Rules out: R.
Does not rule out: N.
Evidence: notes/b.md
```

| Case | Change to G | Expected |
|---|---|---|
| `missing-<field>` (five cases) | delete that field's line | one problem naming the field |
| `empty-scope` | `Scope:` with nothing after it | one problem, missing field |
| `evidence-free-text` | `Evidence: Baker 1975` | one problem, no reference |
| `evidence-none` | `Evidence: none` | one problem, no reference |
| `evidence-url`, `evidence-commit` | `Evidence: https://example.org/b`, `Evidence: commit 3475ec4` | valid |
| `rules-out-none`, `does-not-rule-out-none` | `Rules out: none`, `Does not rule out: None.` | valid |
| `statement-none` | `Statement: none` | one problem, cannot be none |
| `label-<each of the seven>` | append `<Label>: x` | one problem, the verdict message |
| `unknown-field` | append `Severity: high` | one problem naming the field |
| `repeated-field` | append `Scope: again` | one problem |
| `stray-text` | append the unindented line `This barrier is serious.` | one problem, text outside any field |
| `continuation-indented` | `Scope: C,` then an indented `continued here.` line | valid |
| `fields-reordered` | the five lines in reverse order | valid |
| `duplicate-name`, `duplicate-name-case` | G twice; G and G with `### b` | two problems (one per profile) |
| `none-explained` | body `None - nothing known.` | status `none`, valid |
| `empty-section`, `prose-section` | body empty; body `Some prose.` | status `empty` / `prose`, one problem each |

## Verification performed

Everything below was run in a scratch copy of `git archive 3475ec4`, outside the repository, and none of it is committed. The prototype is `scripts/barriers.mjs` (about 150 lines: `parseBarriers`, reusing `hasReference`) plus a detector, a text and JSON report block, a catalog entry, and entries in `evaluated.mjs` and `surfaces.mjs`.

- **Baseline.** `node --test test/*.test.mjs` on main: 416 tests, 416 pass.
- **Prototype.** 413 of 416 pass. The three failures: "the assurance report is current" and "the classification table and the detector file agree, site for site" are the two wiring items listed under "The rule" and are expected; "the helper refuses a mutating command aimed at the repository" also fails on a pristine `git archive` export of main (cause not investigated; it concerns the repository-root guard of the test helper) and is unrelated to this work.
- **Schema.** `schemas/project-policy.schema.json` is unchanged. Every fixture `project-policy.yml` was read by `scripts/yaml.mjs`, and `validate` and `audit` ran on all nine fixture directories without a policy error. `problem.md` is not schema-validated, so there is no schema fragment to add; the template fragment above is the only structural artifact.
- **Fixtures.** B1 to B9 behaved as stated under each. The unit-level cases behaved as tabled: 25 profile cases and 6 section cases in the verification script, plus each of the seven verdict labels run separately (every one gave exactly one problem carrying the "never a prohibition verdict" message).
- **Not red-checked against main for the new keys.** On main, B5 to B8 produce no barrier finding at all, because `problems.barriers-recorded` is satisfied by any non-empty section. That is why the negative tests assert the new rule id and the `barrierProfiles` key and not an exit code, so they fail on main for the right reason.
- **Blast radius.** Of the existing fixtures, three gain one new warning because their `## Known Barriers` is prose: `blocker-absent`, `escape-hatch-declared`, `escape-hatch-undeclared`. No existing test failed because of it. The repository's own self-audit gains no finding. With no problem record, the new rule reports `not-evaluated` (checked on `math-compliant`).
- **C2 without special-casing.** The prototype reads no mathematics: the NEXP item is just an item. Test T8 pins that the source names neither NEXP nor ACC as a word.

## Red-first test list

New file `test/fe60-barrier-profiles.test.mjs` (planned), written before `scripts/barriers.mjs` and the rule exist. Every test fails against current main except the two marked GUARD. Unit tests import `parseBarriers` (absent on main, so the whole file fails to load first); CLI tests assert the new rule id or the `barrierProfiles` key, never only an exit code.

| Id | Test | Fixture or input | Criterion |
|---|---|---|---|
| T1 | G parses with all five fields; fields in any order; inline form, list form and indented continuation all give the same fields | G, `fields-reordered`, `continuation-indented`, B1 | C1 |
| T2 | Each of the five fields missing, and an empty field, is one problem naming the field | five `missing-*` cases, `empty-scope` | C1 |
| T3 | `none` is a valid `Rules out:` and `Does not rule out:` and is rejected for `Statement:` and `Scope:` | four cases | C1 |
| T4 | `Evidence:` needs a stated reference (URL, path, `commit <sha>`); a bare citation or `none` is rejected; nothing is resolved (a path that does not exist is valid) | five cases | C1 |
| T5 | Section forms: profiles, explicit none (with and without an explanation) valid; prose reported; empty and absent reported by the parser. In the CLI, B9 gives exactly one finding, `problems.barriers-recorded`, and not the new rule; B5 gives the new rule only | B2, B5, B9, three section cases | C1 |
| T6 | Duplicate names (case-folded), a repeated field, an unknown field and stray text are each reported, the unknown field by name | five cases | C1 |
| T7 | B1 has no new finding; `barrierProfiles` lists `Natural proofs` and `Relativization`; the NEXP item is in `Natural proofs`' `doesNotRuleOut` and not in `rulesOut`; text output lists both profiles | B1 | C2 |
| T8 | C2 is not special-cased: the B1 record with `NEXP not in ACC0` replaced by an arbitrary token produces the same result, and `scripts/barriers.mjs` contains neither `NEXP` nor `ACC` as a whole word | B1 variant, source scan | C2 |
| T9 | Each of the seven labels is reported with the "never a prohibition verdict" message; B6 through the CLI gives one `problems.barrier-profiles-valid` warning | seven cases, B6 | C3 |
| T10 | A barrier cannot change any other result: B3 and B4 `validate --json` are deep-equal except `project` and `auditedAt`; the `Rules out:` item matching an active blocker or a terminated approach yields no finding | B3, B4 | C3 |
| T11 | The module exports exactly `BARRIERS_HEADING`, `FIELD_KEYS`, `parseBarriers`; a parsed profile has exactly the keys `name, statement, scope, rulesOut, doesNotRuleOut, evidence, problems`; the `barrierProfiles` JSON entries carry no `verdict`, `prohibit*`, `forbid*` or score key | B1 | C3 |
| T12 | Catalog: the new rule is `recommended`; no rule at level `forbidden` or `required` other than the existing `problems.barriers-recorded` mentions a barrier; the new rule's description contains "never a prohibition verdict" | `rules/*.json` | C3 |
| T13 | Wording: `standards/17-open-problems.md` R5 and `templates/open-problem.md` contain the descriptive wording and no longer contain "is not a research direction"; the template's profile example parses with zero problems | the two files | C0, C3 |
| T14 | Report: text output has the line "Barrier profiles (descriptive evidence; never a prohibition verdict):"; `audit --json` has the `barrierProfiles` key | B1 | C1, C3 |
| T15 | With no problem record the rule reports `not-evaluated` | `math-compliant` | C1 |
| T16 | GUARD, passes on main: `open-problem-gaps` still reports `problems.barriers-recorded` for a missing section and the existing blocker and attempt-gate tests are unchanged | existing fixtures | C1 |
| T17 | GUARD, passes on main: `blocker-absent`, `escape-hatch-declared` and `escape-hatch-undeclared` keep every finding they have today (the new warning is the only addition once the rule lands, asserted by id) | three existing fixtures | C1 |

T16 and T17's second half and the three wiring tests (assurance report, classification table, and the `evaluated` and `surfaces` lists) are existing tests that the implementation must keep green; they are listed so none is a surprise.

## Criterion map (#60)

Criteria quoted from `finalized-criteria-2026-11-16.md`, unchanged. This record adds none.

- **C0: Adopt a structured barrier profile.** Met by this record once the owner freezes it (verified by review, the gap-check's "document criterion") and by the implementation's adoption: the catalog entry, the template and Standard 17 R5 (T12, T13). **Not met by this record while it is a draft.**
- **C1: It records barrier identity or statement, scope, what it rules out, what it does not rule out, and evidence/reference.** Met by the five fields (Syntax), the fail-closed reading and the rule; tests T1 to T7, T14, T15.
- **C2: The NEXP-not-in-ACC0 counterexample is representable.** Met by B1: it is an item under `Does not rule out:` of the natural-proofs profile, with the reference on the `Evidence:` line; tests T7, T8. The wording is the fixture's, and choice 9 asks the owner to confirm it.
- **C3: A barrier profile is descriptive evidence and never a prohibition verdict.** Met by invariants 1 and 5, the rejected labels, the closed key set and the catalog test; tests T9 to T13. It is partial today (the gap-check: no path from a barrier to a verdict exists, and nothing pins that); these tests pin it.

Design questions raised by the gap-check, answered: (1) shape: `###` profile with line fields under `## Known Barriers`; (2) all five mandatory, `none` allowed for the two exclusion fields only; (3) prose-only is reported by a new rule and `problems.barriers-recorded` is unchanged; (4) C3 by labels, closed keys and tests, plus rewording R5 and the template; (5) NEXP phrased as the fixture's own recorded content; (6) assurance ceiling `partial`: structure only.

## What the check does not establish

That a barrier is real, that its scope is right, that what is listed as ruled out or not ruled out is correct, that a cited reference exists, or that a profile is complete: the framework cannot know which barriers apply to a problem. It also does not stop a project from writing a prohibition in prose inside a field value; it refuses the labels and never reads a value as a verdict, which is the property C3 asks for.

## Versioning note

`introducedIn` is `"3.2.0"`, written while this work is prepared and not assigned, as the FE-27 and FE-28 rules were. No `VERSION` change is made here; classification and release stay owner-held. One `recommended` rule is added and none is removed or weakened, but rewording R5 touches normative text and the existing `required` rule's description (choice 8).

## Choices for owner review

Each states the default chosen (fail closed) and the alternative.

1. **Location: `problem.md`, `###` profile under `## Known Barriers`.** Alternatives: `attempt.md`; a separate `artifacts/barriers/<id>.md`; policy YAML.
2. **A new rule, `problems.barrier-profiles-valid`, `recommended`/`warning`.** Alternative: tighten the existing `required` `problems.barriers-recorded` to demand profiles, which reclassifies it and is major-version-class.
3. **Prose-only sections are reported** (fail closed). Alternative: leave prose silent and evaluate only sections that contain `###` profiles. Measured effect of the default: three existing fixtures and any adopter with prose gain one warning.
4. **Identity is the heading and `Statement:` is also required.** C1 says "identity or statement". Alternative: require only the heading.
5. **`none` is a deliberate answer for `Rules out:` and `Does not rule out:` only.** Alternative: require both to carry content, or allow `none` everywhere.
6. **`Evidence:` must contain a stated reference** by the FE-28 predicate; a bare citation is not enough. Alternative: accept free text.
7. **Seven verdict-like labels are refused by name, and any other unknown label is refused.** Alternative: ignore unknown labels, or refuse only the seven.
8. **Reword Standard 17 R5 and the template sentence "An approach a barrier already excludes is not a research direction."** The current wording is the prohibition reading C3 forbids. Alternative: leave the wording and rely on tests alone, which leaves the standard contradicting the profile model.
9. **The fixture's mathematics.** B1 places NEXP not in ACC0 under the natural-proofs profile's `Does not rule out:` and cites Razborov and Rudich (1997) and Williams (2011) as bare citations beside note files. I did not read the PvsNP repository, so whether its own record attaches the result to natural proofs or elsewhere is unchecked. Please confirm the wording or supply the adopter's own text; C2 needs only that the case is representable.
10. **Classification and number.** `recommended` makes this minor-version-class and `"3.2.0"` is prepared, not assigned.
11. **Out of scope, not designed:** linking an attempt, gate, claim or terminated approach to a barrier by name; identifiers for individual `Rules out:` items; resolving references. Each would be a separate decision, and the first is the one most likely to be read as a prohibition mechanism.
