# ADR 0002 — Source documents are digested, and the digests are committed

Status: accepted, 2026-08-09

## Context

ADR 0001 leaves a hole. Fidelity checks a standard against the derived spec; the inventory checks the
series against the derived spec. Both compare a document against a source. Neither notices when the
*source* is what changed.

That is not a hypothetical attack. It is the cheapest available way to make a failing standard pass,
it looks like an ordinary edit in a diff, and it is a textbook instance of what
[Standard 21](../../standards/21-standards-integrity.md) prohibits: weakening a verification
mechanism because it prevents the desired conclusion.

## Decision

Record the SHA-256 of both source documents in `artifacts/provenance-digests.json`, committed once
and never regenerated from a run. The rule `integrity.provenance-digest` recomputes and compares on
every audit.

Carriage returns are stripped before hashing. Line endings differ between a Windows checkout and a
Linux one; the content does not, and it is the content the digest is about. A digest that failed on
`git clone` would be switched off within a week.

## Alternatives rejected

**Rely on code review.** Review is the residual protection and it is real, but a check that runs on
every commit catches what a tired reviewer does not.

**Sign the documents.** Heavier, needs key management, and defends against a threat this repository
does not have — a third party editing the prompts. The threat here is the authors editing them under
deadline pressure, and a digest they must update deliberately is exactly the right amount of friction.

## Consequences

Editing a source now takes two files and produces a diff whose purpose is legible. A genuine
correction is still possible and is a deliberate act: fix the source, re-review the derived spec and
every affected standard, update the digest in the same reviewed change.

This does not stop someone who edits the source and the digest together. Nothing self-contained can,
and Standard 21 R5 says so rather than implying otherwise.
