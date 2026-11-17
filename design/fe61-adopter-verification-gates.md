# FE-61 design record: adopter verification gates

**Status: DRAFT, awaiting owner freeze. Implementation of #61 is not authorized until the owner freezes this record.** Nothing here is implemented. The pull request that carries this record changes no code, schema, rule, fixture, VERSION or CHANGELOG file; every schema fragment, fixture, template block, test and report line below is proposed text.
**Authority:** the owner-finalized criteria for #61, `finalized-criteria-2026-11-16.md` (C0 to C4 and the unnumbered rider), and the owner's binding decision below. This record adds no acceptance criterion.
**Evidence base:** the gap-check report for #61 (`ac-gap-check/report.md`, main 14562f6) and the live repository at 3475ec4, re-checked against main 11e6a14 (a design-only change: no `scripts/` or `rules/` difference). The pattern is the merged FE-28 attempt gates (`scripts/attempts.mjs`, `design/fe27-fe28-blocker-and-attempt-gates.md`). The problem is `design/v1.1-disposition.md` row A5: an adopter's own verification tooling is invisible to the framework, and the risk of making it visible is "the framework claiming credit for assurance it did not establish".

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

A project lists the checks it runs itself under a new policy key, `adopterGates`. Each entry is a **reference** with an identity (`id`), the `version` of the gate that ran, an `execution` block (provenance) and a `result` block. The framework **reads the record and executes nothing**. Every gate that was run carries the label `adopter-asserted`; one that was not carries `unexecuted`; one that is malformed is reported with the result `invalid`, never as its declared result, and keeps its label. The only path by which a gate changes the audit output is to be *shown*: in the `audit` report and, for a recorded failure or an invalid record, in the reason text of the rule's inspected surface. **The rule that reads the gates is credit-inert by construction** (section "Credit-inert by construction"): by default it stays `skipped / not-evaluated / no-subject` at every level and for every input, so no gate adds a mark to the score, moves a rule out of `not-evaluated`, changes a Cover or assurance count, or touches the verdict. The cost, stated plainly: under this default a recorded failure **cannot lower a score either**. Letting a failure count is a different, owner-decided design with a stated Cover movement (Choice 7, options B and C).

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

**Second hazard (found in the second review): leaving `skipped` is itself a movement.** Reading `summarise()` in `scripts/compliance.mjs`: a `skipped` result increments `assurance.notEvaluated`; a manual-review rule increments `assurance.manualReview`; **every other result increments `assurance.automated`**. So if a recorded failure or an invalid record made the rule produce a hit (a `warning` at `recommended`, a `failed` at `required`), then for that one rule `assurance.automated` rises by 1, `assurance.notEvaluated` falls by 1, `summary.skipped` falls by 1 and `summary.warnings` (or `summary.failed`) rises by 1; at `required` `denominator.scored` also rises by 1. The Cover line is "N automated, N manual-review, N not-evaluated", so an adopter-asserted record would **raise the automated count** and lower the not-evaluated count. That contradicts C4 and Standard 19 R6 even though the verdict direction is down. The earlier draft of this record claimed the opposite (that only the message moved). That claim was wrong and is withdrawn.

**The fail-closed default (Option A): the rule never leaves `skipped`.** No input, at any level, makes the rule produce a hit.

1. The rule's surface is `adopter-gates`, a resolver in `scripts/surfaces.mjs` that is **defined to return `resolved-empty` always** (the count of credit-bearing candidates in an adopter-asserted record is zero by definition: an adopter assertion is not framework evidence, Standard 19 R6). The detector registers no hits. With zero hits on a project-subject rule whose surface is `no-subject`, the engine's existing branch yields `skipped / not-evaluated / no-subject`, and `scored` excludes it. **New use of the tri-state, stated:** in `design/v1.2-evidence-provenance.md`, `resolved-empty` means "the surface resolved and there is nothing in it". Here it means "the surface resolved, and what is in it is deliberately not offered as evidence". The gates are read; they are not counted as inspectable material. That is a new use of the existing state, not a new state, and Choice 7 lists the alternative that adds a state.
2. **Result by input, at every level (`required`, `recommended`, `optional`):**

| Input | Rule result | Cover / assurance / denominator / summary | Where the gate is visible |
| --- | --- | --- | --- |
| key absent | `skipped / not-evaluated / no-subject` | unchanged | audit: "none referenced" |
| `adopterGates: []` | same | unchanged | audit: "none referenced" |
| only `unrun` gates, valid | same | unchanged | audit report; `validate --json` surface reason |
| valid `passed` gates | same | unchanged | audit report; `validate --json` surface reason |
| a recorded `failed` or any `invalid` gate | same | unchanged | audit report and human render; `validate --json` surface reason |

3. **Where the finding lives (default renders only).** The `results[]` entry's `message` is the engine's hard-coded text for the no-subject branch (`The detector for evidence.adopter-gates-recorded had no evidence surface to inspect.`) and does **not** vary with the gates. The only `validate` field that varies is `results[evidence.adopter-gates-recorded].inspected.surfaces[0].reason`, produced by the resolver through `resolved(items, { reason })` and carried by `inspectionFor`; that entry exists in `validate --json`. The default human `validate` render prints surface reasons only for blocked or unresolved rows, so the default render shows nothing about gates. The `--provenance` render (`renderProvenance` in `scripts/standards.mjs`) does print every inspected rule, and unmodified it would say "adopter-run gate references: 0 — nothing of this kind was present" and "Nothing to inspect, so the rule was not evaluated. This is not a failure.", which is misleading when a failed gate is recorded. The design therefore specifies: for this one surface `renderProvenance` prints the surface `reason` (for example "2 adopter-run gate(s) recorded (1 failed, 0 invalid); adopter-asserted records are not framework evidence and earn no credit") in place of the "nothing of this kind was present" note, and replaces the "This is not a failure" line with "Adopter-asserted records are listed by `audit`; they are not inspected as evidence." The surface `count` stays 0 and its state stays `resolved-empty`, so no `validate --json` count moves. That is a small change in `renderProvenance`, listed below; the alternative is to document the misleading wording as a known limitation (Choice 8 notes it). The audit command is the human-facing report (Report wording). The reason text is of the form "N adopter-run gate(s) recorded (F failed, I invalid); adopter-asserted records are not framework evidence and earn no credit". It is not claimed to appear in any other field.
4. **Attestation is the one input that does move counts, and it moves them downward.** The rule is `structural`, so the catalog derives it as not attestable (`attestable` defaults to `validationType === "manual-review"`). In `scripts/compliance.mjs` the attestation branch (around L124) calls `judgeAttestation`; for a rule with `!rule.attestable` it returns `fail("invalid-attestation", ...)` (around L331), which is **not** a `fallThrough` result, so it is pushed and the loop `continue`s: the rule leaves `skipped` and becomes a `failed` result with `level: "required"`, `validationType: "configuration"`, `assurance: "full"`. For that one rule: `assurance.automated` +1, `assurance.notEvaluated` -1, `summary.failed` +1, `summary.skipped` -1, `denominator.scored` +1, and the verdict goes down (`NON_COMPLIANT`). An attestation therefore does not "fall through and leave the rule unchanged"; the earlier draft said so and was wrong. **Why this is acceptable:** it is the engine's existing refusal path for any attestation on a non-attestable rule, it is triggered only by a project writing an attestation the catalog says it cannot write, it is fail-closed (it can lower a verdict and cannot raise one), and it is not caused by any gate record. C4.1 to C4.10 do not include an attestation, so the differential stays strict; C4.11 pins this behaviour separately.
5. **Cover and the catalog (reconciling with "no gate changes a Cover count").** Adding the id to `EVALUATED_RULES` raises `frameworkCoverage.evaluatedRules` by 1, and adds +1 `assurance.notEvaluated` and +1 `denominator.noSubject` to every project's `validate` **relative to the previous release**, because a new evaluated-but-skipped rule exists. That is a catalog change shipped with the rule, identical for every project, and it is not caused by any gate. The claims in this record ("no gate changes a Cover count", "adds no assurance") are about the same engine with and without gate records (the C4 differentials), not about the release delta. **Catalog assurance:** under Option A the rule never evaluates anything, so its entry is `assurance: none`, not `partial`; claiming `partial` would put a statement of checked material in `docs/assurance-report.md` that the rule never makes. `partial` is correct only if the owner freezes Option B.
6. What moves when a project adds gates, exactly (same engine, with and without records, no attestation): `results[evidence.adopter-gates-recorded].inspected.surfaces[0].reason`, and nothing else in `validate` (C4.1). `status`, `score`, `scoreUnavailable`, `summary`, `assurance`, `denominator`, `blockedBy`, `foreignFailures`, every other result and the envelope keys are equal.

**The cost of the default, stated plainly.** Because the rule never produces a hit, **a recorded failure cannot warn in `validate` and cannot lower a score, even when the project sets the rule to `required`.** C3 is satisfied at the report level (the reported result flips in `audit` and in the surface reason), not at the verdict level. A project that wants a recorded failure to fail its build must read the `adopterGates` audit report. This is the price of keeping the Cover line honest without touching the engine.

**Alternatives, owner-decided (Choice 7).**

- **Option B, hits become results.** A recorded `failed` or `invalid` gate produces a hit: `warning` at `recommended`, `failed` at `required`. Exact movement for that one rule: `assurance.automated` +1, `assurance.notEvaluated` -1, `summary.skipped` -1, `summary.warnings` +1 (or `summary.failed` +1 at `required`); at `required` also `denominator.scored` +1 and the score can only fall. Valid, unrun and `passed` gates still never hit, so a rise from a good record is impossible. **The Cover automated count does rise on an adopter-asserted failure.** It needs an explicit owner yes, and C4.1 / C4.5 / C4.9 / C4.10 are then rewritten to pin exactly those deltas and no others.
- **Option C, an engine or catalog flag.** A catalog flag (for example `carriesFindingsWithoutCredit`) lets the rule carry hits yet keeps it `skipped` for `assurance` and `denominator`. This changes `scripts/compliance.mjs` and is an engine change; this record does not authorize it.
- **Rejecting `required` for this rule** is a fourth alternative (a new refusal path); it makes the setting impossible rather than inert.

**Residual limit.** `denominator.noSubject` counts this rule whether or not gates are recorded. A reader of the denominator alone cannot tell it from a rule with nothing to inspect; the `adopterGates` audit report and the surface reason can. Making the bucket distinct is an envelope change.

## Mapping: criteria to red-first tests

Red-first, with one stated exception class: each test is written before the schema fragment and rule and fails on the current main for the reason in its last column, **except the C4 pins marked "none today"**. Those pass vacuously before the rule exists (nothing reads the key) and are kept as regression guards; C4.2 proves they can go red. Test file: `test/fe61-adopter-gates.test.mjs`, in the style of `test/fe28-attempt-gates.test.mjs` (`node:test`, fixtures through the real CLI, no mocks of the evaluator). Proposed module: `scripts/adopter-gates.mjs` exporting `classifyGates(gates, frameworkRuns = new Map())`, `GATE_LABELS` and a report builder. Fixture contents are in the next section.

### C0: record the design

Satisfied by the merge of this record after freeze. Verified by review, not by a runtime test. One guard test: the rule's `$assuranceNote` names `design/fe61-adopter-verification-gates.md` and that file exists (the precedent set by `lifecycle.attempt-gates-valid`).

### C1: reference an adopter-run gate by identity and version

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C1.1 | A gate with `id`, `version`, provenance and result validates: `validate` does not exit 2, and `scripts/policy.mjs` reads it without a schema error (there is no `policy` subcommand) | `adopter-gates-passed` | the key is unknown (`additionalProperties: false`), exit 2 |
| C1.2 | A reference with no `version` is rejected, exit 2, naming `adopterGates[0].version` | `adopter-gates-no-version` | key unknown, different message |
| C1.3 | A reference with no `id` is rejected, exit 2, naming `adopterGates[0].id` | `adopter-gates-no-id` | same |
| C1.4 | Two references whose ids are equal after trim and case-fold are both reported `invalid`, one finding each | `adopter-gates-duplicate-id` | no rule |
| C1.5 | A version that names no version (`latest`, `unknown`, `none`, `n/a`, `tbd`, `head`, `main`, `master`, `current`, `x`, `?`, case-folded) is reported `invalid` | `adopter-gates-placeholder-version` | no rule |
| C1.6 | `audit --json` carries each reference's `id` and `version` unchanged | `adopter-gates-passed` | no report field |
| C1.7 | **Inspection state for absent, empty and all-unrun.** No policy key, `adopterGates: []`, and a list of only valid `unrun` gates each give the rule `skipped / not-evaluated / no-subject`, in `validate --json` (`results[].status` and `notEvaluatedBecause`, plus `inspected.surfaces[0].state` is `resolved-empty`), at the default level and with the rule set to `required`. The audit report says "none referenced" for the first two and lists the unrun gates for the third. Never `passed`, never a hit | no key (`math-compliant`); inline `[]`; `adopter-gates-unrun` | no rule |
| C1.8 | The framework names no gate: `scripts/adopter-gates.mjs` contains none of `pvsnp`, `lean-axiom`, `check.ps1`, `planted`, `audit-manifest` (precedent: FE-28 C2) | source scan | file absent |

### Rider: execution provenance and result accompany the reference

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| R.1 | A reference with no `result` is rejected by the schema, exit 2 | `adopter-gates-no-result` | key unknown |
| R.2 | A reference with no `execution` is rejected by the schema, exit 2 | `adopter-gates-no-provenance` | key unknown |
| R.3 | `executed` with missing `subject`, `command`, `evidence`, or a result with no `result.evidence`, is `invalid`, one error per missing field, schema-valid | `adopter-gates-thin-provenance` | no rule |
| R.4 | Evidence that is free text (`ran it, it was fine`), a placeholder (`n/a`, `N/A`, `none`, `tbd`, `todo`, `unknown`, `-`, case-folded, alone or as the whole value), or bare hex such as `defaced`, is not a reference and is `invalid`. The helper is a **stricter wrapper**, `isGateReference`, over the FE-28 `hasReference` from `scripts/attempts.mjs` (a path, an http(s) URL, or `commit <sha>`): it accepts a value only if it is (a) an `http(s)://` URL with no whitespace, (b) `commit <hex sha>` of 7 to 40 hex digits, or (c) a **file-path token**: no whitespace anywhere, and a last `/`-segment ending in a file extension (`.` then a letter and up to seven letters or digits), after trimming and stripping trailing punctuation (`. , ; : !`), and not every non-empty `/`-segment a placeholder word (`n`, `a`, `na`, `and`, `or`, `yes`, `no`, `none`, `tbd`, `todo`, `unknown`, `pass`, `fail`, `ok`, `true`, `false`, `-`, `?`). Empty segments are ignored. **Measured in a scratch run against the real `hasReference`, which returns `true` for most of these today because they contain a slash:** the wrapper returns `false` for `n/a`, `n/a.`, `and/or`, `yes/no`, `yes/no/maybe`, `TBD/TODO`, `TBD / TODO`, `pass/fail`, `ok/fail`, `w/o`, `either/or`, `true/false`, `not/applicable`, `N/A - see below`, `none/`, `tbd/`, `n/a/`, `/`, `./`, `1/2`, `it/was/fine` and a directory such as `artifacts/gate-runs/`, and `true` for `artifacts/gate-runs/x.log`, an https URL, `commit 4f3a9c1`, `docs/n/a/notes.md` and `check.ps1`. A test pins each of these, and that FE-28's helper is left unchanged. **The leak class that remains, stated rather than closed:** any whitespace-free token ending in something that looks like a file extension is accepted whether or not the file exists (`check.ps1`, `notes.txt`, `e.g`), and a cited directory is rejected (cite a file). The check is on the shape of the citation; nothing is resolved Nothing is resolved | inline | no rule |
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
| C3.2 | Reported result for the passed twin is `passed`; for the failed twin it is `failed`; the flip appears in `audit --json`, in the `audit` human render, and in `validate --json` as the `inspected.surfaces[0].reason` text of the rule (it names one failed gate for the failed twin and none for the passed twin). The rule's `status` and `message` do not flip: under the default it stays `skipped` (Credit-inert, Option A) | the twins | no report |
| C3.3 | The flip follows the record, not the name: renaming `id` in the failed twin still reports `failed` | inline | no report |
| C3.4 | A `failed` record that is also incomplete has reported result `invalid`, `valid: false`, label `adopter-asserted` and declared outcome `failed` (human line: `invalid, declared failed`), is counted under invalid in the summary, and is also counted under `declaredFailed`; it is never read as `passed`, and it is not hidden | inline | no rule |
| C3.5 | The summary counts flip with the record: `passed: 1, failed: 0` against `passed: 0, failed: 1` | the twins | no summary |
| C3.6 | Under the default (Option A), at the default level **and** with the rule set to `required` in the project's own policy, `validate` gives the two twins identical `status`, `score`, `summary`, `assurance` and `denominator`; only the surface reason differs. A recorded failure does not lower a score under this default; that is the stated cost and Choice 7 is where the owner changes it. If the owner freezes Option B, this row is rewritten to pin the exact deltas listed in the Credit-inert section. The framework never escalates the level itself | the twins plus an inline policy | no rule |

### C4: an unexecuted gate cannot raise the framework verdict

The gap check classified C4 as `partial`: it holds vacuously today because nothing reads an adopter gate. This test list pins it before anything does.

| # | Test | Fixture | Fails today because |
| --- | --- | --- | --- |
| C4.1 | **Differential, strict.** Build a temporary copy of `test/fixtures/math-compliant` (an otherwise `COMPLIANT`, 100% baseline: measured, 22 scored rules) with the `adopter-gates-credit-block` appended to its policy; run `validate --json` on it and on an untouched copy. **Everything is equal except one field:** `status`, `score`, `scoreUnavailable`, `summary`, `assurance` (automated, manual-review and not-evaluated counts: the Cover line), `denominator` (every named part, including `scored`, `applicable`, `total` and `noSubject`), `blockedBy`, `foreignFailures`, the envelope keys and `schemaVersion`, and every `results[]` entry. **The single allowed difference is `results[evidence.adopter-gates-recorded].inspected.surfaces[0].reason`.** That result's `status`, `message`, `notEvaluatedBecause`, `scored`, `inspected.surfaces[0].state` (`resolved-empty`) and `count` (0) are equal too: the message is the engine's hard-coded no-subject text and cannot differ. Cover and assurance counts **may not** move | `math-compliant` + `adopter-gates-credit-block` | none today (passes vacuously; the rule id is unknown today and its result is absent from both sides, so the differential is trivially empty); proven live by C4.2 |
| C4.2 | Guard the guard: a scratch mutation (in the `scripts/mutation-check.mjs` style) makes the rule return `passed` for valid gates: C4.1 and C4.9 must go red. A second mutation makes the rule return `warning` for a recorded failure: C4.5 and C4.10 must go red (it moves `assurance.automated`). This proves the differential detects both violations | scratch mutation | n/a |
| C4.3 | Every rule the catalog marks manual-review keeps its disposition with the gates present: a `passed` gate does not move one from `not-evaluated` | `math-compliant` + block | none today |
| C4.4 | An `unrun` gate (the `adopter-gates-unrun` gate appended to `math-compliant`) leaves everything C4.1 lists equal, with the same single-reason exception | `math-compliant` + unrun gate | none today |
| C4.5 | A recorded `failed` gate, and an `invalid` record (`adopter-gates-thin-provenance` gate), at the default level: the same strict differential as C4.1, **including `assurance`, `summary` and `denominator`**. The rule stays `skipped / not-evaluated / no-subject`, `scored` false, no `warning`, no `failed` result. The failure is visible in the `audit` report and the surface `reason`, and nowhere else. An implementation that makes the rule warn fails this test, because that moves `assurance.automated` +1, `assurance.notEvaluated` -1 and `summary.skipped` -1 (see Credit-inert, second hazard) | `math-compliant` + failed twin gate; + thin-provenance gate | none today (the rule id is unknown today, so the pinned reason text is absent; the equality parts pass vacuously) |
| C4.6 | The Standard 25 envelope is unchanged: same keys, same `schemaVersion`; no `adopterGates` key inside `verdict`, `score`, `assurance` or `denominator` | `math-compliant` + block | none today |
| C4.9 | **Required-level pin (the first reviewed hazard).** With `rules: { evidence.adopter-gates-recorded: { level: required } }` added to the policy, for each of: key absent, `adopterGates: []`, only unrun, valid `passed`: the rule's result is `skipped / not-evaluated / no-subject`, `results[].scored` is false, and `status`, `score` (100), `denominator.scored` (22), `assurance` and `summary` equal the baseline. A score above baseline, or a `scored: true` result for the rule, fails the test | `math-compliant` + four inline variants | The rule id is unknown today. Measured: a policy that sets `rules: { evidence.adopter-gates-recorded: { level: required } }` is accepted (exit 0) and ignored, and `validate` gives `COMPLIANT`, 100. So the equality parts pass vacuously; the assertion that the rule's result exists, is `skipped` and is `scored: false` fails (no such result). Marked none-today for the equality parts |
| C4.10 | **Required-level, recorded failure or invalid record (Option A pin).** Same setting with a recorded `failed` gate, and with an invalid record: the rule is **still** `skipped / not-evaluated / no-subject`, `scored: false`, and `status`, `score` (100), `denominator.scored` (22), `assurance` and `summary` equal the baseline. This pins the stated cost: under Option A a failure cannot lower a score. If the owner freezes Option B this row is replaced by the exact-delta test (`denominator.scored` 23, `status` `NON_COMPLIANT`, `score` below 100, `assurance.automated` +1, `assurance.notEvaluated` -1, `summary.skipped` -1, `summary.failed` +1, nothing else moves) | `math-compliant` + inline variants | Same as C4.9: the rule id is unknown, the `rules` entry is accepted and ignored, the rule's result is absent, so the existence assertion fails and the equality parts pass vacuously |
| C4.11 | **Attestation refusal, pinned as it behaves.** An attestation entered against `evidence.adopter-gates-recorded` does not discharge the rule and does not leave it unchanged: the engine returns `failed` with disposition `invalid-attestation` (the existing refusal path for a non-attestable rule). Pinned deltas against the same policy without the attestation, and nothing else: `assurance.automated` +1, `assurance.notEvaluated` -1, `summary.failed` +1, `summary.skipped` -1, `denominator.scored` +1, `status` `NON_COMPLIANT`, `score` below 100. The direction is down, never up | `math-compliant` + block + attestation | The rule id is unknown today, so an attestation against it is not judged against a catalog rule; the pin fails (no `invalid-attestation` result for this id). Not a none-today row |
| C4.7 | Source guard: `scripts/compliance.mjs` does not mention `adopterGates` or `adopter-gates`. Only the detector and the report builder read the key | source scan | none today |
| C4.8 | The rule's catalog entry is `assurance: none` under Option A (`partial` only under Option B), and its `$assuranceNote` states that it cannot establish that a gate was run or that a result is correct; `npm run assurance:check` passes | catalog | no rule |

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

Exit codes below are those of `validate` on the fixture's directory (exit 2 is a schema or configuration error, the existing path; there is no `policy` subcommand), and equally of `scripts/policy.mjs` reading the file against the patched schema.

| Fixture | Schema result | Reported by the proposed rule |
| --- | --- | --- |
| `adopter-gates-unrun` | accepted | `lean-axiom-audit@2.4.0`: not run (unexecuted) |
| `adopter-gates-passed` | accepted | `pvsnp-check@1.3.0`: passed (adopter-asserted) |
| `adopter-gates-failed` | accepted | `pvsnp-check@1.3.0`: failed (adopter-asserted), one finding |
| `adopter-gates-no-version` | rejected, exit 2 | not reached; `adopterGates[0].version: is required but missing` |
| `adopter-gates-no-id` | rejected, exit 2 | not reached; `adopterGates[0].id: is required but missing` |
| `adopter-gates-no-result` | rejected, exit 2 | not reached; `adopterGates[0].result: is required but missing` |
| `adopter-gates-no-provenance` | rejected, exit 2 | not reached; `adopterGates[0].execution: is required but missing` |
| `adopter-gates-thin-provenance` | accepted | invalid: no `subject`, `command`, `evidence`, and no `result.evidence` |
| `adopter-gates-self-declared-framework` | accepted | passed (adopter-asserted) |
| `adopter-gates-unrun-with-result` | accepted | invalid: unrun but records result `passed`, and carries result evidence |
| `adopter-gates-duplicate-id` | accepted | both invalid: share an id |
| `adopter-gates-placeholder-version` | accepted | invalid: version `latest` names no version |
| `adopter-gates-credit-block` (appended to `math-compliant`) | accepted | both passed (adopter-asserted); every `validate` field identical to the untouched copy except the rule's surface `reason` |

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

- **Id:** `evidence.adopter-gates-recorded`. Standard 19 (evidence requirements), category `evidence`, `recommended`, `warning`, `structural`, assurance `none` under the default Option A (the rule never evaluates anything; `partial` only if Option B is frozen), `nonExemptible: false`. `introducedIn` is written `"3.2.0"` as a placeholder, as the FE-28 precedent did; no VERSION change is made and classification stays owner-held.
- **Subject surface:** `adopter-gates`, `resolved-empty` always (see "Credit-inert by construction"); a new use of the existing tri-state, as that section states. The policy's `adopterGates` key is read to build the surface `reason` and the audit report, not as a credit-bearing subject. The rule is `skipped / not-evaluated / no-subject` at every level for every input.
- **Registration, exact (the registers must have identical keys; `test/evidence-provenance.test.mjs` enforces it):**
  1. `scripts/surfaces.mjs` holds the registers only: add `"adopter-gates"` to `SURFACES`; add `"adopter-gates": "adopter-run gate references"` to `SURFACE_LABELS`; add `["evidence.adopter-gates-recorded", { subject: P, surfaces: ["adopter-gates"] }]` to `RULE_SURFACES`. It also exports the `resolved()` and `unresolved()` helpers the resolver uses.
  2. `scripts/standards.mjs`: `resolveSurface` is a `switch` here, and its default branch throws on an unknown surface. Add `case "adopter-gates":` returning `resolved([], { reason })`, where `reason` is built from `policy.document.adopterGates` (through `scripts/adopter-gates.mjs`). This is where the policy key is read for the surface.
  3. `scripts/evaluated.mjs` is only the id array: add `"evidence.adopter-gates-recorded"` to `EVALUATED_RULES`. Detectors are `report()` calls in `scripts/standards.mjs`; a rule that never produces a hit needs none, so no detector is added (to be confirmed by the first test run, since an evaluated id with no `report()` call is not otherwise exercised).
  4. A test asserts the two registers contain the rule id and that the id is in the catalog.
- **Findings carried, no hits:** the detector produces no hits. What the gates contribute is (a) the surface `reason` (counts of recorded, failed and invalid gates) in `validate --json`, and (b) the `adopterGates` audit report. A `passed`, an `unexecuted` or a `none referenced` input yields a reason with no failure count. **No input produces a `passed` result for the rule, and no input produces a hit.**
- **Implementation touches (the whole list, after freeze):** `scripts/adopter-gates.mjs` (new: classifier, `isGateReference`, report builder), `scripts/surfaces.mjs` (registers), `scripts/evaluated.mjs` (id array), `scripts/standards.mjs` (the `resolveSurface` case, the `renderProvenance` branch for this surface, and the `audit` render and JSON key), `rules/evidence.json` (the catalog entry), `schemas/project-policy.schema.json`, `templates/project-policy.yml`, `INSTRUCTIONS.md`, `docs/assurance-report.md` (regenerated), `CHANGELOG.md` (Unreleased), `test/fe61-adopter-gates.test.mjs`, and the fixtures. **Not touched:** `scripts/compliance.mjs` (C4.7 pins this) and `scripts/attempts.mjs`. If the owner freezes Option B or C of Choice 7, the list changes: B adds hit production in the detector; C adds an engine change in `scripts/compliance.mjs` and is the case that moves C4.7.
- **Does not do:** execute, resolve or read a cited reference, compare `subject` to the audited commit, age `at`, or credit anything.
- **`$assuranceNote` (proposed text):** "Evaluates nothing: the rule never produces a result other than not-evaluated, and gate records are reported by audit, not scored. It does not establish that a gate reference is complete or, in this iteration, anything else. It cannot establish that the gate was run, that a cited reference exists, that the subject commit is the one audited, or that a result is correct. Every recorded gate is adopter-asserted. design/fe61-adopter-verification-gates.md defines the record."
- **Remediation (proposed text):** "Give each gate an id, the version that ran, an execution block (state, and for an executed gate: by, at, subject, command, evidence) and a result (outcome and its evidence). Cite a path, a URL or 'commit <sha>'; free text alone does not count. Write a gate you have not run as state: unrun with outcome: not-recorded."

## Consistency rules the rule applies (each error makes the gate `invalid`)

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

`validate` is not changed: no envelope field, no `schemaVersion` advance, no new disposition, no new denominator bucket. The rule appears in the results as `skipped / not-evaluated / no-subject` for every input, with the engine's fixed message. The only `validate` field that reflects the gates is `results[evidence.adopter-gates-recorded].inspected.surfaces[0].reason`, in `validate --json`; the default `validate` human render does not print surface reasons for a `skipped` rule, so a reader of the default render sees nothing about gates; the `--provenance` render prints the reason (see "Where the finding lives"). The `audit` output is where they are shown.

## Choices for owner review

Each item states a fail-closed default; the Worker implements the default unless the owner decides otherwise at freeze.

1. **Representation.** Default: a policy key, `adopterGates`. Alternatives: a section in an attempt record, or an extension of FE-28 attempt gates. The default gets schema-level rejection for free and keeps the two gate concepts separate. Cost: a policy file grows with run records.
2. **What the schema rejects (exit 2) versus what the rule marks `invalid` (schema-accepted, reported in the audit and the surface reason).** Default: the schema requires `id`, `version`, `execution.state`, `result.outcome`; everything conditional on state is the rule's. A reference missing identity or version is therefore a configuration error and stops the run, which is the fail-closed reading of C1. Alternative: have the rule report every defect, so a malformed gate never blocks an audit.
3. **What `version` means.** Default: any non-empty string with a rejected placeholder list, not semver, because a gate may be versioned by a tag or a commit. Alternative: require semver or `commit <sha>`.
4. **The provenance field set.** Default: `by`, `at`, `subject`, `command`, `evidence`, all required when `executed`. These are my reading of "execution provenance"; the criteria name none of them. Alternative: drop `command` or add `environment`. Whatever the owner freezes, an executed gate carrying none of them is `invalid`.
5. **The result vocabulary.** Default: `not-recorded`, `passed`, `failed`. There is no `errored`: a run that crashed without a verdict is recorded `failed` with the log as evidence. This is the fail-closed choice; an `errored` value would be one more state a consumer could mistake for neither.
6. **Framework execution.** Default: none in this iteration, so every executed gate is `adopter-asserted` by construction, and `framework-executed` is a defined but unreachable label (C2.4, C2.5). Open question for a future record, not this one: even a gate the framework did run should need its own design before it credits anything; this record does not authorize that. Alternative: omit `framework-executed` from the vocabulary until a path exists.
7. **Does a recorded failure count in `validate`? Pin the direction and the Cover movement.** Default, Option A (fail-closed, no engine change): the rule never produces a hit, so it is `skipped / not-evaluated / no-subject` for every input at every level. Nothing about any gate moves `status`, `score`, `summary`, `assurance` (the Cover line) or `denominator`. **Cost: a recorded failure cannot warn in `validate` and cannot lower a score, even at `required`;** it is shown in the `audit` report and the `validate --json` surface reason only. Alternatives:
   - **Option B, failures become results.** A recorded `failed` or `invalid` gate produces a hit: `warning` at `recommended`, `failed` at `required`. Exact movement: `assurance.automated` +1, `assurance.notEvaluated` -1, `summary.skipped` -1, `summary.warnings` +1 (or `summary.failed` +1 at `required`); at `required` also `denominator.scored` +1 and the score can only fall. A `passed`, `unrun` or empty input still never hits. **The Cover automated count rises on an adopter-asserted record**, which is a change in what Cover claims; the owner must say yes to that explicitly. No engine change.
   - **Option C, engine or catalog flag.** The rule carries hits but is held `skipped` for `assurance` and `denominator`. A change to `scripts/compliance.mjs`, not authorized by this record.
   - **Option D, reject `required`** for this rule (a new refusal path).
   - **Option E, a distinct `adopter-asserted` bucket** in `denominator` so `noSubject` does not count a rule that has records: an envelope change, colliding with the `"3.0"` advance planned in #55 and #57.
   The framework never escalates the level itself.
8. **Where it is reported.** Default: the audit output and `audit --json` only; `validate`'s envelope, `schemaVersion` and dispositions are unchanged. Alternative: an `adopterGates` section in the envelope, which would be a schema advance and would collide with the `"3.0"` advance already planned in the #55 and #57 design.
9. **One reference per identity.** Default: `id` is unique in the policy, so a project carries one current reference per gate and keeps history in the evidence logs. Alternative: allow the same `id` at several versions.
10. **Staleness.** Default: not checked. The framework does not compare `subject` to the audited commit and does not age `at`, and the assurance note says so. Alternative: flag a gate whose `subject` differs from the audited HEAD, which needs the audit to read git.
11. **Evidence helper.** Default: `isGateReference`, as specified in R.4: an https URL, `commit <sha>`, or a whitespace-free file-path token ending in a file extension, with placeholder words and slash-joined placeholder runs rejected, applied in addition to FE-28's `hasReference` (unchanged, never resolved). This closes the placeholder-and-prose family that `hasReference` accepts today because it contains a slash (`n/a`, `and/or`, `yes/no`, `pass/fail`, `w/o`, `it/was/fine`, `1/2`, `N/A - see below`), for gates only, leaving FE-28 as merged. The stated leak class: any whitespace-free token with a file-extension look is accepted although nothing resolves it (`check.ps1`, `e.g`); directories are rejected. Alternatives: use `hasReference` unchanged (leaks the whole slash-containing prose family); a stricter helper that resolves repository paths, which turns "stated" into "present", a different assurance claim.
12. **Rule identity and level.** Default: `evidence.adopter-gates-recorded`, Standard 19, `recommended`, `warning`. Alternative: a new Standard and number. Not recommended: the invariant being protected is Standard 19 R6, evidence outranks assertion.
13. **No gate source field.** Default: identity and version only. A field pointing at the gate's source file (where the script lives) is not in C1 and is omitted. Alternative: an optional `source` reference.
14. **Interplay with #55 and #57, and a term mismatch to name.** Default: no coupling. The #55 and #57 record reports a machine-established contribution as `author-asserted` ("asserted by the attestation's author, not re-run"); this record reports `adopter-asserted`, because the criterion C2 is worded so. They are the same stance (the framework did not run it and gives no credit) under two names, and one carries an attestation author, the other a project. If both land, the owner should unify the names or state that they differ; this record does not decide it. A recorded gate could later become a typed contribution; that is a future change, not a coupling here.
15. **The `executed` word clash with FE-28.** Default: keep `unrun` and `executed` for continuity with the attempt gates, with the difference stated (here `executed` requires a result). Alternative: name the adopter-gate states `unrun` and `ran`, which removes the clash and costs a rename in the schema, fixtures and tests.
16. **Ratify the C3 reading.** The owner-finalized C3 does not name a fixture or say who plants the failure. Proposed: "a planted failure flips the reported result" means a recorded failed result flips the reported result; the framework executes nothing. **Plainly: under the default (Option A) the `validate` verdict never flips on a planted failure; "reported result" is audit-level only** (the `audit` report and the surface reason). A flip in `validate` needs Option B or C of Choice 7. Needs an explicit owner yes. If the owner means a framework-run planted-failure check, that is a framework execution path, which this record does not authorize and would need its own design.

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
- Not validated, because no rule exists: the detector, the `adopter-gates` resolver and the no-subject mapping it relies on (read from `scripts/compliance.mjs` and `design/v1.2-evidence-provenance.md`, not run), the audit render, the JSON report, the `required`-level tests C4.9 and C4.10, and the C4 differential. They are specified above and tested only after freeze.
- Second review, added: the `summarise()` assurance counting, the hard-coded no-subject message, the placement of the resolver `reason` in `inspected.surfaces[]`, and the two registers that must have identical keys were re-read in `scripts/compliance.mjs`, `scripts/surfaces.mjs` and `scripts/evaluated.mjs` (read, not run against a rule). Measured on the unmodified engine in the scratch copy: `rules: { evidence.adopter-gates-recorded: { level: required } }` added to a policy is accepted (exit 0) and ignored, with `COMPLIANT`, 100 (the C4.9 and C4.10 "fails today" column). `isGateReference` was prototyped in the scratch copy against the real `hasReference`: false for `n/a`, `N/A`, `n/a.`, `and/or`, `yes/no`, `TBD/TODO`, `TBD/todo.`, `none`, `-`, free text and bare hex; true for a path, an https URL, `commit 4f3a9c1`, `docs/n/a/notes.md` and, as a stated leak, `check.ps1`.
- Third review, added: the attestation path was re-read in `scripts/compliance.mjs` (`judgeAttestation` returns a non-`fallThrough` `fail("invalid-attestation")` for a non-attestable rule, which is pushed and `continue`d); `resolveSurface` (a `switch`, default throws) and `renderProvenance` were re-read in `scripts/standards.mjs`. Read, not run against a rule. `isGateReference` as now specified in R.4 was prototyped in the scratch copy against the real `hasReference` over 27 inputs and gave the results listed there. `origin/main` at 11e6a14 differs from 3475ec4 only under `design/`.
