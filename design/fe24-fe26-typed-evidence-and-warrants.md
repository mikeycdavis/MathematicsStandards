# FE-24 / FE-26 design record: typed evidence contributions and reviewer warrants

**Status: design-complete pending exact-head review; implementation not begun and blocked until the signature design is complete and the real Lean-data packet exists. PR #119 stays a draft.** Revised 2026-11-16 to apply the owner's binding decisions below, including the signed-human-confirmation decision. Nothing here is implemented. The pull request that carries this record changes no schema, rule, fixture, VERSION or CHANGELOG file, generates no key and defines no signing ceremony; every schema fragment, fixture and test below is proposed text.
**IMPLEMENTATION OF #55 AND #57 IS BLOCKED** until the signature design in "Signed human confirmation" is reviewed complete, the owner adopts external key custody (if it is not adopted, #55 and #57 stay blocked), and the real Lean-data packet for #56 exists (see `design/fe25-split-subject-applicability.md`). The mechanism decision is recorded in `design/fe24-fe26-human-identity-packet.md`: Option A (signature) adopted for discharge, Option B (owner confirmation) provenance only.
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
- Human confirmation (owner decision, 2026-11-16): Option A adopted for discharge, Option B as provenance only. A `human-review` attestation discharges only with a valid Ed25519 signature from an externally trusted signer; see "Signed human confirmation". Legacy and unsigned declarations stay valid evidence with unknown or unconfirmed warrant. An owner-confirmation event is never called full-human assurance.
- A rejection with incomplete split coverage still fails and the result shows BOTH (decided; fe25 T7). `nonExemptible` prohibits exceptions and waivers, not evidence-bearing attestations (decided; section 9).

## Signed human confirmation (owner decision 2026-11-16)

**Decision.** A `human-review` attestation reaches full-human assurance only with a valid Ed25519 signature from an externally trusted signer. Verification uses the built-in `node:crypto`; no dependency is added. The trust anchor comes from owner-controlled configuration OUTSIDE the repository. A missing, invalid, revoked or untrusted signature fails closed and cannot discharge. If external key custody is not adopted by the owner, #55 and #57 stay blocked.

**What this does and does not establish.** A valid signature proves that the holder of a trusted private key approved exactly this attestation content for this repository, rule, kind and date. It does not prove that the signer is human: an agent that can use the private key can sign. Decision (d), "agent-authored attestations never get full-human assurance", is therefore enforced to the extent the private key is held outside any agent's reach, which the framework cannot verify. This is the stated residual limit. A string denylist on `reviewedBy` is not part of the design: it would be a match on a self-declared field.

An owner-confirmation event may be recorded as auditable provenance, but without a trusted signature it is non-discharging and is never called full-human assurance.

### Signed payload and canonicalization

The signature is over the UTF-8 bytes of this text, LF line endings, one `name: value` line each, in this exact order, ending with a final LF:

```
mathstd-attestation-signature/1
repository: <repository identity>
rule: <rule id>
kind: <reviewer.kind>
digest: <attestation content digest>
reviewed: <reviewedAt, YYYY-MM-DD>
confirmation: <confirmation identifier>
```

The first line is a domain-separation tag. The verifier BUILDS this text itself; none of its values is taken on trust from the signature:

- `repository` is the `repository` value of the external trust configuration (not anything in the repository);
- `rule` is the key of the attestation in the `attestations` map;
- `kind` is the attestation's own `reviewer.kind`;
- `digest` is computed by the framework from the attestation as read (below);
- `reviewed` is the attestation's `reviewedAt`;
- `confirmation` is `signature.confirmation`.

Any of these differing from what the signer signed makes the signature fail, so a signature cannot be moved to another rule, repository, kind, date or content.

**Attestation content digest.** SHA-256, lower-case hex, the full 64 characters (not the 32-character truncation used by `reviewedAgainst`). Input: take every field of the attestation EXCEPT `signature` and `ownerConfirmation`, flatten each scalar to a path (`reviewer.kind`, `reviewedAgainst.paths[0]`, `contributions.machineEstablished[0].tool`, with array indices in order), emit one line per scalar as `<path>` TAB `<JSON.stringify(value)>` LF, sort the lines by path bytewise, and hash the UTF-8 bytes of the joined text. YAML key order, quoting and comments do not affect it. All scalars are strings, as the vendored reader returns them. Because `reviewer`, `contributions`, `reviewedAgainst` (including its own `digest`, `revision` and `portions`) and `evidence` are inside the digest, editing any of them invalidates the signature.

A golden test fixes the exact bytes of the payload and the digest for one attestation, so an accidental change of canonicalization fails loudly.

### Signature field shape

`attestations.<rule>.signature`:

```yaml
signature:
  algorithm: ed25519
  keyId: <64 hex>            # SHA-256 of the raw 32-byte public key
  confirmation: <identifier>  # 8 to 64 characters of A-Z a-z 0-9 . _ -
  value: <base64>            # the 64-byte Ed25519 signature, 88 characters with padding
```

All four fields are required; no other key is allowed. `confirmation` is an identifier the signer chooses, unique per signing act, so that one confirmation can be revoked without revoking a key.

### External trust configuration

- **Supplied by:** the environment variable `MATHSTD_TRUST_CONFIG`, holding the path of a JSON file, or the flag `--trust-config <path>` on the command. The flag wins.
- **Must be outside the repository:** the resolved real path of the file must not lie inside the repository root being evaluated. A trust configuration found inside the repository is IGNORED and reported as `trust.config-inside-repository`; every signed attestation then reports unconfirmed. Without this rule an agent could add its own key to a file in the working tree.
- **Format** (JSON, `version` 1):

```json
{
  "version": 1,
  "repository": "github.com/mikeycdavis/MathematicsStandards",
  "signers": [
    {
      "keyId": "<64 hex: sha256 of the raw public key>",
      "publicKey": "<base64 of the 32 raw bytes>",
      "name": "<display name>",
      "notBefore": "YYYY-MM-DD",
      "notAfter": "YYYY-MM-DD"
    }
  ],
  "revokedKeys": [ { "keyId": "<64 hex>", "revokedAt": "YYYY-MM-DD", "reason": "<text>" } ],
  "revokedConfirmations": [ { "confirmation": "<identifier>", "revokedAt": "YYYY-MM-DD", "reason": "<text>" } ]
}
```

- **Key handling:** the verifier recomputes the SHA-256 of `publicKey` and requires it to equal `keyId`; a mismatch makes that signer entry invalid (`trust.key-fingerprint-mismatch`). It builds a `node:crypto` public key object from the 32 raw bytes (the fixed Ed25519 SPKI prefix followed by the key) and verifies with `crypto.verify(null, payload, key, signature)`. The exact call is fixed at implementation time and checked by a test.
- The repository never holds a private key or a trust anchor. This design generates no key, and defines no signing ceremony.

### Revocation and key rotation

- **Revoked key:** every signature by a key listed in `revokedKeys` is invalid, whatever its date. The signed `reviewed` date is the signer's own assertion, so it cannot be used to honour signatures made before revocation.
- **Revoked confirmation:** a signature whose `confirmation` is listed is invalid; the key stays trusted.
- **Validity window:** a signer is trusted only while the verification date (today) is within `notBefore` to `notAfter`. An expired key makes its signatures fail until re-signed under a current key.
- **Rotation:** the owner adds the new signer, overlaps the windows, re-signs attestations, then removes or revokes the old key. A signature by a key absent from the configuration is `untrusted-key`.
- Revocation and rotation are changes to the external configuration and need no change to the repository.

### Offline and CI behaviour

Verification is entirely local: a file read, a SHA-256 and an Ed25519 verification. It never uses the network. In CI the trust configuration is supplied as a secret file mounted outside the checkout and named by `MATHSTD_TRUST_CONFIG`. When no configuration is supplied, nothing errors: every human-review attestation reports `no-trust-config` and does not discharge, and the report says so once.

### Dispositions and report wording

A discharge needs the conditions in section 4 and a valid signature. Signature outcomes (one per attestation, shown as `signature` in the result):

| Outcome | Meaning |
|---|---|
| `verified` | payload verified under a trusted, current, unrevoked key |
| `missing` | no `signature` field |
| `malformed` | the field fails its shape, or the key id does not match the configured key |
| `invalid` | the signature does not verify over the payload the verifier built |
| `untrusted-key` | the key is not in the configuration |
| `revoked-key`, `revoked-confirmation` | listed as revoked |
| `key-expired` | outside the signer's window |
| `no-trust-config` | no configuration supplied |
| `trust-config-inside-repository` | configuration ignored |

- `warrantBasis` is `verified-signature` only when the outcome is `verified` and the kind is `human-review`; `declared` when a `reviewer.kind` is present without a verified signature; `none` for a legacy attestation.
- An approved `human-review` attestation without a `verified` signature has `disposition: "attested-unconfirmed"`, status `skipped`, `notEvaluatedBecause: "human-signature-unverified"`, with the signature outcome listed. It is not a pass and not full assurance. Legacy attestations keep `attested-unknown-warrant`.
- A rejected attestation fails regardless of signature: a rejection needs no confirmation, because the framework never relaxes on a rejection.
- Human text: "Attested (human review, signed by <name>):" lists only discharged rules. "Unconfirmed (n):" lists `attested-unconfirmed` rules with the outcome, for example "declared human-review; signature missing; not credited as full-human assurance". The word "full-human assurance" appears only for `verified-signature`.
- An attestation of another kind may carry a signature as provenance; it does not change discharge.
- **Owner confirmation as provenance:** an optional `ownerConfirmation` object (`by`, `at`, optional `reference`) records that the owner confirmed the attestation. It is unsigned, outside the digest, and non-discharging. It is displayed as "owner confirmation recorded, unsigned; not full-human assurance". It never changes a disposition.

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

- `kind` is one of `human-review`, `agent-judgement`, `agent-mechanical-review`, `automated-tooling`. It is the DECLARED warrant: what sort of act the attestation says it records. The declaration alone is not verified; for `human-review` the signature (see "Signed human confirmation") is what makes it count.
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
2. `reviewer.kind` is `human-review`;
3. it carries a `signature` whose outcome is `verified` against the external trust configuration;
4. it is fresh (not stale, not expired);
5. it carries no `outstanding` contribution;
6. no automated detector contradicts it (unchanged: an automated hit fails first).

For a split-subject rule the applicability must also be complete (fe25).

### 5. Dispositions and reporting

Evaluation order: not attestable; contradicted by an automated hit; rejected; stale or expired; then kind handling. Stale and expired take precedence over kind, so a stale agent attestation reports as stale.

| Situation | Status | Disposition | `notEvaluatedBecause` |
|---|---|---|---|
| Approved, fresh, `human-review`, signature `verified`, no outstanding | pass | `attested` | none |
| Approved, fresh, `human-review`, signature not `verified` | skipped | `attested-unconfirmed` | `human-signature-unverified` |
| Approved, fresh, known kind other than `human-review` | skipped | `judgement-outstanding` | `human-judgement-outstanding` |
| Approved, fresh, `human-review` with an outstanding contribution | skipped | `judgement-outstanding` | `human-judgement-outstanding` |
| Approved, legacy (no `reviewer`) | skipped | `attested-unknown-warrant` | `unknown-warrant` |
| Rejected, any kind including legacy | fail | `attested-rejected` | none; the warrant is named |
| Stale or expired | skipped | unchanged | unchanged |

- A `judgement-outstanding` result lists its credited components. Credit has no effect on status, score, or the three assurance counters.
- Per-result JSON additions: `warrant` (the declared kind, or `"unknown"`), `warrantBasis` (`"verified-signature"` for `human-review` with a verified signature, `"declared"` for a `reviewer.kind` without one, `"none"` for a legacy attestation, so a consumer can never read `warrant` as verified unless the basis says so), `signature` (the outcome from "Signed human confirmation"), `attestation.reviewer`, and `contributions[]` with `type` one of `machine-established`, `judgement`, `outstanding`, plus `currency` for machine-established. `denominator` gains the informational counts `unknownWarrant` and `humanJudgementOutstanding`.
- Human text: the single section is split. "Attested (human review, signed by <name>):" lists only discharged rules. "Unconfirmed (n):" lists `attested-unconfirmed` rules with the signature outcome. "Judgement outstanding (n):" lists the second and third rows with credited components and the kind. "Unknown warrant (n):" lists legacy attestations: "attestation does not say what kind of reviewer made it; not credited as human review". `standards explain <rule>` prints the declared warrant, the independence statement, each contribution with type and currency, and what remains outstanding.
- A rejection from any kind fails: a rejection is a finding, not a credit. Invariant behaviour is unchanged.
- One attestation per rule in the first version; combining a human and an agent attestation for one rule is not supported.

### 6. Score and assurance effect

None from credit. A discharged rule counts as manual-review as today. A `judgement-outstanding` or `unknown-warrant` rule is `skipped`, excluded from the score denominator unless blocked, and counted in `assurance.notEvaluated`; the three counters still sum. The informational counts make the exclusion visible. An `attested-unconfirmed` rule is skipped and counted in `assurance.notEvaluated` in the same way. A discharged rule reflects a verified signature, which proves key possession and not humanity (see the residual limit).

### 7. Envelope schema version

`ENVELOPE_SCHEMA_VERSION` advances from `"2.0"` to `"3.0"` (owner decision). The new dispositions and the changed verdict for legacy attestations are not safely additive. `test/envelope-schema-version.test.mjs`, which asserts `"2.0"` today, changes with it. The split-subject record makes the same advance; one bump covers both, and whichever implementation lands first makes it.

### 8. Migration of the 14 RH attestations

- Add to each of the 14, in block style, `reviewer.kind: agent-judgement` and `reviewer.independence` with `status: not-independent` and a `basis` carrying the disclosure now in the YAML comment. `agent-judgement` is the accurate reading of "Claude Opus 5 (AI agent)" exercising judgement; the adopter may reclassify an item it can show was mechanical.
- Effect, as expectation not measurement: the 12 approvals become `judgement-outstanding` (not-evaluated, out of the denominator); the 2 rejections stay failures with the warrant named. The verdict is expected to remain `BLOCKED_BY_INVARIANT`. The score falls by up to the 12 passes leaving the denominator; the exact figure must be re-measured against the RH repository, which is not in this repository, and is not computed here.
- The 2 rejections staying failures, and `agent.refusal-on-invariant` being judged at all, depend on the engine judging attestations on invariant rules, which it does today. See section 9 (decided).
- Before the gate is reached the 14 are legacy and report `unknown warrant`; the migration is also how an adopter leaves that state.
- Migration does not and cannot make any of the 14 a verified human review, and with `agent-judgement` they need no signature.
- Any adopter attestation that declares `human-review` without a signature becomes `attested-unconfirmed` (skipped, out of the denominator). The signature requirement for discharge is not version-gated; only the require-`reviewer.kind` check is gated at 4.0.0. To discharge, the owner signs the attestation under an externally held key; this design performs no signing and generates no key.

### 9. The nonExemptible contradiction (DECIDED)

The policy schema's `attestations` description says an attestation never reaches a rule that is `forbidden` and `nonExemptible`, but `judgeAttestation` has no such check. Owner decision (2026-11-16): correct the schema description to match the engine. `nonExemptible` prohibits exceptions and waivers; it does not prohibit evidence-bearing attestations for manual-review rules. A rejection remains effective. An approval may discharge only when applicability is complete AND the required trusted signed human warrant is present. The exact proposed description text is in `design/fe25-split-subject-applicability.md` ("The nonExemptible contradiction, decided"). The RH migration and the RH rejection cases rely on this engine behaviour, and the fixtures and tests in both records are adjusted to it.

## Schema fragment (exact)

Applied to a scratch copy of `schemas/project-policy.schema.json` and exercised through the repository's own evaluator (see "Verification performed"). In `$defs.attestation.properties` add:

```json
"reviewer": { "$ref": "#/$defs/reviewer" },
"contributions": { "$ref": "#/$defs/contributions" },
"signature": { "$ref": "#/$defs/signature" },
"ownerConfirmation": { "$ref": "#/$defs/ownerConfirmation" }
```

In `$defs` add:

```json
"reviewer": {
  "description": "What kind of reviewer made this attestation (Standard 19 R6, FE-26). `kind` is the DECLARED warrant: it says what sort of act the attestation says it records. For `human-review` it counts only with a verified `signature`. It is never inferred: an attestation with no `reviewer` is legacy and reports `unknown warrant`. `reviewedBy` still says WHO or WHAT; `kind` says what sort, and the framework does not check that the two agree.",
  "type": "object",
  "required": ["kind"],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "description": "`human-review`: a person exercised mathematical judgement. `agent-judgement`: an AI agent exercised judgement. `agent-mechanical-review`: an AI agent carried out a check whose outcome its procedure fixes. `automated-tooling`: a program ran, with no agent in the loop. Only `human-review` with a verified signature can discharge a manual-review rule.",
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
"signature": {
  "description": "Ed25519 signature over the payload the verifier builds from the external trust configuration, the attestation's rule id and kind, its content digest, `reviewedAt` and `confirmation`. Verified only against a trust configuration outside the repository. Absent, malformed, invalid, untrusted, revoked or unverifiable fails closed: the attestation is evidence and does not discharge.",
  "type": "object",
  "required": ["algorithm", "keyId", "confirmation", "value"],
  "additionalProperties": false,
  "properties": {
    "algorithm": { "type": "string", "enum": ["ed25519"] },
    "keyId": { "description": "SHA-256 of the raw 32-byte public key, lower-case hex.", "type": "string", "pattern": "^[0-9a-f]{64}$" },
    "confirmation": { "description": "Identifier chosen by the signer for this signing act; revocable on its own.", "type": "string", "pattern": "^[A-Za-z0-9._-]{8,64}$" },
    "value": { "description": "Base64 of the 64-byte signature, with padding.", "type": "string", "pattern": "^[A-Za-z0-9+/]{86}==$" }
  }
},
"ownerConfirmation": {
  "description": "Provenance only: records that the owner confirmed this attestation. Unsigned, outside the content digest and non-discharging. It never changes a disposition and is never called full-human assurance.",
  "type": "object",
  "required": ["by", "at"],
  "additionalProperties": false,
  "properties": {
    "by": { "type": "string", "minLength": 1 },
    "at": { "type": "string", "format": "date", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
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

The fragment was applied to a scratch copy and run through `scripts/jsonschema.mjs` and `scripts/yaml.mjs`: an attestation with `reviewer.kind: agent-judgement`, `independence.status: unknown` and a `machineEstablished` contribution validated; `reviewer.kind: robot` was rejected with the four allowed values named; a top-level `contributions` key was rejected as an unknown property; the schema passes `assertSchemaSupported`. Re-run on 2026-11-16 with the new fragments: a well-formed `signature` and an `ownerConfirmation` validated; a 63-character `keyId`, a wrong-length base64 `value`, a 2-character `confirmation`, a non-`ed25519` algorithm and an extra `publicKey` key in the signature were each rejected at the named path, and an `ownerConfirmation` without `by` was rejected. No Ed25519 key was generated, so the `node:crypto` verification call itself was not exercised; it is fixed and tested at implementation. The semantic checks, evaluator behaviour and renderers do not exist and were not run.

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
  - M9: the signature check is skipped (a `human-review` attestation discharges unsigned).
  - M10 to M15: the payload omits, in turn, the rule id, the repository identity, the kind, the digest, the reviewed date, the confirmation identifier.
  - M16: a trust configuration inside the repository is accepted.
  - M17: revocation (key or confirmation) is ignored.
  - M18: the public key is taken from the signature or the attestation instead of the trust configuration.
  - M19: an invalid or unverifiable signature fails open.
  - M20: an `ownerConfirmation` is treated as a discharge.
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
  - the same rule with a `human-review` attestation carrying a verified signature passes (the test generates its Ed25519 keypair in memory; no key is ever committed);
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
  - independence absent, `independent`, `not-independent` and `unknown` all discharge identically for a signed `human-review`;
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
- `warrantBasis` is `verified-signature` only for a verified `human-review`, `declared` otherwise with a kind, `none` for legacy.
- **Signature (cross-cutting, each asserting a specific finding id or outcome, never only a nonzero exit):**
  - a valid signature discharges; the result shows `signature: verified` and the signer name;
  - a missing signature gives `attested-unconfirmed` with outcome `missing`;
  - a tampered attestation field, and a signature moved to another rule, repository, kind, reviewed date or confirmation, each give outcome `invalid` and do not discharge;
  - an untrusted key, a revoked key (including for a signature dated before revocation), a revoked confirmation (key still trusted), an expired key, and a key whose `publicKey` does not hash to its `keyId` (`trust.key-fingerprint-mismatch`) each do not discharge, with the named outcome;
  - a trust configuration inside the repository is ignored (`trust.config-inside-repository`); with no configuration the outcome is `no-trust-config`, nothing errors and nothing discharges; the flag wins over the environment variable;
  - a malformed signature (bad shape) is a schema error and outcome `malformed`;
  - an unsigned `ownerConfirmation` does not discharge and the text never says full-human assurance;
  - a rejection fails regardless of signature;
  - an `agent-judgement` attestation with a valid signature does not discharge;
  - a legacy unsigned attestation stays `attested-unknown-warrant`;
  - canonicalization golden test: exact payload bytes and digest for one attestation; the digest excludes `signature` and `ownerConfirmation` and is independent of YAML key order, quoting and comments;
  - `package.json` gains no dependency.
- The signature mutations M9 to M20 gate on these tests. Nothing in the test list asserts that an agent is refused a signature, because the framework cannot know who holds the key.

## Owner decisions recorded in this revision

Settled by the owner on 2026-11-16 and applied above: legacy valid but non-discharging; `reviewedBy` kept with a typed `reviewer` object; the requirement a BREAKING change gated at 4.0.0 (compatibility classification only); envelope `"3.0"`; contributions keyed by type; `judgement` contributions rejected under mechanical and tooling kinds; rejections effective whatever the kind; every manual-review rule requires human judgement; one attestation per rule in the first version; structured independence metadata; machine-established contributions author-asserted unless re-run; unknown-currency contributions credited as evidence and unable to discharge; stale contributions uncredited.

Also settled on 2026-11-16 (second round): human confirmation by Option A (Ed25519 signature, external trust anchor) for discharge and Option B (owner confirmation) as provenance only; the nonExemptible contradiction resolved by correcting the schema description to match the engine; a rejection with incomplete split coverage still fails and shows both; envelope `"3.0"`. The `reviewedBy`/`kind` pair is not cross-checked, which the signature design makes moot.

## Choices for owner review

Decided items are removed. The owner's decision to adopt external key custody is a precondition, not a choice here: if it is not adopted, #55 and #57 stay blocked. Remaining details, each with a proposed default that fails closed:

1. **Trust-config supply:** environment variable `MATHSTD_TRUST_CONFIG` and flag `--trust-config <path>`, flag wins.
2. **Revocation scope:** a revoked key invalidates all its signatures regardless of date (fail closed; it means re-signing after a compromise).
3. **Key window:** checked against the verification date, not the signed `reviewed` date.
4. **Signature on non-human kinds** is permitted as provenance and never discharges.
5. **Field name `ownerConfirmation`** for the unsigned provenance record.
6. **Migration default for the 14 RH attestations is `agent-judgement`** (fail-closed: it under-claims). The adopter may reclassify.
7. **Ordering with #56:** the split-subject fixture S2 carries an attestation whose shape depends on which of #56 and #57 lands first.
