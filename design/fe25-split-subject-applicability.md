# FE-25 design record: split-subject applicability

**Status: design-complete pending exact-head review; implementation not begun and blocked until the signature design (`design/fe24-fe26-typed-evidence-and-warrants.md`) is complete and the real Lean-data packet exists. PR #119 stays a draft.** Revised 2026-11-16 to apply the owner's binding decisions listed under "Owner decisions applied". Nothing here is implemented.
**IMPLEMENTATION BLOCKER (#56 C2):** the mechanism design is frozen with the four-case fixture BLOCKED. #56 C2 cannot be claimed until the owner supplies `F:\GitHub Evidence\MathematicsStandards\evidence-56\lean-data\lean-data.md` using the template in `design/fe25-lean-data-packet.md`. No PvsNP or other data is invented or copied; stand-ins are mechanism-only. No schema, rule, fixture, VERSION or CHANGELOG file is changed by the pull request that carries this record; every schema fragment and fixture below is proposed text.
**Authority:** the owner's finalized criteria for #56 (`finalized-criteria-2026-11-16.md`, C0 to C3), quoted in the criterion map; the semantic model and invariants in "Binding model", reproduced exactly; and the owner decisions below. This record adds no acceptance criterion.
**Evidence base:** the gap-check report for #56 (`evidence-56/ac-gap-check/report.md`) and the live repository at main 14562f6.
**Blocked item:** the approved C2 ("the four Lean cases are the initial fixture") is NOT satisfied by anything in this record. See "Lean fixture: BLOCKED" and `design/fe25-lean-data-packet.md`.

## Scope

One issue, #56 (FE-25). The typed-evidence and warrant work (#55, #57) is a separate record, `design/fe24-fe26-typed-evidence-and-warrants.md`. The two share one decision: the envelope `schemaVersion` advances to `"3.0"` (see "Envelope version"), and whichever implementation lands first makes the change.

## Owner decisions applied (binding)

- The declared subject universe is per rule, not one global project list.
- `basis` is structured: `{statement, reference?}`. A free-text statement is valid; the reference is optional and separately machine-checkable. The earlier requirement that every basis state a reference is removed.
- Split-subject is limited to `manual-review` rules.
- Semantic validation may restore conditional rules the schema cannot express. Invalid declarations exit 2. Incomplete classification yields `NOT_EVALUATED`.
- `revisitWhen` is REQUIRED on split declarations.
- Only the applicable portion is scored, and the report says so explicitly.
- An attestation cannot override an unclassified portion.
- Envelope schema version 3.0.
- Semantic validation is shared across commands.
- Serialization stays per rule.
- An attestation binds to portions through `reviewedAgainst.portions`, which must be a subset of `appliesTo`.
- The `nonExemptible` schema-versus-engine contradiction is DECIDED (2026-11-16): the schema description is corrected to match the engine (see "The nonExemptible contradiction, decided").
- A rejection with incomplete split coverage still fails the rule; an approval cannot discharge while any declared portion is unclassified; the result shows BOTH (2026-11-16, decided).
- Human confirmation: an approval discharges only with a verified Ed25519 signature (`design/fe24-fe26-typed-evidence-and-warrants.md`, "Signed human confirmation").

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

The owner's `basis: <evidence or reference>` is realised as the structured object `{statement, reference?}` below: `statement` carries the evidence, `reference` the optional reference.

## Adopter evidence, located in the repository

Quoted from `design/v1.1-candidates.md` section 0k:

> PvsNP's classification of all 29 manual rules — applicable 24, not-applicable 1, **unclear 4**.

> the rule's failure mode is impossible inside the formal development and entirely possible in the prose around it. An induction in Lean cannot omit its base case; an induction sketched in a design document can. `proof.edge-cases-addressed`, `proof.unjustified-triviality`, `proof.induction-gaps` and `rigor.symbolic-validity-conditions` all split that way.

From `artifacts/adoption/two-adopters.md` N4: "An induction in Lean cannot omit its base case; an induction sketched in `BARRIERS.md` can." and "the 62,958 lines that matter most". The same file records the PvsNP `AuditManifest.lean` (2,450 kernel-enforced axiom assertions) and a `check.ps1` build gate. Section 0k closes: "this is **not** an argument for a general 'partially applicable' value. The observed shape is specific: a rule whose subject is split across a machine-checked artifact and its surrounding prose." `design/v1.1-disposition.md` rejects a profile mechanism, the source of invariant 7.

**NOT in the repository, and not invented here:** the PvsNP project policy, its directory layout, the paths of its formal development and prose record, and any per-rule statement of why each portion falls on its side. Real PvsNP data is unavailable under the current repository-scope rule.

## Terminology

A "subject portion" (this record's `subject`) is a part of a rule's subject. It is not the inspection `subject` in `scripts/surfaces.mjs` (project, framework, run).

## Design

### Serialization

Per rule, under the existing `applicability.<ruleId>` map. `mode: split-subject` is the discriminator and `status` is absent. A declaration is a status declaration (`status`, `reason`, as today) or a split declaration (`mode`, `declaredSubject`, `appliesTo`, `structurallyImpossibleFor`, `revisitWhen`). `reviewedAt` is optional on both.

### Per-rule declared subject

`declaredSubject` lists the portions this rule's subject divides into, for this rule only. Coverage (invariant 4) is: every identifier in `declaredSubject` appears in exactly one of `appliesTo` or `structurallyImpossibleFor`.

A limit, stated plainly: the project declares the universe, so coverage catches a portion that was listed and not classified, and cannot catch a portion the author never listed. That is inherent in a project-declared universe and is the price of the owner's per-rule decision (choice 2 names the alternative).

### Schema fragment (exact)

The evaluator `scripts/jsonschema.mjs` supports no `oneOf`, `if/then` or `minProperties`, and throws on an unknown keyword; the fragment uses only supported keywords. It was applied to a scratch copy of `schemas/project-policy.schema.json` and run through the repository's own evaluator (see "Verification performed"). No `mathematics.subjectPortions` key exists in this revision.

Changes to `schemas/project-policy.schema.json`. In `$defs`, add:

```json
"subjectId": {
  "description": "A stable identifier for a portion of a rule's subject: lower-case kebab-case. Stable means a rename is an edit to the declaration, never a silent change of meaning.",
  "type": "string",
  "pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"
},
"splitBasis": {
  "description": "Why a portion is classified as it is. `statement` is required free text and is valid on its own. `reference` is optional and, when present, is checked separately by the semantic layer: it must state a path, a URL or `commit <sha>`.",
  "type": "object",
  "required": ["statement"],
  "additionalProperties": false,
  "properties": {
    "statement": { "description": "Why this classification holds.", "type": "string", "minLength": 1 },
    "reference": { "description": "Optional path, URL or commit supporting the statement. The framework checks its form and, for a repository path, whether it resolves; it does not judge whether it supports the statement.", "type": "string", "minLength": 1 }
  }
},
"splitSubjectEntry": {
  "type": "object",
  "required": ["subject", "basis"],
  "additionalProperties": false,
  "properties": {
    "subject": { "$ref": "#/$defs/subjectId" },
    "basis": { "$ref": "#/$defs/splitBasis" }
  }
}
```

In `$defs.applicabilityDeclaration`, delete `"required": ["status", "reason"]` (the semantic layer restores it per branch) and add to `properties`:

```json
"mode": {
  "description": "Present instead of `status`. The only value is `split-subject`: the rule's subject is divided into a portion where it is evaluated and a portion where its failure mode is structurally impossible. There is no generic partial value and no named bundle; a second value would be a separate decision.",
  "type": "string",
  "enum": ["split-subject"]
},
"declaredSubject": {
  "description": "The portions this rule's subject divides into, declared by the project for this rule. A split declaration must classify every one of them. A portion listed here and classified in neither set leaves the rule NOT_EVALUATED. It cannot catch a portion the author never listed.",
  "type": "array",
  "minItems": 1,
  "items": { "$ref": "#/$defs/subjectId" }
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

In `$defs.reviewedAgainst.properties`, add:

```json
"portions": {
  "description": "For an attestation on a rule with a split-subject declaration: the portions the reviewer examined. Each must be a member of the rule's `appliesTo`; the semantic layer enforces this. Required on such an attestation and refused on any other.",
  "type": "array",
  "minItems": 1,
  "items": { "$ref": "#/$defs/subjectId" }
}
```

`additionalProperties: false` stays on `applicabilityDeclaration`, so a `profile`, `bundle` or other key is a schema error (invariant 7), and `mode` admits one value, so `unclear` is a schema error (invariant 6).

### Validation rules, per invariant

The conditional rules live in a new shared validator, `scripts/applicability.mjs` (planned), after the precedent of `policy.missing-revisit-condition` in `scripts/policy.mjs`. It is called from `checkPolicy`, from the `standards validate` path (which today runs schema validation only), and from the engine, which fails closed. Sharing it means `validate`, `policy` and `audit` give the same answer for the same file.

| Invariant | Layer | Rule |
|---|---|---|
| 1 non-empty | schema, semantic | `minItems: 1` on both arrays. Semantic: `mode` present with either array or `declaredSubject` absent is invalid (`applicability.split-incomplete`). |
| 2 explicit subject and basis | schema, semantic | `required: ["subject","basis"]`; `basis.statement` required, `minLength: 1`. Semantic: a `basis.reference`, when present, must satisfy `hasReference` from `scripts/attempts.mjs` (`applicability.reference-malformed`). A reference that is a repository path and does not resolve is reported in the result as `reference-unresolved`, not as an error. A statement alone is valid. |
| 3 no overlap | semantic | A subject in both arrays is invalid (`applicability.split-overlap`); a subject repeated within one array is invalid (`applicability.split-duplicate`). |
| 4 covers the declared subject | semantic, engine | A subject in either array that is not in `declaredSubject` is invalid (`applicability.unknown-subject`). A `declaredSubject` member in neither array is NOT a configuration error: it is the reported state `NOT_EVALUATED` (below). |
| 5 only `appliesTo` evaluated | engine | The rule is evaluated and scored on `appliesTo` only, and an attestation binds to portions through `reviewedAgainst.portions` (below). |
| 6 no `unclear` | schema | `mode` enum has one value. |
| 7 no bundles | schema | `additionalProperties: false`; T17 pins the key set. |

Additional semantic rules:

- Exactly one of `status` or `mode` (`applicability.status-and-mode`, `applicability.neither`). `status` present requires `reason` (`applicability.missing-reason`).
- A split declaration is valid only for a rule whose catalog `validationType` is `manual-review` (`applicability.split-on-detectable-rule`).
- `revisitWhen` is REQUIRED on a split declaration (`applicability.split-missing-revisit`, invalid, exit 2). This is stricter than the existing `policy.missing-revisit-condition` finding for `not-applicable`, which is a finding rather than invalid configuration.

Invalid declarations exit 2, as schema errors do today. Incomplete classification is the one reported state, not an error.

### Attestation-to-portion binding

For a rule with a split declaration:

- the attestation must carry `reviewedAgainst.portions`, non-empty (`attestation.portions-required`);
- every listed portion must be a member of `appliesTo`; a portion that is structurally impossible, or unknown, is invalid (`attestation.portion-not-evaluated`, exit 2);
- `reviewedAgainst.portions` on an attestation for a rule with no split declaration is invalid (`attestation.portions-on-unsplit-rule`);
- when the listed portions are a proper subset of `appliesTo`, an APPROVED attestation does not discharge: the rule is `skipped`, `notEvaluatedBecause: "portion-unattested"`, the remainder listed. When they equal `appliesTo`, the attestation is judged as today, and a pass covers exactly those portions;
- a REJECTED attestation fails the rule whatever the coverage: a rejection on a rule with an unclassified portion, or with portions that are a proper subset of `appliesTo`, is `attested-rejected` (a failure), not skipped. This keeps the typed-warrant rule that a rejection is effective whatever the kind (decided). The result shows BOTH facts: `disposition: "attested-rejected"` AND `applicability.covered: false` with `unclassified: [...]` (or `portion-unattested` remainder), so a reader sees the failure and that coverage was also incomplete. A rejection's `portions` are still validated by the binding rules above.

This makes invariant 5 an enforced property of what an attestation is allowed to claim. It still cannot prove the reviewer examined what they say; `reviewedAgainst.paths` and its digest are the existing, unchanged evidence of that.

### Verdict and report: the evaluated portion and the scope of the score

A valid, complete split declaration makes the rule an applicable rule evaluated on `appliesTo`. It is never `disposition: "not-applicable"`.

Per-result fields (additive):

```json
"applicability": {
  "mode": "split-subject",
  "covered": true,
  "evaluated": [ { "subject": "prose-record" } ],
  "structurallyImpossible": [ { "subject": "formal-development" } ],
  "scope": "evaluated-portion-only"
}
```

- **Scoring scope, stated explicitly.** A split rule is scored on its evaluated portion only. A pass is a pass of `appliesTo`; it claims nothing about the structurally impossible portion, and the score does not credit it. The human text says so on the rule's line, `PASS (scored on: prose-record only; structurally impossible: formal-development)`, and the JSON carries `scope: "evaluated-portion-only"`. A new informational `denominator.splitSubject` count says how many scored rules are scored on a portion only.
- The human renderer adds a `Split subject (n):` section; `standards explain <rule>` gets a `split-subject` state printing the declaration, both bases, the coverage result and the attestation's portions.
- **Unclassified portion:** the rule is `skipped`, `disposition: "applicability-incomplete"`, `notEvaluatedBecause: "unclassified-subject"`, with the unclassified identifiers listed. It is neither passed nor not-applicable, `denominator.unclassifiedSubject` counts it, and an APPROVED attestation cannot override it: the question is which portion is being judged, not whether it was judged. An approval cannot discharge while any declared portion is unclassified. A rejected attestation still fails the rule, and the result reports both the rejection and the incomplete coverage (decided).
- Detector hits: a split is valid only on `manual-review` rules and none of the four Lean rules has a detector, so there is no detector hit to filter; a rule with a detector is refused (`applicability.split-on-detectable-rule`), so a detected failure is never suppressed by a split.

### Envelope version

`ENVELOPE_SCHEMA_VERSION` advances from `"2.0"` to `"3.0"` (owner decision). `test/envelope-schema-version.test.mjs`, which asserts `"2.0"` today, changes with it (T15). The typed-warrant record makes the same advance; one bump covers both.

### The nonExemptible contradiction, decided

Read from the repository: the policy schema's `attestations` description says an attestation "never reaches a rule that is `forbidden` and `nonExemptible`". `judgeAttestation` in `scripts/compliance.mjs` has no such check; its header says an attestation cannot bypass a `nonExemptible` rule because "the automated failure survives", which is true only where a detector exists. `applicability` has no such check either.

**Decision (owner, 2026-11-16):** correct the schema description to match the engine. `nonExemptible` prohibits exceptions and waivers; it does not prohibit evidence-bearing attestations for manual-review rules. A rejection remains effective. An approval may discharge only when applicability is complete AND the required trusted signed human warrant is present. Proposed replacement text for the `attestations` description (an implementation change; this record changes no schema file):

> An attestation is evidence, not a waiver. `nonExemptible` prohibits exceptions and waivers; it does not prohibit an evidence-bearing attestation on a manual-review rule. A rejection is always effective and fails the rule. An approval can discharge a rule only when its applicability is complete and the required trusted, signed human warrant is present; otherwise the rule is not discharged. An automated failure is never overridden by an attestation.

Consequences: a split declaration on an invariant rule is permitted (it narrows the portion evaluated and never removes the rule); existing verdicts do not change. The alternative (engine refuses attestations on invariants) is not adopted.

Fixtures and tests are adjusted: the F2 attestation remains on `proof.edge-cases-addressed` (required, not an invariant), and T8 plus a new T8b exercise the invariant `proof.induction-gaps` with a rejection (effective, with or without full coverage) and an approval (discharges only with complete applicability and a verified signature, otherwise `attested-unconfirmed` or `applicability-incomplete`).

## Lean fixture: BLOCKED

The approved criterion C2 names "the four Lean cases" as the initial fixture. A stand-in does not satisfy it. The four-case fixture, `test/fixtures/split-subject-lean/`, is therefore BLOCKED until the owner supplies the data listed in `design/fe25-lean-data-packet.md`. No content for it is invented here.

For testing the MECHANISM only, the record defines a stand-in, `test/fixtures/split-subject-standin/`, whose name, header comment and tests say it is not the Lean fixture. Tests on it do not count toward C2.

## Fixtures (proposed, none committed)

All fixtures are self-contained directories under `test/fixtures/`, `standardVersion: "1.0.0"` like the existing ones, in the block-style YAML the vendored reader accepts. (It refuses flow sequences and flow mappings: a fixture in flow style fails with "flow sequences with content are not supported".) The content below is portion and file names chosen for the stand-in; none is adopter data.

### S1: `split-subject-standin` (mechanism stand-in; NOT the Lean fixture)

`test/fixtures/split-subject-standin/project-policy.yml`:

```yaml
standardVersion: "1.0.0"
project: split-subject-standin
mathematics:
  regimes:
    - informal
    - theorem-proving
applicability:
  proof.edge-cases-addressed:
    mode: split-subject
    declaredSubject:
      - formal-development
      - prose-record
    appliesTo:
      - subject: prose-record
        basis:
          statement: The prose record can state a result without its edge cases.
          reference: BARRIERS.md
    structurallyImpossibleFor:
      - subject: formal-development
        basis:
          statement: The formal development is machine-checked.
          reference: formal/Main.lean
    revisitWhen: the prose record is folded into the formal development
  proof.induction-gaps:
    mode: split-subject
    declaredSubject:
      - formal-development
      - prose-record
    appliesTo:
      - subject: prose-record
        basis:
          statement: An induction sketched in prose can omit its base case.
    structurallyImpossibleFor:
      - subject: formal-development
        basis:
          statement: A Lean induction cannot omit its base case.
    revisitWhen: the prose record is folded into the formal development
```

The second rule's bases are statements only, to exercise the no-reference path.

`test/fixtures/split-subject-standin/formal/Main.lean`:

```lean
theorem demo_induction (n : Nat) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ k ih => omega
```

`test/fixtures/split-subject-standin/BARRIERS.md`:

```markdown
# Barriers

Claim: every n satisfies P(n). Sketch: assume P(k), then P(k+1) follows by the step lemma. Hence P(n) for all n.
```

(The stub is an induction sketch with no base case, so the prose portion is genuinely a place where `proof.induction-gaps` can fail.)

Expected: both rules are applicable manual rules, `skipped` awaiting judgement, `applicability.covered: true`, `scope: "evaluated-portion-only"`, evaluated `prose-record`, structurally impossible `formal-development`, and neither is `not-applicable`.

### S2: `split-subject-standin-attested`

S1's files with this appended to the policy. The attestation is on `proof.edge-cases-addressed` (`required`, not an invariant), and is a rejection, so the evidence is honest against the stub, which states no edge cases:

```yaml
attestations:
  proof.edge-cases-addressed:
    status: rejected
    reviewedBy: Example Reviewer
    reviewedAt: "2026-11-16"
    evidence: Read BARRIERS.md; it states no edge cases for the claim, so the rule is not met.
    reviewedAgainst:
      paths:
        - BARRIERS.md
      portions:
        - prose-record
```

Expected: the rule fails with `attested-rejected`; the result shows `evaluated: prose-record`. A second variant, S2b, carries `status: approved` with `portions: [prose-record]` and evidence that the stub is complete, and is used only for the pass path; its evidence says plainly that the stub was edited to state its edge cases, so no approval is claimed against a file built to fail. After typed warrants land (#57), an attestation also carries `reviewer.kind: human-review`, and the pass path additionally needs a verified signature. The fixture holds NO key and NO signature: the test generates an Ed25519 keypair in memory, writes a temporary trust configuration outside the fixture directory, and signs S2b's attestation at test time. Without that signature S2b reports `attested-unconfirmed`, which is also asserted. Ordering is stated in the typed-warrant record.

### Negative fixtures

Each is a single `project-policy.yml` in its own directory. Every file is the header H followed by the body shown. H:

```yaml
standardVersion: "1.0.0"
mathematics:
  regimes:
    - informal
    - theorem-proving
applicability:
  proof.edge-cases-addressed:
```

The valid body B is the S1 body for `proof.edge-cases-addressed` (everything under that key). Each negative is B with the stated change; the full body of each is B altered exactly as written.

| Directory | Layer | Change to B | Invariant |
|---|---|---|---|
| `split-subject-invalid-empty-applies-to` | schema | `appliesTo: []` | 1 |
| `split-subject-invalid-empty-impossible` | schema | `structurallyImpossibleFor: []` | 1 |
| `split-subject-invalid-missing-declared` | semantic | delete `declaredSubject` | 1 |
| `split-subject-invalid-missing-subject` | schema | delete `subject:` from the first `appliesTo` entry | 2 |
| `split-subject-invalid-missing-statement` | schema | `basis` with `reference` only | 2 |
| `split-subject-invalid-basis-string` | schema | `basis: BARRIERS.md` (the old string shape) | 2 |
| `split-subject-invalid-malformed-reference` | semantic | `reference: see the notes` | 2 |
| `split-subject-invalid-overlap` | semantic | add `prose-record` to `structurallyImpossibleFor` as well | 3 |
| `split-subject-invalid-unknown-subject` | semantic | `appliesTo` subject `appendix`, not in `declaredSubject` | 4 |
| `split-subject-unclassified-portion` | engine state | add `external-notes` to `declaredSubject` only | 4 |
| `split-subject-invalid-unclear` | schema | `mode: unclear` | 6 |
| `split-subject-invalid-profile-key` | schema | add `profile: lean` | 7 |
| `split-subject-invalid-status-and-mode` | semantic | add `status: applicable` and `reason: both` | n/a |
| `split-subject-invalid-no-revisit` | semantic | delete `revisitWhen` | n/a |
| `split-subject-invalid-detector-rule` | semantic | B applied to a rule whose `validationType` is not `manual-review`; the implementer records which, after reading the catalog | n/a |
| `attestation-portions-missing` | semantic | B plus an attestation with no `portions` | binding |
| `attestation-portion-impossible` | semantic | B plus an attestation with `portions: [formal-development]` | binding |
| `attestation-portions-on-unsplit` | semantic | a `status: applicable` declaration plus an attestation with `portions` | binding |
| `attestation-partial-portions` | engine state | B with `appliesTo` of two portions plus an attestation listing one | binding |

The unclassified-portion and partial-portion fixtures include `BARRIERS.md` and `formal/Main.lean` as in S1.

### Verification performed

The schema fragments were applied to a scratch copy and run through `scripts/jsonschema.mjs` and `scripts/yaml.mjs`; the schema passes `assertSchemaSupported`. These cases behaved as expected: a valid split with a reference; a valid split with a statement-only basis; empty `appliesTo`; empty `structurallyImpossibleFor`; `basis` without `statement`; the old string `basis` (rejected); missing `subject`; `mode: unclear`; a `profile` key; an invalid subject id; an empty `declaredSubject`; valid and empty `reviewedAgainst.portions`. Cases marked "semantic" or "engine state" were not run: that code does not exist.

## Red-first test list

New file `test/split-subject.test.mjs` (planned). Every test is written to fail against current main, then made to pass, with the two exceptions marked GUARD.

On current main the new keys (`mode`, `declaredSubject`, `appliesTo`, `structurallyImpossibleFor`, `reviewedAgainst.portions`) are unknown properties under `additionalProperties: false`, so a negative fixture already exits 2 for the wrong reason. Therefore every negative test must assert the SPECIFIC finding id or schema path, never only the exit code, so that it fails on main. The assertion for each is: empty arrays, `appliesTo ... must contain at least 1 item(s)` (and the `structurallyImpossibleFor` equivalent) at the path under the new key; missing subject, `appliesTo[0].subject is required but missing`; string basis, `basis expected object, found string`; missing statement, `basis.statement is required but missing`; `mode: unclear`, `mode must be one of 'split-subject'`; `profile`, assertion that the schema's key set is closed (T17) plus no `unknown property` message for any of the eight permitted keys; and, for the semantic cases, the finding ids `applicability.split-overlap`, `split-incomplete`, `unknown-subject`, `reference-malformed`, `split-missing-revisit`, `status-and-mode`, `split-on-detectable-rule`, `attestation.portions-required`, `attestation.portion-not-evaluated`, `attestation.portions-on-unsplit-rule`. A positive twin (the same file with the fault removed validates) accompanies each, which also fails on main.

| Id | Test | Fixture | Criterion |
|---|---|---|---|
| T1 | S1 validates and reports an evaluated portion, not `not-applicable` (mechanism only; does not count toward C2) | S1 | C1 |
| T2 | Empty `appliesTo` / `structurallyImpossibleFor` rejected (exit 2) | the two empty fixtures | C1 |
| T3 | Missing subject, missing statement, and string basis each rejected | three fixtures | C1 |
| T4 | A statement-only basis is accepted; a malformed reference is rejected; an unresolved repository path is reported as `reference-unresolved`, not an error | S1, malformed-reference | C1 |
| T5 | A subject in both sets rejected | invalid-overlap | C1 |
| T6 | A subject outside `declaredSubject` rejected; a missing `declaredSubject` rejected | two fixtures | C1 |
| T7 | An unclassified portion yields `NOT_EVALUATED` with `unclassified-subject`, is not passed, is not `not-applicable`, an approved attestation (even signed) cannot override it, and a rejected attestation still fails the rule; the rejection result shows BOTH `attested-rejected` and `applicability.covered: false` with `unclassified: [external-notes]` (text and JSON) | unclassified-portion | C1 |
| T8 | A split on the invariant rule `proof.induction-gaps` with no attestation still evaluates the rule (skipped awaiting judgement) and does not remove it | S1 | C1 |
| T8b | nonExemptible decided: on the invariant rule, a rejection fails (with or without full coverage); an approval with complete applicability and a verified signature discharges; an approval unsigned is `attested-unconfirmed`; an approval with incomplete applicability is `applicability-incomplete`; an exception or waiver on the rule is still rejected; the corrected schema description text is asserted | S1 variants | C1 |
| T9 | `mode: unclear` and a `profile` key rejected | two fixtures | C0, C3 |
| T10 | Attestation binding: portions equal to `appliesTo` is judged and the pass covers exactly them; portions missing, naming an impossible portion, or on an unsplit rule are rejected (exit 2); a proper subset is `portion-unattested` and not discharged; a REJECTED attestation on a proper subset still fails and shows both `attested-rejected` and the incomplete coverage; the S2b pass needs a test-generated signature (unsigned: `attested-unconfirmed`) | S2, S2b, four attestation fixtures | C1 |
| T11 | Report: text and JSON name the evaluated and structurally-impossible portions and state the scoring scope; `explain` prints the split state | S1 | C1 |
| T12 | `status` with `mode` rejected (`applicability.status-and-mode`); `revisitWhen` missing on a split rejected (`applicability.split-missing-revisit`). The `status` without `reason` part is a GUARD: it passes on main because the schema still requires `reason`, and it must keep passing after `required` is loosened | three fixtures | C1 |
| T13 | A split on a non-manual rule rejected | invalid-detector-rule | C1 |
| T14 | `standards validate`, `policy` and `audit` return the same exit code for every semantic negative | all semantic negatives | C1 |
| T15 | Envelope `schemaVersion` is `"3.0"`; the new denominator keys `splitSubject` and `unclassifiedSubject` are present | S1 | none (pins the version decision) |
| T16 | The score line states the scoring scope, and a split rule's pass is not reported as covering the structurally impossible portion | S2b | C1 |
| T17 | The key set of `applicabilityDeclaration.properties` equals exactly `{status, reason, reviewedAt, revisitWhen, mode, declaredSubject, appliesTo, structurallyImpossibleFor}` | none | C3 |
| T18 | GUARD, passes on current main (the schema still has `required`): the CLI exits 2 for an applicability entry of `{}` and for `status` without `reason`, in `validate`, `policy` and `audit` alike | two small fixtures | C1 |
| T19 | BLOCKED until the owner data arrives: the four-case fixture `split-subject-lean` reports each of the four rules with its evaluated portion | `split-subject-lean` | C2 |

The guards are T18 and the `status`-without-`reason` part of T12; they pass today and exist to keep the loosening of `required` from weakening schema-only consumers. T15 (version `"3.0"`) and T16 fail on main today. T19 is BLOCKED and cannot yet be written red-first.

## Criterion map (#56)

Criteria quoted from `finalized-criteria-2026-11-16.md`, unchanged. This record adds none.

- **C0:** the design selects split-subject applicability rather than an `unclear` value. Met by this record ("Binding model", invariant 6), verified by review; T9 pins that `unclear` is rejected.
- **C1:** the declaration identifies the applicable portion, the structurally impossible portion, and the basis. Met by the schema fragment and validation rules; tests T1 to T14, T16, T18.
- **C2:** the four Lean cases are the initial fixture and report their applicable portions instead of a blanket `not-applicable`. **NOT MET by this record.** The report mechanism is designed (T11); the four-case fixture is BLOCKED on owner data (T19, `design/fe25-lean-data-packet.md`). The stand-in S1 does not count.
- **C3:** no named profile bundles. Met by `additionalProperties: false` and the absence of any named-set key; tests T17 and T9.

## Choices for owner review

Decided items are removed (split limited to manual-review, the nonExemptible resolution, a rejection with incomplete coverage, `portions` binding, the shared validator, evaluated-portion scoring, and the mechanism-only stand-ins). Remaining, with the alternative:

1. **A reference, when given, must have a valid form** (path, URL or `commit <sha>`), checked with the FE-28 predicate; an unresolved repository path is reported, not rejected. Alternative: no form check.
2. **`declaredSubject` is project-declared per rule.** Coverage catches a listed-and-unclassified portion and cannot catch an unlisted one. Alternative: a per-rule universe derived from the catalog or from regime names.
3. **`required` is loosened on `applicabilityDeclaration` and restored by the semantic layer.** Alternative: add `oneOf` to the vendored evaluator. T18 guards the loosening.
4. **A repository-path `basis.reference` that does not resolve is reported (`reference-unresolved`), not an error.** Alternative: make it invalid.
5. **A proper-subset attestation is `portion-unattested`, not a partial pass.** Alternative: score the attested portion and report the rest.
6. **S2's attestation shape follows the typed-warrant record's ordering** (#57).
