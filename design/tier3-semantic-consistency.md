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

The last row is a limit on what this milestone can claim: `A1` is the one accepted *addition*, both
adopters wanted it, and neither frozen specimen can demonstrate it, because both froze before the
field existed. That is a gap in the evidence, not a gap in the design, and it is stated here rather
than left for a reader to notice.
