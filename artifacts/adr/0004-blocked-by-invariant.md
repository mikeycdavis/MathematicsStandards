# ADR 0004 — A fifth verdict: BLOCKED_BY_INVARIANT

Status: accepted, 2026-08-09

## Context

The vendored compliance engine produces four verdicts: `COMPLIANT`,
`COMPLIANT_WITH_EXCEPTIONS`, `NON_COMPLIANT`, `NOT_EVALUATED`. The charter requires that an AI agent
be able to conclude *blocked by invariant*, as something distinct from non-compliance.

It is distinct, and the distinction is operational rather than presentational. A project can knowingly
be non-compliant and keep working: a missing counterexample search is a real finding and the right
response may well be to note it and continue. A claim of machine certification over a `sorry` is
different in kind — something in the record is untrue in a way that invalidates whatever rests on it,
and continuing produces more work resting on it.

## Decision

Add `BLOCKED_BY_INVARIANT`, produced when any rule that is both `level: forbidden` and
`nonExemptible: true` has an observed failure. It outranks `NON_COMPLIANT` in the verdict ordering,
and the envelope carries `blockedBy` naming the rules, so a consumer can branch on the array without
parsing the status string.

An invariant is not a new field. `isInvariant(rule)` is the conjunction the catalog already
expresses, defined in one place so the catalog, the verdict, and the documentation cannot disagree.

## What must not clear it

Three routes were closed deliberately, and each needed its own line of code:

- **An exception** against a non-exemptible rule is rejected, and the rejection carries the invariant
  flag — so writing the waiver blocks rather than clears.
- **An attestation** contradicted by an observed finding fails, and that failure also carries the
  flag. Without it, writing a review note would have downgraded a block to an ordinary failure.
- **A `manual-review` classification** no longer swallows findings. The engine skipped such rules
  whenever they were not attested, on the reasoning that a human evaluates them — which discarded a
  real observation and reported "nobody looked". For an invariant that silently produced `COMPLIANT`.
  Found by a test that planted a finding against an invariant and got a clean verdict back.

## Consequences

`validate` exits 1 on a block, the same as on non-compliance, because both mean "the tool worked and
the repository has a problem". The distinction is in the verdict, not the exit code — a third exit
code would break every consumer's existing branch on 0/1/2 for no gain.

`math-standards status` prints the blocking rules, and `templates/AGENTS.md` carries the duty and the
enumerated list of evasions, so that taking one is a named violation rather than an improvisation.
