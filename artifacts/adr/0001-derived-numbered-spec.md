# ADR 0001 — The inventory points at a derived spec, and the originals govern

Status: accepted, 2026-08-09

## Context

`scripts/inventory.mjs` proves the standards series has not silently changed shape: it extracts a
numbered enumeration from a source document and compares it against a human-reviewed inventory. It
needs a source that *is* a numbered series.

Neither source document is one. `artifacts/prompt/original-prompt.md` organises its requirements as
bullet lists under section headings; `artifacts/prompt/standards-repository-charter.md` is prose plus
bullets. There is no 1:1 mapping in either from bullets to standards — the twenty-two documents are a
consolidation, and consolidating is a judgement.

## Decision

Author `artifacts/prompts/mathematics-standards-spec.md`: a derived spec whose numbering and titles
are authored, whose bodies reproduce the source bullets verbatim, and which carries a traceability
table mapping every source requirement to its numbered item. Point the inventory and the fidelity
check at it. Keep both originals unmodified and record their digests.

## Alternatives rejected

**Rewrite the extractor to parse bullets.** The bullets are requirements *within* standards, not the
standards series. An inventory pointed at them would either fail forever or encode a fabricated
mapping — a made-up correspondence with the authority of a machine check behind it.

**Skip the inventory.** It is the check that makes "did I cover everything" mechanical instead of a
memory exercise. The reference implementation discovered a silently skipped standard this way.

## Consequences

The consolidation is a judgement, made once, visible in one file, and reviewable. Where the derived
spec and an original disagree, **the original governs** — stated in the derived spec's own header.

This creates a hole that ADR 0002's digests close: fidelity compares a standard against the derived
spec, so the cheapest way to make a standard true would be to edit the spec, and fidelity would still
pass because the thing it compares against is what moved.
