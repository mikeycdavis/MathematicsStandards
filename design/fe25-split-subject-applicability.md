# FE-25 design record: split-subject applicability

**Status: DRAFT, awaiting owner freeze.** Nothing here is implemented. No schema, rule, fixture, VERSION or CHANGELOG file is changed by the pull request that carries this record; every schema fragment and fixture below is proposed text.
**Authority:** the owner's finalized criteria for #56 (`finalized-criteria-2026-11-16.md`, C0 to C3), quoted in the criterion map. The semantic model and invariants in "Binding model" are the owner's and are reproduced exactly. This record adds no acceptance criterion.
**Evidence base:** the gap-check report for #56 (`evidence-56/ac-gap-check/report.md`) and the live repository at main 14562f6.

## Scope

One issue, #56 (FE-25). The typed-evidence and warrant work (#55, #57) is a separate record, `design/fe24-fe26-typed-evidence-and-warrants.md`. The only coupling is one fixture (F2 below) that carries an attestation, and it is marked as ordering-dependent.

## Binding model

```
applicability:
  mode: split-subject
  appliesTo:
    - subject: <stable subject identifier>
      basis: <evidence or reference>
  structurallyImpossibleFor:
    - subject: <stable subject identifier>
      basis: <evidence or reference>
```

Invariants (owner's, unchanged):

1. `appliesTo` and `structurallyImpossibleFor` are both non-empty.
2. Every entry has an explicit subject and basis.
3. The two sets cannot overlap.
4. The declaration must cover the declared subject. An unclassified portion makes evaluation `NOT_EVALUATED`, which is neither passed nor not-applicable.
5. Only `appliesTo` portions are evaluated for the rule.
6. No generic `unclear` value.
7. No named profile bundles.

## Adopter evidence, located in the repository

The 4-of-29 case is recorded in two places. Quoted from `design/v1.1-candidates.md` section 0k:

> PvsNP's classification of all 29 manual rules — applicable 24, not-applicable 1, **unclear 4**.

> the rule's failure mode is impossible inside the formal development and entirely possible in the prose around it. An induction in Lean cannot omit its base case; an induction sketched in a design document can. `proof.edge-cases-addressed`, `proof.unjustified-triviality`, `proof.induction-gaps` and `rigor.symbolic-validity-conditions` all split that way.

and from `artifacts/adoption/two-adopters.md` N4, which adds the size and names the prose artifact: "An induction in Lean cannot omit its base case; an induction sketched in `BARRIERS.md` can." and "the 62,958 lines that matter most". The same file records, under the framework's blind spots, the PvsNP `AuditManifest.lean` (2,450 kernel-enforced axiom assertions) and a `check.ps1` build gate. `design/v1.1-candidates.md` section 0k closes: "this is **not** an argument for a general 'partially applicable' value. The observed shape is specific: a rule whose subject is split across a machine-checked artifact and its surrounding prose." `design/v1.1-disposition.md` rejects a profile mechanism, which is the source of invariant 7.

**NOT in the repository, and not invented here:** the PvsNP project policy, its directory layout, the file paths of its formal development and of its prose record, and any per-rule statement of why each portion falls on its side. The PvsNP repository is not available to this record. Every fixture below is therefore a stand-in: the Lean files are minimal, the prose file is a stub, and the `basis` strings point at those stand-in files. Each fixture that reproduces a real-adopter fact carries the marker `NEEDS-OWNER-DATA` in this record, and the four cases cannot be called faithful reproductions of PvsNP until the owner supplies the real portion names, paths and per-rule bases. The structure under test (which side each portion falls on, per the quoted sentence above) is the adopter's own and is not altered.

## Terminology

A "subject portion" (this record's `subject`) is a part of the project's mathematics. It is not the inspection `subject` in `scripts/surfaces.mjs` (project, framework, run). Schema property names follow the owner's model; prose here says "subject portion" to keep the two apart.

## Design

### Serialization

The model lives under the existing per-rule map `applicability.<ruleId>`. `mode: split-subject` is the discriminator and `status` is absent. A declaration is either a status declaration (`status` and `reason`, as today) or a split declaration (`mode`, `appliesTo`, `structurallyImpossibleFor`). Optional `reviewedAt` and `revisitWhen` are allowed on either.

### Schema fragment (exact)

The evaluator `scripts/jsonschema.mjs` supports no `oneOf`, `if/then` or `minProperties`, and throws on an unknown keyword. The fragment uses only supported keywords. It was applied to the repository schema in a scratch copy and the schema layer of the cases below was run through the repository's own evaluator (see "Verification performed").

Changes to `schemas/project-policy.schema.json`:

1. In `properties.mathematics.properties`, add:

```json
"subjectPortions": {
  "description": "The stable identifiers of the portions this project's mathematics divides into, for a rule whose subject is split between portions where it can fail and portions where it cannot (Standard 1 R2, FE-25). Declaring the list is what makes an unclassified portion a checkable condition: a split declaration must classify every identifier here. It names portions of THIS project and is not a bundle of rules. Nothing reads it unless a `split-subject` declaration exists.",
  "type": "array",
  "minItems": 1,
  "items": { "$ref": "#/$defs/subjectId" }
}
```

2. In `$defs`, add:

```json
"subjectId": {
  "description": "A stable identifier for a portion of the project's subject: lower-case kebab-case. Stable means a rename is an edit to the declaration, never a silent change of meaning.",
  "type": "string",
  "pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"
},
"splitSubjectEntry": {
  "type": "object",
  "required": ["subject", "basis"],
  "additionalProperties": false,
  "properties": {
    "subject": { "$ref": "#/$defs/subjectId" },
    "basis": {
      "description": "Evidence or reference for placing this portion on this side. Must state a reference (a path, a URL, or `commit <sha>`); free text alone is refused, as under FE-28. The framework records the basis and does not verify it.",
      "type": "string",
      "minLength": 1
    }
  }
}
```

3. In `$defs.applicabilityDeclaration`, delete `"required": ["status", "reason"]` (the semantic layer below restores it, per branch) and add to `properties`:

```json
"mode": {
  "description": "Present instead of `status`. The only value is `split-subject`: the rule's subject is divided into a portion where it is evaluated and a portion where its failure mode is structurally impossible. There is no generic partial value and no named bundle; a second value would be a separate decision.",
  "type": "string",
  "enum": ["split-subject"]
},
"appliesTo": {
  "description": "Portions on which the rule is evaluated. Non-empty when `mode` is present.",
  "type": "array",
  "minItems": 1,
  "items": { "$ref": "#/$defs/splitSubjectEntry" }
},
"structurallyImpossibleFor": {
  "description": "Portions on which the rule's failure mode cannot occur, by construction. Non-empty when `mode` is present. Not `not-applicable`: the rule still applies to the project.",
  "type": "array",
  "minItems": 1,
  "items": { "$ref": "#/$defs/splitSubjectEntry" }
}
```

`additionalProperties: false` stays on `applicabilityDeclaration`, so a `profile`, `bundle` or any other key is a schema error (invariant 7). `mode` admits one value, so `unclear` or any other value is a schema error (invariant 6).

### Validation rules, per invariant

The schema evaluator cannot express "exactly one of `status` or `mode`", set overlap, or membership in another list. Those live in a new shared validator, `scripts/applicability.mjs` (planned), following the precedent of `policy.missing-revisit-condition` in `scripts/policy.mjs`. It is called from `checkPolicy` and also from the `standards validate` path in `scripts/standards.mjs`, which today runs schema validation only; without that second call, an invalid declaration would pass `validate` and be caught only by the engine. The engine also calls it and fails closed.

| Invariant | Layer | Rule |
|---|---|---|
| 1 non-empty | schema | `minItems: 1` on both arrays. The semantic layer adds: `mode` present and either array absent is invalid (`applicability.split-incomplete`). |
| 2 explicit subject and basis | schema, then semantic | `required: ["subject","basis"]`, `minLength: 1`. Semantic: `basis` must satisfy `hasReference` from `scripts/attempts.mjs` (`applicability.basis-not-a-reference`). |
| 3 no overlap | semantic | A subject appearing in both arrays is invalid (`applicability.split-overlap`). A subject repeated within one array is invalid (`applicability.split-duplicate`). |
| 4 covers the declared subject | semantic and engine | Declared subject = `mathematics.subjectPortions`. Every identifier in it must appear in exactly one array. A split declaration with `mathematics.subjectPortions` absent is invalid (`applicability.no-declared-subject`). A subject in either array that is not in `subjectPortions` is invalid (`applicability.unknown-subject`). An unclassified portion is not a configuration error that stops the run; it is the reported state `NOT_EVALUATED` (see below). |
| 5 only `appliesTo` evaluated | engine | Rule evaluation reports and scores the `appliesTo` portions only; the evaluated portions are named in the result. |
| 6 no `unclear` | schema | `mode` enum has one value. |
| 7 no bundles | schema | `additionalProperties: false`; no `profile`, `bundle` or named-set key exists. |

Additional semantic rules, each a fail-closed choice listed under "Choices for owner review":

- Exactly one of `status` or `mode` (`applicability.status-and-mode`, `applicability.neither`). `status` present requires `reason`, restoring the schema requirement that was loosened (`applicability.missing-reason`).
- A split declaration is valid only for a rule whose catalog `validationType` is `manual-review` (`applicability.split-on-detectable-rule`). A rule with a detector would have its detection silently narrowed.
- The existing `policy.missing-revisit-condition` finding applies to a split declaration that omits `revisitWhen`, with the same severity as for `not-applicable`: the structurally-impossible classification is a claim about the project that stops being true when the project changes.

Violations of invariants 1, 2, 3, 6, 7 and the rules above are invalid configuration, exit code 2, as schema errors are today. The coverage gap of invariant 4 is the one exception: it is a reported evaluation state, not an error.

### Verdict and report: the evaluated portion

A valid, complete split declaration makes the rule an applicable rule evaluated on its `appliesTo` portions. It is scored as any applicable manual rule is scored, and it is never `disposition: "not-applicable"`.

Per-result fields (additive):

```json
"applicability": {
  "mode": "split-subject",
  "covered": true,
  "evaluated": [ { "subject": "prose-record", "basis": "BARRIERS.md" } ],
  "structurallyImpossible": [ { "subject": "formal-development", "basis": "formal/Main.lean" } ]
}
```

- A pass covers the evaluated portion only. The human text says so on the rule's line: `PASS (evaluated: prose-record; structurally impossible: formal-development)`. The result never reads as a pass of the whole subject.
- Automated detector hits are not filtered by portion. A split declaration narrows what a human is asked to judge; it does not suppress a detected failure.
- The human renderer adds a `Split subject (n):` section listing each rule with its evaluated and structurally-impossible portions. `standards explain <rule>` gets a `split-subject` state that prints the declaration, both bases, and the coverage result.
- Unclassified portion (invariant 4): the rule is `skipped`, `disposition: "applicability-incomplete"`, `notEvaluatedBecause: "unclassified-subject"`, with the unclassified identifiers listed in `applicability.unclassified`. It is excluded from neither bucket silently: a new informational `denominator.unclassifiedSubject` count reports it, and it is not passed and not not-applicable. An attestation cannot override it, because the question is which portion is being judged, not whether it was judged.
- Envelope `schemaVersion` stays `"2.0"`: every addition is a new optional field or new disposition value, which the repository's versioning precedent treats as additive (FE-41 was the only change that advanced it). A test pins this.

## Fixtures (proposed, none committed)

All fixtures are self-contained directories under `test/fixtures/`, `standardVersion: "1.0.0"` as the existing fixtures use, and in the block-style YAML the vendored reader accepts (it refuses flow sequences and flow mappings; this was found while checking the cases, and a fixture written in flow style fails with "flow sequences with content are not supported").

### F1: `split-subject-lean` (the four Lean cases)

`test/fixtures/split-subject-lean/project-policy.yml`. NEEDS-OWNER-DATA: portion names and every `basis`.

```yaml
standardVersion: "1.0.0"
project: split-subject-lean
mathematics:
  regimes:
    - informal
    - theorem-proving
  subjectPortions:
    - formal-development
    - prose-record
applicability:
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: BARRIERS.md
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
    revisitWhen: the prose record is folded into the formal development
  proof.unjustified-triviality:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: BARRIERS.md
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
    revisitWhen: the prose record is folded into the formal development
  proof.induction-gaps:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: BARRIERS.md
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
    revisitWhen: the prose record is folded into the formal development
  rigor.symbolic-validity-conditions:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: BARRIERS.md
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
    revisitWhen: the prose record is folded into the formal development
```

`test/fixtures/split-subject-lean/formal/Main.lean` (stand-in; the real PvsNP development is 62,958 lines and is not reproduced):

```lean
theorem demo_induction (n : Nat) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ k ih => omega
```

`test/fixtures/split-subject-lean/BARRIERS.md` (stand-in prose record; contains a deliberately sketched induction with no base case, the shape section 0k says can occur in prose):

```markdown
# Barriers

Claim: every n satisfies P(n). Sketch: assume P(k), then P(k+1) follows by the step lemma. Hence P(n) for all n.
```

Expected result (red-first target): each of the four rules is an applicable manual rule, status `skipped` (no detector, no attestation), `applicability.covered: true`, evaluated `prose-record`, structurally impossible `formal-development`, and none carries `disposition: "not-applicable"`.

The four rules' catalog facts, read from the repository: all four are `manual-review` with no detector; `proof.unjustified-triviality` and `proof.induction-gaps` are `forbidden` and `nonExemptible`; `proof.edge-cases-addressed` and `rigor.symbolic-validity-conditions` are `required`. A split declaration on a `nonExemptible` rule must not weaken the invariant: it narrows the evaluated portion and never removes the rule. This is covered by test T8 below.

### F2: `split-subject-lean-attested`

Same directory contents as F1 plus an attestation for `proof.induction-gaps`. The attestation shape depends on the typed-warrant design (`design/fe24-fe26-typed-evidence-and-warrants.md`, `reviewer.kind`), so this fixture is ordering-dependent: if #57 lands first it uses the typed shape below; if #56 lands first it uses today's untyped shape (without `reviewer`).

```yaml
attestations:
  proof.induction-gaps:
    status: approved
    reviewedBy: Example Reviewer
    reviewedAt: "2026-11-16"
    evidence: Read the induction sketch in BARRIERS.md and checked the base case is stated.
    reviewer:
      kind: human-review
    reviewedAgainst:
      paths:
        - BARRIERS.md
```

Expected: the attestation is judged against the `appliesTo` portion only, and the result shows `applicability.evaluated: [prose-record]`. Test T10.

### Negative fixtures

Each is a single `project-policy.yml` in its own directory, all sharing this header unless stated:

```yaml
standardVersion: "1.0.0"
mathematics:
  regimes:
    - informal
    - theorem-proving
  subjectPortions:
    - formal-development
    - prose-record
applicability:
```

Directory and the body appended to the header (each body is under `  proof.edge-cases-addressed:`):

`split-subject-invalid-empty-applies-to` (schema layer; invariant 1):
```yaml
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo: []
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
```

`split-subject-invalid-empty-impossible` (schema; invariant 1):
```yaml
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: BARRIERS.md
    structurallyImpossibleFor: []
```

`split-subject-invalid-missing-subject` (schema; invariant 2):
```yaml
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo:
      - basis: BARRIERS.md
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
```

`split-subject-invalid-missing-basis` (schema; invariant 2):
```yaml
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo:
      - subject: prose-record
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
```

`split-subject-invalid-free-text-basis` (semantic; invariant 2):
```yaml
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: the prose is where edge cases can be missed
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
```

`split-subject-invalid-overlap` (semantic; invariant 3):
```yaml
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: BARRIERS.md
      - subject: formal-development
        basis: formal/Main.lean
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
```

`split-subject-unclassified-portion` (engine state, not an error; invariant 4). Header's `subjectPortions` gains a third entry:
```yaml
mathematics:
  regimes:
    - informal
    - theorem-proving
  subjectPortions:
    - formal-development
    - prose-record
    - external-notes
applicability:
  proof.edge-cases-addressed:
    mode: split-subject
    appliesTo:
      - subject: prose-record
        basis: BARRIERS.md
    structurallyImpossibleFor:
      - subject: formal-development
        basis: formal/Main.lean
```
(plus `BARRIERS.md` and `formal/Main.lean` as in F1).

`split-subject-invalid-unknown-subject` (semantic; invariant 4): `appliesTo` names `appendix`, which is not in `subjectPortions`.

`split-subject-invalid-unclear` (schema; invariant 6): `mode: unclear`.

`split-subject-invalid-profile-key` (schema; invariant 7): the F1 body for one rule plus `profile: lean` under the declaration.

`split-subject-invalid-status-and-mode` (semantic): the F1 body for one rule plus `status: applicable` and `reason: both`.

`split-subject-invalid-detector-rule` (semantic): the F1 body applied to a rule whose `validationType` is not `manual-review` (the implementer picks one from `rules/` and records its id; this record does not choose one without checking the catalog at implementation time).

### Verification performed

The proposed schema fragments were applied to a scratch copy of the schema and the cases for invariants 1, 2 (missing basis), 6, 7, an invalid `subjectId`, and one valid split declaration were run through the repository's own `scripts/jsonschema.mjs` and `scripts/yaml.mjs`. Results: the valid case validates; the empty `appliesTo`, missing `basis`, `mode: unclear`, `profile` key and invalid subject identifier cases each fail with the expected path and message. The semantic-layer and engine cases were not run, because that code does not exist.

## Red-first test list

New file `test/split-subject.test.mjs` (planned). Each test is written to fail against current main, then made to pass.

| Id | Test | Fixture | Criterion |
|---|---|---|---|
| T1 | The four Lean rules validate and report an evaluated portion, not `not-applicable` | F1 | C2, C3 |
| T2 | Empty `appliesTo` is rejected (exit 2) | invalid-empty-applies-to | C1 |
| T3 | Empty `structurallyImpossibleFor` is rejected | invalid-empty-impossible | C1 |
| T4 | Missing subject, and missing basis, are each rejected | invalid-missing-subject, invalid-missing-basis | C1 |
| T5 | A free-text-only basis is rejected | invalid-free-text-basis | C1 |
| T6 | A subject in both sets is rejected | invalid-overlap | C1 |
| T7 | An unclassified portion yields `NOT_EVALUATED` with `unclassified-subject`, is not passed, is not `not-applicable`, and an attestation cannot override it | unclassified-portion | C1 |
| T8 | A split on a `nonExemptible` rule still evaluates the rule and still reports an invariant breach found by a detector or attestation rejection | F1 variant | C1 |
| T9 | `mode: unclear` and a `profile` key are rejected | invalid-unclear, invalid-profile-key | C0, C3 |
| T10 | An attestation is judged on the `appliesTo` portion only and the result shows it | F2 | C2 |
| T11 | Report: the human text and JSON name the evaluated and structurally-impossible portions; `explain` prints the split state | F1 | C2 |
| T12 | `status` with `mode` is rejected; `status` without `reason` is rejected | invalid-status-and-mode | C1 |
| T13 | A split on a non-manual rule is rejected | invalid-detector-rule | C1 |
| T14 | `standards validate` rejects the semantic-layer invalid fixtures, not only `policy` | all semantic negatives | C1 |
| T15 | Envelope `schemaVersion` remains `"2.0"` | F1 | none (guards the versioning choice) |
| T16 | The four Lean rule ids exist in the catalog as `manual-review` | none | C2 |

## Criterion map (#56)

Criteria quoted from `finalized-criteria-2026-11-16.md`, unchanged. This record adds none.

- **C0:** the design selects split-subject applicability rather than an `unclear` value. Met by this record: "Binding model", invariant 6. Verified by review of this record. Test T9 pins that `unclear` is rejected.
- **C1:** the declaration identifies the applicable portion, the structurally impossible portion, and the basis. Met by the schema fragment and validation rules. Tests T2 to T8, T12 to T14.
- **C2:** the four Lean cases are the initial fixture and report their applicable portions instead of a blanket `not-applicable`. Met by F1, F2 and the report design. Tests T1, T10, T11, T16. The fixture content is stand-in pending NEEDS-OWNER-DATA.
- **C3:** no named profile bundles are introduced. Met by `additionalProperties: false` and the absence of any named-set key. Tests T1 (no bundle key in the schema diff) and T9.

## Choices for owner review

Everything the owner's model does not determine took the fail-closed option.

1. **The declared subject is project-declared** (`mathematics.subjectPortions`). Alternatives: derive it from `mathematics.regimes`, or from paths. Needed so that coverage is checkable; without a declared universe invariant 4 cannot be tested.
2. **`basis` must state a reference** (path, URL, or `commit <sha>`), using the FE-28 predicate. Free text alone is refused. The owner may relax this.
3. **Split is allowed on `manual-review` rules only.** Applying it to a detector-backed rule would narrow detection.
4. **`required` is loosened on `applicabilityDeclaration` and restored by a semantic layer.** Alternative: add `oneOf` to the vendored evaluator (a change to checking code).
5. **Invariant violations are exit 2** (invalid configuration), like schema errors. The unclassified portion is the exception: a reported evaluation state.
6. **The existing `revisitWhen` finding applies** to split declarations.
7. **A valid split rule is scored as an applicable rule** with its evaluated portion reported, rather than excluded from the denominator. The alternative would let a split declaration remove a rule from the score.
8. **An attestation cannot override an unclassified portion.**
9. **Envelope `schemaVersion` stays `"2.0"`**: additive fields and values only.
10. **The validator is shared** between `policy` and `standards validate`, which closes the present gap where `validate` runs the schema only.
11. **F2's attestation shape is ordering-dependent** on #57.
12. **Fixture content is a stand-in** until the owner supplies the real PvsNP portion names, paths and per-rule bases.
