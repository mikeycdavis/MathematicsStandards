# Design — integrating MathematicsStandards into RiemannHypothesis's agent contract

**Read-only.** Nothing in `RiemannHypothesis` is modified by this document. It specifies the exact
change, states what was rejected and why, and stops. Applying it is a separate, later decision.

Prior records: [`rh-v1.0.0-pre-adoption.md`](rh-v1.0.0-pre-adoption.md),
[`rh-v1.0.0-post-init.md`](rh-v1.0.0-post-init.md),
[`rh-postinit-characterization.md`](rh-postinit-characterization.md).

---

## 1. The collision has no mechanical stake

Grepping `scripts/`, `rules/` and `schemas/` for `AGENTS.md` and `CLAUDE.md` returns matches in
exactly one place: [`init.mjs:47-48`](../../scripts/init.mjs), the artifact list. **No detector, no
rule, no schema reads either file.** Whatever is decided here changes no verdict, no score and no
finding.

That is worth stating plainly, because it removes the one pressure that would corrupt this decision.
The integration can be designed to be correct rather than to make a check pass. It also means the
framework's claim on the adopter's agent contract is purely conventional — and a purely conventional
claim is the weakest possible ground for overturning an adopter's existing architecture.

## 2. Both repositories already implement the same architecture, in opposite directions

This is not a conflict of principle. Both files were written by someone who had thought about the
same failure and reached the same conclusion.

`RiemannHypothesis/AGENTS.md`, explaining why it is a pointer:

> "…two files each declaring themselves binding, with nothing keeping them in step, so the first edit
> to `CLAUDE.md` would silently leave a stale second copy claiming equal authority… A pointer cannot
> drift."

`MathematicsStandards/templates/CLAUDE.md`, explaining why *it* is a pointer:

> "Two files that both describe the workflow become two files that disagree about it, and the one you
> happen to read first wins."

Identical reasoning, opposite anchor:

```text
RiemannHypothesis            MathematicsStandards template
  AGENTS.md  → pointer         CLAUDE.md  → pointer
  CLAUDE.md  → binding         AGENTS.md  → binding
```

The choice of anchor is arbitrary; the single-authority property is what matters, and both have it.
The adopter's direction is also the one with history behind it — RH's `AGENTS.md` records that it
*used* to be a verbatim copy and was deliberately reduced to a pointer after that hazard was
recognised.

**Decision: preserve RH's direction.** `CLAUDE.md` stays binding, `AGENTS.md` stays a pointer, and
the framework's convention yields. Stated as a principle for the adoption record:

> Adoption must integrate into the adopter's existing authority model. Initialization must not
> redefine that authority model merely because its template uses another one.

## 3. What changes

**`AGENTS.md`: no edit.** It already redirects to the binding file. A tool that looks for `AGENTS.md`
by convention finds its way to the authority in one hop, which is the entire job. Adding a standards
section to it would recreate the two-authority hazard the file exists to prevent, and would do so in
the file whose own text argues against it.

**`CLAUDE.md`: one new section**, placed after `## Working records` and before
`## A standing methodological rule`. Nothing existing is edited, reordered, or weakened. The section
is purely additive.

**A hazard to record with the change.** `init` writes `templates/AGENTS.md` over `AGENTS.md` whenever
that file is absent or `--force-overwrite=AGENTS.md` is passed. Either would silently invert the
authority direction. Today it is prevented only by the file existing and the operator not passing the
flag — and §0a of the v1.1 candidates is a demonstration that flag handling on this command is not
yet trustworthy. The proposed section states the direction explicitly so that an inversion is
visible in a diff rather than inferable only from two files' prose.

## 4. Section-by-section disposition of the template

`templates/AGENTS.md` has six substantive parts. Importing it wholesale is the wrong move: a third of
it restates, in weaker form, things RH's contract already binds more strictly.

| Template section | Disposition | Reasoning |
| --- | --- | --- |
| **Load order** (5 artifacts) | **Merge** into the existing `## Working records` list | RH already has a load list of nine records. A second list is the two-authority failure at paragraph scale |
| **"Chat history is transient"** | **Import** | RH has no equivalent. Its architecture implies it; nothing states it |
| **15-status ladder; never promote without recording why** | **Import** | Genuinely new, and orthogonal to RH's category key — the ladder grades *strength*, the key grades *relevance to target*. Neither substitutes for the other |
| **Workflow command table** | **Import** | New. Names the commands and what each is for |
| **Five conclusions** | **Import, subordinated** | New. Explicitly subordinate to the eight completion criteria, which remain the sole test of success |
| **BLOCKED_BY_INVARIANT stop duty** | **Import with a named, dated suspension** | See §5 — the interesting one |
| **"Before you say a proof is complete"** | **Map, do not restate** | RH's eight completion criteria already cover no-`sorry`, no-`admit`, no custom axioms, and target-unshadowed — *machine-checked* in `Research/axiom_check.lean`. Restating them in prose creates a weaker parallel checklist beside a stronger machine-checked one, which is precisely the drift being avoided |

## 5. The stop duty, and why it cannot be imported unqualified today

The template says: on `BLOCKED_BY_INVARIANT`, stop; you may not edit the ledger, policy, catalog or a
detector to clear it, nor reclassify, nor except, nor attest, nor proceed on the grounds that the
blocked item is peripheral.

That is a good rule. But `RiemannHypothesis` **is currently blocked**, by
`computation.evidence-as-proof`, on five false-positive prose matches characterized in Part 1 of the
characterization record. Importing the duty unqualified into a binding contract would halt all work
on the repository on the strength of a defect the adoption experiment has already documented — and
would leave the project only two permitted actions, both wrong: stop indefinitely, or edit its own
honest prose so the regex stops matching. The second is the act Standard 21 exists to forbid.

Three options were considered.

| | Cost |
| --- | --- |
| **(a) Omit the stop duty entirely for now** | The standards' strongest safety property is absent during exactly the phase meant to measure it |
| **(b) Import it as advisory** | Teaches an adopter that a block is negotiable — the habit the mechanism exists to prevent |
| **(c) Import it in full, with a named, dated, single-rule suspension** | Requires the suspension to be written down honestly, in public, with an end condition |

**(c).** And it is the right shape for a further reason: it is RH's own native mechanism. Every
closure in `CLOSURE_MAP.md` is *closed under named assumptions* with an explicit *reopens if*. A
suspension recorded as a named defect plus the condition that ends it is the adopter's existing
grammar, not a framework escape hatch — which is what integrating into the adopter's authority model
means in practice.

### This is not the manipulation Standard 21 prohibits, and here is the test

The template supplies the counterfactual: *would this change be correct if the rule were currently
passing?* It would. The detector's false-positive behaviour was established in
[`rh-postinit-characterization.md`](rh-postinit-characterization.md) Part 1 from the semantics of the
five matches — a proof *about* numerics is not numerics standing in for a proof — with no reference
to the verdict. The finding is about the detector, not about this repository's compliance.

Two further properties keep the distinction clean:

- **It suspends one detector, not the rule.** Nobody is claiming that RiemannHypothesis may prove
  things numerically. `computation.evidence-as-proof`'s *ledger* arm stays fully live; it is the
  repo-wide prose arm that is suspended.
- **It does not use the framework's exception mechanism**, which would be rejected on a
  `nonExemptible` rule and would itself be a Standard 21 violation. It is a statement in the
  adopter's binding contract, visible in a diff, with an end condition — not a waiver hidden in a
  policy file.

The end condition is specific: the suspension lifts when §0b of the v1.1 candidates is resolved and
the prose arm no longer reports against this repository, or when a review establishes the matches are
real. Either way it ends by evidence.

## 6. The exact proposed change

Insert into `CLAUDE.md` after `## Working records` (line 119) and before
`## A standing methodological rule`. Verbatim, so that applying it later is mechanical:

```markdown
## Mathematics standards — subordinate to everything above

This project is evaluated against [MathematicsStandards](https://github.com/mikeycdavis/MathematicsStandards)
v1.0.0. **This file remains the sole binding authority.** Where the standards and this contract
differ, this contract governs; where the standards are silent, they add. `AGENTS.md` is a pointer to
this file and must stay one — an `init` run that rewrites it would invert the authority direction,
and that inversion is not authorised.

The eight completion criteria remain the only test of success. The standards do not restate them and
do not weaken them: criteria 3, 4, 5 and 6 are machine-checked in `Research/axiom_check.lean`, which
is stronger than any prose checklist and stronger than anything the standards check.

Three more working records join the list above:

* `artifacts/claims-ledger.md` — every claim, its status, and what it rests on. **This is the record
  of what is known; a session's memory of a conversation is not.**
* `project-policy.yml` — which rules apply here and why one does not.
* `artifacts/open-problems/` — where a per-problem record exists.

**Claim status.** The standards grade claims on fifteen statuses — DEFINITION, OBSERVATION,
NUMERICAL_OBSERVATION, HEURISTIC, HYPOTHESIS, CONJECTURE, LEMMA, PROPOSITION, THEOREM,
CONDITIONAL_THEOREM, EQUIVALENT_REFORMULATION, COMPUTATIONAL_VERIFICATION, FORMALIZED_THEOREM,
MACHINE_CHECKED_PROOF, UNRESOLVED_CLAIM — measuring *how strong the evidence is*. This is orthogonal
to the category key above, which measures *relevance to the target*: a result can be a
MACHINE_CHECKED_PROOF and still be category 2. Neither substitutes for the other, and a claim needs
both.

No claim moves up without a History entry recording the date, the old status, the new status, the
reason, and the evidence. Reaching LEMMA or above requires evidence of type `proof`, `formal` or
`citation`; a computation, however large, is not one. Recording a claim at the status its evidence
supports is not a failure — it is the point.

**Evaluation.**

| Purpose | Command |
| --- | --- |
| What a rule requires and whether it applies here | `math-standards explain <rule-id>` |
| Full evaluation and verdict | `math-standards validate .` |
| One-screen summary | `math-standards status .` |

Read the `not-evaluated` count as carefully as the status. A clean run means everything checked
passed, not that everything was checked.

**The five conclusions.** compliant · non-compliant · not applicable · insufficient evidence /
not evaluated · blocked by invariant. No session may be forced into a positive one. "This is not
proved", "the evidence is insufficient" and "I cannot establish this" are complete, correct answers —
which is the reporting rule above, in the standards' vocabulary.

**On BLOCKED_BY_INVARIANT: stop.** A block means something in the record is untrue in a way that
invalidates what rests on it. Exactly two responses are permitted: fix the underlying condition, or
stop and report the rule ids in `blockedBy`. You may **not** edit the ledger, the policy, the
catalog, or a detector so the block clears; reclassify the rule as not applicable; write an exception
or attestation against it; or proceed on the grounds that the blocked item is peripheral. Each is an
instance of the prohibition on bypassing, weakening, reclassifying, reinterpreting, falsifying
evidence for, or manipulating a standard *solely because it prevents a desired conclusion*. The test
is counterfactual: would this change be correct if the rule were currently passing?

**One detector is suspended, by name and with an end condition.** The prose arm of
`computation.evidence-as-proof` — a regex scan of markdown for a proof-word near an evidence-word —
is **not binding on this repository**. It currently reports five matches, all false positives: four
are proofs *about* numerics, which is the opposite of the prohibited pattern, and one is this
repository's own list of evidence labels. The analysis is in the framework's adoption record,
`artifacts/adoption/rh-postinit-characterization.md`, Part 1.

Scope and limits of the suspension, which are narrow on purpose:

* the **ledger arm** of the same rule stays fully live — a claim at proved rank whose evidence is
  numerical still blocks;
* no other rule is affected, and no exception is recorded in `project-policy.yml`, where it would be
  rejected and would itself be a violation;
* **reopens if** the framework's v1.1 resolves the confidence/verdict defect and the prose arm no
  longer reports here, **or** a review establishes that any of the five matches is real. Either ends
  it by evidence.

This is a statement that one detector is known to misfire, written where it can be seen. It is not a
claim that this project may substitute computation for proof — it may not, and the reporting rules,
the promotion gate, and completion criterion 2 all say so independently.
```

## 7. Deliberately not decided here

- **The ledger.** `artifacts/claims-ledger.md` still holds only the framework's synthetic
  `CLM-0001`. It must be removed before any validation result is read as evidence about
  RiemannHypothesis.
- **`PROJECT.md`.** `init` created it as an unfilled placeholder — `# <Project name>` — whose
  "Where things live" table names `proofs/`, `computations/`, `formal/` and `research/abandoned/`,
  none of which exist here, and whose "What this project is trying to establish" section duplicates
  the binding contract's `## Definition of success — NEVER CHANGES`. A second unversioned statement
  of the target is the exact hazard `AGENTS.md` was reduced to a pointer to avoid. Its disposition —
  fill, reduce to a pointer, or delete — belongs with the ledger phase.
- **The seven contracts** and Standard 17's one-`problem.md` shape.
- **Whether the suspension in §6 is the right general mechanism.** It is right for this adopter
  because it matches an architecture RH already has. Whether the framework should offer something
  like it is a v1.1 question and needs the second adopter.

Nothing above has been applied. `RiemannHypothesis` remains at `b54cdf1` with no tracked
modification.
