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

A project lists the checks it runs itself under a new policy key, `adopterGates`. Each entry is a **reference** with an identity (`id`), the `version` of the gate that ran, an `execution` block (provenance) and a `result` block. The framework **reads the record and executes nothing**. Every gate that was run carries the label `adopter-asserted`; one that was not carries `unexecuted`; one that is malformed is reported with the result `invalid`, never as its declared result, and keeps its label. The only path by which a gate changes the audit is to be *shown*, and, when it is malformed or recorded failed, to produce a warning finding. **The rule that reads the gates is credit-inert by construction** (section "Credit-inert by construction"): it can never produce a `passed` result at any level the project sets, so no gate can add a mark to the score, move a rule out of `not-evaluated`, or raise the verdict. A recorded failure or an invalid record may add a failing result, which can only lower a score.

## Where it lives, and why

- **A policy key, `adopterGates`**, an array of mappings. Not the claims ledger, not an attempt record, not an extension of FE-28 attempt gates. Attempt gates are free-named, versionless, attempt-owned and carry two evidence fields; an adopter gate is a *named, versioned check the adopter operates continuously*, and folding the two would give one vocabulary two meanings.
- **Why the policy.** The schema (`schemas/project-policy.schema.json`) is the single definition of validity (Standard 37 R5). A reference with no identity or no version, or a result with no provenance, is then rejected by the existing exit-2 path (a configuration error, not a compliance failure), with no new parser. The vendored YAML reader supports block sequences of mappings and nested block mappings, which is all this needs; no block scalar, flow collection or anchor is used.
- **What the schema cannot say.** The vendored evaluator (`scripts/jsonschema.mjs`) supports only `$ref`, `type`, `required`, `properties`, `additionalProperties`, `propertyNames`, `pattern`, `enum`, `const`, `minLength`, `items`, `minItems`, and throws on anything else. There is no `if/then`, `oneOf` or `uniqueItems`. So cross-field rules (an `unrun` gate carries nothing else; an `executed` gate carries everything; identities are unique) belong to a detector rule, in the same split FE-28 used: shape in one place, consistency in the rule.

## Vocabulary

**Execution state**, exactly two: `unrun`, `executed`. **Word clash, flagged:** FE-28 uses `executed` for "ran, no verdict recorded yet". Here `executed` means "ran, and a result is recorded": an executed adopter gate with no result is `invalid`. The two vocabularies share a word and not a meaning; the rule's messages say "adopter gate" every time, and Choice 15 offers a rename.
**Recorded outcome**, exactly three: `not-recorded`, `passed`, `failed`. `not-recorded` pairs with `unrun` and with nothing else.
**Label**, exactly three, assigned by the framework from what it observed and never read from the policy. The label answers C2 ("who established it") and is independent of whether the record is well formed:

| Label | Meaning |
| --- | --- |
| `adopter-asserted` | Declared state is `executed`. The adopter says it ran the gate and records a result. The framework did not run it and cannot confirm it. Applies to `passed`, to `failed` and to a malformed executed record alike. |
| `unexecuted` | Declared state is `unrun`. Asserts nothing. |
| `framework-executed` | The framework itself ran the gate and holds its own record of the run. **Unreachable in this iteration**: there is no framework execution path. The label is defined so the "unless the framework executed it" branch of C2 is a tested, closed set, not an unwritten one. |

**Validity** is a separate field, `valid` (true or false), plus `errors`. **Reported result**, exactly four: `passed`, `failed`, `not-recorded` (the result of a valid unrun gate) and `invalid`. A gate with any consistency error has the reported result `invalid`, never its declared result and never `passed`, and keeps its label and its declared outcome in the report (`invalid, declared failed; adopter-asserted`). Keeping the label on an invalid record is what C2 literally asks ("report it as adopter-asserted unless the framework executed it"), and it keeps a recorded failure visible when the record is also malformed (C3.4).

`by:` in the policy is **self-declared and never read as framework execution.** An adopter writing `by: math-standards` has made a claim, not produced an observation (fixture `adopter-gates-self-declared-framework`).

## Credit-inert by construction

**The hazard (found in review of the first draft).** In `scripts/compliance.mjs` the level is `declared?.level ?? rule.level`, and the score's denominator `scored` is every project-subject rule at level `required` that is not `skipped` (or is blocked). A rule that is `skipped / not-evaluated / no-subject` is outside the denominator. So if the project sets a gate rule to `required`, and any well-formed record (an empty list, an unrun gate, an adopter-asserted `passed`) turned that rule from skipped into `passed`, the rule would move inside the denominator with a mark, and the score would rise (for example 4 of 5 become 5 of 6). That is exactly the credit C4 forbids, reached through the project's own level setting, with no framework execution at all. The first draft's claim that nothing could move a score upward was false for that path; this section replaces it.

**The fail-closed design.** The rule is specified so that it can never produce `passed`, at any level:

1. The rule's subject surface for scoring purposes is `adopter-gates-credit`, a resolver in `scripts/surfaces.mjs` that is **defined to return `resolved-empty` always**: the count of credit-bearing candidates in an adopter-asserted record is zero by definition, because an adopter assertion is not framework evidence (Standard 19 R6, evidence outranks assertion). The gates are still read and reported (the `adopterGates` report counts them); only the scoring surface is empty. This uses the existing tri-state of `design/v1.2-evidence-provenance.md` unchanged: with no finding, the engine's existing branch (`hits.length === 0` and `no-subject`) yields `skipped / not-evaluated`, which `scored` excludes.
2. **Result by input, at every level (`required`, `recommended`, `optional`):**

| Input | Rule result | In the denominator | Verdict effect |
| --- | --- | --- | --- |
| key absent | `skipped / not-evaluated / no-subject` | no | none |
| `adopterGates: []` | `skipped / not-evaluated / no-subject` | no | none |
| only `unrun` gates, valid | `skipped / not-evaluated / no-subject` | no | none |
| valid `passed` gates | `skipped / not-evaluated / no-subject` | no | none |
| a recorded `failed` or any `invalid` gate | `failed` (finding, label `OBSERVED`) | at `required` only | at `required` the score can only fall; at `recommended`, a warning and nothing else |

3. The `skipped` result carries a reason that distinguishes it from "nothing to inspect" (the v1.2 precedent: the distinction lives in the reason string, not in a new disposition or a new envelope bucket): "N adopter-run gate(s) recorded; adopter-asserted records are not framework evidence and earn no credit". The existing `denominator.noSubject` counter therefore counts this rule whether or not gates are present, and **no envelope field, bucket or `schemaVersion` changes**.
4. The rule is `structural`, so the catalog derives it as not attestable (`attestable` defaults to `validationType === "manual-review"`): an attestation on it falls through and cannot discharge it. A test pins that.
5. What moves when a project adds gates: the rule's own result message, and nothing else in `validate` (C4.1). In particular **the Cover counts, the assurance counts, the denominator and its named parts, `summary.passed` and `summary.skipped` do not move**; they were already counting this rule as skipped / no-subject.

**Why not "setting it `required` is rejected".** That would need a new policy check and a new refusal path for one rule. The design above needs none: a project may set the rule to `required`, and the only thing that does is make a recorded failure or an invalid record fail instead of warn. It is listed as Choice 7, with the rejection alternative.

**Residual limit.** The reason text says "no subject" in the bucket sense while a record exists. It is honest in the reason, not in the bucket name. A reader of `denominator.noSubject` alone cannot tell this rule from a rule with nothing to inspect; the `adopterGates` audit report and the reason string can. Making the bucket distinct is an envelope change and is Choice 7's alternative.

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
| C1.7 | **Inspection state for absent, empty and all-unrun.** No policy key, `adopterGates: []`, and a list of only valid `unrun` gates each give the rule `skipped / not-evaluated / no-subject`, in the human render and in `validate --json` (`results[].notEvaluatedBecause`), at the default level and with the rule set to `required`. The audit report says "none referenced" for the first two and lists the unrun gates for the third. Never `passed` | no key (`math-compliant`); inline `[]`; `adopter-gates-unrun` | no rule |
| C1.8 | The framework names no gate: `scripts/adopter-gates.mjs` contains none of `pvsnp`, `lean-axiom`, `check.ps1`, `planted`, `audit-manifest` (precedent: FE-28 C2) | source scan | file absent |

### Rider: execution provenance and result accompany the reference

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| R.1 | A reference with no `result` is rejected by the schema, exit 2 | `adopter-gates-no-result` | key unknown |
| R.2 | A reference with no `execution` is rejected by the schema, exit 2 | `adopter-gates-no-provenance` | key unknown |
| R.3 | `executed` with missing `subject`, `command`, `evidence`, or a result with no `result.evidence`, is `invalid`, one error per missing field, schema-valid | `adopter-gates-thin-provenance` | no rule |
| R.4 | Evidence that is free text (`ran it, it was fine`), a placeholder (`n/a`, `N/A`, `none`, `tbd`, `todo`, `unknown`, `-`, case-folded, alone or as the whole value), or bare hex such as `defaced`, is not a reference and is `invalid`. The helper is a **stricter wrapper**, `isGateReference`, over the FE-28 `hasReference` from `scripts/attempts.mjs` (a path, an http(s) URL, or `commit <sha>`): it rejects the placeholder set first. **The leak this closes, measured:** `hasReference("n/a")` is `true` today, because `n/a` contains a slash and counts as path-shaped. A test pins that the wrapper rejects it while FE-28's helper is left unchanged. **A leak that remains and is stated:** a bare file name such as `check.ps1` is accepted, and nothing resolves it, so a cited path that does not exist still counts as stated (test pins acceptance, as FE-28 does). Nothing is resolved | inline | no rule |
| R.5 | `unrun` carries no `by`, `at`, `subject`, `command`, `evidence` and no result evidence; `unrun` with outcome `passed` is `invalid` | `adopter-gates-unrun-with-result` | no rule |
| R.6 | **No gate is ever printed without its provenance and result.** Every entry of the report, including `unrun`, has an `execution` object and a `result` object (state `unrun`, outcome `not-recorded` for an unrun gate), and the human line shows when, by whom, and against which commit | all valid fixtures | no report |
| R.7 | `at` must be a real date (`2026-11-31` is `invalid`); the schema pattern alone accepts it | inline | no rule |

### C2: report `adopter-asserted` unless the framework executed it

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C2.1 | `executed` and `passed` is reported `passed` with label `adopter-asserted` | `adopter-gates-passed` | no report |
| C2.2 | `executed` and `failed` is reported `failed` with label `adopter-asserted` | `adopter-gates-failed` | no report |
| C2.3 | `by: math-standards` is still `adopter-asserted`: a self-declared executor is not an observation | `adopter-gates-self-declared-framework` | no report |
| C2.4 | Through the CLI, no input at all produces `framework-executed`: over every fixture, the label set is a subset of `adopter-asserted`, `unexecuted`. An invalid executed record (`adopter-gates-thin-provenance`) is still labelled `adopter-asserted`, with `valid: false` and reported result `invalid` | all | no report |
| C2.5 | The unless-branch is closed: `classifyGates(gates, new Map([["pvsnp-check", record]]))` yields `framework-executed`, and omitting the second argument never does. The parameter has no caller in production code | unit | no function |
| C2.6 | `unrun` is `unexecuted`, never `adopter-asserted` (an unrun gate asserts nothing) | `adopter-gates-unrun` | no report |
| C2.7 | The label vocabulary is exactly three values (`adopter-asserted`, `unexecuted`, `framework-executed`) and the reported-result vocabulary exactly four; `valid` is a boolean separate from both; an unknown value cannot be produced | unit | no module |
| C2.8 | The human render carries the legend sentence verbatim (below) so a reader cannot take a gate line for framework evidence | `adopter-gates-passed` | no render |

### C3: a planted failure flips the reported result

Design question 4 of the gap check is proposed as follows, and **is an interpretation the owner must ratify (Choice 16)**: the owner-finalized C3 does not name a fixture or say who plants the failure. The framework does not run the adopter's script, so "a planted failure flips the reported result" is read as: a **recorded** failed result flips the **reported** result, and the fixture models the record of a run against a planted `sorry` (the PvsNP `check.ps1` self-test), not the run itself. If the owner intends the framework to execute a planted-failure check, that needs a framework execution path, which this record does not authorize.

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C3.1 | After removing comment lines (lines whose first non-blank character is `#`; the two header comments differ on purpose), the twins differ in exactly one line, the `outcome:` line. The test strips comments and diffs the remainder | `adopter-gates-passed`, `adopter-gates-failed` | no fixtures |
| C3.2 | Reported result for the passed twin is `passed`; for the failed twin it is `failed`; the flip appears in `audit --json`, in the human render, and in the rule's findings (a `failed` record produces a finding; a `passed` one produces none) | the twins | no report |
| C3.3 | The flip follows the record, not the name: renaming `id` in the failed twin still reports `failed` | inline | no report |
| C3.4 | A `failed` record that is also incomplete has reported result `invalid`, `valid: false`, label `adopter-asserted` and declared outcome `failed` (human line: `invalid, declared failed`), is counted under invalid in the summary, and is also counted under `declaredFailed`; it is never read as `passed`, and it is not hidden | inline | no rule |
| C3.5 | The summary counts flip with the record: `passed: 1, failed: 0` against `passed: 0, failed: 1` | the twins | no summary |
| C3.6 | At the default level, `validate` gives the twins the same status and score (the rule is `recommended`, a warning). A project that sets the rule to `required` in its own policy gets `NON_COMPLIANT` on the failed twin only. The framework never escalates the level itself | the twins plus an inline policy | no rule |

### C4: an unexecuted gate cannot raise the framework verdict

The gap check classified C4 as `partial`: it holds vacuously today because nothing reads an adopter gate. This test list pins it before anything does.

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C4.1 | **Differential, strict.** Build a temporary copy of `test/fixtures/math-compliant` (an otherwise `COMPLIANT`, 100% baseline: measured, 22 scored rules) with the `adopter-gates-credit-block` appended to its policy; run `validate --json` on it and on an untouched copy. **Everything is equal except one field:** `status`, `score`, `scoreUnavailable`, `summary`, `assurance` (automated, manual-review and not-evaluated counts: the Cover line), `denominator` (every named part, including `scored`, `applicable`, `total` and `noSubject`), `blockedBy`, `foreignFailures`, the envelope keys and `schemaVersion`, and every `results[]` entry, with the single exception of the `message` text of `evidence.adopter-gates-recorded`. Cover and assurance counts **may not** move | `math-compliant` + `adopter-gates-credit-block` | passes vacuously today; its red-first form is C4.2 |
| C4.2 | Guard the guard: a scratch mutation (in the `scripts/mutation-check.mjs` style) makes the rule return `passed` for valid gates. C4.1, C4.9 and C4.10 must go red. This proves the differential can detect a violation | scratch mutation | n/a |
| C4.3 | Every rule the catalog marks manual-review keeps its disposition with the gates present: a `passed` gate does not move one from `not-evaluated` | `math-compliant` + block | none today |
| C4.4 | An `unrun` gate (the `adopter-gates-unrun` gate appended to `math-compliant`) leaves everything C4.1 lists equal, with the same single-message exception | `math-compliant` + unrun gate | none today |
| C4.5 | A recorded `failed` gate at the default level: `status`, `score`, `assurance`, `denominator` equal to the baseline (a `recommended` rule at `warning` does not score); one `OBSERVED` warning finding appears; nothing is higher than baseline | `math-compliant` + failed twin gate | none today |
| C4.6 | The Standard 25 envelope is unchanged: same keys, same `schemaVersion`; no `adopterGates` key inside `verdict`, `score`, `assurance` or `denominator` | `math-compliant` + block | none today |
| C4.9 | **Required-level pin (the reviewed hazard).** With `rules: { evidence.adopter-gates-recorded: { level: required } }` added to the policy, for each of: key absent, `adopterGates: []`, only unrun, valid `passed`: the rule's result is `skipped / not-evaluated / no-subject`, `results[].scored` is false, and `status`, `score` (100), `denominator.scored` (22), `assurance` and `summary` equal the baseline. A score above baseline, or a `scored: true` result for the rule, fails the test | `math-compliant` + four inline variants | none today |
| C4.10 | **Required-level, the permitted direction.** Same setting with a recorded `failed` gate, and with an invalid record (`adopter-gates-thin-provenance` gate): the rule is `failed`, `scored: true`, `denominator.scored` is 23, `status` is `NON_COMPLIANT` and `score` is below 100. A failure or an invalid record can lower a score and can never raise one | `math-compliant` + inline variants | none today |
| C4.11 | An attestation entered against `evidence.adopter-gates-recorded` does not discharge it: the result is unchanged from the same policy without the attestation (the rule is not attestable) | `math-compliant` + block + attestation | none today |
| C4.7 | Source guard: `scripts/compliance.mjs` does not mention `adopterGates` or `adopter-gates`. Only the detector and the report builder read the key | source scan | none today |
| C4.8 | The rule's catalog entry is `assurance: partial`, and its `$assuranceNote` states that it cannot establish that a gate was run or that a result is correct; `npm run assurance:check` passes | catalog | no rule |

## Fixtures (full contents)

Each is `test/fixtures/<name>/project-policy.yml`. Twelve are stand-alone policies, read by the vendored `scripts/policy.mjs` against the proposed schema in a scratch copy; the thirteenth is a block appended to `math-compliant` (see "Validation record"); what each is for is stated in its first comment line, and the expected exit code and reported result in the table after the listing. Quoted scalars are used wherever a value could be read as a number or date; the reader returns every scalar as a string.

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

### `test/fixtures/adopter-gates-credit-block.yml`

Not a standalone policy. The C4 tests copy `test/fixtures/math-compliant` (measured in the scratch copy: `COMPLIANT`, 100%, 22 scored rules, so a rise or a fall is visible), append this block to the copy's `project-policy.yml`, and compare against an untouched copy. An earlier draft used a stand-alone policy that was already `NON_COMPLIANT` at 80%; a differential on a failing baseline cannot show a rise cleanly.

```yaml
# FE-61 C4 block, appended by the test to a temporary copy of test/fixtures/math-compliant (an
# otherwise COMPLIANT, 100% baseline). Every gate is recorded passed.
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
| `adopter-gates-credit-block` (appended to `math-compliant`) | 0 | both passed (adopter-asserted); every `validate` field identical to the untouched copy except the rule's message |

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
- **Subject surface:** the scoring surface is `adopter-gates-credit`, which is `resolved-empty` always (see "Credit-inert by construction"). The policy's `adopterGates` key is read for findings and for the audit report, not as a credit-bearing subject. With no findings the rule is `skipped / not-evaluated / no-subject` at every level, for an absent key, an empty list, only-unrun gates, and valid `passed` gates alike.
- **Finds, one finding per item, label `OBSERVED` (the record is what was observed):**
  1. a gate with any consistency error (reported result `invalid`, label kept);
  2. a gate whose recorded result is `failed` (reported `failed`, label `adopter-asserted`).
  A `passed`, an `unexecuted` or a `none referenced` outcome produces no finding, and **no input produces a `passed` result for the rule**.
- **Does not do:** execute, resolve or read a cited reference, compare `subject` to the audited commit, age `at`, or credit anything.
- **`$assuranceNote` (proposed text):** "Establishes that a gate reference carries identity, version, provenance and a result, and that no incomplete record is mistaken for a pass. It cannot establish that the gate was run, that a cited reference exists, that the subject commit is the one audited, or that a result is correct. Every recorded gate is adopter-asserted. design/fe61-adopter-verification-gates.md defines the record."
- **Remediation (proposed text):** "Give each gate an id, the version that ran, an execution block (state, and for an executed gate: by, at, subject, command, evidence) and a result (outcome and its evidence). Cite a path, a URL or 'commit <sha>'; free text alone does not count. Write a gate you have not run as state: unrun with outcome: not-recorded."

## Consistency rules the rule applies (each error is a finding and makes the gate `invalid`)

- `execution.state: unrun`: no `by`, `at`, `subject`, `command`, `evidence`; `result.outcome` is `not-recorded` and carries no `result.evidence`.
- `execution.state: executed`: all of `by`, `at`, `subject`, `command`, `evidence` are present; `at` is a real calendar date; `execution.evidence` and `result.evidence` each satisfy `isGateReference` (the placeholder-rejecting wrapper over `hasReference`; see R.4); `result.outcome` is `passed` or `failed`, not `not-recorded`.
- `version` is not a placeholder (list in C1.5).
- `id` is unique in the policy, trimmed and case-folded.

An `invalid` gate is never counted as `passed` and never as `failed`; it is its own count, and its label stays `adopter-asserted` (or `unexecuted`). Its declared outcome is shown beside it, and a declared `failed` is also counted under `declaredFailed`, so a recorded failure is not hidden by being malformed.

## Report wording

Human render, added to the audit output beside the research-attempt block (precedent: `Research-attempt records:`):

```
  Adopter-run gates: 4 referenced; the framework executed none of them
    pvsnp-check@1.3.0: failed (adopter-asserted; ran 2026-11-10 by adopter-ci against commit 4f3a9c1d2e)
    lean-axiom-audit@2.4.0: not run (unexecuted)
    zeta-sweep@0.9.1: passed (adopter-asserted; ran 2026-11-09 by local against commit 7be01aa)
    old-check@latest: invalid, declared passed (adopter-asserted; version 'latest' names no version)
  Adopter-asserted means the project recorded it. The framework did not run it and gives it no assurance credit.
```

Absent key: `  Adopter-run gates: none referenced`.

The legend sentence in the last line is the C2.8 string. It is printed whenever at least one gate is listed.

`audit --json`, a new top-level key beside `researchAttempts` (the audit command computes no verdict, so no envelope is touched):

```json
"adopterGates": {
  "executedByFramework": 0,
  "summary": { "passed": 1, "failed": 1, "notRecorded": 1, "invalid": 1, "declaredFailed": 1 },
  "gates": [
    {
      "id": "pvsnp-check",
      "version": "1.3.0",
      "reported": "failed",
      "valid": true,
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

`validate` is not changed: no envelope field, no `schemaVersion` advance, no new disposition, no new denominator bucket. The rule appears in the results like any other `recommended` rule, as `skipped / not-evaluated` unless it has a finding.

## Choices for owner review

Each item states a fail-closed default; the Worker implements the default unless the owner decides otherwise at freeze.

1. **Representation.** Default: a policy key, `adopterGates`. Alternatives: a section in an attempt record, or an extension of FE-28 attempt gates. The default gets schema-level rejection for free and keeps the two gate concepts separate. Cost: a policy file grows with run records.
2. **What the schema rejects (exit 2) versus what the rule marks `invalid` (exit 0, a warning).** Default: the schema requires `id`, `version`, `execution.state`, `result.outcome`; everything conditional on state is the rule's. A reference missing identity or version is therefore a configuration error and stops the run, which is the fail-closed reading of C1. Alternative: have the rule report every defect, so a malformed gate never blocks an audit.
3. **What `version` means.** Default: any non-empty string with a rejected placeholder list, not semver, because a gate may be versioned by a tag or a commit. Alternative: require semver or `commit <sha>`.
4. **The provenance field set.** Default: `by`, `at`, `subject`, `command`, `evidence`, all required when `executed`. These are my reading of "execution provenance"; the criteria name none of them. Alternative: drop `command` or add `environment`. Whatever the owner freezes, an executed gate carrying none of them is `invalid`.
5. **The result vocabulary.** Default: `not-recorded`, `passed`, `failed`. There is no `errored`: a run that crashed without a verdict is recorded `failed` with the log as evidence. This is the fail-closed choice; an `errored` value would be one more state a consumer could mistake for neither.
6. **Framework execution.** Default: none in this iteration, so every executed gate is `adopter-asserted` by construction, and `framework-executed` is a defined but unreachable label (C2.4, C2.5). Open question for a future record, not this one: even a gate the framework did run should need its own design before it credits anything; this record does not authorize that. Alternative: omit `framework-executed` from the vocabulary until a path exists.
7. **Credit and failure at `required`.** Default (fail-closed, never credits): the rule can never produce `passed` at any level, by the `resolved-empty` scoring surface in "Credit-inert by construction". A project may set it to `required`; the effect is only that a recorded `failed` or an invalid record fails in the denominator (lowering the score) instead of warning. At the default level a recorded failure is one `OBSERVED` warning with no movement in the verdict or score. The framework never escalates the level. Asymmetry: a failed adopter assertion may be reported and may lower; a passed one may never raise. Alternatives: (a) reject `required` for this rule outright (a new refusal path); (b) a distinct `adopter-asserted` bucket in `denominator`, so `noSubject` does not count a rule that has records (an envelope change, and a collision with the `"3.0"` advance planned in #55 and #57); (c) a recorded failure lowers the verdict by default.
8. **Where it is reported.** Default: the audit output and `audit --json` only; `validate`'s envelope, `schemaVersion` and dispositions are unchanged. Alternative: an `adopterGates` section in the envelope, which would be a schema advance and would collide with the `"3.0"` advance already planned in the #55 and #57 design.
9. **One reference per identity.** Default: `id` is unique in the policy, so a project carries one current reference per gate and keeps history in the evidence logs. Alternative: allow the same `id` at several versions.
10. **Staleness.** Default: not checked. The framework does not compare `subject` to the audited commit and does not age `at`, and the assurance note says so. Alternative: flag a gate whose `subject` differs from the audited HEAD, which needs the audit to read git.
11. **Evidence helper.** Default: `isGateReference`, a wrapper that rejects placeholder values (`n/a`, `none`, `tbd`, `todo`, `unknown`, `-`) and then applies FE-28's `hasReference` unchanged (a path, URL or `commit <sha>`; never resolved). The stated leaks: `hasReference("n/a")` is `true` today (it contains a slash), which the wrapper closes for gates only, leaving FE-28 as merged; a bare file name such as `check.ps1` is accepted although nothing resolves it. Alternatives: use `hasReference` unchanged (leaks `n/a`); a stricter helper that resolves repository paths, which turns "stated" into "present", a different assurance claim.
12. **Rule identity and level.** Default: `evidence.adopter-gates-recorded`, Standard 19, `recommended`, `warning`. Alternative: a new Standard and number. Not recommended: the invariant being protected is Standard 19 R6, evidence outranks assertion.
13. **No gate source field.** Default: identity and version only. A field pointing at the gate's source file (where the script lives) is not in C1 and is omitted. Alternative: an optional `source` reference.
14. **Interplay with #55 and #57, and a term mismatch to name.** Default: no coupling. The #55 and #57 record reports a machine-established contribution as `author-asserted` ("asserted by the attestation's author, not re-run"); this record reports `adopter-asserted`, because the criterion C2 is worded so. They are the same stance (the framework did not run it and gives no credit) under two names, and one carries an attestation author, the other a project. If both land, the owner should unify the names or state that they differ; this record does not decide it. A recorded gate could later become a typed contribution; that is a future change, not a coupling here.
15. **The `executed` word clash with FE-28.** Default: keep `unrun` and `executed` for continuity with the attempt gates, with the difference stated (here `executed` requires a result). Alternative: name the adopter-gate states `unrun` and `ran`, which removes the clash and costs a rename in the schema, fixtures and tests.
16. **Ratify the C3 reading.** The owner-finalized C3 does not name a fixture or say who plants the failure. Proposed: "a planted failure flips the reported result" means a recorded failed result flips the reported result; the framework executes nothing. Needs an explicit owner yes. If the owner means a framework-run planted-failure check, that is a framework execution path, which this record does not authorize and would need its own design.

## What this does not establish

That an adopter's gate was run, that it ran against the stated commit, that its result is correct, that a cited reference exists, or that the gate checks anything meaningful. The framework checks that the record is complete enough not to be mistaken for a pass, and that no such record changes a verdict. It adds no assurance the framework did not itself establish.

## Delivery rules (after freeze)

- Red-first tests per criterion above, then fixtures, then the schema fragment, then the module and rule, then the audit report, then a CHANGELOG entry under Unreleased, `docs/assurance-report.md` regenerated by `npm run assurance`, an `INSTRUCTIONS.md` paragraph beside the attempt-gates one, and the template block.
- No VERSION change, tag or release. No edit to `design/v1.1-disposition.md` row A5 beyond a pointer note, as A2 and A3 received.
- `introducedIn` is a placeholder; classification and release stay owner-held.

## Validation record

Done while writing this record; none of it is committed. A scratch copy of the tree at 3475ec4 was made with `git archive`, the schema fragment above was applied to the copy, and:

- The twelve stand-alone fixtures were read by the vendored `scripts/policy.mjs` against the patched schema. Result: the exit codes in the fixture table (0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0). The thirteenth, `adopter-gates-credit-block`, was appended to a copy of `test/fixtures/math-compliant`: the policy validates (exit 0) and the existing engine reports `COMPLIANT`, 100, 22 scored (the baseline for C4.1; the engine ignores the new key today, as expected).
- Six further negatives were run through the vendored `scripts/jsonschema.mjs` against the patched schema and were rejected as intended: an `executedBy: framework` key (unknown property), `subject: "defaced"` (does not match required format), `execution.state: framework-executed` (not one of `unrun`, `executed`), `result.outcome: errored` (not one of the three), `at: "11/10/2026"` and `id: "bad id!"` (do not match required format).
- The template fragment, uncommented, validates (exit 0).
- The repository's own `project-policy.yml` still validates against the patched schema, and the patched copy passes all existing tests except one `init` helper test that needs a git checkout the archive lacks (415 of 416). On the unmodified worktree: 416 of 416.
- A scratch prototype of the classifier (not committed; it reuses `hasReference`) was run over the fixtures and produced the reported states in the table, the `invalid` reasons in the "Consistency rules" section, and, when given a framework run record for the id, `framework-executed`; without one, never. The prototype's `invalid` label was a first-draft shape; the record now keeps the label and reports `valid: false`, a field-level change the prototype did not need to re-run.
- Not validated, because no rule exists: the detector, the `adopter-gates-credit` resolver and the no-subject mapping it relies on (read from `scripts/compliance.mjs` and `design/v1.2-evidence-provenance.md`, not run), the audit render, the JSON report, the `required`-level tests C4.9 and C4.10, and the C4 differential. They are specified above and tested only after freeze.
