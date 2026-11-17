# FE-24 / FE-26 key-custody packet: how the owner would hold the Ed25519 signing key

**Status: PROPOSAL FOR OWNER DECISION. DRAFT. Nothing in this packet is adopted.** The owner has approved external key custody as the required direction for `human-review` discharge (see "Signed human confirmation" in `design/fe24-fe26-typed-evidence-and-warrants.md` and `design/fe24-fe26-human-identity-packet.md`) but has NOT operationally adopted it. Implementation of #55 and #57 stays blocked. **No key may be generated, no signing ceremony run and no trust configuration created until this packet is approved AND the separate dated owner statement in section 8.2 item 11 has been made** (section 8 lists the exact approvals). Packet approval alone authorises nothing. This packet generates no key, invents no key, fingerprint or key identifier, contains no code, and changes no schema, rule, fixture, VERSION or CHANGELOG. Every identifier below written in angle brackets is a placeholder.

## Purpose and scope

The typed-warrant record fixes WHAT is verified: an Ed25519 signature over a framework-built payload, checked with `node:crypto` against a trust configuration kept outside the repository. This packet decides HOW the owner holds the private key and the trust configuration so that the verification means something. A signature proves possession of a private key, not humanity (stated residual limit, section 3). Everything here is about moving that possession as far out of an agent's reach as is practical for a single owner working with agents that have repository write access, and about making loss, compromise, rotation and recovery routine rather than improvised.

Out of scope: the signed payload, digest, field shape and dispositions (already specified, not reopened here); any framework code; any decision on #56.

Terms: **owner** is the one human who signs. **Agent session** is any Claude Code or similar process running with the owner's user rights or a repository checkout. **Trust config** is the JSON file defined in the typed-warrant record. **Signing key** is the Ed25519 private key.

## 1. External trust-config location

### What is fixed already

The verifier reads the trust config from `--trust-config <path>` (wins) or `MATHSTD_TRUST_CONFIG`. The resolved real path must not lie inside the repository root being evaluated, else it is ignored and reported `trust.config-inside-repository`. The config carries `repository`, `signers`, `revokedKeys`, `revokedConfirmations`.

### 1.1 Where the file lives (options)

| Option | Description | For | Against |
|---|---|---|---|
| L1 | A directory in the owner's user profile (for example under `%USERPROFILE%`), outside every repository | Simple; survives repo re-clones | Same OS account as agent sessions, so readable and writable by them unless ACLs differ |
| L2 | A directory owned by a separate Windows account (an "owner-custody" account) with ACLs denying the agent's account write, and optionally read | Real write barrier against agent sessions running as the daily account | Account switching friction; backup of that account's data is a separate task; CI still needs a copy |
| L3 | A read-only removable volume or the same hardware as the key, mounted only while verifying | Strongest separation from a running session | Inconvenient; verification and CI need the volume present |
| L4 | CI secret store only for CI, plus L1 or L2 for local runs | Matches the already specified "secret file mounted outside the checkout" | Two copies must be kept identical (see failure modes) |

The trust config holds public keys and revocations only. It is not secret, but it is a trust anchor: the threat is WRITE access (an agent adding its own public key), not read access. Read protection is therefore optional; write protection is the requirement.

### 1.2 Per-repository config and repository-identity binding

The signed payload's `repository:` line is taken from the trust config's `repository` value, not from anything in the repository (typed-warrant record). **Reviewer note, recorded here as a binding design consequence:** this makes repository binding depend on there being one trust config PER repository, each with its own `repository` value. If one config file were shared across repositories, or the wrong file were selected, the verifier would build the payload with the wrong identity; a signature made for repository X would verify in repository Y that is pointed at X's config. The signature then no longer binds a repository in any meaningful way, because the binding is whatever the config says rather than a fact the evaluator checked. The binding is real only if either:

- **B1 (per-repository config, the specified behaviour):** one config file per repository, selected by explicit path, with the owner responsible for pointing each repository at its own file. Failure mode: a mis-pointed variable silently accepts a signature made for another repository whose config claims the same identity, and the framework cannot tell.
- **B2 (evaluator derives and checks identity):** the evaluator independently derives the repository identity (for example from the git remote URL, or from a repository identity value the policy declares) and requires it to equal the config's `repository`; a mismatch fails closed (`trust.repository-mismatch`). This turns the binding from "trust the file chosen" into "check the file matches the repository". Failure modes: remotes are editable by an agent (an agent can change `origin` to match a wrong config), a fork or mirror has a different identity, and a repository with no remote has nothing to derive. A policy-declared identity is also repository-writable, so B2 only raises the cost of an accident, not of an adversarial agent, unless the derived value comes from something the agent cannot change.

Options: B1 alone; B1 plus B2 as an accident guard; B2 alone is not recommended (it makes the config's `repository` redundant and still rests on an editable source).

**Recommendation (OWNER DECISION):** B1 plus B2 as an accident guard, with the packet and the eventual documentation stating that B2 catches mis-pointing, not a hostile agent. Owner-side practice under B1: one config file per repository, the file name containing the repository slug, the path set per repository (not one global `MATHSTD_TRUST_CONFIG` for the whole machine). Adding B2 requires an extension to the typed-warrant record's verification rules and is therefore a framework design change that must be approved separately (listed in section 8); if the owner declines B2, B1 stands and the residual risk above is documented as accepted.

### 1.3 Recommendation for location (OWNER DECISION)

L2 for local verification if the owner is willing to run a second Windows account; otherwise L1 with an explicit ACL that denies the agent's execution context write access, and an honest note that on a single shared account the barrier is only as good as the sandbox the agent runs in. L4 for CI. Whichever is chosen, record in the adoption checklist (section 8) the actual path class (not a secret) so reviewers know which barrier applies.

### 1.4 Failure modes

- Config placed inside a checkout, a worktree, or a synced folder that is inside one: ignored and reported; every signed attestation then shows unconfirmed (safe, noisy).
- Config reachable through a symlink or junction from outside into the repo: the rule uses the resolved real path; test that a junction does not defeat it (a test for the future implementation, not run here).
- Agent edits the config (adds its own public key): this is the central attack on the whole design. Mitigation is the write barrier chosen above; detection is a recorded hash of the config (section 8 asks the owner to keep one outside the agent's reach and compare it).
- Local and CI configs drift: CI trusts a revoked key or rejects a new one. Mitigation: one source of truth, copied, with the recorded hash compared after every copy.
- Config deleted or unreadable: every human-review attestation reports `no-trust-config` and does not discharge (fail closed, specified).
- Expiry (`notAfter`) passes unnoticed: signatures begin failing as `key-expired`. Mitigation: calendar reminder owned by the owner, set before adoption.

## 2. Private-key generation and storage

**No key is generated by this packet or before approval.** This section compares where a key would later be generated and held.

### 2.1 Options

| Option | Generation / storage | Agent reach | Windows fit | Notes |
|---|---|---|---|---|
| K1 Hardware token with on-device key (smart card or security key that can generate and hold Ed25519 and require touch) | Key generated on the device and never exported | Lowest: signing needs physical presence (touch or PIN) | Variable. Ed25519 support differs by device and firmware, and by the interface used (OpenPGP card, PIV, FIDO2). Windows tooling for these is vendor-specific. **The owner must verify, on the actual device, that it can produce a raw Ed25519 signature over arbitrary bytes before this option is chosen**; do not assume it | FIDO2 and SSH-style security-key signatures wrap the message in a different signed structure than a raw Ed25519 signature over the payload text, so they would NOT verify under the specified `crypto.verify(null, payload, key, signature)` unless the verification format is changed. Treat as incompatible with the current design unless the owner approves a design change. More generally, any hash-then-sign or enveloped format fails (OpenPGP card signing, `ssh-keygen -Y sign` SSHSIG): the verifier checks a raw Ed25519 signature over the payload bytes and nothing else |
| K2 OS keystore (Windows CNG / DPAPI / TPM-backed key) | Key held by the OS, optionally TPM-bound | Medium: any process running as the same user can usually ask the OS to sign; non-exportable only stops copying | Windows' native key stores historically do not offer Ed25519 broadly; confirm before relying. DPAPI protects a file at rest for the user account, not against a process running as that user | A TPM-bound key prevents theft of the key file but not use by a same-user process |
| K3 Offline machine (air-gapped or never-networked computer; key file on it, ideally encrypted) | Key generated and used on a machine that does not run agent sessions; payload moved in and signature moved out (QR, USB, typed text) | Low while the machine stays isolated and unlocked only when used | Works with `node:crypto` or OpenSSL on any OS; needs a second machine or a bootable environment | Highest owner effort; best fit if no token supports raw Ed25519 |
| K4 Passphrase-encrypted key file on the daily machine, in a location agents cannot read | Generated locally with `node:crypto` or OpenSSL, stored encrypted | Medium to high: the passphrase is typed into a session an agent may observe or the file may be readable by the same account | Easy | Weakest acceptable floor; only meaningful if the passphrase is never in any agent-readable place and signing happens in a shell the agent cannot drive |
| K5 Key in an agent-reachable location, an environment variable, a repo, a synced folder or a CI secret exposed to agent steps | n/a | Full | n/a | **Not acceptable. Excluded.** An agent that can read it can sign |

### 2.2 Tradeoffs in short

- The only property that defeats an agent is that using the key requires something the agent session cannot do: a physical touch, a second machine, a passphrase the agent cannot obtain. Storage that merely hides the file (K4, K2) is a speed bump against a same-account agent.
- Windows reality: general-purpose OS key stores and TPM are weak candidates for Ed25519; hardware tokens are device-specific; an offline machine is the most portable. Because of the compatibility question in K1, the realistic pair is K3 (primary) with K1 as an upgrade only if a verified raw-Ed25519 device exists.
- The signing tool must produce a raw Ed25519 signature (64 bytes, base64) over the exact payload bytes. Any chosen tool must be checked against this requirement with a throwaway test key in an isolated scratch location, never a real key. Generating even a throwaway key is a key generation: it is NOT permitted until the owner makes its own separate, explicit, dated statement (section 8.2 item 6) naming the scratch location and the deletion; neither packet approval nor item 11 covers it. The test must compare raw signature bytes (64 bytes after decoding), not just print success.

### 2.3 Recommendation (OWNER DECISION)

K3, an offline signing machine or a bootable offline environment, with the private key encrypted at rest and the passphrase held only by the owner. Evaluate K1 later only if a device is shown to give raw Ed25519 signatures. Reject K5 outright; treat K4 as acceptable only if the owner records that they accept the weaker barrier. This choice is the owner's: it trades convenience for protection, and no framework check can confirm what was chosen.

### 2.4 Failure modes

- Key generated on a machine that also runs agent sessions: the machine's memory, temp files and shell history are all agent-readable surfaces.
- Public key copied incorrectly into the trust config: `trust.key-fingerprint-mismatch` (specified), the signer entry is invalid, signatures fail closed.
- Hardware token signing produces a wrapped format: signatures `invalid`; discovered only at the first test, which is why the format test precedes adoption.
- Single copy of the key: loss ends signing (see section 4).
- Key reuse across repositories: weakens revocation scoping (one compromise affects all repositories). The payload binds the repository, but the key itself is shared. See recommendation in section 5.

## 3. Agent access boundaries

### 3.1 What an agent session can read and write today (as designed)

Treat an agent session as having the rights of the account it runs under: it can typically read and write the repository checkout, other files in the user profile, environment variables of its own process, and run shell commands. It cannot be assumed unable to read any file the same account can read. The framework itself holds no key, never reads a private key, and only reads the trust config it is pointed at.

### 3.2 Boundaries to establish (options)

| Boundary | How | Protects against | Does not protect against |
|---|---|---|---|
| Separation by machine (K3) | Key and signing never on the agent's machine | Reading, using or copying the key | Social engineering the owner into signing a payload the agent prepared |
| Separation by OS account (L2) | Trust config (and any key files) owned by another account; agent account denied write | Agent editing the trust config | A privileged agent, or an agent run as the owner account |
| Filesystem ACL on the same account | Deny write to trust config path for agent processes | Accidental edits | A process that can change ACLs (same account can) |
| Agent permission settings (the harness's allow and deny rules for paths) | Deny read and write on the custody directory and the key location | Honest agents in the session | Not a security boundary against a hostile model or a bypassed setting; a defence in depth only |
| Environment hygiene | `MATHSTD_TRUST_CONFIG` set per run by the owner, never persisted in profiles the agent edits; no key material in any variable | Silent redirection of the verifier to an agent-written config | An agent that can run the verifier with its own `--trust-config` flag on its own run (its result is not the owner's CI result) |

Important: the verifier trusts whichever config it is pointed at. An agent running the evaluator locally with its own config in a different outside-repo path can produce a green local report. The authoritative result is therefore the one produced where the owner controls the config: CI with a secret-mounted config, or the owner's own verification run. Agent-run local results must be described as non-authoritative for human-review discharge. This is a documentation consequence for adoption, not a framework check.

### 3.3 Signing is a human act

The owner signs on the custody machine (K3) after reviewing the attestation themselves (section 6). An agent may PREPARE the attestation and the payload text; it must never receive the passphrase, the key, or a signing capability (including a signing service reachable from the agent environment, a long-running ssh-agent or similar). The payload to sign is rebuilt on the signing machine from the attestation content, not accepted from the agent's description of it.

### 3.4 Honest residual limit

A valid signature proves that the holder of a trusted private key approved this exact content. It does not prove the signer is human, nor that they read the attestation. If the key is ever usable by an agent, an agent can produce a valid signature, and decision (d) is then not enforced. The framework cannot verify custody. Three further residuals: (1) a human who signs without reviewing is out of scope; (2) an agent that convinces the owner to sign a misleading attestation is not stopped by any signature; (3) the repository's own history shows nothing about where the key lives. The report wording specified in the typed-warrant record ("signed by <name>", and "full-human assurance" only for `verified-signature`) must therefore be read as "a trusted key signed", with custody an owner-asserted fact recorded in the adoption checklist.

### 3.5 Recommendation (OWNER DECISION)

Machine separation (K3) plus a separate-account trust config (L2) where practical, agent permission deny rules as defence in depth only, and an owner-run or CI-run verification treated as authoritative. Record in the checklist which barrier actually applies, and accept in writing that the framework cannot verify it.

### 3.6 Failure modes

- Owner signs a payload an agent supplied without rebuilding it: the signature binds the content the agent chose.
- Passphrase typed into a terminal that an agent session records or screenshots (computer-use, terminal tools): leaks it. Rule: the signing machine runs no agent tool and no screen-reading tool.
- Agent persists `MATHSTD_TRUST_CONFIG` pointing at its own file via a shell profile or a CI workflow edit: CI configuration is itself repository content, so the workflow that supplies the secret file must be protected by branch protection and review; otherwise a PR can change which file is mounted.
- Confusing a local green result with the authoritative one.

## 4. Backup and recovery

### 4.1 Options

| Option | Description | For | Against |
|---|---|---|---|
| R1 No backup | Key exists once | Smallest attack surface | Loss means re-adoption of every signed attestation (section 7) |
| R2 Second encrypted copy offline | Encrypted key file on separate offline media in a separate physical place | Survives loss of the primary device | A second place an attacker (or agent with physical access) could reach; passphrase must be recoverable by the owner |
| R3 Second independent key (cold spare) | A second key (its generation needs its own dated item-11-form statement, see 8.2), generated and kept offline, whose public key is pre-listed in the trust config as a signer with a later `notBefore` or held in reserve | No secret needs restoring; loss of one key is recoverable by revocation and use of the other | Two keys to custody; the spare's public key must be in the config before it is needed, widening the anchor set |
| R4 Escrow with a named second person | A trusted person holds a sealed copy | Survives owner incapacity | Adds a human who can sign; conflicts with "one owner signs" |

The trust config must also be backed up: it is small and public, so a plain backup plus the recorded hash (section 1.4) suffices. It must be backed up OUTSIDE agent write reach, since a restored backup is a trust anchor.

### 4.2 Recovery rules

- Recovering from a backup is treated as a possible compromise event until shown otherwise: restored key material is checked against the recorded public key fingerprint before use.
- A recovery does not rewrite history: signatures made before loss remain valid while the key remains trusted.
- Passphrase loss is key loss.

### 4.3 Recommendation (OWNER DECISION)

R3 (cold spare) with R2 for the spare only if the owner is comfortable with an encrypted offline copy. Decline R4 unless the owner explicitly wants a second signer (a separate decision about who may discharge reviews, which this packet does not make). If the owner prefers minimal custody, R1 is acceptable, accepting that loss forces re-signing every discharged attestation under a new key.

### 4.4 Failure modes

- Backup stored on the same machine or synced into an agent-readable folder: defeats the custody model.
- Backup never test-restored (restore test with a throwaway key only; never with the real key on an agent machine).
- Spare key's public entry sits in the config unused for a long time with an expired window.

## 5. Rotation and revocation procedure

### 5.1 What the framework does (already specified)

Revoked key: all its signatures invalid regardless of date. Revoked confirmation: that signature invalid, key stays trusted. Window: `notBefore` and `notAfter` enforced against today's date. Rotation: add the new signer, overlap windows, re-sign, then remove or revoke the old signer. Changes are to the external config only.

### 5.2 Planned rotation, step by step (owner actions; nothing here is run before approval)

1. On the custody machine, generate the new key (only after its own dated owner statement in the form of 8.2 item 11, naming this key; the original item 11 does not cover it unless it explicitly names rotation keys) and compute its public key and key identifier there; never on an agent machine.
2. Add the new signer entry to the trust config copy on the custody side, with `notBefore` set to the activation date and a `notAfter` the owner chooses (recommended in 5.4).
3. Overlap: both signers trusted. Re-sign each discharged attestation with the new key (workflow in section 6).
4. Move the updated config to the authoritative locations (local custody path, CI secret), and compare the recorded hash.
5. Run an owner-controlled verification and confirm discharges still hold.
6. Revoke the old key (add to `revokedKeys` with date and reason) or let its window lapse; the real difference is timing: revocation takes effect immediately and independently of `notAfter`, while a lapse takes effect only when the window ends. Both invalidate the old key's signatures (a lapsed key reports `key-expired`), so re-signing under the new key must be complete BEFORE either happens or discharges are lost.
7. Destroy the old private key according to the custody option and record the destruction in the checklist.

### 5.3 Revocation (emergency or routine)

- Whole key: add to `revokedKeys`; every attestation signed by it becomes `attested-unconfirmed` (revoked-key) until re-signed under a trusted key. Revocation is retroactive by design (no grace by date).
- Single signature: add to `revokedConfirmations`.
- The revocation itself lives only in the external config; it protects only verifiers that load the updated config, so local copies and CI must all be updated (section 1.4 drift).

### 5.4 Options for validity windows (OWNER DECISION)

- W1: short windows (for example 12 months), forcing periodic rotation and re-signing; limits blast radius, costs a recurring owner task.
- W2: long windows (multiple years); less work, longer exposure after an unnoticed compromise.
- Recommended: W1, 12 months, with the reminder in 1.4. This is a recommendation only; the owner chooses.

### 5.5 One key or one key per repository (OWNER DECISION)

One key per repository localises compromise and revocation but multiplies custody; one shared key is simpler, and the payload still binds repository identity. Recommended: one key for the owner across repositories ONLY if section 1.2's per-repository configs are strictly maintained, otherwise one per repository. Owner decides.

### 5.6 Failure modes

- Revoking before re-signing leaves discharged rules unconfirmed in CI until the work is done; schedule rotation outside release pressure.
- Re-signing is a bulk owner task: every discharging attestation needs the section 6 review again. Re-signing without re-review turns rotation into rubber-stamping.
- Config updated locally but not in CI (or the reverse).
- A revoked key's private half remains in a backup (see section 4).

## 6. Signing workflow

The workflow is described for a future state after approval. It does not define or run a ceremony today.

### 6.1 Roles and tools

- **Preparer (agent or owner):** writes the attestation in the policy file with `reviewer.kind: human-review`, contributions and `reviewedAgainst`, leaving `signature` empty. The preparer may not sign.
- **Owner:** reviews the underlying subject (the rule's evidence, the reviewed paths) themselves, then signs.
- **Signing tool, options:**
  - **T1 a small standalone script using only `node:crypto`**, kept OUTSIDE the framework repository (in the owner's custody area) so no dependency or code is added to the framework. It rebuilds the payload text from the attestation, shows it, and signs with the key. Pros: matches the verifier's own primitives, so format agreement is likely; cons: it is new code that the owner must review and keep, and it duplicates the digest and payload canonicalization, creating drift risk against the framework. Rebuilding the digest means flattening the attestation, which needs a YAML parse on the custody machine: an extra code path and supply-chain exposure there (T2 has the same need, by hand or by helper). A framework-provided digest helper or a framework-displayed payload preview is a candidate follow-up, but it adds code and needs separate approval; it is not proposed here.
  - **T2 OpenSSL command line** (raw Ed25519 signing of a file, supported by recent OpenSSL releases; confirm the installed version supports it). The raw-signing form is `openssl pkeyutl -sign -rawin` with the key and the payload file; it writes binary output that must be converted to base64 for `signature.value`. Windows does not ship OpenSSL, so a build must be sourced from somewhere the owner trusts (a supply-chain decision for the custody machine), and the installed version must be confirmed to support Ed25519 raw signing. Pros: widely documented, no bespoke code; cons: the payload and digest must be built separately (by the framework's own helper or by hand), and an owner-built payload risks typos.
  - **T3 a framework-provided signing helper:** not available and not proposed. The typed-warrant record says the framework holds no private key and defines no ceremony; adding a signer to the framework would add a key-handling code path to the repository and widen scope. Listed only to record it was considered and is NOT recommended without separate approval.
- **Dependency rule:** the framework gains no dependency under any option; the tool lives outside the repository.

### 6.2 Steps (target workflow)

1. Preparer produces the attestation and a reviewable preview of the signed payload, built by the framework's verifier logic (a future read-only display; this packet specifies no code for it).
2. Owner reads the real evidence behind the attestation, not the agent's summary.
3. Owner moves the attestation content (not the key) to the custody machine, as reviewed, non-executable data only (typed text or a QR code preferred; removable media is a known air-gap attack vector and, if used, carries only plain text files that are inspected, never executed or auto-run).
4. On the custody machine, the tool REBUILDS the payload from the attestation, with `repository` taken from the owner's own record for that repository (matching the trust config's `repository`), and displays all payload lines, including the first domain-separation line `mathstd-attestation-signature/1`, then repository, rule, kind, digest, reviewed date and confirmation.
5. Owner checks each line against what they reviewed, chooses a unique `confirmation` identifier (8 to 64 characters of A-Z a-z 0-9 . _ -), unlocks the key, and signs.
6. Tool outputs only: `algorithm`, `keyId`, `confirmation`, base64 `value`. The signed result is carried back the same way (non-executable data only).
7. The `signature` block is written into the attestation (by the owner or the preparer; the block is public data and contains no secret).
8. Verification runs where the owner controls the config (CI or the owner's own run). The attestation discharges only if the outcome is `verified`.
9. The owner records the confirmation identifier and date in their custody log (outside the repository) so the confirmation can be revoked if needed.

### 6.3 Recommendation (OWNER DECISION)

T1 or T2 (owner's choice) with the tool outside the repository; T1 preferred only if the owner is prepared to maintain and review it, with a golden check against the framework's fixed payload and digest example so any divergence fails visibly. Do not adopt T3.

### 6.4 Failure modes

- Tool digest or payload differs from the verifier's: valid-looking signature that verifies `invalid`. Mitigation: the framework's golden test vector (specified in the typed-warrant record) is run through the tool with a throwaway test key only under the separate dated statement of 8.2 item 6.
- Preparer edits the attestation after signing: digest changes, signature `invalid` (the intended behaviour).
- Owner signs from an agent-driven session: custody boundary void.
- Date: `reviewed` is the attestation's own date; mismatch with the signing date is not an error, but the confirmation log should hold the actual date.
- Reusing a `confirmation` identifier: breaks per-signature revocation; require uniqueness in the custody log.

## 7. Loss and compromise response

### 7.1 Severity classes

| Event | Class | Response |
|---|---|---|
| Key lost, no sign of exposure | Loss | Use the spare if R3, else generate a replacement only under its own dated item-11-form owner statement; add new signer; re-review and re-sign discharged attestations; revoke the lost key as a precaution |
| Passphrase forgotten | Loss | Same as key loss |
| Key (or backup) possibly exposed, no misuse seen | Suspected compromise | Treat as compromise |
| Key used by something other than the owner, or trust config altered | Confirmed compromise | See below |
| Trust config altered, key safe | Anchor tampering | Restore config from the recorded hash backup, investigate how write access occurred, rotate if the cause is unknown |

### 7.2 Compromise steps

1. Stop signing. Revoke the affected key (and any confirmations known to be bad) in the authoritative config and push it to CI. Revocation is retroactive: all that key's discharges become unconfirmed at once.
2. Establish the window of exposure from the custody log and device records; every confirmation in or after that window is untrusted.
3. Rotate to a new key (section 5.2), generated on a clean custody machine.
4. Re-review and re-sign only attestations whose underlying evidence the owner re-checks; do not bulk re-sign.
5. Find the cause (agent access, shared account, backup exposure) and change the boundary that failed (section 3).
6. Record the event, dates and outcome in the checklist and, where it affects released claims, note it in the repository's design records (a documentation change, separately authorised).

### 7.3 Recommendation (OWNER DECISION)

Adopt the table and steps as written; decide in advance who is told (the owner alone, or adopters, if a published release relied on a compromised key). The framework cannot notify anyone.

### 7.4 Failure modes

- Revocation reaches CI but not a local copy (or the reverse): a stale environment keeps trusting the key.
- Over-reaction: re-signing everything without re-reading, restoring false assurance.
- Under-reaction: assuming signatures made before the compromise are safe; an attacker with the key can sign with any date because the `reviewed` date is self-asserted, which is why the framework gives no date-based grace.
- No custody log: exposure window unknowable, so the whole history must be treated as untrusted.

## 8. Adoption checklist and owner approvals

### 8.1 Adoption checklist (nothing below is done; all steps happen after approval)

- [ ] Owner decisions in 8.2 recorded (each with the chosen option).
- [ ] Custody machine and account chosen and described, no agent or screen-reading tools on it.
- [ ] Signing tool chosen and kept outside the repository; its format agreement with the framework's golden vector checked with a throwaway key.
- [ ] Key generated on the custody machine (first use of any real key; requires approval items 1 to 11, with item 11 as the authority).
- [ ] Public key and key identifier computed by the owner (never by an agent), entered into a per-repository trust config outside the repository.
- [ ] Trust config hash recorded outside agent reach; copy supplied to CI as a secret file mounted outside the checkout; CI workflow protected from agent-authored edits.
- [ ] Backup / spare per section 4 established and a recovery drill done using a throwaway key (only under the separate dated statement of 8.2 item 6).
- [ ] Rotation and revocation dates scheduled; reminders set.
- [ ] Custody log created (confirmation identifiers, dates, reasons).
- [ ] Loss and compromise plan (section 7) reviewed.
- [ ] Adoption note drafted for adopters: signatures prove key possession; custody is owner-asserted; agent-run local results are non-authoritative.
- [ ] Only then is the #55 / #57 implementation block reviewed for lifting (that remains also blocked on the signature design review and the real Lean-data packet for #56).

### 8.2 Exact owner approval items required BEFORE any key generation

Each requires an explicit, recorded owner answer. A missing answer means no key is generated.

1. **Trust-config location and barrier** (section 1.3): choose L1, L2, L3 or L4 and state the barrier.
2. **Repository identity binding** (section 1.2): B1 alone, or B1 plus B2 (which is a framework design change needing its own approval and its own revision of the typed-warrant record), or B2 alone (not recommended).
3. **Key storage option** (section 2): K3 recommended; K1 only after device capability for raw Ed25519 is shown; K4 only with a written weaker-barrier acceptance; K5 forbidden.
4. **Custody machine and generation environment**: where and on what machine the key will be generated, confirmed to run no agent or screen-capture tooling.
5. **Backup and recovery** (section 4): R1, R2, R3 or R4.
6. **Signing tool and format test** (section 6.3): T1 or T2, and whether to run a FORMAT TEST with a throwaway test key. A throwaway key is still a key generation, so the test is NOT covered by packet approval or by item 11: it needs its own separate, explicit, dated owner statement naming the scratch location and the deletion (no real key material, deleted afterwards). Absent that statement, no format test is run and the format question stays open until after item 11. The same statement gate covers the golden-vector check and any recovery drill.
7. **Key scope** (section 5.5): one key for all repositories or one per repository.
8. **Validity window policy** (section 5.4): W1 or W2, and the reminder owner.
9. **Loss and compromise plan** (section 7): approved as written or amended; notification policy.
10. **Acceptance of the residual limit** (section 3.4): the owner acknowledges in writing that a valid signature proves key possession, not humanity; that the framework cannot verify custody; and that agent-run local verification is non-authoritative.
11. **Authority to generate**: a separate, final, dated owner statement that the packet is approved and a key may now be generated, naming the environment from item 4 and the set of keys covered (the primary key, and explicitly any cold spare, rotation keys or loss replacements; any key not named needs its own dated statement of this form). Approval of the packet alone is not this statement.

### 8.3 What stays blocked after approval of this packet

Approval of this packet authorises nothing by itself: key generation and trust-config creation require the separate dated statement of item 11 (and, for a throwaway test key, item 6's own statement). Neither lifts the #55 / #57 implementation block: that also requires the signature design review to be complete, external key custody to be marked operationally adopted by the owner after the checklist is done, and the real Lean-data packet for #56 to exist.

## Summary of recommendations for owner decision

| Topic | Recommendation |
|---|---|
| Config location | L2 (separate account) locally, L4 for CI; L1 with ACL only if no second account |
| Repo binding | B1 plus B2 as an accident guard (B2 needs its own design approval) |
| Key storage | K3 offline machine; K1 only after raw-Ed25519 capability shown |
| Agent boundary | machine separation plus separate-account config; deny rules as defence in depth; owner or CI result authoritative |
| Backup | R3 cold spare |
| Validity and scope | 12-month windows (W1); one key across repositories only with strict per-repository configs |
| Signing tool | T1 or T2 outside the repository; no framework signer |
| Loss/compromise | section 7 as written |
| Approvals | the eleven items in 8.2, with no key before item 11 |
