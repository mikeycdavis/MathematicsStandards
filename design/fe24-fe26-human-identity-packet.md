# FE-24 / FE-26 human-confirmation packet: how a `human-review` is verified

**Status: DRAFT, for owner decision.** Companion to `design/fe24-fe26-typed-evidence-and-warrants.md`. The owner has not chosen. #55 and #57 implementation remains BLOCKED until the owner picks. Nothing here is implemented.

## The problem

`reviewer.kind: human-review` is a string the attestation's author writes. An AI agent can write it, and `reviewedBy` is free text. A self-declared kind therefore cannot establish that an agent did not author the attestation. The typed-warrant record consequently does NOT claim to enforce the owner's decision (d), "agent-authored attestations never get full-human assurance"; it enforces that only a declared `human-review` discharges, and it labels the warrant `as declared`. A configurable string denylist is insufficient: it is a match on a self-declared field and is defeated by renaming.

This packet compares the two mechanisms that could close the gap.

## Threat model

The adversary is an agent (or a careless author) that:

1. writes `kind: human-review` on an attestation a human did not make;
2. edits an attestation, or a confirmation, after a human confirmed something different;
3. copies a valid confirmation from one attestation onto another;
4. has write access to the repository, its policy file and its working tree, but not necessarily to anything outside it.

Out of scope for both options: a human who knowingly rubber-stamps an attestation they did not review. No mechanism in the framework can see that; it is an accountability matter.

## Option A: externally trusted identity or signature

**What it is.** The policy declares trusted signers (public keys, or identities in an external provider). An attestation counts as human only if it carries a valid signature, over its canonical content, from a declared signer.

**What it verifies.** That the holder of a declared key produced exactly this attestation content. It verifies key possession, not humanity: an agent that can use the key can sign. The guarantee is only as strong as the key custody (for example a hardware token requiring a physical touch, held outside the agent's reach).

**Failure modes.**
- An agent with access to the key, or to an unlocked agent session holding it, signs freely.
- Key loss, rotation and revocation need a process the framework does not provide.
- A signature over content proves nothing about what the signer examined.
- A signer list in the policy is itself editable by an agent unless protected outside the repository.

**Adopter cost.** High. Each reviewer needs a key, the policy needs a trust list, and the signing workflow needs tooling. An adopter project of one researcher and one agent (the observed case) must stand up key management it does not have.

**Offline and CI behaviour.** Verification of a signature against a stored public key is offline. Resolving an identity through an external provider is not, and fails or skips in an air-gapped run.

**Fit with the vendored zero-dependency tooling.** Partial. `node:crypto` is built in and can verify an Ed25519 or RSA signature over bytes. Verifying GPG or SSH-format signatures, or git commit signatures, needs either new parsing code or an external binary (`gpg`, `ssh-keygen`, `git`), which this repository's no-dependency stance does not currently take. A bespoke signature format is possible and adds code that must itself be reviewed.

**Migration.** Legacy attestations stay valid and unknown. Existing declared `human-review` attestations are unsigned and would become unconfirmed until signed; every one needs a signing pass.

## Option B: an owner-confirmed review event

**What it is.** A named confirming authority (the owner) records a confirmation that binds to a specific attestation: a confirmation record that carries the rule id, the attestation's content digest, the confirmer's name and the date. An attestation discharges as human only when a confirmation exists whose digest equals the attestation's current content digest. The digest uses the same sha256 mechanism the framework already uses for `reviewedAgainst`, so editing the attestation after confirmation invalidates the confirmation.

**What it verifies.** That the attestation content is the content the owner confirmed (integrity and binding), and that a confirmation exists. It does not verify the confirmer's identity cryptographically; it records an accountable person's statement that this was a human review.

**Failure modes.**
- An agent with write access to the repository can write the confirmation file itself. The mechanism holds only if confirmations live where the agent cannot write: a branch-protected file, a CODEOWNERS-guarded path, or a record the owner produces outside the working tree. The framework cannot enforce that placement and must say so.
- Rubber-stamping, as noted out of scope.
- Owner bottleneck: every discharging attestation needs an owner action, and a re-edited attestation needs a new one.

**Adopter cost.** Low to moderate. One file format, one owner step per attestation, no keys. A project with a single owner is the common case and fits.

**Offline and CI behaviour.** Fully offline: a digest comparison over files. Behaves identically in an air-gapped CI.

**Fit with the vendored zero-dependency tooling.** Good. It reuses `attestationDigests`, plain YAML and `node:crypto` sha256, and adds one small reader and one semantic check. No external binary.

**Migration.** Legacy attestations stay valid and unknown. Existing declared `human-review` attestations have no confirmation; under B they report as `attested-unconfirmed` (skipped, not discharged) until the owner confirms them. The 14 RH attestations are migrated to `agent-judgement` regardless and need no confirmation.

## Comparison

| | A: signature | B: owner-confirmed event |
|---|---|---|
| Verifies | key possession over the content | the owner confirmed this exact content |
| Does not verify | that a human used the key | the confirmer's cryptographic identity |
| Defeated by | agent access to the key | agent write access to where confirmations live |
| Protection depends on | key custody | placement outside agent write access |
| Adopter cost | high (keys, trust list, tooling) | low to moderate (one owner step). In the observed case, a single researcher plus an agent that has repository write access, B gives NO protection by default: the agent can write the confirmation file itself, which is B's own failure mode. B closes (d) for that adopter only if the owner places confirmations outside the agent's write access, which is extra setup and is not verified by the framework |
| Offline and CI | signature check offline; provider lookup not | fully offline |
| Zero-dependency fit | partial: `node:crypto` for raw keys; GPG or SSH needs new code or binaries | good: existing sha256 digest |
| Migration | every declared human attestation needs signing | every declared human attestation needs confirming |

Neither mechanism establishes that a human, as opposed to an agent, performed the review; each moves the question to something the agent is less able to do on its own (hold a key; write to a protected place). Both leave a residual risk the framework cannot remove, and the record should say so rather than claim (d) is met.

## Recommendation, for owner decision

Marked as a recommendation only; the owner decides.

Adopt B as the floor: a confirmation record bound to the attestation digest, with the framework stating in its documentation and in the report that confirmations must live where an agent cannot write. A repository tool cannot determine who can write to a path, so the framework does not try. It uses one checkable proxy instead: the confirmation must be in a file separate from the policy file that holds the attestation (a different path), and the report prints "confirmation recorded; custody of the confirmation file is not verified by the framework". That wording is the honest limit; it does not claim independence. B fits the zero-dependency tooling, works offline, and costs a single-owner project one step per attestation. Leave A as a later, optional layer that signs the confirmation record, if an adopter needs a stronger custody guarantee.

This recommendation must not be read as closing (d) for the observed single-researcher-plus-agent adopter: unless confirmations are kept where the agent cannot write, B there records a confirmation the agent could have authored. Under this recommendation decision (d) would be described as: an attestation reaches full human assurance only when it declares `human-review` and carries a digest-bound owner confirmation; an unconfirmed declared `human-review` reports `attested-unconfirmed` and does not discharge. That is a further disposition and a further behaviour change for existing adopters, and would be recorded in the typed-warrant record when the owner decides.

## What happens next

On the owner's choice, the typed-warrant record is revised to specify the chosen mechanism (schema, dispositions, tests, migration), and the implementation block on #55 and #57 lifts. Until then neither record may be described as meeting decision (d).
