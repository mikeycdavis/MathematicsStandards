# Pre-adoption baseline — RiemannHypothesis against MathematicsStandards v1.0.0

**Specimen.** `RiemannHypothesis` at `b54cdf1`, branch `standards-adoption` cut from `develop`,
**untouched**. 152 Lean files, 982 theorem/lemma declarations, 45 Python model scripts, 283 commits.
**Framework.** MathematicsStandards `v1.0.0` = `85b3a11`, clean tree, all eight gates green.

**Why this record exists, and why it is here rather than in the specimen.** Everything below was
observed before any initialization. Once `init --apply` runs, the repository starts representing
itself in the framework's conventions, and it becomes very hard to distinguish what RiemannHypothesis
*taught* MathematicsStandards from what RiemannHypothesis *looked like after* MathematicsStandards
taught it how to describe itself. This file is the boundary. It lives in the framework repository so
that writing it does not alter the specimen.

Raw artifacts preserved beside it: [`rh-baseline-audit.json`](rh-baseline-audit.json),
[`rh-baseline-validate.json`](rh-baseline-validate.json).

---

## 1. What v1.0.0 observes in an untouched adopter

`math-standards audit` — 241 files scanned, **2 findings**, both `OBSERVED`, **no false positives**:

| Rule | Severity | Finding |
| --- | --- | --- |
| `claims.ledger-exists` | error | No ledger at `artifacts/claims-ledger.md` |
| `formal.status-declared` | warning | 152 Lean files; no claim declares formal status against them |

`math-standards validate` — `NOT_EVALUATED`, exit 2, "nothing declares what applies here." Correct:
a configuration problem, not a red build. `init --dry-run` classified the project `ledger-required`
and refused to generate a ledger, reporting conflicts on `AGENTS.md` and `CLAUDE.md` and changing
nothing.

**The substantive observation is what is absent from those two findings.** This repository maintains
per-route reopening conditions, a retraction index, an anti-circularity dependency graph, eleven
kernel-verified barriers, a standing adversarial test suite, and a five-gate promotion sequence. The
framework saw none of it — not because the discipline is deficient, but because it is not written in
the conventions the detectors read.

That is the honest cost of adoption in one line: **v1.0.0 can only see what is written in its
conventions, and it correctly reports that it saw almost nothing rather than reporting clean.**

## 2. A defect in the framework, found by adoption

`validate --json` on a project with no policy emits:

```text
status:  NOT_EVALUATED          correct
score:   95                     emitted anyway
summary: passed=51 failed=2 skipped=29
results: 82 entries, 51 of them "passed / evaluated"
```

Twenty-three of those passes concern mathematical structures that do not exist:

```text
claims.silent-promotion        passed    there is no ledger
claims.status-exceeds-support  passed    there is no ledger
proof.circular-dependency      passed    there is no dependency graph
evidence.artifact-linked       passed    there is no evidence
evidence.skipped-never-passed  passed
```

The `status` field, the exit code, and the human renderer are all correct — the renderer suppresses
the block entirely. The JSON does not. A dashboard reading `score`, or counting
`results[].status === "passed"`, reports 95% compliance and 51 passing rules for a repository that
declared nothing and was never evaluated.

**The general form matters more than the no-policy case.** The framework's central invariant is *a
rule nothing evaluated is skipped, never passed*. It is implemented at the level of **detector
availability** — is there a check for this rule? It is not implemented at the level of **data
sufficiency** — did the check have anything to examine? The distinction:

```text
detector exists + examined the relevant evidence + found no violation      = pass
detector exists + the prerequisite evidence does not exist                 ≠ pass
```

No fixture reached this. Every fixture has a ledger; the framework's own repository declares those
rules not-applicable, so they surface as `not-applicable` rather than `passed`. RiemannHypothesis is
the first specimen where a detector exists, has a subject in principle, and finds nothing because the
subject is absent.

**Not fixed.** Recorded, and entered in [`../../design/v1.1-candidates.md`](../../design/v1.1-candidates.md).

**The headline statistic for this baseline is not "95%."** It is: *untouched adopter,
`NOT_EVALUATED`, two valid prerequisite findings, twenty-three detector-backed rules incorrectly
represented as evaluated passes despite absent prerequisite artifacts.*

## 3. Existing mechanisms, classified

**Covered** — v1.0.0 represents it and would check it once initialized: per-route reopening
conditions (18 R2); failed routes preserved with a retraction index (18 R1); equivalence recorded
with direction and both implications (15 R1); *equivalence is not progress* as a named prohibition
(15 R3); a barrier table stating what each rules out (17 R5); first irreducible obstruction per route
(17 R4); proved-vs-conjectural with an explicit unproved banner (17 R2); counterexample search with
stated scope (9 R2/R4); no `sorry`/`admit` and the standard three axioms only (16 R2/R3); target
unshadowed and not assumed upstream (8 R3); computational scope statements (10 R1); "do not retune
the FROZEN block to make a test pass" (21 R1).

**Partially covered:**

| Mechanism | The gap |
| --- | --- |
| **Closure assumptions named per row** — no route is "exhausted"; every closure reads *closed under the stated assumptions*, and the assumptions are listed | 18 R2 requires why-it-stopped and what-reopens-it. It does not require naming the assumptions the closure rests on. A closure is a conditional statement about a search; the standard treats it as a decision |
| **Assumption status with a re-review cycle** — "All three CHECKED", re-derived by three fresh-context adversarial reviewers, verified against the literature, with the note that no reopening trigger is currently live | 19 R6 has attestations, digests, and staleness. It has no notion of adversarial review, reviewer independence, or a standing re-review trigger |
| **Defects that do not move a verdict** — "seven defects found and corrected in place; none moves a verdict, no retraction-index entry is opened" | No representation of error severity relative to conclusions |

**Absent** — v1.0.0 cannot represent it. The right-hand column is a first pass at generality and the
second adopter should test it; some of this may be idiosyncratic to a project that has been burned
fifteen times and written a rule after each.

| Mechanism | Why it matters | General? |
| --- | --- | --- |
| **First unproved bridge** — one distinguished field naming the single statement that would close the route | Makes difficulty-displacement operational: the screening rule tests *that field* for target-equivalence, so "did the difficulty move?" becomes a check on a named statement rather than a judgement. The ledger has an obligation *list* and no frontier pointer | **General** — the strongest candidate |
| **Relevance-to-target category, orthogonal to status** | A result can be a proved theorem and still be category 2: correct, unconditional, irrelevant. The ledger grades strength and never asks whether a claim moves anything | **General** in concept |
| **Explicitly-NOT reopening conditions** — more effort, a different reviewer or session, more numerics, more formalization, "feels close" | Called "the operative half of the rule", and it is. 18 R2 has the positive half only | **General** |
| **Ordered promotion gates, no skipping forward** | An evidence-acquisition sequence orthogonal to the status ladder | **General** — see §5 |
| **Standing adversarial model zoo** | Standard 9 searches for counterexamples *to a claim*; this tests a *mechanism* against known pathological objects before work starts | **General pattern**, specific contents domain-bound |
| **Barriers as pre-registration screens** — a mandatory contract field, and every contract must name a positivity input | 17 R5 records barriers after an approach dies; this gates new work on them | **General** |
| **No drift into infrastructure** — correct-but-unconsumed work gated on a named consumer | "It feels like momentum and is not" | **General** |
| **"The absence of open work is not itself a reason to open work"** | Sharper than 18 R4 | **General** |
| **S1/S2/S3 stability** — precision, tolerance, representation, with the measured finding that precision *held while being silent on both bugs* and representation was the discriminating check | Standard 12 has nothing of this shape | **Semi-general** — spectral and numerical work |
| **Constructor-level refusal** — a certificate builder that refuses to construct an object whose omitted sectors are non-empty while its not-certified list is empty | Makes the failure unconstructible rather than detectable afterwards. The framework checks artifacts; it never refuses to produce one | **General**, and architecturally unlike anything in v1.0.0 |

**Structural mismatch worth recording separately.** Standard 17 models an open problem as *one*
`problem.md` with nine sections. This project models it as one target with **seven contracts**, each
carrying its own bridge, screening verdicts, gate state, and outcome, plus a frozen roll-up document.
Forcing that into the v1.0.0 shape would flatten seven independently-stated routes into H3 blocks
under one heading.

## 4. A heuristic false positive, generated against the specimen

A pre-adoption survey scan reported **49 lines asserting a proved-level result** in this repository,
matching *we prove*, *is proved*, *resolves the*, *establishes that*, *breakthrough*.

The repository's binding contract requires every status report to state the target as unproved in
those words, and two of its top-level documents end with the target declared **UNSTATED** and the
hypothesis **UNPROVED**. The 49 lines are overwhelmingly descriptions of what a proof would require,
or discussions of other people's results.

A plausible detector produced a quantitatively impressive and epistemically worthless number against
the most scrupulous repository available. This is the argument for labelling semantic and prose
heuristics `INFERRED`, and for leaving 29 rules undetected rather than giving them weak detectors —
generated independently of the framework that mandates it, against a real specimen.

## 5. Is the bridge/gate architecture operational, or well-written policy?

Four claims tested against the actual contract records. All four hold.

**(a) Contracts name a concrete unresolved bridge, not a vague objective.** Every contract carries
*First unproved bridge* as a distinct field with a precise statement — existence of an approximation
with no loss, duplication or spurious zeros; self-adjointness on a specified domain; convergence of
specific pre-constructed truncations; a named decay bound; a named inequality. The decisive evidence
is the contract that has **no** bridge and says so: a disproof-only channel records "There is none in
the usual sense, and that is the point… What is unknown is not a lemma but a location." A template
being filled in honestly looks exactly like that; a template being satisfied looks like an invented
bridge.

**(b) Bridges are screened before work begins.** Three rejection rules are mandatory contract fields,
and the zoo records dated runs: the Hermitian-approximation collapse test decided one contract; a
boundary-condition transfer test refuted another by exhibiting a boundary condition on the same
differential expression whose spectral parameter is provably complex, with verbatim numeric output; a
Selberg-class transfer test produced a standing barrier. The zoo also distinguishes *specified* from
*implemented*, stating that a specified-but-unrun entry "is therefore **not** evidence of anything."

**(c) Later evidence cannot substitute for an earlier unmet gate.** Recorded instance: a
formalization of a classical theorem was queued as a bridge's linchpin, the falsification gate ran
first, the bridge collapsed, **and the file was not written** — logged as "the first evidence that
the gate does work." Separately, two healthy sub-results were explicitly denied further gates because
they had no consumer.

**(d) Contracts change state when evidence arrives; they are not retrofitted.** This is the claim a
well-written but inoperative process would fail, and the record fails it in the author's own
disfavour throughout: a specification audited against itself with **two of its own estimates found
false**; a quantitative stake whose numbers were **wrong** and corrected by measurement; a
crossover prediction that failed and is recorded rather than dropped; an earlier judgement explicitly
reversed with its reason; a registered prediction scored **PARTIALLY FAILED** "and recorded as such
rather than reshaped"; the project's single most promising contract reclassified by its own gate into
a component that is target-equivalent, closing it, with "no claim of progress attaches to it."

**Conclusion.** The architecture is operational. And it is **not another epistemic status ladder** —
it is a **process state machine governing how evidence may be acquired**, running on a different axis
from claim status:

```text
claim status    how strong is the evidence for this statement      DEFINITION … MACHINE_CHECKED_PROOF
gate state      how far has this investigation been falsified      G1 … G5, no skipping forward
outcome         is this route live, closed, or reclassified        OPEN / DECIDED-barrier / instrument
```

MathematicsStandards v1.0.0 models the first axis in depth, has a crude version of the third in
Standard 18, and has **nothing** on the second. That is the most consequential finding of the
baseline, and it is a genuine discovery rather than a plausible idea: it came from a real adopter
that built the mechanism independently and can show it working.

---

## Boundary

Everything above is pre-initialization. `RiemannHypothesis` is unmodified; `artifacts/prompts/original_prompt.md`
remains untracked, deliberately, as part of the specimen. Nothing in v1.0.0 was changed in response to
any of it.

Next: `init --apply`, then the integration decision for the existing agent contract, then ledger
construction. Everything after this line is post-adoption and must be read as such.
