# Standard 15 — Equivalent Reformulations

Restating a problem is one of the most productive things a mathematician can do and one of the easiest
to mistake for progress. A reformulation that looks nothing like the original feels like movement; the
new statement is in a different language, it connects to different machinery, and the derivation
between them may be genuinely clever. None of that changes the difficulty. If the two statements are
equivalent, proving one is exactly as hard as proving the other, and the work is where it was.

Source: item 15 of [`artifacts/prompts/mathematics-standards-spec.md`](../artifacts/prompts/mathematics-standards-spec.md).

## Scope

Applies wherever a project restates a claim, transports it to another setting, or asserts that two
claims are equivalent. It applies with particular force in the open-problem regime of
[Standard 17](17-open-problems.md).

## Requirements

### R1 — Reformulations are tracked with direction

From the source, the standards must cover:

- equivalent reformulations

A reformulation MUST be recorded in the `Equivalences` field of both claims, naming the direction and
the proof status of the relationship itself:

```markdown
- **Equivalences:**
  - CLM-0021 (iff, proved by CLM-0023)
  - CLM-0030 (implies — CLM-0030 follows from this claim; the converse is open)
```

Three distinct relationships are recorded distinctly, because collapsing them is a common source of
overstatement: `implies`, `implied-by`, and `iff`. Asserting `iff` where only one direction is proved
is a silent strengthening under [Standard 5](05-domains-and-quantifiers.md) R4.

### R2 — The equivalence is itself a claim

An asserted equivalence needs a proof exactly as any other claim does. It has its own ledger entry, its
own status, and its own obligations. An unproved equivalence assumed while restating a problem is a
hidden conjecture ([Standard 6](06-assumptions-and-hidden-conjectures.md)) and, when the restatement is
then treated as the real problem, one that puts the whole subsequent effort on unproved ground.

### R3 — Lateral movement is not progress

`EQUIVALENT_REFORMULATION` sits at rank 4 in [Standard 2](02-claim-hierarchy.md) R3 — the same rank as
`CONJECTURE`, deliberately. Reformulating a conjecture yields a conjecture. The source prohibits:

> present an equivalent reformulation as progress merely because it looks different

Progress is a change in what is proved, or a reduction to something strictly easier, or a
reformulation that demonstrably brings usable machinery to bear. "Looks different" is none of these.
A project MUST NOT record a reformulation as a status promotion, and MUST NOT describe a restatement
of its central conjecture as a solution — the latter being the same prohibition stated at maximum
strength in [Standard 17](17-open-problems.md).

### R4 — Say what the reformulation bought

Where a reformulation *is* valuable — and it often is — the value MUST be stated in terms of something
other than novelty of appearance. Legitimate answers are specific: it makes an existing theorem
applicable, it reduces to a case already settled in the literature, it removes a quantifier, it makes
a computation feasible, it exposes a symmetry the original hid. The discipline of writing that sentence
is most of what this standard is for; when there is no such sentence to write, the reformulation is
lateral and the record should say so.

### R5 — Reformulation and displacement are neighbours

[Standard 7](07-proof-obligations.md) R4 describes moving the difficulty into a new lemma; this
standard describes restating the problem. They are the same manoeuvre viewed from two sides, and both
are prohibited in the source's list. The structural signal is identical: after the move, the target's
dependency closure contains something at or below `CONJECTURE` rank, so its status is still capped and
nothing was proved. Whether the move was decomposition or relabelling is the judgement neither check
makes.

## Additions this standard makes beyond the source

- R1's three-way direction vocabulary and the requirement to record the equivalence's own proof
  status.
- R2's treatment of the equivalence as a first-class claim.
- R4 in full — the requirement to state what the reformulation bought, in specific terms.
- R5's identification of reformulation and difficulty displacement as the same structural event.

## Relationship to other standards

[Standard 2](02-claim-hierarchy.md) R3 places `EQUIVALENT_REFORMULATION` laterally, which is this
standard as a rank. [Standard 7](07-proof-obligations.md) R4 is the other face of R5.
[Standard 14](14-literature-and-novelty.md) matters here because a reformulation is often a known
one. [Standard 17](17-open-problems.md) requires an explicit equivalence-to-target determination.
[Standard 20](20-must-never-rules.md) holds both prohibitions.

## Implementation

The detector `evidence.equivalence-direction-proved` checks the mechanical part: an `Equivalences`
entry claiming `iff` must name the claim that proves the equivalence, and that claim must resolve and
be at proved rank. `claims.status-exceeds-support` catches the structural consequence of R3 and R5 —
a target whose closure contains a reformulation at rank 4 cannot hold proved rank.

`claims.reformulation-as-progress` has no detector. Whether a restatement is a real advance or the
same difficulty in new notation is a mathematical judgement, and the honest position is that the
tooling can see that the difficulty is still capped but cannot see whether anyone is claiming
otherwise in the prose. The rule exists so that the question is named, so that a reviewer has
something specific to attest to, and so that the coverage report counts it among the things automation
does not establish rather than quietly omitting it.
