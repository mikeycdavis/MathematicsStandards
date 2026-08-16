# Tier 3 — semantic inconsistency and representation

**Milestone claim.** *What counts as the evidence is declared once and read; and how strong a claim is
and what it bears on are two facts, not one.*

Scope: `§0c` (a recognized representation of the evidence read as its absence), `§0d` (evidence types
meaning different things to different rules), `A1` (epistemic strength and relevance-to-target as
independent axes). Disposition tier 3, "semantic inconsistency and representation".

Base: `885d92e`, the v1.2.0 endpoint. Branch `tier3-semantic-consistency`, worktree
`../MathematicsStandards.tier3`. **v1.2.0 stays frozen at `3bc38fa`** — it is the acceptance baseline
this milestone is measured against.

**No version is assigned.** This document is named for the tier, not a release. Tier 2 was v1.2
because its design record said so before a backlog label existed; here the release decision is
explicitly reserved, and a design record that pre-named itself v1.3 would be taking it.

---

## 1. The three defects, located in the code rather than described

Every one is a live line at `885d92e`, not a summary of a report.

**`§0c`, both arms, in one detector** — `scripts/standards.mjs`, `detectComputationEvidence`:

```js
const approximate = /≈|~=|\bapproximately\b|\babout\b|\bO\(|\bo\(|\bΘ\(|\bΩ\(|\btruncat/i.test(entry.statement);
const bounded    = /\berror\b|\bbound\b|\binterval\b|\bwithin\b|\bat most\b|\bprecision\b/i.test(…);
if (approximate && !bounded) → computation.error-bounds-stated
```

RiemannHypothesis: `\bO\(` is in the *approximate* list. An asymptotic statement is not an
approximation missing its bound — the `O` **is** the bound. The framework reads the evidence as its
absence.

PvsNP: `\babout\b` matches the English preposition, so "a statement about the kernel" is an
approximation. And `\bbound\b` does not match **bounds** — `\b` falls between `d` and `s` — so a
statement that says "bounds" is unsuppressed. The trigger vocabulary and the suppressor vocabulary
were authored separately and nothing holds them to each other.

**`§0d`, two lists that disagree** — `scripts/claims.mjs` declares what an evidence type is worth:

```js
export const PROOF_EVIDENCE = new Set(["proof", "formal", "citation"]);
```

and `detectCounterexampleSearch` in `scripts/standards.mjs` re-decides it inline:

```js
if (["counterexample-search", "proof", "formal", "computational"].some((t) => types.has(t))) continue;
```

`citation` carries a claim to proved rank in the first and discharges nothing in the second.
RiemannHypothesis's 2005 published theorem was therefore asked to search for counterexamples to a
theorem someone had already proved. Note the second list also admits `computational`, which the first
does not — the disagreement runs both ways, and neither list knows the other exists.

**`A1`, absent from the model, present in both adopters' prose.** Preserved verbatim:

> **Status is not relevance.** The fifteen statuses grade how strong the evidence is. This project's
> category key grades relevance to the target, and the two are orthogonal. `CLM-0009` is a
> `MACHINE_CHECKED_PROOF` and category 2 — correct, unconditional, irrelevant to RH. Its status is
> not weakened to express that.
>
> — RiemannHypothesis, `artifacts/claims-ledger.md`

> **Epistemic status and relevance to P vs NP are separate axes.** CLM-0011 is a
> `MACHINE_CHECKED_PROOF` and, by the project's own barrier audit (CLM-0022), constrains nothing
> about `P/poly`. Both facts are true at once and neither adjusts the other. Nothing in this ledger
> is demoted for being off-target.
>
> — PvsNP, `artifacts/claims-ledger.md`

Two projects, two subject matters, no contact, the same sentence. Both reached it under different
pressure — RH from a category key orthogonal to the ladder, PvsNP from kind-versus-strength on
`EQUIVALENT_REFORMULATION` ranked below `LEMMA`. Both had to write it in prose because no field takes
it. RH additionally lists the relevance category among "several things this project maintains that
have no field here."

---

## 2. Do `§0c` and `§0d` share a primitive? No — and the answer matters

The disposition pairs them: *"a rule's notion of what counts as the required evidence disagrees with
mathematics (§0c) or with another rule (§0d) … a shared evidence-recognition model would address
both."* That was a hypothesis about design, recorded before either was designed, and the
authorization asks it be determined rather than assumed.

**Determined: they do not share an implementable primitive.** They operate on different substrates
and no single object can serve both without being a union type pretending to be a model.

| | `§0c` | `§0d` |
| --- | --- | --- |
| substrate | free prose — a claim's `Statement` | structured data — the declared `Evidence` type tokens |
| question | does this text exhibit the evidence? | is this declared type adequate for this obligation? |
| failure when wrong | false positive on honest prose | false negative, or a demand for paperwork already discharged |
| authority | English and mathematical notation | this framework's own vocabulary, Standard 19 |

A recognizer over prose and a capability table over a closed nine-token vocabulary are not the same
mechanism. Forcing them together would produce something that reads regexes out of a table, which is
the current design with an extra layer.

**What they do share is a discipline, and that is testable.** In both, the framework's notion of what
counts as the evidence was written down more than once and the copies drifted. So this milestone adds
two declarations — one per substrate — and **one contract test that no detector may hold a private
literal list of evidence tokens or evidence types.** That test is the shared part. It is what would
have caught both defects, and it is what stops the third instance.

Recording the negative result rather than quietly implementing the affirmative one: the disposition's
pairing was right about the cause and wrong about the fix.

---

## 3. The model

### 3.1 `§0c` — one vocabulary, two roles derived from it

Today a marker's meaning is split across a trigger list and a suppressor list, authored independently.
The replacement declares each marker once, with what it *is*:

```js
{ pattern: /\bO\(/,        asserts: "approximation", carries: "bound"   }  // asymptotic: both at once
{ pattern: /≈|~=/,         asserts: "approximation", carries: null      }
{ pattern: /\babout\b/,    asserts: "approximation", carries: null, requiresQuantity: true }
{ pattern: /\bbound\w*\b/, asserts: null,            carries: "bound"   }  // bound, bounds, bounded
```

A finding requires *asserts an approximation* **and** *nothing carries the bound* — and because a
marker can do both, a marker that carries what it triggers can never produce a finding. That is `§0c`
stated as a property of the table rather than as a fix to two regexes:

> **No marker may satisfy the trigger for an obligation it discharges.**

Checked as an invariant over the table, not per marker, so a marker added later cannot reintroduce
the defect. The morphological gap (`bound` vs `bounds`) closes because stems are matched once, in one
place, rather than in a suppressor somebody else wrote.

`requiresQuantity` handles the PvsNP arm without special-casing the word: a natural-language token
that is only sometimes a mathematical marker fires only in quantitative context. "About 10^9" is an
approximation; "a statement about the kernel" is not. The property is *this marker is ambiguous in
English*, which is a fact about the marker, so it lives on the marker.

### 3.2 `§0d` — capabilities, declared once, asked rather than re-decided

The nine evidence types of Standard 19 gain a capability declaration, in `claims.mjs`, beside the
vocabulary they qualify:

| type | establishes proof | discharges counterexample search | records prior work | bounded range only |
| --- | :-: | :-: | :-: | :-: |
| `proof` | ● | ● | | |
| `formal` | ● | ● | | |
| `citation` | ● | ● | ● | |
| `counterexample-search` | | ● | | |
| `computational` | | ● | | ● |
| `numerical` | | | | ● |
| `symbolic` | | | | |
| `proof-sketch` | | | | |
| `heuristic` | | | | |

`PROOF_EVIDENCE` becomes a view over this table rather than a second source, so the two cannot
disagree again. **`citation` discharges the counterexample obligation** — the RH case, decided
explicitly: a published theorem's proof is the search's answer, and asking for one anyway is asking
the honest record for paperwork.

The reverse disagreement is settled the same way. `computational` was in the counterexample list and
not in `PROOF_EVIDENCE`; that is correct and is now stated, not accidental — a scan that found no
counterexample answers *that* obligation without proving anything, which is exactly why it also
carries **bounded range only**.

### 3.3 `A1` — a second axis, and independence enforced rather than promised

A `Relevance:` field on a ledger entry, and a policy-declared vocabulary for it:

```yaml
mathematics:
  relevanceScale: ["target", "equivalent", "instrument", "off-target"]
```

**The framework does not impose a scale.** The disposition is explicit that RH's `0/1/2/3` encoding is
project apparatus and only the distinction generalizes; shipping RH's key as the framework's key would
be exactly the over-generalization the two-adopter rule exists to prevent. An adopter that declares no
scale gets no relevance checking and no finding — the field is optional, because a project with one
target and nothing off it does not need a second axis.

The load-bearing part is not the field. It is the invariant:

> **Relevance never reaches a status, a rank, a verdict, or a score.**

Represented *and* enforced, because a second axis that quietly feeds the first is worse than no second
axis: it would let a project's own off-target honesty demote its claims, which is precisely what both
adopters refused to do by hand. `STATUS_RANK` is not touched. No detector reads `Relevance` for
anything but reporting it.

---

## 4. The claims, as tests, before implementation

Red first. Each must fail at `3bc38fa` **for the recorded field-trial reason**, and the reason is
recorded beside it — a test that fails because a fixture is malformed proves nothing.

**C1 — a statement whose approximation marker is its own bound does not lack a bound.** An asymptotic
claim with no separate bound word passes. Pinned as a pair with **C1′ — a genuine unbounded
approximation still fails**, because C1 alone is satisfiable by deleting the rule.

**C2 — a marker that is ambiguous in English fires only in quantitative context**, and a suppressor
matches the word forms of the language it is written in. Both PvsNP arms: the preposition, and
`bounds` against `bound`.

**C3 — an evidence type means the same thing to every rule.** A proved-rank universal claim evidenced
only by `citation` is not asked to search for counterexamples. Paired with **C3′ — a universal claim
evidenced only by `numerical` still is.**

**C4 — no detector holds a private list of evidence types or evidence markers.** A source-level
contract over `standards.mjs`, bidirectional with the two declarations. This is the shared discipline
of §2, and the only test that would have caught both `§0c` and `§0d`.

**C5 — relevance is recorded, and changes nothing.** Two ledgers identical but for their `Relevance:`
values produce identical verdicts, identical scores, and identical per-rule statuses. The only
permitted difference is the representation of relevance itself.

**C6 — relevance is not reachable from the ranking.** `STATUS_RANK` and the capsSupport/promotion path
never read the field; asserted at source level as well as behaviourally, because a behavioural test
passes for as long as nobody happens to have written the coupling yet.

---

## 4a. The red phase, as measured against `3bc38fa`

Fourteen tests: nine red, five green. Run before any production behaviour was changed.

| Test | At v1.2.0 | The reason it gave |
| --- | --- | --- |
| C1 asymptotic | **red** | `CLM-0001` reported as an approximation with no stated bound |
| C1′ unbounded approximation | green | reported, as it must be |
| C1 table invariant | **red** | `scripts/markers.mjs` does not exist — there is no declaration to check |
| C2 preposition | **red** | `CLM-0003` reported; it approximates nothing |
| C2 word forms | **red** | `CLM-0004` reported; it says `bounds` |
| C2′ quantitative *about* | green | reported, as it must be |
| C3 citation | **red** | `CLM-0001` proved by citation and told citation records no search |
| C3′ numerical only | green | reported, as it must be |
| C3 consumers agree | **red** | the inline literal array is present |
| C4 no private lists | **red** | **8 sites, 4 detectors** — see below |
| C5 relevance carried | **red** | nothing in the envelope carries the ledger's claims |
| C5 scale expressible | **red** | exit 2: the policy is rejected outright |
| C6 relevance changes nothing | green | vacuously — nothing reads the field |
| C6 ranking cannot read relevance | green | vacuously — the field does not exist |

Every red gave the reason recorded against it in §1, and no red was caused by a malformed fixture:
the three true positives run through the same fixtures and the same rules and are green.

### C4 found more than `§0d` reported

`§0d` was recorded from one disagreement — `citation` in `PROOF_EVIDENCE` and absent from
`detectCounterexampleSearch`'s inline list. The contract test finds **eight** literal evidence-type
tokens across **four** detectors:

```
standards.mjs:962   counterexample-search, computational, formal   (counterexample search)
standards.mjs:991   computational, numerical                       (computation evidence)
standards.mjs:1325  formal                                         (formal chain)
standards.mjs:1565  computational, formal                          (evidence surfaces)
```

Only one of these was known to have drifted. The rest are, at v1.2.0, second opinions that happen to
agree — which is the state the counterexample list was in for `computational` until this fixture
asked. This is the shared-discipline argument of §2 confirmed by measurement rather than asserted:
the defect the adopters found was one instance of a pattern with eight sites.

It also enlarges the repair. `§0d` as recorded is one list; the guarantee as written is that no
detector holds a private list, and satisfying it means routing all eight through the declaration.
That is more work than the backlog item describes, and it is the work the item's own guarantee
implies. Recorded here rather than quietly scoped down or quietly expanded.

---

## 5. Sequence

1. Red tests for C1–C6, each failing at `3bc38fa` for its stated reason.
2. The marker table and its invariant; `§0c`'s two arms become consumers of it.
3. The capability table; `PROOF_EVIDENCE` becomes a view; `§0d`'s inline list deleted.
4. The C4 contract test, once both declarations exist to be checked against.
5. `Relevance` — grammar, optional policy scale, reporting — and the independence invariant.
6. Measure both frozen adopters. Findings compared separately from consequences, as in Tiers 1 and 2.

`§0c` and `§0d` are sequenced apart deliberately, per §2: they are two declarations, not one, and
building them together is how they would end up sharing a mechanism that suits neither.

---

## 6. Predictions

Written before implementation, recorded so the measurement can falsify them.

| | Predicted |
| --- | --- |
| RH `computation.error-bounds-stated` | **findings fall.** The `O(` arm is its documented false positive; the question is whether anything else was resting on it |
| PvsNP `computation.error-bounds-stated` | **findings fall**, from the preposition arm. If they fall to zero, the rule was carrying nothing real in this specimen and that is worth knowing |
| RH `proof.counterexample-search-recorded` | **the citation-evidenced entries stop being asked.** A finding is *removed*, and a removed finding must be explained rather than welcomed |
| Either adopter's verdict | **must not improve.** Three of these repairs remove findings; a milestone that makes a repository look more compliant by relaxing recognition has failed unless every removal is individually justified |
| Either adopter's score | **may rise**, and this is the uncomfortable one. Tier 2's movement was downward and easy to defend. Here a false positive leaving is a rule going from failed to passed, which looks like grade inflation and is not — each must be shown to be a case the framework was wrong about |
| Relevance | **no change anywhere.** Neither adopter declares a scale, so C5 holds trivially on both, and the specimens cannot be the evidence that the axis works. Its evidence is the fixtures |

### 6a. Measured — and every removal is named

Full suite 187 passing, gate green, both specimens rerun. Neither verdict moved.

| | v1.2.0 | after | |
| --- | --- | --- | --- |
| RiemannHypothesis | `BLOCKED_BY_INVARIANT` / 88 | `BLOCKED_BY_INVARIANT` / **92** | 7 failures → 5 |
| PvsNP | `NON_COMPLIANT` / 97 | `NON_COMPLIANT` / **100** | 2 failures → 1 |

**Three finding objects were removed, covering four claim-level false positives, and no finding was
added.** The two units are worth separating because they differ here: a finding aggregates every
claim that tripped one rule in one repository, so RH's `computation.error-bounds-stated` finding
carries `CLM-0004` and `CLM-0005` together. One-to-one, against the statement that produced each:

| Removed | Claim | The statement, and which repair removed it |
| --- | --- | --- |
| `computation.error-bounds-stated` | RH `CLM-0004` | `c_n = O(n^{-3/4+ε})` — §0c, asymptotic arm. The `O` is the bound |
| `computation.error-bounds-stated` | RH `CLM-0005` | `RH holds if and only if c_n = O(n^{-3/4+ε})` — the same arm |
| `computation.error-bounds-stated` | PvsNP `CLM-0021` | "the counting **bounds** proved … are **about** a different object" — §0c, *both* PvsNP arms in one sentence: the plural the suppressor could not match, and the preposition the trigger should never have matched |
| `proof.counterexample-search-recorded` | RH `CLM-0005` | evidence is `citation — Báez-Duarte, … 2005` — §0d, and this is literally the published theorem the disposition recorded |

Nothing else moved. The score rise is those removals plus one denominator entry:
`claims.relevance-vocabulary` is evaluated and passes in both, neither adopter having declared a
scale, so it enters as a pass. RH 48 → 49 evaluated required rules, PvsNP 34 → 35.

**The rise is not evidence that anything improved.** It is evidence that four findings the framework
had no business making are gone, and each is here with the sentence that produced it so the claim can
be checked rather than trusted. If any of the four had been a real defect this milestone would have
concealed one, which is why the removals are enumerated and not counted.

### 6b. Two defects found in this milestone's own instruments

Recorded because both are the failure modes this tier is about, committed by the work repairing them.

**The C4 falsifier over-reported by 60%.** Its first form flagged eight evidence-token spellings; three
were the ledger field `formal` and the applicability regimes `computational`/`formal` — three
vocabularies, one spelling, recognised without the context that says which. That is §0c, inside the
test written to prove §0d. The scan now requires the literal to sit where evidence data is
interrogated, which is the same qualification `requiresQuantity` makes for `about`. Five sites were
genuine and all five are migrated.

**The C6 independence guard was passing a mutation it should have failed.** The relevance pair is
symmetric by construction, so a coupling that penalised off-target claims penalised exactly one claim
in each run and left the per-rule multiset identical. The guard now compares which claims are named,
and the fixtures were changed to fail a rule on purpose — an earlier draft gave both entries proof
evidence, so nothing fired, and a pair where nothing happens cannot detect a difference in what
happens.

---

The last row is a limit on what this milestone can claim: `A1` is the one accepted *addition*, both
adopters wanted it, and neither frozen specimen can demonstrate it, because both froze before the
field existed. That is a gap in the evidence, not a gap in the design, and it is stated here rather
than left for a reader to notice.

### 6c. Reproduced independently, and again after integration

Measured twice more on 2026-08-16, both times against the same frozen controls — RiemannHypothesis
at `ec543d2` and PvsNP at `2185937`, checked out into disposable worktrees rather than read from
those repositories' working trees, which have since moved on and were dirty.

**First**, against `d054363` from a separate checkout of the framework, with `3bc38fa` re-run as the
baseline in the same session rather than quoted from this document. Every number above reproduced
exactly: RH `BLOCKED_BY_INVARIANT` 88 → 92 with 7 failures → 5 and the denominator 48 → 49, PvsNP
`NON_COMPLIANT` 97 → 100 with 2 → 1 and 34 → 35. The removed findings were diffed mechanically and
matched the table above at the same ledger lines, `CLM-0004`:99, `CLM-0005`:121, `CLM-0021`:503.
Nothing was added in either repository.

**Second**, against `3400341`, this branch after `main` was merged in — nine commits of unrelated
development, including the whole local Docker CI mechanism. The comparison that matters is not
against v1.2.0 but against `d054363`: **every rule state is identical, in both repositories.** Same
verdicts, same scores, same denominators, same three finding objects, none added, none removed. The
integration changed nothing this milestone measures, which is a result rather than an assumption —
a green suite alone would not have shown it, since the suite does not evaluate the frozen adopters.

Full suite after integration: 214 passing, 187 from this milestone and 27 from the CI mechanism.
