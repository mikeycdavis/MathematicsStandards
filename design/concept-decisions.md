# Concept decisions

The charter lists fifteen concepts a standards repository might need and instructs: *do not blindly
implement these concepts merely because they are listed. Determine which are appropriate and document
the reasoning.* This is that determination.

Three were adopted with a change of shape, two were deliberately not given their own object, and one
was added that the list does not name. Everything else was adopted as listed.

| # | Concept | Decision | Where it lives |
| --- | --- | --- | --- |
| 1 | requirement | Adopted | `level: required` in the catalog |
| 2 | prohibition | Adopted, strengthened | `level: forbidden` + `nonExemptible: true` |
| 3 | recommendation | Adopted | `level: recommended`, and `optional` alongside it |
| 4 | decision rule | **Not a separate object** | See below |
| 5 | applicability | Adopted | `applicability` in `project-policy.yml` |
| 6 | evidence | Adopted, typed | The ledger's `Evidence` field, ten closed types |
| 7 | verification | Adopted, split | `audit` vs `validate`; `validationType` per rule |
| 8 | exceptions | Adopted, bounded | `exceptions`, rejected against invariants |
| 9 | severity | Adopted, kept separate from level | `severity: error/warning/info` |
| 10 | invariants | Adopted, **defined rather than declared** | `isInvariant(rule)` |
| 11 | revisit conditions | Adopted, **made mandatory** | `revisitWhen`, plus attestation digests |
| 12 | not-applicable | Adopted | Result disposition |
| 13 | not-evaluated | Adopted, load-bearing | Result disposition |
| 14 | compliant | Adopted | Verdict |
| 15 | non-compliant | Adopted | Verdict |
| — | **blocked by invariant** | **Added** | Fifth verdict |

## The decisions that were not "adopt as listed"

### Prohibition (2) — strengthened into something a policy cannot reach

A prohibition that a project could waive is not a prohibition, it is a strong recommendation with a
serious tone. So `forbidden` alone was not enough: every prohibition also carries
`nonExemptible: true`, and the policy engine *rejects* an exception written against one rather than
honouring it or quietly ignoring it. The rejection is itself a failure, so writing the waiver makes
things worse rather than better.

### Decision rule (4) — deliberately not a separate object

This was the closest call. A "decision rule" would be a first-class thing that maps observed state to
an outcome. Two mechanisms already do that, and adding a third would give the repository two places
to say what a violation is:

- For anything checkable, the detector *is* the decision rule: it reads the ledger and decides.
- For claim promotion, the transition-requirements table in
  [Standard 2](../standards/02-claim-hierarchy.md) R4 is the decision rule, and it is normative text
  rather than code because most of what it governs is not machine-checkable.

A separate object would have to be interpreted by something, and that something would be a second
evaluator. Rejected on the same grounds as the alias mechanism: one spelling, decided on day one.

### Evidence (6) — typed, with ceilings, and one late split

Evidence is not a free-text field. Each entry declares a type from a closed vocabulary, and each type
carries a ceiling: the highest claim rank it can support alone. That is the whole mechanism behind
"numerical evidence is never deductive proof" — the prohibition becomes a comparison between two
fields of one ledger entry.

`citation` and `literature-search` are separate types, and the split came from a test rather than
from design. With one type covering both, adding a note that MathSciNet had been searched silenced
`computation.evidence-as-proof` on a THEOREM whose only real support was a computation, because the
search record satisfied the proof-evidence test. Saying *this is proved in the literature* and saying
*I looked for prior work* are different claims.

### Verification (7) — split into discovery and verdict

`audit` reports what was observed and produces no status. `validate` applies the policy and produces
the verdict. They have different exit-code contracts, which is the practical reason they cannot be
one command: a flag that changes the exit contract is a trap. `check` is a documented alias of
`validate` because the charter names it and inventing a third behaviour for it would be worse than
aliasing.

### Severity (9) — kept orthogonal to level

`level` says how much the rule matters to this project; `severity` says how loud a violation is. They
are frequently conflated and should not be: `formal.trusted-base-enlarged` is `optional`/`info` —
worth knowing, not worth failing — while `rigor.wlog-abuse` is `forbidden`/`warning`, a genuine
prohibition whose violations are usually judgement calls a reviewer should see rather than a build
should stop on.

### Invariants (10) — defined, not declared

There is no `invariant: true` field. An invariant is the conjunction the standards already express:
`level: forbidden` **and** `nonExemptible: true`. `isInvariant(rule)` in `scripts/compliance.mjs` is
the single place that definition lives, so the catalog, the verdict, and the documentation cannot
give three different answers. A separate flag would be a fourth answer waiting to disagree.

### Revisit conditions (11) — mandatory, and in two forms

The charter asks when a previous determination must be revisited. Two mechanisms answer it, and both
were made compulsory rather than advisory:

- **`revisitWhen`** on every not-applicable classification, naming the event that ends it.
  `math-standards policy` reports `policy.missing-revisit-condition` when it is absent, because a
  classification with no end condition is a permanent exemption wearing a temporary label. It is
  enforced in the policy checker rather than the schema only because the requirement is conditional
  on `status` and the schema evaluator implements no conditional keywords — a limit it keeps
  deliberately, since a validator that ignored a keyword it did not understand would be worse.
- **Attestation digests.** An attestation records the files it reviewed; when their content changes
  the attestation goes stale and the rule returns to `not-evaluated` — not to failure. A review of a
  proof that has since been rewritten establishes nothing about the current proof, and this is a
  revisit condition that fires by itself.

### Not-evaluated (13) — the concept the rest protect

Kept as a first-class outcome, distinct from both compliance and non-compliance, and never allowed to
count as a pass. A `manual-review` rule lands here even when the automated run examined everything
and found nothing, because "no automated finding" is not evidence for a requirement whose evaluator
is a human. Twenty-nine of the catalog's rules report `not-evaluated` in every run, which is honest
and is published in `docs/assurance-report.md` rather than hidden.

The dual of that principle needed enforcing too, and a test found it missing: an observation is not
nothing either. A finding against a `manual-review` rule was being discarded as "nobody looked",
which for an invariant silently downgraded `BLOCKED_BY_INVARIANT` to `COMPLIANT`.

### Blocked by invariant — added

The charter's list of conclusions includes it; its list of concepts does not. It earns a verdict of
its own because in this domain the distinction is real: a missing counterexample search makes a
project non-compliant and work may reasonably continue, whereas a claim of machine certification over
a `sorry` means something in the record is untrue in a way that invalidates whatever rests on it.
`NON_COMPLIANT` is a state a project can knowingly occupy. `BLOCKED_BY_INVARIANT` is a state it must
leave, and an agent reading the verdict needs to be able to tell which one it is looking at.

## What was considered and not built

- **A numeric risk score.** Rejected: the framework already has a compliance percentage that has to
  be kept from being read as a verdict, and a second number would be a second thing to misread.
- **Rule inheritance or profiles** ("strict mode", "publication mode"). Rejected for now: the
  applicability mechanism already lets a project tailor per rule, and a named profile would hide
  which rules it turned off. Worth revisiting if real projects converge on the same tailoring.
- **A machine-readable claim-transition state machine.** Rejected: the transitions that matter are
  gated on evidence a machine cannot assess, so a formal state machine would encode the checkable
  fraction while looking complete.
