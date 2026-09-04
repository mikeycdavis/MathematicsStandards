# Changelog

All notable changes to the Mathematics Standards are recorded here. The version in `VERSION` is the
`standardVersion` a consuming project declares in its `project-policy.yml`.

Versioning follows the rule the framework enforces on itself: adding a `required` or `forbidden`
rule is MAJOR, adding a `recommended` or `optional` rule is MINOR, and removing, weakening, or
reclassifying any rule is MAJOR. A rule never disappears silently — it is marked `deprecatedIn`,
optionally `supersededBy`, and only then `removedIn`, and the removal is recorded here. That trail
is one of the arms protecting Standard 21 (see `standards/21-standards-integrity.md`).

## Unreleased — prepared as 3.1.0, MINOR, not yet assigned

**A published evidence locator now says what it promises, and the envelope stops erasing the
difference between a section pointer that resolves and one that does not.** Classified MINOR by the
rule at the top of this file: one `recommended` rule is added, nothing is removed, weakened or
reclassified, and the envelope only gains a field. `VERSION`, `package.json` and the tag are
deliberately untouched — the number is prepared, not assigned, and the rule's `introducedIn` names
the version this is intended to ship as rather than one that exists.

**What was wrong.** `evidence.artifact-linked` has promised containing-file resolution "with any
anchor suffix removed before resolution" since the catalog's first commit, and `scripts/pointers.mjs`
refuses that widening for the pointers it handles because "a rule told to inspect one section of a
document and handed the whole document has not inspected what it was pointed at". Both are published.
Measured on `bfe7215`: a ledger citing `proofs/clm-0002.md#base` where that section exists, and one
citing a section that does not, produced **byte-identical** envelopes — the record said a file had
been inspected when a location had been declared, and said the same thing either way. The untruth was
in `inspected`, not in `status`. See `design/fe-44-locator-contract.md`.

**What changed, in three layers.**

1. `inspected.surfaces` for `cited-artifacts` now carries `locators` — the citation as the project
   wrote it — beside the existing `paths`, which continue to hold only bare containing files. A
   consumer joining on `paths` reads exactly what it read before; that is why this is MINOR, and it
   is pinned by a falsifier rather than by intention.
2. The `$assuranceNote` on `evidence.artifact-linked` now states plainly that the rule establishes
   containing-file existence only, and that a locator naming a section that is nowhere in an existing
   file passes it deliberately.
3. A new `recommended` / `warning` rule, `evidence.locator-fragment-resolves`, reports a locator whose
   named location was not found in the file that does exist. It resolves Markdown heading anchors and
   nothing else: a fragment in a `.lean`, `.v` or `.py` file is never reported as a project failure,
   because a check this framework cannot perform is its own limitation. Such a locator is set aside
   from the rule's subject and named in the inspection record's `reason`; the rule reports
   `not-evaluated` when every anchored locator declared is one it could not follow. It does not
   withdraw itself because one locator among several was unreachable — that would discard the checks
   it did perform, which is the granularity error the design record rejects in Model 3. The declared
   fragment is matched as written against the anchors a document offers, rather than being slugged
   first, so a punctuated locator cannot resolve to a heading the document does not actually offer.

**What did not change, deliberately.** The published description, `level`, `severity` and verdict
semantics of `evidence.artifact-linked` are untouched, and an unresolvable anchor still passes it and
still leaves the verdict `COMPLIANT`. Requiring the named location to resolve is a coherent future and
a MAJOR one — it would move adopter verdicts on unchanged evidence — and it is not evidenced: neither
frozen adoption record carries a single anchored evidence locator, so the population such a change
would break has never been measured. If it is ever taken, it goes through `deprecatedIn` /
`supersededBy` rather than an edited sentence.

## 3.0.0 — 2026-08-25

**A verdict that was never reached no longer carries a number. MAJOR, because the result-envelope
contract is incompatible: `score` widens from numeric to nullable on the `NOT_EVALUATED` path, and
the envelope's `schemaVersion` advances to `2.0` to say so.**

The versioning rule stated at the top of this file decides releases by what happens to *rules*, and
this release adds, removes, weakens and reclassifies none. The clause that decides it is the other
one, stated in the 1.1.0 entry below: this framework versions the format on incompatible change.
That test has been applied twice before and came out MINOR both times, each time for the same
reason recorded in the entry — 1.1.0 and 1.2.0 only ADDED fields, and a consumer joining on `ruleId`
cannot be broken by a field it never read. This is the first envelope change where the test comes
out the other way.

**What changed.** A run that reaches no verdict now reports `score: null` rather than a number, and
says which of two unrelated situations produced the absence:

    "score": null,
    "scoreBasis": {
      "version": 2,
      "unavailable": { "reason": "not-evaluated", "note": "No verdict was reached, ..." }
    }

`reason` is a closed token — `not-evaluated` or `no-scorable-rules` — and is `null` whenever a score
is present. Both are needed: `score: null` alone cannot distinguish "no verdict was reached" from
"the denominator was empty", the second is a legitimate state of a fully `COMPLIANT` run, and the
guess that reads more naturally — "nothing passed" — is wrong in both cases.

Both routes to `NOT_EVALUATED` are covered, an absent policy and an unreadable one. Only the first
was ever reported.

**Where it came from.** Not from this repository's own review. StandardsEnforcer found it from the
outside, integrating this pack: its `describe()` printed the pack's score beside the verdict until
MathematicsStandards reported `score: 97` with 52 rules passed *beside a status of
`NOT_EVALUATED`*, and the consumer's repair was to print less. Reproduced on a fixture pair
differing only in whether `project-policy.yml` parses:

| fixture | status | score before | score now |
|---|---|---|---|
| `not-evaluated-absent-policy` | `NOT_EVALUATED` | 50 | `null` |
| `not-evaluated-unreadable-policy` | `NOT_EVALUATED` | 80 | `null` |

The number ROSE as the configuration got worse. With the policy unreadable, fewer required
project-subject rules resolved into the denominator and the surviving passes dominated what was
left, so a consumer ranking repositories by score placed the broken policy above the absent one.

The human renderer never had the defect — it returns on both `NOT_EVALUATED` paths before printing a
Score line. This is the machine surface being brought to the semantics the terminal surface already
had.

**Four version numbers, four questions.** Only two of them move here, and the two that do not are
the more interesting ones:

| number | before | after | why |
|---|---|---|---|
| framework release (`VERSION`) | 2.0.0 | **3.0.0** | the envelope contract is incompatible |
| result-envelope `schemaVersion` | 1.0 | **2.0** | one version may not identify two incompatible shapes |
| `scoreBasis.version` | 2 | 2 | unchanged deliberately |
| adapter `standards-adapter.json` | 1.0.0 | 1.0.0 | unchanged deliberately |

`scoreBasis.version` stays at 2 because this release changes *whether a score exists*, never *how
one is computed*. Its contract is that two scores are comparable when their basis version agrees;
bumping it would tell every consumer their historical numbers are incomparable, which would not be
true, and no score in this release differs from the number 2.0.0 produced for the same target.

`standards-adapter.json` stays at schemaVersion 1.0.0 because this pack still does not require the
adapter's 1.1.0 `{policy}` capability. Declaring 1.1.0 would narrow compatibility with older
enforcers for nothing.

The `audit` findings report is a **separate document** with its own version, and it is untouched at
`1.0.0`. It carries no compliance score, so the field whose domain widened does not appear in it —
checkable rather than asserted, and pinned by a test.

**Scored verdicts are arithmetically unchanged.** One control per scored family, compared field by
field against 2.0.0: `COMPLIANT` 100, `NON_COMPLIANT` 97, `BLOCKED_BY_INVARIANT` 93, and
RiemannHypothesis 92. `results`, `denominator`, `summary`, `assurance`, `blockedBy` and
`foreignFailures` are byte-identical; stripping the new `scoreBasis.unavailable` field makes the
whole document equal to 2.0.0's.

**The archived specimens are not rewritten.** `artifacts/adoption/rh-baseline-validate.json` still
reads `NOT_EVALUATED` with `score: 95` under `schemaVersion` 1.0. They are records of what the
framework said on a date, and editing them to match today's code would destroy the evidence this
release rests on.

**Upgrading.** A consumer reading `score` as a number must treat it as nullable, or branch on
`schemaVersion` before reading it. A consumer that already checks `status` before reading `score` is
unaffected. The `null` is never bare: `scoreBasis.unavailable.reason` is the token to branch on.

**Chronology.** The implementation landed on `main` at `912d4f0` on 2026-08-23, verified
independently at `ca0a54a` before that. This release makes that behaviour official; it does not
introduce it. The envelope `schemaVersion` bump and its contract tests are the one part of the
change made at the release boundary itself, because the incompatibility was identified while
classifying the release rather than while implementing it.

## 2.0.0 — 2026-08-16

**Tier 3, semantic consistency and representation: what counts as the evidence is declared once and
read, and how strong a claim is and what it bears on become two facts rather than one. MAJOR,
because `claims.relevance-vocabulary` is a new `required` rule.**

The MAJOR was chosen from what the rule is, not from how large the change feels. A `required` rule
is one every adopter must now answer, and the versioning rule above does not have an exception for
rules that are easy to satisfy.

### The behavioural break

**`claims.relevance-vocabulary` is required.** A project may declare a relevance scale in
`project-policy.yml`; if it does, every relevance value in its ledger must come from that scale. A
project that declares no scale passes — relevance is optional to *use* and mandatory to *use
correctly* — but the rule enters the score's denominator either way, so an adopter's denominator
grows by one and a previously-recorded score is not comparable to a new one without saying so.

**Relevance is an axis, not a status.** Both field-trial adopters had written the same sentence in
prose because no field held it: how strong a claim's evidence is and what the claim bears on are
independent, and a correct, unconditional, off-target result is not demoted for being off-target.
`Relevance` is now a ledger field with an enforced independence invariant — the ranking cannot read
it, and no relevance value changes a status, rank, verdict or score.

### The two corrections

- **`§0c` — a recognized representation of the evidence is no longer read as its absence.** A
  marker's meaning had been split across a trigger list and a suppressor list, authored separately,
  with nothing holding them to each other. `\bO\(` sat in the *approximate* list, so an asymptotic
  statement was reported as an approximation missing its bound when the `O` **is** the bound;
  `\bbound\b` did not match **bounds**; `\babout\b` matched the English preposition. Markers are now
  declared once with what they are — what each asserts and what each carries — and the property *no
  marker may satisfy the trigger for an obligation it discharges* is checked over the table rather
  than per marker, so a marker added later cannot reintroduce it.
- **`§0d` — an evidence type means the same thing to every rule.** `PROOF_EVIDENCE` and an inline
  list inside `detectCounterexampleSearch` disagreed about what `citation` is worth, in both
  directions. A published 2005 theorem was therefore asked to search for counterexamples to itself.
  Capabilities are declared once and asked; the inline list is deleted; and a contract test forbids
  any detector holding a private list of evidence types, which is the part that stops the third
  instance rather than the second.

A negative result is recorded rather than quietly discarded: the disposition predicted `§0c` and
`§0d` would share an evidence-recognition primitive. They do not. A recognizer over free prose and a
capability table over a closed nine-token vocabulary are different mechanisms, and forcing them
together would have produced a union type pretending to be a model. What they share is a discipline
— the framework's notion of what counts as the evidence had been written down more than once and
the copies drifted — and the contract test is that discipline made executable.

### Measured, and what the score movement means

Against the frozen field-trial specimens, RiemannHypothesis at `ec543d2` and PvsNP at `2185937`:

| | 1.2.0 | 2.0.0 |
| --- | --- | --- |
| RiemannHypothesis | `BLOCKED_BY_INVARIANT` / 88 | `BLOCKED_BY_INVARIANT` / **92** |
| PvsNP | `NON_COMPLIANT` / 97 | `NON_COMPLIANT` / **100** |

**Neither verdict moved.** Three finding objects were removed, covering four claim-level false
positives, and nothing was added in either repository. Each removal is named in
`design/tier3-semantic-consistency.md` §6a against the sentence that produced it.

**The scores rose, and that is an assurance correction rather than relaxed rigor.** Every point of
it is either a finding the framework had no business making — an asymptotic statement, a preposition,
a plural the suppressor could not match, a published theorem asked to disprove itself — or the new
required rule entering the denominator as a pass. No rule was weakened, none was removed, no
threshold moved, and nothing became easier to satisfy. A framework that removes its own false
positives will look more permissive on a fixed specimen; the removals are enumerated one by one
precisely so the claim can be checked instead of trusted.

Measured three times: on the branch, independently from a separate checkout with the 1.2.0 baseline
re-run in the same session, and again on the merge commit after `main` was integrated. Comparing the
integrated result against the pre-integration one, every rule state in both repositories is
identical.

### Not in this release

EP-08 remains open. Its seven deferred features are deferred for want of an accepted model, not for
want of confirmation, and sharing an epic with three finished items is not a reason to release them.
This version delivers `§0c`, `§0d` and `A1`; it does not close the epic that contains them.

### Also in this release, changing nothing for adopters

**Local Docker CI and verified PR submission. No rule added, removed, weakened, or reclassified —
this changes how the repository is built and reviewed, not what it requires of anyone.** It shipped
between 1.2.0 and this version and is recorded here rather than left under an "Unreleased" heading
it has outgrown.

The gate now runs in a container on the developer's machine before a branch is pushed, and a PR can
only be opened for a commit that passed it. `scripts/ci.mjs` runs the pipeline in a disposable,
network-less container; `scripts/submit-pr.mjs` resolves `HEAD` before and after the run, refuses to
continue if it moved, and pushes the verified SHA by name. See `docs/local-ci.md`.

The eight gates are unchanged and none was dropped. What changed is where they are declared: the
list moved out of `.github/workflows/ci.yml` into `scripts/ci-stages.mjs`, and both the container
and the workflow now execute that one list. A test fails if the workflow goes back to naming the
commands itself.

Two defects surfaced, both from running the pipeline somewhere other than a developer's machine for
the first time:

- **`npm test` did not work on Node 20**, which is the version the workflow pins. The script quoted
  its glob, which stops the shell expanding it and hands the literal pattern to node — which only
  learned to expand it itself in v21. The quotes are gone; the same tests now run on 20 and 24
  alike, and the unquoted form is pinned by a test.
- **GitHub-hosted Actions have never executed a job on this repository.** Every run is stopped at
  the account's billing gate before reaching a step, which is why the above went unnoticed. The
  workflow is kept and refactored rather than deleted, and local CI is deliberately independent of
  it.

## 1.2.0 — 2026-08-12

**Tier 2, evidence provenance: every result records what evidence surface it inspected and whose
repository that evidence belongs to. Additive to the result envelope; no rule added, removed,
weakened, or reclassified, so MINOR under the rule above.**

Tier 1 asked how strong a finding's evidence was. This asks the prior question: was there any
evidence at all, and was it the adopter's? Measured across both frozen field trials at the Tier 1
endpoint, **not one machine-produced pass in either repository named a single file** — 99 of the 111
passes were unsourced, and the only ones that said what they rested on were the twelve a human had
written out by hand. `§0`, `§0e`, `§0h` and `§0m` are four ways of exploiting that one gap, so the
substrate is the fix and the four repairs are its consumers.

Every result now carries `inspected: { subject, state, surfaces }`. `subject` is `project`, `run` or
`framework`; `state` is derived, never authored.

- **`§0` — a detector with no subject does not pass.** Every surface resolving empty makes the rule
  `skipped / not-evaluated`, with a reason distinguishing it from *no detector exists*. It leaves the
  score's denominator, exactly as `not-evaluated` already did.
- **`§0e` — an attestation's currency is stated on every supported output surface.** The recorded
  cause was wrong and is corrected here: the current digest was never missing, it was emitted on the
  human render for all fourteen of RiemannHypothesis's attestations and on neither machine surface.
  An attestation carries `currency: verified-current | unknown`, and the human render, `status` and
  `--json` each say so in their own idiom. An attestation of unknown currency is not fresh; it is
  unmeasured, and it no longer reads as an ordinary pass on the surface an agent is most likely to
  read.
- **`§0h` — a result says whose property it is about.** Framework- and run-subject rules leave the
  adopter's score and are named in the render rather than dropped silently. Ownership was settled
  from the catalog: `integrity.provenance-digest` is asserted invariant across an adopter whose own
  `artifacts/provenance-digests.json` is absent, drifted, or correct, so an adopter can be neither
  punished nor flattered by a rule that is not theirs.
- **`§0m` — a declared artifact is followed, and read.** `resolveEvidencePointer` is a primitive
  rather than a repair inside one rule. A declared artifact that does not resolve **fails closed**:
  measured before it was closed, a fixture declaring an unresolvable artifact scored `COMPLIANT` /
  100 and now scores `NON_COMPLIANT` / 97.

The envelope gains `scoreBasis: { id, version, since, note }`, and the contract is narrow on purpose:
**two scores are comparable when their `scoreBasis.version` agrees, and not otherwise.** Historical
numbers are not restated under the new basis, because the code that produced them no longer exists
and a migration would have to guess.

Effect on the two frozen field trials, predicted before implementation and measured after:
**RiemannHypothesis stays `BLOCKED_BY_INVARIANT`, 89 → 88; PvsNP stays `NON_COMPLIANT` at 97.**
Neither status moves. RiemannHypothesis's point is lost entirely to five rules it was never being
measured on leaving the denominator — the correction, not a regression. A milestone about false
assurance that made either repository look more compliant would have failed.

## 1.1.0 — 2026-08-12

The first post-1.0 behavioural correction: two defects the field trials found in the verdict engine,
and one in argument parsing. MINOR — the result envelope gains fields and no rule is added, removed,
weakened, or reclassified.

**§0b + §0i — a finding's evidence strength constrains the verdict it can produce. Evaluator
semantic change; no rule added, removed, weakened, or reclassified.**

`BLOCKED_BY_INVARIANT` is the one verdict no exception, attestation, or level override can clear,
and until now a regex over prose could produce it. Two mechanisms did that, and they are the same
defect twice:

- `report()`'s `label` argument **defaulted to `OBSERVED`**, and 44 of 52 call sites took the
  default. Seven of those were wrong, two on invariants.
- `parseObligation` **defaulted any line it could not read to `open`**, and an open obligation on a
  proved-rank claim violates an invariant.

In both, a value nobody chose was treated as one somebody asserted.

There is now no default in either place. `report()` throws on a missing or invalid label; the
obligation parser returns `unrecognised` and leaves the detector to decide what that is worth. Every
call site is classified in `test/fixtures/evidence-classification.json` with the proposition it
asserts and the basis for its label, and a test holds that file and the source to each other in
both directions.

An invariant finding reaches `BLOCKED_BY_INVARIANT` only when its label is `OBSERVED`. An `INFERRED`
or `UNKNOWN` one is an **actionable failure, not unwaivable certainty**: still detected, still
reported in full, still failing the run and the exit code, and carrying
`cappedFrom: "BLOCKED_BY_INVARIANT"` to record the consequence the ceiling prevented. The cap
applies only on the detector-finding path. Attestations, exceptions, skips and passes carry
`label: null` and are untouched — a human reviewer's recorded rejection is not weaker evidence than
a phrase match.

Additive to the result envelope: `label` on every result, `cappedFrom` only where a cap occurred.
`schemaVersion` is unchanged, because this framework versions the format on incompatible change and
neither field breaks a consumer joining on `ruleId`.

Effect on the two v1.0.0 field trials, predicted before implementation and measured after:
**PvsNP moves from `BLOCKED_BY_INVARIANT` to `NON_COMPLIANT`, same two findings, same score.
RiemannHypothesis stays `BLOCKED_BY_INVARIANT`, its blockers going from three to two — the two
rejected attestations still block, the prose-arm heuristic no longer does.** No finding was lost in
either. A change that had made both green would have been indifferent to the distinction this
milestone exists to draw.

**§0a — unknown or invalid arguments fail closed. Correctness fix, no evaluator semantic change.**

`--dry-run` was tested by exact presence, so `--dryrun`, `--dry_run` and `--dry-run=true` parsed as a
bare `init` and **applied**. `--help` was recognised only as a subcommand, so `init --help` applied
against a real repository. Both were produced independently by the two v1.0.0 field trials, and in
both the command exited 0, so an operator who believed they were previewing had instead scaffolded.

Every command now rejects an argument it does not recognise, before reading or writing anything, with
exit 2 — the invocation-error code, unchanged. `--help` is accepted anywhere and does nothing else.

The refusal is uniform across commands rather than confined to `init`, which is a decision and not an
oversight: a flag silently ignored on a read-only command is how a CI job comes to believe it ran
`--strict` when it did not. The three ways an argument can be wrong — unknown, misplaced, or given
the wrong shape — are distinguished in the message, because the spelling that produced this defect
was a near miss rather than a random string.

The no-overwrite default is untouched. It is the guard that held when the argument parsing failed,
and the existence of a second guard is not a reason to relax the first.

Verdicts are unaffected: both frozen adopter specimens produce byte-identical results.

## 1.0.1

**Interoperability metadata. No normative or evaluator semantic change.**

Adds `standards-adapter.json`, a machine-readable declaration of how this pack is invoked and how its
result is read, against the schema owned by StandardsEnforcer. It states what was already true: the
authoritative verdict comes from `validate`, the target is given as `--dir=<path>`, and the status
vocabulary is the five values this pack has always emitted.

Declaring the verdict command explicitly matters here because `check` is an alias for `validate` in
this pack and is *not* an alias in others. An orchestrator that learned a preference across packs
would be right here and wrong elsewhere. Nothing is inferred from this array — no aliasing, no
ordering, no fallback.

`test/adapter-contract.test.mjs` builds the invocation from the contract, runs it, runs the
documented invocation directly, and requires the two to be identical, so a declaration that drifts
from the CLI fails this pack's own suite.

### Why a new release rather than a retag

The contract did not exist at `v1.0.0`, and a consumer reads the declaration out of the pinned
checkout rather than from `main`. A released product acquired a new public machine-readable
interface, so a new release publishes that interface.

### Unchanged

Every standard, rule, level, severity, disposition and assurance value; the verdict vocabulary; the
scoring; the exit codes. The adapter declaration and its fidelity test are the only substantive
changes since `v1.0.0`. Also present are the RiemannHypothesis pre-adoption baseline artifacts under
`artifacts/adoption/` and the `design/v1.1-candidates.md` register — evidence and forward-looking
design, neither of which the evaluator reads. 79 tests pass, as at `v1.0.0`.

## 1.0.0

Initial release.

- 22 standards, from the claim hierarchy through the standards-integrity invariant and the AI agent
  operation contract.
- The machine rule catalog, with every prohibition carrying `forbidden` + `nonExemptible` so no
  policy can waive one.
- The claims-ledger convention and its parser: statuses, dependencies, assumptions, obligations,
  evidence, formal status, and history.
- `init`, `audit`, `validate` (alias `check`), `explain`, and `status`.
- The fifth verdict, `BLOCKED_BY_INVARIANT`, which outranks `NON_COMPLIANT` and which no exception,
  attestation, or reclassification clears.
- `docs/assurance-report.md`, generated from the catalog, stating what the tooling establishes and
  what requires a mathematician.
- A mutation suite that attacks each gate with the defect it exists to catch.
