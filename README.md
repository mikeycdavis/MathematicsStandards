# Mathematics Standards

Standards for mathematical reasoning, proof, and theorem work — and the command that checks a
research repository against them.

The objective, from the source:

> The objective is to prevent mathematical research—particularly AI-assisted mathematical research—from confusing exploration, computation, reformulation, numerical evidence, or plausibility with proof.

This is not a document collection. It is a policy-as-code system that determines what must be done,
what must never be done, when a standard applies, what evidence demonstrates compliance, how that
compliance is verified, and when a previous determination has to be revisited. It has no dependency
on any other standards repository, and no runtime dependencies at all.

## The idea in one page

Every claim a project makes is registered in a **claims ledger** with a status from a closed
fifteen-token vocabulary, what it depends on, what it assumes, what obligations remain, and what
evidence supports it. That turns questions that are otherwise matters of recollection into questions
about a file:

- Is this theorem really unconditional, or does something in its dependency closure sit below proved
  rank?
- Did this claim get stronger without anyone recording why?
- Is the only support for this "theorem" a computation over a finite range?
- Does this `MACHINE_CHECKED_PROOF` cite a Lean file that still contains `sorry`?
- Is the argument circular — including the version routed through three lemmas and forty pages?

Those are all checkable, and they are checked. What is *not* checkable is stated just as plainly:
whether a proof is correct, whether an assumption was used and never declared, whether a citation
says what it is cited for, whether a reformulation is progress. Those rules exist, they are named,
and they report `not-evaluated` rather than passing. See [docs/assurance-report.md](docs/assurance-report.md),
which is generated from the rule catalog so it cannot drift from what the tooling actually does.

## Quick start

```bash
npx math-standards init .
```

Then register your claims in `artifacts/claims-ledger.md`, declare your regimes in
`project-policy.yml`, and:

```bash
npx math-standards validate .
```

Read the `not-evaluated` count as carefully as the status. A clean run means everything that was
checked passed — not that everything was checked.

## Commands

| Command | What it does |
| --- | --- |
| `math-standards init [path]` | Scaffold a project. `--dry-run` reports exactly what the real run would write |
| `math-standards audit [path]` | Evidence discovery. No policy needed, no verdict produced |
| `math-standards validate [path]` | The verdict. This is what CI gates on |
| `math-standards check [path]` | Alias of `validate` |
| `math-standards explain <rule\|standard>` | Why this rule applies here, what would satisfy it, and what the check does *not* establish |
| `math-standards status [path]` | Verdict, coverage, and any blocking invariant, in four lines |

Design reasoning for the command set is in [design/cli.md](design/cli.md).

## Verdicts

| Verdict | Meaning |
| --- | --- |
| `COMPLIANT` | Every applicable, evaluated rule passed |
| `COMPLIANT_WITH_EXCEPTIONS` | As above, with active approved exceptions |
| `NON_COMPLIANT` | A required rule failed. Work may reasonably continue with the failure recorded |
| `NOT_EVALUATED` | No policy declares what applies here |
| `BLOCKED_BY_INVARIANT` | A prohibition was violated. **Stop.** No exception, attestation, or reclassification clears it |

## The claim hierarchy

The fifteen statuses, and the line the whole framework is built around:

```text
DEFINITION · OBSERVATION · NUMERICAL_OBSERVATION · HEURISTIC · HYPOTHESIS
CONJECTURE · EQUIVALENT_REFORMULATION · COMPUTATIONAL_VERIFICATION
─────────────────────────── proved rank begins here ───────────────────────────
LEMMA · PROPOSITION · CONDITIONAL_THEOREM · THEOREM
FORMALIZED_THEOREM · MACHINE_CHECKED_PROOF

UNRESOLVED_CLAIM sits outside the ladder entirely.
```

A claim must never silently move upward. Every status change is recorded with its date, its reason,
and its evidence — and reaching proved rank requires evidence of type `proof`, `formal`, or
`citation`. A computation, however large, is not one of those.

## The standards

| # | Standard | # | Standard |
| --- | --- | --- | --- |
| 1 | [Applicability and Scope](standards/01-applicability-and-scope.md) | 12 | [Approximation and Error Bounds](standards/12-approximation-and-error-bounds.md) |
| 2 | [Claim Hierarchy](standards/02-claim-hierarchy.md) | 13 | [Symbolic Manipulation](standards/13-symbolic-manipulation.md) |
| 3 | [Claims Ledger](standards/03-claims-ledger.md) | 14 | [Literature and Novelty](standards/14-literature-and-novelty.md) |
| 4 | [Definitions Before Dependent Claims](standards/04-definitions-before-dependent-claims.md) | 15 | [Equivalent Reformulations](standards/15-equivalent-reformulations.md) |
| 5 | [Domains and Quantifiers](standards/05-domains-and-quantifiers.md) | 16 | [Formal Theorem Proving](standards/16-formal-theorem-proving.md) |
| 6 | [Assumptions and Hidden Conjectures](standards/06-assumptions-and-hidden-conjectures.md) | 17 | [Open Problems](standards/17-open-problems.md) |
| 7 | [Proof Obligations](standards/07-proof-obligations.md) | 18 | [Research Lifecycle](standards/18-research-lifecycle.md) |
| 8 | [Dependency Traceability](standards/08-dependency-traceability.md) | 19 | [Evidence Requirements](standards/19-evidence-requirements.md) |
| 9 | [Edge Cases and Counterexamples](standards/09-edge-cases-and-counterexamples.md) | 20 | [Must-Never Rules](standards/20-must-never-rules.md) |
| 10 | [Computational and Numerical Evidence](standards/10-computational-and-numerical-evidence.md) | 21 | [Standards Integrity](standards/21-standards-integrity.md) |
| 11 | [Finite and Infinite Reasoning](standards/11-finite-and-infinite-reasoning.md) | 22 | [AI Agent Operation](standards/22-ai-agent-operation.md) |

Every prohibition in [Standard 20](standards/20-must-never-rules.md) has a rule id, a severity, and a
place in the verdict. None exists only as prose.

## Framework coverage

Coverage is reported beside every verdict and is **never** folded into it — a coverage improvement
must not be able to look like a compliance improvement. Run:

```bash
npm run status
```

The current figures are computed, not written down. `docs/assurance-report.md` breaks them out by
what the automation establishes: fully, partially over declared data, or not at all. Roughly a third
of the catalog is in that last tier, by design rather than by omission.

## Layout

```text
standards/       22 normative documents, NN-<kebab-title>.md
rules/           the machine rule catalog, one file per subject area
schemas/         project-policy.schema.json
scripts/         the CLI and its gates — zero dependencies, Node >= 18
templates/       what `init` writes into a project
test/            unit tests, plus fixture research repositories
docs/            architecture, diagrams, and the generated assurance report
design/          concept and CLI design reasoning, testing principles, v1.1 candidates
artifacts/       the source prompts, their digests, the derived spec, the inventory, ADRs

compose.ci.yml   the ephemeral CI environment — no network, no services, disposable
Dockerfile.ci    the CI image, pinned by digest
```

## Development

```bash
npm run inventory   # the standards series has not silently changed shape
npm run fidelity    # every "verbatim from the source" block actually is
npm run policy      # this repository's own policy is well-formed
npm run diagrams    # every .mmd matches its embedded copy
npm test            # unit + fixture tests, including the self-audit
npm run audit       # evidence discovery on this repository
npm run validate    # the verdict
npm run assurance   # regenerate docs/assurance-report.md

npm run mutation-check   # attack each gate with the defect it exists to catch
```

### Local Docker CI and verified PRs

The whole gate runs in a container before anything is pushed:

```bash
node scripts/ci.mjs      # the full pipeline, in Docker. scripts/ci.ps1 and scripts/ci.sh do the same
node scripts/submit-pr.mjs   # run it, then push and open the PR only if the exact commit passed
```

The invariant `submit-pr` enforces is that **the commit pushed for a PR is exactly the commit that
passed the complete local Docker CI pipeline** — not merely a commit on a branch whose CI was green
recently. It refuses a dirty tree, resolves `HEAD` before and after the run, and pushes the verified
SHA by name rather than pushing `HEAD`.

The stage list lives in [`scripts/ci-stages.mjs`](scripts/ci-stages.mjs) and is the single
authoritative definition: the container and `.github/workflows/ci.yml` both execute it rather than
each restating the commands. GitHub Actions remains enabled as a second opinion and is not the PR
gate. Full detail — isolation model, cleanup, debugging, evidence — is in
[docs/local-ci.md](docs/local-ci.md).

`mutation-check` is not part of `npm test` because it writes to tracked files, restoring them
immediately. Run it after changing a gate, a detector, or the comment-stripping logic. It has already
found a bug no ordinary test could: `'` was treated as a string delimiter in Lean sources, so the
first primed identifier — and primes are everywhere in mathematics — blanked the rest of the file out
of the structural view and the placeholder detector reported clean. Every existing test asserted that
something did *not* fire, which the bug satisfied perfectly.

CI runs all of them, in that order, with no install step — the absence of `npm ci` is what makes the
zero-dependency rule structural rather than aspirational. In the container the same rule is enforced
a second way: the pipeline runs with no network, so a dependency could not be fetched even if
something tried.

## Adopting it

Read [INSTRUCTIONS.md](INSTRUCTIONS.md). The short version: do not copy the standards documents into
your repository. Depend on a version, declare a policy, and let the tool tell you what it could not
check.
