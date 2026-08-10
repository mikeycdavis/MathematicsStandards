# Design — can Standard 17 represent RiemannHypothesis by reference?

**Read-only.** No `problem.md` is written. The question is narrow and empirical: **does v1.0 permit an
open-problem record that indexes an adopter's existing structured evidence, or does it require a
weaker second copy of it?** Measured against the template, the detectors, and Standard 17's own
requirements — not assumed.

Prior: [`rh-ledger-mapping-design.md`](rh-ledger-mapping-design.md) ·
[`rh-agent-contract-integration.md`](rh-agent-contract-integration.md). First specimen commit
`4eaf2da` is in.

---

## 1. What v1.0 mechanically requires

[`detectOpenProblems`](../../scripts/standards.mjs) checks two things and no more:

1. each of nine `##` headings exists, in `artifacts/open-problems/<slug>/problem.md`;
2. each has a **non-blank body**. `null` → missing; `""` → "a blank is an unanswered question wearing
   the appearance of one".

Then, under `## Terminated Approaches` only, each `###` block must carry a `Status:` line and an
`Evidence required to reopen:` line.

Nothing checks that a section is *self-contained*. A body reading `See [CONTRACTS.md](…)` is non-blank
and passes. So the mechanical answer is: **reference is permitted.** Four of the six section rules —
`problems.known-result-check`, `equivalence-tracking`, `difficulty-location`, `barriers-recorded` —
are `document`/`manual-review` in the catalog anyway: the detector checks the heading, a human judges
the substance. Whether a reference is an honest answer is therefore a judgement, which is the right
place for it, and this document is that judgement made explicitly rather than by default.

Note also that `problems.*` is inert today: `openProblemMode` is commented out in the generated
policy. Turning it on is part of the policy decision, not this one.

## 2. Section-by-section, honest or not

| Section | Proposed content | Verdict |
| --- | --- | --- |
| **Target Statement** | the Lean `def RiemannHypothesis` **inline**, verbatim, plus a pointer to `Definitions.lean` | **Duplicate deliberately.** R1 asks for the problem "stated precisely, with its source". A pointer alone would make the one thing that must never be ambiguous indirect |
| **What Is Proved** | "Nothing about the target." | **Honest, but blocked on ordering** — see §3 |
| **What Remains Conjectural** | the live bridges, by reference to `CONTRACTS.md` | **Honest with a stated loss** — see §4 |
| **Known Results** | `ATTACK_SURVEY.md`, `ExistingResults.lean` | **Reference is right.** The survey is stronger than anything restatable here |
| **Equivalences** | the category-3 list, `EquivalentForms/`, by reference | **Reference is right.** Direction and proof status live in labelled `iff` declarations — machine-checked, stronger than prose |
| **Where the Difficulty Lives** | **inline**: every live bridge is RH-equivalent, which is why there is no live proof contract | **Write it out.** This is the section RH answers best and the answer is one paragraph |
| **Known Barriers** | `B12`–`B24` table by reference to `CLOSURE_MAP.md` §3 | **Reference is right**, with the barrier ids listed so the section is readable alone |
| **Terminated Approaches** | one H3 per *terminated* item, `Status:` + `Evidence required to reopen:` pointing at its closure-map row | **Honest for the closed ones only** — see §4 |
| **Stopping Criteria** | `PROMOTION.md`, the phase boundary, per-route reopening conditions | **Reference is right** |

Seven of nine are honestly served by reference. That is the finding this phase was run to get.

## 3. `## What Is Proved` has an ordering dependency, not a representation problem

R2 binds it: *lists only claims at proved rank **in the ledger** whose dependency closure is clean*.
The ledger is empty — `CLM-0001` was removed in `4eaf2da` and nothing has replaced it. So the section
can be written honestly today ("nothing about the target; 987 formal declarations exist and none is a
claim about RH") but cannot cite the ids R2 requires.

**Consequence for sequencing: the ledger must precede `problem.md`.** Writing the problem record
first would produce a section that is true in prose and unverifiable by the rule that governs it —
and `problems.proved-vs-conjectural` would pass on a non-blank body while the substance R2 asks for
was absent. That is the vacuous-pass shape again, arriving through document order.

Not a defect in Standard 17. A dependency worth stating, because nothing in the tooling enforces it.

## 4. Where it genuinely does not fit

### Standard 17 has a section for dead approaches and none for live ones

The nine sections model an open problem as: target, what's proved, what's conjectural, literature,
equivalences, the hard part, barriers, **dead ends**, stopping criteria. There is no
`## Active Approaches`.

RH has five live contracts with state:

```text
C2b  G3  OPEN — survives all three rules and gate G3
C3   G2  OPEN — admitted under Rule 3; detection wall B21
C5   G2  OPEN — narrowed by B22: must use the Euler product
C6   G2  OPEN — B23; the analysis selects C2b
C7   G1  OPEN — first contract whose target is NOT RH-equivalent
```

Three placements were considered:

| | Verdict |
| --- | --- |
| Put them under `## Terminated Approaches` | **False.** They are not terminated. Rejected outright |
| Put them under `## Where the Difficulty Lives` | Flattens five independently-screened routes into one prose answer to a different question |
| Add a tenth `## Active Contracts` section | Not forbidden — the detector ignores extra headings — but it invents structure the standard does not define, and would make the fit look better than it is |

**Chosen: the bridges go under `## What Remains Conjectural`, by reference, with an explicit line
saying that gate state and outcome are not represented in this document and remain in
`CONTRACTS.md`.** The bridge statements genuinely *are* what remains conjectural, so that section is
not a mismatched field. What does not transfer is stated rather than smuggled.

**Recorded as a v1.1 question, not acted on:** should Standard 17 have a live-approach section? An
open problem with no active routes and an open problem with five screened, gated routes are different
positions, and v1.0's record cannot distinguish them.

### The six unrepresentable concepts stay unrepresentable

No `Notes:` field, no `Obligations:` entry, no clever prose. Restating the boundary so a later reading
can check it was held:

```text
first unproved bridge  ≠  obligations
```

An obligation list enumerates what remains to be discharged. A bridge is the **distinguished frontier
pointer** — the one statement the three rejection rules are applied to, before work starts. Collapsing
it into a list destroys which one is the frontier and leaves the screening rules with nothing to point
at. That distinction has now survived inspection of nine real contracts, including the one that
records having *no* bridge and explains why. **v1.0 has nowhere for it. "Nowhere" is the result.**

Likewise gate state, the `OPEN / DECIDED-barrier / instrument` outcome vocabulary, the rejection-rule
verdicts, the scope manifest — and the relevance-to-target category, which must **not** be mapped to a
weaker status. A machine-checked theorem irrelevant to RH stays `MACHINE_CHECKED_PROOF`; relevance is
orthogonal to strength, and demoting it to express irrelevance would corrupt the ladder to preserve a
distinction the ladder was never meant to carry. Losing the category outside the ledger is the
cheaper loss.

## 5. A detector that cannot see the adopter's strongest artifact

`lifecycle.failed-routes-preserved` looks for a **path segment** matching
`abandoned | failed | dead-end(s) | attempt(s)`:

```text
research/abandoned/x.md              MATCH
Research/FAILED_APPROACHES.md        no
Research/CLOSURE_MAP.md              no
Research/PHASE_I/PHASE_I_CONCLUSION.md   no
```

RH maintains a retraction index of fifteen entries, a closure map with per-route reopening conditions,
and a phase-conclusion document. The detector sees none of them, because the convention it encodes is
a directory name and RH's convention is a file name. It would fall back to counting `###` blocks
inside `problem.md` — i.e. it can only see the *copy*, never the original.

That is the reference-versus-duplication tension in its sharpest form: a detector that rewards
restating the record inside the framework's file and is blind to the stronger record next to it. It
is a `warning`, `INFERRED`, and not an invariant, so nothing forces the duplication — but the
incentive points the wrong way, and an adopter under CI pressure would feel it.

**Not fixed, not filed as a new v1.1 entry.** It is an instance of the principle already under test:

> If an adopter already maintains stronger structured evidence, the framework should index that
> evidence rather than require a weaker second representation.

Whether that becomes a rule needs the second adopter. Recorded here as the second independent
observation supporting it.

## 6. Answer

**Yes, with two qualifications.** v1.0 permits an open-problem record that indexes RH's existing
evidence: seven of nine sections are honestly served by reference, one must be written out because
it is the thing that must not be indirect, and one is best written out because RH answers it well.

The qualifications are that `## What Is Proved` cannot be completed before the ledger exists, and that
five live contracts have no section of their own — their bridges transfer, their gate state and
outcome do not, and that loss is recorded rather than papered over.

Representation cost for this artifact, added to the baseline:

| | |
| --- | --- |
| Sections honestly served by reference | 7 of 9 |
| Content duplicated | the target statement (deliberate), the difficulty answer (one paragraph, new writing) |
| RH records referenced, not copied | `CONTRACTS.md`, `CLOSURE_MAP.md`, `ATTACK_SURVEY.md`, `PROMOTION.md`, `EquivalentForms/`, `ExistingResults.lean`, `Definitions.lean` |
| Concepts with nowhere to go | unchanged at 6, plus live-contract state |
| Detectors blind to a stronger existing artifact | 1 (`lifecycle.failed-routes-preserved`) |

## 7. On the 5% figure

It is not a target and must not become one. The transferable claim is the selection principle, not
the number:

> Register epistemically meaningful research claims; reference formal declarations as evidence; do
> not inventory the formal development.

If PvsNP produces 2% or 50% under the same principle, the principle held. If the principle turns
ambiguous or arbitrary there — if reasonable people applying it to the same declaration disagree —
that is evidence against it, and the number will not tell us either way.

## 8. State

Nothing written to `RiemannHypothesis` in this step. It stands at `4eaf2da`: `CLAUDE.md` integrated,
`CLM-0001` and `PROJECT.md` removed, `AGENTS.md` untouched, policy committed as generated,
`artifacts/prompts/` still untracked. **No compliance run since the post-init measurement**, on
purpose — the current state is an artificial intermediate with the example gone and no real ledger
yet.

Next, when authorized: populate the ledger per the mapping design, then write `problem.md` in that
order, then evaluate. Stopping before the ledger.
