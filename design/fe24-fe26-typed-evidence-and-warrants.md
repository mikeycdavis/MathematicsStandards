# FE-24 / FE-26 design record: typed evidence contributions and reviewer warrants

**Status: DRAFT, awaiting owner freeze. The owner has NOT frozen this record; PR #119 stays a draft.** Revised 2026-11-16 to apply the owner's binding decisions below. Nothing here is implemented. The pull request that carries this record changes no schema, rule, fixture, VERSION or CHANGELOG file; every schema fragment, fixture and test below is proposed text.
**IMPLEMENTATION OF #55 AND #57 IS BLOCKED** until the owner chooses a human-confirmation mechanism; see "Known gap: a self-declared `human-review`" and `design/fe24-fe26-human-identity-packet.md`.
**Authority:** the owner's finalized criteria for #55 (C0 to C3) and #57 (C0 to C4), `finalized-criteria-2026-11-16.md`, the four original binding decisions (a) to (d), and the owner's revision decisions. This record adds no acceptance criterion.
**Evidence base:** the gap-check reports for #55, #56 and #57 and the live repository at main 14562f6. #55 (typed evidence contributions) and #57 (reviewer warrants) are designed jointly because the discharge rule needs both: a contribution has a type, an attestation has a warrant, and what discharges a manual rule is a statement about warrants.

## Scope

#55 and #57 only. Split-subject applicability (#56) is `design/fe25-split-subject-applicability.md`; the two share the envelope version advance and nothing else.

## Binding owner decisions

Original decisions, as given:

- **(a)** New attestations REQUIRE `reviewer.kind`, with values distinguishing human review, agent judgement, agent mechanical review and automated tooling. Legacy attestations remain valid but report `unknown warrant` and are never inferred human.
- **(b)** Only human review can discharge a manual rule's required judgement warrant. The other three kinds may contribute typed evidence but cannot discharge.
- **(c)** Typed contributions live within the attestation they support.
- **(d)** Agent-authored attestations never get full-human assurance. Independence is optional structured metadata with explicit `unknown`, not a universal prerequisite. Machine-established components may be credited, but a manual rule cannot pass until every required judgement warrant is present.

Revision decisions (2026-11-16), all applied below:

- Legacy attestations stay valid but non-discharging, reported `unknown warrant`.
- `reviewedBy` is kept and a typed `reviewer` object is added.
- Requiring `reviewer.kind` is a BREAKING change, classified for 4.0.0 (a compatibility classification only; no VERSION, tag or release action). The placeholder 3.2.0 is withdrawn.
- Envelope `schemaVersion` advances to `"3.0"`: new dispositions and a changed verdict for legacy attestations are not safely additive.
- Contributions are keyed by type. A `judgement` contribution is rejected under the mechanical and tooling kinds. A rejection is effective whatever the kind. Every manual-review rule requires human judgement. One attestation per rule in the first version. Independence stays structured metadata. Machine-established contributions stay explicitly author-asserted unless re-run. A contribution of unknown currency may be displayed and credited as evidence but cannot discharge a rule; a stale contribution receives no credit.
- A self-declared `human-review` cannot establish that an agent did not author the attestation. This design does NOT claim to enforce decision (d)'s first sentence until a verifiable human-confirmation mechanism is chosen.

## Known gap: a self-declared `human-review`

`reviewer.kind: human-review` is a string the attestation's author writes. Nothing in this design verifies it. An AI agent can write `kind: human-review`, and `reviewedBy` is free text. Consequently:

- **Decision (d), "agent-authored attestations never get full-human assurance", is NOT enforced by this design.** It is enforced only for attestations that honestly declare a non-human kind. For an agent-authored attestation that declares `human-review`, the discharge path gives `assurance: "full"` exactly as today.
- A configurable denylist of agent-looking strings in `reviewedBy` is not a remedy: it is a string match on a self-declared field, defeated by renaming, and it would make the framework appear to enforce what it cannot.
- The design therefore treats the warrant as DECLARED, and says so wherever it reports one: the heading and the JSON `warrant` carry the word `declared` (see section 5). This wording is the honest state of the design, not a way to meet (d).
- Meeting (d) requires a mechanism that does not rest on the attestation's own say-so. Two candidates are compared in `design/fe24-fe26-human-identity-packet.md`. The choice is the owner's, and #55 and #57 implementation stays blocked until it is made.

## What exists today (read from the repository)

- `schemas/project-policy.schema.json` `attestation`: required `status`, `reviewedBy`, `reviewedAt`, `evidence`; optional `reference`, `expires`, `reviewedAgainst`; `additionalProperties: false`. `reviewedBy` is free text.
- `scripts/compliance.mjs` `judgeAttestation()` checks in this order: not attestable, contradicted by an automated hit, rejected, expired or stale, then pass with `disposition: "attested"` and `assurance: "full"`. Every approved, fresh attestation is full human assurance, whoever wrote it.
- `summarise()` computes `assurance {automated, manualReview, notEvaluated}`, which sum to the rule count.
- The human renderer prints one section, "Attested (human review):", for every attested result.
- The vendored schema evaluator supports only `$schema $id $ref $defs title description type required properties additionalProperties propertyNames pattern enum const minLength items minItems format` and throws on any other keyword: no `oneOf`, `if/then` or `uniqueItems`. `format` is an annotation only. Conditional rules therefore live in a semantic layer, as `policy.missing-revisit-condition` does in `scripts/policy.mjs`.
- `standards validate` runs schema validation only; the semantic findings are in `policy`.
- The vendored YAML reader accepts block style only (no flow sequences or mappings) and returns every scalar as a string.
- The observed adopter case: `artifacts/adoption/rh-attestation-measurement.md` and `rh-attestation-validate.json` record 14 attestations (12 approved, 2 rejected: `formal.statement-overclaim` and `agent.refusal-on-invariant`), each with `reviewedBy: Claude Opus 5 (AI agent), standards adoption experiment`. That every attestation was AI-authored and is not independent human review is disclosed only in a YAML comment, which no tool reads. The measured run had score 89 over a denominator of 53 with 3 blocking rules. `design/v1.1-candidates.md` section 0l records the gap.

## Design

### 1. The reviewer object

`attestations.<rule>.reviewer`, an object:

```yaml
reviewer:
  kind: human-review            # required inside reviewer
  independence:                 # optional
    status: independent         # independent | not-independent | unknown
    basis: Reviewer did not write the proof.   # optional
```

- `kind` is one of `human-review`, `agent-judgement`, `agent-mechanical-review`, `automated-tooling`. It is the DECLARED warrant: what sort of act the attestation says it records. It is not verified (see the known gap).
- `reviewedBy` is kept, still required, and still says WHO or WHAT. `kind` says what sort. The two are not cross-checked.
- `independence` is optional structured metadata and is never read to decide whether a review stands. Absent is reported as "independence: not recorded". An explicit `unknown` is reported as "independence: unknown (recorded)". The two render differently.

Naming: the schema KEY is `machineEstablished` (camelCase, like the rest of the policy) and the reported `type` VALUE is `machine-established` (kebab-case, like dispositions). They are the same type, mapped one to one. `judgement` and `outstanding` are spelled the same in both.

### 2. Legacy detection and the requirement

- **Legacy means the attestation has no `reviewer` key.** It is never inferred from `reviewedBy` text, comments, other fields or the date. A legacy attestation is schema-valid, remains valid, and does NOT discharge: it reports `unknown warrant`.
- **The requirement is a BREAKING change gated at 4.0.0.** A semantic check, gated on a constant `WARRANT_REQUIRED_FROM = "4.0.0"` compared with the policy's declared `standardVersion`, makes an attestation without `reviewer.kind` invalid configuration (exit 2, `attestation.reviewer-kind-required`) in a policy at or above the gate. Below the gate it is legacy. This is a compatibility classification only: it takes no VERSION, tag or release action.
- Until a framework release at or above 4.0.0 exists and an adopter declares it, decision (a)'s "new attestations REQUIRE `reviewer.kind`" is not enforced for that adopter. This is a stated consequence of the gate, not a defect to be hidden.
- Legacy handling reads the attestation's shape, not the date.

### 3. Typed contributions within the attestation

`attestations.<rule>.contributions` is a map whose KEY is the type, so a contribution cannot be filed under two types and a stray value cannot select a third, and the schema expresses it without `oneOf`.

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

- **machineEstablished**: required `established`, `tool`, `paths`, `ranAt`; optional `command`, `digest`, `reference`. A fact a program established, in a form that can be checked for freshness.
- **judgement**: required `statement`; optional `reference`. Its warrant is always the carrying attestation's `reviewer.kind`, never its own field.
- **outstanding**: required `requires` (enum with one value, `human-review`) and `describes`. Names judgement still required. The evaluator derives outstanding judgement itself when no human warrant is present; this records what remains.

**Freshness and digest.** The digest is computed over `paths` with the same algorithm as `reviewedAgainst.digest` (`attestationDigests` in `scripts/standards.mjs`: sha256 over sorted paths plus content, 32 hex), keyed per contribution. Currency is `verified-current` (digest present and equal), `stale` (digest present and different), or `unknown` (no digest recorded; the validator prints the current digest so it can be recorded, as today).

- A `stale` contribution receives no credit.
- An `unknown`-currency contribution may be displayed and credited as evidence, labelled as such, and cannot discharge a rule. (No machine contribution discharges a manual rule in any case; this states the currency rule.)
- Every machine-established contribution is reported as author-asserted: "ran at <ranAt>, asserted by the attestation's author, not re-run". The framework does not re-run the tool.

**Cross-checks (semantic layer):**

- `contributions` requires `reviewer` (`attestation.contributions-without-reviewer`).
- A `judgement` contribution is rejected under `agent-mechanical-review` and `automated-tooling` (`attestation.judgement-under-non-judging-kind`).

### 4. Required judgement warrants and discharge

Pure function, no catalog field:

```
judgementWarrantsRequired(rule) -> ["human-review"]   // every manual-review rule
```

The discharge check requires every warrant in the returned set to be present, and a unit test uses a stubbed two-member set to prove one warrant present does not discharge. A manual rule is discharged (pass, `disposition: "attested"`, full assurance) only when all hold:

1. the attestation is `approved`;
2. `reviewer.kind` is `human-review` AS DECLARED (not verified; see the known gap);
3. it is fresh (not stale, not expired);
4. it carries no `outstanding` contribution;
5. no automated detector contradicts it (unchanged: an automated hit fails first).

### 5. Dispositions and reporting

Evaluation order: not attestable; contradicted by an automated hit; rejected; stale or expired; then kind handling. Stale and expired take precedence over kind, so a stale agent attestation reports as stale.

| Situation | Status | Disposition | `notEvaluatedBecause` |
|---|---|---|---|
| Approved, fresh, declared `human-review`, no outstanding | pass | `attested` | none |
| Approved, fresh, known kind other than `human-review` | skipped | `judgement-outstanding` | `human-judgement-outstanding` |
| Approved, fresh, `human-review` with an outstanding contribution | skipped | `judgement-outstanding` | `human-judgement-outstanding` |
| Approved, legacy (no `reviewer`) | skipped | `attested-unknown-warrant` | `unknown-warrant` |
| Rejected, any kind including legacy | fail | `attested-rejected` | none; the warrant is named |
| Stale or expired | skipped | unchanged | unchanged |

- A `judgement-outstanding` result lists its credited components. Credit has no effect on status, score, or the three assurance counters.
- Per-result JSON additions: `warrant` (the declared kind, or `"unknown"`), `attestation.reviewer`, and `contributions[]` with `type` one of `machine-established`, `judgement`, `outstanding`, plus `currency` for machine-established. `denominator` gains the informational counts `unknownWarrant` and `humanJudgementOutstanding`.
- Human text: the single section is split. "Attested (human review, as declared by the attestation):" lists only discharged rules, and the wording `as declared` stays until a verification mechanism exists. "Judgement outstanding (n):" lists the second and third rows with credited components and the kind. "Unknown warrant (n):" lists legacy attestations: "attestation does not say what kind of reviewer made it; not credited as human review". `standards explain <rule>` prints the declared warrant, the independence statement, each contribution with type and currency, and what remains outstanding.
- A rejection from any kind fails: a rejection is a finding, not a credit. Invariant behaviour is unchanged.
- One attestation per rule in the first version; combining a human and an agent attestation for one rule is not supported.

### 6. Score and assurance effect

None from credit. A discharged rule counts as manual-review as today. A `judgement-outstanding` or `unknown-warrant` rule is `skipped`, excluded from the score denominator unless blocked, and counted in `assurance.notEvaluated`; the three counters still sum. The informational counts make the exclusion visible. The score of a discharged rule still reflects only a declared warrant.

### 7. Envelope schema version

`ENVELOPE_SCHEMA_VERSION` advances from `"2.0"` to `"3.0"` (owner decision). The new dispositions and the changed verdict for legacy attestations are not safely additive. `test/envelope-schema-version.test.mjs`, which asserts `"2.0"` today, changes with it. The split-subject record makes the same advance; one bump covers both, and whichever implementation lands first makes it.

### 8. Migration of the 14 RH attestations

- Add to each of the 14, in block style, `reviewer.kind: agent-judgement` and `reviewer.independence` with `status: not-independent` and a `basis` carrying the disclosure now in the YAML comment. `agent-judgement` is the accurate reading of "Claude Opus 5 (AI agent)" exercising judgement; the adopter may reclassify an item it can show was mechanical.
- Effect, as expectation not measurement: the 12 approvals become `judgement-outstanding` (not-evaluated, out of the denominator); the 2 rejections stay failures with the warrant named. The verdict is expected to remain `BLOCKED_BY_INVARIANT`. The score falls by up to the 12 passes leaving the denominator; the exact figure must be re-measured against the RH repository, which is not in this repository, and is not computed here.
- The 2 rejections staying failures, and `agent.refusal-on-invariant` being judged at all, depend on the engine judging attestations on invariant rules, which it does today. See "The nonExemptible contradiction" below.
- Before the gate is reached the 14 are legacy and report `unknown warrant`; the migration is also how an adopter leaves that state.
- Migration does not and cannot make any of the 14 a verified human review.

### 9. The nonExemptible contradiction (implementer note)

The policy schema's `attestations` description says an attestation never reaches a rule that is `forbidden` and `nonExemptible`, but `judgeAttestation` has no such check (its header attributes the protection to the automated failure surviving, which holds only where a detector exists). The RH migration above and the RH rejection cases depend on the engine's actual behaviour. The proposed resolution, correcting the schema description to match the engine, is stated once in `design/fe25-split-subject-applicability.md` ("The nonExemptible contradiction, resolved explicitly") and is owner-review choice 3 below. Neither this record's fixtures nor its tests depend on the choice, except that the RH-shaped rejection test names the engine behaviour it relies on.

## Schema fragment (exact)

Applied to a scratch copy of `schemas/project-policy.schema.json` and exercised through the repository's own evaluator (see "Verification performed"). In `$defs.attestation.properties` add:

```json
"reviewer": { "$ref": "#/$defs/reviewer" },
"contributions": { "$ref": "#/$defs/contributions" }
```

In `$defs` add:

```json
"reviewer": {
  "description": "What kind of reviewer made this attestation (Standard 19 R6, FE-26). `kind` is the DECLARED warrant: it says what sort of act the attestation says it records, and the framework does not verify it. It is never inferred: an attestation with no `reviewer` is legacy and reports `unknown warrant`. `reviewedBy` still says WHO or WHAT; `kind` says what sort, and the framework does not check that the two agree.",
  "type": "object",
  "required": ["kind"],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "description": "`human-review`: a person exercised mathematical judgement. `agent-judgement`: an AI agent exercised judgement. `agent-mechanical-review`: an AI agent carried out a check whose outcome its procedure fixes. `automated-tooling`: a program ran, with no agent in the loop. Only `human-review` can discharge a manual-review rule, as declared.",
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

`reviewer` is not added to `required` in the schema: that would make every legacy attestation invalid. The requirement is the version-gated semantic check in section 2.

### Verification performed

The fragment was applied to a scratch copy and run through `scripts/jsonschema.mjs` and `scripts/yaml.mjs`: an attestation with `reviewer.kind: agent-judgement`, `independence.status: unknown` and a `machineEstablished` contribution validated; `reviewer.kind: robot` was rejected with the four allowed values named; a top-level `contributions` key was rejected as an unknown property; the schema passes `assertSchemaSupported`. The semantic checks, evaluator behaviour and renderers do not exist and were not run.

## The #55 C3 mutation test

C3 requires that a mutation test fails if the credit-without-judgement rule is removed or if the contribution types are conflated.

- **Where:** new mutations registered in the frozen `MUTATIONS` list in `scripts/mutation-check.mjs`, each `{name, file, from, to, gate}`, gated on a new test file `test/typed-warrants.test.mjs`. `test/mutation-targets.test.mjs` (in `npm test`) already checks that every anchor is reachable and byte-literal. The mutation suite itself stays opt-in. Literal anchors are fixed at implementation time; this record names the behaviours.
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
- M2 and M3 are the removal of the credit-without-judgement rule; M5 is the conflation.

## Red-first test list, mapped to every criterion

New file `test/typed-warrants.test.mjs` (planned). Each test is written to fail against current main first.

**#55 (FE-24)**

- **C0** (the joint design is recorded): verified by review of this record.
- **C1** (distinct contribution types):
  - schema accepts each of the three types and rejects malformed ones (missing `established`, empty `paths`, bad `ranAt`);
  - schema rejects a top-level `contributions` key outside an attestation;
  - a rule with one contribution of each type shows three distinct `type` values;
  - `contributions` without `reviewer` is rejected (semantic);
  - `judgement` under `agent-mechanical-review` or `automated-tooling` is rejected (semantic).
- **C2** (machine components credited; no manual pass without every required judgement warrant):
  - a rule with a fresh machine contribution and no human warrant is not passed, and the contribution is listed as credited;
  - the same rule with a declared `human-review` attestation passes;
  - an `agent-judgement` attestation does not pass;
  - a stale machine contribution receives no credit; an unknown-currency one is displayed and credited as evidence and cannot discharge;
  - with a stubbed two-member `judgementWarrantsRequired`, one warrant present does not discharge, both do;
  - an `outstanding` contribution blocks a `human-review` attestation;
  - credit changes no score and no assurance counter.
- **C3** (mutation test): the mutation list above, the reachability check, and the control.

**#57 (FE-26)**

- **C0** (typed-warrant model adopted): verified by review of this record.
- **C1** (`reviewer.kind` required, four values):
  - schema accepts each of the four kinds, rejects an unknown kind and an empty `reviewer`;
  - a policy with `standardVersion` at or above `4.0.0` and an attestation lacking `reviewer.kind` is invalid (exit 2); the same attestation below `4.0.0` is valid and legacy.
- **C2** (independence optional, explicit `unknown`):
  - independence absent, `independent`, `not-independent` and `unknown` all discharge identically for declared `human-review`;
  - absent renders "not recorded" and `unknown` renders "unknown (recorded)".
- **C3** (legacy reports `unknown warrant`, never inferred human):
  - a legacy approved fixture reports `attested-unknown-warrant`, `warrant: "unknown"`, is absent from the human-review section, and no `human-review` warrant appears in the JSON;
  - a legacy attestation whose `reviewedBy` reads like a person is still `unknown`;
  - a legacy rejection still fails and names the unknown warrant.
- **C4** (the AI-authorship disclosure from the observed 14 is representable):
  - an RH-shaped fixture with `reviewedBy: Claude Opus 5 (AI agent), standards adoption experiment`, `kind: agent-judgement`, `independence.status: not-independent` and a `basis` validates, reports `judgement-outstanding`, and shows the warrant and independence in text and JSON;
  - the agent rejection shape (`agent.refusal-on-invariant`) still fails with the warrant named. This test relies on the engine judging attestations on invariant rules (section 9) and says so in its name.

**Cross-cutting**

- Envelope `schemaVersion` is `"3.0"`; the new `denominator` keys are present.
- `standards validate` runs the same semantic checks as `policy`.
- Stale and expired take precedence over kind handling.
- The warrant is labelled as declared in text and JSON. Nothing in the test list asserts that an agent-authored `human-review` attestation is refused, because the design does not do that.

## Owner decisions recorded in this revision

Settled by the owner on 2026-11-16 and applied above: legacy valid but non-discharging; `reviewedBy` kept with a typed `reviewer` object; the requirement a BREAKING change gated at 4.0.0 (compatibility classification only); envelope `"3.0"`; contributions keyed by type; `judgement` contributions rejected under mechanical and tooling kinds; rejections effective whatever the kind; every manual-review rule requires human judgement; one attestation per rule in the first version; structured independence metadata; machine-established contributions author-asserted unless re-run; unknown-currency contributions credited as evidence and unable to discharge; stale contributions uncredited.

## Choices for owner review

The earlier list is reduced to what the owner has not decided. None of these is described as fail-closed unless it is.

1. **BLOCKER: the human-confirmation mechanism.** Decision (d)'s "agent-authored attestations never get full-human assurance" is not enforced, because `human-review` is self-declared. The framework cannot establish that an agent did not author an attestation by reading the attestation. A string denylist is insufficient. The options, with threat model, costs and a recommendation marked for owner decision, are in `design/fe24-fe26-human-identity-packet.md`. Until the owner picks one, #55 and #57 implementation is blocked, and this design must not be described as meeting (d).
2. **Migration default for the 14 RH attestations is `agent-judgement`.** This is fail-closed (it under-claims). The adopter may reclassify.
3. **The nonExemptible contradiction** (section 9): correct the schema description to match the engine (proposed), or make the engine refuse attestations on invariants (changes existing verdicts). Stated in full in the split-subject record, choice 6.
4. **The `reviewedBy` and `kind` pair is not cross-checked.** This is the lenient option and is subsumed by choice 1: no cross-check can be reliable on free text.
5. **Ordering with #56:** the split-subject fixture S2 carries an attestation whose shape depends on which of #56 and #57 lands first.
