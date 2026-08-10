# Characterizing the two post-init defects

Read-only follow-up to [`rh-v1.0.0-post-init.md`](rh-v1.0.0-post-init.md). Nothing was changed in
either repository. No regex was tuned, no rule edited, no fixture added. The question here is only
*why* each defect occurred, precisely enough that a v1.1 fix can be aimed at a cause rather than at a
symptom.

---

## Part 1 — The five `computation.evidence-as-proof` matches

The heuristic, [`standards.mjs:986`](../../scripts/standards.mjs):

```js
const PROVED_NUMERICALLY =
  /\bprov(?:es?|ed|en)\b[^.\n]{0,80}\b(?:numerical(?:ly)?|computational(?:ly)?|by (?:simulation|Monte Carlo)|by exhaustive search)\b/i;
```

It matches a proof-word and an evidence-word within eighty characters on one line. What the rule
needs is a *relation* between them: that the numerics are the **instrument** of the proving. Eighty
characters of proximity is the proxy. Here is what the proxy caught.

### The five, with enough context to classify

**1 — `Research/AUDIT_COVER_NOTE.md:118`**, inside a draft letter to an external expert:

> "…one page per bridge, with every claim marked as proved / cited / numerical-only / asserted."

`proved` and `numerical` are adjacent because they are **alternatives in a taxonomy** — a slash-list
of mutually exclusive labels. The sentence describes the project's own discipline of marking each
claim by evidence type. It is, almost exactly, this rule restated by the adopter.

**2 — `Research/PHASE_I/C7A_NOTES.md:37`**, a section heading:

> "## 1. The easy half — proved, and it certifies the whole numerical record"

**3 — `Research/STATUS.md:3269`**, the same result in the status document:

> "### Proposition 1 (proved) — the numerical record is certified as upper bounds"

In both, a proved proposition **certifies** the numerics. The numerics are downstream of the proof.
The surrounding text makes it unambiguous: nested subspaces give monotone decreasing Galerkin values,
so every computed value is a *rigorous upper bound*. That is a theorem about the reliability of a
computation — the opposite of a computation standing in for a theorem.

**4 — `Research/STATUS.md:3523`** and **5 — `:3577`**, the same sentence in two places:

> "C7-A proves a numerical scheme converges to `lambda_min`, using no information whatever about the
> sign of the limit — which is exactly why it was provable."

`numerical` is an **attributive adjective on the object of the theorem**: the thing proved is a
statement about a numerical scheme. And the immediately following clause is the project explaining
why the result does *not* advance the target. Both lines sit inside passages that end
`Success: NOT ACHIEVED`.

### One category or several

**One dominant semantic failure, in two syntactic shapes, plus one distinct failure.**

| | Cases | What went wrong |
| --- | --- | --- |
| **A. Role confusion** | 2, 3, 4, 5 | The evidence-word occupies an **argument position** of the proved statement, not an **evidential position**. The rule targets `numerics ⟹ claim` (illegitimate substitution); all four instances are `proof ⟹ statement about numerics` or `proof ⟹ certifies numerics`. The direction is inverted. |
| **B. Mention, not use** | 1 | The words are **enumerated as vocabulary**, not predicated of anything. The line describes a labelling scheme. |

The two shapes inside A — *a proof whose consequence is about numerics* (2, 3) and *a proof whose
subject is numerical* (4, 5) — differ grammatically but fail identically: `numerical` modifies the
mathematics under discussion, never the warrant offered for it. A fix that separated them would be
solving one problem twice.

So: **two categories, not five instances of one and not five separate problems.** That matters for
v1.1, because they need different treatments and only one of them is a linguistics problem.

### B is the framework's own doctrine, failing one level up

v1.0 takes use-versus-mention seriously. `structureOf()` blanks comments and string literals so a
Lean comment reading `-- TODO remove sorry` cannot fire a placeholder detector. That discipline is
**implemented at the lexical layer only**. Case 1 is a mention in ordinary prose, where there is no
delimiter to blank, and the doctrine has nothing to say.

The framework knows this about itself. [`standards.mjs:989`](../../scripts/standards.mjs), inside
the prose arm:

```js
if (path.resolve(file).startsWith(path.join(HOME, "standards"))) continue; // these documents describe the error
```

The framework exempts its own standards documents from the scan **on precisely the grounds that
exonerate case 1** — a document describing an error is not committing it. It granted itself the
exemption and did not consider that an adopter's documents might need the same one. A research
repository that maintains an evidence-type taxonomy will discuss proof and numerics in the same
sentence constantly, and that is a mark of rigor, not of overstatement.

### The selection effect, which generalizes past this regex

All five matches come from three documents whose function is **classifying the project's own
evidence**: an audit cover note, a phase notebook separating the proved half from the unproved half,
and a status document that labels every result. The heuristic's hit density is highest exactly where
the project's epistemic hygiene is highest.

Stated generally, and not specific to this regex or this rule:

> A detector that pattern-matches on epistemic vocabulary has a false-positive rate that rises with
> the adopter's rigor. The more carefully a project distinguishes proof from numerics in writing, the
> more often it says both words in one sentence.

This inverts the usual assumption that a scrupulous project has less to fear from a strict checker.
It is the strongest argument in the record for the v1.0 decision to leave 29 rules undetected rather
than give them weak detectors — and it now applies to a detector that *was* written.

**No regex tuning was attempted, deliberately.** Nothing above is a proposed pattern. Categories A
and B are what a v1.1 design has to answer; whether the answer is a better regex, a different
evidence class, a scoped exemption, or removal of the prose arm is not settled by this document.

---

## Part 2 — Complete downstream trace of the scaffold claim

`init` wrote `artifacts/claims-ledger.md` containing one example: `CLM-0001 — Squares are
nonnegative over the reals`, status `THEOREM`, evidence `proof — proofs/clm-0001.md`. The question
is which rule evaluations changed as a result — **including the passes**, since three visible
failures were never the whole effect.

### The mechanism: one null check gates twenty-seven rules

Sixteen detector functions open with the same line:

```js
function detectNumericsAsProof() {
  if (!ledger) return;
```

With no ledger file, `ledger` is null and all sixteen return immediately. They contribute **27 rule
ids** between them. But `EVALUATED_RULES` is a static list, so the compliance engine's
`examined.has(rule.id)` test is satisfied by membership, not by execution. A detector that returned
at its first line is indistinguishable, downstream, from one that ran and found nothing.

```text
baseline                            post-init
ledger = null                       ledger = 1 synthetic entry
16 detectors return immediately     16 detectors execute
27 rules examined-in-name-only      27 rules examined over a claim the tool wrote
        ↓                                   ↓
   all report passed                24 report passed, 3 report failed
```

### The trace

Of the 27 ledger-gated rules, **3 changed disposition and 24 did not.**

The three that changed are all about `CLM-0001`:

| Rule | Why |
| --- | --- |
| `evidence.artifact-linked` | cites `proofs/clm-0001.md`, which does not exist |
| `literature.known-result-comparison` | at proved rank with no recorded comparison |
| `computation.evidence-as-proof` | — see below; **not** about `CLM-0001` |

The 24 that did not change are the substantive finding. They were passing vacuously and they still
pass, but the reason moved:

```text
claims.ledger-parse-valid          claims.status-vocabulary       claims.history-complete
claims.definitions-first           claims.inline-label-consistency claims.silent-promotion
claims.status-exceeds-support      claims.conditional-as-unconditional
rigor.explicit-assumptions         rigor.conjecture-registered
proof.obligations-enumerated       proof.complete-with-open-obligations
proof.dependency-traceability      proof.circular-dependency
proof.counterexample-search-recorded
computation.scope-declared         computation.reproducible-runs  computation.float-as-exact
computation.error-bounds-stated    computation.finite-case-generalization
literature.resolvable-identifiers  literature.unchecked-novelty
evidence.type-vocabulary           evidence.equivalence-direction-proved
```

Before: *the detector did not run.* After: *the detector ran, over one claim about `x² ≥ 0` that the
framework wrote itself.* `proof.circular-dependency` confirms the synthetic claim does not depend on
itself. `claims.silent-promotion` confirms it was not silently promoted. `computation.float-as-exact`
confirms its non-existent computation used no floats. The specimen's 982 real declarations are
untouched by all 24.

**This is worse than the baseline, not better.** At baseline the passes were empty. Now they are
empty *and* substantiated: a detector genuinely executed, genuinely examined a claim, and genuinely
found nothing wrong. The evidence trail is real and the subject is fictional. A reader auditing the
JSON has no signal distinguishing these from a pass over the project's actual mathematics.

### The fourth-order effect, which is the serious one

`computation.evidence-as-proof` is in the gated set. Its ledger arm found nothing — `CLM-0001` cites
`proof` evidence, so it is exempt. But **the prose arm is inside the same gated function**, and the
prose arm does not read the ledger at all. It scans every markdown file in the repository.

```text
init writes a synthetic claim
        ↓
ledger !== null
        ↓
detectNumericsAsProof no longer returns at line 1
        ↓
a repo-wide prose scan begins running — nothing to do with the ledger
        ↓
5 false positives in the specimen's own honest writing
        ↓
BLOCKED_BY_INVARIANT
```

The framework's terminal verdict on this repository is **causally downstream of a template example
about squares of real numbers.** Not because that example is wrong, and not because the specimen
claims anything improper, but because writing the example switched on a scan that was previously
inert, and the scan is the one with the false-positive problem characterized in Part 1.

At baseline, the prose heuristic **had never run on this repository at all.** The five passages were
present the entire time and were never reported, because the arm that finds them was behind a null
check on an unrelated file.

### What this establishes for v1.1

The question is broader than whether the template should ship an example claim.

> **What epistemic assertions, if any, may initialization create on behalf of an adopter?**

`init` inserted a positive mathematical claim — a `THEOREM`, with an evidence citation and a
promotion history — into a research repository, and the framework then evaluated that repository
partly on the claim it had authored. For a standards system whose subject is provenance and claim
integrity, a bootstrap that manufactures claims is a category error independent of whether any
individual detector behaves correctly.

The same principle is already written down elsewhere in the codebase.
[`init.mjs` `hasContent`](../../scripts/init.mjs) refuses to count an empty scaffold directory as
evidence about the project, with the comment: *a tool must never treat its own scaffolding as
evidence about the project.* That rule was applied to directories. It was not applied to the contents
of a file, and the claims ledger is where it matters most.

Whether the answer is an inert commented-out example, a distinguishable scaffold marker, refusing to
write the ledger in `ledger-required` mode, or something else, is a v1.1 design question and is not
decided here.

---

## Status

Read-only. Both repositories unchanged by this document: `RiemannHypothesis` still has no tracked
modification and only the untracked artifacts `init` created; MathematicsStandards has no change to
any standard, rule, detector, schema, template, or test. Three defects characterized, none fixed.

Not proceeding to manual adoption: curating the ledger, resolving the `AGENTS.md`/`CLAUDE.md`
collision, or translating the seven contracts would all require the adopter to accommodate false
framework conclusions first, and would contaminate the measurement of whether v1.0 can consume a
rigorous project's real claims.
