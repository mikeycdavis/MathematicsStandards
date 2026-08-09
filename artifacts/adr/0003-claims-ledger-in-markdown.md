# ADR 0003 — The claims ledger is Markdown, and the rank map is separate from the vocabulary

Status: accepted, 2026-08-09

## Context

[Standard 2](../../standards/02-claim-hierarchy.md) is unenforceable while every claim's status lives
in prose, so the framework needs a machine-readable record of claims. Two questions had to be settled
before anything else could be built: what format, and how to order the fifteen statuses.

## Decision 1 — Markdown with a small hand-written parser, not JSON

The ledger is Markdown: a heading per claim, a `- **Field:** value` list beneath it, parsed by
`scripts/claims.mjs`.

**JSON with a schema was rejected.** The ledger is read by people far more often than by the audit
command — it is the file a researcher opens to ask "what do we actually know?" A format that is
unpleasant to write is a format that goes stale, and a stale ledger is worse than none because it
looks current. The parser is deliberately strict and line-oriented rather than a Markdown engine:
anything a renderer would accept but the parser would skip is a claim that silently escapes scrutiny,
so malformed entries are reported as a first-class result instead.

## Decision 2 — The vocabulary is the source's order; the rank map is separate

The fifteen tokens appear in [Standard 2](../../standards/02-claim-hierarchy.md) R1 in exactly the
order the source lists them. The *ranking* the detectors use is declared separately in R3 and departs
from that order in four places: `EQUIVALENT_REFORMULATION` is lateral, `COMPUTATIONAL_VERIFICATION`
is an evidence state, `UNRESOLVED_CLAIM` sits outside the ladder at −1, and `CONDITIONAL_THEOREM`
ranks below `THEOREM` despite being listed after it.

**Silently re-sorting the source list was rejected.** Reordering a source list and then quoting it as
the source is the quiet edit ADR 0002 exists to stop, committed by hand.

**Treating the listed order as a ranking was also rejected**, and it is the more tempting error: it
would make `MACHINE_CHECKED_PROOF` outrank everything and `UNRESOLVED_CLAIM` outrank *that*, so a
claim marked unresolved would appear to be the strongest thing in the ledger. Confidently wrong
automated reasoning is worse than none.

## Decision 3 — A bare identifier in prose asserts nothing

`Theorem (CLM-0007)` asserts THEOREM. `by CLM-0007` asserts nothing. This asymmetry is the entire
false-positive control for `claims.silent-promotion`. A rule that fired on every mention of a claim
would be so noisy that projects would disable it, and a disabled rule catches nothing while still
appearing in the coverage figure.

## Consequences

`capsSupport` had to become a separate predicate from rank, because a `DEFINITION` sits at rank 0 and
does not cap what depends on it — it is stipulated, not unproved. A definition caps only when it
carries an open obligation. This was found by the compliant fixture, which reported every lemma
resting on a definition as over-claimed.

Prose that discusses a claim without naming its identifier is invisible to all of this. That is a
real limit and it is recorded in the assurance note of every rule that depends on the convention.
