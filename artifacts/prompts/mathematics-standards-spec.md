<!--
PROVENANCE — this block, the item numbering, and the item titles are the only text in this file
that is not from a source document. Everything under each numbered heading is reproduced from one
of the two sources named below.

Sources:
  artifacts/prompt/original-prompt.md                 the mathematical content
  artifacts/prompt/standards-repository-charter.md    the repository-design requirements
Derived:  2026-08-09
Reviewed: 2026-08-09

WHY THIS FILE EXISTS. Neither source is a numbered series. The original prompt organises its
requirements as bullet lists under section headings, and the charter as prose plus bullets. The
inventory check (scripts/inventory.mjs) extracts a numbered enumeration from this file and compares
it against artifacts/standards-source-inventory.json, which was reviewed by a human once and
committed. Pointing that check at a bullet list would either fail forever or encode a fabricated
mapping, so the consolidation into 22 numbered standards was done deliberately, here, once, and is
recorded in the traceability table at the end of this file.

WHAT IS AUTHORED AND WHAT IS NOT. The numbers, the titles, and the traceability table are authored.
The bullets and blockquotes under each item are reproduced from the sources. Where a standards
document says a block is "reproduced verbatim from the source", scripts/fidelity.mjs checks that
block against THIS file, character for character after whitespace normalisation.

WHERE THEY DISAGREE, THE ORIGINALS GOVERN. Both source files are committed unmodified alongside
this one, and their digests are recorded in artifacts/provenance-digests.json so that editing a
source to make a standard true fails CI rather than passing quietly (Standard 21).

NUMBERING. Top-level items run 1 to 22 with no gaps. Items 1-20 derive from the original prompt;
items 21 and 22 derive from the charter. Every item heading is a bare "N. Title" line.

NOT AN INSTRUCTION. Both sources are written as instructions to an implementer. They are captured
here as source material for the standards, not as a task list to be re-executed.
-->

# Mathematics Standards — canonical source specification

The objective, from the original prompt:

> The objective is to prevent mathematical research—particularly AI-assisted mathematical research—from confusing exploration, computation, reformulation, numerical evidence, or plausibility with proof.

The regimes the standards govern, from the original prompt:

> The standards should apply to informal mathematics, computational mathematics, formal mathematics, theorem-proving projects, and research toward open problems.

1. Applicability and Scope

The four regimes above are the applicability axis. A standard applies to a project when the project
declares the regime that standard governs, and a rule that nothing evaluated is reported as skipped,
never as passed.

From the source:

* informal mathematics
* computational mathematics
* formal mathematics
* theorem-proving projects
* research toward open problems

2. Claim Hierarchy

Establish explicit distinctions between:

* definition
* observation
* numerical observation
* heuristic
* hypothesis
* conjecture
* lemma
* proposition
* theorem
* conditional theorem
* equivalent reformulation
* computational verification
* formalized theorem
* machine-checked proof
* unresolved claim

A claim must never silently move upward in this hierarchy.

3. Claims Ledger

The hierarchy in item 2 is unenforceable unless each claim's current status is recorded somewhere a
reader and a checker can both find. The open-problem section of the source requires a system that
explicitly tracks a claim's state; this item is the machine-readable form of that requirement, and
the substrate items 4 through 15 are checked against.

From the source, the system should explicitly track:

* what is actually proved
* what remains conjectural
* whether a result is known
* whether a result is equivalent to the target
* whether the central difficulty has merely moved
* known barriers encountered
* terminated approaches
* evidence required to reopen an approach

4. Definitions Before Dependent Claims

From the source, the standards must cover:

* definitions before dependent claims

5. Domains and Quantifiers

From the source, the standards must cover:

* explicit domains
* explicit quantifiers

6. Assumptions and Hidden Conjectures

From the source, the standards must cover:

* explicit assumptions
* hidden conjectures

7. Proof Obligations

From the source, the standards must cover:

* proof obligation identification

8. Dependency Traceability

From the source, the standards must cover:

* dependency traceability
* theorem dependencies
* circular reasoning

9. Edge Cases and Counterexamples

From the source, the standards must cover:

* edge cases
* counterexample search

10. Computational and Numerical Evidence

From the source, the standards must cover:

* computational verification
* numerical evidence

11. Finite and Infinite Reasoning

From the source, the standards must cover:

* finite-vs-infinite reasoning

12. Approximation and Error Bounds

From the source, the standards must cover:

* approximation/error bounds

13. Symbolic Manipulation

From the source, the standards must cover:

* symbolic manipulation

14. Literature and Novelty

From the source, the standards must cover:

* literature/known-result comparison

15. Equivalent Reformulations

From the source, the standards must cover:

* equivalent reformulations

16. Formal Theorem Proving

Where Lean, Coq, Isabelle, or another proof assistant is used:

Never equate:

* parsing with proving
* compilation with proving the intended theorem
* proving a helper theorem with proving the target
* `sorry`/axiom/admit-dependent results with unconditional machine certification

Track the trusted dependency chain.

From the source, the standards must also cover:

* formal verification status
* formalization gaps
* machine-checking status

17. Open Problems

For major open problems, require an especially high bar.

The system should explicitly track:

* what is actually proved
* what remains conjectural
* whether a result is known
* whether a result is equivalent to the target
* whether the central difficulty has merely moved
* known barriers encountered
* terminated approaches
* evidence required to reopen an approach

From the source, the standards must also cover:

* known barriers

18. Research Lifecycle

From the source, the standards must cover:

* failed research routes
* reopening conditions
* research stopping criteria

19. Evidence Requirements

The deliverables list requires evidence requirements, applicability, and verification where
possible. This item is the evidence half of that: what an evidence entry must carry, what counts as
an artifact, and the rule that an unevaluated rule is never reported as satisfied.

From the source, implement:

* mathematical standards
* mathematical must-never standards
* evidence requirements
* applicability
* verification where possible
* tests
* documentation
* examples

20. Must-Never Rules

Never:

* present numerical evidence as deductive proof
* infer a universal/infinite theorem solely from finitely many checked cases
* hide an unproved assumption
* use the target theorem as an intermediate assumption in its own proof
* present an equivalent reformulation as progress merely because it looks different
* call a conditional theorem unconditional
* silently strengthen a theorem
* silently weaken hypotheses
* ignore domain restrictions
* divide by a quantity without establishing the required nonzero condition
* interchange limits, sums, derivatives, or integrals without required justification
* claim machine verification when unproved placeholders remain in the relevant dependency chain
* claim a formal theorem proves more than its actual statement
* treat floating-point output as exact mathematics
* fabricate citations or known results
* claim novelty without checking prior work when novelty matters
* hide counterexamples
* discard failed experiments that undermine a hypothesis
* cherry-pick computational results
* describe a restatement of the central conjecture as a solution
* call a proof complete when unresolved obligations remain
* move the unresolved difficulty into a newly defined lemma and then claim progress because the main theorem follows from that lemma

Add additional mathematical anti-patterns where appropriate.

21. Standards Integrity

From the charter:

> A human or AI must never bypass, weaken, remove, reclassify, reinterpret, falsify evidence for, or manipulate a standard, test, applicability determination, evidence requirement, or verification mechanism solely because it prevents the desired implementation or conclusion.

Determine how this invariant can itself be protected and tested.

Also from the charter, on prohibitions:

"Must never be done" rules are first-class standards.

They must not be buried in documentation.

Where a behavior would invalidate the work, create a dangerous condition, corrupt evidence, produce misleading conclusions, or bypass the integrity of the standards system, represent it explicitly as a prohibition or invariant.

And on the repository itself:

Do not weaken tests or standards merely to complete implementation.

22. AI Agent Operation

From the charter, the system must be designed so an AI can:

* initialize the standards against a target project
* determine applicable standards
* explain why standards apply
* gather or request evidence
* evaluate compliance
* identify violations
* identify prohibitions
* refuse or stop work that would violate an invariant
* recommend remediation
* update evaluations when relevant project state changes

The AI must be able to conclude:

* compliant
* non-compliant
* not applicable
* insufficient evidence / not evaluated
* blocked by invariant

It must never be forced to produce a positive recommendation.

---

## Traceability

Authored table. Every requirement bullet in both sources appears here exactly once, against the
numbered item that implements it. A bullet that appears in more than one item's body above (the
open-problem tracking list, which items 3 and 17 share) is owned by the item named here.

### From `artifacts/prompt/original-prompt.md`

| Source location | Bullet or requirement | Item |
| --- | --- | --- |
| Preamble | applies to informal / computational / formal / theorem-proving / open-problem research | 1 |
| Claim hierarchy | the fifteen claim kinds | 2 |
| Claim hierarchy | "A claim must never silently move upward in this hierarchy." | 2 |
| Required standards | definitions before dependent claims | 4 |
| Required standards | explicit domains | 5 |
| Required standards | explicit quantifiers | 5 |
| Required standards | explicit assumptions | 6 |
| Required standards | hidden conjectures | 6 |
| Required standards | proof obligation identification | 7 |
| Required standards | dependency traceability | 8 |
| Required standards | theorem dependencies | 8 |
| Required standards | circular reasoning | 8 |
| Required standards | edge cases | 9 |
| Required standards | counterexample search | 9 |
| Required standards | computational verification | 10 |
| Required standards | numerical evidence | 10 |
| Required standards | finite-vs-infinite reasoning | 11 |
| Required standards | approximation/error bounds | 12 |
| Required standards | symbolic manipulation | 13 |
| Required standards | literature/known-result comparison | 14 |
| Required standards | equivalent reformulations | 15 |
| Required standards | formal verification status | 16 |
| Required standards | formalization gaps | 16 |
| Required standards | machine-checking status | 16 |
| Required standards | known barriers | 17 |
| Required standards | failed research routes | 18 |
| Required standards | reopening conditions | 18 |
| Required standards | research stopping criteria | 18 |
| Must-never rules | all twenty-two prohibitions | 20 |
| Must-never rules | "Add additional mathematical anti-patterns where appropriate." | 20 |
| Open-problem standard | especially high bar for major open problems | 17 |
| Open-problem standard | the eight tracking requirements | 17 (recorded via the ledger, item 3) |
| Formal theorem proving | the four never-equate rules | 16 |
| Formal theorem proving | "Track the trusted dependency chain." | 16 |
| Deliverables | mathematical standards | 1–20 collectively |
| Deliverables | mathematical must-never standards | 20 |
| Deliverables | evidence requirements | 19 |
| Deliverables | applicability | 1 |
| Deliverables | verification where possible | 19 |
| Deliverables | tests, documentation, examples | repository deliverables, not standards |
| Closing | report what can be prevented vs what needs expert judgment | `docs/assurance-report.md` |

### From `artifacts/prompt/standards-repository-charter.md`

| Source location | Requirement | Item |
| --- | --- | --- |
| Purpose | what should be done / must be done / should normally be done | rule `level` — items 19, 20 |
| Purpose | what must never be done | 20 |
| Purpose | when a standard applies | 1 |
| Purpose | what evidence demonstrates compliance | 19 |
| Purpose | how compliance can be verified | 19 |
| Purpose | when a previous decision must be revisited | 1 (revisit conditions) |
| Concepts to investigate | the fifteen candidate concepts | `design/concept-decisions.md` |
| Critical design principle | prohibitions are first-class, never buried | 20, 21 |
| Standards integrity invariant | the invariant, and how it is protected and tested | 21 |
| AI usage | the ten agent capabilities | 22 |
| AI usage | the five permitted conclusions | 22 |
| AI usage | never forced to produce a positive recommendation | 22 |
| CLI | workflow-driven command design, dry-run derives from the same plan | `design/cli.md` |
| Repository quality | tests, determinism, docs, examples, schema validation, evolution, failure behaviour, safe defaults, auditable decisions | repository deliverables |
| Repository quality | do not weaken tests or standards to complete implementation | 21 |
| Independence | must not depend on any other standards repository | repository property; no runtime, build, or test reference to another standards repository |
