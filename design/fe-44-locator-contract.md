# FE-44 — what a published evidence locator promises

**Design record. Nothing here is implemented, and nothing here should be implemented on the strength
of this document.** It evaluates the models recorded in [FE-44](../artifacts/backlog/items/FE-44.md)
against the repository's written standards and its compatibility contract, and recommends one. The
trigger for acting on it is a decision to act on it, not the fact that it is written down
(Standard 18 R5, and the precedent of [design/v1.1-candidates.md](v1.1-candidates.md)).

Baseline: `bfe7215`. Every measurement below was taken on that commit, from throwaway copies of
`test/fixtures/math-compliant` outside the repository. No adopter record, rule, standard, or detector
was modified to produce them.

## 1. What was measured, and why it changes the question

FE-44 records the falsifier as a verdict defect: an existing file with a nonexistent anchor passes and
can yield `COMPLIANT / 100`. That is true, and it is not the whole of it. Four variants of one fixture,
differing only in how one `proof` evidence locator is spelled:

| variant | locator | verdict | score | `evidence.artifact-linked` |
| --- | --- | --- | --- | --- |
| base | `proofs/clm-0002.md` | `COMPLIANT` | 100 | passed |
| **anchor-present** | `proofs/clm-0002.md#proof-of-clm-0002` | `COMPLIANT` | 100 | passed |
| **anchor-absent** | `proofs/clm-0002.md#no-such-section` | `COMPLIANT` | 100 | passed |
| file-missing | `proofs/no-such-file.md#no-such-section` | `NON_COMPLIANT` | 95 | failed |

The two middle rows are the finding. **A correct anchor and an incorrect anchor are not merely scored
the same — they are indistinguishable in the envelope.** The `cited-artifacts` surface is byte-identical
across all three passing variants:

    ["computations/density/search.py","notes/heuristic.md","proofs/clm-0002.md","proofs/clm-0004.md"]

The adopter declared a *location*. The record says the framework inspected a *file*, and does not
preserve that the two were different. That is EP-07's subject stated precisely — a surface reporting
resolution it did not achieve — and it locates the untruth **in `inspected`, not in `status`**.

This matters for model selection. Models 1 through 5 all argue about what the verdict should be. The
measurement says the verdict is not where the false statement lives. A model that changes the verdict
and leaves the record erasing the declared locator has repaired the smaller half.

## 2. What the repository has already settled

Five findings from the written sources bear on every model below. None was assumed; each is cited.

**(a) Standard 19 R3 says nothing about anchors.** Its normative text is *"a path-shaped reference
MUST resolve"* — the anchor-stripping clause exists only in the catalog rule's `description`, and has
since `168fcd3`. The standard is therefore silent on the question, not on one side of it. Neither
answer contradicts Standard 19; both are consistent with R3 as written.

**(b) `not-evaluated` already has a settled meaning, and it is narrower than "unresolved".** The
`requires` mechanism in `scripts/surfaces.mjs` and the `blocked` path in `scripts/compliance.mjs` give
it three properties: *it cannot pass* (a pointer that does not resolve establishes nothing), *it cannot
fail* (absence of evidence access is not evidence of violation), and it is reserved for **evidence the
framework could not reach**. An absent anchor in a readable file is not unreachable evidence. The
framework opened the document and can see the location is not in it. That is an observation.

**(c) The score already has a monotonicity property, earned by a defect.** `scoreBasis` version 2
counts a rule whose required evidence could not be read as an *unearnable denominator entry*,
specifically so that "declaring a pointer at a file that does not exist" cannot move a rule out of the
denominator and raise the score. The comment records the measurement that forced it:
`NON_COMPLIANT / 97` had become `COMPLIANT / 100`. Any model that routes an unresolvable anchor to
`skipped` must answer to this property.

**(d) `POINTER.unsupported` already names the state.** `scripts/pointers.mjs` classifies `file#frag`
as *understood as a pointer, not to a kind of thing this framework can read*, with the reason stated in
the module: *"a rule told to inspect one section of a document and handed the whole document has not
inspected what it was pointed at."* The vocabulary for the missing distinction exists and is published.
What does not exist is any rule that consumes it — `resolveEvidencePointer` has two callers, both on
the `declared-failed-routes` path, so no ledger locator reaches it.

**(e) The framework already has a shape for "information, not a violation".**
`formal.placeholder-inventory` is `recommended` / `warning`, and its message says so in those words. A
new rule at that level is an existing pattern here, not an invention.

## 3. What the frozen adopters say

**Explicitly: nothing that distinguishes the models.**

Every `#` in the five archived RiemannHypothesis envelopes is either a markdown heading quoted inside a
finding's evidence line (`Research/STATUS.md:3269 — ### Proposition 1 …`) or the Lean `#print axioms`
command inside a remediation string. `two-adopters.md` records no anchored locator for PvsNP. A search
for a backticked `path.ext#fragment` token across all of `artifacts/adoption/` returns nothing.

So **zero anchored evidence locators in two of two adopters**, and no adopter verdict moves under any
model considered here. Three consequences, and the third is uncomfortable:

- No model can be selected or rejected on measured adopter impact.
- The compatibility argument against Model 2 cannot be evidenced from the adopters. It rests instead on
  `templates/claims-ledger.md`, which the framework ships and which *does* teach anchored locators —
  `proofs/clm-0002.md#base`, `proofs/clm-0002.md#uniformity` — though notably on **Obligations** lines
  rather than Evidence lines.
- The population a breaking change would break has never been measured. Two adopters that use no
  anchors are not evidence that adopters do not use anchors; they are two adopters.

One further observation, recorded because it bears on Model 2 and was not previously written down:
**obligation discharge pointers are parsed and consumed by nothing.** `parseObligation` populates
`dischargedBy`, and no detector reads it. The shipped template's only anchored locators are therefore
checked by no rule at all. Whatever is decided here, that gap is separate and is not FE-44's.

## 4. The models

Each is assessed on the eight axes FE-44's design question requires. "Eliminates the false-assurance
case" is read against the measurement in §1 — an anchor-present/anchor-absent pair that the envelope
cannot tell apart — not merely against the verdict.

### Model 1 — containing-file existence remains the contract

| axis | assessment |
| --- | --- |
| assurance actually established | The file named before the `#` exists. Nothing about the location. |
| eliminates false assurance | **No.** The two middle rows of §1 stay byte-identical. |
| adopter evidence | Unchanged. Nothing becomes invalid or less certain. |
| rule lifecycle | No amendment. `$assuranceNote` correction only — see below. |
| falsifier / control | `COMPLIANT / 100` · `NON_COMPLIANT / 95`. Unchanged. |
| SemVer | PATCH at most. |
| migration | None. |
| composes with pointer machinery | Neutral — leaves `resolveEvidencePointer` unreachable from ledger locators. |

The honest baseline, and it survives one objection worth answering. The rule's `description` and its
`$assuranceNote` are mutually consistent: the note's *"exact about existence at the cited path"* is
true if "the cited path" means the path after stripping, which the description defines. The claim is
not internally false. It is false **in composition** — an adopter reading `assurance: full` and
*"Exact about existence at the cited path"* against a locator they wrote as `file#section` is told
something stronger than what happened, and the envelope contains nothing that corrects them.

Rejected as a complete answer, retained as the base layer of the recommendation: **the contract is
right, and it is the surrounding report that is wrong.**

### Model 2 — the named location must resolve

| axis | assessment |
| --- | --- |
| assurance actually established | The declared location exists inside the named document — for artifact kinds whose fragments the framework can resolve. |
| eliminates false assurance | **Yes**, and it is the only model that does so through the verdict. |
| adopter evidence | **Invalid**, not merely less certain: a `COMPLIANT` repository becomes `NON_COMPLIANT` on unchanged evidence. |
| rule lifecycle | The published sentence becomes false. Standard 21 and the CHANGELOG require `deprecatedIn` / `supersededBy`, **not an edit in place**. |
| falsifier / control | `NON_COMPLIANT / 95` · `NON_COMPLIANT / 95` — the falsifier becomes indistinguishable from the missing-file control. |
| SemVer | **MAJOR**, on both clauses. |
| migration | Every anchored locator in every adopter ledger must be verified or rewritten before upgrading. |
| composes with pointer machinery | It is what `pointers.mjs` argues for — but requires implementing fragment resolution the module says is not implemented. |

Three reasons this fails **now**, none of which is that it is wrong.

*It is the strongest available change and the evidence does not reach it.* §3 says the adopter
population is unmeasured. Adopting the breaking reading on two adopters that use no anchors is
choosing a compatibility event on an unmeasured population.

*It over-corrects, in the framework's own terms.* An anchor that does not resolve in an existing
document is most often a renamed heading, not absent evidence. Failing a `required` / `error` rule on a
stale slug asserts *"this evidence points at nothing"* about a document that contains the proof. In a
framework whose thesis is that a check must not claim more than it established, replacing an
overstatement with an equal and opposite one is not a repair.

*It cannot keep `assurance: full`.* Fragments mean different things in Markdown, Lean, Coq and Python.
A rule that must resolve all of them either drops to `partial` — which is itself a reclassification —
or fails on artifact kinds it cannot read, which routes an unsupported *format* into a finding about
the *project*. That is the wrong-subject error `SUBJECT` exists to prevent.

### Model 3 — an unresolved anchor produces `not-evaluated`

| axis | assessment |
| --- | --- |
| assurance actually established | Nothing, by construction. |
| eliminates false assurance | **No — it manufactures a new one.** See (b) below. |
| adopter evidence | Neither invalid nor less certain: unexamined. |
| rule lifecycle | Amendment required; the description would have to describe a third outcome. |
| falsifier / control | `COMPLIANT / 95` · `NON_COMPLIANT / 95` — still `COMPLIANT`, now with fewer things checked. |
| SemVer | MAJOR. |
| migration | None visible to adopters, which is part of the objection. |
| composes with pointer machinery | Superficially — `unsupported` maps to `not-evaluated` — but see (a). |

Fails on three independent grounds.

**(a) It miscategorises an observation as an inaccessibility.** Per §2(b), `not-evaluated` is reserved
for evidence the framework could not reach. The framework can read the document and determine the
anchor is absent. Reporting that as *"nobody could look"* is the same class of error as reporting a
heuristic as `OBSERVED` — the tool making a false statement about its own conduct, which Standard 19 R5
prohibits by name.

**(b) The granularity is wrong, and the cost is a false green.** `not-evaluated` is per rule. One
unresolvable anchor would withdraw `evidence.artifact-linked` entirely, discarding the existence checks
on every other evidence entry — **including genuinely missing files**. A ledger containing one stale
anchor and one missing artifact would move from `NON_COMPLIANT`, naming the missing artifact, to
`COMPLIANT` with the rule skipped. A repair that lets a real violation disappear by adding a typo
elsewhere is worse than the defect it addresses.

**(c) It leaves the verdict saying `COMPLIANT`.** Under `scoreBasis` v2 the unearnable slot holds the
denominator, so the falsifier reads `COMPLIANT / 95`: a lower number, the same word, and fewer things
examined. Standard 19 R4 exists to stop exactly that reading — *"a clean audit run means everything
that was checked, passed"* — and this model makes the headline harder to read, not easier.

### Model 4 — a distinct state: document inspected, location unresolved

| axis | assessment |
| --- | --- |
| assurance actually established | Exactly the true statement: the file was read; the named location was not found. |
| eliminates false assurance | **Yes.** |
| adopter evidence | Unchanged in validity; correctly recorded as less certain. |
| rule lifecycle | Amendment, to describe the new state. |
| falsifier / control | A new state · `NON_COMPLIANT / 95`. |
| SemVer | **MAJOR** — see below. |
| migration | Every envelope consumer must learn a token it has never seen. |
| composes with pointer machinery | Well — it is `POINTER.unsupported` promoted to a result state. |

**The right diagnosis and the wrong instrument.** `results[].status` is a closed four-token set
(`passed`, `failed`, `warning`, `skipped`) and `inspected` is per rule per surface; there is no
per-evidence-entry state anywhere in the envelope. Introducing a fifth status, or an entry-level
sub-state, changes the result-envelope contract, and the test that classified 3.0.0 gives the answer:
*this framework versions the format on incompatible change*. `schemaVersion` would advance again.

That price buys a distinction the recommended model delivers additively. So Model 4 is **not rejected
on merit — it is subsumed**: its statement is the one that should be reported, and §5 reports it
without a new result state and without a MAJOR release.

### Model 5 — a separate lower-severity rule, existing rule preserved

| axis | assessment |
| --- | --- |
| assurance actually established | Existing rule: the containing file exists. New rule: the declared fragment was, or was not, found. |
| eliminates false assurance | **Partly.** The pair in §1 becomes distinguishable *in the findings*. |
| adopter evidence | Unchanged. A new `recommended` rule cannot invalidate anything. |
| rule lifecycle | None on the existing rule. Addition only. |
| falsifier / control | `COMPLIANT / 100` + a warning · `NON_COMPLIANT / 95`. |
| SemVer | **MINOR** — *"adding a `recommended` or `optional` rule is MINOR"*. |
| migration | None required; the warning is advisory. |
| composes with pointer machinery | **Best of the five.** It is the first consumer that would put a ledger locator through `resolveEvidencePointer`, and it gives fragment resolution a home whose failure mode is a warning rather than a verdict. |

Alone, insufficient — and the reason is §1. A second rule that fires correctly while
`evidence.artifact-linked` still records `proofs/clm-0002.md` for a locator the adopter wrote as
`proofs/clm-0002.md#no-such-section` puts a true statement and a misleading one in the same envelope,
and the misleading one belongs to the rule that is `required` / `error`. The instrument is right; it
needs the record fixed underneath it.

### Model 6 — record the declared locator and the fragment result; judge nothing

A sixth model the repository evidence supports and FE-44 does not list. Resolve the fragment where the
artifact kind allows, and carry the outcome in `inspected` as an additive field. No rule status
changes, no new rule, no verdict effect ever.

| axis | assessment |
| --- | --- |
| assurance actually established | Precisely what happened, per locator. |
| eliminates false assurance | **Yes, at the record.** The §1 pair stops being byte-identical. |
| adopter evidence | Unchanged. |
| rule lifecycle | None. `$assuranceNote` correction only. |
| falsifier / control | `COMPLIANT / 100`, differing record · `NON_COMPLIANT / 95`. |
| SemVer | MINOR — additive envelope field, by the 1.1.0 / 1.2.0 precedent. |
| migration | None. |
| composes with pointer machinery | Yes, and cheaply. |

The weakest model that makes the reported assurance truthful, and by the stated preference it would win
outright but for one thing: a fact recorded only in `inspected`, with no finding and no rule id, is not
addressable. It cannot be `explain`ed, cannot be classified `not-applicable` by an adopter who uses
anchors decoratively, and appears in no summary a human reads. Standard 19 R4 requires a report to make
the difference *"impossible to overlook"*. Model 6 makes it possible to overlook by design.

Retained as the second layer of the recommendation, not as the whole of it.

## 5. Recommended disposition

**Preserve the published contract; repair the record; add the distinction as a `recommended` rule.**
Composed from Models 1, 6 and 5 in that order, and it is one disposition rather than three — each layer
is load-bearing and any two alone leave a false or unreadable statement standing.

1. **`evidence.artifact-linked` keeps its published semantics exactly.** Containing-file existence,
   anchor stripped before resolution. No amendment, no `deprecatedIn`, no `supersededBy`. The sentence
   has been published since the first catalog commit and no evidence gathered here shows it is the
   wrong answer — only that the framework says more than it does around it.
2. **Correct its `$assuranceNote`** to state that the fragment is not resolved, and that a nonexistent
   anchor inside an existing file passes this rule. This is a documentation correction of a claim that
   currently composes into an overstatement. It is not release-bearing on its own.
3. **Preserve the declared locator in the inspected record**, alongside — never instead of — the
   resolved containing file, so that the §1 pair ceases to be byte-identical and the envelope stops
   erasing the difference between a section pointer and a file pointer.
4. **Add one `recommended` / `warning` rule** reporting an evidence locator whose fragment could not be
   found in its containing file, routed through `resolveEvidencePointer`, reporting `OBSERVED` where the
   fragment was searched for and `INFERRED` never. Where the artifact kind's fragments cannot be
   resolved, the outcome is the pointer module's own `unsupported`, reported as such and not as a
   finding about the project.

**Why this and not Model 2.** Model 2 is a coherent and possibly correct future. It is not this
change, because the weakest change that makes the reported assurance truthful does not require it, and
because the compatibility event it causes would be taken on a population that has never been measured.
If the fragment-resolution machinery of layer 4 runs against real adopter ledgers and shows that
unresolvable anchors are rare and are genuinely absent evidence rather than stale slugs, Model 2 becomes
the evidenced next step — and it must then go through the lifecycle fields rather than an edited
sentence.

**The Standard 21 counterfactual, applied to this recommendation.** *Would this change be correct if the
rule were currently failing?* Yes. Every layer is a statement about what the check establishes, and none
of them moves the rule off a red. Layer 4 adds a warning that did not previously exist; layers 2 and 3
make the report weaker, not stronger. Nothing here was chosen because it was easier to implement — Model
6 is strictly easier than the recommendation and is rejected in §4 for a reason unrelated to effort.

## 6. Release classification

**MINOR — `3.1.0`**, conditional on falsifier D7 below.

- Layer 4 adds a `recommended` rule: *"adding a `recommended` or `optional` rule is MINOR"*, stated at
  the top of `CHANGELOG.md`.
- Layers 2 and 3 add envelope content without changing existing fields. By the 1.1.0 and 1.2.0
  precedent recorded in the changelog, *"a consumer joining on `ruleId` cannot be broken by a field it
  never read"*, so `schemaVersion` stays at `2.0`.
- Nothing is removed, weakened, or reclassified, so the MAJOR clause is not reached.

It becomes **MAJOR** if any of three things happens, and each is a design constraint rather than a
prediction: the declared locator *replaces* rather than accompanies the existing `paths` values; a
result state or disposition token is added; or the existing rule's `level`, `severity`, or `description`
is touched.

## 7. Falsifiers that distinguish the surviving model from the rejected ones

Each is stated so that it fails under a named alternative. Together they pin the recommendation from
every direction it could drift.

| | property | fails under |
| --- | --- | --- |
| **D1** | An anchor-present and an anchor-absent ledger produce **different** envelopes. Measured identical on `bfe7215`. | Model 1 alone; Model 6 partially |
| **D2** | An unresolvable anchor leaves `evidence.artifact-linked` at `passed` and the verdict at `COMPLIANT`. | Model 2 |
| **D3** | A ledger with **both** an unresolvable anchor **and** a genuinely missing file still reports `evidence.artifact-linked` as `failed`, naming the missing file. | Model 3 — the anti-contagion test, and the one that kills it outright |
| **D4** | `results[].status` stays within `passed / failed / warning / skipped`, and `schemaVersion` stays `2.0`. | Model 4 |
| **D5** | A ledger with no anchored locator at all leaves the new rule `not-evaluated` with `no-subject`, and every other result unchanged. Both frozen adopters are this case. | any model that makes the new rule fire on unanchored evidence |
| **D6** | The `cited-artifacts` record for an anchored locator names the locator the adopter wrote. | Models 1, 3, 5 alone |
| **D7** | `paths` in `cited-artifacts` continues to contain **only** bare containing files; no `#` leaks into it. | the MINOR classification itself — if this fails the release is MAJOR |

D5 is the non-vacuity guard. Without it a rule that fired on every evidence entry would satisfy D1 and
D6 while measuring nothing about anchors, which is the failure mode FE-42's own test file was rewritten
to prevent.

## 8. What is not decided here, and what would overturn this

- **Model 2 is not refused, it is not-yet-evidenced.** The finding that would move it is adopter
  ledgers where unresolvable anchors are rare and genuinely mark absent evidence.
- **Obligation discharge pointers remain unchecked by any rule** (§3). Separate from FE-44; worth its
  own item.
- **`evidence.artifact-linked` reports its missing-file finding as `INFERRED`** though the check is an
  `existsSync` read. Defensible — `isPathShaped` is a shape heuristic, so what is inferred is that the
  token was a path at all — but it is not stated anywhere, and Standard 19 R5 makes label choice a
  first-class claim. Not FE-44's, and noted so it is not rediscovered.
- **Nothing in `rules/`, `standards/`, `scripts/pointers.mjs`, detector behaviour, `VERSION`, or FE-44's
  status was changed to produce this record.**
