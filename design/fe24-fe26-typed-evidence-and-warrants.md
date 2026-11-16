# FE-24 / FE-26 design record: typed evidence contributions and reviewer warrants

**Status: DRAFT, awaiting owner freeze.** Nothing here is implemented. The pull request that carries this record changes no schema, rule, fixture, VERSION or CHANGELOG file; every schema fragment, fixture and test below is proposed text.
**Authority:** the owner's finalized criteria for #55 (C0 to C3) and #57 (C0 to C4), `finalized-criteria-2026-11-16.md`, and the four binding owner decisions (a) to (d) below, reproduced as given. Every other point is resolved fail-closed and listed under "Choices for owner review". This record adds no acceptance criterion.
**Evidence base:** the gap-check reports for #55, #56 and #57 and the live repository at main 14562f6. #55 (FE-24, typed evidence contributions) and #57 (FE-26, reviewer warrants) are designed jointly because the discharge rule needs both: a contribution has a type, an attestation has a warrant, and what discharges a manual rule is a statement about warrants.

## Scope

#55 and #57 only. Split-subject applicability (#56) is `design/fe25-split-subject-applicability.md`; the two are independent except for one ordering-dependent fixture.

## Binding owner decisions

- **(a)** New attestations REQUIRE `reviewer.kind`, with values distinguishing human review, agent judgement, agent mechanical review and automated tooling. Legacy attestations remain valid but report `unknown warrant` and are never inferred human.
- **(b)** Only human review can discharge a manual rule's required judgement warrant. The other three kinds may contribute typed evidence but cannot discharge.
- **(c)** Typed contributions live within the attestation they support.
- **(d)** Agent-authored attestations never get full-human assurance. Independence is optional structured metadata with explicit `unknown`, not a universal prerequisite. Machine-established components may be credited, but a manual rule cannot pass until every required judgement warrant is present.

## What exists today (read from the repository)

- `schemas/project-policy.schema.json` `attestation`: required `status`, `reviewedBy`, `reviewedAt`, `evidence`; optional `reference`, `expires`, `reviewedAgainst`; `additionalProperties: false`. `reviewedBy` is free text.
- `scripts/compliance.mjs` `judgeAttestation()` checks in this order: not attestable, contradicted by an automated hit, rejected, expired or stale, then pass with `disposition: "attested"` and `assurance: "full"`. Every approved, fresh attestation is therefore full human assurance, whoever wrote it.
- `summarise()` computes `assurance {automated, manualReview, notEvaluated}`, which sum to the rule count.
- The human renderer prints one section, "Attested (human review):", for every attested result.
- The vendored schema evaluator supports only `$schema $id $ref $defs title description type required properties additionalProperties propertyNames pattern enum const minLength items minItems format` and throws on any other keyword. There is no `oneOf`, `if/then` or `uniqueItems`. `format` is an annotation only. Conditional rules therefore live in a semantic layer, as `policy.missing-revisit-condition` does in `scripts/policy.mjs`.
- `standards validate` runs schema validation only; the semantic findings are in `policy`.
- The vendored YAML reader accepts block style only (no flow sequences or mappings) and returns every scalar as a string.
- The observed adopter case: `artifacts/adoption/rh-attestation-measurement.md` and `rh-attestation-validate.json` record 14 attestations (12 approved, 2 rejected: `formal.statement-overclaim` and `agent.refusal-on-invariant`), each with `reviewedBy: Claude Opus 5 (AI agent), standards adoption experiment`. That every attestation was AI-authored and is not independent human review is disclosed only in a YAML comment, which no tool reads. The measured run had score 89 over a denominator of 53 with 3 blocking rules. `design/v1.1-candidates.md` section 0l records the gap.

## Design

### 1. The reviewer object (decision (a))

`attestations.<rule>.reviewer`, an object:

```yaml
reviewer:
  kind: human-review            # required inside reviewer
  independence:                 # optional
    status: independent         # independent | not-independent | unknown
    basis: Reviewer did not write the proof.   # optional
```

- `kind` is one of `human-review`, `agent-judgement`, `agent-mechanical-review`, `automated-tooling`. It is the warrant: what sort of act the attestation records, and so what it can establish.
- `reviewedBy` is kept, still required, and still says WHO or WHAT. `kind` says what sort. The framework cannot check that the two agree, and says so in the schema description.
- `independence` is optional structured metadata and is never read to decide whether a review stands. Absent is reported as "independence: not recorded". An explicit `unknown` is reported as "independence: unknown (recorded)". The two are different statements and render differently. No tool treats independence as a prerequisite (decision (d)).

### 2. Legacy detection and the "require" rule

- **Legacy means the attestation has no `reviewer` key.** It is never inferred from `reviewedBy` text, from comments, from other fields or from the date. A name that looks like an AI model does not make a legacy attestation `agent-judgement`, and one that looks like a person does not make it `human-review` (decision (a): "never inferred human").
- **Require for new attestations** is a semantic check gated on the policy's declared `standardVersion`. The gate is a constant `WARRANT_REQUIRED_FROM = "3.2.0"`, a placeholder the owner holds, in the same way the 3.1.0 release left its successor version prepared-not-assigned. A policy at or above the gate whose attestation lacks `reviewer.kind` is invalid configuration (exit 2, finding `attestation.reviewer-kind-required`). Below the gate the attestation is legacy. Without such a gate, "require" and "legacy remains valid" cannot both hold, because an attestation either has the key or it does not.
- Legacy handling is a standing rule, not a transition: it reads the attestation's shape, not the date.

### 3. Typed contributions within the attestation (decision (c))

`attestations.<rule>.contributions` is a map whose KEY is the type. A contribution cannot be filed under two types and a stray value cannot select a third, and the schema expresses this without `oneOf`.

```yaml
contributions:
  machineEstablished:
    - established: Lean build succeeds with no sorry
      tool: lake build 4.12.0
      command: lake build
      paths:
        - formal
      ranAt: "2026-11-16"
      digest: 0123456789abcdef0123456789abcdef
      reference: artifacts/runs/2026-11-16-lake.txt
  judgement:
    - statement: The base case in section 3 is stated and discharged.
      reference: BARRIERS.md
  outstanding:
    - requires: human-review
      describes: Confirm the Lean statement matches the English claim.
```

Contents of each type:

- **machineEstablished**: required `established`, `tool`, `paths`, `ranAt`; optional `command`, `digest`, `reference`. It states a fact a program established, in a form that can be checked for freshness.
- **judgement**: required `statement`; optional `reference`. Its warrant is always the carrying attestation's `reviewer.kind`, never a field of its own, so a judgement cannot claim a stronger warrant than the attestation that carries it.
- **outstanding**: required `requires` (enum with one value, `human-review`) and `describes`. It names judgement still required and of what kind, for the person who must supply it. The evaluator derives outstanding judgement itself whenever no human warrant is present; this records what remains.

**Freshness and digest of a machine-established contribution.** The digest is computed over `paths` with the same algorithm as `reviewedAgainst.digest` (`attestationDigests` in `scripts/standards.mjs`: sha256 over sorted paths plus content, 32 hex), keyed per contribution. Its currency is `verified-current` (digest present and equal), `stale` (digest present and different), or `unknown` (no digest recorded; the validator prints the current digest so it can be recorded, as today). A stale contribution is not credited. The framework does not re-run the tool, so every machine-established contribution is reported as asserted: "ran at <ranAt>, asserted by the attestation's author, not re-run".

**Cross-checks (semantic layer):**

- `contributions` requires `reviewer`. A component cannot be typed inside an attestation whose warrant is unknown (`attestation.contributions-without-reviewer`).
- A `judgement` contribution is refused under `agent-mechanical-review` and `automated-tooling` (`attestation.judgement-under-non-judging-kind`). Judgement is exactly what those kinds are not asserting.

### 4. Required judgement warrants and discharge (decision (b))

Pure function, no catalog field:

```
judgementWarrantsRequired(rule) -> ["human-review"]   // for every manual-review rule
```

The discharge check requires every warrant in the returned set to be present. Today the set always has one member; a unit test calls the check with a stubbed two-member set to prove a rule is not discharged until both are present, so decision (d)'s "every required judgement warrant" is true of the code and not only of today's data.

A manual rule is discharged (passes, `disposition: "attested"`, full assurance) only when all hold:

1. the attestation is `approved`;
2. `reviewer.kind` is `human-review`;
3. the attestation is fresh (not stale, not expired);
4. it carries no `outstanding` contribution;
5. no automated detector contradicts it (unchanged: an automated hit fails first).

### 5. Dispositions and reporting

Evaluation order, extending the existing one: not attestable; contradicted by an automated hit; rejected; stale or expired; then kind handling. Stale and expired take precedence over kind, so a stale agent attestation reports as stale.

| Situation | Status | Disposition | `notEvaluatedBecause` |
|---|---|---|---|
| Approved, fresh, `human-review`, no outstanding | pass | `attested` | none |
| Approved, fresh, known kind other than `human-review` | skipped | `judgement-outstanding` | `human-judgement-outstanding` |
| Approved, fresh, `human-review` with an outstanding contribution | skipped | `judgement-outstanding` | `human-judgement-outstanding` |
| Approved, legacy (no `reviewer`) | skipped | `attested-unknown-warrant` | `unknown-warrant` |
| Rejected, any kind including legacy | fail | `attested-rejected` | none; the warrant is named |
| Stale or expired | skipped | unchanged | unchanged |

- A `judgement-outstanding` result lists its credited components. Credit has no effect on status, the score, or the three assurance counters: a rule that is not passed stays not passed however many machine components were credited (decision (d)).
- Per-result JSON additions: `warrant` (the kind, or `"unknown"`), `attestation.reviewer`, and `contributions[]`, each with `type` one of `machine-established`, `judgement`, `outstanding`, plus `currency` for machine-established. `denominator` gains the informational counts `unknownWarrant` and `humanJudgementOutstanding`. These are observations, not new buckets in the score.
- Human text: the single "Attested (human review):" section is split. It lists only discharged rules. A new section "Judgement outstanding (n):" lists the rules in the second and third rows with their credited components and the kind; a new section "Unknown warrant (n):" lists legacy attestations with the line "attestation does not say what kind of reviewer made it; not credited as human review". `standards explain <rule>` prints the warrant, the independence statement (not recorded, or the recorded value), each contribution with its type and currency, and what remains outstanding.
- A rejection from any kind fails, because a rejection is a finding, not a credit. Invariant behaviour for `forbidden` and `nonExemptible` rules is unchanged.
- Only one attestation per rule is kept, as today. Combining a human attestation with an agent attestation for the same rule is not possible; the single slot is a stated limit (choice 8).

### 6. Score and assurance effect

None from credit. A discharged rule counts as manual-review as today. A `judgement-outstanding` or `unknown-warrant` rule is `skipped` and so is excluded from the score denominator unless blocked, and it counts in `assurance.notEvaluated`. The three counters still sum. The informational counts make the exclusion visible rather than silent.

### 7. Envelope schema version

`ENVELOPE_SCHEMA_VERSION` stays `"2.0"`. The additions are new optional fields and new disposition values, and the repository's precedent advances the version only for an incompatible shape change, as FE-41 did (the 1.1.0 and Tier-1 additions stayed at 1.0). A test pins the value. The behavioural change, that legacy approved attestations stop counting as passes, is a different matter: it changes verdicts for existing adopters, so its release classification (the owner's call, plausibly a major-class change) is recorded as choice 9 and is not decided here.

### 8. Migration of the 14 RH attestations

- Add to each of the 14: `reviewer: {kind: agent-judgement, independence: {status: not-independent, basis: <the existing YAML comment, as structured text>}}`, written in block style. `agent-judgement` is the fail-closed default (the more accurate reading of "Claude Opus 5 (AI agent)" exercising judgement); the adopter may reclassify an item it can show was mechanical.
- Effect, stated as expectation not measurement: the 12 approvals become `judgement-outstanding` (not-evaluated, out of the denominator); the 2 rejections stay failures with the warrant named. The verdict is expected to remain `BLOCKED_BY_INVARIANT`. The score falls by up to the 12 passes leaving the denominator; the exact figure must be re-measured against the RH repository, which is not in this repository, and is not computed here.
- The disclosure that today lives in a YAML comment becomes representable and reported (#57 C4).
- Before the gate version is reached the 14 are legacy and report `unknown warrant`; the migration is therefore also the way an adopter leaves that state.

## Schema fragment (exact)

Applied to a scratch copy of `schemas/project-policy.schema.json` and exercised through the repository's own evaluator (see "Verification performed"). In `$defs.attestation.properties` add:

```json
"reviewer": { "$ref": "#/$defs/reviewer" },
"contributions": { "$ref": "#/$defs/contributions" }
```

In `$defs` add:

```json
"reviewer": {
  "description": "What kind of reviewer made this attestation (Standard 19 R6, FE-26). `kind` is the warrant: it says what sort of act the attestation records, and therefore what it can establish. It is never inferred: an attestation with no `reviewer` is legacy and reports `unknown warrant`. `reviewedBy` still says WHO or WHAT; `kind` says what sort, and the framework cannot check that the two agree.",
  "type": "object",
  "required": ["kind"],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "description": "`human-review`: a person exercised mathematical judgement. `agent-judgement`: an AI agent exercised judgement. `agent-mechanical-review`: an AI agent carried out a check whose outcome its procedure fixes. `automated-tooling`: a program ran, with no agent in the loop. Only `human-review` can discharge a manual-review rule.",
      "type": "string",
      "enum": ["human-review", "agent-judgement", "agent-mechanical-review", "automated-tooling"]
    },
    "independence": { "$ref": "#/$defs/independence" }
  }
},
"independence": {
  "description": "Optional structured metadata, never a prerequisite. Omitting it means the attestation does not say. `unknown` says that it was considered and could not be established, which is a different statement and is reported differently. Nothing in the evaluator reads this field to decide whether a review stands.",
  "type": "object",
  "required": ["status"],
  "additionalProperties": false,
  "properties": {
    "status": { "type": "string", "enum": ["independent", "not-independent", "unknown"] },
    "basis": { "description": "Independent of whom or what, and how that was established.", "type": "string", "minLength": 1 }
  }
},
"contributions": {
  "description": "Typed components of the attestation they support (FE-24). The type is the KEY, so a component cannot be filed under two types and a stray value cannot select a third. Requires `reviewer`: a component cannot be typed inside an attestation whose warrant is unknown.",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "machineEstablished": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/machineEstablished" } },
    "judgement": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/judgementComponent" } },
    "outstanding": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/outstandingComponent" } }
  }
},
"machineEstablished": {
  "description": "A fact a program established, stated so that it can be checked for freshness. The framework does not re-run the program: that it was run is asserted by the attestation's author and is reported as asserted.",
  "type": "object",
  "required": ["established", "tool", "paths", "ranAt"],
  "additionalProperties": false,
  "properties": {
    "established": { "description": "The fact, as a statement that is true or false.", "type": "string", "minLength": 1 },
    "tool": { "description": "The program and its version.", "type": "string", "minLength": 1 },
    "command": { "description": "The exact invocation, when there is one.", "type": "string", "minLength": 1 },
    "paths": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
    "digest": { "description": "Digest of `paths`, same algorithm as reviewedAgainst.digest. Omit on a first pass.", "type": "string", "pattern": "^[0-9a-f]{16,64}$" },
    "ranAt": { "type": "string", "format": "date", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
    "reference": { "description": "Where the tool's output is kept.", "type": "string", "minLength": 1 }
  }
},
"judgementComponent": {
  "description": "A judgement the attestation records. Its warrant is the attestation's `reviewer.kind`, never a field of its own, so a judgement cannot claim a stronger warrant than the attestation that carries it. Allowed only under `human-review` and `agent-judgement`.",
  "type": "object",
  "required": ["statement"],
  "additionalProperties": false,
  "properties": {
    "statement": { "type": "string", "minLength": 1 },
    "reference": { "type": "string", "minLength": 1 }
  }
},
"outstandingComponent": {
  "description": "Judgement that is still required, and of what kind. The evaluator derives outstanding judgement itself whenever no human warrant is present; this records WHAT remains, for the person who has to supply it.",
  "type": "object",
  "required": ["requires", "describes"],
  "additionalProperties": false,
  "properties": {
    "requires": { "type": "string", "enum": ["human-review"] },
    "describes": { "type": "string", "minLength": 1 }
  }
}
```

`reviewer` is not added to `required` in the schema: a schema-level requirement would make every legacy attestation invalid. The requirement is the version-gated semantic check in section 2.

### Verification performed

The fragment was applied to a scratch copy and run through `scripts/jsonschema.mjs` and `scripts/yaml.mjs`: an attestation with `reviewer.kind: agent-judgement`, `independence.status: unknown` and one `machineEstablished` contribution validated; `reviewer.kind: robot` was rejected with the four allowed values named; the schema passes `assertSchemaSupported`. The semantic checks, evaluator behaviour and renderers do not exist and were not run.

## The #55 C3 mutation test

C3 requires that a mutation test fails if the credit-without-judgement rule is removed or if the contribution types are conflated.

- **Where:** new mutations registered in the frozen `MUTATIONS` list in `scripts/mutation-check.mjs`, each `{name, file, from, to, gate}`, gated on a new test file `test/typed-warrants.test.mjs`. `test/mutation-targets.test.mjs` (in `npm test`) already checks that every anchor is reachable and byte-literal, so a refactor that moves an anchor fails ordinary CI. The mutation suite itself stays opt-in. The literal anchors are fixed at implementation time against the real code; this record names the behaviours.
- **Mutations (each must make the gate fail):**
  - M1: any approved attestation discharges regardless of kind.
  - M2: machine-established credit satisfies the judgement requirement.
  - M3: the every-required-warrant check or the outstanding check is removed.
  - M4: legacy is inferred human (`kind ?? "human-review"`).
  - M5: the contribution types are merged or relabelled.
  - M6: non-human attestations are listed under the human-review heading.
  - M7: a stale machine contribution is credited.
  - M8: independence is made a prerequisite.
- **Control:** the unmutated tree passes the same gate, and the gate fails with a named message for each mutation rather than for an unrelated reason.
- M2 and M3 are the removal of the credit-without-judgement rule; M5 is the conflation. Together they are what C3 names.

## Red-first test list, mapped to every criterion

New file `test/typed-warrants.test.mjs` (planned), plus additions noted. Each test is written to fail against current main first.

**#55 (FE-24)**

- **C0** (the joint design is recorded): verified by review of this record. No code test.
- **C1** (distinct contribution types):
  - schema accepts each of the three contribution types and rejects malformed ones (missing `established`, empty `paths`, bad `ranAt`);
  - schema rejects a top-level `contributions` key outside an attestation;
  - the result for a rule with one contribution of each type shows three distinct `type` values;
  - `contributions` without `reviewer` is rejected (semantic);
  - `judgement` under `agent-mechanical-review` or `automated-tooling` is rejected (semantic).
- **C2** (machine components credited; no manual pass without every required judgement warrant):
  - a rule with a fresh machine contribution and no human warrant is not passed and the contribution is listed as credited;
  - the same rule with a `human-review` attestation passes;
  - an `agent-judgement` attestation does not pass;
  - a stale machine contribution is not credited (currency `stale`);
  - with a stubbed two-member `judgementWarrantsRequired`, one warrant present does not discharge, both do;
  - an `outstanding` contribution blocks a `human-review` attestation;
  - credit changes no score and no assurance counter.
- **C3** (mutation test): the mutation list above, the reachability check in `test/mutation-targets.test.mjs`, and the control.

**#57 (FE-26)**

- **C0** (typed-warrant model adopted): verified by review of this record.
- **C1** (`reviewer.kind` required, four values):
  - schema accepts each of the four kinds, rejects an unknown kind and an empty `reviewer`;
  - a policy with `standardVersion` at or above the gate and an attestation lacking `reviewer.kind` is invalid (exit 2); the same attestation below the gate is valid and legacy.
- **C2** (independence optional, explicit `unknown`):
  - independence absent, `independent`, `not-independent` and `unknown` all discharge identically for `human-review`;
  - absent renders "not recorded" and `unknown` renders "unknown (recorded)".
- **C3** (legacy reports `unknown warrant`, never inferred human):
  - a legacy approved fixture reports `attested-unknown-warrant`, `warrant: "unknown"`, is absent from the "Attested (human review):" section, and no `human-review` warrant appears in the JSON;
  - a legacy attestation whose `reviewedBy` reads like a person is still `unknown`;
  - a legacy rejection still fails and names the unknown warrant.
- **C4** (AI-authorship disclosure from the observed 14 is representable):
  - an RH-shaped fixture with `reviewedBy: Claude Opus 5 (AI agent), standards adoption experiment`, `kind: agent-judgement`, `independence.status: not-independent` and a `basis` validates, reports `judgement-outstanding`, and shows the warrant and independence in text and JSON;
  - the agent rejection shape (`agent.refusal-on-invariant`) still fails with the warrant named.

**Cross-cutting**

- Envelope `schemaVersion` stays `"2.0"`; the new `denominator` keys are present.
- `standards validate` runs the same semantic checks as `policy`.
- Stale and expired take precedence over kind handling.

## Choices for owner review

Everything not fixed by decisions (a) to (d) took the fail-closed option.

1. **Legacy attestations do not discharge.** They are schema-valid but report `unknown warrant` and are `skipped`. This is the fail-closed reading of "remain valid". Alternative: a transitional window in which legacy still passes but is labelled.
2. **`reviewedBy` is kept as identity**, with `reviewer.kind` the new warrant. Alternative: `reviewer.name` replaces `reviewedBy`.
3. **The "require" gate is `standardVersion >= 3.2.0`**, a placeholder the owner holds.
4. **Contributions are a map keyed by type**, not a flat typed list, because the schema evaluator has no `oneOf`.
5. **Judgement contributions are refused under the mechanical and tooling kinds.**
6. **Any rejection fails, whatever the kind.**
7. **Every manual-review rule requires the single `human-review` warrant**, with no per-rule catalog field.
8. **One attestation slot per rule.** Combining human and agent attestations for one rule is not supported.
9. **Envelope stays `"2.0"`.** The legacy behaviour change is a release-classification matter for the owner.
10. **Migration default for the 14 RH attestations is `agent-judgement`** with `not-independent`.
11. **Independence is an object** with `status` and optional `basis`, rather than a string or a boolean.
12. **`reviewedBy` and `kind` are not cross-checked**; the framework cannot tell whether they agree.
13. **Machine-established contributions are always reported as asserted**; the framework does not re-run tools.
14. **Currency is `unknown` when no digest is recorded**, and an unknown-currency contribution is credited but labelled; a stale one is not credited.
