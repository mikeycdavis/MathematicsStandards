# Post-initialization measurement — RiemannHypothesis

**Specimen.** `RiemannHypothesis`, branch `standards-adoption` from `develop`, previously untouched at
`b54cdf1`. **Framework.** MathematicsStandards `v1.0.0`, unmodified.

**Scope of this record.** `init --apply` without `--force-overwrite`, then `validate --json`
immediately, with nothing curated in between. No collision was resolved, no claim registered, no
attestation written, no contract translated. Everything below is what the tools did on their own.

Raw artifacts: [`rh-postinit-init.txt`](rh-postinit-init.txt),
[`rh-postinit-validate.json`](rh-postinit-validate.json). Pre-adoption baseline:
[`rh-v1.0.0-pre-adoption.md`](rh-v1.0.0-pre-adoption.md).

**Followed by [`rh-postinit-characterization.md`](rh-postinit-characterization.md)**, which classifies
the five false positives and traces the scaffold claim's full downstream effect. Two conclusions
there revise what is written below: the five matches are **two** semantic categories rather than one,
and the blocking verdict is causally downstream of the scaffold claim rather than independent of it —
the prose arm sits inside a ledger-gated function and had never executed against this repository
before initialization.

---

## 1. What initialization did

Mode `ledger-required` [INFERRED], on the evidence `lakefile.toml` plus no ledger. Exit code 1.

| | |
| --- | --- |
| **created** | `project-policy.yml`, `PROJECT.md`, `artifacts/claims-ledger.md`, `artifacts/open-problems/`, `artifacts/adr/` |
| **refused** | `AGENTS.md`, `CLAUDE.md` — exist, differ from the templates, reported as conflicts, unchanged |

The two conflicts are the expected collision and they behaved correctly: both files are byte-identical
to their pre-init state, and the remediation names the per-path opt-in rather than offering a blanket
one. The specimen's own anti-drift argument — a pointer cannot drift — is intact because init did not
overwrite the pointer.

**A correction to the baseline record.** §1 of the pre-adoption record states that the dry run
"refused to generate a ledger." That is wrong, and the apply shows it: `ledger-required` mode writes
`artifacts/claims-ledger.md` from the template like any other missing artifact. What the mode changes
is only the closing prose — it declines to *populate* a ledger and says why. The scaffold it writes is
not empty: it contains a fully worked example claim, `CLM-0001 — Squares are nonnegative over the
reals`, at status `THEOREM`, citing `proofs/clm-0001.md`. That detail turns out to matter.

## 2. What validation said, immediately

```text
                    baseline (untouched)        post-init
status              NOT_EVALUATED               BLOCKED_BY_INVARIANT
score               95                          92
summary             51 passed  2 failed         49 passed  4 failed
                    29 skipped                  29 skipped
exit                2                           1
```

Exactly four rules changed disposition:

| Rule | Was | Is | Subject |
| --- | --- | --- | --- |
| `claims.ledger-exists` | failed | **passed** | the template scaffold |
| `evidence.artifact-linked` | passed | **failed** | `CLM-0001` cites `proofs/clm-0001.md`, which does not exist |
| `literature.known-result-comparison` | passed | **failed** | `CLM-0001` is at proved rank with no recorded comparison |
| `computation.evidence-as-proof` | passed | **failed** | five prose passages, INFERRED |

**Three of those four are about `CLM-0001`** — a claim about squares of real numbers that this project
has never made, written by the bootstrap command four minutes earlier. The one remaining pre-existing
finding, `formal.status-declared` (152 Lean files, no claim declares formal status against them), is
unchanged from the baseline and is the only result in the envelope that is about the specimen's
actual mathematics.

**The answer to the question this phase was run to ask.** Initialization did *not* move the repository
from "nothing declares what applies" to a meaningful incomplete state. It moved it to a **differently
shaped wrong answer**. The 23 vacuously passing detectors identified in the baseline still pass — but
they are now worse, not better: at baseline they passed over nothing, and now they pass over a
template example. `claims.silent-promotion`, `claims.status-exceeds-support` and
`proof.circular-dependency` report clean because a fictional theorem about `x² ≥ 0` was not silently
promoted, does not exceed its support, and does not depend on itself. Nine hundred and eighty-two real
declarations remain invisible to all of them.

That sharpens the data-sufficiency finding rather than resolving it. The prerequisite check cannot be
"does a ledger file exist" — a file existed, and the answer got less true.

## 3. The verdict is wrong, and the mechanism is a third defect

`BLOCKED_BY_INVARIANT` is the framework's terminal conclusion. It means *stop*; Standard 22 requires an
agent seeing it to refuse to continue, and no exception, attestation, or reclassification can clear it.
It is here on the strength of this finding:

```text
rule      computation.evidence-as-proof
severity  warning
label     INFERRED
message   5 passage(s) describe something as proved numerically or computationally.
```

All five are false positives, and the first and third are almost self-parodying:

| Passage | What it actually is |
| --- | --- |
| `AUDIT_COVER_NOTE.md:118` — "every claim marked as proved / cited / numerical-only / asserted" | a specification of the project's *own* labelling discipline |
| `C7A_NOTES.md:37` — "the easy half — proved, and it certifies the whole numerical record" | a proof that certifies numerics, the correct direction |
| `STATUS.md:3269` — "Proposition 1 (proved) — the numerical record is certified as upper bounds" | as above |
| `STATUS.md:3523`, `:3577` — "C7-A proves a numerical scheme converges to `lambda_min`" | a theorem *about* a numerical scheme, not a numerical proof |

The mechanism, at [`compliance.mjs:141`](../../scripts/compliance.mjs):

```js
const outcome = level === "required" || level === "forbidden" ? RESULT.failed : RESULT.warning;
```

The result state is derived from the **rule's level**. The finding's own `severity` and evidence
`label` are carried into the envelope for a reader and then discarded by the verdict. So a heuristic
that the framework deliberately marked `warning` and `INFERRED` — precisely so it could never be
mistaken for an observation — escalates to the maximum, unclearable verdict, on a regex over prose.

Two v1.0 doctrines meet here and the collision was not foreseen:

- *Heuristics are labelled INFERRED and given warning severity so they cannot masquerade as findings.*
- *A forbidden, nonExemptible rule that fails blocks absolutely, and nothing may clear it.*

Each is right. Together they make an unclearable verdict reachable by a phrase match. And the
unclearability, which is the whole point of the invariant, is what makes it serious: the specimen has
no legitimate route to a correct verdict here. Not-applicable is false — the rule has a subject.
An exception is rejected by design. An attestation cannot clear an invariant. The only available
actions are to edit the prose of an honest research repository, or to change the framework.

Section 4 of the baseline predicted a prose heuristic producing "a quantitatively impressive and
epistemically worthless number against the most scrupulous repository available." That prediction was
made before this run and understated the consequence: the number is not merely worthless, it is
load-bearing.

**Not fixed.** Recorded, and entered in [`../../design/v1.1-candidates.md`](../../design/v1.1-candidates.md).

## 4. A safety property that held, and a defect found by an operator error

Before the approved run, an attempt to check flag spelling with `init --help` was parsed as a bare
`init` with an unrecognised flag silently ignored, and **applied against the framework's own
repository.** It created `AGENTS.md`, `CLAUDE.md`, `artifacts/claims-ledger.md` and
`artifacts/open-problems/`, all of which were deleted immediately; no tracked file was touched and the
repository returned to its committed state.

**The positive evidence, which is the more important half.** `project-policy.yml` and `PROJECT.md`
already existed in that repository and differed from the templates. Init refused both and reported
them as conflicts. The no-overwrite default is asserted by a test; here it was exercised by a genuine
mistaken invocation against a real repository and it held. That is a v1.0 safety property surviving an
actual operator error rather than a fixture.

**The defect.** A mutating command accepts unrecognised arguments and therefore performs a mutation
when the operator intended a non-mutating or invalid invocation. `init --help` is the observed case.
`--dryrun`, `--dry_run` and `--dry-run=true` are the same shape — `--dry-run` is tested by exact
presence, so any near-miss spelling silently applies — and they demonstrate the risk without needing
to be run destructively to prove it. The requirement is not "add `init --help`"; that is one symptom.
The invariant is closer to: **unknown or invalid CLI arguments must fail closed before any mutation.**
Design and implementation are deferred to v1.1.

## 5. Post-init state

`RiemannHypothesis`, branch `standards-adoption`, untracked additions only:

```text
?? PROJECT.md
?? project-policy.yml
?? artifacts/            (adr/, claims-ledger.md, open-problems/, prompts/)
```

No tracked file modified. `AGENTS.md` and `CLAUDE.md` unchanged. `artifacts/prompts/original_prompt.md`
still untracked, deliberately. `project-policy.yml` is the unedited template: `project:
"<your project name>"`, one regime (`informal`) uncommented, no applicability, exceptions or
attestations. The `BLOCKED_BY_INVARIANT` verdict above was produced against that untouched template,
which is the correct way to read it — it is what an adopter gets before making a single decision.

**Stopped here.** Nothing resolved: the `AGENTS.md`/`CLAUDE.md` collision is open, the ledger holds
only the template example, no attestation exists, and the seven contracts have not been translated
into Standard 17's shape. Three framework defects are recorded and none is fixed.
