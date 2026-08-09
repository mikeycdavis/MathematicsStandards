Implement a **Mathematical Reasoning, Proof, and Theorem Standards** pack in the existing standards framework.

First inspect and preserve the repository's existing standards architecture.

The objective is to prevent mathematical research—particularly AI-assisted mathematical research—from confusing exploration, computation, reformulation, numerical evidence, or plausibility with proof.

The standards should apply to informal mathematics, computational mathematics, formal mathematics, theorem-proving projects, and research toward open problems.

## Claim hierarchy

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

## Required standards

Cover at least:

* definitions before dependent claims
* explicit domains
* explicit assumptions
* explicit quantifiers
* dependency traceability
* proof obligation identification
* edge cases
* counterexample search
* computational verification
* formal verification status
* literature/known-result comparison
* known barriers
* equivalent reformulations
* circular reasoning
* hidden conjectures
* numerical evidence
* finite-vs-infinite reasoning
* approximation/error bounds
* symbolic manipulation
* theorem dependencies
* formalization gaps
* machine-checking status
* failed research routes
* reopening conditions
* research stopping criteria

## Must-never rules

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

## Open-problem standard

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

## Formal theorem proving

Where Lean, Coq, Isabelle, or another proof assistant is used:

Never equate:

* parsing with proving
* compilation with proving the intended theorem
* proving a helper theorem with proving the target
* `sorry`/axiom/admit-dependent results with unconditional machine certification

Track the trusted dependency chain.

## Deliverables

Implement:

* mathematical standards
* mathematical must-never standards
* evidence requirements
* applicability
* verification where possible
* tests
* documentation
* examples

Run all validation.

At completion report exactly what mathematical claims the standards can prevent from being overstated and what still requires expert judgment.
