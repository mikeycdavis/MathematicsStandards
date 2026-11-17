# FE-61 design record: adopter verification gates

**Status: DRAFT, awaiting owner freeze. Implementation of #61 is not authorized until the owner freezes this record.** Nothing here is implemented. The pull request that carries this record changes no code, schema, rule, fixture, VERSION or CHANGELOG file; every schema fragment, fixture, template block, test and report line below is proposed text.
**Authority:** the owner-finalized criteria for #61, `finalized-criteria-2026-11-16.md` (C0 to C4 and the unnumbered rider), and the owner's binding decision below. This record adds no acceptance criterion.
**Evidence base:** the gap-check report for #61 (`ac-gap-check/report.md`, main 14562f6) and the live repository at 3475ec4. The pattern is the merged FE-28 attempt gates (`scripts/attempts.mjs`, `design/fe27-fe28-blocker-and-attempt-gates.md`). The problem is `design/v1.1-disposition.md` row A5: an adopter's own verification tooling is invisible to the framework, and the risk of making it visible is "the framework claiming credit for assurance it did not establish".

## Scope

#61 only. It does not implement, and does not depend on, typed contributions or warrants (#55, #57), split-subject applicability (#56), or FE-27 and FE-28, which are merged. It touches nothing in `design/fe24-fe26-*` or `design/fe25-*`.

## Binding owner decision

Design-only record for adopter verification gates. A gate reference records **identity, version, execution provenance and result**. An unexecuted gate, or a gate that is merely adopter-asserted, **cannot raise framework assurance**. The owner-finalized criteria are approved unchanged:

- **C0:** Record the design.
- **C1:** Reference an adopter-run gate by identity and version.
- **C2:** Report it as `adopter-asserted` unless the framework executed it.
- **C3:** A planted failure flips the reported result.
- **C4:** An unexecuted gate cannot raise the framework verdict.
- **Rider (unnumbered, in the verbatim file):** Execution provenance and result must accompany the gate reference.

## The shape in one paragraph

A project lists the checks it runs itself under a new policy key, `adopterGates`. Each entry is a **reference** with an identity (`id`), the `version` of the gate that ran, an `execution` block (provenance) and a `result` block. The framework **reads the record and executes nothing**. Every gate that was run is reported `adopter-asserted`; one that was not is reported `unexecuted`; one that is malformed is reported `invalid` and never as its declared result. The only path by which a gate changes the audit is to be *shown*. No code path lets one move a rule, a score or the verdict upward.

## Where it lives, and why

- **A policy key, `adopterGates`**, an array of mappings. Not the claims ledger, not an attempt record, not an extension of FE-28 attempt gates. Attempt gates are free-named, versionless, attempt-owned and carry two evidence fields; an adopter gate is a *named, versioned check the adopter operates continuously*, and folding the two would give one vocabulary two meanings.
- **Why the policy.** The schema (`schemas/project-policy.schema.json`) is the single definition of validity (Standard 37 R5). A reference with no identity or no version, or a result with no provenance, is then rejected by the existing exit-2 path (a configuration error, not a compliance failure), with no new parser. The vendored YAML reader supports block sequences of mappings and nested block mappings, which is all this needs; no block scalar, flow collection or anchor is used.
- **What the schema cannot say.** The vendored evaluator (`scripts/jsonschema.mjs`) supports only `$ref`, `type`, `required`, `properties`, `additionalProperties`, `propertyNames`, `pattern`, `enum`, `const`, `minLength`, `items`, `minItems`, and throws on anything else. There is no `if/then`, `oneOf` or `uniqueItems`. So cross-field rules (an `unrun` gate carries nothing else; an `executed` gate carries everything; identities are unique) belong to a detector rule, in the same split FE-28 used: shape in one place, consistency in the rule.

## Vocabulary

**Execution state**, exactly two: `unrun`, `executed`.
**Recorded outcome**, exactly three: `not-recorded`, `passed`, `failed`. `not-recorded` pairs with `unrun` and with nothing else.
**Reported label**, exactly four, assigned by the framework and never read from the policy:

| Label | Meaning |
| --- | --- |
| `adopter-asserted` | The adopter says it ran the gate and records a result. The framework did not run it and cannot confirm it. Applies to `passed` and to `failed`. |
| `unexecuted` | `unrun`, with no result. Asserts nothing. |
| `invalid` | The record fails a consistency rule. Reported as `invalid`, never as its declared outcome and never as `passed`. The declared outcome is shown beside it. |
| `framework-executed` | The framework itself ran the gate and holds its own record of the run. **Unreachable in this iteration**: there is no framework execution path. The label is defined so the "unless the framework executed it" branch of C2 is a tested, closed set, not an unwritten one. |

`by:` in the policy is **self-declared and never read as framework execution.** An adopter writing `by: math-standards` has made a claim, not produced an observation (fixture `adopter-gates-self-declared-framework`).

## Mapping: criteria to red-first tests

Red-first: each test is written before the schema fragment and rule, and fails for a stated reason on the current main. Test file: `test/fe61-adopter-gates.test.mjs`, in the style of `test/fe28-attempt-gates.test.mjs` (`node:test`, fixtures through the real CLI, no mocks of the evaluator). Proposed module: `scripts/adopter-gates.mjs` exporting `classifyGates(gates, frameworkRuns = new Map())`, `GATE_LABELS` and a report builder. Fixture contents are in the next section.

### C0: record the design

Satisfied by the merge of this record after freeze. Verified by review, not by a runtime test. One guard test: the rule's `$assuranceNote` names `design/fe61-adopter-verification-gates.md` and that file exists (the precedent set by `lifecycle.attempt-gates-valid`).

### C1: reference an adopter-run gate by identity and version

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C1.1 | A gate with `id`, `version`, provenance and result validates: `policy` exits 0 | `adopter-gates-passed` | the key is unknown (`additionalProperties: false`), exit 2 |
| C1.2 | A reference with no `version` is rejected, exit 2, naming `adopterGates[0].version` | `adopter-gates-no-version` | key unknown, different message |
| C1.3 | A reference with no `id` is rejected, exit 2, naming `adopterGates[0].id` | `adopter-gates-no-id` | same |
| C1.4 | Two references whose ids are equal after trim and case-fold are both reported `invalid`, one finding each | `adopter-gates-duplicate-id` | no rule |
| C1.5 | A version that names no version (`latest`, `unknown`, `none`, `n/a`, `tbd`, `head`, `main`, `master`, `current`, `x`, `?`, case-folded) is reported `invalid` | `adopter-gates-placeholder-version` | no rule |
| C1.6 | `audit --json` carries each reference's `id` and `version` unchanged | `adopter-gates-passed` | no report field |
| C1.7 | No policy key: the rule reports `not-evaluated` (no subject), never passed. `adopterGates: []`: reported as "none referenced", not as a pass | any fixture with no key; an inline empty list | no rule |
| C1.8 | The framework names no gate: `scripts/adopter-gates.mjs` contains none of `pvsnp`, `lean-axiom`, `check.ps1`, `planted`, `audit-manifest` (precedent: FE-28 C2) | source scan | file absent |

### Rider: execution provenance and result accompany the reference

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| R.1 | A reference with no `result` is rejected by the schema, exit 2 | `adopter-gates-no-result` | key unknown |
| R.2 | A reference with no `execution` is rejected by the schema, exit 2 | `adopter-gates-no-provenance` | key unknown |
| R.3 | `executed` with missing `subject`, `command`, `evidence`, or a result with no `result.evidence`, is `invalid`, one error per missing field, schema-valid | `adopter-gates-thin-provenance` | no rule |
| R.4 | Evidence that is free text (`ran it, it was fine`), or bare hex such as `defaced`, is not a reference and is `invalid`. The helper is the one FE-28 already ships, `hasReference` from `scripts/attempts.mjs` (a path, an http(s) URL, or `commit <sha>`); nothing is resolved | inline | no rule |
| R.5 | `unrun` carries no `by`, `at`, `subject`, `command`, `evidence` and no result evidence; `unrun` with outcome `passed` is `invalid` | `adopter-gates-unrun-with-result` | no rule |
| R.6 | **No gate is ever printed without its provenance and result.** Every entry of the report, including `unrun`, has an `execution` object and a `result` object (state `unrun`, outcome `not-recorded` for an unrun gate), and the human line shows when, by whom, and against which commit | all valid fixtures | no report |
| R.7 | `at` must be a real date (`2026-11-31` is `invalid`); the schema pattern alone accepts it | inline | no rule |

### C2: report `adopter-asserted` unless the framework executed it

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C2.1 | `executed` and `passed` is reported `passed` with label `adopter-asserted` | `adopter-gates-passed` | no report |
| C2.2 | `executed` and `failed` is reported `failed` with label `adopter-asserted` | `adopter-gates-failed` | no report |
| C2.3 | `by: math-standards` is still `adopter-asserted`: a self-declared executor is not an observation | `adopter-gates-self-declared-framework` | no report |
| C2.4 | Through the CLI, no input at all produces `framework-executed`: over every fixture, the label set is a subset of `adopter-asserted`, `unexecuted`, `invalid` | all | no report |
| C2.5 | The unless-branch is closed: `classifyGates(gates, new Map([["pvsnp-check", record]]))` yields `framework-executed`, and omitting the second argument never does. The parameter has no caller in production code | unit | no function |
| C2.6 | `unrun` is `unexecuted`, never `adopter-asserted` (an unrun gate asserts nothing) | `adopter-gates-unrun` | no report |
| C2.7 | The label vocabulary is exactly four values; an unknown label cannot be produced | unit | no module |
| C2.8 | The human render carries the legend sentence verbatim (below) so a reader cannot take a gate line for framework evidence | `adopter-gates-passed` | no render |

### C3: a planted failure flips the reported result

Design question 4 of the gap check is settled as follows. The framework does not run the adopter's script, so "a planted failure flips the reported result" means a **recorded** failed result flips the **reported** result, and the fixture models the record of a run against a planted `sorry` (the PvsNP `check.ps1` self-test), not the run itself.

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C3.1 | The twins differ in exactly one line, the `outcome:` line (the test diffs the two texts) | `adopter-gates-passed`, `adopter-gates-failed` | no fixtures |
| C3.2 | Reported result for the passed twin is `passed`; for the failed twin it is `failed`; the flip appears in `audit --json`, in the human render, and in the rule's findings (a `failed` record produces a finding; a `passed` one produces none) | the twins | no report |
| C3.3 | The flip follows the record, not the name: renaming `id` in the failed twin still reports `failed` | inline | no report |
| C3.4 | A `failed` record that is also incomplete is reported `invalid` with its declared outcome shown (`invalid (declared failed)`), and is counted under invalid in the summary; it is never read as `passed`, and it is not hidden | inline | no rule |
| C3.5 | The summary counts flip with the record: `passed: 1, failed: 0` against `passed: 0, failed: 1` | the twins | no summary |
| C3.6 | At the default level, `validate` gives the twins the same status and score (the rule is `recommended`, a warning). A project that sets the rule to `required` in its own policy gets `NON_COMPLIANT` on the failed twin only. The framework never escalates the level itself | the twins plus an inline policy | no rule |

### C4: an unexecuted gate cannot raise the framework verdict

The gap check classified C4 as `partial`: it holds vacuously today because nothing reads an adopter gate. This test list pins it before anything does.

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C4.1 | **Differential.** Run `validate --json` on `adopter-gates-credit`, and on a temporary copy with the `adopterGates` block removed. `status`, `score`, `denominator`, `assurance`, `blockedBy`, and every result except `evidence.adopter-gates-recorded` are equal | `adopter-gates-credit` | (passes vacuously today; the point is that it must keep passing; its red-first form is C4.2) |
| C4.2 | Same differential with the rule mutated to credit a `passed` gate (a scratch mutation in the mutation-check style, `scripts/mutation-check.mjs`): the test must go red. This proves C4.1 can detect a violation | scratch mutation | n/a: it guards the guard |
| C4.3 | Every rule the catalog marks manual-review keeps its disposition with the gates present: a `passed` gate does not move one from `not-evaluated` | `adopter-gates-credit` | none today |
| C4.4 | An `unrun` gate leaves verdict, score and every other result unchanged | `adopter-gates-unrun` | none today |
| C4.5 | A `failed` gate does not raise anything: the score is not higher than the stripped copy | `adopter-gates-failed` | none today |
| C4.6 | The Standard 25 envelope is unchanged: same keys, same `schemaVersion`; no `adopterGates` key inside `verdict`, `score` or `assurance` | `adopter-gates-credit` | none today |
| C4.7 | Source guard: `scripts/compliance.mjs` does not mention `adopterGates` or `adopter-gates`. Only the detector and the report builder read the key | source scan | none today |
| C4.8 | The rule's catalog entry is `assurance: partial`, and its `$assuranceNote` states that it cannot establish that a gate was run or that a result is correct; `npm run assurance:check` passes | catalog | no rule |

## Fixtures (full contents)

Each is `test/fixtures/<name>/project-policy.yml`. All thirteen were read by the vendored `scripts/policy.mjs` against the proposed schema in a scratch copy (see "Validation record"); what each is for is stated in its first comment line, and the expected exit code and reported result in the table after the listing. Quoted scalars are used wherever a value could be read as a number or date; the reader returns every scalar as a string.

### `test/fixtures/adopter-gates-unrun/project-policy.yml`

```yaml
# FE-61: a gate reference that was never run. Reported unexecuted, with no result.
standardVersion: "1.0.0"
project: "adopter-gates-unrun"

mathematics:
  regimes:
    - formal

adopterGates:
  - id: lean-axiom-audit
    version: "2.4.0"
    execution:
      state: unrun
    result:
      outcome: not-recorded
```

### `test/fixtures/adopter-gates-passed/project-policy.yml`

```yaml
# FE-61: an adopter-run gate recorded as executed with a passing result. Reported passed,
# adopter-asserted. The twin fixture adopter-gates-failed differs only in the outcome line.
standardVersion: "1.0.0"
project: "adopter-gates"

mathematics:
  regimes:
    - formal

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    execution:
      state: executed
      by: adopter-ci
      at: "2026-11-10"
      subject: "commit 4f3a9c1d2e"
      command: "pwsh ./check.ps1"
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
    result:
      outcome: passed
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
```

### `test/fixtures/adopter-gates-failed/project-policy.yml`

```yaml
# FE-61 C3: identical to adopter-gates-passed except for the outcome line. It models the recorded
# result of a gate run against a planted `sorry`; the framework reads the record and runs nothing.
standardVersion: "1.0.0"
project: "adopter-gates"

mathematics:
  regimes:
    - formal

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    execution:
      state: executed
      by: adopter-ci
      at: "2026-11-10"
      subject: "commit 4f3a9c1d2e"
      command: "pwsh ./check.ps1"
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
    result:
      outcome: failed
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
```

### `test/fixtures/adopter-gates-no-version/project-policy.yml`

```yaml
# FE-61 C1: a gate named with no version. Rejected by the schema (exit 2).
standardVersion: "1.0.0"
project: "adopter-gates-no-version"

adopterGates:
  - id: pvsnp-check
    execution:
      state: unrun
    result:
      outcome: not-recorded
```

### `test/fixtures/adopter-gates-no-id/project-policy.yml`

```yaml
# FE-61 C1: a gate with a version and no identity. Rejected by the schema (exit 2).
standardVersion: "1.0.0"
project: "adopter-gates-no-id"

adopterGates:
  - version: "1.3.0"
    execution:
      state: unrun
    result:
      outcome: not-recorded
```

### `test/fixtures/adopter-gates-no-result/project-policy.yml`

```yaml
# FE-61 rider: execution provenance with no result. Rejected by the schema (exit 2).
standardVersion: "1.0.0"
project: "adopter-gates-no-result"

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    execution:
      state: executed
      by: adopter-ci
      at: "2026-11-10"
      subject: "commit 4f3a9c1d2e"
      command: "pwsh ./check.ps1"
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
```

### `test/fixtures/adopter-gates-no-provenance/project-policy.yml`

```yaml
# FE-61 rider: a result with no execution block. Rejected by the schema (exit 2).
standardVersion: "1.0.0"
project: "adopter-gates-no-provenance"

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    result:
      outcome: passed
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
```

### `test/fixtures/adopter-gates-thin-provenance/project-policy.yml`

```yaml
# FE-61 rider: executed, but the provenance is thin (no command, no subject commit, no evidence)
# and the passing result cites none. Schema-valid, rule-invalid: reported invalid, never passed.
standardVersion: "1.0.0"
project: "adopter-gates-thin-provenance"

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    execution:
      state: executed
      by: adopter-ci
      at: "2026-11-10"
    result:
      outcome: passed
```

### `test/fixtures/adopter-gates-self-declared-framework/project-policy.yml`

```yaml
# FE-61 C2: the adopter writes that the framework ran the gate. The claim is data, not an
# observation: the framework has no execution path, so the gate is still reported adopter-asserted.
standardVersion: "1.0.0"
project: "adopter-gates-self-declared-framework"

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    execution:
      state: executed
      by: math-standards
      at: "2026-11-10"
      subject: "commit 4f3a9c1d2e"
      command: "node scripts/standards.mjs audit ."
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
    result:
      outcome: passed
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
```

### `test/fixtures/adopter-gates-unrun-with-result/project-policy.yml`

```yaml
# FE-61 C4: a gate marked unrun that nonetheless records a passing result. Schema-valid,
# rule-invalid: reported invalid, never passed.
standardVersion: "1.0.0"
project: "adopter-gates-unrun-with-result"

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    execution:
      state: unrun
    result:
      outcome: passed
      evidence: "artifacts/gate-runs/2026-11-10-check.log"
```

### `test/fixtures/adopter-gates-duplicate-id/project-policy.yml`

```yaml
# FE-61 C1: two references with the same identity. Schema-valid, rule-invalid: both reported invalid.
standardVersion: "1.0.0"
project: "adopter-gates-duplicate-id"

adopterGates:
  - id: pvsnp-check
    version: "1.3.0"
    execution:
      state: unrun
    result:
      outcome: not-recorded
  - id: PvsNP-Check
    version: "1.4.0"
    execution:
      state: unrun
    result:
      outcome: not-recorded
```

### `test/fixtures/adopter-gates-placeholder-version/project-policy.yml`

```yaml
# FE-61 C1: a version that names no version. Schema-valid, rule-invalid: reported invalid.
standardVersion: "1.0.0"
project: "adopter-gates-placeholder-version"

adopterGates:
  - id: pvsnp-check
    version: latest
    execution:
      state: unrun
    result:
      outcome: not-recorded
```

### `test/fixtures/adopter-gates-credit/project-policy.yml`

```yaml
# FE-61 C4: a formal-regime project whose every gate is recorded passed. The test runs `validate` on
# this directory and on a copy with the adopterGates block removed, and requires the verdict, the
# score and every rule result other than evidence.adopter-gates-valid to be identical.
standardVersion: "1.0.0"
project: "adopter-gates-credit"

mathematics:
  regimes:
    - formal

adopterGates:
  - id: lean-axiom-audit
    version: "2.4.0"
    execution:
      state: executed
      by: adopter-ci
      at: "2026-11-10"
      subject: "commit 4f3a9c1d2e"
      command: "lake exe audit-manifest"
      evidence: "artifacts/gate-runs/2026-11-10-axioms.log"
    result:
      outcome: passed
      evidence: "artifacts/gate-runs/2026-11-10-axioms.log"
  - id: planted-sorry-self-test
    version: "1.0.0"
    execution:
      state: executed
      by: adopter-ci
      at: "2026-11-10"
      subject: "commit 4f3a9c1d2e"
      command: "pwsh ./check.ps1 -SelfTest"
      evidence: "artifacts/gate-runs/2026-11-10-selftest.log"
    result:
      outcome: passed
      evidence: "artifacts/gate-runs/2026-11-10-selftest.log"
```

| Fixture | `policy` exit | Reported by the proposed rule |
| --- | --- | --- |
| `adopter-gates-unrun` | 0 | `lean-axiom-audit@2.4.0`: not run (unexecuted) |
| `adopter-gates-passed` | 0 | `pvsnp-check@1.3.0`: passed (adopter-asserted) |
| `adopter-gates-failed` | 0 | `pvsnp-check@1.3.0`: failed (adopter-asserted), one finding |
| `adopter-gates-no-version` | 2 | not reached; `adopterGates[0].version: is required but missing` |
| `adopter-gates-no-id` | 2 | not reached; `adopterGates[0].id: is required but missing` |
| `adopter-gates-no-result` | 2 | not reached; `adopterGates[0].result: is required but missing` |
| `adopter-gates-no-provenance` | 2 | not reached; `adopterGates[0].execution: is required but missing` |
| `adopter-gates-thin-provenance` | 0 | invalid: no `subject`, `command`, `evidence`, and no `result.evidence` |
| `adopter-gates-self-declared-framework` | 0 | passed (adopter-asserted) |
| `adopter-gates-unrun-with-result` | 0 | invalid: unrun but records result `passed`, and carries result evidence |
| `adopter-gates-duplicate-id` | 0 | both invalid: share an id |
| `adopter-gates-placeholder-version` | 0 | invalid: version `latest` names no version |
| `adopter-gates-credit` | 0 | both passed (adopter-asserted); verdict identical to the stripped copy |

## Proposed schema fragment

Added to `schemas/project-policy.schema.json`: the property under `properties`, the definition under `$defs`. Nothing else in the schema changes. `additionalProperties: false` at the gate level rejects an `executedBy: framework` key and any other invention. Validated in the scratch copy (see "Validation record").

```json
{
  "properties.adopterGates": {
    "description": "Adopter-run verification gates the project references. The framework records identity, version, execution provenance and result, and reports every one as adopter-asserted; it executes none. A reference is a record of what the adopter says it ran. It is not framework evidence: it never raises a verdict, discharges a rule, or counts toward a score.",
    "type": "array",
    "items": {
      "$ref": "#/$defs/adopterGate"
    }
  },
  "$defs.adopterGate": {
    "type": "object",
    "required": [
      "id",
      "version",
      "execution",
      "result"
    ],
    "additionalProperties": false,
    "properties": {
      "id": {
        "description": "The gate's identity, chosen by the project. Unique within the policy, compared trimmed and case-folded.",
        "type": "string",
        "minLength": 1,
        "pattern": "^[A-Za-z0-9][A-Za-z0-9._-]*$"
      },
      "version": {
        "description": "The version of the gate that was run. Required, never inferred. A string rather than semver: an adopter script may be versioned by a tag or a commit.",
        "type": "string",
        "minLength": 1
      },
      "execution": {
        "description": "Execution provenance. `unrun`, or `executed` with by, at, subject, command and evidence (the rule requires them together).",
        "type": "object",
        "required": [
          "state"
        ],
        "additionalProperties": false,
        "properties": {
          "state": {
            "type": "string",
            "enum": [
              "unrun",
              "executed"
            ]
          },
          "by": {
            "description": "Who or what ran it, as the adopter states it. Self-declared; never read as framework execution.",
            "type": "string",
            "minLength": 1
          },
          "at": {
            "type": "string",
            "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
          },
          "subject": {
            "description": "The repository state the gate ran against: `commit <sha>`, 7 to 40 hex digits.",
            "type": "string",
            "pattern": "^commit:? [0-9a-f]{7,40}$"
          },
          "command": {
            "type": "string",
            "minLength": 1
          },
          "evidence": {
            "description": "A record of the run: a repository path, an http(s) URL, or `commit <sha>`. Shape is checked by the rule; the reference is never resolved.",
            "type": "string",
            "minLength": 1
          }
        }
      },
      "result": {
        "description": "The recorded result. `not-recorded` exactly when execution.state is unrun (the rule checks the pairing).",
        "type": "object",
        "required": [
          "outcome"
        ],
        "additionalProperties": false,
        "properties": {
          "outcome": {
            "type": "string",
            "enum": [
              "not-recorded",
              "passed",
              "failed"
            ]
          },
          "evidence": {
            "description": "A record of the run: a repository path, an http(s) URL, or `commit <sha>`. Shape is checked by the rule; the reference is never resolved.",
            "type": "string",
            "minLength": 1
          }
        }
      }
    }
  }
}
```

## Proposed template fragment

Appended to `templates/project-policy.yml`, commented out as the neighbouring sections are. Uncommented and read through `scripts/policy.mjs` against the proposed schema it validates (exit 0).

```yaml
# --- Adopter verification gates -------------------------------------------------------------------
#
# Checks YOU run (a CI job, a script, a kernel audit) and want recorded here. The framework does not
# run them. Every gate is reported "adopter-asserted": it is your record of what ran, not framework
# evidence, and it never raises a verdict, discharges a rule, or counts toward a score.
#
# A reference needs an identity (id), the version of the gate that ran, how it was run (execution) and
# its result. A gate you have not run is written `state: unrun` with `outcome: not-recorded`. Cite
# evidence as a path, a URL, or `commit <sha>`; free text alone does not count.
#
# adopterGates:
#   - id: lean-axiom-audit
#     version: "2.4.0"
#     execution:
#       state: executed            # unrun | executed
#       by: adopter-ci             # who ran it, as you state it
#       at: "2026-11-10"
#       subject: "commit 4f3a9c1d2e"   # the repository state it ran against
#       command: "lake exe audit-manifest"
#       evidence: "artifacts/gate-runs/2026-11-10-axioms.log"
#     result:
#       outcome: passed            # not-recorded | passed | failed
#       evidence: "artifacts/gate-runs/2026-11-10-axioms.log"
```

## Proposed rule

- **Id:** `evidence.adopter-gates-recorded`. Standard 19 (evidence requirements), category `evidence`, `recommended`, `warning`, `structural`, assurance `partial`, `nonExemptible: false`. `introducedIn` is written `"3.2.0"` as a placeholder, as the FE-28 precedent did; no VERSION change is made and classification stays owner-held.
- **Subject surface:** the policy's `adopterGates` key. With no key, the rule reports `not-evaluated` (no subject). An empty list is reported as "none referenced".
- **Finds, one finding per item, label `OBSERVED` (the record is what was observed):**
  1. a gate with any consistency error (reported `invalid`);
  2. a gate whose recorded result is `failed` (reported `failed (adopter-asserted)`).
  A `passed`, an `unexecuted` or a `none referenced` outcome produces no finding.
- **Does not do:** execute, resolve or read a cited reference, compare `subject` to the audited commit, age `at`, or credit anything.
- **`$assuranceNote` (proposed text):** "Establishes that a gate reference carries identity, version, provenance and a result, and that no incomplete record is mistaken for a pass. It cannot establish that the gate was run, that a cited reference exists, that the subject commit is the one audited, or that a result is correct. Every recorded gate is adopter-asserted. design/fe61-adopter-verification-gates.md defines the record."
- **Remediation (proposed text):** "Give each gate an id, the version that ran, an execution block (state, and for an executed gate: by, at, subject, command, evidence) and a result (outcome and its evidence). Cite a path, a URL or 'commit <sha>'; free text alone does not count. Write a gate you have not run as state: unrun with outcome: not-recorded."

## Consistency rules the rule applies (each error is a finding and makes the gate `invalid`)

- `execution.state: unrun`: no `by`, `at`, `subject`, `command`, `evidence`; `result.outcome` is `not-recorded` and carries no `result.evidence`.
- `execution.state: executed`: all of `by`, `at`, `subject`, `command`, `evidence` are present; `at` is a real calendar date; `execution.evidence` and `result.evidence` each satisfy `hasReference`; `result.outcome` is `passed` or `failed`, not `not-recorded`.
- `version` is not a placeholder (list in C1.5).
- `id` is unique in the policy, trimmed and case-folded.

An `invalid` gate is never counted as `passed` and never as `failed`; it is its own count. Its declared outcome is shown beside it so a recorded failure is not hidden by being malformed.

## Report wording

Human render, added to the audit output beside the research-attempt block (precedent: `Research-attempt records:`):

```
  Adopter-run gates: 4 referenced; the framework executed none of them
    pvsnp-check@1.3.0: failed (adopter-asserted; ran 2026-11-10 by adopter-ci against commit 4f3a9c1d2e)
    lean-axiom-audit@2.4.0: not run (unexecuted)
    zeta-sweep@0.9.1: passed (adopter-asserted; ran 2026-11-09 by local against commit 7be01aa)
    old-check@latest: invalid, declared passed (version 'latest' names no version)
  Adopter-asserted means the project recorded it. The framework did not run it and gives it no assurance credit.
```

Absent key: `  Adopter-run gates: none referenced`.

The legend sentence in the last line is the C2.8 string. It is printed whenever at least one gate is listed.

`audit --json`, a new top-level key beside `researchAttempts` (the audit command computes no verdict, so no envelope is touched):

```json
"adopterGates": {
  "executedByFramework": 0,
  "summary": { "passed": 1, "failed": 1, "notRecorded": 1, "invalid": 1 },
  "gates": [
    {
      "id": "pvsnp-check",
      "version": "1.3.0",
      "reported": "failed",
      "label": "adopter-asserted",
      "declared": { "state": "executed", "outcome": "failed" },
      "execution": { "state": "executed", "by": "adopter-ci", "at": "2026-11-10", "subject": "commit 4f3a9c1d2e", "command": "pwsh ./check.ps1", "evidence": "artifacts/gate-runs/2026-11-10-check.log" },
      "result": { "outcome": "failed", "evidence": "artifacts/gate-runs/2026-11-10-check.log" },
      "errors": []
    }
  ]
}
```

`executedByFramework` is the count of entries labelled `framework-executed`. It is always `0` in this iteration, and is present so a consumer sees the number rather than infers it. A consumer that finds only `adopter-asserted` entries must read that as "reported by the project", not "verified". For an `unrun` gate `execution` is `{ "state": "unrun" }` and `result` is `{ "outcome": "not-recorded" }`: never absent.

`validate` is not changed: no envelope field, no `schemaVersion` advance, no new disposition. The rule appears in the results like any other `recommended` rule.

## Choices for owner review

Each item states a fail-closed default; the Worker implements the default unless the owner decides otherwise at freeze.

1. **Representation.** Default: a policy key, `adopterGates`. Alternatives: a section in an attempt record, or an extension of FE-28 attempt gates. The default gets schema-level rejection for free and keeps the two gate concepts separate. Cost: a policy file grows with run records.
2. **What the schema rejects (exit 2) versus what the rule marks `invalid` (exit 0, a warning).** Default: the schema requires `id`, `version`, `execution.state`, `result.outcome`; everything conditional on state is the rule's. A reference missing identity or version is therefore a configuration error and stops the run, which is the fail-closed reading of C1. Alternative: have the rule report every defect, so a malformed gate never blocks an audit.
3. **What `version` means.** Default: any non-empty string with a rejected placeholder list, not semver, because a gate may be versioned by a tag or a commit. Alternative: require semver or `commit <sha>`.
4. **The provenance field set.** Default: `by`, `at`, `subject`, `command`, `evidence`, all required when `executed`. These are my reading of "execution provenance"; the criteria name none of them. Alternative: drop `command` or add `environment`. Whatever the owner freezes, an executed gate carrying none of them is `invalid`.
5. **The result vocabulary.** Default: `not-recorded`, `passed`, `failed`. There is no `errored`: a run that crashed without a verdict is recorded `failed` with the log as evidence. This is the fail-closed choice; an `errored` value would be one more state a consumer could mistake for neither.
6. **Framework execution.** Default: none in this iteration, so every executed gate is `adopter-asserted` by construction, and `framework-executed` is a defined but unreachable label (C2.4, C2.5). Open question for a future record, not this one: even a gate the framework did run should need its own design before it credits anything; this record does not authorize that. Alternative: omit `framework-executed` from the vocabulary until a path exists.
7. **A failed result.** Default: reported prominently and produces one `OBSERVED` warning finding, with no movement in the verdict or score (a `recommended` rule at `warning` does not make a run `NON_COMPLIANT`). A project that wants a recorded failure to lower its verdict sets the rule to `required` in its own policy, through the existing level mechanism. The framework never escalates the level. Alternative: a recorded failure lowers the verdict by default. Asymmetry stated plainly: a failed adopter assertion may be reported and may lower; a passed one may never raise.
8. **Where it is reported.** Default: the audit output and `audit --json` only; `validate`'s envelope, `schemaVersion` and dispositions are unchanged. Alternative: an `adopterGates` section in the envelope, which would be a schema advance and would collide with the `"3.0"` advance already planned in the #55 and #57 design.
9. **One reference per identity.** Default: `id` is unique in the policy, so a project carries one current reference per gate and keeps history in the evidence logs. Alternative: allow the same `id` at several versions.
10. **Staleness.** Default: not checked. The framework does not compare `subject` to the audited commit and does not age `at`, and the assurance note says so. Alternative: flag a gate whose `subject` differs from the audited HEAD, which needs the audit to read git.
11. **Evidence helper.** Default: reuse `hasReference` from `scripts/attempts.mjs` unchanged (a path, URL or `commit <sha>`; never resolved). Alternative: a stricter helper that resolves repository paths, which would turn "stated" into "present" and is a different assurance claim.
12. **Rule identity and level.** Default: `evidence.adopter-gates-recorded`, Standard 19, `recommended`, `warning`. Alternative: a new Standard and number. Not recommended: the invariant being protected is Standard 19 R6, evidence outranks assertion.
13. **No gate source field.** Default: identity and version only. A field pointing at the gate's source file (where the script lives) is not in C1 and is omitted. Alternative: an optional `source` reference.
14. **Interplay with #55 and #57.** Default: none. A recorded gate could later become a typed `author-asserted` contribution on an attestation; that is a future change to this design, not a coupling here.

## What this does not establish

That an adopter's gate was run, that it ran against the stated commit, that its result is correct, that a cited reference exists, or that the gate checks anything meaningful. The framework checks that the record is complete enough not to be mistaken for a pass, and that no such record changes a verdict. It adds no assurance the framework did not itself establish.

## Delivery rules (after freeze)

- Red-first tests per criterion above, then fixtures, then the schema fragment, then the module and rule, then the audit report, then a CHANGELOG entry under Unreleased, `docs/assurance-report.md` regenerated by `npm run assurance`, an `INSTRUCTIONS.md` paragraph beside the attempt-gates one, and the template block.
- No VERSION change, tag or release. No edit to `design/v1.1-disposition.md` row A5 beyond a pointer note, as A2 and A3 received.
- `introducedIn` is a placeholder; classification and release stay owner-held.

## Validation record

Done while writing this record; none of it is committed. A scratch copy of the tree at 3475ec4 was made with `git archive`, the schema fragment above was applied to the copy, and:

- All thirteen fixtures were read by the vendored `scripts/policy.mjs` against the patched schema. Result: the exit codes in the fixture table (0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0).
- Six further negatives were run through the vendored `scripts/jsonschema.mjs` against the patched schema and were rejected as intended: an `executedBy: framework` key (unknown property), `subject: "defaced"` (does not match required format), `execution.state: framework-executed` (not one of `unrun`, `executed`), `result.outcome: errored` (not one of the three), `at: "11/10/2026"` and `id: "bad id!"` (do not match required format).
- The template fragment, uncommented, validates (exit 0).
- The repository's own `project-policy.yml` still validates against the patched schema, and the patched copy passes all existing tests except one `init` helper test that needs a git checkout the archive lacks (415 of 416). On the unmodified worktree: 416 of 416.
- A scratch prototype of the classifier (not committed; it reuses `hasReference`) was run over the fixtures and produced the reported states in the table, the `invalid` reasons in the "Consistency rules" section, and, when given a framework run record for the id, `framework-executed`; without one, never.
- Not validated, because no rule exists: the detector, the audit render, the JSON report, and the C4 differential. They are specified above and tested only after freeze.
